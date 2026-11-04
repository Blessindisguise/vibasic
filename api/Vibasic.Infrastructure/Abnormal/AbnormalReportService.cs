using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;

namespace Vibasic.Infrastructure.Abnormal;

/// <summary>
/// UC_12 Duyệt biên bản bất thường. Approve → the lot is locked ("Đã khóa") and leaves available stock;
/// reject → the lot returns to "Bình thường" and counts as available.
/// </summary>
public class AbnormalReportService(VibasicDbContext db, Notifier notify, IClock clock, Decision.ReplenishmentService replenish)
{
    public async Task<AbnormalReport> ApproveAsync(int id, int managerId)
    {
        var report = await LoadPendingAsync(id);
        report.ReceiptDetail.Status = LotStatus.Locked;
        report.Status = ApprovalStatus.Approved;
        report.ApprovedBy = managerId;
        report.ApprovedAt = clock.UtcNow;
        notify.ToUser(report.CreatedBy, $"Biên bản {report.Code} đã được duyệt",
            $"Lô {report.ReceiptDetail.LotCode} đã bị khóa và không được xuất.", $"/kho/bao-loi/{id}", Notifier.Info);
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync([report.ReceiptDetailId]);
        return report;
    }

    public async Task<AbnormalReport> RejectAsync(int id, string? reason, int managerId)
    {
        var report = await LoadPendingAsync(id);
        var text = Catalog.CatalogService.Clean(reason);
        new Validator()
            .Check(text is { Length: >= 5 }, "reason", "Bắt buộc nhập lý do (tối thiểu 5 ký tự).")
            .Check(text is null || text.Length <= 255, "reason", "Lý do tối đa 255 ký tự.")
            .ThrowIfAny();
        report.ReceiptDetail.Status = LotStatus.Normal;
        report.Status = ApprovalStatus.Rejected;
        report.RejectReason = text;
        report.ApprovedBy = managerId;
        report.ApprovedAt = clock.UtcNow;
        notify.ToUser(report.CreatedBy, $"Biên bản {report.Code} bị từ chối",
            $"Lô {report.ReceiptDetail.LotCode} trở về Bình thường và được tính vào tồn kho. Lý do: {text}", $"/kho/bao-loi/{id}", Notifier.Warning);
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync([report.ReceiptDetailId]);
        return report;
    }

    private async Task<AbnormalReport> LoadPendingAsync(int id)
    {
        var report = await db.AbnormalReports.Include(a => a.ReceiptDetail).ThenInclude(d => d.Receipt)
            .SingleOrDefaultAsync(a => a.ReportId == id) ?? throw new NotFoundException("Không tìm thấy biên bản bất thường.");
        if (report.Status != ApprovalStatus.Pending)
            throw new RuleException($"Biên bản {report.Code} đã được xử lý ({Labels<ApprovalStatus>.ToLabel(report.Status)}).");
        // UC_05 steps 6–7: the receipt is approved first, then its abnormal reports are handled.
        var receipt = report.ReceiptDetail.Receipt;
        if (report.SourceType == AbnormalSource.Receipt && receipt.Status != ReceiptStatus.Approved)
            throw new RuleException($"Duyệt phiếu nhập {receipt.Code} trước, sau đó xử lý biên bản {report.Code}.");
        return report;
    }
}
