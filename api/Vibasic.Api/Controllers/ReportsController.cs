using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Decision;

namespace Vibasic.Api.Controllers;

/// <summary>
/// UC_19 Xuất báo cáo: báo cáo tồn kho (now) and báo cáo biến động nhập xuất (a period), filtered by product or category.
/// Physical stock moves only on receipt approval (+), delivery (−) and stocktake approval (±), so a balance at any past moment is
/// today's stock with later movements undone. The browser renders, prints and exports the rows.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize(Policy = Policies.Manager)]
public class ReportsController(VibasicDbContext db, ReplenishmentService replenishment) : ControllerBase
{
    /// <param name="Net">Tồn ròng = Available − <paramref name="Ordered"/> (orders not issued yet, Q8).</param>
    /// <param name="BelowRop">The same test as a low-stock alert: net stock at or below ROP (Q9, Q12).</param>
    public record InventoryRow(int ProductId, string Sku, string ProductName, string Unit, string CategoryName, string SupplierName,
        int Lots, int OnHand, int Available, int Reserved, int Quarantined, int Locked, decimal? Rop, bool BelowRop, int Defective,
        int Ordered, int Net);
    public record MovementRow(int ProductId, string Sku, string ProductName, string Unit, string CategoryName,
        int Opening, int In, int Out, int Adjusted, int Closing, int Receipts, int Issues);
    public record Movement(DateOnly From, DateOnly To, List<MovementRow> Rows);

    [HttpGet("inventory")]
    public async Task<List<InventoryRow>> Inventory(int? productId, int? categoryId)
    {
        var lots = await db.GoodsReceiptDetails
            .Where(d => d.Receipt.Status == ReceiptStatus.Approved && d.QuantityOnHand > 0)
            .Where(d => productId == null || d.ProductId == productId)
            .Where(d => categoryId == null || d.Product.CategoryId == categoryId)
            .Select(d => new { d.ProductId, d.Status, d.QuantityOnHand, Reserved = d.Items.Count(i => i.Status == ItemStatus.Reserved) })
            .ToListAsync();
        // Items set aside as defective are out of stock on hand; shown apart (waiting to go back to the supplier or be scrapped).
        var defective = await db.StockItems.Where(i => i.Status == ItemStatus.Defective)
            .GroupBy(i => i.ReceiptDetail.ProductId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count);
        var products = await db.Products
            .Where(p => productId == null || p.ProductId == productId)
            .Where(p => categoryId == null || p.CategoryId == categoryId)
            .OrderBy(p => p.SKU)
            .Select(p => new
            {
                p.ProductId, p.SKU, p.ProductName, p.Unit, p.Category.CategoryName, p.Supplier.SupplierName,
                Rop = p.Policy != null ? p.Policy.CurrentROP : null, D = p.Policy != null ? p.Policy.AvgDailyDemand : null,
                Lead = p.Policy != null ? p.Policy.LeadTimeDays : 0,
            })
            .ToListAsync();
        var stock = await replenishment.StockAsync(products.Select(p => p.ProductId).ToList());
        return products.Select(p =>
        {
            var mine = lots.Where(l => l.ProductId == p.ProductId).ToList();
            var available = mine.Where(l => l.Status == LotStatus.Normal).Sum(l => l.QuantityOnHand);
            var ordered = stock[p.ProductId].Ordered;
            var net = stock[p.ProductId].Available - ordered;
            var below = p.Rop is { } rop && ReplenishmentRules.Classify(net, rop, p.D ?? 0, p.Lead) is Priority.Urgent or Priority.Order;
            return new InventoryRow(p.ProductId, p.SKU, p.ProductName, p.Unit, p.CategoryName, p.SupplierName, mine.Count,
                mine.Sum(l => l.QuantityOnHand), available, mine.Where(l => l.Status == LotStatus.Normal).Sum(l => l.Reserved),
                mine.Where(l => l.Status == LotStatus.Quarantined).Sum(l => l.QuantityOnHand),
                mine.Where(l => l.Status == LotStatus.Locked).Sum(l => l.QuantityOnHand),
                p.Rop, below, defective.GetValueOrDefault(p.ProductId), ordered, net);
        }).ToList();
    }

    /// <param name="from">Local date, inclusive. Default: first day of this month.</param>
    /// <param name="to">Local date, inclusive. Default: today.</param>
    [HttpGet("movement")]
    public async Task<ActionResult<Movement>> Movements(DateOnly? from, DateOnly? to, int? productId, int? categoryId)
    {
        var today = VnTime.Today(DateTime.UtcNow);
        var f = from ?? new DateOnly(today.Year, today.Month, 1);
        var t = to ?? today;
        if (f > t) return ValidationProblem(title: "Ngày bắt đầu phải trước ngày kết thúc.", modelStateDictionary: ModelStateWith("from", "Ngày bắt đầu phải trước ngày kết thúc."));
        var start = VnTime.ToUtc(f.ToDateTime(TimeOnly.MinValue));
        var end = VnTime.ToUtc(t.AddDays(1).ToDateTime(TimeOnly.MinValue));

        var products = await db.Products
            .Where(p => productId == null || p.ProductId == productId)
            .Where(p => categoryId == null || p.CategoryId == categoryId)
            .OrderBy(p => p.SKU)
            .Select(p => new { p.ProductId, p.SKU, p.ProductName, p.Unit, p.Category.CategoryName })
            .ToListAsync();
        var ids = products.Select(p => p.ProductId).ToList();

        var current = await db.GoodsReceiptDetails.Where(d => ids.Contains(d.ProductId) && d.Receipt.Status == ReceiptStatus.Approved)
            .GroupBy(d => d.ProductId).Select(g => new { g.Key, Qty = g.Sum(d => d.QuantityOnHand) }).ToDictionaryAsync(x => x.Key, x => x.Qty);
        var ins = await db.GoodsReceiptDetails.Where(d => ids.Contains(d.ProductId) && d.Receipt.Status == ReceiptStatus.Approved && d.Receipt.ApprovedAt >= start)
            .Select(d => new { d.ProductId, d.Quantity, d.ReceiptId, At = d.Receipt.ApprovedAt!.Value }).ToListAsync();
        var outs = await db.GoodsIssueDetails.Where(d => ids.Contains(d.ProductId) && d.Issue.Status == IssueStatus.Issued && d.Issue.DeliveredAt >= start)
            .Select(d => new { d.ProductId, d.Quantity, d.IssueId, At = d.Issue.DeliveredAt!.Value }).ToListAsync();
        var adjs = await db.StocktakeDetails.Where(d => ids.Contains(d.ReceiptDetail.ProductId) && d.Stocktake.Status == ApprovalStatus.Approved && d.Stocktake.ApprovedAt >= start)
            .Select(d => new { d.ReceiptDetail.ProductId, Delta = d.ActualQuantity - d.SystemQuantity, At = d.Stocktake.ApprovedAt!.Value }).ToListAsync();
        // Items set aside as defective left stock when they were reported: -1 each. That stays true once they are disposed of, and
        // for a repaired item (DefectiveAt kept, HandledAt set), which then comes back: +1 when the handling was done.
        adjs.AddRange(await db.StockItems.Where(i => ids.Contains(i.ReceiptDetail.ProductId) && i.DefectiveAt >= start
                && (i.Status == ItemStatus.Defective || i.Status == ItemStatus.Disposed || i.HandledAt != null))
            .Select(i => new { i.ReceiptDetail.ProductId, Delta = -1, At = i.DefectiveAt!.Value }).ToListAsync());
        adjs.AddRange(await db.StockItems.Where(i => ids.Contains(i.ReceiptDetail.ProductId) && i.HandledAt >= start && i.DefectiveAt != null
                && i.Status != ItemStatus.Defective && i.Status != ItemStatus.Disposed)
            .Select(i => new { i.ReceiptDetail.ProductId, Delta = 1, At = i.HandledAt!.Value }).ToListAsync());
        // Items of a locked lot still on hand left stock when its report was handled (disposed of without being set aside first).
        adjs.AddRange(await db.StockItems.Where(i => ids.Contains(i.ReceiptDetail.ProductId) && i.Status == ItemStatus.Disposed
                && i.DefectiveAt == null && i.HandledAt >= start)
            .Select(i => new { i.ReceiptDetail.ProductId, Delta = -1, At = i.HandledAt!.Value }).ToListAsync());

        var rows = products.Select(p =>
        {
            var i = ins.Where(x => x.ProductId == p.ProductId).ToList();
            var o = outs.Where(x => x.ProductId == p.ProductId).ToList();
            var a = adjs.Where(x => x.ProductId == p.ProductId).ToList();
            int inP = i.Where(x => x.At < end).Sum(x => x.Quantity), outP = o.Where(x => x.At < end).Sum(x => x.Quantity), adjP = a.Where(x => x.At < end).Sum(x => x.Delta);
            var closing = current.GetValueOrDefault(p.ProductId) - i.Where(x => x.At >= end).Sum(x => x.Quantity)
                + o.Where(x => x.At >= end).Sum(x => x.Quantity) - a.Where(x => x.At >= end).Sum(x => x.Delta);
            return new MovementRow(p.ProductId, p.SKU, p.ProductName, p.Unit, p.CategoryName, closing - inP + outP - adjP, inP, outP, adjP, closing,
                i.Where(x => x.At < end).Select(x => x.ReceiptId).Distinct().Count(), o.Where(x => x.At < end).Select(x => x.IssueId).Distinct().Count());
        }).ToList();
        return new Movement(f, t, rows);
    }

    private static Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary ModelStateWith(string key, string message)
    {
        var ms = new Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary();
        ms.AddModelError(key, message);
        return ms;
    }
}

/// <summary>Manager "Tổng quan": headline figures, what waits for a decision, low-stock alerts and the last 7 days of stock in/out.</summary>
[ApiController]
[Route("api/dashboard")]
[Authorize(Policy = Policies.Manager)]
public class DashboardController(VibasicDbContext db) : ControllerBase
{
    public record Kpis(int AvailableUnits, int Products, int PendingApprovals, int OpenAlerts, int PendingProposals, int QuarantinedLots, int LockedLots,
        int OrdersWaiting, int IssuesToPick);
    public record DayFlow(DateOnly Day, int In, int Out);
    public record PendingItem(string Type, string Code, string Title, DateTime At, string Link);
    /// <param name="Net">Net stock stored on the open alert (Q8).</param>
    public record AlertItem(int ProductId, string Sku, string ProductName, string Unit, int Net, decimal Rop);
    public record Dashboard(Kpis Kpis, List<DayFlow> Flow, List<PendingItem> Pending, List<AlertItem> Alerts);

    [HttpGet]
    public async Task<Dashboard> Get()
    {
        var now = DateTime.UtcNow;
        var today = VnTime.Today(now);
        var lots = db.GoodsReceiptDetails.Where(d => d.Receipt.Status == ReceiptStatus.Approved && d.QuantityOnHand > 0);
        var kpis = new Kpis(
            await lots.Where(d => d.Status == LotStatus.Normal).SumAsync(d => (int?)d.QuantityOnHand) ?? 0,
            await db.Products.CountAsync(),
            await db.GoodsReceipts.CountAsync(r => r.Status == ReceiptStatus.Pending)
                + await db.Stocktakes.CountAsync(s => s.Status == ApprovalStatus.Pending) + await db.AbnormalReports.CountAsync(a => a.Status == ApprovalStatus.Pending),
            await db.StockAlerts.CountAsync(a => a.Status == AlertStatus.Open),
            await db.ReplenishmentProposals.CountAsync(r => r.Status == ProposalStatus.Pending),
            await lots.CountAsync(d => d.Status == LotStatus.Quarantined),
            await lots.CountAsync(d => d.Status == LotStatus.Locked),
            await db.Orders.CountAsync(o => o.Status == OrderStatus.Open || o.Status == OrderStatus.OnHold),
            await db.GoodsIssues.CountAsync(i => i.Status == IssueStatus.Ready));

        // Last 7 local days, today included.
        var first = today.AddDays(-6);
        var start = VnTime.ToUtc(first.ToDateTime(TimeOnly.MinValue));
        var ins = await db.GoodsReceiptDetails.Where(d => d.Receipt.Status == ReceiptStatus.Approved && d.Receipt.ApprovedAt >= start)
            .Select(d => new { At = d.Receipt.ApprovedAt!.Value, d.Quantity }).ToListAsync();
        var outs = await db.GoodsIssueDetails.Where(d => d.Issue.Status == IssueStatus.Issued && d.Issue.DeliveredAt >= start)
            .Select(d => new { At = d.Issue.DeliveredAt!.Value, d.Quantity }).ToListAsync();
        var flow = Enumerable.Range(0, 7).Select(i => first.AddDays(i)).Select(day => new DayFlow(day,
            ins.Where(x => VnTime.Today(x.At) == day).Sum(x => x.Quantity),
            outs.Where(x => VnTime.Today(x.At) == day).Sum(x => x.Quantity))).ToList();

        var pending = new List<PendingItem>();
        pending.AddRange(await db.GoodsReceipts.Where(r => r.Status == ReceiptStatus.Pending)
            .Select(r => new PendingItem("Phiếu nhập", r.Code, r.Supplier.SupplierName, r.SubmittedAt ?? r.ReceiptDate, "/ql/nhap-kho/" + r.ReceiptId)).ToListAsync());
        pending.AddRange(await db.Stocktakes.Where(s => s.Status == ApprovalStatus.Pending)
            .Select(s => new PendingItem("Phiếu kiểm kê", s.Code, "Kế hoạch " + s.Plan.Code, s.StocktakeDate, "/ql/kiem-ke/phieu/" + s.StocktakeId)).ToListAsync());
        pending.AddRange(await db.AbnormalReports.Where(a => a.Status == ApprovalStatus.Pending)
            .Select(a => new PendingItem("Biên bản bất thường", a.Code, a.ReceiptDetail.LotCode + " · " + a.ReceiptDetail.Product.SKU, a.CreatedAt, "/ql/cho-duyet?loai=bat-thuong")).ToListAsync());

        var alerts = await db.StockAlerts.Where(a => a.Status == AlertStatus.Open).OrderBy(a => a.CurrentQuantity - a.ROPValue).Take(6)
            .Select(a => new AlertItem(a.ProductId, a.Product.SKU, a.Product.ProductName, a.Product.Unit, a.CurrentQuantity, a.ROPValue)).ToListAsync();

        return new Dashboard(kpis, flow, pending.OrderBy(p => p.At).Take(8).ToList(), alerts);
    }
}
