using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Abnormal;
using Vibasic.Infrastructure.Receiving;

namespace Vibasic.Api.Controllers;

public record ReasonInput(string? Reason);

public record ReportRow(int Id, string Code, int ReceiptDetailId, string LotCode, string Sku, string ProductName, string Unit,
    AbnormalSource SourceType, string Description, int Quantity, ApprovalStatus Status, string CreatorName, DateTime CreatedAt,
    string? ApproverName, DateTime? ApprovedAt, string? RejectReason, int ReceiptId, string ReceiptCode, ReceiptStatus ReceiptStatus,
    int? IssueId);

public static class ReportQueries
{
    public static IQueryable<ReportRow> Rows(this IQueryable<AbnormalReport> source) => source.Select(a => new ReportRow(
        a.ReportId, a.Code, a.ReceiptDetailId, a.ReceiptDetail.LotCode, a.ReceiptDetail.Product.SKU, a.ReceiptDetail.Product.ProductName,
        a.ReceiptDetail.Product.Unit, a.SourceType, a.Description, a.Quantity, a.Status, a.Creator.FullName, a.CreatedAt,
        a.Approver != null ? a.Approver.FullName : null, a.ApprovedAt, a.RejectReason,
        a.ReceiptDetail.ReceiptId, a.ReceiptDetail.Receipt.Code, a.ReceiptDetail.Receipt.Status, a.IssueId));
}

/// <summary>UC_04–06 (staff) and UC_10 for receipts (manager).</summary>
[ApiController]
[Route("api/receipts")]
[Authorize]
public class ReceiptsController(VibasicDbContext db, ReceiptService receipts) : ControllerBase
{
    public record ReceiptRow(int Id, string Code, DateTime ReceiptDate, DateTime? SubmittedAt, int SupplierId, string SupplierName,
        int CreatedBy, string CreatorName, string? ApproverName, DateTime? ApprovedAt, ReceiptStatus Status,
        int ProductCount, int TotalQuantity, int LotCount, int PendingReports, string? RejectReason);

    public record LotRow(int Id, string LotCode, int ProductId, string Sku, string ProductName, string Unit,
        int Quantity, int QuantityOnHand, LotStatus Status, int? DocumentQuantity, string? Note);

    public record ReceiptView(ReceiptRow Header, string? Note, List<LotRow> Lots, List<ReportRow> Reports);

    public record LabelLot(string LotCode, string Sku, string ProductName, string Unit, LotStatus Status, int Quantity, List<string> Serials);
    public record LabelSheet(string Code, string SupplierName, DateTime ReceiptDate, List<LabelLot> Lots);

    /// <param name="from">Local date (yyyy-mm-dd), inclusive.</param>
    /// <param name="to">Local date (yyyy-mm-dd), inclusive.</param>
    [HttpGet]
    public async Task<List<ReceiptRow>> List(ReceiptStatus? status, int? supplierId, DateOnly? from, DateOnly? to)
    {
        var q = db.GoodsReceipts.AsQueryable();
        if (status is not null) q = q.Where(r => r.Status == status);
        if (supplierId is not null) q = q.Where(r => r.SupplierId == supplierId);
        if (from is not null) { var f = VnTime.ToUtc(from.Value.ToDateTime(TimeOnly.MinValue)); q = q.Where(r => r.ReceiptDate >= f); }
        if (to is not null) { var t = VnTime.ToUtc(to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue)); q = q.Where(r => r.ReceiptDate < t); }
        return await Rows(q.OrderByDescending(r => r.ReceiptDate).Take(500)).ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReceiptView>> Get(int id)
    {
        var header = await Rows(db.GoodsReceipts.Where(r => r.ReceiptId == id)).SingleOrDefaultAsync();
        if (header is null) return Problem(statusCode: 404, title: "Không tìm thấy phiếu nhập.");
        var note = await db.GoodsReceipts.Where(r => r.ReceiptId == id).Select(r => r.Note).SingleAsync();
        var lots = await db.GoodsReceiptDetails.Where(d => d.ReceiptId == id)
            .OrderBy(d => d.Product.SKU).ThenBy(d => d.ReceiptDetailId)
            .Select(d => new LotRow(d.ReceiptDetailId, d.LotCode, d.ProductId, d.Product.SKU, d.Product.ProductName, d.Product.Unit,
                d.Quantity, d.QuantityOnHand, d.Status, d.DocumentQuantity, d.Note))
            .ToListAsync();
        var reports = await db.AbnormalReports.Where(a => a.ReceiptDetail.ReceiptId == id).OrderBy(a => a.Code).Rows().ToListAsync();
        return new ReceiptView(header, note, lots, reports);
    }

    /// <summary>UC_04 step 8: lot and item barcodes for printing.</summary>
    [HttpGet("{id:int}/labels")]
    public async Task<ActionResult<LabelSheet>> Labels(int id)
    {
        var r = await db.GoodsReceipts.Where(x => x.ReceiptId == id)
            .Select(x => new { x.Code, x.Supplier.SupplierName, x.ReceiptDate }).SingleOrDefaultAsync();
        if (r is null) return Problem(statusCode: 404, title: "Không tìm thấy phiếu nhập.");
        var lots = await db.GoodsReceiptDetails.Where(d => d.ReceiptId == id)
            .OrderBy(d => d.Product.SKU).ThenBy(d => d.ReceiptDetailId)
            .Select(d => new LabelLot(d.LotCode, d.Product.SKU, d.Product.ProductName, d.Product.Unit, d.Status, d.Quantity,
                d.Items.OrderBy(i => i.SerialCode).Select(i => i.SerialCode).ToList()))
            .ToListAsync();
        return new LabelSheet(r.Code, r.SupplierName, r.ReceiptDate, lots);
    }

    [HttpPost, Authorize(Policy = Policies.Staff)]
    public async Task<ReceiptView> Create(ReceiptInput input) => await View((await receipts.CreateAsync(input, User.UserId())).ReceiptId);

    [HttpPut("{id:int}"), Authorize(Policy = Policies.Staff)]
    public async Task<ReceiptView> Update(int id, ReceiptInput input) => await View((await receipts.UpdateAsync(id, input)).ReceiptId);

    [HttpPost("{id:int}/submit"), Authorize(Policy = Policies.Staff)]
    public async Task<ReceiptView> Submit(int id) => await View((await receipts.SubmitAsync(id, User.UserId())).ReceiptId);

    [HttpPost("{id:int}/approve"), Authorize(Policy = Policies.Manager)]
    public async Task<ReceiptView> Approve(int id) => await View((await receipts.ApproveAsync(id, User.UserId())).ReceiptId);

    [HttpPost("{id:int}/reject"), Authorize(Policy = Policies.Manager)]
    public async Task<ReceiptView> Reject(int id, ReasonInput input) => await View((await receipts.RejectAsync(id, input.Reason, User.UserId())).ReceiptId);

    private async Task<ReceiptView> View(int id) => (await Get(id)).Value!;

    private IQueryable<ReceiptRow> Rows(IQueryable<GoodsReceipt> source) => source.Select(r => new ReceiptRow(
        r.ReceiptId, r.Code, r.ReceiptDate, r.SubmittedAt, r.SupplierId, r.Supplier.SupplierName, r.CreatedBy, r.Creator.FullName,
        r.Approver != null ? r.Approver.FullName : null, r.ApprovedAt, r.Status,
        r.Details.Select(d => d.ProductId).Distinct().Count(), r.Details.Sum(d => d.Quantity), r.Details.Count(),
        db.AbnormalReports.Count(a => a.ReceiptDetail.ReceiptId == r.ReceiptId && a.Status == ApprovalStatus.Pending),
        r.RejectReason));
}

/// <summary>UC_12 for reports raised at receiving. Listing and filing from issue/stocktake come with phases 4–5.</summary>
[ApiController]
[Route("api/abnormal-reports")]
[Authorize]
public class AbnormalReportsController(VibasicDbContext db, AbnormalReportService reports) : ControllerBase
{
    [HttpGet]
    public async Task<List<ReportRow>> List(ApprovalStatus? status) =>
        await (status is null ? db.AbnormalReports : db.AbnormalReports.Where(a => a.Status == status))
            .OrderByDescending(a => a.CreatedAt).Take(500).Rows().ToListAsync();

    [HttpPost("{id:int}/approve"), Authorize(Policy = Policies.Manager)]
    public async Task<ReportRow> Approve(int id)
    {
        await reports.ApproveAsync(id, User.UserId());
        return await db.AbnormalReports.Where(a => a.ReportId == id).Rows().SingleAsync();
    }

    [HttpPost("{id:int}/reject"), Authorize(Policy = Policies.Manager)]
    public async Task<ReportRow> Reject(int id, ReasonInput input)
    {
        await reports.RejectAsync(id, input.Reason, User.UserId());
        return await db.AbnormalReports.Where(a => a.ReportId == id).Rows().SingleAsync();
    }
}

/// <summary>Counts for the manager's "Chờ duyệt" badge and tabs.</summary>
[ApiController]
[Route("api/approvals")]
[Authorize(Policy = Policies.Manager)]
public class ApprovalsController(VibasicDbContext db) : ControllerBase
{
    public record Summary(int Receipts, int Issues, int AbnormalReports, int Total);

    [HttpGet("summary")]
    public async Task<Summary> Get()
    {
        var receipts = await db.GoodsReceipts.CountAsync(r => r.Status == ReceiptStatus.Pending);
        var issues = await db.GoodsIssues.CountAsync(i => i.Status == IssueStatus.Pending);
        var reports = await db.AbnormalReports.CountAsync(a => a.Status == ApprovalStatus.Pending);
        return new Summary(receipts, issues, reports, receipts + issues + reports);
    }
}

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(VibasicDbContext db) : ControllerBase
{
    public record Item(int Id, string Title, string? Message, string? Link, string Tone, DateTime CreatedAt, bool IsRead);
    public record Feed(int Unread, List<Item> Items);
    public record ReadInput(List<int>? Ids);

    [HttpGet]
    public async Task<Feed> Get()
    {
        var me = User.UserId();
        var mine = db.Notifications.Where(n => n.UserId == me);
        var items = await mine.OrderByDescending(n => n.CreatedAt).Take(30)
            .Select(n => new Item(n.NotificationId, n.Title, n.Message, n.Link, n.Tone, n.CreatedAt, n.IsRead)).ToListAsync();
        return new Feed(await mine.CountAsync(n => !n.IsRead), items);
    }

    /// <summary>Marks the given notifications read, or all of them when no ids are sent.</summary>
    [HttpPost("read")]
    public async Task<IActionResult> Read(ReadInput input)
    {
        var me = User.UserId();
        var q = db.Notifications.Where(n => n.UserId == me && !n.IsRead);
        if (input.Ids is { Count: > 0 }) q = q.Where(n => input.Ids.Contains(n.NotificationId));
        await q.ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }
}
