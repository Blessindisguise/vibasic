using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Abnormal;
using Vibasic.Infrastructure.Decision;
using Vibasic.Infrastructure.Issuing;
using Vibasic.Infrastructure.Seed;

namespace Vibasic.Tests;

public class IssuingTests
{
    private sealed class FixedClock(DateTime utc) : IClock { public DateTime UtcNow { get; set; } = utc; }
    private static readonly DateTime Now = new(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc);

    private sealed class Ctx : IAsyncDisposable
    {
        public required VibasicDbContext Db { get; init; }
        public required IssueService Issues { get; init; }
        public required AbnormalReportService Reports { get; init; }
        public required int Staff { get; init; }
        public required int Manager { get; init; }
        public required int Staff2 { get; init; }
        public required FixedClock Clock { get; init; }
        public required string DbName { get; init; }
        public ValueTask DisposeAsync() => Db.DisposeAsync();

        /// <summary>A second request on the same database (another staff member's browser).</summary>
        public (VibasicDbContext db, IssueService issues) OtherRequest()
        {
            var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(DbName).Options);
            var notifier = new Notifier(db, Clock);
            return (db, new IssueService(db, new CodeGenerator(db), notifier, Clock, new ReplenishmentService(db, notifier, Clock)));
        }

        public async Task<GoodsIssue> Approved(string code, string sku, int qty)
        {
            var issue = await Issues.CreateAsync((await Order(code, (sku, qty))).OrderId, Staff);
            await Issues.ApproveAsync(issue.IssueId, Manager);
            return issue;
        }

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
        var name = Guid.NewGuid().ToString();
        var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(name).Options);
        await DbSeeder.SeedAsync(db, Now.AddDays(-1));
        var clock = new FixedClock(Now);
        var notifier = new Notifier(db, clock);
        var replenish = new ReplenishmentService(db, notifier, clock);
        var issues = new IssueService(db, new CodeGenerator(db), notifier, clock, replenish);
        await TestStock.AddLotsAsync(db, clock, TestStock.MultiLot);
        return new Ctx
        {
            Db = db, Issues = issues, Reports = new AbnormalReportService(db, notifier, clock, replenish, issues),
            Staff = db.Users.First(u => u.Username == "nhanvien1").UserId,
            Manager = db.Users.First(u => u.Username == "quanly").UserId,
            Staff2 = db.Users.First(u => u.Username == "nhanvien2").UserId,
            Clock = clock, DbName = name,
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
    public async Task Revoked_issue_returns_to_pending_keeping_its_items_until_delivery()
    {
        await using var c = await Setup();
        var order = await c.Order("DH-T-09", ("DUA-02", 4));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.RevokeAsync(issue.IssueId, "Khách hoãn", c.Manager)); // not approved
        await c.Issues.ApproveAsync(issue.IssueId, c.Manager);
        var items = c.ItemsOf(issue);
        await c.Issues.ScanAsync(issue.IssueId, items[0].SerialCode, c.Staff);

        await c.Issues.RevokeAsync(issue.IssueId, "Khách hoãn ngày nhận", c.Manager);
        Assert.Equal(IssueStatus.Pending, issue.Status);
        Assert.Null(issue.ApprovedBy);
        Assert.Equal(OrderStatus.InProgress, order.Status);
        Assert.All(c.ItemsOf(issue), i => Assert.Equal(ItemStatus.Reserved, i.Status));
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, items[1].SerialCode, c.Staff)); // picking paused

        await c.Issues.ApproveAsync(issue.IssueId, c.Manager);
        foreach (var item in items) await c.Issues.ScanAsync(issue.IssueId, item.SerialCode, c.Staff);
        await c.Issues.DeliverAsync(issue.IssueId, "Chị Mai", c.Staff);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.RevokeAsync(issue.IssueId, "Quá muộn", c.Manager)); // delivered
    }

    [Fact]
    public async Task Picking_validates_scans_then_delivery_deducts_each_lot()
    {
        await using var c = await Setup();
        var order = await c.Order("DH-T-04", ("THT-01", 6));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, "x", c.Staff)); // not approved yet
        await c.Issues.ApproveAsync(issue.IssueId, c.Manager);

        var reserved = c.ItemsOf(issue);
        var locked = await c.Db.StockItems.FirstAsync(i => i.ReceiptDetail.Status == LotStatus.Locked);
        var e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, locked.SerialCode, c.Staff));
        Assert.Contains("Đã khóa", e.Message);
        // A newer lot than any on the pick list: out of FIFO order (same-lot items are interchangeable, see Same_lot_scan_*).
        var pickLots = reserved.Select(i => i.ReceiptDetailId).Distinct().ToList();
        var notOnIssue = await c.Db.StockItems.FirstAsync(i => i.Status == ItemStatus.InStock && i.ReceiptDetail.Product.SKU == "THT-01"
            && i.ReceiptDetail.Status == LotStatus.Normal && i.ReceiptDetail.Receipt.Status == ReceiptStatus.Approved && !pickLots.Contains(i.ReceiptDetailId));
        e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, notOnIssue.SerialCode, c.Staff));
        Assert.Contains("FIFO", e.Message);

        foreach (var item in reserved.Take(5)) await c.Issues.ScanAsync(issue.IssueId, item.SerialCode.ToLower(), c.Staff);
        Assert.True((await c.Issues.ScanAsync(issue.IssueId, reserved[0].SerialCode, c.Staff)).AlreadyPicked);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.DeliverAsync(issue.IssueId, "Anh Bình", c.Staff)); // one not scanned

        var before = reserved.GroupBy(i => i.ReceiptDetail).ToDictionary(g => g.Key, g => g.Key.QuantityOnHand);
        await c.Issues.ScanAsync(issue.IssueId, reserved[5].SerialCode, c.Staff);
        await Assert.ThrowsAsync<ValidationException>(() => c.Issues.DeliverAsync(issue.IssueId, " ", c.Staff));
        await c.Issues.DeliverAsync(issue.IssueId, "Anh Bình", c.Staff);

        Assert.Equal(IssueStatus.Issued, issue.Status);
        Assert.Equal(OrderStatus.Issued, order.Status);
        Assert.All(c.ItemsOf(issue), i => Assert.Equal(ItemStatus.Issued, i.Status));
        foreach (var (lot, qty) in before)
            Assert.Equal(qty - reserved.Count(i => i.ReceiptDetailId == lot.ReceiptDetailId), lot.QuantityOnHand);
    }

    /// <summary>Free items of every normal lot of the SKU, and the newest lot (30 units from TestStock, nothing reserved in it).</summary>
    private static (int free, GoodsReceiptDetail newest) FreeStock(Ctx c, string sku)
    {
        var lots = c.FifoLots(sku);
        var free = c.Db.StockItems.Count(i => lots.Select(l => l.ReceiptDetailId).Contains(i.ReceiptDetailId) && i.Status == ItemStatus.InStock);
        return (free, lots[^1]);
    }

    [Fact]
    public async Task Scanning_a_lot_label_picks_the_whole_lot_when_the_issue_takes_all_of_it()
    {
        await using var c = await Setup();
        var (free, newest) = FreeStock(c, "MUO-01");
        var issue = await c.Approved("DH-T-L1", "MUO-01", free); // everything, so the newest lot is taken whole
        var lotItems = c.ItemsOf(issue).Where(i => i.ReceiptDetailId == newest.ReceiptDetailId).ToList();
        Assert.Equal(30, lotItems.Count);
        await c.Issues.ScanAsync(issue.IssueId, lotItems[0].SerialCode, c.Staff); // one item scanned on its own first

        var r = await c.Issues.ScanAsync(issue.IssueId, newest.LotCode.ToLower(), c.Staff);

        Assert.Equal(newest.LotCode, r.LotCode);
        Assert.Equal(29, r.LotPicked);
        Assert.False(r.AlreadyPicked);
        Assert.Equal(30, r.Picked);
        Assert.All(lotItems, i => Assert.NotNull(i.PickedAt));
        Assert.True((await c.Issues.ScanAsync(issue.IssueId, newest.LotCode, c.Staff)).AlreadyPicked);
    }

    [Fact]
    public async Task Scanning_a_lot_label_is_refused_when_the_issue_takes_part_of_the_lot()
    {
        await using var c = await Setup();
        var (free, newest) = FreeStock(c, "MUO-01");
        var issue = await c.Approved("DH-T-L2", "MUO-01", free - 1); // 29 of the newest lot's 30

        var e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, newest.LotCode, c.Staff));

        Assert.Contains("29/30", e.Message);
        Assert.Contains("Quét từng tem", e.Message);
        Assert.All(c.ItemsOf(issue), i => Assert.Null(i.PickedAt));
    }

    [Fact]
    public async Task Scanning_a_lot_label_is_refused_when_another_issue_holds_part_of_the_lot()
    {
        await using var c = await Setup();
        var (free, newest) = FreeStock(c, "MUO-01");
        var a = await c.Approved("DH-T-L3", "MUO-01", free - 28); // older lots + 2 of the newest
        var b = await c.Approved("DH-T-L4", "MUO-01", 28);        // the other 28 of the newest
        Assert.All(c.ItemsOf(b), i => Assert.Equal(newest.ReceiptDetailId, i.ReceiptDetailId));

        var e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(b.IssueId, newest.LotCode, c.Staff));

        Assert.Contains("28/30", e.Message);
        Assert.All(c.ItemsOf(a).Concat(c.ItemsOf(b)), i => Assert.Null(i.PickedAt));
    }

    [Fact]
    public async Task Defect_sets_aside_only_the_listed_items_and_the_lot_stays_issuable()
    {
        await using var c = await Setup();
        var lot = c.FifoLots("MUO-03")[0];
        var onHand = lot.QuantityOnHand;
        var a = await c.Issues.CreateAsync((await c.Order("DH-T-05", ("MUO-03", 2))).OrderId, c.Staff);
        var b = await c.Issues.CreateAsync((await c.Order("DH-T-06", ("MUO-03", 2))).OrderId, c.Staff);
        await c.Issues.ApproveAsync(a.IssueId, c.Manager);
        var aItems = c.ItemsOf(a);
        var bItems = c.ItemsOf(b).Select(i => i.ItemId).Order().ToList();
        await c.Issues.ScanAsync(a.IssueId, aItems[1].SerialCode, c.Staff);

        var result = await c.Issues.ReportDefectAsync(a.IssueId, [aItems[0].SerialCode], "Sạn bị nứt cán", c.Staff);

        Assert.False(result.OnHold);
        Assert.Equal(1, result.Replaced);
        Assert.Empty(result.ReturnPicked); // the good item already picked stays picked
        Assert.Equal(LotStatus.Normal, lot.Status);
        var report = await c.Db.AbnormalReports.Include(r => r.Items).SingleAsync(r => r.IssueId == a.IssueId);
        Assert.Equal(ReportScope.Items, report.Scope);
        Assert.Equal([aItems[0].ItemId], report.Items.Select(x => x.ItemId));
        Assert.Equal(ItemStatus.Defective, aItems[0].Status);
        Assert.Null(aItems[0].IssueDetailId);
        Assert.Equal(onHand - 1, lot.QuantityOnHand); // set aside, out of stock on hand
        var now = c.ItemsOf(a);
        Assert.Equal(2, now.Count);
        Assert.Contains(now, i => i.ItemId == aItems[1].ItemId && i.PickedAt != null);
        Assert.DoesNotContain(now, i => i.ItemId == aItems[0].ItemId);
        Assert.Equal(bItems, c.ItemsOf(b).Select(i => i.ItemId).Order()); // other issues untouched
        var scan = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(a.IssueId, aItems[0].SerialCode, c.Staff));
        Assert.Contains("biên bản lỗi", scan.Message);

        // Rejected: the item was fine after all and goes back on the shelf.
        await c.Reports.RejectAsync(report.ReportId, "Vết xước nhẹ, vẫn bán được", c.Manager);
        Assert.Equal(ItemStatus.InStock, aItems[0].Status);
        Assert.Equal(onHand, lot.QuantityOnHand);
        // Revoked: set aside again until the manager decides.
        await c.Reports.RevokeAsync(report.ReportId, "Xem lại sản phẩm", c.Manager);
        Assert.Equal(ApprovalStatus.Pending, report.Status);
        Assert.Equal(ItemStatus.Defective, aItems[0].Status);
        Assert.Equal(onHand - 1, lot.QuantityOnHand);
        await c.Reports.ApproveAsync(report.ReportId, c.Manager);
        Assert.Equal(LotStatus.Normal, lot.Status);
        Assert.Equal(ItemStatus.Defective, aItems[0].Status);
    }

    [Fact]
    public async Task Manager_can_lock_the_whole_lot_when_approving_an_item_report()
    {
        await using var c = await Setup();
        var lot = c.FifoLots("MUO-03")[0];
        var a = await c.Issues.CreateAsync((await c.Order("DH-T-05", ("MUO-03", 2))).OrderId, c.Staff);
        var b = await c.Issues.CreateAsync((await c.Order("DH-T-06", ("MUO-03", 2))).OrderId, c.Staff);
        await c.Issues.ApproveAsync(a.IssueId, c.Manager);
        await c.Issues.ReportDefectAsync(a.IssueId, [c.ItemsOf(a)[0].SerialCode], "Mốc đáy muỗng", c.Staff);
        var report = await c.Db.AbnormalReports.SingleAsync(r => r.IssueId == a.IssueId);
        Assert.Contains(c.ItemsOf(b), i => i.ReceiptDetailId == lot.ReceiptDetailId);

        await c.Reports.ApproveAsync(report.ReportId, c.Manager, wholeLot: true);

        Assert.Equal(ReportScope.Lot, report.Scope);
        Assert.Equal(LotStatus.Locked, lot.Status);
        Assert.All(c.ItemsOf(a).Concat(c.ItemsOf(b)), i => Assert.NotEqual(lot.ReceiptDetailId, i.ReceiptDetailId));
        Assert.Equal(2, c.ItemsOf(b).Count);
    }

    [Fact]
    public async Task Defect_on_the_whole_lot_quarantines_it_and_replaces_its_items_on_every_open_issue()
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
        await c.Issues.ScanAsync(a.IssueId, aItems[1].SerialCode, c.Staff);

        var result = await c.Issues.ReportDefectAsync(a.IssueId, [aItems[0].SerialCode], "Sạn bị nứt cán", c.Staff, wholeLot: true);

        Assert.False(result.OnHold);
        Assert.Equal(2, result.Replaced);
        Assert.Equal([aItems[1].SerialCode], result.ReturnPicked);
        Assert.Equal(LotStatus.Quarantined, lot.Status);
        var report = await c.Db.AbnormalReports.SingleAsync(r => r.IssueId == a.IssueId);
        Assert.Equal(AbnormalSource.Issue, report.SourceType);
        Assert.Equal(ReportScope.Lot, report.Scope);
        Assert.Equal(1, report.Quantity);
        Assert.Equal(ItemStatus.Defective, aItems[0].Status);
        Assert.Equal(ItemStatus.InStock, aItems[1].Status); // back on the shelf of the (quarantined) lot
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
        Assert.Equal(IssueStatus.Cancelled, issue.Status);
        Assert.Equal(OrderStatus.OnHold, order.Status);
        Assert.NotNull(issue.HoldReason);
        Assert.Empty(c.ItemsOf(issue));
        Assert.False(await c.Db.StockItems.AnyAsync(i => i.Status == ItemStatus.Reserved));
        Assert.Equal(ItemStatus.Defective, item.Status);
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

    // ---------------- X1: same-lot items are interchangeable when picking ----------------

    [Fact]
    public async Task Same_lot_scan_takes_a_free_item_in_place_of_a_reserved_one()
    {
        await using var c = await Setup();
        var order = await c.Order("DH-X1-01", ("DUA-02", 3));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        await c.Issues.ApproveAsync(issue.IssueId, c.Manager);
        var reserved = c.ItemsOf(issue);
        var lotId = reserved[0].ReceiptDetailId;
        var free = await c.Db.StockItems.FirstAsync(i => i.ReceiptDetailId == lotId && i.Status == ItemStatus.InStock && i.IssueDetailId == null);

        var r = await c.Issues.ScanAsync(issue.IssueId, free.SerialCode, c.Staff);
        Assert.NotNull(r.ReplacedSerial);
        Assert.Equal((1, 3), (r.Picked, r.Total));
        var now = c.ItemsOf(issue);
        Assert.Equal(3, now.Count);
        Assert.Contains(now, i => i.ItemId == free.ItemId && i.PickedAt != null && i.Status == ItemStatus.Reserved);
        var released = await c.Db.StockItems.SingleAsync(i => i.SerialCode == r.ReplacedSerial);
        Assert.Equal(ItemStatus.InStock, released.Status);
        Assert.Null(released.IssueDetailId);
    }

    [Fact]
    public async Task Same_lot_scan_trades_items_with_another_issue_that_has_not_picked_them()
    {
        await using var c = await Setup();
        var a = await c.Issues.CreateAsync((await c.Order("DH-X1-02", ("DUA-02", 2))).OrderId, c.Staff);
        var b = await c.Issues.CreateAsync((await c.Order("DH-X1-03", ("DUA-02", 2))).OrderId, c.Staff);
        await c.Issues.ApproveAsync(a.IssueId, c.Manager);
        var fromB = c.ItemsOf(b);
        var sameLot = fromB.First(i => c.ItemsOf(a).Any(x => x.ReceiptDetailId == i.ReceiptDetailId));

        var r = await c.Issues.ScanAsync(a.IssueId, sameLot.SerialCode, c.Staff);
        Assert.NotNull(r.ReplacedSerial);
        Assert.Equal(2, c.ItemsOf(a).Count);
        Assert.Contains(c.ItemsOf(a), i => i.ItemId == sameLot.ItemId);
        var bNow = c.ItemsOf(b);
        Assert.Equal(2, bNow.Count);
        Assert.Contains(bNow, i => i.SerialCode == r.ReplacedSerial && i.Status == ItemStatus.Reserved && i.PickedAt == null);

        // Once scanned for A it cannot be taken again by B.
        await c.Issues.ApproveAsync(b.IssueId, c.Manager);
        var e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(b.IssueId, sameLot.SerialCode, c.Staff));
        Assert.Contains("phiếu xuất khác", e.Message);
    }

    // ---------------- Nhận phiếu khi lấy hàng ----------------

    [Fact]
    public async Task Only_the_staff_member_who_claimed_an_issue_can_pick_it()
    {
        await using var c = await Setup();
        var issue = await c.Approved("DH-P-01", "DUA-02", 3);
        var items = c.ItemsOf(issue);

        await c.Issues.ClaimAsync(issue.IssueId, c.Staff);
        Assert.Equal(c.Staff, issue.PickerId);
        Assert.Equal(Now, issue.PickStartedAt);
        var e = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ClaimAsync(issue.IssueId, c.Staff2));
        Assert.Contains("đang do Lê Văn Tâm lấy hàng", e.Message);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, items[0].SerialCode, c.Staff2));
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ReportDefectAsync(issue.IssueId, [items[0].SerialCode], "Nứt thân đũa", c.Staff2));
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ReleaseAsync(issue.IssueId, c.Staff2, isManager: false));

        foreach (var item in items) await c.Issues.ScanAsync(issue.IssueId, item.SerialCode, c.Staff);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.DeliverAsync(issue.IssueId, "Anh Bình", c.Staff2));
        await c.Issues.DeliverAsync(issue.IssueId, "Anh Bình", c.Staff);
        Assert.Equal(IssueStatus.Issued, issue.Status);
    }

    [Fact]
    public async Task Scanning_a_free_issue_claims_it()
    {
        await using var c = await Setup();
        var issue = await c.Approved("DH-P-02", "DUA-02", 2);
        Assert.Null(issue.PickerId);
        await c.Issues.ScanAsync(issue.IssueId, c.ItemsOf(issue)[0].SerialCode, c.Staff2);
        Assert.Equal(c.Staff2, issue.PickerId);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, c.ItemsOf(issue)[1].SerialCode, c.Staff));
    }

    [Fact]
    public async Task An_issue_is_held_for_three_days_from_the_claim()
    {
        await using var c = await Setup();
        var issue = await c.Approved("DH-P-03", "DUA-02", 2);
        var items = c.ItemsOf(issue);
        await c.Issues.ScanAsync(issue.IssueId, items[0].SerialCode, c.Staff);

        c.Clock.UtcNow = Now.AddDays(2);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ClaimAsync(issue.IssueId, c.Staff2));
        await c.Issues.ClaimAsync(issue.IssueId, c.Staff); // the holder coming back does not extend the hold
        Assert.Equal(Now, issue.PickStartedAt);
        c.Clock.UtcNow = Now.AddDays(3).AddMinutes(-1);
        var held = await Assert.ThrowsAsync<RuleException>(() => c.Issues.ClaimAsync(issue.IssueId, c.Staff2));
        Assert.Contains("tới 07/11/2026 10:00", held.Message);
        c.Clock.UtcNow = Now.AddDays(3).AddMinutes(1);
        // Scanning never takes an issue over by accident; only an explicit claim does.
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, items[1].SerialCode, c.Staff2));
        await c.Issues.ClaimAsync(issue.IssueId, c.Staff2);
        Assert.Equal(c.Staff2, issue.PickerId);
        Assert.Equal(Now.AddDays(3).AddMinutes(1), issue.PickStartedAt);
        Assert.True(await c.Db.Notifications.AnyAsync(n => n.UserId == c.Staff && n.Title.Contains("nhận lại")));

        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ScanAsync(issue.IssueId, items[1].SerialCode, c.Staff));
        var r = await c.Issues.ScanAsync(issue.IssueId, items[1].SerialCode, c.Staff2);
        Assert.Equal(2, r.Picked); // the first picker's scan is kept
    }

    [Fact]
    public async Task Releasing_keeps_the_scanned_items_and_a_manager_can_release_anyone()
    {
        await using var c = await Setup();
        var issue = await c.Approved("DH-P-04", "DUA-02", 2);
        var items = c.ItemsOf(issue);
        await c.Issues.ScanAsync(issue.IssueId, items[0].SerialCode, c.Staff);

        await c.Issues.ReleaseAsync(issue.IssueId, c.Staff, isManager: false);
        Assert.Null(issue.PickerId);
        Assert.Null(issue.PickActiveAt);
        Assert.NotNull(c.ItemsOf(issue).Single(i => i.ItemId == items[0].ItemId).PickedAt);

        await c.Issues.ClaimAsync(issue.IssueId, c.Staff2);
        await c.Issues.ReleaseAsync(issue.IssueId, c.Manager, isManager: true);
        Assert.Null(issue.PickerId);
        Assert.True(await c.Db.Notifications.AnyAsync(n => n.UserId == c.Staff2 && n.Title.Contains("gỡ")));
    }

    [Fact]
    public async Task Rejecting_clears_the_picker_and_revoking_keeps_them()
    {
        await using var c = await Setup();
        var issue = await c.Approved("DH-P-05", "DUA-02", 2);
        await c.Issues.ClaimAsync(issue.IssueId, c.Staff);
        await c.Issues.RevokeAsync(issue.IssueId, "Khách đổi địa chỉ", c.Manager);
        Assert.Equal(c.Staff, issue.PickerId);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.ClaimAsync(issue.IssueId, c.Staff)); // pending again
        await c.Issues.RejectAsync(issue.IssueId, "Khách hủy đơn hàng", c.Manager);
        Assert.Null(issue.PickerId);
    }

    [Fact]
    public async Task Two_simultaneous_claims_only_one_wins()
    {
        await using var c = await Setup();
        var issue = await c.Approved("DH-P-06", "DUA-02", 2);
        var (db1, first) = c.OtherRequest();
        var (db2, second) = c.OtherRequest();
        await using (db1)
        await using (db2)
        {
            // Both requests read the issue while it is still free, then save.
            var a = await db1.GoodsIssues.SingleAsync(i => i.IssueId == issue.IssueId);
            var b = await db2.GoodsIssues.SingleAsync(i => i.IssueId == issue.IssueId);
            await first.ClaimAsync(issue.IssueId, c.Staff);
            b.PickerId = c.Staff2;
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => db2.SaveChangesAsync());
            Assert.NotNull(a);
        }
    }

    [Fact]
    public async Task Two_simultaneous_issues_for_one_order_only_one_is_saved()
    {
        await using var c = await Setup();
        var order = await c.Order("DH-P-07", ("DUA-02", 2));
        var (db1, first) = c.OtherRequest();
        var (db2, _) = c.OtherRequest();
        await using (db1)
        await using (db2)
        {
            var stale = await db2.Orders.SingleAsync(o => o.OrderId == order.OrderId); // loaded before the first issue is saved
            await first.CreateAsync(order.OrderId, c.Staff);
            stale.Status = OrderStatus.InProgress;
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => db2.SaveChangesAsync());
        }
    }

    [Fact]
    public async Task Orders_keep_contact_details_and_check_the_phone()
    {
        await using var c = await Setup();
        var order = await c.Issues.RecordOrderAsync(new OrderInput("DH-C-01", "Nhà hàng Mộc Gia", null, [new("DUA-02", 1)],
            " 0903 118 245 ", "12 Lê Lợi, Quận 1, TP.HCM", "Giao giờ hành chính"));
        Assert.Equal("0903 118 245", order.CustomerPhone);
        Assert.Equal("12 Lê Lợi, Quận 1, TP.HCM", order.ShippingAddress);
        Assert.Equal("Giao giờ hành chính", order.Note);

        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Issues.RecordOrderAsync(
            new OrderInput("DH-C-02", null, null, [new("DUA-02", 1)], "09ab123", null, null)));
        Assert.Equal(["customerPhone"], e.Errors.Keys);
    }

    // ---------------- Hủy đơn hàng, báo đơn đủ hàng ----------------

    private static ReplenishmentService Replenish(Ctx c) => new(c.Db, new Notifier(c.Db, c.Clock), c.Clock);

    [Fact]
    public async Task Cancelling_an_order_without_an_issue_stops_it_counting_as_ordered()
    {
        await using var c = await Setup();
        var order = await c.Order("DH-H-01", ("MUO-01", 5));
        var pid = order.Details.Single().ProductId;
        var before = (await Replenish(c).StockAsync([pid]))[pid].Ordered;

        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Issues.CancelOrderAsync(order.OrderId, " ", c.Manager));
        Assert.True(e.Errors.ContainsKey("reason"));
        var r = await c.Issues.CancelOrderAsync(order.OrderId, "Khách đổi ý, không lấy nữa", c.Manager);

        Assert.Equal(OrderStatus.Cancelled, order.Status);
        Assert.Equal("Khách đổi ý, không lấy nữa", order.CancelReason);
        Assert.Equal(c.Manager, order.CancelledBy);
        Assert.Null(r.IssueCode);
        Assert.Equal(before - 5, (await Replenish(c).StockAsync([pid]))[pid].Ordered); // Q8: no longer ordered
        Assert.Contains(c.Db.Notifications, n => n.UserId == c.Staff && n.Title == "Đơn DH-H-01 đã hủy");
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.CancelOrderAsync(order.OrderId, "Hủy lần nữa", c.Manager));
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.CreateAsync(order.OrderId, c.Staff));
    }

    [Fact]
    public async Task Cancelling_an_order_cancels_its_open_issue_and_lists_the_picked_items()
    {
        await using var c = await Setup();
        var issue = await c.Approved("DH-H-02", "MUO-01", 4);
        var items = c.ItemsOf(issue).OrderBy(i => i.SerialCode).ToList();
        await c.Issues.ScanAsync(issue.IssueId, items[0].SerialCode, c.Staff);
        await c.Issues.ScanAsync(issue.IssueId, items[1].SerialCode, c.Staff);

        var r = await c.Issues.CancelOrderAsync(issue.OrderId, "Khách hủy đơn qua điện thoại", c.Manager);

        Assert.Equal(issue.Code, r.IssueCode);
        Assert.Equal([items[0].SerialCode, items[1].SerialCode], r.ReturnToShelf);
        Assert.Equal(IssueStatus.Cancelled, issue.Status);
        Assert.StartsWith("Đơn bị hủy", issue.HoldReason);
        Assert.Null(issue.PickerId);
        Assert.Equal(OrderStatus.Cancelled, issue.Order.Status);
        Assert.All(items, i => { Assert.Equal(ItemStatus.InStock, i.Status); Assert.Null(i.IssueDetailId); Assert.Null(i.PickedAt); });
        Assert.Contains(c.Db.Notifications, n => n.UserId == c.Staff && n.Title.StartsWith($"Phiếu xuất {issue.Code} đã hủy") && n.Message!.Contains(items[0].SerialCode));

        // Delivered: too late to cancel.
        var done = await c.Approved("DH-H-03", "MUO-01", 2);
        foreach (var i in c.ItemsOf(done)) await c.Issues.ScanAsync(done.IssueId, i.SerialCode, c.Staff);
        await c.Issues.DeliverAsync(done.IssueId, "Anh Bình", c.Staff);
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.CancelOrderAsync(done.OrderId, "Khách trả hàng", c.Manager));
    }

    [Fact]
    public async Task Staff_are_told_once_when_an_order_short_of_stock_can_be_issued_oldest_first()
    {
        await using var c = await Setup();
        const string sku = "MUO-03";
        // Demo orders already waiting for this product would take their share first: out of the way.
        foreach (var o in c.Db.Orders.Where(o => o.Status == OrderStatus.OnHold && o.Details.Any(d => d.Product.SKU == sku)).ToList())
            await c.Issues.CancelOrderAsync(o.OrderId, "Dọn đơn mẫu cho bài kiểm tra", c.Manager);
        var free = c.Db.StockItems.Count(i => i.ReceiptDetail.Product.SKU == sku && i.Status == ItemStatus.InStock && i.IssueDetailId == null
            && i.ReceiptDetail.Status == LotStatus.Normal && i.ReceiptDetail.Receipt.Status == ReceiptStatus.Approved);
        Assert.True(free > 10);
        var a = await c.Order("DH-H-04", (sku, free + 10));
        c.Clock.UtcNow = Now.AddMinutes(5);
        var b = await c.Order("DH-H-05", (sku, free + 10));
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.CreateAsync(a.OrderId, c.Staff));
        await Assert.ThrowsAsync<RuleException>(() => c.Issues.CreateAsync(b.OrderId, c.Staff));
        var staff = c.Db.Users.Count(u => u.Role == UserRole.Staff && u.IsActive);
        int Told(Order o) => c.Db.Notifications.Count(n => n.Title == $"Đơn {o.ExternalCode} đã đủ hàng");

        // 30 more: enough for the older order only (free + 30 − (free + 10) = 20 left, short of free + 10).
        await TestStock.AddLotsAsync(c.Db, c.Clock, sku);
        Assert.Equal(staff, Told(a));
        Assert.Equal(0, Told(b));

        // More deliveries until both fit: then the newer one is told too, and the older one is not told again.
        for (var stock = free + 30; stock < 2 * (free + 10); stock += 30)
        {
            Assert.Equal(0, Told(b));
            await TestStock.AddLotsAsync(c.Db, c.Clock, sku);
        }
        Assert.Equal(staff, Told(a));
        Assert.Equal(staff, Told(b));

        // Staff open the older order: the issue is made now.
        Assert.NotNull(a.ReadyNotifiedAt);
        await c.Issues.CreateAsync(a.OrderId, c.Staff);
        Assert.Equal(OrderStatus.InProgress, a.Status);
    }
}
