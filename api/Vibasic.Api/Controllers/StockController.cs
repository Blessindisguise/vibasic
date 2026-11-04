using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Catalog;
using Vibasic.Infrastructure.Stocktaking;

namespace Vibasic.Api.Controllers;

/// <summary>UC_16 Tra cứu tồn kho theo lô (both roles). Only lots of approved receipts hold stock.</summary>
[ApiController]
[Route("api/lots")]
[Authorize]
public class LotsController(VibasicDbContext db) : ControllerBase
{
    public record LotRow(int Id, string LotCode, int ProductId, string Sku, string ProductName, string Unit, string CategoryName,
        DateTime ReceivedDate, int ReceiptId, string ReceiptCode, string SupplierName,
        int Quantity, int QuantityOnHand, int Reserved, LotStatus Status);
    public record ItemRow(int Id, string Serial, ItemStatus Status, int? IssueId, string? IssueCode);
    public record LotView(LotRow Lot, List<ItemRow> Items, List<ReportRow> Reports);
    public record Found(int LotId, string? Serial);

    [HttpGet]
    public async Task<List<LotRow>> List(int? productId, LotStatus? status, bool includeEmpty = false)
    {
        var q = db.GoodsReceiptDetails.Where(d => d.Receipt.Status == ReceiptStatus.Approved);
        if (productId is not null) q = q.Where(d => d.ProductId == productId);
        if (status is not null) q = q.Where(d => d.Status == status);
        if (!includeEmpty) q = q.Where(d => d.QuantityOnHand > 0);
        return await Rows(q.OrderBy(d => d.Product.SKU).ThenBy(d => d.Receipt.ReceiptDate).ThenBy(d => d.ReceiptDetailId)).ToListAsync();
    }

    /// <summary>Scan support: a lot code or an item serial resolves to its lot.</summary>
    [HttpGet("find")]
    public async Task<ActionResult<Found>> Find(string? code)
    {
        var c = CatalogService.Clean(code)?.ToUpperInvariant();
        if (c is null) return Problem(statusCode: 404, title: "Quét hoặc nhập mã lô / mã sản phẩm.");
        var lot = await db.GoodsReceiptDetails.Where(d => d.LotCode == c).Select(d => (int?)d.ReceiptDetailId).FirstOrDefaultAsync();
        if (lot is not null) return new Found(lot.Value, null);
        var item = await db.StockItems.Where(i => i.SerialCode == c).Select(i => (int?)i.ReceiptDetailId).FirstOrDefaultAsync();
        return item is not null ? new Found(item.Value, c) : Problem(statusCode: 404, title: $"Không tìm thấy lô hoặc sản phẩm có mã {c}.");
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<LotView>> Get(int id)
    {
        var lot = await Rows(db.GoodsReceiptDetails.Where(d => d.ReceiptDetailId == id)).SingleOrDefaultAsync();
        if (lot is null) return Problem(statusCode: 404, title: "Không tìm thấy lô.");
        var items = await db.StockItems.Where(i => i.ReceiptDetailId == id).OrderBy(i => i.SerialCode)
            .Select(i => new ItemRow(i.ItemId, i.SerialCode, i.Status, i.IssueDetail != null ? i.IssueDetail.IssueId : null,
                i.IssueDetail != null ? i.IssueDetail.Issue.Code : null))
            .ToListAsync();
        var reports = await db.AbnormalReports.Where(a => a.ReceiptDetailId == id).OrderByDescending(a => a.CreatedAt).Rows().ToListAsync();
        return new LotView(lot, items, reports);
    }

    private static IQueryable<LotRow> Rows(IQueryable<GoodsReceiptDetail> source) => source.Select(d => new LotRow(
        d.ReceiptDetailId, d.LotCode, d.ProductId, d.Product.SKU, d.Product.ProductName, d.Product.Unit, d.Product.Category.CategoryName,
        d.Receipt.ReceiptDate, d.ReceiptId, d.Receipt.Code, d.Receipt.Supplier.SupplierName,
        d.Quantity, d.QuantityOnHand, d.Items.Count(i => i.Status == ItemStatus.Reserved), d.Status));
}

/// <summary>UC_13 (manager plans), UC_14 (staff count, file defects).</summary>
[ApiController]
[Route("api/stocktake-plans")]
[Authorize]
public class StocktakePlansController(VibasicDbContext db, StocktakeService stocktakes) : ControllerBase
{
    public record PlanRow(int Id, string Code, StocktakePlanType PlanType, StocktakeScope ScopeType, DateOnly PlannedDate,
        string CreatorName, StocktakePlanStatus Status, string? Note, int SelectedLots,
        int? LastStocktakeId, string? LastStocktakeCode, ApprovalStatus? LastStocktakeStatus, string? LastRejectReason);

    [HttpGet]
    public async Task<List<PlanRow>> List(StocktakePlanStatus? status) =>
        await Rows(status is null ? db.StocktakePlans : db.StocktakePlans.Where(p => p.Status == status)).Take(300).ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PlanRow>> Get(int id) =>
        await Rows(db.StocktakePlans.Where(p => p.PlanId == id)).SingleOrDefaultAsync() is { } row ? row
            : Problem(statusCode: 404, title: "Không tìm thấy kế hoạch kiểm kê.");

    [HttpGet("{id:int}/sheet")]
    public Task<List<SheetLot>> Sheet(int id) => stocktakes.SheetAsync(id);

    [HttpPost, Authorize(Policy = Policies.Manager)]
    public async Task<PlanRow> Create(PlanInput input) => (await Get((await stocktakes.CreatePlanAsync(input, User.UserId())).PlanId)).Value!;

    [HttpPost("{id:int}/stocktakes"), Authorize(Policy = Policies.Staff)]
    public async Task<StocktakesController.StocktakeRow> Submit(int id, StocktakeInput input)
    {
        var s = await stocktakes.SubmitAsync(id, input, User.UserId());
        return await StocktakesController.Rows(db, db.Stocktakes.Where(x => x.StocktakeId == s.StocktakeId)).SingleAsync();
    }

    [HttpPost("{id:int}/defects"), Authorize(Policy = Policies.Staff)]
    public async Task<ReportRow> Defect(int id, StockDefectInput input)
    {
        var r = await stocktakes.FileDefectAsync(id, input, User.UserId());
        return await db.AbnormalReports.Where(a => a.ReportId == r.ReportId).Rows().SingleAsync();
    }

    // Newest first; sorting happens before the projection, which EF cannot sort on.
    private IQueryable<PlanRow> Rows(IQueryable<StocktakePlan> source) => source
        .OrderByDescending(p => p.PlanId)
        .Select(p => new PlanRow(p.PlanId, p.Code, p.PlanType, p.ScopeType, p.PlannedDate, p.Creator.FullName, p.Status, p.Note,
            p.Details.Count(),
            db.Stocktakes.Where(s => s.PlanId == p.PlanId).OrderByDescending(s => s.StocktakeId).Select(s => (int?)s.StocktakeId).FirstOrDefault(),
            db.Stocktakes.Where(s => s.PlanId == p.PlanId).OrderByDescending(s => s.StocktakeId).Select(s => s.Code).FirstOrDefault(),
            db.Stocktakes.Where(s => s.PlanId == p.PlanId).OrderByDescending(s => s.StocktakeId).Select(s => (ApprovalStatus?)s.Status).FirstOrDefault(),
            db.Stocktakes.Where(s => s.PlanId == p.PlanId).OrderByDescending(s => s.StocktakeId).Select(s => s.RejectReason).FirstOrDefault()));
}

/// <summary>UC_15 Duyệt biên bản kiểm kê và phiếu điều chỉnh tồn kho.</summary>
[ApiController]
[Route("api/stocktakes")]
[Authorize]
public class StocktakesController(VibasicDbContext db, StocktakeService stocktakes) : ControllerBase
{
    public record StocktakeRow(int Id, string Code, int PlanId, string PlanCode, DateTime StocktakeDate, string CreatorName,
        string? ApproverName, DateTime? ApprovedAt, ApprovalStatus Status, int LotCount, int DiffLots, int Shortage, int Surplus, string? RejectReason);
    public record DetailRow(int Id, int ReceiptDetailId, string LotCode, string Sku, string ProductName, string Unit, LotStatus LotStatus,
        int SystemQuantity, int ActualQuantity, string? Reason);
    public record StocktakeView(StocktakeRow Header, List<DetailRow> Details, List<ReportRow> Reports);

    [HttpGet]
    public async Task<List<StocktakeRow>> List(ApprovalStatus? status) =>
        await Rows(db, (status is null ? db.Stocktakes : db.Stocktakes.Where(s => s.Status == status)).OrderByDescending(s => s.StocktakeId).Take(300))
            .ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StocktakeView>> Get(int id)
    {
        var header = await Rows(db, db.Stocktakes.Where(s => s.StocktakeId == id)).SingleOrDefaultAsync();
        if (header is null) return Problem(statusCode: 404, title: "Không tìm thấy phiếu kiểm kê.");
        var details = await db.StocktakeDetails.Where(d => d.StocktakeId == id)
            .OrderBy(d => d.ActualQuantity == d.SystemQuantity).ThenBy(d => d.ReceiptDetail.Product.SKU).ThenBy(d => d.ReceiptDetail.LotCode)
            .Select(d => new DetailRow(d.DetailId, d.ReceiptDetailId, d.ReceiptDetail.LotCode, d.ReceiptDetail.Product.SKU, d.ReceiptDetail.Product.ProductName,
                d.ReceiptDetail.Product.Unit, d.ReceiptDetail.Status, d.SystemQuantity, d.ActualQuantity, d.Reason))
            .ToListAsync();
        // Reports filed while counting this plan (UC_15 step 2 "biên bản bất thường kèm theo").
        var lots = details.Select(d => d.ReceiptDetailId).ToList();
        var reports = await db.AbnormalReports
            .Where(a => a.SourceType == AbnormalSource.Stocktake && lots.Contains(a.ReceiptDetailId) && a.CreatedAt <= header.StocktakeDate)
            .OrderByDescending(a => a.CreatedAt).Rows().ToListAsync();
        return new StocktakeView(header, details, reports);
    }

    [HttpPost("{id:int}/approve"), Authorize(Policy = Policies.Manager)]
    public async Task<StocktakeView> Approve(int id) { await stocktakes.ApproveAsync(id, User.UserId()); return (await Get(id)).Value!; }

    [HttpPost("{id:int}/reject"), Authorize(Policy = Policies.Manager)]
    public async Task<StocktakeView> Reject(int id, ReasonInput input) { await stocktakes.RejectAsync(id, input.Reason, User.UserId()); return (await Get(id)).Value!; }

    public static IQueryable<StocktakeRow> Rows(VibasicDbContext db, IQueryable<Stocktake> source) => source.Select(s => new StocktakeRow(
        s.StocktakeId, s.Code, s.PlanId, s.Plan.Code, s.StocktakeDate, s.Creator.FullName, s.Approver != null ? s.Approver.FullName : null,
        s.ApprovedAt, s.Status, s.Details.Count(), s.Details.Count(d => d.ActualQuantity != d.SystemQuantity),
        s.Details.Where(d => d.ActualQuantity < d.SystemQuantity).Sum(d => d.SystemQuantity - d.ActualQuantity),
        s.Details.Where(d => d.ActualQuantity > d.SystemQuantity).Sum(d => d.ActualQuantity - d.SystemQuantity),
        s.RejectReason));
}
