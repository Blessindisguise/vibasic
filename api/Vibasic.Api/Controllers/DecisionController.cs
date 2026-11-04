using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Decision;

namespace Vibasic.Api.Controllers;

/// <summary>
/// Inputs and outputs of one product's calculation, so every alert and proposal can show its basis (NFR "tính giải thích được").
/// </summary>
public record Basis(int ProductId, string Sku, string ProductName, string Unit, int CategoryId, string CategoryName, int SupplierId, string SupplierName,
    int Available, decimal? AvgDailyDemand, int LeadTimeDays, int SafetyStock, decimal OrderingCost, decimal HoldingCost,
    decimal? Rop, decimal? Eoq, DateTime? CalculatedAt, decimal? DaysLeft);

/// <summary>State of a product against its ROP: "Chưa đủ dữ liệu", at or below ROP, within 20 % above ROP ("Theo dõi"), or fine.</summary>
public enum StockState { Insufficient, Alert, Watch, Ok }

/// <summary>Restock priority: "Khẩn cấp" when available stock is down to safety stock, otherwise "Cần đặt".</summary>
public enum Priority { Urgent, Order }

[ApiController]
[Route("api/replenishment")]
[Authorize(Policy = Policies.Manager)]
public class DecisionController(VibasicDbContext db, ReplenishmentService replenishment) : ControllerBase
{
    public record OverviewRow(Basis Basis, StockState State, DateTime? AlertDate);
    public record AlertRow(int Id, Basis Basis, int CurrentQuantity, decimal RopValue, DateTime AlertDate, AlertStatus Status, DateTime? ClosedAt);
    public record ProposalRow(int Id, Basis Basis, int ProposedQuantity, int OriginalQuantity, decimal EoqValue, string? AdjustReason,
        DateTime ProposalDate, ProposalStatus Status, Priority Priority, string? ApproverName, DateTime? ApprovedAt, string? RejectReason);
    public record Summary(int OpenAlerts, int PendingProposals, int Insufficient, DateTime? LastCalculatedAt);
    public record IdsInput(List<int>? Ids);
    public record AdjustInput(int? Quantity, string? Reason);

    /// <summary>Every product with its current ROP/EOQ and where it stands (also lists "Chưa đủ dữ liệu", UC_17 3.2).</summary>
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
        await db.InventoryPolicies.CountAsync(p => p.CurrentROP == null),
        await db.InventoryPolicies.MaxAsync(p => p.LastROPCalculatedAt));

    /// <summary>Run the weekly calculation now (tinhToanROP_DinhKy, tinhToanEOQ_DinhKy).</summary>
    [HttpPost("recalculate")]
    public async Task<Summary> Recalculate() { await replenishment.RecalculateAsync(); return await GetSummary(); }

    // ---------------- UC_17 ----------------

    [HttpGet("~/api/alerts")]
    public async Task<List<AlertRow>> Alerts(AlertStatus? status)
    {
        var alerts = await (status is null ? db.StockAlerts : db.StockAlerts.Where(a => a.Status == status))
            .OrderByDescending(a => a.AlertDate).Take(300).ToListAsync();
        var bases = await BasesAsync(alerts.Select(a => a.ProductId).ToList());
        return alerts.Select(a => new AlertRow(a.AlertId, bases[a.ProductId], a.CurrentQuantity, a.ROPValue, a.AlertDate, a.Status, a.ClosedAt))
            .OrderBy(a => a.Status).ThenBy(a => a.Basis.Available - (a.Basis.Rop ?? 0)).ToList();
    }

    // ---------------- UC_18 ----------------

    [HttpGet("~/api/proposals")]
    public async Task<List<ProposalRow>> Proposals(ProposalStatus? status)
    {
        var list = await (status is null ? db.ReplenishmentProposals : db.ReplenishmentProposals.Where(r => r.Status == status))
            .OrderByDescending(r => r.ProposalDate).Take(500)
            .Select(r => new { r, Approver = r.Approver != null ? r.Approver.FullName : null })
            .ToListAsync();
        var bases = await BasesAsync(list.Select(x => x.r.ProductId).ToList());
        return list.Select(x => ToRow(x.r, bases[x.r.ProductId], x.Approver)).ToList();
    }

    [HttpPost("~/api/proposals/approve")]
    public async Task<int> Approve(IdsInput input) => await replenishment.ApproveAsync(input.Ids, User.UserId());

    [HttpPost("~/api/proposals/{id:int}/reject")]
    public async Task<ProposalRow> Reject(int id, ReasonInput input) => await Row((await replenishment.RejectAsync(id, input.Reason, User.UserId())).ProposalId);

    [HttpPut("~/api/proposals/{id:int}")]
    public async Task<ProposalRow> Adjust(int id, AdjustInput input) => await Row((await replenishment.AdjustAsync(id, input.Quantity, input.Reason)).ProposalId);

    private async Task<ProposalRow> Row(int id)
    {
        var x = await db.ReplenishmentProposals.Where(r => r.ProposalId == id)
            .Select(r => new { r, Approver = r.Approver != null ? r.Approver.FullName : null }).SingleAsync();
        return ToRow(x.r, (await BasesAsync([x.r.ProductId]))[x.r.ProductId], x.Approver);
    }

    private static ProposalRow ToRow(ReplenishmentProposal r, Basis b, string? approver) => new(
        r.ProposalId, b, r.ProposedQuantity, r.OriginalQuantity, r.EOQValue, r.AdjustReason, r.ProposalDate, r.Status,
        b.Available <= b.SafetyStock ? Priority.Urgent : Priority.Order, approver, r.ApprovedAt, r.RejectReason);

    private static StockState StateOf(Basis b) =>
        b.Rop is null ? StockState.Insufficient : b.Available <= b.Rop ? StockState.Alert : b.Available <= b.Rop * 1.2m ? StockState.Watch : StockState.Ok;

    private async Task<Dictionary<int, Basis>> BasesAsync(List<int>? productIds)
    {
        var products = await db.Products.Where(p => productIds == null || productIds.Contains(p.ProductId))
            .Select(p => new
            {
                p.ProductId, p.SKU, p.ProductName, p.Unit, p.CategoryId, p.Category.CategoryName, p.SupplierId, p.Supplier.SupplierName,
                Policy = p.Policy,
                Available = db.GoodsReceiptDetails
                    .Where(d => d.ProductId == p.ProductId && d.Status == LotStatus.Normal && d.Receipt.Status == ReceiptStatus.Approved)
                    .Sum(d => (int?)d.QuantityOnHand) ?? 0,
            })
            .ToListAsync();
        return products.ToDictionary(p => p.ProductId, p =>
        {
            var d = p.Policy?.AvgDailyDemand;
            return new Basis(p.ProductId, p.SKU, p.ProductName, p.Unit, p.CategoryId, p.CategoryName, p.SupplierId, p.SupplierName, p.Available,
                d, p.Policy?.LeadTimeDays ?? 0, p.Policy?.SafetyStock ?? 0, p.Policy?.OrderingCost ?? 0, p.Policy?.HoldingCost ?? 0,
                p.Policy?.CurrentROP, p.Policy?.CurrentEOQ, p.Policy?.LastROPCalculatedAt,
                d is > 0 ? Math.Round(p.Available / d.Value, 1) : null);
        });
    }
}
