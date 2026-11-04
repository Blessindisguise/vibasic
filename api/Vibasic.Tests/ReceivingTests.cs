using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Abnormal;
using Vibasic.Infrastructure.Receiving;
using Vibasic.Infrastructure.Seed;

namespace Vibasic.Tests;

public class ReceivingTests
{
    private sealed class FixedClock(DateTime utc) : IClock { public DateTime UtcNow => utc; }

    private static readonly DateTime Now = new(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc);

    private sealed class Ctx : IAsyncDisposable
    {
        public required VibasicDbContext Db { get; init; }
        public required ReceiptService Receipts { get; init; }
        public required AbnormalReportService Reports { get; init; }
        public required int Staff { get; init; }
        public required int Manager { get; init; }
        public required Product Board { get; init; }   // THT-01, Xưởng gỗ Minh Long
        public required Product Ladle { get; init; }   // MUO-02, Xưởng gỗ Minh Long
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    private static async Task<Ctx> Setup()
    {
        var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        await DbSeeder.SeedAsync(db, Now.AddDays(-1));
        var clock = new FixedClock(Now);
        var notifier = new Notifier(db, clock);
        return new Ctx
        {
            Db = db,
            Receipts = new ReceiptService(db, new CodeGenerator(db), notifier, clock),
            Reports = new AbnormalReportService(db, notifier, clock),
            Staff = db.Users.First(u => u.Username == "nhanvien1").UserId,
            Manager = db.Users.First(u => u.Username == "quanly").UserId,
            Board = db.Products.First(p => p.SKU == "THT-01"),
            Ladle = db.Products.First(p => p.SKU == "MUO-02"),
        };
    }

    private static ReceiptInput Input(Ctx c, params ReceiptLineInput[] lines) => new(c.Board.SupplierId, null, [.. lines]);
    private static ReceiptLineInput Line(Product p, int received, int failed = 0, string? defect = null, int? doc = null, string? note = null) =>
        new(p.ProductId, received, failed, doc, note, defect);

    private static int Available(Ctx c, Product p) =>
        c.Db.GoodsReceiptDetails.Where(d => d.ProductId == p.ProductId && d.Status == LotStatus.Normal).Sum(d => d.QuantityOnHand);

    [Fact]
    public async Task Create_splits_failed_goods_into_a_quarantined_lot_without_recording_stock()
    {
        await using var c = await Setup();
        var before = Available(c, c.Board);
        var r = await c.Receipts.CreateAsync(Input(c, Line(c.Board, 50, 3, "Nứt cạnh thớt khi vận chuyển"), Line(c.Ladle, 20)), c.Staff);

        Assert.Equal(ReceiptStatus.Receiving, r.Status);
        Assert.StartsWith("PN-2611-", r.Code);
        var lots = r.Details.OrderBy(d => d.ReceiptDetailId).ToList();
        Assert.Equal(3, lots.Count);
        var normal = lots.Single(d => d.ProductId == c.Board.ProductId && d.Status == LotStatus.Normal);
        var quarantined = lots.Single(d => d.ProductId == c.Board.ProductId && d.Status == LotStatus.Quarantined);
        Assert.Equal(47, normal.Quantity);
        Assert.Equal(3, quarantined.Quantity);
        Assert.Equal("Nứt cạnh thớt khi vận chuyển", quarantined.Note);
        Assert.All(lots, l => Assert.Equal(0, l.QuantityOnHand));
        Assert.All(lots, l => Assert.Equal(l.Quantity, l.Items.Count));
        Assert.All(lots.SelectMany(l => l.Items), i => Assert.Equal(ItemStatus.Incoming, i.Status));
        Assert.Equal(lots.Count, lots.Select(l => l.LotCode).Distinct().Count());
        Assert.All(normal.Items, i => Assert.StartsWith("SP-THT01-2611-", i.SerialCode));
        Assert.Equal(before, Available(c, c.Board)); // NFR: stock only after approval
    }

    [Fact]
    public async Task Invalid_lines_are_reported_per_field()
    {
        await using var c = await Setup();
        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Receipts.CreateAsync(Input(c,
            Line(c.Board, 10, 12),                       // failed > received, no defect description
            Line(c.Ladle, 10, doc: 12),                  // differs from the delivery note without explanation
            Line(c.Ladle, 5)), c.Staff));                // duplicate product
        Assert.True(e.Errors.ContainsKey("lines[0].failedQuantity"));
        Assert.True(e.Errors.ContainsKey("lines[0].defectDescription"));
        Assert.True(e.Errors.ContainsKey("lines[1].note"));
        Assert.True(e.Errors.ContainsKey("lines[2].productId"));

        e = await Assert.ThrowsAsync<ValidationException>(() => c.Receipts.CreateAsync(new ReceiptInput(null, null, []), c.Staff));
        Assert.True(e.Errors.ContainsKey("supplierId"));
        Assert.True(e.Errors.ContainsKey("lines"));
    }

    [Fact]
    public async Task Full_flow_submit_approve_then_handle_abnormal_report()
    {
        await using var c = await Setup();
        var r = await c.Receipts.CreateAsync(Input(c, Line(c.Board, 40, 4, "Cong vênh mặt thớt")), c.Staff);
        var before = Available(c, c.Board);

        await c.Receipts.SubmitAsync(r.ReceiptId, c.Staff);
        Assert.Equal(ReceiptStatus.Pending, r.Status);
        var report = await c.Db.AbnormalReports.SingleAsync(a => a.ReceiptDetail.ReceiptId == r.ReceiptId);
        Assert.Equal(AbnormalSource.Receipt, report.SourceType);
        Assert.Equal(4, report.Quantity);
        Assert.Equal(ApprovalStatus.Pending, report.Status);
        Assert.Contains(c.Db.Notifications, n => n.UserId == c.Manager && n.Title.Contains(r.Code));

        // UC_05 step 7 comes after step 6.
        await Assert.ThrowsAsync<RuleException>(() => c.Reports.ApproveAsync(report.ReportId, c.Manager));
        await Assert.ThrowsAsync<RuleException>(() => c.Receipts.UpdateAsync(r.ReceiptId, Input(c, Line(c.Board, 40)))); // pending: read-only

        await c.Receipts.ApproveAsync(r.ReceiptId, c.Manager);
        Assert.Equal(ReceiptStatus.Approved, r.Status);
        Assert.Equal(c.Manager, r.ApprovedBy);
        Assert.All(r.Details, d => Assert.Equal(d.Quantity, d.QuantityOnHand));
        Assert.All(r.Details.SelectMany(d => d.Items), i => Assert.Equal(ItemStatus.InStock, i.Status));
        Assert.Equal(before + 36, Available(c, c.Board)); // the quarantined 4 are not available
        Assert.Contains(c.Db.Notifications, n => n.UserId == c.Staff && n.Title.Contains("đã được duyệt"));

        await c.Reports.ApproveAsync(report.ReportId, c.Manager);
        Assert.Equal(LotStatus.Locked, report.ReceiptDetail.Status);
        Assert.Equal(before + 36, Available(c, c.Board));
    }

    [Fact]
    public async Task Rejected_abnormal_report_returns_the_lot_to_available_stock()
    {
        await using var c = await Setup();
        var r = await c.Receipts.CreateAsync(Input(c, Line(c.Ladle, 10, 2, "Trầy bề mặt vá")), c.Staff);
        await c.Receipts.SubmitAsync(r.ReceiptId, c.Staff);
        await c.Receipts.ApproveAsync(r.ReceiptId, c.Manager);
        var before = Available(c, c.Ladle);
        var report = await c.Db.AbnormalReports.SingleAsync(a => a.ReceiptDetail.ReceiptId == r.ReceiptId);

        await Assert.ThrowsAsync<ValidationException>(() => c.Reports.RejectAsync(report.ReportId, "ok", c.Manager));
        await c.Reports.RejectAsync(report.ReportId, "Vết trầy nhẹ, vẫn bán được", c.Manager);
        Assert.Equal(LotStatus.Normal, report.ReceiptDetail.Status);
        Assert.Equal(before + 2, Available(c, c.Ladle));
    }

    [Fact]
    public async Task Rejected_receipt_is_edited_and_resubmitted_keeping_unchanged_lots()
    {
        await using var c = await Setup();
        var r = await c.Receipts.CreateAsync(Input(c, Line(c.Board, 30, 2, "Nứt nhẹ ở góc"), Line(c.Ladle, 15)), c.Staff);
        await c.Receipts.SubmitAsync(r.ReceiptId, c.Staff);

        await Assert.ThrowsAsync<ValidationException>(() => c.Receipts.RejectAsync(r.ReceiptId, " ", c.Manager));
        await c.Receipts.RejectAsync(r.ReceiptId, "Số lượng muỗng chưa khớp chứng từ", c.Manager);
        Assert.Equal(ReceiptStatus.Rejected, r.Status);
        var boardLots = r.Details.Where(d => d.ProductId == c.Board.ProductId).Select(d => d.LotCode).ToHashSet();
        var ladleLot = r.Details.Single(d => d.ProductId == c.Ladle.ProductId).LotCode;

        await c.Receipts.UpdateAsync(r.ReceiptId, Input(c,
            Line(c.Board, 30, 2, "Nứt nhẹ ở góc, 2 cái"),
            Line(c.Ladle, 14, doc: 15, note: "Thiếu 1 cái so với chứng từ")));
        Assert.Equal(boardLots, r.Details.Where(d => d.ProductId == c.Board.ProductId).Select(d => d.LotCode).ToHashSet());
        var newLadle = r.Details.Single(d => d.ProductId == c.Ladle.ProductId);
        Assert.NotEqual(ladleLot, newLadle.LotCode);
        Assert.Equal(14, newLadle.Items.Count);
        Assert.Equal(15, newLadle.DocumentQuantity);

        await c.Receipts.SubmitAsync(r.ReceiptId, c.Staff);
        var report = await c.Db.AbnormalReports.SingleAsync(a => a.ReceiptDetail.ReceiptId == r.ReceiptId);
        Assert.Equal("Nứt nhẹ ở góc, 2 cái", report.Description);
        Assert.Equal(ReceiptStatus.Pending, r.Status);
        Assert.Null(r.ApprovedBy);
    }

    [Fact]
    public async Task Dropping_a_product_on_edit_removes_its_lots_items_and_report()
    {
        await using var c = await Setup();
        var r = await c.Receipts.CreateAsync(Input(c, Line(c.Board, 10, 1, "Mẻ góc thớt"), Line(c.Ladle, 5)), c.Staff);
        await c.Receipts.SubmitAsync(r.ReceiptId, c.Staff);
        await c.Receipts.RejectAsync(r.ReceiptId, "Không nhận thớt đợt này", c.Manager);

        await c.Receipts.UpdateAsync(r.ReceiptId, Input(c, Line(c.Ladle, 5)));
        Assert.Single(r.Details);
        Assert.False(await c.Db.AbnormalReports.AnyAsync(a => a.ReceiptDetail.ReceiptId == r.ReceiptId));
        Assert.Equal(5, await c.Db.StockItems.CountAsync(i => i.ReceiptDetail.ReceiptId == r.ReceiptId));
    }
}
