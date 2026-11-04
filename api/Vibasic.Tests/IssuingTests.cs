using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Issuing;
using Vibasic.Infrastructure.Seed;

namespace Vibasic.Tests;

public class IssuingTests
{
    private sealed class FixedClock(DateTime utc) : IClock { public DateTime UtcNow => utc; }
    private static readonly DateTime Now = new(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc);

    private sealed class Ctx : IAsyncDisposable
    {
        public required VibasicDbContext Db { get; init; }
        public required IssueService Issues { get; init; }
        public required int Staff { get; init; }
        public required int Manager { get; init; }
        public ValueTask DisposeAsync() => Db.DisposeAsync();

        public Task<Order> Order(string code, params (string sku, int qty)[] lines) =>
            Issues.RecordOrderAsync(new OrderInput(code, "Khách thử", null, lines.Select(l => new OrderLineInput(l.sku, l.qty)).ToList()));

        public List<StockItem> ItemsOf(GoodsIssue issue) =>
            Db.StockItems.Include(i => i.ReceiptDetail).ThenInclude(d => d.Receipt).Where(i => i.IssueDetail!.IssueId == issue.IssueId).ToList();

        /// <summary>Normal lots of an approved receipt with free items, oldest first.</summary>
        public List<GoodsReceiptDetail> FifoLots(string sku) => Db.GoodsReceiptDetails
            .Where(d => d.Product.SKU == sku && d.Status == LotStatus.Normal && d.Receipt.Status == ReceiptStatus.Approved
                && d.Items.Any(i => i.Status == ItemStatus.InStock))
            .OrderBy(d => d.Receipt.ReceiptDate).ThenBy(d => d.ReceiptDetailId).ToList();
    }

    private static async Task<Ctx> Setup()
    {
        var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        await DbSeeder.SeedAsync(db, Now.AddDays(-1));
        var clock = new FixedClock(Now);
        return new Ctx
        {
            Db = db, Issues = new IssueService(db, new CodeGenerator(db), new Notifier(db, clock), clock),
            Staff = db.Users.First(u => u.Username == "nhanvien1").UserId,
            Manager = db.Users.First(u => u.Username == "quanly").UserId,
        };
    }

    [Fact]
    public async Task Create_reserves_items_from_the_oldest_lots_first()
    {
        await using var c = await Setup();
        var oldest = c.FifoLots("MUO-01");
        var firstLotFree = oldest[0].Items.Count(i => i.Status == ItemStatus.InStock);
        var want = firstLotFree + 3; // spills into the next lot (UC_07 4.1)
        var onHandBefore = oldest[0].QuantityOnHand;
        var order = await c.Order("DH-T-01", ("MUO-01", want));

        var preview = await c.Issues.PreviewAsync(order.OrderId);
        Assert.True(preview.Sufficient);
        Assert.Equal([firstLotFree, 3], preview.Lines.Single().Lots.Select(l => l.Take));

        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        Assert.Equal(IssueStatus.Pending, issue.Status);
        Assert.StartsWith("PX-2611-", issue.Code);
        Assert.Equal(OrderStatus.InProgress, order.Status);
        var line = Assert.Single(issue.Details);
        Assert.Equal(want, line.Quantity);
        var items = c.ItemsOf(issue);
        Assert.Equal(want, items.Count);
        Assert.All(items, i => Assert.Equal(ItemStatus.Reserved, i.Status));
        Assert.Equal([oldest[0].ReceiptDetailId, oldest[1].ReceiptDetailId], items.Select(i => i.ReceiptDetailId).Distinct().Order());
        Assert.Equal(onHandBefore, oldest[0].QuantityOnHand); // reserved items stay on hand until delivery
    }

    [Fact]
    public async Task Shortage_puts_the_order_on_hold_without_reserving()
    {
        await using var c = await Setup();
        var order = await c.Order("DH-T-02", ("KHA-01", 5000), ("KHA-02", 1));
        var e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.CreateAsync(order.OrderId, c.Staff));
        Assert.Contains("KHA-01 thiếu", e.Message);
        Assert.Equal(OrderStatus.OnHold, order.Status);
        Assert.False(await c.Db.GoodsIssues.AnyAsync(i => i.OrderId == order.OrderId));
        Assert.False(await c.Db.StockItems.AnyAsync(i => i.Status == ItemStatus.Reserved));
    }

    [Fact]
    public async Task Rejected_issue_releases_items_and_reopens_the_order()
    {
        await using var c = await Setup();
        var order = await c.Order("DH-T-03", ("DUA-02", 10));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        await Assert.ThrowsAsync<ValidationException>(() => c.Issues.RejectAsync(issue.IssueId, "", c.Manager));
        await c.Issues.RejectAsync(issue.IssueId, "Khách đổi ngày nhận hàng", c.Manager);
        Assert.Equal(IssueStatus.Rejected, issue.Status);
        Assert.Equal(OrderStatus.Open, order.Status);
        Assert.Empty(c.ItemsOf(issue));
        Assert.False(await c.Db.StockItems.AnyAsync(i => i.Status == ItemStatus.Reserved));
    }

    [Fact]
    public async Task Picking_validates_scans_then_delivery_deducts_each_lot()
    {
        await using var c = await Setup();
        var order = await c.Order("DH-T-04", ("THT-01", 6));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, "x")); // not approved yet
        await c.Issues.ApproveAsync(issue.IssueId, c.Manager);

        var reserved = c.ItemsOf(issue);
        var locked = await c.Db.StockItems.FirstAsync(i => i.ReceiptDetail.Status == LotStatus.Locked);
        var e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, locked.SerialCode));
        Assert.Contains("Đã khóa", e.Message);
        var notOnIssue = await c.Db.StockItems.FirstAsync(i => i.Status == ItemStatus.InStock && i.ReceiptDetail.Product.SKU == "THT-01" && i.ReceiptDetail.Status == LotStatus.Normal);
        e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, notOnIssue.SerialCode));
        Assert.Contains("FIFO", e.Message);

        foreach (var item in reserved.Take(5)) await c.Issues.ScanAsync(issue.IssueId, item.SerialCode.ToLower());
        Assert.True((await c.Issues.ScanAsync(issue.IssueId, reserved[0].SerialCode)).AlreadyPicked);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.DeliverAsync(issue.IssueId, "Anh Bình", c.Staff)); // one not scanned

        var before = reserved.GroupBy(i => i.ReceiptDetail).ToDictionary(g => g.Key, g => g.Key.QuantityOnHand);
        await c.Issues.ScanAsync(issue.IssueId, reserved[5].SerialCode);
        await Assert.ThrowsAsync<ValidationException>(() => c.Issues.DeliverAsync(issue.IssueId, " ", c.Staff));
        await c.Issues.DeliverAsync(issue.IssueId, "Anh Bình", c.Staff);

        Assert.Equal(IssueStatus.Issued, issue.Status);
        Assert.Equal(OrderStatus.Issued, order.Status);
        Assert.All(c.ItemsOf(issue), i => Assert.Equal(ItemStatus.Issued, i.Status));
        foreach (var (lot, qty) in before)
            Assert.Equal(qty - reserved.Count(i => i.ReceiptDetailId == lot.ReceiptDetailId), lot.QuantityOnHand);
    }

    [Fact]
    public async Task Defect_quarantines_the_lot_and_replaces_its_items_on_every_open_issue()
    {
        await using var c = await Setup();
        var lot = c.FifoLots("MUO-03")[0];
        var free = lot.Items.Count(i => i.Status == ItemStatus.InStock);
        Assert.True(free >= 4);
        var a = await c.Issues.CreateAsync((await c.Order("DH-T-05", ("MUO-03", 2))).OrderId, c.Staff);
        var b = await c.Issues.CreateAsync((await c.Order("DH-T-06", ("MUO-03", 2))).OrderId, c.Staff);
        await c.Issues.ApproveAsync(a.IssueId, c.Manager);
        var aItems = c.ItemsOf(a);
        Assert.All(aItems.Concat(c.ItemsOf(b)), i => Assert.Equal(lot.ReceiptDetailId, i.ReceiptDetailId));
        await c.Issues.ScanAsync(a.IssueId, aItems[1].SerialCode);

        var result = await c.Issues.ReportDefectAsync(a.IssueId, [aItems[0].SerialCode], "Sạn bị nứt cán", c.Staff);

        Assert.False(result.OnHold);
        Assert.Equal(2, result.Replaced);
        Assert.Equal([aItems[1].SerialCode], result.ReturnPicked);
        Assert.Equal(LotStatus.Quarantined, lot.Status);
        var report = await c.Db.AbnormalReports.SingleAsync(r => r.IssueId == a.IssueId);
        Assert.Equal(AbnormalSource.Issue, report.SourceType);
        Assert.Equal(1, report.Quantity);
        Assert.Equal(ItemStatus.InStock, aItems[0].Status); // removed from the issue, stays in the (quarantined) lot
        foreach (var issue in new[] { a, b })
        {
            var now = c.ItemsOf(issue);
            Assert.Equal(2, now.Count);
            Assert.All(now, i => Assert.NotEqual(lot.ReceiptDetailId, i.ReceiptDetailId));
            Assert.All(now, i => Assert.Null(i.PickedAt));
        }
        Assert.Equal(4, c.ItemsOf(a).Concat(c.ItemsOf(b)).Select(i => i.ItemId).Distinct().Count());
        Assert.Contains(c.Db.Notifications, n => n.Title.Contains(b.Code) && n.Title.Contains("đổi"));
    }

    [Fact]
    public async Task Defect_without_enough_replacement_puts_the_issue_on_hold()
    {
        await using var c = await Setup();
        // Take every free KHA-03 item so the defect cannot be replaced (UC_08 3.2).
        var all = await c.Db.StockItems.CountAsync(i => i.Status == ItemStatus.InStock && i.ReceiptDetail.Product.SKU == "KHA-03"
            && i.ReceiptDetail.Status == LotStatus.Normal);
        var order = await c.Order("DH-T-07", ("KHA-03", all));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        await c.Issues.ApproveAsync(issue.IssueId, c.Manager);
        var item = c.ItemsOf(issue)[0];

        var result = await c.Issues.ReportDefectAsync(issue.IssueId, [item.SerialCode], "Hộp gia vị bong keo", c.Staff);

        Assert.True(result.OnHold);
        Assert.Equal(IssueStatus.OnHold, issue.Status);
        Assert.Equal(OrderStatus.OnHold, order.Status);
        Assert.NotNull(issue.HoldReason);
        Assert.Empty(c.ItemsOf(issue));
        Assert.False(await c.Db.StockItems.AnyAsync(i => i.Status == ItemStatus.Reserved));
    }

    [Fact]
    public async Task Orders_from_the_sales_system_are_validated()
    {
        await using var c = await Setup();
        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Issues.RecordOrderAsync(
            new OrderInput("", null, null, [new("KHONG-CO", 1), new("THT-01", 0)])));
        Assert.True(e.Errors.ContainsKey("externalCode"));
        Assert.True(e.Errors.ContainsKey("lines[0].sku"));
        Assert.True(e.Errors.ContainsKey("lines[1].quantity"));
        await c.Order("DH-T-08", ("THT-01", 1));
        e = await Assert.ThrowsAsync<ValidationException>(() => c.Order("dh-t-08", ("THT-01", 1)));
        Assert.True(e.Errors.ContainsKey("externalCode"));
    }
}
