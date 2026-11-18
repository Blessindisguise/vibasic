using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Catalog;

namespace Vibasic.Infrastructure.Issuing;

public record AllocLot(int ReceiptDetailId, string LotCode, DateTime ReceivedDate, int Take, List<string> Serials);
public record AllocLine(int ProductId, string Sku, string ProductName, string Unit, int Ordered, int Free, int Shortage, List<AllocLot> Lots);
/// <summary>UC_07 steps 2–6: what the FIFO allocation of an order would pick, and whether stock suffices.</summary>
public record Allocation(int OrderId, bool Sufficient, List<AllocLine> Lines);

public record OrderLineInput(string? Sku, int? Quantity);
/// <summary>An order pushed by the sales system (UC_07 precondition: "đơn hàng đã được ghi nhận từ hệ thống khác").</summary>
public record OrderInput(string? ExternalCode, string? CustomerName, DateTime? OrderDate, List<OrderLineInput>? Lines,
    string? CustomerPhone = null, string? ShippingAddress = null, string? Note = null);

/// <param name="ReplacedSerial">X1: the scanned item was taken in place of this one (same lot).</param>
/// <param name="LotPicked">A lot label was scanned and the issue takes the whole lot: the number of its items marked picked by this scan.</param>
public record ScanResult(string Serial, string LotCode, string Sku, bool AlreadyPicked, int Picked, int Total, string? ReplacedSerial = null, int LotPicked = 0);

/// <summary>Outcome of a defect report during picking (UC_08 3.1 / 3.2).</summary>
/// <param name="Replaced">Items swapped out of this issue: the defective ones, or every item of a lot now quarantined.</param>
/// <param name="ReturnPicked">Items already picked that must go back to the shelf (their lot is quarantined; never the defective ones).</param>
public record DefectResult(List<string> ReportCodes, int Replaced, List<string> ReturnPicked, bool OnHold);

/// <summary>
/// Goods issue workflow: UC_07 (FIFO allocation, lập phiếu), UC_10 for issues, UC_08 (lấy hàng, quét, báo lỗi, giao hàng).
/// <list type="bullet">
/// <item>Order: Chưa xuất | Chờ xử lý → (issue created) Đang xuất → Đã xuất. Until delivered the manager may cancel it ("Đã hủy").</item>
/// <item>Issue: Chờ lấy hàng → Đã xuất, with no approval step: the order already decides what leaves and FIFO decides which items.
/// Or Đã hủy (items released) when replacements run out or the order is cancelled; whatever was already picked goes back on the shelf.</item>
/// <item>Allocated items are "Đã giữ chỗ" and still counted in their lot's QuantityOnHand until delivery.</item>
/// </list>
/// </summary>
public class IssueService(VibasicDbContext db, CodeGenerator codes, IClock clock, Decision.ReplenishmentService replenish)
{
    /// <summary>An issue is held for its picker this long from the claim; after that another staff member may take it over.</summary>
    public static readonly TimeSpan PickHold = TimeSpan.FromDays(3);

    /// <summary>Items that can be allocated: in stock, not reserved, in a "Bình thường" lot of an approved receipt.</summary>
    public static IQueryable<StockItem> Free(VibasicDbContext db) => db.StockItems
        .Where(i => i.Status == ItemStatus.InStock && i.IssueDetailId == null && i.ReceiptDetail.Status == LotStatus.Normal
            && i.ReceiptDetail.Receipt.Status == ReceiptStatus.Approved);

    /// <summary>Free items of one product in FIFO order.</summary>
    private IQueryable<StockItem> FreeItems(int productId) => Free(db)
        .Where(i => i.ReceiptDetail.ProductId == productId)
        .OrderBy(i => i.ReceiptDetail.Receipt.ReceiptDate).ThenBy(i => i.ReceiptDetailId).ThenBy(i => i.SerialCode);

    // ---------------- Tiếp nhận đơn hàng từ hệ thống bán hàng ----------------

    public async Task<Order> RecordOrderAsync(OrderInput input)
    {
        var code = CatalogService.Clean(input.ExternalCode)?.ToUpperInvariant();
        var customer = CatalogService.Clean(input.CustomerName);
        var phone = CatalogService.Clean(input.CustomerPhone);
        var address = CatalogService.Clean(input.ShippingAddress);
        var note = CatalogService.Clean(input.Note);
        var phoneDigits = phone?.Count(char.IsDigit) ?? 0;
        var lines = input.Lines ?? [];
        var skus = lines.Select(l => CatalogService.Clean(l.Sku)?.ToUpperInvariant()).OfType<string>().ToList();
        var products = await db.Products.Where(p => skus.Contains(p.SKU)).ToDictionaryAsync(p => p.SKU);

        var v = new Validator()
            .Check(code is { Length: <= 50 }, "externalCode", "Nhập mã đơn hàng (tối đa 50 ký tự).")
            .Check(customer is null || customer.Length <= 150, "customerName", "Tên khách hàng tối đa 150 ký tự.")
            .Check(phone is null || (phone.Length <= 20 && phone.All(ch => char.IsDigit(ch) || " +.-".Contains(ch)) && phoneDigits is >= 8 and <= 15),
                "customerPhone", "Số điện thoại gồm 8–15 chữ số (được dùng dấu cách, +, ., -).")
            .Check(address is null || address.Length <= 300, "shippingAddress", "Địa chỉ giao hàng tối đa 300 ký tự.")
            .Check(note is null || note.Length <= 500, "note", "Ghi chú tối đa 500 ký tự.")
            .Check(lines.Count > 0, "lines", "Đơn hàng cần ít nhất một mặt hàng.");
        if (code is not null && await db.Orders.AnyAsync(o => o.ExternalCode == code)) v.Check(false, "externalCode", $"Đơn {code} đã được ghi nhận.");
        for (var i = 0; i < lines.Count; i++)
        {
            var sku = CatalogService.Clean(lines[i].Sku)?.ToUpperInvariant();
            v.Check(sku is not null && products.ContainsKey(sku), $"lines[{i}].sku", $"Không có mặt hàng mã {sku}.")
             .Check(lines[i].Quantity is >= 1 and <= 10_000, $"lines[{i}].quantity", "Số lượng từ 1 đến 10.000.")
             .Check(skus.Count(s => s == sku) == 1, $"lines[{i}].sku", $"Mã {sku} lặp lại trong đơn.");
        }
        v.ThrowIfAny();

        var order = new Order
        {
            ExternalCode = code!, CustomerName = customer, CustomerPhone = phone, ShippingAddress = address, Note = note,
            OrderDate = input.OrderDate ?? clock.UtcNow, Status = OrderStatus.Open,
        };
        foreach (var l in lines)
            order.Details.Add(new OrderDetail { Product = products[CatalogService.Clean(l.Sku)!.ToUpperInvariant()], Quantity = l.Quantity!.Value });
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        // Q8: a new order lowers net stock, so it can raise an alert and a proposal.
        await replenish.CheckAsync(order.Details.Select(d => d.ProductId));
        return order;
    }

    // ---------------- UC_07: phân bổ FIFO, lập phiếu ----------------

    public async Task<Allocation> PreviewAsync(int orderId)
    {
        var order = await LoadOrderAsync(orderId);
        var lines = new List<AllocLine>();
        foreach (var d in order.Details.OrderBy(d => d.Product.SKU))
        {
            var free = await FreeItems(d.ProductId).CountAsync();
            var take = await FreeItems(d.ProductId).Take(d.Quantity)
                .Select(i => new { i.ReceiptDetailId, i.ReceiptDetail.LotCode, i.ReceiptDetail.Receipt.ReceiptDate, i.SerialCode })
                .ToListAsync();
            var lots = take.GroupBy(i => (i.ReceiptDetailId, i.LotCode, i.ReceiptDate))
                .Select(g => new AllocLot(g.Key.ReceiptDetailId, g.Key.LotCode, g.Key.ReceiptDate, g.Count(), g.Select(i => i.SerialCode).ToList()))
                .ToList();
            lines.Add(new AllocLine(d.ProductId, d.Product.SKU, d.Product.ProductName, d.Product.Unit, d.Quantity, free, Math.Max(0, d.Quantity - free), lots));
        }
        return new Allocation(orderId, lines.All(l => l.Shortage == 0), lines);
    }

    /// <summary>
    /// UC_07: reserve FIFO items for every line; the issue is ready to pick at once. When any product is short (3.1),
    /// the order becomes "Chờ xử lý", nothing is reserved, and a <see cref="RuleException"/> explains the shortage.
    /// </summary>
    public async Task<GoodsIssue> CreateAsync(int orderId, int userId)
    {
        var order = await LoadOrderAsync(orderId);
        if (order.Status is not (OrderStatus.Open or OrderStatus.OnHold))
            throw new RuleException($"Đơn {order.ExternalCode} đang ở trạng thái “{Labels<OrderStatus>.ToLabel(order.Status)}”, không lập phiếu xuất được.");

        var now = clock.UtcNow;
        var picks = new List<(OrderDetail line, List<StockItem> items)>();
        var shortages = new List<string>();
        foreach (var d in order.Details)
        {
            var items = await FreeItems(d.ProductId).Take(d.Quantity).ToListAsync();
            if (items.Count < d.Quantity) shortages.Add($"{d.Product.SKU} thiếu {d.Quantity - items.Count} {d.Product.Unit}");
            picks.Add((d, items));
        }
        if (shortages.Count > 0)
        {
            order.Status = OrderStatus.OnHold;
            await db.SaveChangesAsync();
            throw new RuleException($"Không đủ hàng tồn kho cho đơn {order.ExternalCode}: {string.Join("; ", shortages)}. Đơn chuyển sang “Chờ xử lý”.");
        }

        var issue = new GoodsIssue
        {
            Code = await codes.NextDocumentAsync(CodeGenerator.Issue, now), OrderId = orderId, IssueDate = now,
            CreatedBy = userId, Status = IssueStatus.Ready,
        };
        foreach (var (line, items) in picks)
        {
            var detail = new GoodsIssueDetail { ProductId = line.ProductId, Quantity = line.Quantity };
            foreach (var item in items) { item.Status = ItemStatus.Reserved; detail.Items.Add(item); }
            issue.Details.Add(detail);
        }
        order.Status = OrderStatus.InProgress;
        db.GoodsIssues.Add(issue);
        await db.SaveChangesAsync();
        return issue;
    }

    // ---------------- UC_08: lấy hàng, quét mã, báo lỗi, giao hàng ----------------

    /// <summary>
    /// "Bắt đầu lấy hàng": one staff member holds an approved issue at a time. Anyone may take it when it is free; another staff
    /// member may take it over ("Nhận lại phiếu") only once <see cref="PickHold"/> has passed since the holder claimed it.
    /// </summary>
    public async Task<GoodsIssue> ClaimAsync(int id, int userId)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Ready, "không lấy hàng được");
        var now = clock.UtcNow;
        if (issue.PickerId is { } holder && holder != userId)
        {
            if (!HoldExpired(issue, now)) throw Held(issue);
            issue.PickStartedAt = null;
        }
        issue.PickerId = userId;
        issue.PickStartedAt ??= now;
        issue.PickActiveAt = now;
        await db.SaveChangesAsync();
        return issue;
    }

    /// <summary>
    /// "Nhường phiếu" by the picker, or "Gỡ người lấy hàng" by a manager at any time. Scanned items stay scanned:
    /// the next picker continues from there.
    /// </summary>
    public async Task<GoodsIssue> ReleaseAsync(int id, int userId, bool isManager)
    {
        var issue = await LoadAsync(id);
        if (issue.PickerId is not { } holder) return issue;
        if (!isManager && holder != userId) throw Held(issue);
        ClearPicker(issue);
        await db.SaveChangesAsync();
        return issue;
    }

    /// <summary>Counted from the claim: scanning does not extend the hold.</summary>
    private static bool HoldExpired(GoodsIssue issue, DateTime now) => issue.PickStartedAt is null || now - issue.PickStartedAt.Value >= PickHold;

    private static RuleException Held(GoodsIssue issue)
    {
        var name = issue.Picker?.FullName ?? "nhân viên khác";
        var last = issue.PickStartedAt is { } t ? $" (nhận phiếu lúc {VnTime.ToLocal(t):dd/MM/yyyy HH:mm})" : "";
        var after = issue.PickStartedAt is { } a ? $" Phiếu được giữ cho {name} tới {VnTime.ToLocal(a + PickHold):dd/MM/yyyy HH:mm}." : "";
        return new RuleException($"Phiếu {issue.Code} đang do {name} lấy hàng{last}.{after}");
    }

    /// <summary>Scan, defect and delivery are the picker's: a free issue is claimed on the spot, one held by someone else is refused.</summary>
    private void EnsurePicker(GoodsIssue issue, int userId)
    {
        if (issue.PickerId is { } holder && holder != userId) throw Held(issue);
        var now = clock.UtcNow;
        issue.PickerId = userId;
        issue.PickStartedAt ??= now;
        issue.PickActiveAt = now;
    }

    private static void ClearPicker(GoodsIssue issue)
    {
        issue.PickerId = null;
        issue.Picker = null;
        issue.PickStartedAt = null;
        issue.PickActiveAt = null;
    }

    /// <summary>UC_08 step 2 / 2.1: the scanned item must be one reserved for this issue.</summary>
    public async Task<ScanResult> ScanAsync(int id, string? code, int userId)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Ready, "không lấy hàng được");
        EnsurePicker(issue, userId);
        var serial = CatalogService.Clean(code)?.ToUpperInvariant();
        if (serial is null) throw new RuleException("Quét hoặc nhập mã sản phẩm.");

        var ofLot = issue.Details.SelectMany(d => d.Items).Where(i => i.ReceiptDetail.LotCode == serial).ToList();
        if (ofLot.Count > 0) return await ScanLotAsync(issue, ofLot);

        var mine =issue.Details.SelectMany(d => d.Items).SingleOrDefault(i => i.SerialCode == serial);
        if (mine is null)
        {
            var other = await db.StockItems.Include(i => i.ReceiptDetail).ThenInclude(d => d.Product)
                .SingleOrDefaultAsync(i => i.SerialCode == serial);
            if (other is null)
            {
                var lot = await db.GoodsReceiptDetails.AnyAsync(d => d.LotCode == serial);
                throw new RuleException(lot ? $"{serial} là mã lô. Quét mã trên tem từng sản phẩm." : $"Không tìm thấy sản phẩm có mã {serial}.");
            }
            if (other.Status == ItemStatus.Defective)
                throw new RuleException($"{serial} đã có biên bản lỗi. Để riêng ở khu hàng lỗi, lấy sản phẩm khác.");
            if (other.ReceiptDetail.Status != LotStatus.Normal)
                throw new RuleException($"{serial} thuộc lô {other.ReceiptDetail.LotCode} đang “{Labels<LotStatus>.ToLabel(other.ReceiptDetail.Status)}”. Để lại sản phẩm, lấy đúng mã trên phiếu.");
            var line = issue.Details.FirstOrDefault(d => d.ProductId == other.ReceiptDetail.ProductId);
            if (line is null)
                throw new RuleException($"{serial} ({other.ReceiptDetail.Product.SKU}) không có trong phiếu {issue.Code}.");

            // X1: items of one lot are interchangeable for FIFO. Take the scanned one in place of an unscanned item of the same lot.
            var swapFor = line.Items.Where(i => i.PickedAt == null && i.ReceiptDetailId == other.ReceiptDetailId)
                .OrderBy(i => i.SerialCode).FirstOrDefault();
            if (swapFor is not null && other.PickedAt is null && other.Status is ItemStatus.InStock or ItemStatus.Reserved)
            {
                if (other.Status == ItemStatus.InStock)
                {
                    Unreserve(swapFor);
                    line.Items.Remove(swapFor);
                }
                else
                {
                    // Reserved for another issue and not scanned there yet: the two issues trade items.
                    var otherLine = await db.GoodsIssueDetails.Include(d => d.Items).SingleAsync(d => d.IssueDetailId == other.IssueDetailId);
                    otherLine.Items.Remove(other);
                    line.Items.Remove(swapFor);
                    otherLine.Items.Add(swapFor);
                }
                other.Status = ItemStatus.Reserved;
                other.PickedAt = clock.UtcNow;
                line.Items.Add(other);
                await db.SaveChangesAsync();
                var items = issue.Details.SelectMany(d => d.Items).ToList();
                return new ScanResult(serial, other.ReceiptDetail.LotCode, other.ReceiptDetail.Product.SKU, false,
                    items.Count(i => i.PickedAt != null), items.Count, swapFor.SerialCode);
            }

            var next = line.Items.Where(i => i.PickedAt == null).OrderBy(i => i.ReceiptDetailId).ThenBy(i => i.SerialCode).FirstOrDefault();
            throw new RuleException(
                swapFor is not null ? $"{serial} đã được lấy cho phiếu xuất khác. Lấy sản phẩm khác của lô {other.ReceiptDetail.LotCode}."
                : next is null ? $"Đã lấy đủ {line.Quantity} {other.ReceiptDetail.Product.Unit} {other.ReceiptDetail.Product.SKU}. Để lại {serial}."
                : $"Sai thứ tự FIFO: {serial} thuộc lô {other.ReceiptDetail.LotCode}, không có trong danh sách lấy hàng. Lấy từ lô {next.ReceiptDetail.LotCode}, ví dụ {next.SerialCode}.");
        }

        var already = mine.PickedAt is not null;
        mine.PickedAt ??= clock.UtcNow;
        await db.SaveChangesAsync();
        var all = issue.Details.SelectMany(d => d.Items).ToList();
        return new ScanResult(serial, mine.ReceiptDetail.LotCode, mine.ReceiptDetail.Product.SKU, already, all.Count(i => i.PickedAt != null), all.Count);
    }

    /// <summary>
    /// A lot label scanned while picking. When this issue holds every item of the lot still on the shelf (none free, none reserved
    /// by another issue), the whole lot leaves in one scan and every item is marked picked. Otherwise items must be scanned one by one,
    /// so the system always knows which codes left the warehouse.
    /// </summary>
    private async Task<ScanResult> ScanLotAsync(GoodsIssue issue, List<StockItem> mine)
    {
        var lot = mine[0].ReceiptDetail;
        if (lot.Status != LotStatus.Normal)
            throw new RuleException($"Lô {lot.LotCode} đang “{Labels<LotStatus>.ToLabel(lot.Status)}”, không lấy hàng của lô này.");
        var onShelf = await db.StockItems.CountAsync(i => i.ReceiptDetailId == lot.ReceiptDetailId
            && (i.Status == ItemStatus.InStock || i.Status == ItemStatus.Reserved));
        if (onShelf > mine.Count)
            throw new RuleException($"Phiếu chỉ lấy {mine.Count}/{onShelf} {lot.Product.Unit} của lô {lot.LotCode}. Quét từng tem sản phẩm.");

        var now = clock.UtcNow;
        var added = 0;
        foreach (var item in mine.Where(i => i.PickedAt is null)) { item.PickedAt = now; added++; }
        await db.SaveChangesAsync();
        var all = issue.Details.SelectMany(d => d.Items).ToList();
        return new ScanResult(lot.LotCode, lot.LotCode, lot.Product.SKU, added == 0, all.Count(i => i.PickedAt != null), all.Count, LotPicked: added);
    }

    /// <summary>
    /// UC_08 3.1 / UC_11 (nguồn: xuất kho): file one abnormal report per affected lot listing the defective items. They are set aside
    /// ("Lỗi") and replaced on this issue by FIFO. With <paramref name="wholeLot"/> (defect suspected in the whole lot) the lot is also
    /// quarantined and every item of it reserved on open issues is replaced. If a replacement runs out (3.2), that issue is cancelled
    /// and its order goes "Chờ xử lý".
    /// </summary>
    public async Task<DefectResult> ReportDefectAsync(int id, List<string>? serials, string? description, int userId, bool wholeLot = false)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Ready, "không còn chờ lấy hàng");
        EnsurePicker(issue, userId);
        var text = CatalogService.Clean(description);
        var codesIn = (serials ?? []).Select(s => CatalogService.Clean(s)?.ToUpperInvariant()).OfType<string>().Distinct().ToList();
        new Validator()
            .Check(codesIn.Count > 0, "serials", "Chọn sản phẩm bị lỗi.")
            .Check(text is { Length: >= 5 }, "description", "Mô tả lỗi (tối thiểu 5 ký tự).")
            .Check(text is null || text.Length <= 500, "description", "Mô tả lỗi tối đa 500 ký tự.")
            .ThrowIfAny();
        var items = issue.Details.SelectMany(d => d.Items).ToList();
        var defective = items.Where(i => codesIn.Contains(i.SerialCode)).ToList();
        var unknown = codesIn.Except(defective.Select(i => i.SerialCode)).ToList();
        if (unknown.Count > 0) throw new RuleException($"Không có trong phiếu {issue.Code}: {string.Join(", ", unknown)}.");

        var now = clock.UtcNow;
        var reports = new List<string>();
        foreach (var group in defective.GroupBy(i => i.ReceiptDetail))
        {
            var report = new AbnormalReport
            {
                Code = await codes.NextDocumentAsync(CodeGenerator.Abnormal, now), ReceiptDetail = group.Key, SourceType = AbnormalSource.Issue,
                Description = text!, Quantity = group.Count(), CreatedBy = userId, CreatedAt = now, Status = ApprovalStatus.Pending, IssueId = id,
                Scope = wholeLot ? ReportScope.Lot : ReportScope.Items,
            };
            report.Items.AddRange(group.Select(i => new AbnormalReportItem { Item = i }));
            db.AbnormalReports.Add(report);
            if (wholeLot) group.Key.Status = LotStatus.Quarantined;
            reports.Add(report.Code);
        }

        var lotIds = defective.Select(i => i.ReceiptDetailId).Distinct().ToList();
        var mineBefore = items.Where(i => lotIds.Contains(i.ReceiptDetailId)).ToList();
        List<int> replace;
        List<string> returnPicked;
        if (wholeLot)
        {
            replace = await db.StockItems.Where(i => lotIds.Contains(i.ReceiptDetailId) && i.Status == ItemStatus.Reserved).Select(i => i.ItemId).ToListAsync();
            returnPicked = mineBefore.Where(i => i.PickedAt != null && !defective.Contains(i)).Select(i => i.SerialCode).ToList();
        }
        else
        {
            replace = defective.Select(i => i.ItemId).ToList();
            returnPicked = [];
        }
        var held = await ReplaceReservedAsync(replace, wholeLot ? lotIds : [],
            wholeLot ? "Không đủ hàng thay thế cho sản phẩm thuộc lô bị cách ly." : "Không đủ hàng thay thế cho sản phẩm lỗi.");
        foreach (var item in defective) Abnormal.Defects.Mark(item, now);
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync(lotIds);
        return new DefectResult(reports, wholeLot ? mineBefore.Count : defective.Count, returnPicked, held.Contains(issue.IssueId));
    }

    /// <summary>UC_08 steps 4–8: every reserved item must be scanned; items leave stock lot by lot.</summary>
    public async Task<GoodsIssue> DeliverAsync(int id, string? receiverName, int userId)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Ready, "không còn chờ lấy hàng");
        EnsurePicker(issue, userId);
        var receiver = CatalogService.Clean(receiverName);
        new Validator()
            .Check(receiver is not null, "receiverName", "Nhập tên người nhận hàng.")
            .Check(receiver is null || receiver.Length <= 100, "receiverName", "Tên người nhận tối đa 100 ký tự.")
            .ThrowIfAny();
        var items = issue.Details.SelectMany(d => d.Items).ToList();
        var missing = items.Count(i => i.PickedAt is null);
        if (missing > 0) throw new RuleException($"Còn {missing} sản phẩm chưa quét. Quét đủ trước khi xác nhận giao hàng.");

        foreach (var item in items)
        {
            item.Status = ItemStatus.Issued;
            item.ReceiptDetail.QuantityOnHand -= 1;
        }
        var now = clock.UtcNow;
        issue.Status = IssueStatus.Issued;
        issue.ReceiverName = receiver;
        issue.DeliveredAt = now;
        issue.DeliveredBy = userId;
        issue.Order.Status = OrderStatus.Issued;
        await db.SaveChangesAsync();
        await replenish.CheckAsync(issue.Details.Select(d => d.ProductId));
        return issue;
    }

    // ---------------- Hủy đơn hàng ----------------

    public record CancelResult(Order Order, string? IssueCode);

    /// <summary>
    /// The customer cancelled: the manager (standing in for the sales system) cancels an order not yet delivered, with a reason.
    /// An open issue of it is cancelled too and its items released. The order no longer counts
    /// as ordered (Q8), so net stock rises.
    /// </summary>
    public async Task<CancelResult> CancelOrderAsync(int orderId, string? reason, int managerId)
    {
        var order = await LoadOrderAsync(orderId);
        if (order.Status is OrderStatus.Issued or OrderStatus.Cancelled)
            throw new RuleException($"Đơn {order.ExternalCode} đang “{Labels<OrderStatus>.ToLabel(order.Status)}”, không hủy được.");
        var text = RequireReason(reason);
        var now = clock.UtcNow;
        var open = await db.GoodsIssues.Where(i => i.OrderId == orderId && i.Status == IssueStatus.Ready)
            .Select(i => i.IssueId).ToListAsync();
        GoodsIssue? issue = open.Count > 0 ? await LoadAsync(open[0]) : null;
        if (issue is not null) Cancel(issue, $"Đơn bị hủy: {text}");
        order.Status = OrderStatus.Cancelled;
        order.CancelReason = text;
        order.CancelledAt = now;
        order.CancelledBy = managerId;
        await db.SaveChangesAsync();
        await replenish.CheckAsync(order.Details.Select(d => d.ProductId));
        return new CancelResult(order, issue?.Code);
    }

    // ---------------- helpers ----------------

    /// <summary>
    /// Lots in <paramref name="lotIds"/> are no longer issuable (quarantined). Swap their reserved items on every open issue for the
    /// next free items by FIFO. Returns the issues that could not be refilled and were cancelled, their orders "Chờ xử lý" (UC_08 3.2).
    /// Does not save; the caller commits with its own change.
    /// </summary>
    public async Task<HashSet<int>> ReplaceFromLotsAsync(List<int> lotIds)
    {
        var affected = await db.StockItems
            .Where(i => lotIds.Contains(i.ReceiptDetailId) && i.Status == ItemStatus.Reserved)
            .Select(i => i.ItemId).ToListAsync();
        return await ReplaceReservedAsync(affected, lotIds, "Không đủ hàng thay thế cho sản phẩm thuộc lô bị cách ly.");
    }

    /// <summary>
    /// Take the given reserved items off their issues and refill each line by FIFO from lots other than <paramref name="excludeLots"/>.
    /// Used when a lot is quarantined and when a stocktake finds reserved items missing. Does not save.
    /// </summary>
    public async Task<HashSet<int>> ReplaceReservedAsync(List<int> itemIds, List<int> excludeLots, string cancelReason)
    {
        var affected = await db.StockItems
            .Include(i => i.IssueDetail!).ThenInclude(d => d.Issue).ThenInclude(i => i.Order)
            .Include(i => i.IssueDetail!).ThenInclude(d => d.Product)
            .Include(i => i.ReceiptDetail)
            .Where(i => itemIds.Contains(i.ItemId) && i.Status == ItemStatus.Reserved)
            .ToListAsync();
        var lotIds = excludeLots;
        var taken = new HashSet<int>();
        var held = new HashSet<int>();

        foreach (var byIssue in affected.GroupBy(i => i.IssueDetail!.Issue))
        {
            var issue = byIssue.Key;
            var swaps = new List<(GoodsIssueDetail line, StockItem old, StockItem replacement)>();
            var short_ = false;
            foreach (var byLine in byIssue.GroupBy(i => i.IssueDetail!))
            {
                var need = byLine.Count();
                // Items released in this pass are still free in the database but must not come back; neither may items already taken.
                var candidates = await FreeItems(byLine.Key.ProductId)
                    .Include(i => i.ReceiptDetail)
                    .Where(i => !lotIds.Contains(i.ReceiptDetailId) && !itemIds.Contains(i.ItemId))
                    .Take(need + taken.Count).ToListAsync();
                var fresh = candidates.Where(c => !taken.Contains(c.ItemId) && c.Status == ItemStatus.InStock && c.IssueDetail == null).Take(need).ToList();
                if (fresh.Count < need) { short_ = true; break; }
                swaps.AddRange(byLine.Zip(fresh, (o, n) => (byLine.Key, o, n)));
            }

            if (short_)
            {
                // Only the affected lines may be loaded; release needs every line of the issue.
                await db.Entry(issue).Collection(i => i.Details).Query().Include(d => d.Items).LoadAsync();
                Cancel(issue, cancelReason);
                issue.Order.Status = OrderStatus.OnHold;
                held.Add(issue.IssueId);
                continue;
            }
            foreach (var (line, old, replacement) in swaps)
            {
                Unreserve(old);
                replacement.Status = ItemStatus.Reserved;
                replacement.IssueDetail = line;
                line.Items.Add(replacement);
                taken.Add(replacement.ItemId);
            }
        }
        return held;
    }

    /// <summary>
    /// Ends an issue without delivery: its items are released (anything already picked goes back on the shelf).
    /// </summary>
    private static void Cancel(GoodsIssue issue, string reason)
    {
        Release(issue);
        ClearPicker(issue);
        issue.Status = IssueStatus.Cancelled;
        issue.CancelReason = reason;
    }

    private static void Unreserve(StockItem item)
    {
        item.Status = ItemStatus.InStock;
        item.IssueDetailId = null;
        item.IssueDetail = null;
        item.PickedAt = null;
    }

    private static void Release(GoodsIssue issue)
    {
        foreach (var d in issue.Details)
        {
            foreach (var item in d.Items.Where(i => i.Status == ItemStatus.Reserved).ToList()) Unreserve(item);
            d.Items.RemoveAll(i => i.IssueDetailId == null);
        }
    }

    private static string RequireReason(string? reason)
    {
        var text = CatalogService.Clean(reason);
        new Validator()
            .Check(text is { Length: >= 5 }, "reason", "Bắt buộc nhập lý do (tối thiểu 5 ký tự).")
            .Check(text is null || text.Length <= 255, "reason", "Lý do tối đa 255 ký tự.")
            .ThrowIfAny();
        return text!;
    }

    private static void EnsureStatus(GoodsIssue issue, IssueStatus expected, string what)
    {
        if (issue.Status != expected)
            throw new RuleException($"Phiếu {issue.Code} đang “{Labels<IssueStatus>.ToLabel(issue.Status)}”, {what}.");
    }

    private async Task<Order> LoadOrderAsync(int id) =>
        await db.Orders.Include(o => o.Details).ThenInclude(d => d.Product).SingleOrDefaultAsync(o => o.OrderId == id)
        ?? throw new NotFoundException("Không tìm thấy đơn hàng.");

    private async Task<GoodsIssue> LoadAsync(int id) =>
        await db.GoodsIssues
            .Include(i => i.Order)
            .Include(i => i.Picker)
            .Include(i => i.Details).ThenInclude(d => d.Items).ThenInclude(it => it.ReceiptDetail).ThenInclude(r => r.Product)
            .Include(i => i.Details).ThenInclude(d => d.Product)
            .SingleOrDefaultAsync(i => i.IssueId == id)
        ?? throw new NotFoundException("Không tìm thấy phiếu xuất.");
}
