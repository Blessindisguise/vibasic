using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Catalog;

namespace Vibasic.Infrastructure.Decision;

/// <summary>
/// Decision support (§3.2.5, Hình 3.8 and 3.9; UC_17, UC_18).
/// <list type="bullet">
/// <item>Weekly: d = units issued in the last 28 days ÷ 28; ROP = d × L + SS; EOQ = √(2DS/H) with D = d × 365 (H is per unit per year).
/// A product whose first approved receipt is younger than 28 days has "Chưa đủ dữ liệu": no ROP, no alert, no proposal.</item>
/// <item>On every stock change (kiemTraCanhBao): available ≤ ROP → open or update the alert and the pending proposal (quantity = EOQ);
/// available &gt; ROP → close the open alert and any pending proposal.</item>
/// </list>
/// </summary>
public class ReplenishmentService(VibasicDbContext db, Notifier notify, IClock clock)
{
    public const int WindowDays = 28;
    private static readonly System.Globalization.CultureInfo Vi = System.Globalization.CultureInfo.GetCultureInfo("vi-VN");

    // ---------------- tính ROP, EOQ định kỳ ----------------

    /// <summary>tinhToanROP_DinhKy + tinhToanEOQ_DinhKy for every product (or one), then the alert/proposal check. Saves.</summary>
    public async Task<int> RecalculateAsync(int? productId = null)
    {
        var now = clock.UtcNow;
        var from = now.AddDays(-WindowDays);
        var policies = await db.InventoryPolicies.Where(p => productId == null || p.ProductId == productId).ToListAsync();
        var ids = policies.Select(p => p.ProductId).ToList();

        var firstReceipt = await db.GoodsReceiptDetails
            .Where(d => ids.Contains(d.ProductId) && d.Receipt.Status == ReceiptStatus.Approved)
            .GroupBy(d => d.ProductId).Select(g => new { g.Key, First = g.Min(d => d.Receipt.ReceiptDate) })
            .ToDictionaryAsync(x => x.Key, x => x.First);
        var issued = await db.GoodsIssueDetails
            .Where(d => ids.Contains(d.ProductId) && d.Issue.Status == IssueStatus.Issued && d.Issue.DeliveredAt >= from && d.Issue.DeliveredAt < now)
            .GroupBy(d => d.ProductId).Select(g => new { g.Key, Qty = g.Sum(d => d.Quantity) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty);

        foreach (var p in policies)
        {
            if (!firstReceipt.TryGetValue(p.ProductId, out var first) || first > from)
            {
                // UC_17 3.2 / UC_18 2.2: not four weeks of history yet.
                p.AvgDailyDemand = null; p.CurrentROP = null; p.CurrentEOQ = null;
                p.LastROPCalculatedAt = now; p.LastEOQCalculatedAt = now;
                continue;
            }
            var d = Math.Round((decimal)issued.GetValueOrDefault(p.ProductId) / WindowDays, 4);
            p.AvgDailyDemand = d;
            p.CurrentROP = Math.Round(d * p.LeadTimeDays + p.SafetyStock, 2);
            p.CurrentEOQ = Eoq(d, p.OrderingCost, p.HoldingCost);
            p.LastROPCalculatedAt = now;
            p.LastEOQCalculatedAt = now;
        }
        await db.SaveChangesAsync();
        await CheckAsync(ids);
        return policies.Count;
    }

    public static decimal Eoq(decimal dailyDemand, decimal orderingCost, decimal holdingCost)
    {
        var annual = (double)(dailyDemand * 365);
        return holdingCost <= 0 ? 0 : Math.Round((decimal)Math.Sqrt(2 * annual * (double)orderingCost / (double)holdingCost), 2);
    }

    /// <summary>Proposal quantity: EOQ rounded up, at least 1.</summary>
    public static int ProposalQuantity(decimal eoq) => Math.Max(1, (int)Math.Ceiling(eoq));

    // ---------------- kiemTraCanhBao + kiemTraDeXuat ----------------

    /// <summary>Tồn kho khả dụng: QuantityOnHand of "Bình thường" lots of approved receipts.</summary>
    public IQueryable<GoodsReceiptDetail> AvailableLots(int productId) => db.GoodsReceiptDetails
        .Where(d => d.ProductId == productId && d.Status == LotStatus.Normal && d.Receipt.Status == ReceiptStatus.Approved);

    /// <summary>
    /// Run after a stock change has been saved. Compares available stock with the stored ROP and opens, updates or closes the
    /// alert and the pending proposal. Saves.
    /// </summary>
    public async Task CheckAsync(IEnumerable<int> productIds)
    {
        var ids = productIds.Distinct().ToList();
        if (ids.Count == 0) return;
        var now = clock.UtcNow;
        var products = await db.Products.Include(p => p.Policy).Where(p => ids.Contains(p.ProductId)).ToListAsync();
        var available = await db.GoodsReceiptDetails
            .Where(d => ids.Contains(d.ProductId) && d.Status == LotStatus.Normal && d.Receipt.Status == ReceiptStatus.Approved)
            .GroupBy(d => d.ProductId).Select(g => new { g.Key, Qty = g.Sum(d => d.QuantityOnHand) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty);
        var alerts = await db.StockAlerts.Where(a => ids.Contains(a.ProductId) && a.Status == AlertStatus.Open).ToListAsync();
        var proposals = await db.ReplenishmentProposals.Where(r => ids.Contains(r.ProductId)).ToListAsync();

        foreach (var product in products)
        {
            var rop = product.Policy?.CurrentROP;
            var qty = available.GetValueOrDefault(product.ProductId);
            var alert = alerts.FirstOrDefault(a => a.ProductId == product.ProductId);
            var pending = proposals.FirstOrDefault(r => r.ProductId == product.ProductId && r.Status == ProposalStatus.Pending);
            if (rop is null) continue; // "Chưa đủ dữ liệu": never alerted

            if (qty <= rop)
            {
                if (alert is null)
                {
                    alert = new StockAlert { ProductId = product.ProductId, AlertDate = now, Status = AlertStatus.Open };
                    db.StockAlerts.Add(alert);
                    await notify.ToRoleAsync(UserRole.Manager, $"Cảnh báo tồn kho thấp: {product.SKU}",
                        $"{product.ProductName} còn {qty} {product.Unit}, không lớn hơn ROP {rop.Value.ToString("#,##0.#", Vi)}.", "/ql/canh-bao", Notifier.Warning);
                }
                alert.CurrentQuantity = qty;
                alert.ROPValue = rop.Value;

                var eoq = product.Policy!.CurrentEOQ ?? 0;
                if (pending is not null)
                {
                    pending.EOQValue = eoq;
                    pending.OriginalQuantity = ProposalQuantity(eoq);
                    if (pending.AdjustReason is null) pending.ProposedQuantity = pending.OriginalQuantity; // keep a manager's edit
                }
                else if (!proposals.Any(r => r.ProductId == product.ProductId && r.Status is ProposalStatus.Approved or ProposalStatus.Rejected
                             && r.ProposalDate >= alert.AlertDate))
                {
                    // One proposal per low-stock episode: a decided one is not re-raised until stock recovers above ROP.
                    db.ReplenishmentProposals.Add(new ReplenishmentProposal
                    {
                        ProductId = product.ProductId, EOQValue = eoq, OriginalQuantity = ProposalQuantity(eoq),
                        ProposedQuantity = ProposalQuantity(eoq), ProposalDate = now, Status = ProposalStatus.Pending,
                    });
                }
            }
            else
            {
                if (alert is not null)
                {
                    alert.Status = AlertStatus.Closed;
                    alert.ClosedAt = now;
                    alert.CurrentQuantity = qty;
                }
                if (pending is not null) pending.Status = ProposalStatus.Closed;
            }
        }
        await db.SaveChangesAsync();
    }

    /// <summary>Products touched by the given lots (after receipt approval, delivery, stocktake, lot lock/unlock).</summary>
    public async Task CheckLotsAsync(IEnumerable<int> receiptDetailIds)
    {
        var lotIds = receiptDetailIds.Distinct().ToList();
        await CheckAsync(await db.GoodsReceiptDetails.Where(d => lotIds.Contains(d.ReceiptDetailId)).Select(d => d.ProductId).Distinct().ToListAsync());
    }

    // ---------------- UC_18: duyệt đề xuất ----------------

    public async Task<int> ApproveAsync(List<int>? ids, int managerId)
    {
        var list = await db.ReplenishmentProposals.Where(r => (ids ?? new List<int>()).Contains(r.ProposalId)).ToListAsync();
        if (list.Count == 0) throw new RuleException("Chọn ít nhất một đề xuất để duyệt.");
        var notPending = list.Where(r => r.Status != ProposalStatus.Pending).ToList();
        if (notPending.Count > 0) throw new RuleException($"Có {notPending.Count} đề xuất đã được xử lý hoặc đã đóng. Tải lại danh sách.");
        var now = clock.UtcNow;
        foreach (var r in list) { r.Status = ProposalStatus.Approved; r.ApprovedBy = managerId; r.ApprovedAt = now; }
        await db.SaveChangesAsync();
        return list.Count;
    }

    public async Task<ReplenishmentProposal> RejectAsync(int id, string? reason, int managerId)
    {
        var r = await LoadPendingAsync(id);
        var text = CatalogService.Clean(reason);
        new Validator()
            .Check(text is { Length: >= 5 }, "reason", "Bắt buộc nhập lý do (tối thiểu 5 ký tự).")
            .Check(text is null || text.Length <= 255, "reason", "Lý do tối đa 255 ký tự.")
            .ThrowIfAny();
        r.Status = ProposalStatus.Rejected;
        r.RejectReason = text;
        r.ApprovedBy = managerId;
        r.ApprovedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        return r;
    }

    /// <summary>The manager changes the quantity with a reason; the system quantity (EOQ) is kept for reference.</summary>
    public async Task<ReplenishmentProposal> AdjustAsync(int id, int? quantity, string? reason)
    {
        var r = await LoadPendingAsync(id);
        var text = CatalogService.Clean(reason);
        new Validator()
            .Check(quantity is >= 1 and <= 1_000_000, "quantity", "Số lượng đề xuất phải lớn hơn 0.")
            .Check(quantity == r.OriginalQuantity || text is { Length: >= 5 }, "reason", "Ghi lý do đổi số lượng so với EOQ (tối thiểu 5 ký tự).")
            .Check(text is null || text.Length <= 255, "reason", "Lý do tối đa 255 ký tự.")
            .ThrowIfAny();
        r.ProposedQuantity = quantity!.Value;
        r.AdjustReason = quantity == r.OriginalQuantity ? null : text;
        await db.SaveChangesAsync();
        return r;
    }

    private async Task<ReplenishmentProposal> LoadPendingAsync(int id)
    {
        var r = await db.ReplenishmentProposals.SingleOrDefaultAsync(x => x.ProposalId == id) ?? throw new NotFoundException("Không tìm thấy đề xuất.");
        if (r.Status != ProposalStatus.Pending)
            throw new RuleException($"Đề xuất đang “{Labels<ProposalStatus>.ToLabel(r.Status)}”, không còn chờ duyệt.");
        return r;
    }
}
