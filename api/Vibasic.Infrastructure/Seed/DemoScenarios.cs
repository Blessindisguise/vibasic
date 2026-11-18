using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Abnormal;
using Vibasic.Infrastructure.Decision;
using Vibasic.Infrastructure.Issuing;
using Vibasic.Infrastructure.Receiving;
using Vibasic.Infrastructure.Stocktaking;

namespace Vibasic.Infrastructure.Seed;

/// <summary>
/// Work in progress on top of the <see cref="DbSeeder"/> history, so every status can be shown in a demo: receipts being received,
/// pending, rejected and approved with quarantined/locked lots; issues waiting, half picked, fully picked, delivered and cancelled;
/// orders on hold; abnormal reports from receiving, issuing and stocktaking in every state; stocktake plans and counts in every state.
/// <para>
/// Everything goes through the real services (same rules as the app), on a clock that steps from just after the seeded history up to
/// "now". A step that fails is logged and skipped; the rest still runs. Called only right after a fresh seed (not by the tests).
/// </para>
/// </summary>
public static class DemoScenarios
{
    private sealed class StepClock(DateTime start) : IClock
    {
        public DateTime UtcNow { get; set; } = start;
    }

    public static async Task RunAsync(VibasicDbContext db, DateTime utcNow, Action<string>? log = null)
    {
        log ??= Console.WriteLine;
        db.ChangeTracker.Clear();

        // Start after the last event of the seeded history, so the new documents come after it.
        DateTime?[] seen =
        [
            await db.Orders.MaxAsync(o => (DateTime?)o.OrderDate),
            await db.Orders.MaxAsync(o => o.CancelledAt),
            await db.GoodsReceipts.MaxAsync(r => r.ApprovedAt),
            await db.GoodsIssues.MaxAsync(i => i.DeliveredAt),
            await db.ReplenishmentReports.MaxAsync(r => (DateTime?)r.CreatedAt),
        ];
        var latest = seen.Max() ?? utcNow.AddHours(-3);
        var end = utcNow.AddMinutes(-15);
        var start = latest.AddMinutes(2) < end.AddMinutes(-20) ? latest.AddMinutes(2) : end.AddMinutes(-20);
        var clock = new StepClock(start);
        var step = TimeSpan.FromTicks(Math.Max(TimeSpan.FromSeconds(30).Ticks, (end - start).Ticks / 60));
        void Tick() => clock.UtcNow += step;

        var codes = new CodeGenerator(db);
        var replenish = new ReplenishmentService(db, clock);
        var issues = new IssueService(db, codes, clock, replenish);
        var receipts = new ReceiptService(db, codes, clock, replenish);
        var abnormal = new AbnormalReportService(db, clock, replenish, issues);
        var stocktakes = new StocktakeService(db, codes, clock, issues, replenish);

        var users = await db.Users.AsNoTracking().ToDictionaryAsync(u => u.Username, u => u.UserId);
        int manager = users["quanly"], s1 = users["nhanvien1"], s2 = users["nhanvien2"];
        var products = await db.Products.AsNoTracking().ToDictionaryAsync(p => p.SKU, p => (p.ProductId, p.SupplierId));
        int Pid(string sku) => products[sku].ProductId;
        int Sup(string sku) => products[sku].SupplierId;
        var today = VnTime.Today(utcNow);
        var ok = 0;
        var failed = 0;

        async Task Step(string name, Func<Task> run)
        {
            Tick();
            try { await run(); ok++; }
            catch (Exception e)
            {
                failed++;
                var detail = e is ValidationException v ? " " + string.Join("; ", v.Errors.Select(x => $"{x.Key}: {x.Value}")) : "";
                log($"[demo seed] Bỏ qua \"{name}\": {e.Message}{detail}");
            }
            finally { db.ChangeTracker.Clear(); }
        }

        // ---------------- Helpers ----------------

        var yymm = VnTime.Yymm(utcNow);
        var orderSeq = (await db.Orders.Select(o => o.ExternalCode).ToListAsync())
            .Select(c => c.Length >= 4 && int.TryParse(c[^4..], out var n) ? n : 0).DefaultIfEmpty(0).Max();

        async Task<int> NewOrder(int customer, string? note, params (string Sku, int Qty)[] lines)
        {
            var c = DbSeeder.Customers[customer];
            var order = await issues.RecordOrderAsync(new OrderInput($"DH-{yymm}-{++orderSeq:D4}", c.Name, clock.UtcNow,
                lines.Select(l => new OrderLineInput(l.Sku, l.Qty)).ToList(), c.Phone, c.Address, note));
            clock.UtcNow += TimeSpan.FromMinutes(1);
            return order.OrderId;
        }

        async Task<int> NewIssue(int orderId, int user)
        {
            var issue = await issues.CreateAsync(orderId, user);
            clock.UtcNow += TimeSpan.FromMinutes(1);
            return issue.IssueId;
        }

        Task<List<string>> Unpicked(int issueId) => db.StockItems
            .Where(i => i.IssueDetail!.IssueId == issueId && i.PickedAt == null)
            .OrderBy(i => i.ReceiptDetailId).ThenBy(i => i.SerialCode).Select(i => i.SerialCode).ToListAsync();

        async Task Pick(int issueId, int user, int? count = null)
        {
            await issues.ClaimAsync(issueId, user);
            var serials = await Unpicked(issueId);
            foreach (var serial in serials.Take(count ?? serials.Count))
            {
                clock.UtcNow += TimeSpan.FromSeconds(15);
                await issues.ScanAsync(issueId, serial, user);
            }
        }

        async Task<int> ReportId(string code) => await db.AbnormalReports.Where(a => a.Code == code).Select(a => a.ReportId).SingleAsync();

        async Task<int> ReceiptReport(int receiptId) =>
            await db.AbnormalReports.Where(a => a.ReceiptDetail.ReceiptId == receiptId).Select(a => a.ReportId).FirstAsync();

        // A lot of the seeded history with the most stock, not reserved by any issue.
        async Task<int> LotOf(string sku)
        {
            var pid = Pid(sku);
            return await db.GoodsReceiptDetails
                .Where(d => d.ProductId == pid && d.Status == LotStatus.Normal && d.Receipt.Status == ReceiptStatus.Approved
                    && d.QuantityOnHand > 0 && d.Receipt.ReceiptDate < start && !d.Items.Any(i => i.Status == ItemStatus.Reserved))
                .OrderByDescending(d => d.QuantityOnHand).Select(d => d.ReceiptDetailId).FirstAsync();
        }

        Task<List<string>> InStock(int lotId) => db.StockItems
            .Where(i => i.ReceiptDetailId == lotId && i.Status == ItemStatus.InStock && i.IssueDetailId == null)
            .OrderBy(i => i.SerialCode).Select(i => i.SerialCode).ToListAsync();

        async Task<int> Shelf(int planId, int lotId) => (await stocktakes.SheetAsync(planId)).Single(l => l.ReceiptDetailId == lotId).ShelfQuantity;

        // ================= NHẬP KHO =================

        await Step("Phiếu nhập đang nhập kho", async () =>
        {
            await receipts.CreateAsync(new ReceiptInput(Sup("DUA-01"), "Hàng tre đợt giữa tháng, đang dán tem và xếp kệ.",
            [
                new(Pid("DUA-01"), 60, 0, null, null, null),
                new(Pid("DUA-02"), 40, 0, null, null, null),
            ], "TA-1125-0457"), s1);
        });

        await Step("Phiếu nhập chờ duyệt (có lô cách ly, lệch chứng từ)", async () =>
        {
            var r = await receipts.CreateAsync(new ReceiptInput(Sup("MUO-01"), "Giao theo báo cáo đề xuất bổ sung tuần trước.",
            [
                new(Pid("MUO-01"), 80, 6, null, null, "Cán muỗng bị nứt và cong vênh sau khi sấy."),
                new(Pid("MUO-03"), 50, 0, 55, "Thiếu 5 cái so với chứng từ, nhà cung cấp hẹn giao bù đợt sau.", null),
            ], "PT-HD-08812"), s2);
            Tick();
            await receipts.SubmitAsync(r.ReceiptId, s2);
        });

        await Step("Phiếu nhập bị từ chối", async () =>
        {
            var r = await receipts.CreateAsync(new ReceiptInput(Sup("THT-03"), null,
                [new(Pid("THT-03"), 30, 0, null, null, null)], "ML-2611-131"), s1);
            Tick();
            await receipts.SubmitAsync(r.ReceiptId, s1);
            Tick();
            await receipts.RejectAsync(r.ReceiptId, "Số lượng trên phiếu chưa khớp số kiện thực nhận, nhờ kiểm đếm lại rồi gửi duyệt.", manager);
        });

        await Step("Phiếu nhập đã duyệt, lô cách ly chờ xử lý biên bản", async () =>
        {
            var r = await receipts.CreateAsync(new ReceiptInput(Sup("THT-01"), "Hàng về sớm hơn lịch 1 ngày.",
            [
                new(Pid("THT-01"), 40, 5, null, null, "Mặt dưới thớt có đốm mốc, nghi bị ẩm khi vận chuyển."),
                new(Pid("DUA-03"), 30, 0, null, null, null),
            ], "ML-2611-138"), s2);
            Tick();
            await receipts.SubmitAsync(r.ReceiptId, s2);
            Tick();
            await receipts.ApproveAsync(r.ReceiptId, manager);
        });

        await Step("Phiếu nhập đã duyệt, biên bản lô cách ly bị từ chối", async () =>
        {
            var r = await receipts.CreateAsync(new ReceiptInput(Sup("KHA-02"), null,
                [new(Pid("KHA-02"), 30, 3, null, null, "Nghi trầy xước mặt ngoài ống cắm đũa.")], "TA-1125-0462"), s1);
            Tick();
            await receipts.SubmitAsync(r.ReceiptId, s1);
            Tick();
            await receipts.ApproveAsync(r.ReceiptId, manager);
            Tick();
            await abnormal.RejectAsync(await ReceiptReport(r.ReceiptId), "Kiểm tra lại: chỉ trầy lớp màng bọc ngoài, sản phẩm vẫn đạt.", manager);
        });

        await Step("Phiếu nhập đã duyệt, lô không đạt bị khóa", async () =>
        {
            var r = await receipts.CreateAsync(new ReceiptInput(Sup("KHA-03"), null,
                [new(Pid("KHA-03"), 20, 2, null, null, "Ngăn hộp bị bung keo, không sử dụng được.")], "PT-HD-08830"), s2);
            Tick();
            await receipts.SubmitAsync(r.ReceiptId, s2);
            Tick();
            await receipts.ApproveAsync(r.ReceiptId, manager);
            Tick();
            await abnormal.ApproveAsync(await ReceiptReport(r.ReceiptId), manager);
        });

        // ================= KIỂM KÊ =================
        // On products the issues below do not touch, so the counts stay as entered.

        await Step("Kế hoạch kiểm kê định kỳ chờ thực hiện", async () =>
        {
            await stocktakes.CreatePlanAsync(new PlanInput(StocktakePlanType.Periodic, StocktakeScope.Warehouse, today.AddDays(5), null,
                "Kiểm kê định kỳ cuối tháng toàn bộ kho."), manager);
        });

        await Step("Phiếu kiểm kê chờ duyệt (có chênh lệch dư)", async () =>
        {
            int a = await LotOf("DUA-02"), b = await LotOf("KHA-03");
            var plan = await stocktakes.CreatePlanAsync(new PlanInput(StocktakePlanType.AdHoc, StocktakeScope.SelectedLots, today, [a, b],
                "Kiểm tra đột xuất sau khi sắp xếp lại kệ B."), manager);
            Tick();
            await stocktakes.SubmitAsync(plan.PlanId, new StocktakeInput(
            [
                new(a, await Shelf(plan.PlanId, a), null),
                new(b, await Shelf(plan.PlanId, b) + 1, "Dư 1 hộp, nghi lần xuất trước quét thiếu."),
            ]), s1);
        });

        await Step("Phiếu kiểm kê đã duyệt (thất thoát, quét tem)", async () =>
        {
            int a = await LotOf("DUA-01"), b = await LotOf("MUO-01");
            var plan = await stocktakes.CreatePlanAsync(new PlanInput(StocktakePlanType.AdHoc, StocktakeScope.SelectedLots, today, [a, b],
                "Kiểm kê các mặt hàng bán chạy."), manager);
            Tick();
            var scanned = await InStock(b);
            await stocktakes.SubmitAsync(plan.PlanId, new StocktakeInput(
            [
                new(a, await Shelf(plan.PlanId, a) - 2, "Thiếu 2 hộp, nghi rơi vỡ khi sắp xếp kệ."),
                new(b, null, "Không tìm thấy 1 muỗng trên kệ.", Serials: scanned.Skip(1).ToList(), Unlabeled: 0),
            ]), s2);
            Tick();
            await stocktakes.ApproveAsync((await db.Stocktakes.SingleAsync(s => s.PlanId == plan.PlanId)).StocktakeId, manager);
        });

        await Step("Phiếu kiểm kê bị từ chối", async () =>
        {
            var a = await LotOf("THT-01");
            var plan = await stocktakes.CreatePlanAsync(new PlanInput(StocktakePlanType.AdHoc, StocktakeScope.SelectedLots, today, [a],
                "Kiểm lại thớt me tây sau đợt nhập mới."), manager);
            Tick();
            var st = await stocktakes.SubmitAsync(plan.PlanId, new StocktakeInput(
                [new(a, await Shelf(plan.PlanId, a) - 3, "Thiếu 3 cái so với hệ thống.")]), s1);
            Tick();
            await stocktakes.RejectAsync(st.StocktakeId, "Số lệch lớn, đếm lại cả khu kệ A trước khi gửi duyệt.", manager);
        });

        await Step("Kiểm kê phát hiện hàng lỗi (biên bản chờ duyệt)", async () =>
        {
            var a = await LotOf("THT-03");
            var plan = await stocktakes.CreatePlanAsync(new PlanInput(StocktakePlanType.AdHoc, StocktakeScope.SelectedLots, today, [a],
                "Kiểm tra thớt teak theo phản ánh của khách."), manager);
            Tick();
            await stocktakes.FileDefectAsync(plan.PlanId, new StockDefectInput(a, (await InStock(a)).Take(2).ToList(),
                "Thớt bị nứt chân rãnh, phát hiện khi kiểm kê."), s2);
        });

        // ================= XUẤT KHO =================

        await Step("Phiếu xuất chờ lấy hàng", async () =>
        {
            var o = await NewOrder(1, "Giao trước 10 giờ sáng mai.", ("THT-02", 5), ("MUO-03", 6));
            await NewIssue(o, s1);
        });

        await Step("Phiếu xuất đang lấy hàng (quét một phần)", async () =>
        {
            var o = await NewOrder(3, null, ("DUA-03", 8), ("MUO-02", 4));
            var i = await NewIssue(o, s2);
            await Pick(i, s2, 5);
        });

        await Step("Phiếu xuất đã quét đủ, chờ giao", async () =>
        {
            var o = await NewOrder(0, "Giao ở cổng nhận hàng phía sau.", ("THT-02", 3));
            var i = await NewIssue(o, s1);
            await Pick(i, s1);
        });

        await Step("Phiếu xuất có sản phẩm lỗi (biên bản chờ duyệt)", async () =>
        {
            var o = await NewOrder(4, null, ("MUO-03", 5));
            var i = await NewIssue(o, s1);
            await Pick(i, s1, 2);
            var bad = (await Unpicked(i)).First();
            await issues.ReportDefectAsync(i, [bad], "Muỗng bị nứt dọc cán, không giao cho khách được.", s1);
        });

        await Step("Biên bản lỗi khi xuất đã duyệt", async () =>
        {
            var o = await NewOrder(5, null, ("MUO-02", 3));
            var i = await NewIssue(o, s2);
            await issues.ClaimAsync(i, s2);
            var r = await issues.ReportDefectAsync(i, [(await Unpicked(i)).First()], "Vá bị sứt mép, có dằm gỗ.", s2);
            Tick();
            await abnormal.ApproveAsync(await ReportId(r.ReportCodes[0]), manager);
        });

        await Step("Biên bản lỗi khi xuất bị từ chối", async () =>
        {
            var o = await NewOrder(2, null, ("DUA-03", 4));
            var i = await NewIssue(o, s1);
            await issues.ClaimAsync(i, s1);
            var r = await issues.ReportDefectAsync(i, [(await Unpicked(i)).First()], "Đũa có vết đen trên thân.", s1);
            Tick();
            await abnormal.RejectAsync(await ReportId(r.ReportCodes[0]), "Kiểm tra lại: vết đen là bụi gỗ, lau sạch được, sản phẩm đạt.", manager);
        });

        await Step("Lỗi nghi cả lô: lô tạm cách ly", async () =>
        {
            var o = await NewOrder(1, null, ("KHA-01", 3));
            var i = await NewIssue(o, s2);
            await issues.ClaimAsync(i, s2);
            await issues.ReportDefectAsync(i, [(await Unpicked(i)).First()], "Khay có lỗ mọt, nghi cả lô bị mọt.", s2, wholeLot: true);
        });

        await Step("Đơn bị hủy khi đang lấy hàng", async () =>
        {
            var o = await NewOrder(3, null, ("THT-02", 2));
            var i = await NewIssue(o, s2);
            await Pick(i, s2, 1);
            Tick();
            await issues.CancelOrderAsync(o, "Khách gọi hủy đơn do dời ngày khai trương.", manager);
        });

        await Step("Đơn chờ xử lý vì không đủ hàng", async () =>
        {
            var o = await NewOrder(5, "Đơn sỉ lớn cho đợt khuyến mãi tháng 12.", ("THT-04", 300), ("DUA-02", 5));
            try { await issues.CreateAsync(o, s1); }
            catch (RuleException) { /* expected: the order goes "Chờ xử lý" */ }
        });

        await Step("Phiếu xuất đã giao hôm nay", async () =>
        {
            var o = await NewOrder(2, null, ("MUO-03", 4), ("THT-02", 2));
            var i = await NewIssue(o, s1);
            await Pick(i, s1);
            Tick();
            await issues.DeliverAsync(i, "Anh Trần Minh Quân (tài xế)", s1);
        });

        log($"[demo seed] Tình huống demo: {ok} bước xong, {failed} bước bỏ qua.");
    }
}
