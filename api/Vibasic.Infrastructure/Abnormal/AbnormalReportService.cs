using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Issuing;

namespace Vibasic.Infrastructure.Abnormal;

/// <summary>Hướng xử lý: the method (fixed effect on stock) and a description of what to do.</summary>
public record HandlingInput(HandlingMethod? Method, string? Plan);

/// <summary>
/// UC_12 Duyệt biên bản bất thường, then its handling. A report lists its defective items and has a scope:
/// <list type="bullet">
/// <item>"Sản phẩm lỗi": the listed items are set aside ("Lỗi") from filing; the rest of the lot stays issuable.
/// Approve keeps them out of stock; reject puts them back "Trong kho".</item>
/// <item>"Cả lô" (Chương 3): the lot is also quarantined while pending; approve locks it, reject returns it to "Bình thường".</item>
/// </list>
/// The manager may change the scope when approving. A report raised at receiving always covers its (failed) lot.
/// <para>
/// Approving sets the hướng xử lý and opens the handling: Chờ xử lý → (a staff member takes it) Đang xử lý → Đã xử lý.
/// When done, stock follows the method: the goods leave the warehouse ("Đã loại bỏ"), or a repair brings them back into stock.
/// </para>
/// </summary>
public class AbnormalReportService(VibasicDbContext db, IClock clock, Decision.ReplenishmentService replenish, IssueService issues)
{
    public const int MinPlanLength = 5;
    public const int MaxPlanLength = 500;

    /// <param name="wholeLot">Null keeps the scope the report was filed with.</param>
    public async Task<AbnormalReport> ApproveAsync(int id, int managerId, bool? wholeLot = null, HandlingInput? handling = null)
    {
        var report = await LoadPendingAsync(id);
        var (method, plan) = RequireHandling(handling);
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
        report.HandlingMethod = method;
        report.HandlingPlan = plan;
        report.HandlingStatus = HandlingStatus.Waiting;
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
    /// Refused once things have moved on: a staff member took the handling, another decision changed the lot, or a listed item
    /// was picked, issued or written off.
    /// </summary>
    public async Task<AbnormalReport> RevokeAsync(int id, string? reason, int managerId)
    {
        var report = await LoadAsync(id);
        if (report.Status == ApprovalStatus.Pending)
            throw new RuleException($"Biên bản {report.Code} đang chờ duyệt, chưa có quyết định để hủy.");
        if (report.HandlingStatus is HandlingStatus.InProgress or HandlingStatus.Done)
            throw new RuleException($"Biên bản {report.Code} {(report.HandlingStatus == HandlingStatus.Done ? "đã được xử lý xong" : $"đang được {report.Handler?.FullName ?? "nhân viên"} xử lý")}, không hủy quyết định được.");
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
        ClearHandling(report);
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync([report.ReceiptDetailId]);
        return report;
    }

    /// <summary>Staff propose a hướng xử lý on a report still waiting for approval (the manager settles it when approving).</summary>
    public async Task<AbnormalReport> ProposeAsync(int id, string? proposal)
    {
        var report = await LoadAsync(id);
        if (report.Status != ApprovalStatus.Pending)
            throw new RuleException($"Biên bản {report.Code} đã có quyết định, hướng xử lý do quản lý chốt.");
        var v = new Validator();
        var text = CleanProposal(proposal, v, "plan");
        v.ThrowIfAny();
        report.HandlingPlan = text;
        await db.SaveChangesAsync();
        return report;
    }

    // ---------------- Xử lý biên bản đã duyệt ----------------

    /// <summary>The manager changes the hướng xử lý while the handling is not done (e.g. a repair turned out impossible).</summary>
    public async Task<AbnormalReport> UpdateHandlingAsync(int id, HandlingInput input, int managerId)
    {
        var report = await LoadAsync(id);
        EnsureApproved(report);
        if (report.HandlingStatus == HandlingStatus.Done)
            throw new RuleException($"Biên bản {report.Code} đã xử lý xong, không đổi hướng xử lý được.");
        var (method, plan) = RequireHandling(input);
        report.HandlingMethod = method;
        report.HandlingPlan = plan;
        await db.SaveChangesAsync();
        return report;
    }

    /// <summary>"Nhận xử lý": one staff member handles an approved report at a time.</summary>
    public async Task<AbnormalReport> ClaimAsync(int id, int staffId)
    {
        var report = await LoadAsync(id);
        EnsureApproved(report);
        if (report.HandlingStatus == HandlingStatus.Done) throw new RuleException($"Biên bản {report.Code} đã xử lý xong.");
        if (report.HandlingStatus == HandlingStatus.InProgress)
        {
            if (report.HandledBy == staffId) return report;
            throw Held(report);
        }
        report.HandlingStatus = HandlingStatus.InProgress;
        report.HandledBy = staffId;
        report.HandlingStartedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        return report;
    }

    /// <summary>"Trả lại việc" by the handler, or "Gỡ người xử lý" by a manager: back to "Chờ xử lý" for anyone to take.</summary>
    public async Task<AbnormalReport> ReleaseAsync(int id, int userId, bool isManager)
    {
        var report = await LoadAsync(id);
        EnsureApproved(report);
        if (report.HandlingStatus != HandlingStatus.InProgress)
            throw new RuleException($"Biên bản {report.Code} đang “{Labels<HandlingStatus>.ToLabel(report.HandlingStatus ?? HandlingStatus.Waiting)}”, không có ai đang xử lý.");
        if (!isManager && report.HandledBy != userId) throw Held(report);
        report.HandlingStatus = HandlingStatus.Waiting;
        report.HandledBy = null;
        report.Handler = null;
        report.HandlingStartedAt = null;
        await db.SaveChangesAsync();
        return report;
    }

    /// <summary>
    /// "Hoàn thành xử lý" by the handler. Stock follows the hướng xử lý:
    /// <list type="bullet">
    /// <item>Leaves the warehouse (trả NCC, tiêu hủy, thanh lý): the report's defective items become "Đã loại bỏ"; for "Cả lô" every
    /// item still on hand in the lot does too, and the lot (still "Đã khóa") holds nothing any more.</item>
    /// <item>Repair: the defective items come back "Trong kho"; for "Cả lô" the lot is unlocked ("Bình thường") unless another
    /// whole-lot report of it is still open.</item>
    /// </list>
    /// </summary>
    public async Task<AbnormalReport> CompleteAsync(int id, int staffId)
    {
        var report = await LoadAsync(id);
        EnsureApproved(report);
        if (report.HandlingStatus != HandlingStatus.InProgress)
            throw new RuleException(report.HandlingStatus == HandlingStatus.Done
                ? $"Biên bản {report.Code} đã xử lý xong."
                : $"Nhận xử lý biên bản {report.Code} trước khi hoàn thành.");
        if (report.HandledBy != staffId) throw Held(report);
        if (report.HandlingMethod is not { } method)
            throw new RuleException($"Biên bản {report.Code} chưa có hướng xử lý. Quản lý cần chọn hướng xử lý trước.");

        var now = clock.UtcNow;
        var lot = report.ReceiptDetail;
        var listed = report.Items.Select(x => x.Item).Where(i => i.Status == ItemStatus.Defective).ToList();
        if (Defects.BackToStock(method))
        {
            foreach (var item in listed) Defects.Repair(item, now);
            if (report.Scope == ReportScope.Lot && lot.Status == LotStatus.Locked && !await OtherOpenLotReportAsync(report))
                lot.Status = LotStatus.Normal;
        }
        else
        {
            foreach (var item in listed) Defects.Dispose(item, now);
            if (report.Scope == ReportScope.Lot)
            {
                var onHand = await db.StockItems.Where(i => i.ReceiptDetailId == lot.ReceiptDetailId && i.Status == ItemStatus.InStock).ToListAsync();
                foreach (var item in onHand) Defects.Dispose(item, now);
            }
        }
        report.HandlingStatus = HandlingStatus.Done;
        report.HandledAt = now;
        await db.SaveChangesAsync();
        await replenish.CheckLotsAsync([report.ReceiptDetailId]);
        return report;
    }

    /// <summary>What completing the handling would do to stock: items that would leave the warehouse or come back into stock.</summary>
    public async Task<(int Leave, int Return)> CompletionEffectAsync(int id)
    {
        var report = await LoadAsync(id);
        if (report.Status != ApprovalStatus.Approved || report.HandlingMethod is not { } method || report.HandlingStatus == HandlingStatus.Done) return (0, 0);
        var listed = report.Items.Count(x => x.Item.Status == ItemStatus.Defective);
        if (Defects.BackToStock(method)) return (0, listed);
        var onHand = report.Scope == ReportScope.Lot
            ? await db.StockItems.CountAsync(i => i.ReceiptDetailId == report.ReceiptDetailId && i.Status == ItemStatus.InStock) : 0;
        return (listed + onHand, 0);
    }

    // ---------------- helpers ----------------

    private static void ClearHandling(AbnormalReport report)
    {
        report.HandlingMethod = null;
        report.HandlingStatus = null;
        report.HandledBy = null;
        report.Handler = null;
        report.HandlingStartedAt = null;
        report.HandledAt = null;
    }

    private static RuleException Held(AbnormalReport report)
    {
        var name = report.Handler?.FullName ?? "nhân viên khác";
        var since = report.HandlingStartedAt is { } t ? $" từ {VnTime.ToLocal(t):dd/MM/yyyy HH:mm}" : "";
        return new RuleException($"Biên bản {report.Code} đang do {name} xử lý{since}.");
    }

    private static void EnsureApproved(AbnormalReport report)
    {
        if (report.Status != ApprovalStatus.Approved)
            throw new RuleException($"Biên bản {report.Code} đang “{Labels<ApprovalStatus>.ToLabel(report.Status)}”, chỉ biên bản đã duyệt mới được xử lý.");
    }

    private static (HandlingMethod Method, string Plan) RequireHandling(HandlingInput? input)
    {
        var plan = Catalog.CatalogService.Clean(input?.Plan);
        new Validator()
            .Check(input?.Method is not null, "method", "Chọn hướng xử lý.")
            .Check(plan is { Length: >= MinPlanLength }, "plan", $"Mô tả hướng xử lý (tối thiểu {MinPlanLength} ký tự).")
            .Check(plan is null || plan.Length <= MaxPlanLength, "plan", $"Mô tả hướng xử lý tối đa {MaxPlanLength} ký tự.")
            .ThrowIfAny();
        return (input!.Method!.Value, plan!);
    }

    /// <summary>A staff proposal given when filing: optional, cleaned, at most <see cref="MaxPlanLength"/> characters.</summary>
    public static string? CleanProposal(string? proposal, Validator v, string field)
    {
        var text = Catalog.CatalogService.Clean(proposal);
        v.Check(text is null || text.Length <= MaxPlanLength, field, $"Hướng xử lý đề xuất tối đa {MaxPlanLength} ký tự.");
        return text;
    }

    /// <summary>Another "Cả lô" report of the same lot still waiting: the lot stays quarantined for it.</summary>
    private Task<bool> OtherPendingLotReportAsync(AbnormalReport report) =>
        db.AbnormalReports.AnyAsync(a => a.ReceiptDetailId == report.ReceiptDetailId && a.ReportId != report.ReportId
            && a.Status == ApprovalStatus.Pending && a.Scope == ReportScope.Lot);

    /// <summary>Another "Cả lô" report of the same lot still waiting for approval or still being handled: the lot stays out of stock.</summary>
    private Task<bool> OtherOpenLotReportAsync(AbnormalReport report) =>
        db.AbnormalReports.AnyAsync(a => a.ReceiptDetailId == report.ReceiptDetailId && a.ReportId != report.ReportId && a.Scope == ReportScope.Lot
            && (a.Status == ApprovalStatus.Pending || (a.Status == ApprovalStatus.Approved && a.HandlingStatus != HandlingStatus.Done)));

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
            .Include(a => a.Handler)
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
