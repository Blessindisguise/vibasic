using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Issuing;

namespace Vibasic.Infrastructure.Abnormal;

/// <summary>
/// UC_12 Duyệt biên bản bất thường. A report lists its defective items and has a scope:
/// <list type="bullet">
/// <item>"Sản phẩm lỗi": the listed items are set aside ("Lỗi") from filing; the rest of the lot stays issuable.
/// Approve keeps them out of stock; reject puts them back "Trong kho".</item>
/// <item>"Cả lô" (Chương 3): the lot is also quarantined while pending; approve locks it, reject returns it to "Bình thường".</item>
/// </list>
/// The manager may change the scope when approving. A report raised at receiving always covers its (failed) lot.
/// </summary>
public class AbnormalReportService(VibasicDbContext db, IClock clock, Decision.ReplenishmentService replenish, IssueService issues)
{
    /// <param name="wholeLot">Null keeps the scope the report was filed with.</param>
    public async Task<AbnormalReport> ApproveAsync(int id, int managerId, bool? wholeLot = null)
    {
        var report = await LoadPendingAsync(id);
        var lot = report.ReceiptDetail;
        var was = report.Scope;
        report.Scope = report.SourceType == AbnormalSource.Receipt ? ReportScope.Lot
            : wholeLot is null ? report.Scope : wholeLot.Value ? ReportScope.Lot : ReportScope.Items;
        if (report.Scope == ReportScope.Lot)
        {
            lot.Status = LotStatus.Locked;
            // Filed for the items only: the rest of the lot may still be reserved on open issues.
            if (was == ReportScope.Items) await issues.ReplaceFromLotsAsync([lot.ReceiptDetailId]);
        }
        else if (was == ReportScope.Lot && lot.Status == LotStatus.Quarantined && !await OtherPendingLotReportAsync(report))
            lot.Status = LotStatus.Normal;

        report.Status = ApprovalStatus.Approved;
        report.ApprovedBy = managerId;
        report.ApprovedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync([report.ReceiptDetailId]);
        return report;
    }

    public async Task<AbnormalReport> RejectAsync(int id, string? reason, int managerId)
    {
        var report = await LoadPendingAsync(id);
        var text = RequireReason(reason);
        var lot = report.ReceiptDetail;
        if (report.Scope == ReportScope.Lot && lot.Status == LotStatus.Quarantined && !await OtherPendingLotReportAsync(report))
            lot.Status = LotStatus.Normal;
        foreach (var x in report.Items) Defects.Restore(x.Item);
        report.Status = ApprovalStatus.Rejected;
        report.RejectReason = text;
        report.ApprovedBy = managerId;
        report.ApprovedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync([report.ReceiptDetailId]);
        return report;
    }

    /// <summary>
    /// Hủy quyết định: the report returns to "Chờ duyệt" with what it held while pending (its items "Lỗi"; for "Cả lô" the lot
    /// "Tạm cách ly"), so the manager can decide again. Items reserved since a rejection are replaced by FIFO.
    /// Refused once things have moved on: another decision changed the lot, or a listed item was picked, issued or written off.
    /// </summary>
    public async Task<AbnormalReport> RevokeAsync(int id, string? reason, int managerId)
    {
        var report = await LoadAsync(id);
        if (report.Status == ApprovalStatus.Pending)
            throw new RuleException($"Biên bản {report.Code} đang chờ duyệt, chưa có quyết định để hủy.");
        var lot = report.ReceiptDetail;
        var wholeLot = report.Scope == ReportScope.Lot;
        if (wholeLot)
        {
            var expected = report.Status == ApprovalStatus.Approved ? LotStatus.Locked : LotStatus.Normal;
            if (lot.Status != expected
                || await db.AbnormalReports.AnyAsync(a => a.ReceiptDetailId == lot.ReceiptDetailId && a.ReportId != id && a.Scope == ReportScope.Lot && a.CreatedAt > report.CreatedAt))
                throw new RuleException($"Lô {lot.LotCode} đã thay đổi sau quyết định này, không hủy được.");
        }
        // Items set aside again after a rejection: they must still be on the shelf. (Receipt reports list the lot; nothing to set aside.)
        var setAside = report.Status == ApprovalStatus.Rejected && report.SourceType != AbnormalSource.Receipt
            ? report.Items.Select(x => x.Item).ToList() : [];
        var moved = setAside.Select(Defects.WhyNot).OfType<string>().ToList();
        if (moved.Count > 0)
            throw new RuleException($"{string.Join("; ", moved.Take(3))} sau khi từ chối, không hủy quyết định được.");
        if (report.Status == ApprovalStatus.Rejected && report.SourceType == AbnormalSource.Receipt
            && await db.StockItems.AnyAsync(i => i.ReceiptDetailId == lot.ReceiptDetailId && (i.IssueDetailId != null || i.Status == ItemStatus.Issued)))
            throw new RuleException($"Sản phẩm của lô {lot.LotCode} đã được giữ chỗ hoặc xuất kho, không hủy quyết định được.");

        RequireReason(reason);
        var now = clock.UtcNow;
        if (report.Status == ApprovalStatus.Rejected)
        {
            var replace = (wholeLot ? await db.StockItems.Where(i => i.ReceiptDetailId == lot.ReceiptDetailId).ToListAsync() : setAside)
                .Where(i => i.Status == ItemStatus.Reserved).Select(i => i.ItemId).ToList();
            if (replace.Count > 0)
                await issues.ReplaceReservedAsync(replace, wholeLot ? [lot.ReceiptDetailId] : [],
                    $"Biên bản {report.Code} được xem xét lại; không đủ hàng thay thế cho sản phẩm của lô {lot.LotCode}.");
            foreach (var item in setAside) Defects.Mark(item, now);
        }
        if (wholeLot) lot.Status = LotStatus.Quarantined;
        report.Status = ApprovalStatus.Pending;
        report.RejectReason = null;
        report.ApprovedBy = null;
        report.ApprovedAt = null;
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync([report.ReceiptDetailId]);
        return report;
    }

    /// <summary>Another "Cả lô" report of the same lot still waiting: the lot stays quarantined for it.</summary>
    private Task<bool> OtherPendingLotReportAsync(AbnormalReport report) =>
        db.AbnormalReports.AnyAsync(a => a.ReceiptDetailId == report.ReceiptDetailId && a.ReportId != report.ReportId
            && a.Status == ApprovalStatus.Pending && a.Scope == ReportScope.Lot);

    private static string RequireReason(string? reason)
    {
        var text = Catalog.CatalogService.Clean(reason);
        new Validator()
            .Check(text is { Length: >= 5 }, "reason", "Bắt buộc nhập lý do (tối thiểu 5 ký tự).")
            .Check(text is null || text.Length <= 255, "reason", "Lý do tối đa 255 ký tự.")
            .ThrowIfAny();
        return text!;
    }

    private async Task<AbnormalReport> LoadAsync(int id) =>
        await db.AbnormalReports.Include(a => a.ReceiptDetail).ThenInclude(d => d.Receipt)
            .Include(a => a.Items).ThenInclude(x => x.Item).ThenInclude(i => i.ReceiptDetail)
            .SingleOrDefaultAsync(a => a.ReportId == id) ?? throw new NotFoundException("Không tìm thấy biên bản bất thường.");

    private async Task<AbnormalReport> LoadPendingAsync(int id)
    {
        var report = await LoadAsync(id);
        if (report.Status != ApprovalStatus.Pending)
            throw new RuleException($"Biên bản {report.Code} đã được xử lý ({Labels<ApprovalStatus>.ToLabel(report.Status)}).");
        // UC_05 steps 6–7: the receipt is approved first, then its abnormal reports are handled.
        var receipt = report.ReceiptDetail.Receipt;
        if (report.SourceType == AbnormalSource.Receipt && receipt.Status != ReceiptStatus.Approved)
            throw new RuleException($"Duyệt phiếu nhập {receipt.Code} trước, sau đó xử lý biên bản {report.Code}.");
        return report;
    }
}
