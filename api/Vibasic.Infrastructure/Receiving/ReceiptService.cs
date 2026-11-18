using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;

namespace Vibasic.Infrastructure.Receiving;

/// <param name="ReceivedQuantity">Số lượng thực nhận (đạt + không đạt).</param>
/// <param name="FailedQuantity">Số lượng không đạt kiểm định; becomes a separate "Tạm cách ly" lot.</param>
/// <param name="DocumentQuantity">Số lượng trên chứng từ giao hàng, when it differs from what was received (UC_04 4.1).</param>
/// <param name="Note">Ghi chú chênh lệch so với chứng từ.</param>
/// <param name="DefectDescription">Mô tả lỗi; becomes the abnormal report of the quarantined lot at submission (UC_05 step 3).</param>
public record ReceiptLineInput(int? ProductId, int? ReceivedQuantity, int? FailedQuantity, int? DocumentQuantity, string? Note, string? DefectDescription);
/// <param name="DeliveryNoteNo">Số chứng từ giao hàng của nhà cung cấp (N2).</param>
public record ReceiptInput(int? SupplierId, string? Note, List<ReceiptLineInput>? Lines, string? DeliveryNoteNo = null);

/// <summary>
/// Goods receipt workflow: UC_04 (lập phiếu, tạo lô và mã định danh), UC_05 (xác nhận, gửi duyệt) and the receipt half of UC_10.
/// <list type="bullet">
/// <item>Đang nhập kho → (submit) Chờ duyệt → (approve) Đã duyệt | (reject) Từ chối → (edit, submit) Chờ duyệt.</item>
/// <item>Per product, passed goods form a "Bình thường" lot and failed goods a "Tạm cách ly" lot on the same receipt.</item>
/// <item>Lots hold no stock (QuantityOnHand = 0, items "Chờ nhập") until the receipt is approved.</item>
/// </list>
/// </summary>
public class ReceiptService(VibasicDbContext db, CodeGenerator codes, IClock clock, Decision.ReplenishmentService replenish)
{
    /// <summary>Upper bound per line; item serials are 4 digits per SKU per month.</summary>
    public const int MaxLineQuantity = 2_000;
    public const int MinReasonLength = 5;

    private sealed record Line(Product Product, int Passed, int Failed, int? DocumentQuantity, string? Note, string? Defect);

    // ---------------- UC_04: lập phiếu ----------------

    public async Task<GoodsReceipt> CreateAsync(ReceiptInput input, int userId)
    {
        var (supplierId, note, deliveryNote, lines) = await ValidateAsync(input);
        var now = clock.UtcNow;
        var receipt = new GoodsReceipt
        {
            Code = await codes.NextDocumentAsync(CodeGenerator.Receipt, now), SupplierId = supplierId, ReceiptDate = now,
            CreatedBy = userId, Status = ReceiptStatus.Receiving, Note = note, DeliveryNoteNo = deliveryNote,
        };
        foreach (var line in lines) await AddLotsAsync(receipt, line, now);
        db.GoodsReceipts.Add(receipt);
        await db.SaveChangesAsync();
        return receipt;
    }

    /// <summary>
    /// Edit while "Đang nhập kho" or after "Từ chối" (UC_05 5.1). A product whose passed/failed quantities are unchanged keeps its
    /// lots and printed codes; otherwise its lots are replaced and new labels must be printed.
    /// </summary>
    public async Task<GoodsReceipt> UpdateAsync(int id, ReceiptInput input)
    {
        var receipt = await LoadAsync(id);
        EnsureEditable(receipt);
        var (supplierId, note, deliveryNote, lines) = await ValidateAsync(input);
        var now = clock.UtcNow;
        receipt.SupplierId = supplierId;
        receipt.Note = note;
        receipt.DeliveryNoteNo = deliveryNote;

        var reports = await db.AbnormalReports.Include(a => a.Items).Where(a => a.ReceiptDetail.ReceiptId == id).ToListAsync();
        var old = receipt.Details.GroupBy(d => d.ProductId).ToDictionary(g => g.Key, g => g.ToList());
        foreach (var line in lines)
        {
            if (old.Remove(line.Product.ProductId, out var lots))
            {
                var normal = lots.SingleOrDefault(d => d.Status == LotStatus.Normal);
                var quarantined = lots.SingleOrDefault(d => d.Status == LotStatus.Quarantined);
                if ((normal?.Quantity ?? 0) == line.Passed && (quarantined?.Quantity ?? 0) == line.Failed)
                {
                    ApplyNotes(normal, quarantined, line);
                    continue;
                }
                RemoveLots(receipt, lots, reports);
            }
            await AddLotsAsync(receipt, line, now);
        }
        foreach (var lots in old.Values) RemoveLots(receipt, lots, reports);
        await db.SaveChangesAsync();
        return receipt;
    }

    // ---------------- UC_05: xác nhận nhập kho, gửi duyệt ----------------

    /// <summary>Staff confirm the goods are labelled and shelved; one abnormal report per quarantined lot is filed (UC_05 step 3).</summary>
    public async Task<GoodsReceipt> SubmitAsync(int id, int userId)
    {
        var receipt = await LoadAsync(id);
        EnsureEditable(receipt);
        if (receipt.Details.Count == 0) throw new RuleException($"Phiếu {receipt.Code} chưa có mặt hàng nào.");
        var now = clock.UtcNow;

        var reports = await db.AbnormalReports.Include(a => a.Items).Where(a => a.ReceiptDetail.ReceiptId == id).ToListAsync();
        foreach (var lot in receipt.Details.Where(d => d.Status == LotStatus.Quarantined))
        {
            var report = reports.SingleOrDefault(a => a.ReceiptDetailId == lot.ReceiptDetailId);
            if (report is null)
            {
                report = new AbnormalReport
                {
                    Code = await codes.NextDocumentAsync(CodeGenerator.Abnormal, now), ReceiptDetail = lot, SourceType = AbnormalSource.Receipt,
                    CreatedBy = userId, CreatedAt = now, Status = ApprovalStatus.Pending, Scope = ReportScope.Lot,
                };
                // The failed lot holds only the items that did not pass.
                report.Items.AddRange(lot.Items.Select(i => new AbnormalReportItem { Item = i }));
                db.AbnormalReports.Add(report);
            }
            report.Description = lot.Note ?? "Không đạt kiểm định khi nhập kho.";
            report.Quantity = lot.Quantity;
        }

        receipt.Status = ReceiptStatus.Pending;
        receipt.SubmittedAt = now;
        receipt.ApprovedBy = null;
        receipt.ApprovedAt = null;
        await db.SaveChangesAsync();
        return receipt;
    }

    // ---------------- UC_10: duyệt / từ chối phiếu nhập ----------------

    /// <summary>Records the approver and puts every lot of the receipt into stock (quarantined lots stay unavailable).</summary>
    public async Task<GoodsReceipt> ApproveAsync(int id, int managerId)
    {
        var receipt = await LoadAsync(id);
        EnsurePending(receipt);
        foreach (var lot in receipt.Details)
        {
            lot.QuantityOnHand = lot.Quantity;
            foreach (var item in lot.Items.Where(i => i.Status == ItemStatus.Incoming)) item.Status = ItemStatus.InStock;
        }
        receipt.Status = ReceiptStatus.Approved;
        receipt.ApprovedBy = managerId;
        receipt.ApprovedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        await replenish.CheckAsync(receipt.Details.Select(d => d.ProductId));
        return receipt;
    }

    public async Task<GoodsReceipt> RejectAsync(int id, string? reason, int managerId)
    {
        var receipt = await LoadAsync(id);
        EnsurePending(receipt);
        var text = RequireReason(reason);
        receipt.Status = ReceiptStatus.Rejected;
        receipt.RejectReason = text;
        receipt.ApprovedBy = managerId;
        receipt.ApprovedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        return receipt;
    }

    /// <summary>
    /// Hủy duyệt: the manager takes an approval back while the stock it recorded is untouched (no item reserved, issued, counted or
    /// adjusted). Stock is removed again, the abnormal reports of the receipt return to "Chờ duyệt" with their lots "Tạm cách ly",
    /// and the receipt goes back to "Chờ duyệt" so it can be approved again or rejected for the staff to edit.
    /// </summary>
    public async Task<GoodsReceipt> RevokeAsync(int id, string? reason, int managerId)
    {
        var receipt = await LoadAsync(id);
        if (receipt.Status != ReceiptStatus.Approved)
            throw new RuleException($"Phiếu {receipt.Code} đang ở trạng thái “{Labels<ReceiptStatus>.ToLabel(receipt.Status)}”, chưa duyệt nên không có gì để hủy.");
        RequireReason(reason);
        if (await RevokeBlockAsync(receipt) is { } block) throw new RuleException(block);
        var lotIds = receipt.Details.Select(d => d.ReceiptDetailId).ToList();
        var reports = await db.AbnormalReports.Where(a => lotIds.Contains(a.ReceiptDetailId)).ToListAsync();

        foreach (var report in reports)
        {
            report.Status = ApprovalStatus.Pending;
            report.RejectReason = null;
            report.ApprovedBy = null;
            report.ApprovedAt = null;
            receipt.Details.Single(d => d.ReceiptDetailId == report.ReceiptDetailId).Status = LotStatus.Quarantined;
        }
        foreach (var lot in receipt.Details)
        {
            lot.QuantityOnHand = 0;
            foreach (var item in lot.Items) item.Status = ItemStatus.Incoming;
        }
        receipt.Status = ReceiptStatus.Pending;
        receipt.ApprovedBy = null;
        receipt.ApprovedAt = null;
        await db.SaveChangesAsync();
        await replenish.CheckAsync(receipt.Details.Select(d => d.ProductId));
        return receipt;
    }

    /// <summary>Why the approval of this receipt can no longer be taken back; null while it still can (or it is not approved).</summary>
    public async Task<string?> RevokeBlockAsync(int id) => await RevokeBlockAsync(await LoadAsync(id));

    /// <summary>
    /// Hủy duyệt is possible only while the stock the receipt recorded is untouched. Once any item of it was reserved, issued,
    /// written off or set aside, its lots were put in a stocktake plan, or an abnormal report was filed on them after receiving,
    /// later documents depend on that stock and the approval stays.
    /// </summary>
    private async Task<string?> RevokeBlockAsync(GoodsReceipt receipt)
    {
        if (receipt.Status != ReceiptStatus.Approved) return null;
        var lotIds = receipt.Details.Select(d => d.ReceiptDetailId).ToList();
        var used = receipt.Details.FirstOrDefault(d => d.QuantityOnHand != d.Quantity
            || d.Items.Any(i => i.Status != ItemStatus.InStock || i.IssueDetailId != null));
        if (used is not null)
            return $"Hàng của lô {used.LotCode} đã được giữ chỗ, xuất kho hoặc điều chỉnh tồn, nên không hủy duyệt phiếu {receipt.Code} được nữa.";
        var plan = await db.StocktakePlanDetails.Where(p => lotIds.Contains(p.ReceiptDetailId)).Select(p => p.Plan.Code).FirstOrDefaultAsync()
            ?? await db.StocktakeDetails.Where(s => lotIds.Contains(s.ReceiptDetailId)).Select(s => s.Stocktake.Code).FirstOrDefaultAsync();
        if (plan is not null)
            return $"Lô của phiếu {receipt.Code} đã nằm trong kiểm kê {plan}, không hủy duyệt được nữa.";
        var report = await db.AbnormalReports.Where(a => lotIds.Contains(a.ReceiptDetailId) && a.SourceType != AbnormalSource.Receipt)
            .Select(a => a.Code).FirstOrDefaultAsync();
        if (report is not null)
            return $"Lô của phiếu {receipt.Code} đã có biên bản {report} lập sau khi nhập kho, không hủy duyệt được nữa.";
        return null;
    }

    // ---------------- helpers ----------------

    private static string RequireReason(string? reason)
    {
        var text = Catalog.CatalogService.Clean(reason);
        new Validator()
            .Check(text is { Length: >= MinReasonLength }, "reason", $"Bắt buộc nhập lý do (tối thiểu {MinReasonLength} ký tự).")
            .Check(text is null || text.Length <= 255, "reason", "Lý do tối đa 255 ký tự.")
            .ThrowIfAny();
        return text!;
    }

    private async Task<GoodsReceipt> LoadAsync(int id) =>
        await db.GoodsReceipts
            .Include(r => r.Details).ThenInclude(d => d.Items)
            .Include(r => r.Details).ThenInclude(d => d.Product)
            .SingleOrDefaultAsync(r => r.ReceiptId == id)
        ?? throw new NotFoundException("Không tìm thấy phiếu nhập.");

    private static void EnsureEditable(GoodsReceipt r)
    {
        if (r.Status is not (ReceiptStatus.Receiving or ReceiptStatus.Rejected))
            throw new RuleException($"Phiếu {r.Code} đang ở trạng thái “{Labels<ReceiptStatus>.ToLabel(r.Status)}”, không sửa hoặc gửi lại được.");
    }

    private static void EnsurePending(GoodsReceipt r)
    {
        if (r.Status != ReceiptStatus.Pending)
            throw new RuleException($"Phiếu {r.Code} đang ở trạng thái “{Labels<ReceiptStatus>.ToLabel(r.Status)}”, không còn chờ duyệt.");
    }

    private async Task<(int supplierId, string? note, string? deliveryNote, List<Line> lines)> ValidateAsync(ReceiptInput input)
    {
        var v = new Validator();
        var note = Catalog.CatalogService.Clean(input.Note);
        var deliveryNote = Catalog.CatalogService.Clean(input.DeliveryNoteNo);
        v.Check(deliveryNote is null || deliveryNote.Length <= 50, "deliveryNoteNo", "Số chứng từ tối đa 50 ký tự.");
        v.Check(input.SupplierId is not null, "supplierId", "Chọn nhà cung cấp.");
        if (input.SupplierId is not null && !await db.Suppliers.AnyAsync(s => s.SupplierId == input.SupplierId))
            v.Check(false, "supplierId", "Nhà cung cấp không còn trong danh mục.");
        v.Check(note is null || note.Length <= 255, "note", "Ghi chú tối đa 255 ký tự.");

        var raw = input.Lines ?? [];
        v.Check(raw.Count > 0, "lines", "Thêm ít nhất một mặt hàng.");
        var ids = raw.Where(l => l.ProductId is not null).Select(l => l.ProductId!.Value).Distinct().ToList();
        var products = await db.Products.Where(p => ids.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId);

        var lines = new List<Line>();
        var seen = new HashSet<int>();
        for (var i = 0; i < raw.Count; i++)
        {
            var l = raw[i];
            var key = $"lines[{i}].";
            var received = l.ReceivedQuantity;
            var failed = l.FailedQuantity ?? 0;
            var lineNote = Catalog.CatalogService.Clean(l.Note);
            var defect = Catalog.CatalogService.Clean(l.DefectDescription);
            products.TryGetValue(l.ProductId ?? 0, out var product);

            v.Check(l.ProductId is not null, key + "productId", "Chọn mặt hàng.")
             .Check(l.ProductId is null || product is not null, key + "productId", "Mặt hàng không còn trong danh mục.")
             .Check(product is null || input.SupplierId is null || product.SupplierId == input.SupplierId, key + "productId",
                 "Mặt hàng này không do nhà cung cấp đã chọn cung cấp.")
             .Check(product is null || seen.Add(product.ProductId), key + "productId", "Mặt hàng này đã có ở dòng trên. Gộp số lượng vào một dòng.")
             .Check(received is >= 1 and <= MaxLineQuantity, key + "receivedQuantity", "Số thực nhận từ 1 đến 2.000.")
             .Check(failed >= 0 && (received is null || failed <= received), key + "failedQuantity", "Số không đạt từ 0 đến số thực nhận.")
             .Check(l.DocumentQuantity is null or >= 0 and <= 1_000_000, key + "documentQuantity", "Số trên chứng từ không hợp lệ.")
             .Check(failed == 0 || defect is { Length: >= MinReasonLength }, key + "defectDescription",
                 $"Mô tả lỗi của hàng không đạt (tối thiểu {MinReasonLength} ký tự) để lập biên bản bất thường.")
             .Check(defect is null || defect.Length <= 500, key + "defectDescription", "Mô tả lỗi tối đa 500 ký tự.")
             .Check(lineNote is null || lineNote.Length <= 255, key + "note", "Ghi chú tối đa 255 ký tự.");
            // UC_04 4.1: a difference from the delivery note must be explained. With nothing passed, the defect description covers it.
            var passed = (received ?? 0) - failed;
            v.Check(l.DocumentQuantity is null || l.DocumentQuantity == received || passed <= 0 || lineNote is not null,
                key + "note", "Số thực nhận khác chứng từ: ghi chú chênh lệch (thiếu hay dư, lý do).");

            if (product is not null && received is not null)
                lines.Add(new Line(product, passed, failed, l.DocumentQuantity == received ? null : l.DocumentQuantity, lineNote, defect));
        }
        v.ThrowIfAny();
        return (input.SupplierId!.Value, note, deliveryNote, lines);
    }

    private async Task AddLotsAsync(GoodsReceipt receipt, Line line, DateTime now)
    {
        if (line.Passed > 0)
            receipt.Details.Add(await NewLotAsync(line.Product, line.Passed, LotStatus.Normal, line.DocumentQuantity, line.Note, now));
        if (line.Failed > 0)
            receipt.Details.Add(await NewLotAsync(line.Product, line.Failed, LotStatus.Quarantined,
                line.Passed > 0 ? null : line.DocumentQuantity, line.Defect, now));
    }

    private async Task<GoodsReceiptDetail> NewLotAsync(Product product, int quantity, LotStatus status, int? documentQuantity, string? note, DateTime now)
    {
        var lot = new GoodsReceiptDetail
        {
            Product = product, ProductId = product.ProductId, LotCode = await codes.NextLotAsync(now),
            Quantity = quantity, QuantityOnHand = 0, Status = status, DocumentQuantity = documentQuantity, Note = note,
        };
        var (head, first) = await codes.ReserveSerialsAsync(product.SKU, now, quantity);
        for (var i = 0; i < quantity; i++)
            lot.Items.Add(new StockItem { SerialCode = head + (first + i).ToString("D4"), Status = ItemStatus.Incoming });
        return lot;
    }

    private static void ApplyNotes(GoodsReceiptDetail? normal, GoodsReceiptDetail? quarantined, Line line)
    {
        if (normal is not null) { normal.DocumentQuantity = line.DocumentQuantity; normal.Note = line.Note; }
        if (quarantined is not null)
        {
            quarantined.Note = line.Defect;
            quarantined.DocumentQuantity = normal is null ? line.DocumentQuantity : null;
        }
    }

    private void RemoveLots(GoodsReceipt receipt, List<GoodsReceiptDetail> lots, List<AbnormalReport> reports)
    {
        foreach (var lot in lots)
        {
            db.AbnormalReports.RemoveRange(reports.Where(a => a.ReceiptDetailId == lot.ReceiptDetailId));
            db.StockItems.RemoveRange(lot.Items);
            receipt.Details.Remove(lot);
            db.GoodsReceiptDetails.Remove(lot);
        }
    }
}
