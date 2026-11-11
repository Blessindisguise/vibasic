using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Catalog;

namespace Vibasic.Infrastructure.Decision;

/// <summary>
/// Decision support (UC_17, UC_18) under "Quy tắc đề xuất bổ sung hàng hóa" Q1–Q20; the formulas are in <see cref="ReplenishmentRules"/>.
/// <list type="bullet">
/// <item>Weekly (Q1–Q6): demand = ordered quantity by order date over the last 4 weeks (days before today, Vietnam time);
/// d, σ → SS = z·σ·√L, ROP = d·L + SS, EOQ. No short-term (2-week) trend: household goods have steady demand. Too little history or no orders for 8 weeks: no ROP, no alert, no proposal.</item>
/// <item>On every change of stock or open orders (Q7–Q16): net stock = available − ordered but not issued. Net ≤ ROP opens or
/// updates the alert and the one open proposal (quantity ROP + EOQ − net, capped at 12 weeks); net &gt; ROP closes the alert
/// and a pending proposal. A proposal is only a suggestion: once put in a report the system stops following it, and the product is
/// proposed again only after the lead time + 3 days; a proposal left out holds for the rest of the week.</item>
/// </list>
/// </summary>
public class ReplenishmentService(VibasicDbContext db, Notifier notify, IClock clock)
{
    private static readonly System.Globalization.CultureInfo Vi = System.Globalization.CultureInfo.GetCultureInfo("vi-VN");

    /// <summary>Orders received but not issued yet: they hold stock that is no longer free (Q8).</summary>
    public static readonly OrderStatus[] OpenOrders = [OrderStatus.Open, OrderStatus.OnHold, OrderStatus.InProgress];

    // ---------------- tính ROP, EOQ định kỳ ----------------

    /// <summary>tinhToanROP_DinhKy + tinhToanEOQ_DinhKy for every product (or one), then the alert/proposal check. Saves.</summary>
    public async Task<int> RecalculateAsync(int? productId = null)
    {
        var now = clock.UtcNow;
        var (from, to) = DemandWindow(now);
        var slowFrom = to.AddDays(-ReplenishmentRules.SlowMovingDays);
        var policies = await db.InventoryPolicies.Where(p => productId == null || p.ProductId == productId).ToListAsync();
        var ids = policies.Select(p => p.ProductId).ToList();

        // A cancelled order was never demand (Q1).
        var firstOrder = await db.OrderDetails.Where(d => ids.Contains(d.ProductId) && d.Order.Status != OrderStatus.Cancelled)
            .GroupBy(d => d.ProductId).Select(g => new { g.Key, First = g.Min(d => d.Order.OrderDate) })
            .ToDictionaryAsync(x => x.Key, x => x.First);
        var firstReceipt = await db.GoodsReceiptDetails
            .Where(d => ids.Contains(d.ProductId) && d.Receipt.Status == ReceiptStatus.Approved)
            .GroupBy(d => d.ProductId).Select(g => new { g.Key, First = g.Min(d => d.Receipt.ReceiptDate) })
            .ToDictionaryAsync(x => x.Key, x => x.First);
        var ordered = await db.OrderDetails
            .Where(d => ids.Contains(d.ProductId) && d.Order.Status != OrderStatus.Cancelled && d.Order.OrderDate >= slowFrom && d.Order.OrderDate < now)
            .Select(d => new { d.ProductId, d.Order.OrderDate, d.Quantity }).ToListAsync();

        foreach (var p in policies)
        {
            p.LastROPCalculatedAt = now;
            p.LastEOQCalculatedAt = now;
            DateTime? first = firstOrder.TryGetValue(p.ProductId, out var fo) ? fo : null;
            if (firstReceipt.TryGetValue(p.ProductId, out var fr) && (first is null || fr < first)) first = fr;
            var mine = ordered.Where(x => x.ProductId == p.ProductId).ToList();
            var state = first is null || first > from ? DemandState.InsufficientData
                : mine.Count == 0 ? DemandState.SlowMoving : DemandState.Normal;
            var daily = DailyDemand(mine.Select(x => (x.OrderDate, x.Quantity)), from);
            Apply(p, state, daily);
        }
        await db.SaveChangesAsync();
        await CheckAsync(ids);
        return policies.Count;
    }

    /// <summary>Q1–Q2: the 28 whole Vietnamese days before today, as [from, to) in UTC.</summary>
    public static (DateTime From, DateTime To) DemandWindow(DateTime utcNow)
    {
        var to = VnTime.ToUtc(VnTime.Today(utcNow).ToDateTime(TimeOnly.MinValue));
        return (to.AddDays(-ReplenishmentRules.WindowDays), to);
    }

    /// <summary>Ordered quantity on each of the 28 days from <paramref name="from"/> (Vietnamese days, orders outside are ignored).</summary>
    public static int[] DailyDemand(IEnumerable<(DateTime OrderDate, int Quantity)> orders, DateTime from)
    {
        var daily = new int[ReplenishmentRules.WindowDays];
        var first = VnTime.Today(from);
        foreach (var (at, qty) in orders)
        {
            var i = VnTime.Today(at).DayNumber - first.DayNumber;
            if (i is >= 0 and < ReplenishmentRules.WindowDays) daily[i] += qty;
        }
        return daily;
    }

    /// <summary>Stores the weekly figures of one product (also used by the demo seeder).</summary>
    public static void Apply(InventoryPolicy p, DemandState state, int[] daily)
    {
        p.DemandState = state;
        if (state != DemandState.Normal)
        {
            p.AvgDailyDemand = null; p.DemandStdDev = null;
            p.SafetyStock = null; p.CurrentROP = null; p.CurrentEOQ = null;
            return;
        }
        var s = ReplenishmentRules.DemandStats(daily);
        p.AvgDailyDemand = s.D;
        p.DemandStdDev = s.Sigma;
        p.SafetyStock = ReplenishmentRules.SafetyStock(s.Sigma, p.LeadTimeDays);
        p.CurrentROP = ReplenishmentRules.Rop(s.D, p.LeadTimeDays, p.SafetyStock.Value);
        p.CurrentEOQ = ReplenishmentRules.Eoq(s.D, p.OrderingCost, p.HoldingCost);
    }

    // ---------------- kiemTraCanhBao + kiemTraDeXuat ----------------

    /// <summary>Q7: tồn kho khả dụng = QuantityOnHand of "Bình thường" lots of approved receipts.</summary>
    public IQueryable<GoodsReceiptDetail> AvailableLots(int productId) => db.GoodsReceiptDetails
        .Where(d => d.ProductId == productId && d.Status == LotStatus.Normal && d.Receipt.Status == ReceiptStatus.Approved);

    /// <summary>Available stock and the quantity of orders received but not issued, per product (Q7, Q8).</summary>
    public async Task<Dictionary<int, (int Available, int Ordered)>> StockAsync(List<int>? productIds)
    {
        var available = await db.GoodsReceiptDetails
            .Where(d => (productIds == null || productIds.Contains(d.ProductId)) && d.Status == LotStatus.Normal && d.Receipt.Status == ReceiptStatus.Approved)
            .GroupBy(d => d.ProductId).Select(g => new { g.Key, Qty = g.Sum(d => d.QuantityOnHand) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty);
        var ordered = await db.OrderDetails
            .Where(d => (productIds == null || productIds.Contains(d.ProductId)) && OpenOrders.Contains(d.Order.Status))
            .GroupBy(d => d.ProductId).Select(g => new { g.Key, Qty = g.Sum(d => d.Quantity) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty);
        var ids = productIds ?? await db.Products.Select(p => p.ProductId).ToListAsync();
        return ids.Distinct().ToDictionary(id => id, id => (available.GetValueOrDefault(id), ordered.GetValueOrDefault(id)));
    }

    /// <summary>
    /// Run after a change of stock or open orders has been saved. Compares net stock with the stored ROP and opens, updates or
    /// closes the alert and the open proposal (Q9, Q10), and tells staff about "Chờ xử lý" orders that can now be issued. Saves.
    /// </summary>
    public async Task CheckAsync(IEnumerable<int> productIds)
    {
        var ids = productIds.Distinct().ToList();
        if (ids.Count == 0) return;
        var now = clock.UtcNow;
        var products = await db.Products.Include(p => p.Policy).Where(p => ids.Contains(p.ProductId)).ToListAsync();
        var stock = await StockAsync(ids);
        var alerts = await db.StockAlerts.Where(a => ids.Contains(a.ProductId) && a.Status == AlertStatus.Open).ToListAsync();
        var recent = now.AddDays(-ReplenishmentRules.RecentDecisionDays);
        var proposals = await db.ReplenishmentProposals
            .Where(r => ids.Contains(r.ProductId) && (r.Status == ProposalStatus.Pending
                || ((r.Status == ProposalStatus.Reported || r.Status == ProposalStatus.Rejected) && r.ApprovedAt >= recent)))
            .ToListAsync();
        var week = ReplenishmentRules.WeekStart(now);

        foreach (var product in products)
        {
            var (available, ordered) = stock[product.ProductId];
            var mine = proposals.Where(r => r.ProductId == product.ProductId).ToList();
            var outcome = Evaluate(product.Policy, available, ordered, alerts.FirstOrDefault(a => a.ProductId == product.ProductId), mine, now, week);
            if (outcome.NewAlert is { } alert)
            {
                db.StockAlerts.Add(alert);
                await notify.ToRoleAsync(UserRole.Manager, $"Cảnh báo tồn kho thấp: {product.SKU}",
                    $"{product.ProductName} còn tồn ròng {alert.CurrentQuantity} {product.Unit} (khả dụng {available}, đơn chưa xuất {ordered}), "
                    + $"không lớn hơn ROP {alert.ROPValue.ToString("#,##0.#", Vi)}.", "/ql/canh-bao", Notifier.Warning);
            }
            if (outcome.NewProposal is { } proposal)
            {
                proposal.Product = product;
                db.ReplenishmentProposals.Add(proposal);
            }
        }
        await NotifyReadyOrdersAsync(ids);
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// "Chờ xử lý" orders (short of stock) for these products that now have enough free stock: staff are told once per order.
    /// Oldest first, each taking its share of the free stock, so two orders are not both told about the same goods. Does not save.
    /// </summary>
    private async Task NotifyReadyOrdersAsync(List<int> productIds)
    {
        var waiting = await db.Orders.Include(o => o.Details)
            .Where(o => o.Status == OrderStatus.OnHold && o.Details.Any(d => productIds.Contains(d.ProductId)))
            .OrderBy(o => o.OrderDate).ThenBy(o => o.OrderId).ToListAsync();
        if (!waiting.Any(o => o.ReadyNotifiedAt is null)) return;
        var needed = waiting.SelectMany(o => o.Details.Select(d => d.ProductId)).Distinct().ToList();
        var free = await Issuing.IssueService.Free(db).Where(i => needed.Contains(i.ReceiptDetail.ProductId))
            .GroupBy(i => i.ReceiptDetail.ProductId).Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);
        foreach (var order in waiting)
        {
            if (order.Details.Any(d => free.GetValueOrDefault(d.ProductId) < d.Quantity)) continue;
            foreach (var d in order.Details) free[d.ProductId] -= d.Quantity;
            if (order.ReadyNotifiedAt is not null) continue;
            order.ReadyNotifiedAt = clock.UtcNow;
            await notify.ToRoleAsync(UserRole.Staff, $"Đơn {order.ExternalCode} đã đủ hàng",
                $"{order.CustomerName ?? "Khách lẻ"}, {order.Details.Sum(d => d.Quantity)} sản phẩm. Lập phiếu xuất cho đơn này.",
                $"/kho/xuat-kho/don/{order.OrderId}", Notifier.Success);
        }
    }

    public record Outcome(StockAlert? NewAlert, ReplenishmentProposal? NewProposal);

    /// <summary>
    /// Q9–Q16 for one product, on tracked entities: updates or closes <paramref name="alert"/> and the proposals in
    /// <paramref name="proposals"/> (the product's pending one and its recent reported and rejected ones) and returns what has to be added.
    /// Shared with the demo seeder.
    /// </summary>
    public static Outcome Evaluate(InventoryPolicy? policy, int available, int ordered, StockAlert? alert,
        IReadOnlyCollection<ReplenishmentProposal> proposals, DateTime now, DateTime weekStart)
    {
        var pending = proposals.FirstOrDefault(r => r.Status == ProposalStatus.Pending);
        var net = available - ordered;
        if (policy?.CurrentROP is not { } rop)
        {
            // Q3: no ROP (too little history, slow-moving): nothing stays open.
            Close(alert, pending, net, now);
            return new(null, null);
        }
        var d = policy.AvgDailyDemand ?? 0;
        var priority = ReplenishmentRules.Classify(net, rop, d, policy.LeadTimeDays);
        if (priority is not (Priority.Urgent or Priority.Order))
        {
            // Net stock above ROP, or no demand in 4 weeks and no shortage (Q12): nothing to order.
            Close(alert, pending, net, now);
            return new(null, null);
        }

        StockAlert? newAlert = null;
        if (alert is null) alert = newAlert = new StockAlert { ProductId = policy.ProductId, AlertDate = now, Status = AlertStatus.Open };
        alert.CurrentQuantity = net;
        alert.ROPValue = rop;

        ReplenishmentProposal? newProposal = null;
        if (pending is null)
        {
            // Q10: one open proposal per product; after a report, none until L + 3 days have passed (goods may be on the way);
            // a proposal left out is not raised again in the same week.
            if (proposals.Any(r => r.Status == ProposalStatus.Reported && r.ApprovedAt is { } at && now < ReplenishmentRules.ReproposeFrom(at, policy.LeadTimeDays))
                || proposals.Any(r => r.Status == ProposalStatus.Rejected && r.ApprovedAt >= weekStart))
                return new(newAlert, null);
            pending = newProposal = new ReplenishmentProposal { ProductId = policy.ProductId, ProposalDate = now, Status = ProposalStatus.Pending };
        }
        var eoq = policy.CurrentEOQ ?? 0;
        var q = ReplenishmentRules.ProposalQuantity(rop, eoq, net, d);
        pending.AvailableQuantity = available;
        pending.NetQuantity = net;
        pending.ROPValue = rop;
        pending.EOQValue = eoq;
        pending.AvgDailyDemand = d;
        pending.Priority = priority.Value;
        pending.BaseQuantity = q.Base;
        pending.OriginalQuantity = q.Proposed;
        pending.AdjustBasis = q.Basis;
        if (pending.AdjustReason is null) pending.ProposedQuantity = q.Proposed; // keep a manager's edit
        return new(newAlert, newProposal);
    }

    private static void Close(StockAlert? alert, ReplenishmentProposal? pending, int net, DateTime now)
    {
        if (alert is not null)
        {
            alert.Status = AlertStatus.Closed;
            alert.ClosedAt = now;
            alert.CurrentQuantity = net;
        }
        if (pending is not null) pending.Status = ProposalStatus.Closed;
    }

    /// <summary>Products touched by the given lots (after receipt approval, delivery, stocktake, lot lock/unlock).</summary>
    public async Task CheckLotsAsync(IEnumerable<int> receiptDetailIds)
    {
        var lotIds = receiptDetailIds.Distinct().ToList();
        await CheckAsync(await db.GoodsReceiptDetails.Where(d => lotIds.Contains(d.ReceiptDetailId)).Select(d => d.ProductId).Distinct().ToListAsync());
    }

    /// <summary>
    /// Products whose report block (L + 3 days) ended since <paramref name="since"/>: checked again so a new proposal follows when
    /// net stock is still at or below ROP. Run daily by the background job.
    /// </summary>
    public async Task<int> CheckReportedAsync(DateTime since)
    {
        var now = clock.UtcNow;
        var recent = now.AddDays(-ReplenishmentRules.RecentDecisionDays);
        var reported = await db.ReplenishmentProposals
            .Where(r => r.Status == ProposalStatus.Reported && r.ApprovedAt >= recent)
            .Select(r => new { r.ProductId, At = r.ApprovedAt!.Value, Lead = r.Product.Policy != null ? r.Product.Policy.LeadTimeDays : 0 })
            .ToListAsync();
        var ids = reported.Where(r => ReplenishmentRules.ReproposeFrom(r.At, r.Lead) is var from && from > since && from <= now)
            .Select(r => r.ProductId).Distinct().ToList();
        await CheckAsync(ids);
        return ids.Count;
    }

    // ---------------- UC_18: xem xét đề xuất, lập báo cáo ----------------

    /// <summary>
    /// Puts the ticked pending proposals in a new report ("Đã lập báo cáo") with the content built by the caller from them.
    /// After this the system does not follow the proposals: the purchase is decided outside it.
    /// </summary>
    public async Task<ReplenishmentReport> CreateReportAsync(List<int>? ids, int managerId, Func<List<ReplenishmentProposal>, Task<(string Snapshot, int Suppliers)>> build)
    {
        var list = await db.ReplenishmentProposals.Where(r => (ids ?? new List<int>()).Contains(r.ProposalId)).ToListAsync();
        if (list.Count == 0) throw new RuleException("Chọn ít nhất một đề xuất để lập báo cáo.");
        var notPending = list.Count(r => r.Status != ProposalStatus.Pending);
        if (notPending > 0) throw new RuleException($"Có {notPending} đề xuất không còn chờ xem xét. Tải lại danh sách.");
        var (snapshot, suppliers) = await build(list);
        var now = clock.UtcNow;
        var report = new ReplenishmentReport
        {
            Code = await new CodeGenerator(db).NextDocumentAsync(CodeGenerator.Replenishment, now), CreatedAt = now, CreatedBy = managerId,
            ProposalCount = list.Count, SupplierCount = suppliers, TotalQuantity = list.Sum(r => r.ProposedQuantity), Snapshot = snapshot,
        };
        foreach (var r in list) { r.Status = ProposalStatus.Reported; r.ApprovedBy = managerId; r.ApprovedAt = now; r.Report = report; }
        db.ReplenishmentReports.Add(report);
        await db.SaveChangesAsync();
        return report;
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

    /// <summary>The manager changes the quantity with a reason; the system quantity (Q13–Q15) is kept for reference.</summary>
    public async Task<ReplenishmentProposal> AdjustAsync(int id, int? quantity, string? reason)
    {
        var r = await LoadPendingAsync(id);
        var text = CatalogService.Clean(reason);
        new Validator()
            .Check(quantity is >= 1 and <= 1_000_000, "quantity", "Số lượng đề xuất phải lớn hơn 0.")
            .Check(quantity == r.OriginalQuantity || text is { Length: >= 5 }, "reason", "Ghi lý do đổi số lượng so với số hệ thống đề xuất (tối thiểu 5 ký tự).")
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
            throw new RuleException($"Đề xuất đang “{Labels<ProposalStatus>.ToLabel(r.Status)}”, không còn chờ xem xét.");
        return r;
    }
}
