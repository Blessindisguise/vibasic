using Microsoft.EntityFrameworkCore;
using Vibasic.Api.Controllers;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Abnormal;
using Vibasic.Infrastructure.Decision;
using Vibasic.Infrastructure.Issuing;
using Vibasic.Infrastructure.Receiving;
using Vibasic.Infrastructure.Seed;

namespace Vibasic.Tests;

/// <summary>Handling of approved abnormal reports: Chờ xử lý → Đang xử lý → Đã xử lý, and what it does to stock.</summary>
public class AbnormalHandlingTests
{
    private sealed class FixedClock(DateTime utc) : IClock { public DateTime UtcNow { get; set; } = utc; }
    private static readonly DateTime Now = new(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc);

    private sealed class Ctx : IAsyncDisposable
    {
        public required VibasicDbContext Db { get; init; }
        public required IssueService Issues { get; init; }
        public required ReceiptService Receipts { get; init; }
        public required AbnormalReportService Reports { get; init; }
        public required ReplenishmentService Replenish { get; init; }
        public required int Staff { get; init; }
        public required int Staff2 { get; init; }
        public required int Manager { get; init; }
        public ValueTask DisposeAsync() => Db.DisposeAsync();

        public Product Product(string sku) => Db.Products.Single(p => p.SKU == sku);

        /// <summary>Stock on hand of the product: lots of approved receipts.</summary>
        public int OnHand(string sku) => Db.GoodsReceiptDetails
            .Where(d => d.Product.SKU == sku && d.Receipt.Status == ReceiptStatus.Approved).Sum(d => d.QuantityOnHand);

        /// <summary>An issue of one item with that item reported defective ("Sản phẩm lỗi"); returns the report and the item.</summary>
        public async Task<(AbnormalReport Report, StockItem Item)> ItemReport(string sku, string? proposal = null)
        {
            var order = await Issues.RecordOrderAsync(new OrderInput($"DH-H-{Guid.NewGuid().ToString()[..6]}", "Khách thử", null, [new(sku, 1)]));
            var issue = await Issues.CreateAsync(order.OrderId, Staff);
            var item = Db.StockItems.Include(i => i.ReceiptDetail).Single(i => i.IssueDetail!.IssueId == issue.IssueId);
            await Issues.ReportDefectAsync(issue.IssueId, [item.SerialCode], "Nứt cán, không giao được", Staff, handlingProposal: proposal);
            return (await Db.AbnormalReports.Include(r => r.Items).SingleAsync(r => r.IssueId == issue.IssueId), item);
        }

        /// <summary>An approved receipt of the product with a failed lot; returns the lot's approved-receipt report (pending).</summary>
        public async Task<AbnormalReport> FailedLotReport(string sku, int received, int failed)
        {
            var p = Product(sku);
            var r = await Receipts.CreateAsync(new ReceiptInput(p.SupplierId, null, [new(p.ProductId, received, failed, null, null, "Mốc mặt dưới")]), Staff);
            await Receipts.SubmitAsync(r.ReceiptId, Staff);
            await Receipts.ApproveAsync(r.ReceiptId, Manager);
            return await Db.AbnormalReports.Include(a => a.ReceiptDetail).ThenInclude(d => d.Items).SingleAsync(a => a.ReceiptDetail.ReceiptId == r.ReceiptId);
        }

        public async Task<ReportsController.MovementRow> Movement(string sku)
        {
            var day = VnTime.Today(Now);
            var result = await new ReportsController(Db, Replenish).Movements(day, day, Product(sku).ProductId, null);
            return result.Value!.Rows.Single();
        }
    }

    private static async Task<Ctx> Setup()
    {
        var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        await DbSeeder.SeedAsync(db, Now.AddDays(-1));
        var clock = new FixedClock(Now);
        var codes = new CodeGenerator(db);
        var replenish = new ReplenishmentService(db, clock);
        var issues = new IssueService(db, codes, clock, replenish);
        return new Ctx
        {
            Db = db, Issues = issues, Replenish = replenish,
            Receipts = new ReceiptService(db, codes, clock, replenish),
            Reports = new AbnormalReportService(db, clock, replenish, issues),
            Staff = db.Users.First(u => u.Username == "nhanvien1").UserId,
            Staff2 = db.Users.First(u => u.Username == "nhanvien2").UserId,
            Manager = db.Users.First(u => u.Username == "quanly").UserId,
        };
    }

    [Fact]
    public async Task Approve_needs_a_handling_method_and_a_description()
    {
        await using var c = await Setup();
        var (report, _) = await c.ItemReport("MUO-02");

        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Reports.ApproveAsync(report.ReportId, c.Manager));
        Assert.True(e.Errors.ContainsKey("method"));
        Assert.True(e.Errors.ContainsKey("plan"));
        e = await Assert.ThrowsAsync<ValidationException>(() => c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: new(HandlingMethod.Scrap, "hủy")));
        Assert.Equal(["plan"], e.Errors.Keys);
        Assert.Equal(ApprovalStatus.Pending, report.Status);

        await c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: TestStock.Scrap);
        Assert.Equal(HandlingStatus.Waiting, report.HandlingStatus);
        Assert.Equal(HandlingMethod.Scrap, report.HandlingMethod);
        Assert.Equal(TestStock.Scrap.Plan, report.HandlingPlan);
    }

    [Fact]
    public async Task One_staff_member_handles_a_report_and_only_they_can_complete_it()
    {
        await using var c = await Setup();
        var (report, _) = await c.ItemReport("MUO-02");
        await Assert.ThrowsAsync<RuleException>(() => c.Reports.ClaimAsync(report.ReportId, c.Staff)); // not approved yet
        await c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: TestStock.Scrap);
        await Assert.ThrowsAsync<RuleException>(() => c.Reports.CompleteAsync(report.ReportId, c.Staff)); // not taken yet

        await c.Reports.ClaimAsync(report.ReportId, c.Staff);
        Assert.Equal(HandlingStatus.InProgress, report.HandlingStatus);
        Assert.Equal(c.Staff, report.HandledBy);
        Assert.NotNull(report.HandlingStartedAt);
        var held = await Assert.ThrowsAsync<RuleException>(() => c.Reports.ClaimAsync(report.ReportId, c.Staff2));
        Assert.Contains("Lê Văn Tâm", held.Message);
        await Assert.ThrowsAsync<RuleException>(() => c.Reports.CompleteAsync(report.ReportId, c.Staff2));
        await Assert.ThrowsAsync<RuleException>(() => c.Reports.ReleaseAsync(report.ReportId, c.Staff2, isManager: false));
        // Taken: the decision stays.
        var revoke = await Assert.ThrowsAsync<RuleException>(() => c.Reports.RevokeAsync(report.ReportId, "Xem lại biên bản", c.Manager));
        Assert.Contains("đang được", revoke.Message);

        // "Gỡ người xử lý": back to Chờ xử lý, another staff member takes it.
        await c.Reports.ReleaseAsync(report.ReportId, c.Manager, isManager: true);
        Assert.Equal(HandlingStatus.Waiting, report.HandlingStatus);
        Assert.Null(report.HandledBy);
        await c.Reports.ClaimAsync(report.ReportId, c.Staff2);
        await c.Reports.CompleteAsync(report.ReportId, c.Staff2);
        Assert.Equal(HandlingStatus.Done, report.HandlingStatus);
        Assert.NotNull(report.HandledAt);
        await Assert.ThrowsAsync<RuleException>(() => c.Reports.UpdateHandlingAsync(report.ReportId, TestStock.Repair, c.Manager));
        await Assert.ThrowsAsync<RuleException>(() => c.Reports.RevokeAsync(report.ReportId, "Xem lại biên bản", c.Manager));
    }

    [Fact]
    public async Task Disposing_defective_items_leaves_stock_on_hand_unchanged()
    {
        await using var c = await Setup();
        var (report, item) = await c.ItemReport("MUO-02");
        var lot = item.ReceiptDetail;
        var onHand = lot.QuantityOnHand; // already without the defective item
        await c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: TestStock.Scrap);
        await c.Reports.ClaimAsync(report.ReportId, c.Staff);
        await c.Reports.CompleteAsync(report.ReportId, c.Staff);

        Assert.Equal(ItemStatus.Disposed, item.Status);
        Assert.NotNull(item.HandledAt);
        Assert.Equal(onHand, lot.QuantityOnHand);
        Assert.Equal(LotStatus.Normal, lot.Status);
        Assert.Equal(-1, (await c.Movement("MUO-02")).Adjusted); // left stock when it was set aside, not again now
    }

    [Fact]
    public async Task Repairing_defective_items_brings_them_back_into_stock()
    {
        await using var c = await Setup();
        var before = c.OnHand("MUO-02");
        var (report, item) = await c.ItemReport("MUO-02");
        Assert.Equal(before - 1, c.OnHand("MUO-02"));
        await c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: TestStock.Repair);
        await c.Reports.ClaimAsync(report.ReportId, c.Staff);
        await c.Reports.CompleteAsync(report.ReportId, c.Staff);

        Assert.Equal(ItemStatus.InStock, item.Status);
        Assert.NotNull(item.DefectiveAt); // kept: stock movements show it left and came back
        Assert.NotNull(item.HandledAt);
        Assert.Equal(before, c.OnHand("MUO-02"));
        Assert.True(await IssueService.Free(c.Db).AnyAsync(i => i.ItemId == item.ItemId));
        var m = await c.Movement("MUO-02");
        Assert.Equal(0, m.Adjusted);
        Assert.Equal(m.Opening, m.Closing);
    }

    [Fact]
    public async Task Disposing_a_locked_lot_empties_it_and_shows_in_stock_movements()
    {
        await using var c = await Setup();
        var before = c.OnHand("MUO-02");
        var report = await c.FailedLotReport("MUO-02", 10, 3);
        var lot = report.ReceiptDetail;
        await c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: new(HandlingMethod.ReturnToSupplier, "Trả lại nhà cung cấp"));
        Assert.Equal(LotStatus.Locked, lot.Status);
        Assert.Equal(3, lot.QuantityOnHand); // locked: still on hand, not available
        await c.Reports.ClaimAsync(report.ReportId, c.Staff);
        await c.Reports.CompleteAsync(report.ReportId, c.Staff);

        Assert.Equal(LotStatus.Locked, lot.Status);
        Assert.Equal(0, lot.QuantityOnHand);
        Assert.All(lot.Items, i => Assert.Equal(ItemStatus.Disposed, i.Status));
        Assert.Equal(before + 7, c.OnHand("MUO-02"));
        var m = await c.Movement("MUO-02");
        Assert.Equal(before, m.Opening);
        Assert.Equal(10, m.In);
        Assert.Equal(-3, m.Adjusted);
        Assert.Equal(before + 7, m.Closing);
        // Gone from the warehouse: not countable any more.
        Assert.False(await c.Db.GoodsReceiptDetails.AnyAsync(d => d.ReceiptDetailId == lot.ReceiptDetailId && d.QuantityOnHand > 0));
    }

    [Fact]
    public async Task Repairing_a_locked_lot_unlocks_it()
    {
        await using var c = await Setup();
        var report = await c.FailedLotReport("MUO-02", 10, 3);
        var lot = report.ReceiptDetail;
        await c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: TestStock.Scrap);
        // The repair turned out possible: the manager changes the method before it is done.
        await c.Reports.UpdateHandlingAsync(report.ReportId, TestStock.Repair, c.Manager);
        Assert.Equal(HandlingMethod.Repair, report.HandlingMethod);
        await c.Reports.ClaimAsync(report.ReportId, c.Staff);
        await c.Reports.CompleteAsync(report.ReportId, c.Staff);

        Assert.Equal(LotStatus.Normal, lot.Status);
        Assert.Equal(3, lot.QuantityOnHand);
        Assert.Equal(3, await IssueService.Free(c.Db).CountAsync(i => i.ReceiptDetailId == lot.ReceiptDetailId));
    }

    [Fact]
    public async Task Staff_can_propose_a_handling_while_the_report_is_pending()
    {
        await using var c = await Setup();
        var (report, _) = await c.ItemReport("MUO-02", proposal: "Đề xuất tiêu hủy");
        Assert.Equal("Đề xuất tiêu hủy", report.HandlingPlan);
        Assert.Null(report.HandlingMethod);

        await c.Reports.ProposeAsync(report.ReportId, "Đề xuất trả nhà cung cấp");
        Assert.Equal("Đề xuất trả nhà cung cấp", report.HandlingPlan);
        await c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: TestStock.Scrap);
        await Assert.ThrowsAsync<RuleException>(() => c.Reports.ProposeAsync(report.ReportId, "Đổi ý"));
    }

    [Fact]
    public async Task Receipt_approval_cannot_be_revoked_once_its_report_is_being_handled()
    {
        await using var c = await Setup();
        var report = await c.FailedLotReport("MUO-02", 10, 3);
        await c.Reports.ApproveAsync(report.ReportId, c.Manager, handling: TestStock.Scrap);
        Assert.Null(await c.Receipts.RevokeBlockAsync(report.ReceiptDetail.ReceiptId));
        await c.Reports.ClaimAsync(report.ReportId, c.Staff);
        Assert.Contains("nhận xử lý", await c.Receipts.RevokeBlockAsync(report.ReceiptDetail.ReceiptId));
    }
}
