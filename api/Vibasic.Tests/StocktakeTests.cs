using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Decision;
using Vibasic.Infrastructure.Issuing;
using Vibasic.Infrastructure.Seed;
using Vibasic.Infrastructure.Stocktaking;

namespace Vibasic.Tests;

public class StocktakeTests
{
    private sealed class FixedClock(DateTime utc) : IClock { public DateTime UtcNow => utc; }
    private static readonly DateTime Now = new(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly Today = new(2026, 11, 4);

    private sealed class Ctx : IAsyncDisposable
    {
        public required VibasicDbContext Db { get; init; }
        public required StocktakeService Stocktakes { get; init; }
        public required IssueService Issues { get; init; }
        public required int Staff { get; init; }
        public required int Manager { get; init; }
        public ValueTask DisposeAsync() => Db.DisposeAsync();

        /// <summary>Oldest lot of a SKU that still holds stock.</summary>
        public GoodsReceiptDetail Lot(string sku) => Db.GoodsReceiptDetails.Include(d => d.Items)
            .Where(d => d.Product.SKU == sku && d.QuantityOnHand > 0 && d.Status == LotStatus.Normal)
            .OrderBy(d => d.Receipt.ReceiptDate).First();

        public Task<StocktakePlan> Plan(params GoodsReceiptDetail[] lots) => Stocktakes.CreatePlanAsync(
            new PlanInput(StocktakePlanType.AdHoc, StocktakeScope.SelectedLots, Today, lots.Select(l => l.ReceiptDetailId).ToList(), null), Manager);

        public static StocktakeInput Counts(params (GoodsReceiptDetail lot, int actual, string? reason)[] c) =>
            new(c.Select(x => new CountInput(x.lot.ReceiptDetailId, x.actual, x.reason)).ToList());
    }

    private static async Task<Ctx> Setup()
    {
        var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        await DbSeeder.SeedAsync(db, Now.AddDays(-1));
        var clock = new FixedClock(Now);
        var notifier = new Notifier(db, clock);
        var codes = new CodeGenerator(db);
        var replenish = new ReplenishmentService(db, notifier, clock);
        var issues = new IssueService(db, codes, notifier, clock, replenish);
        await TestStock.AddLotsAsync(db, clock, TestStock.MultiLot);
        return new Ctx
        {
            Db = db, Issues = issues, Stocktakes = new StocktakeService(db, codes, notifier, clock, issues, replenish),
            Staff = db.Users.First(u => u.Username == "nhanvien1").UserId,
            Manager = db.Users.First(u => u.Username == "quanly").UserId,
        };
    }

    private static void AssertConsistent(GoodsReceiptDetail lot) =>
        Assert.Equal(lot.QuantityOnHand, lot.Items.Count(i => i.Status is ItemStatus.InStock or ItemStatus.Reserved));

    [Fact]
    public async Task Plan_rules_follow_UC_13()
    {
        await using var c = await Setup();
        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Stocktakes.CreatePlanAsync(
            new PlanInput(StocktakePlanType.Periodic, StocktakeScope.SelectedLots, Today.AddDays(-1), [], null), c.Manager));
        Assert.True(e.Errors.ContainsKey("plannedDate"));
        Assert.True(e.Errors.ContainsKey("lotIds"));

        var whole = await c.Stocktakes.CreatePlanAsync(new PlanInput(StocktakePlanType.Periodic, StocktakeScope.Warehouse, Today, null, "Cuối tháng"), c.Manager);
        Assert.StartsWith("KH-2611-", whole.Code);
        Assert.Equal(StocktakePlanStatus.Waiting, whole.Status);
        var sheet = await c.Stocktakes.SheetAsync(whole.PlanId);
        Assert.Equal(await c.Stocktakes.CountableLots().CountAsync(), sheet.Count);
        Assert.Contains(sheet, s => s.Status == LotStatus.Locked); // locked lots are physically there and are counted too
        Assert.Contains(c.Db.Notifications, n => n.Title.Contains(whole.Code));
    }

    [Fact]
    public async Task Plan_can_be_edited_only_while_waiting_to_be_counted()
    {
        await using var c = await Setup();
        var a = c.Lot("THT-02");
        var b = c.Lot("MUO-01");
        var plan = await c.Plan(a);
        var input = (DateOnly date, params GoodsReceiptDetail[] lots) =>
            new PlanInput(StocktakePlanType.AdHoc, StocktakeScope.SelectedLots, date, lots.Select(l => l.ReceiptDetailId).ToList(), "Kiểm kệ A");

        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Stocktakes.UpdatePlanAsync(plan.PlanId, input(Today.AddDays(-1), a, b), c.Manager));
        Assert.True(e.Errors.ContainsKey("plannedDate"));
        await c.Stocktakes.UpdatePlanAsync(plan.PlanId, input(Today.AddDays(2), a, b), c.Manager);
        Assert.Equal(Today.AddDays(2), plan.PlannedDate);
        Assert.Equal("Kiểm kệ A", plan.Note);
        Assert.Equal(2, (await c.Stocktakes.SheetAsync(plan.PlanId)).Count);
        Assert.Contains(c.Db.Notifications, n => n.Title == $"Kế hoạch kiểm kê {plan.Code} đã thay đổi");

        // Dropping a lot and switching to the whole warehouse both update the sheet.
        await c.Stocktakes.UpdatePlanAsync(plan.PlanId, input(Today.AddDays(2), b), c.Manager);
        Assert.Equal([b.ReceiptDetailId], (await c.Stocktakes.SheetAsync(plan.PlanId)).Select(l => l.ReceiptDetailId));
        await c.Stocktakes.UpdatePlanAsync(plan.PlanId,
            new PlanInput(StocktakePlanType.Periodic, StocktakeScope.Warehouse, Today.AddDays(2), [b.ReceiptDetailId], null), c.Manager);
        Assert.Empty(c.Db.StocktakePlanDetails.Where(d => d.PlanId == plan.PlanId));
        Assert.Equal(await c.Stocktakes.CountableLots().CountAsync(), (await c.Stocktakes.SheetAsync(plan.PlanId)).Count);

        // Counted and waiting for approval: locked. Rejected: editable again.
        await c.Stocktakes.UpdatePlanAsync(plan.PlanId, input(Today.AddDays(2), b), c.Manager);
        var s = await c.Stocktakes.SubmitAsync(plan.PlanId, Ctx.Counts((b, b.QuantityOnHand, null)), c.Staff);
        await Assert.ThrowsAsync<RuleException>(() => c.Stocktakes.UpdatePlanAsync(plan.PlanId, input(Today.AddDays(3), b), c.Manager));
        await c.Stocktakes.RejectAsync(s.StocktakeId, "Đếm lại kệ B", c.Manager);
        await c.Stocktakes.UpdatePlanAsync(plan.PlanId, input(Today.AddDays(3), a, b), c.Manager);
        Assert.Equal(2, (await c.Stocktakes.SheetAsync(plan.PlanId)).Count);
    }

    [Fact]
    public async Task Count_needs_every_lot_and_a_reason_for_each_difference()
    {
        await using var c = await Setup();
        var a = c.Lot("THT-02");
        var b = c.Lot("MUO-01");
        var plan = await c.Plan(a, b);

        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Stocktakes.SubmitAsync(plan.PlanId, Ctx.Counts((a, a.QuantityOnHand - 1, null)), c.Staff));
        Assert.True(e.Errors.ContainsKey($"counts[{a.ReceiptDetailId}].reason"));
        Assert.True(e.Errors.ContainsKey($"counts[{b.ReceiptDetailId}].actualQuantity"));

        var s = await c.Stocktakes.SubmitAsync(plan.PlanId, Ctx.Counts((a, a.QuantityOnHand - 1, "Mất 1 cái khi chuyển kệ"), (b, b.QuantityOnHand, null)), c.Staff);
        Assert.Equal(ApprovalStatus.Pending, s.Status);
        Assert.Equal(StocktakePlanStatus.InProgress, plan.Status);
        Assert.Null(s.Details.Single(d => d.ReceiptDetailId == b.ReceiptDetailId).Reason);
        await Assert.ThrowsAsync<RuleException>(() => c.Stocktakes.SubmitAsync(plan.PlanId, Ctx.Counts((a, 0, "abcde"), (b, 0, "abcde")), c.Staff));

        // UC_15 4.1: rejected → stock unchanged, plan open again for a recount.
        var before = a.QuantityOnHand;
        await c.Stocktakes.RejectAsync(s.StocktakeId, "Đếm lại kệ B, nghi nhầm lô", c.Manager);
        Assert.Equal(StocktakePlanStatus.Waiting, plan.Status);
        Assert.Equal(before, a.QuantityOnHand);
        var again = await c.Stocktakes.SubmitAsync(plan.PlanId, Ctx.Counts((a, a.QuantityOnHand, null), (b, b.QuantityOnHand, null)), c.Staff);
        Assert.NotEqual(s.Code, again.Code);
    }

    [Fact]
    public async Task Approval_marks_missing_items_lost_and_codes_surplus_items()
    {
        await using var c = await Setup();
        var shortLot = c.Lot("DUA-03");
        var overLot = c.Lot("KHA-02");
        var (s0, o0) = (shortLot.QuantityOnHand, overLot.QuantityOnHand);
        var plan = await c.Plan(shortLot, overLot);
        var s = await c.Stocktakes.SubmitAsync(plan.PlanId,
            Ctx.Counts((shortLot, s0 - 3, "Thiếu 3 đôi, nghi rơi khi bốc hàng"), (overLot, o0 + 2, "Dư 2 cái chưa dán tem")), c.Staff);

        await c.Stocktakes.ApproveAsync(s.StocktakeId, c.Manager);

        Assert.Equal(ApprovalStatus.Approved, s.Status);
        Assert.Equal(StocktakePlanStatus.Done, plan.Status);
        Assert.Equal(s0 - 3, shortLot.QuantityOnHand);
        Assert.Equal(3, shortLot.Items.Count(i => i.Status == ItemStatus.Lost));
        Assert.Equal(o0 + 2, overLot.QuantityOnHand);
        var fresh = overLot.Items.Where(i => i.SerialCode.Contains("-2611-")).ToList();
        Assert.Equal(2, fresh.Count);
        Assert.All(fresh, i => Assert.StartsWith("SP-KHA02-2611-", i.SerialCode));
        AssertConsistent(shortLot);
        AssertConsistent(overLot);
    }

    [Fact]
    public async Task Missing_reserved_items_are_replaced_on_their_issue()
    {
        await using var c = await Setup();
        var lot = c.Lot("MUO-03");
        var all = lot.Items.Count(i => i.Status == ItemStatus.InStock);
        var order = await c.Issues.RecordOrderAsync(new OrderInput("DH-KK-01", null, null, [new("MUO-03", all)]));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff); // reserves the whole lot
        Assert.All(lot.Items.Where(i => i.Status != ItemStatus.Issued), i => Assert.Equal(ItemStatus.Reserved, i.Status));

        var plan = await c.Plan(lot);
        var s = await c.Stocktakes.SubmitAsync(plan.PlanId, Ctx.Counts((lot, lot.QuantityOnHand - 2, "Hai cái bị chuột cắn, đã bỏ")), c.Staff);
        await c.Stocktakes.ApproveAsync(s.StocktakeId, c.Manager);

        Assert.Equal(2, lot.Items.Count(i => i.Status == ItemStatus.Lost));
        var onIssue = await c.Db.StockItems.Where(i => i.IssueDetail!.IssueId == issue.IssueId).ToListAsync();
        Assert.Equal(all, onIssue.Count);
        Assert.Equal(2, onIssue.Count(i => i.ReceiptDetailId != lot.ReceiptDetailId));
        Assert.Equal(IssueStatus.Pending, issue.Status);
        AssertConsistent(lot);
    }

    [Fact]
    public async Task Defect_found_while_counting_sets_aside_the_scanned_items()
    {
        await using var c = await Setup();
        var lot = c.Lot("THT-03");
        var onHand = lot.QuantityOnHand;
        var plan = await c.Plan(lot);
        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Stocktakes.FileDefectAsync(plan.PlanId, new StockDefectInput(lot.ReceiptDetailId, [], "x"), c.Staff));
        Assert.True(e.Errors.ContainsKey("serials"));
        Assert.True(e.Errors.ContainsKey("description"));
        var other = c.Lot("THT-02").Items.First(i => i.Status == ItemStatus.InStock).SerialCode;
        e = await Assert.ThrowsAsync<ValidationException>(() => c.Stocktakes.FileDefectAsync(plan.PlanId, new StockDefectInput(lot.ReceiptDetailId, [other], "Thớt bị mốc"), c.Staff));
        Assert.Contains("Không thuộc lô", e.Errors["serials"]);

        // The lot was counted by scanning a little earlier; the defects are found right after.
        var countedAt = Now.AddMinutes(-10);
        var shelf = lot.Items.Where(i => i.Status == ItemStatus.InStock).OrderBy(i => i.SerialCode).ToList();
        var bad = shelf.Take(2).ToList();
        var report = await c.Stocktakes.FileDefectAsync(plan.PlanId,
            new StockDefectInput(lot.ReceiptDetailId, bad.Select(i => i.SerialCode.ToLowerInvariant()).ToList(), "Thớt bị mốc mặt dưới"), c.Staff);
        Assert.Equal(AbnormalSource.Stocktake, report.SourceType);
        Assert.Equal(ReportScope.Items, report.Scope);
        Assert.Equal(2, report.Quantity);
        Assert.Equal(LotStatus.Normal, lot.Status);
        Assert.All(bad, i => Assert.Equal(ItemStatus.Defective, i.Status));
        Assert.Equal(onHand - 2, lot.QuantityOnHand);
        e = await Assert.ThrowsAsync<ValidationException>(() => c.Stocktakes.FileDefectAsync(plan.PlanId, new StockDefectInput(lot.ReceiptDetailId, [bad[0].SerialCode], "Thêm một lỗi nữa"), c.Staff));
        Assert.Contains("đã có biên bản", e.Errors["serials"]);
        // Another item may get its own report.
        await c.Stocktakes.FileDefectAsync(plan.PlanId, new StockDefectInput(lot.ReceiptDetailId, [shelf[2].SerialCode], "Nứt cạnh thớt"), c.Staff);

        // Counting continues: the set-aside items were still on the shelf when the lot was counted, so the count matches.
        var counted = lot.Items.Where(i => i.Status is ItemStatus.InStock or ItemStatus.Reserved or ItemStatus.Defective).Select(i => i.SerialCode).ToList();
        var s = await c.Stocktakes.SubmitAsync(plan.PlanId, new StocktakeInput([new CountInput(lot.ReceiptDetailId, null, null, countedAt, counted)]), c.Staff);
        Assert.Equal(ApprovalStatus.Pending, s.Status);
        var d = s.Details.Single();
        Assert.Equal(d.SystemQuantity, d.ActualQuantity);
        await c.Stocktakes.ApproveAsync(s.StocktakeId, c.Manager);
        Assert.DoesNotContain(lot.Items, i => i.Status == ItemStatus.Lost);
        Assert.Equal(onHand - 3, lot.QuantityOnHand);
    }

    [Fact]
    public async Task Defect_on_the_whole_lot_quarantines_it_and_blocks_more_reports()
    {
        await using var c = await Setup();
        var lot = c.Lot("THT-03");
        var plan = await c.Plan(lot);
        var items = lot.Items.Where(i => i.Status == ItemStatus.InStock).OrderBy(i => i.SerialCode).ToList();
        await c.Stocktakes.FileDefectAsync(plan.PlanId, new StockDefectInput(lot.ReceiptDetailId, [items[0].SerialCode], "Mốc lan cả kiện", WholeLot: true), c.Staff);
        Assert.Equal(LotStatus.Quarantined, lot.Status);
        await Assert.ThrowsAsync<RuleException>(() => c.Stocktakes.FileDefectAsync(plan.PlanId, new StockDefectInput(lot.ReceiptDetailId, [items[1].SerialCode], "Thêm một lỗi nữa"), c.Staff));
        // Typed count after the defect: the set-aside item is not on the shelf any more.
        var s = await c.Stocktakes.SubmitAsync(plan.PlanId, Ctx.Counts((lot, lot.QuantityOnHand, null)), c.Staff);
        Assert.Equal(ApprovalStatus.Pending, s.Status);
        Assert.Equal(0, s.Details.Single().ActualQuantity - s.Details.Single().SystemQuantity);
    }
    // ---------------- K1 / K2 / K4 ----------------

    /// <summary>Order <paramref name="qty"/> of the lot's product, approve, and scan every item (PickedAt = Now).</summary>
    private static async Task<GoodsIssue> PickFrom(Ctx c, GoodsReceiptDetail lot, string sku, int qty, string code)
    {
        var order = await c.Issues.RecordOrderAsync(new OrderInput(code, null, null, [new(sku, qty)]));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        await c.Issues.ApproveAsync(issue.IssueId, c.Manager);
        var items = await c.Db.StockItems.Where(i => i.IssueDetail!.IssueId == issue.IssueId).ToListAsync();
        Assert.All(items, i => Assert.Equal(lot.ReceiptDetailId, i.ReceiptDetailId)); // oldest lot first (FIFO)
        foreach (var i in items) await c.Issues.ScanAsync(issue.IssueId, i.SerialCode, c.Staff);
        return issue;
    }

    [Fact]
    public async Task System_quantity_is_the_shelf_at_counting_time_not_at_submission()
    {
        await using var c = await Setup();
        var lot = c.Lot("DUA-02");
        var counted = lot.Items.Count(i => StocktakeService.OnShelfAt(i, Now.AddHours(-1)));
        var plan = await c.Plan(lot);

        // Counted an hour ago; since then 4 items were picked and delivered from the lot.
        var issue = await PickFrom(c, lot, "DUA-02", 4, "DH-K1-01");
        await c.Issues.DeliverAsync(issue.IssueId, "Anh Bình", c.Staff);
        Assert.Equal(counted - 4, lot.QuantityOnHand);

        var s = await c.Stocktakes.SubmitAsync(plan.PlanId,
            new StocktakeInput([new CountInput(lot.ReceiptDetailId, counted, null, Now.AddHours(-1))]), c.Staff);
        var d = Assert.Single(s.Details);
        Assert.Equal(counted, d.SystemQuantity); // before K1: QOH at submission, a false surplus of 4
        Assert.Equal(d.SystemQuantity, d.ActualQuantity);
        await c.Stocktakes.ApproveAsync(s.StocktakeId, c.Manager);
        Assert.Equal(counted - 4, lot.QuantityOnHand);
        AssertConsistent(lot);
    }

    [Fact]
    public async Task Items_scanned_for_an_issue_are_off_the_shelf_and_never_written_off()
    {
        await using var c = await Setup();
        var lot = c.Lot("DUA-02");
        var issue = await PickFrom(c, lot, "DUA-02", 3, "DH-K2-01"); // in the staging area, not delivered
        var plan = await c.Plan(lot);
        var sheet = Assert.Single(await c.Stocktakes.SheetAsync(plan.PlanId));
        Assert.Equal(3, sheet.Picking);
        Assert.Equal(lot.QuantityOnHand - 3, sheet.ShelfQuantity);

        // The counter finds one fewer than the shelf should hold.
        var s = await c.Stocktakes.SubmitAsync(plan.PlanId, Ctx.Counts((lot, sheet.ShelfQuantity - 1, "Thiếu một hộp trên kệ")), c.Staff);
        Assert.Equal(sheet.ShelfQuantity, s.Details[0].SystemQuantity);
        await c.Stocktakes.ApproveAsync(s.StocktakeId, c.Manager);

        Assert.Equal(1, lot.Items.Count(i => i.Status == ItemStatus.Lost));
        var picked = await c.Db.StockItems.Where(i => i.IssueDetail!.IssueId == issue.IssueId).ToListAsync();
        Assert.Equal(3, picked.Count);
        Assert.All(picked, i => Assert.True(i.Status == ItemStatus.Reserved && i.PickedAt != null));
        AssertConsistent(lot);
    }

    [Fact]
    public async Task Scanned_count_writes_off_exactly_the_missing_items()
    {
        await using var c = await Setup();
        var lot = c.Lot("KHA-02");
        var shelf = lot.Items.Where(i => i.Status == ItemStatus.InStock).OrderBy(i => i.SerialCode).ToList();
        var missing = shelf.Skip(3).Take(2).ToList();          // two labels not found
        var lostBefore = shelf[0];                              // written off earlier, found again now
        lostBefore.Status = ItemStatus.Lost;
        lot.QuantityOnHand -= 1;
        await c.Db.SaveChangesAsync();
        var q0 = lot.QuantityOnHand;
        var plan = await c.Plan(lot);
        var serials = shelf.Except(missing).Select(i => i.SerialCode.ToLower()).ToList(); // includes the lost one

        var bad = await Assert.ThrowsAsync<ValidationException>(() => c.Stocktakes.SubmitAsync(plan.PlanId,
            new StocktakeInput([new CountInput(lot.ReceiptDetailId, null, "Quét lại", null, [.. serials, "SP-XXX-0000-0001"], 0)]), c.Staff));
        Assert.Contains("SP-XXX-0000-0001", bad.Errors[$"counts[{lot.ReceiptDetailId}].serials"]);

        var s = await c.Stocktakes.SubmitAsync(plan.PlanId,
            new StocktakeInput([new CountInput(lot.ReceiptDetailId, null, "Thiếu 2 tem, 1 cái mất tem", null, serials, 1)]), c.Staff);
        var d = Assert.Single(s.Details);
        Assert.Equal(CountMethod.Scan, d.Method);
        Assert.Equal(serials.Count + 1, d.ActualQuantity);
        Assert.Equal(q0, d.SystemQuantity);

        await c.Stocktakes.ApproveAsync(s.StocktakeId, c.Manager);
        Assert.Equal(missing.Select(i => i.ItemId).Order(), lot.Items.Where(i => i.Status == ItemStatus.Lost).Select(i => i.ItemId).Order());
        Assert.Equal(ItemStatus.InStock, lostBefore.Status);
        Assert.Single(lot.Items, i => i.SerialCode.Contains("-2611-"));
        Assert.Equal(q0 - 2 + 1 + 1, lot.QuantityOnHand);
        AssertConsistent(lot);
    }

    [Fact]
    public async Task A_lot_waiting_in_one_stocktake_cannot_be_submitted_in_another()
    {
        await using var c = await Setup();
        var lot = c.Lot("THT-03");
        var p1 = await c.Plan(lot);
        var p2 = await c.Plan(lot);
        await c.Stocktakes.SubmitAsync(p1.PlanId, Ctx.Counts((lot, lot.QuantityOnHand, null)), c.Staff);
        var e = await Assert.ThrowsAsync<RuleException>(() => c.Stocktakes.SubmitAsync(p2.PlanId, Ctx.Counts((lot, lot.QuantityOnHand, null)), c.Staff));
        Assert.Contains(lot.LotCode, e.Message);
    }
}
