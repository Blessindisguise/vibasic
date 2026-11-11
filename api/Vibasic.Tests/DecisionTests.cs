using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Vibasic.Api.Controllers;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Catalog;
using Vibasic.Infrastructure.Decision;
using Vibasic.Infrastructure.Issuing;
using Vibasic.Infrastructure.Receiving;
using Vibasic.Infrastructure.Seed;

namespace Vibasic.Tests;

/// <summary>UC_17, UC_18 under "Quy tắc đề xuất bổ sung hàng hóa" (Q1–Q20), on the seeded warehouse.</summary>
public class DecisionTests
{
    private sealed class Clock(DateTime utc) : IClock { public DateTime UtcNow { get; set; } = utc; }
    private static readonly DateTime Now = new(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc); // Wednesday 10:00 in Vietnam

    private sealed class Ctx : IAsyncDisposable
    {
        public required VibasicDbContext Db { get; init; }
        public required Clock Clock { get; init; }
        public required ReplenishmentService Replenish { get; init; }
        public required ReceiptService Receipts { get; init; }
        public required IssueService Issues { get; init; }
        public required int Staff { get; init; }
        public required int Manager { get; init; }
        public ValueTask DisposeAsync() => Db.DisposeAsync();
        public Product P(string sku) => Db.Products.Include(p => p.Policy).Single(p => p.SKU == sku);
        public StockAlert? OpenAlert(string sku) => Db.StockAlerts.SingleOrDefault(a => a.Product.SKU == sku && a.Status == AlertStatus.Open);
        public List<ReplenishmentProposal> Proposals(string sku) => Db.ReplenishmentProposals.Where(r => r.Product.SKU == sku).ToList();
        public ReplenishmentProposal? Pending(string sku) => Proposals(sku).SingleOrDefault(r => r.Status == ProposalStatus.Pending);
        public async Task<int> Net(string sku) { var (a, o) = (await Replenish.StockAsync([P(sku).ProductId])).Single().Value; return a - o; }
        public DecisionController Controller()
        {
            var json = new JsonOptions();
            json.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
            return new(Db, Replenish, Clock, Options.Create(json))
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", Manager.ToString())])) },
                },
            };
        }
        public async Task<ReplenishmentReport> Report(params int[] ids)
        {
            var id = (await Controller().CreateReport(new DecisionController.IdsInput(ids.ToList()))).Id;
            return await Db.ReplenishmentReports.SingleAsync(r => r.ReportId == id);
        }
        /// <summary>Q10: a report within L + 3 days or a rejection this week stops a new proposal.</summary>
        public bool Blocked(Product p) => Proposals(p.SKU).Any(x =>
            (x.Status == ProposalStatus.Reported && Clock.UtcNow < ReplenishmentRules.ReproposeFrom(x.ApprovedAt!.Value, p.Policy!.LeadTimeDays))
            || (x.Status == ProposalStatus.Rejected && x.ApprovedAt >= ReplenishmentRules.WeekStart(Clock.UtcNow)));
    }

    private static async Task<Ctx> Setup()
    {
        var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        await DbSeeder.SeedAsync(db, Now);
        var clock = new Clock(Now);
        var notifier = new Notifier(db, clock);
        var replenish = new ReplenishmentService(db, notifier, clock);
        var codes = new CodeGenerator(db);
        return new Ctx
        {
            Db = db, Clock = clock, Replenish = replenish,
            Receipts = new ReceiptService(db, codes, notifier, clock, replenish),
            Issues = new IssueService(db, codes, notifier, clock, replenish),
            Staff = db.Users.First(u => u.Username == "nhanvien1").UserId,
            Manager = db.Users.First(u => u.Username == "quanly").UserId,
        };
    }

    [Fact]
    public async Task Weekly_calculation_follows_Q1_to_Q5()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var p = c.P("THT-01");

        // Q1: ordered quantity by order date, every order but a cancelled one, over the 28 Vietnamese days before today.
        var today = VnTime.Today(Now);
        var lines = await c.Db.OrderDetails.Where(d => d.ProductId == p.ProductId && d.Order.Status != OrderStatus.Cancelled)
            .Select(d => new { d.Order.OrderDate, d.Quantity }).ToListAsync();
        var daily = Enumerable.Range(0, 28).Select(i => lines.Where(l => VnTime.Today(l.OrderDate) == today.AddDays(i - 28)).Sum(l => l.Quantity)).ToArray();
        var mean = daily.Average();
        var sigma = Math.Round((decimal)Math.Sqrt(daily.Sum(x => (x - mean) * (x - mean)) / 28), 4);
        var d = Math.Round(daily.Sum() / 28m, 4);

        Assert.Equal(DemandState.Normal, p.Policy!.DemandState);
        Assert.Equal(d, p.Policy.AvgDailyDemand);
        Assert.Equal(sigma, p.Policy.DemandStdDev);
        var ss = Math.Round(1.65m * sigma * (decimal)Math.Sqrt(p.Policy.LeadTimeDays), 2);
        Assert.Equal(ss, p.Policy.SafetyStock); // Q4
        Assert.Equal(Math.Round(d * p.Policy.LeadTimeDays + ss, 2), p.Policy.CurrentROP);
        Assert.Equal((decimal)Math.Ceiling(Math.Sqrt(2 * (double)(d * 365) * (double)p.Policy.OrderingCost / (double)p.Policy.HoldingCost)), p.Policy.CurrentEOQ); // Q5
        Assert.Equal(Now, p.Policy.LastROPCalculatedAt);
    }

    [Fact]
    public async Task Too_little_history_and_slow_moving_products_get_no_ROP_alert_or_proposal()
    {
        await using var c = await Setup();
        var cat = c.Db.ProductCategories.First().CategoryId;
        var sup = c.Db.Suppliers.First().SupplierId;
        await new CatalogService(c.Db).SaveProductAsync(null, new ProductInput("THT-09", "Thớt mới", "cái", cat, sup, 7, 300_000, 5_000));
        await c.Replenish.RecalculateAsync();

        foreach (var (sku, state) in new[] { ("THT-09", DemandState.InsufficientData), ("THT-04", DemandState.InsufficientData), ("KHA-04", DemandState.SlowMoving) })
        {
            var p = c.P(sku);
            Assert.Equal(state, p.Policy!.DemandState);
            Assert.Null(p.Policy.CurrentROP);
            Assert.Null(p.Policy.SafetyStock);
            Assert.Null(c.OpenAlert(sku));
            Assert.Null(c.Pending(sku));
        }
        Assert.True(await c.Net("KHA-04") > 0); // slow-moving goods are still on the shelf
    }

    [Fact]
    public async Task Net_stock_at_or_under_ROP_has_an_alert_and_one_open_proposal()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var products = c.Db.Products.Include(p => p.Policy).Where(p => p.Policy!.CurrentROP != null).ToList();
        var weekStart = ReplenishmentRules.WeekStart(Now);
        var low = 0;
        foreach (var p in products)
        {
            var net = await c.Net(p.SKU);
            var rop = p.Policy!.CurrentROP!.Value;
            Assert.True(c.Proposals(p.SKU).Count(r => r.Status == ProposalStatus.Pending) <= 1); // Q10
            if (net > rop)
            {
                Assert.Null(c.OpenAlert(p.SKU));
                Assert.Null(c.Pending(p.SKU));
                continue;
            }
            low++;
            var alert = c.OpenAlert(p.SKU);
            Assert.NotNull(alert);
            Assert.Equal(net, alert!.CurrentQuantity);
            Assert.Equal(rop, alert.ROPValue);
            if (c.Pending(p.SKU) is not { } r)
            {
                Assert.True(c.Blocked(p));
                continue;
            }
            var d = p.Policy.AvgDailyDemand!.Value;
            var q = ReplenishmentRules.ProposalQuantity(rop, p.Policy.CurrentEOQ!.Value, net, d);
            Assert.Equal(net, r.NetQuantity);
            Assert.Equal(ReplenishmentRules.Classify(net, rop, d, p.Policy.LeadTimeDays), r.Priority);
            Assert.Equal(q.Base, r.BaseQuantity);
            Assert.Equal(q.Proposed, r.OriginalQuantity);
            Assert.Equal(q.Basis, r.AdjustBasis);
            if (r.AdjustReason is null) Assert.Equal(q.Proposed, r.ProposedQuantity);
        }
        Assert.True(low > 0);

        // A second run updates rather than duplicates.
        var (alerts, proposals) = (c.Db.StockAlerts.Count(), c.Db.ReplenishmentProposals.Count());
        await c.Replenish.RecalculateAsync();
        Assert.Equal(alerts, c.Db.StockAlerts.Count());
        Assert.Equal(proposals, c.Db.ReplenishmentProposals.Count());
    }

    [Fact]
    public async Task A_new_order_lowers_net_stock_and_raises_an_alert_and_a_proposal()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        Product? p = null;
        foreach (var x in c.Db.Products.Include(x => x.Policy).Where(x => x.Policy!.CurrentROP != null).ToList())
            if (await c.Net(x.SKU) > x.Policy!.CurrentROP && c.Pending(x.SKU) is null && !c.Blocked(x)) { p = x; break; }
        Assert.NotNull(p);
        var take = await c.Net(p!.SKU) - (int)Math.Floor(p.Policy!.CurrentROP!.Value);

        await c.Issues.RecordOrderAsync(new OrderInput("DH-ROP-1", null, null, [new(p.SKU, take)]));

        Assert.NotNull(c.OpenAlert(p.SKU)); // nothing issued yet: the order alone lowers net stock (Q8)
        var proposal = c.Pending(p.SKU);
        Assert.NotNull(proposal);
        Assert.Equal(await c.Net(p.SKU), proposal!.NetQuantity);
        Assert.Contains(c.Db.Notifications, n => n.Title.Contains(p.SKU));
    }

    [Fact]
    public async Task Approved_receipt_lifts_net_stock_above_ROP_and_closes_alert_and_pending_proposal()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var proposal = c.Db.ReplenishmentProposals.Include(r => r.Product).First(r => r.Status == ProposalStatus.Pending);
        var sku = proposal.Product.SKU;
        var p = c.P(sku);
        var need = (int)Math.Ceiling(p.Policy!.CurrentROP!.Value) - await c.Net(sku) + 10;

        var r = await c.Receipts.CreateAsync(new ReceiptInput(p.SupplierId, null, [new(p.ProductId, need, 0, null, null, null)]), c.Staff);
        await c.Receipts.SubmitAsync(r.ReceiptId, c.Staff);
        var alert = c.OpenAlert(sku);
        Assert.NotNull(alert); // nothing changes before approval
        await c.Receipts.ApproveAsync(r.ReceiptId, c.Manager);

        Assert.Null(c.OpenAlert(sku));
        Assert.Equal(AlertStatus.Closed, alert!.Status);
        Assert.NotNull(alert.ClosedAt);
        Assert.Equal(ProposalStatus.Closed, proposal.Status);
    }

    [Fact]
    public async Task A_reported_proposal_is_frozen_and_blocks_new_ones_until_lead_time_plus_three_days()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var proposal = c.Db.ReplenishmentProposals.Include(r => r.Product).ThenInclude(p => p.Policy).First(r => r.Status == ProposalStatus.Pending);
        var sku = proposal.Product.SKU;
        var report = await c.Report(proposal.ProposalId);
        var (quantity, net) = (proposal.ProposedQuantity, proposal.NetQuantity);

        await c.Issues.RecordOrderAsync(new OrderInput("DH-APP-1", null, null, [new(sku, 5)]));

        Assert.Equal(ProposalStatus.Reported, proposal.Status);
        Assert.Equal(report.ReportId, proposal.ReportId);
        Assert.Equal(quantity, proposal.ProposedQuantity);
        Assert.Equal(net, proposal.NetQuantity); // frozen once decided
        Assert.Null(c.Pending(sku));
        Assert.Equal(net - 5, c.OpenAlert(sku)!.CurrentQuantity);

        // The goods may be on the way: no new proposal before report + L + 3 days, then one when still at or under ROP.
        var from = ReplenishmentRules.ReproposeFrom(Now, proposal.Product.Policy!.LeadTimeDays);
        c.Clock.UtcNow = from.AddHours(-1);
        await c.Replenish.CheckAsync([proposal.ProductId]);
        Assert.Null(c.Pending(sku));
        c.Clock.UtcNow = from.AddHours(1);
        Assert.True(await c.Replenish.CheckReportedAsync(from.AddDays(-1)) >= 1);
        Assert.NotNull(c.Pending(sku));
        Assert.Equal(0, await c.Replenish.CheckReportedAsync(from.AddHours(1))); // already past: not checked again
    }

    [Fact]
    public async Task Inventory_report_marks_below_ROP_exactly_the_products_with_an_open_alert()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var rows = await new ReportsController(c.Db, c.Replenish).Inventory(null, null);
        var alerted = c.Db.StockAlerts.Where(a => a.Status == AlertStatus.Open).Select(a => a.ProductId).ToHashSet();

        Assert.Contains(rows, r => r.BelowRop);
        Assert.All(rows, r => Assert.Equal(alerted.Contains(r.ProductId), r.BelowRop));
        Assert.All(rows, r => Assert.Equal(r.Available - r.Ordered, r.Net));
    }

    [Fact]
    public async Task A_rejection_holds_for_the_rest_of_the_week()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var proposal = c.Db.ReplenishmentProposals.Include(r => r.Product).First(r => r.Status == ProposalStatus.Pending);
        var sku = proposal.Product.SKU;
        await c.Replenish.RejectAsync(proposal.ProposalId, "Chờ báo giá mới của nhà cung cấp", c.Manager);

        c.Clock.UtcNow = Now.AddDays(4); // Sunday of the same week
        await c.Replenish.CheckAsync([proposal.ProductId]);
        Assert.Null(c.Pending(sku));

        c.Clock.UtcNow = Now.AddDays(5); // Monday 10:00: a new week, still at or under ROP
        await c.Replenish.CheckAsync([proposal.ProductId]);
        var again = c.Pending(sku);
        Assert.NotNull(again);
        Assert.Equal(c.Clock.UtcNow, again!.ProposalDate);
    }

    [Fact]
    public async Task Report_groups_by_supplier_in_priority_order_with_watch_lines_only_beside_orders()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var pending = c.Db.ReplenishmentProposals.Where(r => r.Status == ProposalStatus.Pending).ToList();
        var made = await c.Report(pending.Select(r => r.ProposalId).ToArray());
        var saved = ((await c.Controller().GetSavedReport(made.ReportId)).Value)!;
        var report = saved.Content;

        Assert.StartsWith("DX-2611-", made.Code);
        Assert.Equal(pending.Count, saved.Header.ProposalCount);
        Assert.Equal(pending.Sum(r => r.ProposedQuantity), saved.Header.TotalQuantity);
        Assert.Equal(report.Groups.Count, saved.Header.SupplierCount);
        Assert.All(pending, r => Assert.Equal(ProposalStatus.Reported, r.Status));
        await Assert.ThrowsAsync<RuleException>(() => c.Report(pending[0].ProposalId)); // not pending any more
        Assert.NotEmpty(report.Groups);
        Assert.Equal(pending.Count, report.Groups.Sum(g => g.Rows.Count(r => r.Proposal is not null)));
        foreach (var g in report.Groups)
        {
            Assert.All(g.Rows, r => Assert.Equal(g.SupplierId, r.Basis.SupplierId));
            Assert.Contains(g.Rows, r => r.Priority != Priority.Watch); // Q18
            var order = g.Rows.Select(r => ((int)r.Priority, r.DaysLeft ?? decimal.MaxValue)).ToList();
            Assert.Equal(order.OrderBy(x => x.Item1).ThenBy(x => x.Item2), order); // Q17
            Assert.All(g.Rows.Where(r => r.Priority == Priority.Watch), r =>
            {
                Assert.Null(r.Proposal);
                Assert.True(r.Basis.Net > r.Basis.Rop && (r.Basis.Net - r.Basis.Rop) / r.Basis.AvgDailyDemand <= ReplenishmentRules.WatchDays);
            });
        }
        Assert.Contains(report.Groups.SelectMany(g => g.Rows), r => r.Priority == Priority.Watch);
        Assert.Contains(report.Groups.SelectMany(g => g.Rows), r => r.Priority == Priority.Urgent);
        Assert.Contains(await c.Controller().Reports(), r => r.Id == made.ReportId && r.Code == made.Code);
    }

    [Fact]
    public async Task Seed_history_has_proposals_in_every_status_with_their_basis()
    {
        await using var c = await Setup();
        var all = c.Db.ReplenishmentProposals.Include(r => r.Product).Include(r => r.Report).ToList();
        foreach (var status in Enum.GetValues<ProposalStatus>()) Assert.Contains(all, r => r.Status == status);
        Assert.All(all, r => Assert.True(r.NetQuantity <= r.ROPValue)); // raised at or under ROP (Q9)
        Assert.All(all.Where(r => r.Status == ProposalStatus.Reported), r => Assert.NotNull(r.Report));
        foreach (var report in c.Db.ReplenishmentReports.Include(x => x.Proposals).ToList())
        {
            Assert.Equal(report.Proposals.Count, report.ProposalCount);
            Assert.Equal(report.Proposals.Sum(r => r.ProposedQuantity), report.TotalQuantity);
            // Demo reports keep no content: it is rebuilt from their proposals.
            var saved = ((await c.Controller().GetSavedReport(report.ReportId)).Value)!;
            Assert.Equal(report.ProposalCount, saved.Content.Groups.Sum(g => g.Rows.Count(x => x.Proposal is not null)));
        }
        Assert.Contains(c.Db.ReplenishmentReports, x => x.CreatedAt >= Now.AddDays(-1));
        Assert.All(all.Where(r => r.Status == ProposalStatus.Rejected), r => Assert.False(string.IsNullOrEmpty(r.RejectReason)));
        Assert.Contains(all, r => r.AdjustReason is not null && r.ProposedQuantity != r.OriginalQuantity);
        // No short-term trend: the system quantity is ROP + EOQ − net stock unless it hit the 12-week cap.
        Assert.All(all, r => Assert.True(r.AdjustBasis is null ? r.OriginalQuantity == r.BaseQuantity : r.OriginalQuantity < r.BaseQuantity));
        Assert.Contains(all, r => r.Status == ProposalStatus.Pending && r.Priority == Priority.Urgent);
        // Every sale in the history was delivered in full: no stock-outs.
        var lines = c.Db.OrderDetails.Where(d => d.Order.Status == OrderStatus.Issued).Select(d => new { d.OrderId, d.ProductId, d.Quantity }).ToList();
        var issued = c.Db.GoodsIssueDetails.Select(d => new { d.Issue.OrderId, d.ProductId, d.Quantity }).ToList();
        Assert.All(lines, l => Assert.Equal(l.Quantity, issued.Where(i => i.OrderId == l.OrderId && i.ProductId == l.ProductId).Sum(i => i.Quantity)));
    }

    [Fact]
    public async Task Manager_adjusts_reports_and_rejects_proposals()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var pending = c.Db.ReplenishmentProposals.Where(r => r.Status == ProposalStatus.Pending).ToList();
        Assert.True(pending.Count >= 2);
        var (a, b) = (pending[0], pending[1]);

        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Replenish.AdjustAsync(a.ProposalId, a.OriginalQuantity + 50, null));
        Assert.True(e.Errors.ContainsKey("reason"));
        var edited = a.OriginalQuantity + 50;
        await c.Replenish.AdjustAsync(a.ProposalId, edited, "Làm tròn theo pallet 50 cái");
        Assert.Equal(edited, a.ProposedQuantity);

        // A recalculation keeps the manager's quantity and refreshes the system one.
        await c.Replenish.RecalculateAsync();
        Assert.Equal(edited, a.ProposedQuantity);

        await c.Report(a.ProposalId);
        Assert.Equal(ProposalStatus.Reported, a.Status);
        Assert.Equal(c.Manager, a.ApprovedBy);
        Assert.Equal(edited, a.ProposedQuantity);
        await Assert.ThrowsAsync<RuleException>(() => c.Replenish.AdjustAsync(a.ProposalId, edited + 1, "Đổi sau khi lập báo cáo"));
        await Assert.ThrowsAsync<RuleException>(() => c.Report([]));

        await Assert.ThrowsAsync<ValidationException>(() => c.Replenish.RejectAsync(b.ProposalId, "", c.Manager)); // Q20: reason required
        await c.Replenish.RejectAsync(b.ProposalId, "Nhà cung cấp tạm ngưng giao", c.Manager);
        Assert.Equal(ProposalStatus.Rejected, b.Status);

        // Still under ROP: the report blocks a new proposal, and so does the rejection this week (Q10).
        await c.Replenish.RecalculateAsync();
        Assert.DoesNotContain(c.Db.ReplenishmentProposals, r => r.ProductId == a.ProductId && r.Status == ProposalStatus.Pending);
        Assert.DoesNotContain(c.Db.ReplenishmentProposals, r => r.ProductId == b.ProductId && r.Status == ProposalStatus.Pending);
    }
}
