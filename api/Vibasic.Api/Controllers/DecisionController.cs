using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Decision;

namespace Vibasic.Api.Controllers;

/// <summary>
/// Inputs and outputs of one product's calculation, so every alert and proposal can show its basis (NFR "tính giải thích được").
/// </summary>
/// <param name="Ordered">Quantity of orders received but not issued (Q8).</param>
/// <param name="Net">Tồn ròng = Available − Ordered (Q8).</param>
/// <param name="DaysLeft">Q11: Net ÷ d; null without demand.</param>
/// <param name="Priority">Q12 on the current figures; null when none applies or ROP is not calculated.</param>
public record Basis(int ProductId, string Sku, string ProductName, string Unit, int CategoryId, string CategoryName, int SupplierId, string SupplierName,
    int Available, int Ordered, int Net, decimal? AvgDailyDemand, decimal? Sigma, int LeadTimeDays, decimal? SafetyStock,
    decimal OrderingCost, decimal HoldingCost, decimal? Rop, decimal? Eoq, DateTime? CalculatedAt, decimal? DaysLeft, DemandState DemandState, Priority? Priority);

/// <summary>Where a product stands (Q3, Q12): "Chưa đủ dữ liệu", "Hàng chậm luân chuyển", at or below ROP, "Theo dõi", or fine.</summary>
public enum StockState { Insufficient, SlowMoving, Alert, Watch, Ok }

[ApiController]
[Route("api/replenishment")]
[Authorize(Policy = Policies.Manager)]
public class DecisionController(VibasicDbContext db, ReplenishmentService replenishment, IClock clock, IOptions<JsonOptions> json) : ControllerBase
{
    public record OverviewRow(Basis Basis, StockState State, DateTime? AlertDate);
    public record AlertRow(int Id, Basis Basis, int CurrentQuantity, decimal RopValue, DateTime AlertDate, AlertStatus Status, DateTime? ClosedAt);
    /// <param name="NetQuantity">Basis of the proposal, refreshed while pending and frozen once decided: available, net stock, ROP,
    /// EOQ and d, the Q13 quantity, the system quantity after the 12-week cap (OriginalQuantity) and why it was cut (AdjustBasis).</param>
    /// <param name="DeciderName">Who put it in a report or left it out, and when (<paramref name="DecidedAt"/>).</param>
    public record ProposalRow(int Id, Basis Basis, int ProposedQuantity, int OriginalQuantity, int BaseQuantity, decimal EoqValue,
        int AvailableQuantity, int NetQuantity, decimal RopValue, decimal? AvgDailyDemand, decimal? DaysLeft,
        string? AdjustBasis, string? AdjustReason, DateTime ProposalDate, ProposalStatus Status, Priority Priority,
        string? DeciderName, DateTime? DecidedAt, string? RejectReason, int? ReportId, string? ReportCode);
    public record Summary(int OpenAlerts, int PendingProposals, int Insufficient, int SlowMoving, DateTime? LastCalculatedAt);
    public record IdsInput(List<int>? Ids);
    public record AdjustInput(int? Quantity, string? Reason);

    /// <summary>A report line: a pending proposal, or a "Theo dõi" product suggested for the same order (Q18).</summary>
    public record ReportRow(Basis Basis, Priority Priority, decimal? DaysLeft, ProposalRow? Proposal);
    public record ReportGroup(int SupplierId, string SupplierName, string? Phone, string? Address, List<ReportRow> Rows,
        int Urgent, int Order, int Watch, int TotalQuantity);
    public record Constants(int WindowDays, decimal Z, int WatchDays, int CapDays, int SlowMovingDays);
    /// <param name="DemandFrom">Demand window of the last calculation (Q1–Q2), [DemandFrom, DemandTo).</param>
    public record Report(DateTime GeneratedAt, DateTime? CalculatedAt, DateTime? DemandFrom, DateTime? DemandTo, Constants Constants, List<ReportGroup> Groups);
    public record ReportListRow(int Id, string Code, DateTime CreatedAt, string CreatorName, int ProposalCount, int SupplierCount, int TotalQuantity);
    /// <param name="Content">The report as it was made.</param>
    public record SavedReport(ReportListRow Header, Report Content);

    /// <summary>Every product with its current ROP/EOQ and where it stands.</summary>
    [HttpGet("overview")]
    public async Task<List<OverviewRow>> Overview()
    {
        var bases = await BasesAsync(null);
        var alerts = await db.StockAlerts.Where(a => a.Status == AlertStatus.Open).ToDictionaryAsync(a => a.ProductId, a => a.AlertDate);
        return bases.Values.OrderBy(b => b.Sku).Select(b => new OverviewRow(b, StateOf(b), alerts.TryGetValue(b.ProductId, out var at) ? at : null)).ToList();
    }

    [HttpGet("summary")]
    public async Task<Summary> GetSummary() => new(
        await db.StockAlerts.CountAsync(a => a.Status == AlertStatus.Open),
        await db.ReplenishmentProposals.CountAsync(r => r.Status == ProposalStatus.Pending),
        await db.InventoryPolicies.CountAsync(p => p.DemandState == DemandState.InsufficientData),
        await db.InventoryPolicies.CountAsync(p => p.DemandState == DemandState.SlowMoving),
        await db.InventoryPolicies.MaxAsync(p => p.LastROPCalculatedAt));

    /// <summary>Run the weekly calculation now (tinhToanROP_DinhKy, tinhToanEOQ_DinhKy).</summary>
    [HttpPost("recalculate")]
    public async Task<Summary> Recalculate() { await replenishment.RecalculateAsync(); return await GetSummary(); }

    /// <summary>
    /// Báo cáo đề xuất bổ sung hàng (Q17–Q19): the chosen pending proposals grouped by main supplier, plus the supplier's "Theo dõi"
    /// products (no open proposal, not reported in the last L + 3 days, reaching ROP within 7 days) as a suggestion to order them
    /// together. Within a group: Khẩn cấp, Cần đặt, Theo dõi, then by days left.
    /// <paramref name="live"/> false: a report kept without its content (demo data), rebuilt from its proposals' frozen figures
    /// at <paramref name="at"/>, without "Theo dõi" lines.
    /// </summary>
    private async Task<Report> BuildReportAsync(List<ProposalRow> proposals, bool live, DateTime at)
    {
        var now = clock.UtcNow;
        var recent = now.AddDays(-ReplenishmentRules.RecentDecisionDays);
        var busy = (await db.ReplenishmentProposals
                .Where(r => r.Status == ProposalStatus.Pending || (r.Status == ProposalStatus.Reported && r.ApprovedAt >= recent))
                .Select(r => new { r.ProductId, r.Status, r.ApprovedAt, Lead = r.Product.Policy != null ? r.Product.Policy.LeadTimeDays : 0 })
                .ToListAsync())
            .Where(r => r.Status == ProposalStatus.Pending || now < ReplenishmentRules.ReproposeFrom(r.ApprovedAt!.Value, r.Lead))
            .Select(r => r.ProductId).ToHashSet();
        var bases = await BasesAsync(null);
        var rows = proposals.Select(p => new ReportRow(p.Basis, p.Priority, p.DaysLeft, p))
            .Concat(bases.Values.Where(b => live && b.Priority == Priority.Watch && !busy.Contains(b.ProductId))
                .Select(b => new ReportRow(b, Priority.Watch, b.DaysLeft, null)))
            .ToList();
        var suppliers = await db.Suppliers.ToDictionaryAsync(s => s.SupplierId);
        var groups = rows.GroupBy(r => r.Basis.SupplierId)
            .Where(g => g.Any(r => r.Proposal is not null))
            .Select(g =>
            {
                var list = g.OrderBy(r => r.Priority).ThenBy(r => r.DaysLeft ?? decimal.MaxValue).ThenBy(r => r.Basis.Sku).ToList();
                var s = suppliers[g.Key];
                return new ReportGroup(g.Key, s.SupplierName, s.Phone, s.Address, list,
                    list.Count(r => r.Priority == Priority.Urgent), list.Count(r => r.Priority == Priority.Order), list.Count(r => r.Priority == Priority.Watch),
                    list.Sum(r => r.Proposal?.ProposedQuantity ?? 0));
            })
            .OrderByDescending(g => g.Urgent).ThenBy(g => g.SupplierName)
            .ToList();
        var calculated = live ? await db.InventoryPolicies.MaxAsync(p => p.LastROPCalculatedAt) : null;
        var window = calculated is { } c ? ReplenishmentService.DemandWindow(c) : ((DateTime, DateTime)?)null;
        return new Report(at, calculated, window?.Item1, window?.Item2,
            new Constants(ReplenishmentRules.WindowDays, ReplenishmentRules.Z, ReplenishmentRules.WatchDays, ReplenishmentRules.CapDays,
                ReplenishmentRules.SlowMovingDays),
            groups);
    }

    /// <summary>The Đề xuất screen: every pending proposal as it would go into a report, with the "Theo dõi" lines.</summary>
    [HttpGet("report")]
    public async Task<Report> GetReport() => await BuildReportAsync(await ProposalsAsync(ProposalStatus.Pending), true, clock.UtcNow);

    /// <summary>Lập báo cáo from the ticked pending proposals: they become "Đã lập báo cáo" and the content is kept to print again.</summary>
    [HttpPost("~/api/proposals/report")]
    public async Task<ReportListRow> CreateReport(IdsInput input)
    {
        var report = await replenishment.CreateReportAsync(input.Ids, User.UserId(), async list =>
        {
            var ids = list.Select(r => r.ProposalId).ToHashSet();
            var content = await BuildReportAsync((await ProposalsAsync(ProposalStatus.Pending)).Where(p => ids.Contains(p.Id)).ToList(), true, clock.UtcNow);
            return (JsonSerializer.Serialize(content, json.Value.JsonSerializerOptions), content.Groups.Count);
        });
        return (await ReportRows(db.ReplenishmentReports.Where(r => r.ReportId == report.ReportId))).Single();
    }

    [HttpGet("~/api/replenishment-reports")]
    public async Task<List<ReportListRow>> Reports() => await ReportRows(db.ReplenishmentReports.OrderByDescending(r => r.CreatedAt).Take(300));

    [HttpGet("~/api/replenishment-reports/{id:int}")]
    public async Task<ActionResult<SavedReport>> GetSavedReport(int id)
    {
        var header = (await ReportRows(db.ReplenishmentReports.Where(r => r.ReportId == id))).SingleOrDefault();
        if (header is null) return NotFound();
        var snapshot = await db.ReplenishmentReports.Where(r => r.ReportId == id).Select(r => r.Snapshot).SingleAsync();
        var content = snapshot.Length > 0 ? JsonSerializer.Deserialize<Report>(snapshot, json.Value.JsonSerializerOptions)!
            : await BuildReportAsync(await ProposalsAsync(null, reportId: id), false, header.CreatedAt);
        return new SavedReport(header, content);
    }

    private static Task<List<ReportListRow>> ReportRows(IQueryable<ReplenishmentReport> q) =>
        q.Select(r => new ReportListRow(r.ReportId, r.Code, r.CreatedAt, r.Creator.FullName, r.ProposalCount, r.SupplierCount, r.TotalQuantity)).ToListAsync();

    // ---------------- UC_17 ----------------

    [HttpGet("~/api/alerts")]
    public async Task<List<AlertRow>> Alerts(AlertStatus? status)
    {
        var alerts = await (status is null ? db.StockAlerts : db.StockAlerts.Where(a => a.Status == status))
            .OrderByDescending(a => a.AlertDate).Take(300).ToListAsync();
        var bases = await BasesAsync(alerts.Select(a => a.ProductId).ToList());
        return alerts.Select(a => new AlertRow(a.AlertId, bases[a.ProductId], a.CurrentQuantity, a.ROPValue, a.AlertDate, a.Status, a.ClosedAt))
            .OrderBy(a => a.Status).ThenBy(a => a.Basis.Net - (a.Basis.Rop ?? 0)).ToList();
    }

    // ---------------- UC_18 ----------------

    [HttpGet("~/api/proposals")]
    public async Task<List<ProposalRow>> Proposals(ProposalStatus? status) => await ProposalsAsync(status);

    [HttpPost("~/api/proposals/{id:int}/reject")]
    public async Task<ProposalRow> Reject(int id, ReasonInput input) => await Row((await replenishment.RejectAsync(id, input.Reason, User.UserId())).ProposalId);

    [HttpPut("~/api/proposals/{id:int}")]
    public async Task<ProposalRow> Adjust(int id, AdjustInput input) => await Row((await replenishment.AdjustAsync(id, input.Quantity, input.Reason)).ProposalId);

    private async Task<List<ProposalRow>> ProposalsAsync(ProposalStatus? status, int? id = null, int? reportId = null)
    {
        var query = db.ReplenishmentProposals.AsQueryable();
        if (reportId is not null) query = query.Where(r => r.ReportId == reportId);
        if (status is not null) query = query.Where(r => r.Status == status);
        if (id is not null) query = query.Where(r => r.ProposalId == id);
        var list = await query.OrderByDescending(r => r.ProposalDate).Take(500)
            .Select(r => new { r, Decider = r.Approver != null ? r.Approver.FullName : null, ReportCode = r.Report != null ? r.Report.Code : null })
            .ToListAsync();
        var bases = await BasesAsync(list.Select(x => x.r.ProductId).Distinct().ToList());
        return list.Select(x => ToRow(x.r, bases[x.r.ProductId], x.Decider, x.ReportCode)).ToList();
    }

    private async Task<ProposalRow> Row(int id) => (await ProposalsAsync(null, id)).Single();

    private static ProposalRow ToRow(ReplenishmentProposal r, Basis b, string? decider, string? reportCode) => new(
        r.ProposalId, b, r.ProposedQuantity, r.OriginalQuantity, r.BaseQuantity, r.EOQValue, r.AvailableQuantity, r.NetQuantity, r.ROPValue,
        r.AvgDailyDemand, ReplenishmentRules.DaysLeft(r.NetQuantity, r.AvgDailyDemand ?? 0),
        r.AdjustBasis, r.AdjustReason, r.ProposalDate, r.Status, r.Priority, decider, r.ApprovedAt, r.RejectReason, r.ReportId, reportCode);

    private static StockState StateOf(Basis b) => b.DemandState switch
    {
        DemandState.InsufficientData => StockState.Insufficient,
        DemandState.SlowMoving => StockState.SlowMoving,
        _ => b.Priority switch { Priority.Urgent or Priority.Order => StockState.Alert, Priority.Watch => StockState.Watch, _ => StockState.Ok },
    };

    private async Task<Dictionary<int, Basis>> BasesAsync(List<int>? productIds)
    {
        var products = await db.Products.Where(p => productIds == null || productIds.Contains(p.ProductId))
            .Select(p => new
            {
                p.ProductId, p.SKU, p.ProductName, p.Unit, p.CategoryId, p.Category.CategoryName, p.SupplierId, p.Supplier.SupplierName,
                Policy = p.Policy,
            })
            .ToListAsync();
        var stock = await replenishment.StockAsync(products.Select(p => p.ProductId).ToList());
        return products.ToDictionary(p => p.ProductId, p =>
        {
            var pol = p.Policy;
            var (available, ordered) = stock[p.ProductId];
            var net = available - ordered;
            var d = pol?.AvgDailyDemand;
            var priority = pol?.CurrentROP is { } rop ? ReplenishmentRules.Classify(net, rop, d ?? 0, pol.LeadTimeDays) : null;
            return new Basis(p.ProductId, p.SKU, p.ProductName, p.Unit, p.CategoryId, p.CategoryName, p.SupplierId, p.SupplierName,
                available, ordered, net, d, pol?.DemandStdDev, pol?.LeadTimeDays ?? 0, pol?.SafetyStock,
                pol?.OrderingCost ?? 0, pol?.HoldingCost ?? 0, pol?.CurrentROP, pol?.CurrentEOQ, pol?.LastROPCalculatedAt,
                d is > 0 ? ReplenishmentRules.DaysLeft(net, d.Value) : null, pol?.DemandState ?? DemandState.InsufficientData, priority);
        });
    }
}
