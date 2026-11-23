using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Issuing;

namespace Vibasic.Api.Controllers;

/// <summary>Orders received from the sales system, with how much of each line can be allocated now.</summary>
[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController(VibasicDbContext db, IssueService issues) : ControllerBase
{
    public record OrderLine(int ProductId, string Sku, string ProductName, string Unit, int Quantity, int Free);
    public record OrderRow(int Id, string ExternalCode, string? CustomerName, DateTime OrderDate, OrderStatus Status,
        int TotalQuantity, bool Sufficient, List<OrderLine> Lines, int? LastIssueId, string? LastIssueCode, IssueStatus? LastIssueStatus,
        string? CustomerPhone, string? ShippingAddress, string? Note, string? CancelReason, DateTime? CancelledAt);
    public record CancelResponse(OrderRow Order, string? IssueCode);

    [HttpGet]
    public async Task<List<OrderRow>> List(OrderStatus? status)
    {
        var q = db.Orders.AsQueryable();
        if (status is not null) q = q.Where(o => o.Status == status);
        return await Rows(q.OrderByDescending(o => o.OrderDate).Take(300));
    }

    private async Task<OrderRow> Row(int id) => (await Rows(db.Orders.Where(o => o.OrderId == id))).Single();

    private async Task<List<OrderRow>> Rows(IQueryable<Order> q)
    {
        var orders = await q
            .Select(o => new
            {
                o.OrderId, o.ExternalCode, o.CustomerName, o.OrderDate, o.Status, o.CustomerPhone, o.ShippingAddress, o.Note, o.CancelReason, o.CancelledAt,
                Lines = o.Details.Select(d => new { d.ProductId, d.Product.SKU, d.Product.ProductName, d.Product.Unit, d.Quantity }).ToList(),
                Last = db.GoodsIssues.Where(i => i.OrderId == o.OrderId).OrderByDescending(i => i.IssueDate)
                    .Select(i => new { i.IssueId, i.Code, i.Status }).FirstOrDefault(),
            })
            .ToListAsync();
        var free = await FreeByProductAsync();
        return orders.Select(o =>
        {
            var lines = o.Lines.Select(l => new OrderLine(l.ProductId, l.SKU, l.ProductName, l.Unit, l.Quantity, free.GetValueOrDefault(l.ProductId))).ToList();
            return new OrderRow(o.OrderId, o.ExternalCode, o.CustomerName, o.OrderDate, o.Status, lines.Sum(l => l.Quantity),
                lines.All(l => l.Free >= l.Quantity), lines, o.Last?.IssueId, o.Last?.Code, o.Last?.Status, o.CustomerPhone, o.ShippingAddress, o.Note,
                o.CancelReason, o.CancelledAt);
        }).ToList();
    }

    /// <summary>UC_07 steps 2–6: FIFO lots and item codes that would be picked, or the shortage.</summary>
    [HttpGet("{id:int}/allocation")]
    public Task<Allocation> Allocation(int id) => issues.PreviewAsync(id);

    /// <summary>Integration endpoint for the sales system. Manager role stands in for that system's credentials.</summary>
    [HttpPost, Authorize(Policy = Policies.Manager)]
    public async Task<OrderRow> Create(OrderInput input)
    {
        var order = await issues.RecordOrderAsync(input);
        return await Row(order.OrderId);
    }

    /// <summary>The customer cancelled: the manager cancels an order not yet delivered, with a reason (its open issue goes too).</summary>
    [HttpPost("{id:int}/cancel"), Authorize(Policy = Policies.Manager)]
    public async Task<CancelResponse> Cancel(int id, ReasonInput input)
    {
        var r = await issues.CancelOrderAsync(id, input.Reason, User.UserId());
        return new CancelResponse(await Row(id), r.IssueCode);
    }

    private async Task<Dictionary<int, int>> FreeByProductAsync() =>
        await IssueService.Free(db)
            .GroupBy(i => i.ReceiptDetail.ProductId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);
}

/// <summary>UC_07–09: issues are created and picked by staff, with no approval step.</summary>
[ApiController]
[Route("api/issues")]
[Authorize]
public class IssuesController(VibasicDbContext db, IssueService issues) : ControllerBase
{
    public record IssueRow(int Id, string Code, DateTime IssueDate, int OrderId, string OrderCode, string? CustomerName,
        int CreatedBy, string CreatorName, IssueStatus Status,
        int ProductCount, int TotalQuantity, int Picked, string? CancelReason,
        string? ReceiverName, DateTime? DeliveredAt, string? DelivererName,
        string? CustomerPhone, string? ShippingAddress, string? OrderNote,
        int? PickerId, string? PickerName, DateTime? PickStartedAt, DateTime? PickActiveAt,
        string? ReceiverPhone, string? VehiclePlate);
    public record PickItem(int ItemId, string Serial, ItemStatus Status, DateTime? PickedAt);
    /// <param name="OnShelf">Items of the whole lot still on the shelf ("Trong kho" or "Đã giữ chỗ", any issue). When it equals
    /// the items of this issue in the lot, the issue takes the whole rest of the lot ("Lấy cả lô").</param>
    public record PickLot(int ReceiptDetailId, string LotCode, DateTime ReceivedDate, LotStatus LotStatus, List<PickItem> Items, int OnShelf);
    public record IssueLine(int DetailId, int ProductId, string Sku, string ProductName, string Unit, int Quantity, int Picked, List<PickLot> Lots);
    public record IssueView(IssueRow Header, List<IssueLine> Lines, List<ReportRow> Reports);

    public record CreateInput(int? OrderId);
    public record ScanInput(string? Code);
    /// <param name="WholeLot">Defect suspected in the whole lot: quarantine it too.</param>
    /// <param name="HandlingProposal">Hướng xử lý đề xuất (optional).</param>
    public record DefectInput(List<string>? Serials, string? Description, bool WholeLot = false, string? HandlingProposal = null);
    /// <param name="ReceiverName">Who takes the goods at the warehouse (driver or customer).</param>
    /// <param name="ReceiverPhone">Their phone (optional).</param>
    /// <param name="VehiclePlate">Biển số xe (optional).</param>
    public record DeliverInput(string? ReceiverName, string? ReceiverPhone = null, string? VehiclePlate = null);
    public record PickInput(List<string>? Serials);
    public record DefectResponse(IssueView View, DefectResult Result);

    [HttpGet]
    public async Task<List<IssueRow>> List(IssueStatus? status, DateOnly? from, DateOnly? to)
    {
        var q = db.GoodsIssues.AsQueryable();
        if (status is not null) q = q.Where(i => i.Status == status);
        if (from is not null) { var f = VnTime.ToUtc(from.Value.ToDateTime(TimeOnly.MinValue)); q = q.Where(i => i.IssueDate >= f); }
        if (to is not null) { var t = VnTime.ToUtc(to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue)); q = q.Where(i => i.IssueDate < t); }
        return await Rows(q.OrderByDescending(i => i.IssueDate).Take(500)).ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<IssueView>> Get(int id)
    {
        var header = await Rows(db.GoodsIssues.Where(i => i.IssueId == id)).SingleOrDefaultAsync();
        if (header is null) return Problem(statusCode: 404, title: "Không tìm thấy phiếu xuất.");
        var details = await db.GoodsIssueDetails.Where(d => d.IssueId == id).OrderBy(d => d.Product.SKU)
            .Select(d => new
            {
                d.IssueDetailId, d.ProductId, d.Product.SKU, d.Product.ProductName, d.Product.Unit, d.Quantity,
                Items = d.Items.Select(i => new
                {
                    i.ItemId, i.SerialCode, i.Status, i.PickedAt, i.ReceiptDetailId, i.ReceiptDetail.LotCode,
                    i.ReceiptDetail.Receipt.ReceiptDate, LotStatus = i.ReceiptDetail.Status,
                }).ToList(),
            })
            .ToListAsync();
        // Same count as IssueService.ScanLotAsync: what is still on the shelf of each lot, whichever issue holds it.
        var lotIds = details.SelectMany(d => d.Items.Select(i => i.ReceiptDetailId)).Distinct().ToList();
        var onShelf = await db.StockItems
            .Where(i => lotIds.Contains(i.ReceiptDetailId) && (i.Status == ItemStatus.InStock || i.Status == ItemStatus.Reserved))
            .GroupBy(i => i.ReceiptDetailId).Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);
        var lines = details.Select(d => new IssueLine(d.IssueDetailId, d.ProductId, d.SKU, d.ProductName, d.Unit, d.Quantity,
            d.Items.Count(i => i.PickedAt != null),
            d.Items.GroupBy(i => (i.ReceiptDetailId, i.LotCode, i.ReceiptDate, i.LotStatus))
                .OrderBy(g => g.Key.ReceiptDate).ThenBy(g => g.Key.ReceiptDetailId)
                .Select(g => new PickLot(g.Key.ReceiptDetailId, g.Key.LotCode, g.Key.ReceiptDate, g.Key.LotStatus,
                    g.OrderBy(i => i.SerialCode).Select(i => new PickItem(i.ItemId, i.SerialCode, i.Status, i.PickedAt)).ToList(),
                    onShelf.GetValueOrDefault(g.Key.ReceiptDetailId)))
                .ToList())).ToList();
        var reports = await db.AbnormalReports.Where(a => a.IssueId == id).OrderBy(a => a.Code).Rows().ToListAsync();
        return new IssueView(header, lines, reports);
    }

    [HttpPost, Authorize(Policy = Policies.Staff)]
    public async Task<IssueView> Create(CreateInput input)
    {
        if (input.OrderId is null) throw new ValidationException(new Dictionary<string, string> { ["orderId"] = "Chọn đơn hàng cần xuất." });
        return await View((await issues.CreateAsync(input.OrderId.Value, User.UserId())).IssueId);
    }

    [HttpPost("{id:int}/scan"), Authorize(Policy = Policies.Staff)]
    public Task<ScanResult> Scan(int id, ScanInput input) => issues.ScanAsync(id, input.Code, User.UserId());

    /// <summary>"Chọn mã": mark items of the pick list as taken without scanning.</summary>
    [HttpPost("{id:int}/pick"), Authorize(Policy = Policies.Staff)]
    public Task<PickResult> Pick(int id, PickInput input) => issues.PickAsync(id, input.Serials, User.UserId());

    /// <summary>"Bắt đầu lấy hàng" / "Nhận lại phiếu": only one staff member picks an issue at a time.</summary>
    [HttpPost("{id:int}/claim"), Authorize(Policy = Policies.Staff)]
    public async Task<IssueView> Claim(int id) => await View((await issues.ClaimAsync(id, User.UserId())).IssueId);

    /// <summary>"Nhường phiếu" (the picker) or "Gỡ người lấy hàng" (a manager).</summary>
    [HttpPost("{id:int}/release")]
    public async Task<IssueView> Release(int id) =>
        await View((await issues.ReleaseAsync(id, User.UserId(), User.IsInRole(nameof(UserRole.Manager)))).IssueId);

    [HttpPost("{id:int}/defects"), Authorize(Policy = Policies.Staff)]
    public async Task<DefectResponse> Defect(int id, DefectInput input)
    {
        var result = await issues.ReportDefectAsync(id, input.Serials, input.Description, User.UserId(), input.WholeLot, input.HandlingProposal);
        return new DefectResponse(await View(id), result);
    }

    [HttpPost("{id:int}/deliver"), Authorize(Policy = Policies.Staff)]
    public async Task<IssueView> Deliver(int id, DeliverInput input) =>
        await View((await issues.DeliverAsync(id, input.ReceiverName, User.UserId(), input.ReceiverPhone, input.VehiclePlate)).IssueId);

    private async Task<IssueView> View(int id) => (await Get(id)).Value!;


    private IQueryable<IssueRow> Rows(IQueryable<GoodsIssue> source) => source.Select(i => new IssueRow(
        i.IssueId, i.Code, i.IssueDate, i.OrderId, i.Order.ExternalCode, i.Order.CustomerName, i.CreatedBy, i.Creator.FullName,
        i.Status,
        i.Details.Count(), i.Details.Sum(d => d.Quantity), i.Details.SelectMany(d => d.Items).Count(it => it.PickedAt != null),
        i.CancelReason, i.ReceiverName, i.DeliveredAt,
        db.Users.Where(u => u.UserId == i.DeliveredBy).Select(u => u.FullName).FirstOrDefault(),
        i.Order.CustomerPhone, i.Order.ShippingAddress, i.Order.Note,
        i.PickerId, i.Picker != null ? i.Picker.FullName : null, i.PickStartedAt, i.PickActiveAt,
        i.ReceiverPhone, i.VehiclePlate));
}
