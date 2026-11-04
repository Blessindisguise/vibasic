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
public record OrderInput(string? ExternalCode, string? CustomerName, DateTime? OrderDate, List<OrderLineInput>? Lines);

public record ScanResult(string Serial, string LotCode, string Sku, bool AlreadyPicked, int Picked, int Total);

/// <summary>Outcome of a defect report during picking (UC_08 3.1 / 3.2).</summary>
/// <param name="Replaced">Items swapped out of this issue because their lot is now quarantined.</param>
/// <param name="ReturnPicked">Of those, items already picked that must go back to the shelf.</param>
public record DefectResult(List<string> ReportCodes, int Replaced, List<string> ReturnPicked, bool OnHold);

/// <summary>
/// Goods issue workflow: UC_07 (FIFO allocation, lập phiếu), UC_10 for issues, UC_08 (lấy hàng, quét, báo lỗi, giao hàng).
/// <list type="bullet">
/// <item>Order: Chưa xuất | Chờ xử lý → (issue created) Đang xuất → Đã xuất; a rejected issue puts it back to Chưa xuất.</item>
/// <item>Issue: Chờ duyệt → Đã duyệt → Đã xuất; or Từ chối; or Chờ xử lý when replacements run out.</item>
/// <item>Allocated items are "Đã giữ chỗ" and still counted in their lot's QuantityOnHand until delivery.</item>
/// </list>
/// </summary>
public class IssueService(VibasicDbContext db, CodeGenerator codes, Notifier notify, IClock clock)
{
    /// <summary>Items that can be allocated: in stock, not reserved, in a "Bình thường" lot of an approved receipt; FIFO order.</summary>
    private IQueryable<StockItem> FreeItems(int productId) => db.StockItems
        .Where(i => i.Status == ItemStatus.InStock && i.IssueDetailId == null
            && i.ReceiptDetail.ProductId == productId && i.ReceiptDetail.Status == LotStatus.Normal
            && i.ReceiptDetail.Receipt.Status == ReceiptStatus.Approved)
        .OrderBy(i => i.ReceiptDetail.Receipt.ReceiptDate).ThenBy(i => i.ReceiptDetailId).ThenBy(i => i.SerialCode);

    // ---------------- Tiếp nhận đơn hàng từ hệ thống bán hàng ----------------

    public async Task<Order> RecordOrderAsync(OrderInput input)
    {
        var code = CatalogService.Clean(input.ExternalCode)?.ToUpperInvariant();
        var customer = CatalogService.Clean(input.CustomerName);
        var lines = input.Lines ?? [];
        var skus = lines.Select(l => CatalogService.Clean(l.Sku)?.ToUpperInvariant()).OfType<string>().ToList();
        var products = await db.Products.Where(p => skus.Contains(p.SKU)).ToDictionaryAsync(p => p.SKU);

        var v = new Validator()
            .Check(code is { Length: <= 50 }, "externalCode", "Nhập mã đơn hàng (tối đa 50 ký tự).")
            .Check(customer is null || customer.Length <= 150, "customerName", "Tên khách hàng tối đa 150 ký tự.")
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

        var order = new Order { ExternalCode = code!, CustomerName = customer, OrderDate = input.OrderDate ?? clock.UtcNow, Status = OrderStatus.Open };
        foreach (var l in lines)
            order.Details.Add(new OrderDetail { Product = products[CatalogService.Clean(l.Sku)!.ToUpperInvariant()], Quantity = l.Quantity!.Value });
        db.Orders.Add(order);
        await db.SaveChangesAsync();
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
    /// UC_07: reserve FIFO items for every line and send the issue for approval. When any product is short (3.1),
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
            await notify.ToRoleAsync(UserRole.Manager, $"Đơn {order.ExternalCode} chờ xử lý vì không đủ hàng", string.Join("; ", shortages) + ".",
                "/ql/xuat-kho", Notifier.Warning);
            await db.SaveChangesAsync();
            throw new RuleException($"Không đủ hàng tồn kho cho đơn {order.ExternalCode}: {string.Join("; ", shortages)}. Đơn chuyển sang “Chờ xử lý”.");
        }

        var issue = new GoodsIssue
        {
            Code = await codes.NextDocumentAsync(CodeGenerator.Issue, now), OrderId = orderId, IssueDate = now,
            CreatedBy = userId, Status = IssueStatus.Pending,
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
        // The link needs the new id, so the notification is saved second.
        await notify.ToRoleAsync(UserRole.Manager, $"Phiếu xuất {issue.Code} chờ duyệt",
            $"Đơn {order.ExternalCode}{(order.CustomerName is null ? "" : $" ({order.CustomerName})")}, {order.Details.Sum(d => d.Quantity)} sản phẩm.",
            $"/ql/xuat-kho/{issue.IssueId}", Notifier.Warning);
        await db.SaveChangesAsync();
        return issue;
    }

    // ---------------- UC_10: duyệt / từ chối phiếu xuất ----------------

    public async Task<GoodsIssue> ApproveAsync(int id, int managerId)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Pending, "không còn chờ duyệt");
        issue.Status = IssueStatus.Approved;
        issue.ApprovedBy = managerId;
        issue.ApprovedAt = clock.UtcNow;
        notify.ToUser(issue.CreatedBy, $"Phiếu xuất {issue.Code} đã được duyệt", "Lấy hàng theo danh sách lô và quét mã từng sản phẩm.",
            $"/kho/xuat-kho/{id}", Notifier.Success);
        await db.SaveChangesAsync();
        return issue;
    }

    /// <summary>Releases every reserved item; stock is unchanged and the order can be issued again.</summary>
    public async Task<GoodsIssue> RejectAsync(int id, string? reason, int managerId)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Pending, "không còn chờ duyệt");
        var text = RequireReason(reason);
        Release(issue);
        issue.Status = IssueStatus.Rejected;
        issue.RejectReason = text;
        issue.ApprovedBy = managerId;
        issue.ApprovedAt = clock.UtcNow;
        issue.Order.Status = OrderStatus.Open;
        notify.ToUser(issue.CreatedBy, $"Phiếu xuất {issue.Code} bị từ chối", $"Lý do: {text}. Đơn {issue.Order.ExternalCode} trở về Chưa xuất.",
            $"/kho/xuat-kho/{id}", Notifier.Danger);
        await db.SaveChangesAsync();
        return issue;
    }

    // ---------------- UC_08: lấy hàng, quét mã, báo lỗi, giao hàng ----------------

    /// <summary>UC_08 step 2 / 2.1: the scanned item must be one reserved for this issue.</summary>
    public async Task<ScanResult> ScanAsync(int id, string? code)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Approved, "chưa được duyệt hoặc đã xuất, không lấy hàng được");
        var serial = CatalogService.Clean(code)?.ToUpperInvariant();
        if (serial is null) throw new RuleException("Quét hoặc nhập mã sản phẩm.");

        var mine = issue.Details.SelectMany(d => d.Items).SingleOrDefault(i => i.SerialCode == serial);
        if (mine is null)
        {
            var other = await db.StockItems.Include(i => i.ReceiptDetail).ThenInclude(d => d.Product)
                .SingleOrDefaultAsync(i => i.SerialCode == serial);
            if (other is null)
            {
                var lot = await db.GoodsReceiptDetails.AnyAsync(d => d.LotCode == serial);
                throw new RuleException(lot ? $"{serial} là mã lô. Quét mã trên tem từng sản phẩm." : $"Không tìm thấy sản phẩm có mã {serial}.");
            }
            if (other.ReceiptDetail.Status != LotStatus.Normal)
                throw new RuleException($"{serial} thuộc lô {other.ReceiptDetail.LotCode} đang “{Labels<LotStatus>.ToLabel(other.ReceiptDetail.Status)}”. Để lại sản phẩm, lấy đúng mã trên phiếu.");
            var line = issue.Details.FirstOrDefault(d => d.ProductId == other.ReceiptDetail.ProductId);
            if (line is null)
                throw new RuleException($"{serial} ({other.ReceiptDetail.Product.SKU}) không có trong phiếu {issue.Code}.");
            var next = line.Items.Where(i => i.PickedAt == null).OrderBy(i => i.ReceiptDetailId).ThenBy(i => i.SerialCode).FirstOrDefault();
            throw new RuleException(next is null
                ? $"Đã lấy đủ {line.Quantity} {other.ReceiptDetail.Product.Unit} {other.ReceiptDetail.Product.SKU}. Để lại {serial}."
                : $"Sai thứ tự FIFO: {serial} không có trong danh sách lấy hàng. Lấy từ lô {next.ReceiptDetail.LotCode}, ví dụ {next.SerialCode}.");
        }

        var already = mine.PickedAt is not null;
        mine.PickedAt ??= clock.UtcNow;
        await db.SaveChangesAsync();
        var all = issue.Details.SelectMany(d => d.Items).ToList();
        return new ScanResult(serial, mine.ReceiptDetail.LotCode, mine.ReceiptDetail.Product.SKU, already, all.Count(i => i.PickedAt != null), all.Count);
    }

    /// <summary>
    /// UC_08 3.1 / UC_11 (nguồn: xuất kho): file one abnormal report per affected lot, quarantine the lot, and replace by FIFO
    /// every item of that lot reserved on open issues. If a replacement runs out (3.2), that issue goes "Chờ xử lý".
    /// </summary>
    public async Task<DefectResult> ReportDefectAsync(int id, List<string>? serials, string? description, int userId)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Approved, "chưa được duyệt hoặc đã xuất");
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
            };
            db.AbnormalReports.Add(report);
            group.Key.Status = LotStatus.Quarantined;
            reports.Add(report.Code);
            await notify.ToRoleAsync(UserRole.Manager, $"Biên bản {report.Code} chờ duyệt",
                $"Phát hiện khi xuất {issue.Code}: {group.Count()} {group.Key.Product.Unit} lô {group.Key.LotCode} lỗi. Lô đã tạm cách ly.",
                "/ql/cho-duyet?loai=bat-thuong", Notifier.Warning);
        }

        var lotIds = defective.Select(i => i.ReceiptDetailId).Distinct().ToList();
        var mineBefore = items.Where(i => lotIds.Contains(i.ReceiptDetailId)).ToList();
        var returnPicked = mineBefore.Where(i => i.PickedAt != null && !defective.Contains(i)).Select(i => i.SerialCode).ToList();
        var held = await ReplaceFromLotsAsync(lotIds, issue.IssueId);
        await db.SaveChangesAsync();
        return new DefectResult(reports, mineBefore.Count, returnPicked, held.Contains(issue.IssueId));
    }

    /// <summary>UC_08 steps 4–8: every reserved item must be scanned; items leave stock lot by lot.</summary>
    public async Task<GoodsIssue> DeliverAsync(int id, string? receiverName, int userId)
    {
        var issue = await LoadAsync(id);
        EnsureStatus(issue, IssueStatus.Approved, "chưa được duyệt hoặc đã xuất");
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
        // Phase 6 hooks the ROP check (UC_08 step 7) in here.
        await db.SaveChangesAsync();
        return issue;
    }

    // ---------------- helpers ----------------

    /// <summary>
    /// Lots in <paramref name="lotIds"/> are no longer issuable. Swap their reserved items on every open issue for the next free
    /// items by FIFO. Returns the issues that could not be refilled and were put "Chờ xử lý" (UC_08 3.2).
    /// </summary>
    private async Task<HashSet<int>> ReplaceFromLotsAsync(List<int> lotIds, int currentIssueId)
    {
        var affected = await db.StockItems
            .Include(i => i.IssueDetail!).ThenInclude(d => d.Issue).ThenInclude(i => i.Order)
            .Include(i => i.IssueDetail!).ThenInclude(d => d.Product)
            .Include(i => i.ReceiptDetail)
            .Where(i => lotIds.Contains(i.ReceiptDetailId) && i.Status == ItemStatus.Reserved)
            .ToListAsync();
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
                var candidates = await FreeItems(byLine.Key.ProductId)
                    .Include(i => i.ReceiptDetail)
                    .Where(i => !lotIds.Contains(i.ReceiptDetailId))
                    .Take(need + taken.Count).ToListAsync();
                var fresh = candidates.Where(c => !taken.Contains(c.ItemId)).Take(need).ToList();
                if (fresh.Count < need) { short_ = true; break; }
                swaps.AddRange(byLine.Zip(fresh, (o, n) => (byLine.Key, o, n)));
            }

            if (short_)
            {
                // Only the affected lines may be loaded; release needs every line of the issue.
                await db.Entry(issue).Collection(i => i.Details).Query().Include(d => d.Items).LoadAsync();
                Release(issue);
                issue.Status = IssueStatus.OnHold;
                issue.HoldReason = "Không đủ hàng thay thế cho sản phẩm thuộc lô bị cách ly.";
                issue.Order.Status = OrderStatus.OnHold;
                held.Add(issue.IssueId);
                notify.ToUser(issue.CreatedBy, $"Phiếu xuất {issue.Code} chuyển Chờ xử lý", issue.HoldReason, $"/kho/xuat-kho/{issue.IssueId}", Notifier.Danger);
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
            if (issue.IssueId != currentIssueId)
                notify.ToUser(issue.CreatedBy, $"Phiếu xuất {issue.Code} đổi {swaps.Count} sản phẩm",
                    $"Lô {string.Join(", ", byIssue.Select(i => i.ReceiptDetail.LotCode).Distinct())} đã tạm cách ly; danh sách lấy hàng được cập nhật theo FIFO.",
                    $"/kho/xuat-kho/{issue.IssueId}", Notifier.Warning);
        }
        return held;
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
            .Include(i => i.Details).ThenInclude(d => d.Items).ThenInclude(it => it.ReceiptDetail).ThenInclude(r => r.Product)
            .Include(i => i.Details).ThenInclude(d => d.Product)
            .SingleOrDefaultAsync(i => i.IssueId == id)
        ?? throw new NotFoundException("Không tìm thấy phiếu xuất.");
}
