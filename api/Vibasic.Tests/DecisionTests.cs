using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Catalog;
using Vibasic.Infrastructure.Decision;
using Vibasic.Infrastructure.Issuing;
using Vibasic.Infrastructure.Receiving;
using Vibasic.Infrastructure.Seed;

namespace Vibasic.Tests;

public class DecisionTests
{
    private sealed class FixedClock(DateTime utc) : IClock { public DateTime UtcNow => utc; }
    private static readonly DateTime Now = new(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc);

    private sealed class Ctx : IAsyncDisposable
    {
        public required VibasicDbContext Db { get; init; }
        public required ReplenishmentService Replenish { get; init; }
        public required ReceiptService Receipts { get; init; }
        public required IssueService Issues { get; init; }
        public required int Staff { get; init; }
        public required int Manager { get; init; }
        public ValueTask DisposeAsync() => Db.DisposeAsync();
        public Product P(string sku) => Db.Products.Include(p => p.Policy).Single(p => p.SKU == sku);
        public StockAlert? OpenAlert(string sku) => Db.StockAlerts.SingleOrDefault(a => a.Product.SKU == sku && a.Status == AlertStatus.Open);
        public List<ReplenishmentProposal> Proposals(string sku) => Db.ReplenishmentProposals.Where(r => r.Product.SKU == sku).ToList();
        public int Available(string sku) => Replenish.AvailableLots(P(sku).ProductId).Sum(d => d.QuantityOnHand);
    }

    private static async Task<Ctx> Setup()
    {
        var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        await DbSeeder.SeedAsync(db, Now);
        var clock = new FixedClock(Now);
        var notifier = new Notifier(db, clock);
        var replenish = new ReplenishmentService(db, notifier, clock);
        var codes = new CodeGenerator(db);
        return new Ctx
        {
            Db = db, Replenish = replenish,
            Receipts = new ReceiptService(db, codes, notifier, clock, replenish),
            Issues = new IssueService(db, codes, notifier, clock, replenish),
            Staff = db.Users.First(u => u.Username == "nhanvien1").UserId,
            Manager = db.Users.First(u => u.Username == "quanly").UserId,
        };
    }

    [Fact]
    public async Task Weekly_calculation_follows_the_formulas()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var p = c.P("THT-01");
        var from = Now.AddDays(-28);
        var issued = await c.Db.GoodsIssueDetails
            .Where(d => d.ProductId == p.ProductId && d.Issue.Status == IssueStatus.Issued && d.Issue.DeliveredAt >= from && d.Issue.DeliveredAt < Now)
            .SumAsync(d => d.Quantity);
        var d = Math.Round(issued / 28m, 4);

        Assert.Equal(d, p.Policy!.AvgDailyDemand);
        Assert.Equal(Math.Round(d * p.Policy.LeadTimeDays + p.Policy.SafetyStock, 2), p.Policy.CurrentROP);
        var eoq = Math.Sqrt(2 * (double)(d * 365) * (double)p.Policy.OrderingCost / (double)p.Policy.HoldingCost);
        Assert.Equal(Math.Round((decimal)eoq, 2), p.Policy.CurrentEOQ);
        Assert.Equal(Now, p.Policy.LastROPCalculatedAt);
    }

    [Fact]
    public async Task Low_stock_opens_an_alert_and_a_proposal_of_EOQ_high_stock_does_not()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();

        var low = c.P("THT-01"); // seeded well under its ROP
        Assert.True(c.Available("THT-01") <= low.Policy!.CurrentROP);
        var alert = c.OpenAlert("THT-01");
        Assert.NotNull(alert);
        Assert.Equal(c.Available("THT-01"), alert!.CurrentQuantity);
        var proposal = Assert.Single(c.Proposals("THT-01"));
        Assert.Equal(ProposalStatus.Pending, proposal.Status);
        Assert.Equal(ReplenishmentService.ProposalQuantity(low.Policy.CurrentEOQ!.Value), proposal.ProposedQuantity);
        Assert.Contains(c.Db.Notifications, n => n.Title.Contains("THT-01"));

        Assert.True(c.Available("THT-02") > c.P("THT-02").Policy!.CurrentROP);
        Assert.Null(c.OpenAlert("THT-02"));
        Assert.Empty(c.Proposals("THT-02"));

        // A second run updates rather than duplicates.
        await c.Replenish.RecalculateAsync();
        Assert.Single(c.Db.StockAlerts.Where(a => a.Product.SKU == "THT-01"));
        Assert.Single(c.Proposals("THT-01"));
    }

    [Fact]
    public async Task New_product_without_four_weeks_of_history_is_never_alerted()
    {
        await using var c = await Setup();
        var cat = c.Db.ProductCategories.First().CategoryId;
        var sup = c.Db.Suppliers.First().SupplierId;
        var p = await new CatalogService(c.Db).SaveProductAsync(null, new ProductInput("THT-09", "Thớt mới", "cái", cat, sup, 7, 50, 300_000, 5_000));
        await c.Replenish.RecalculateAsync();
        Assert.Null(c.P("THT-09").Policy!.CurrentROP);
        Assert.False(await c.Db.StockAlerts.AnyAsync(a => a.ProductId == p.ProductId));
        Assert.False(await c.Db.ReplenishmentProposals.AnyAsync(r => r.ProductId == p.ProductId));
    }

    [Fact]
    public async Task Approved_receipt_lifts_stock_above_ROP_and_closes_alert_and_pending_proposal()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var p = c.P("THT-01");
        var need = (int)Math.Ceiling(p.Policy!.CurrentROP!.Value) - c.Available("THT-01") + 10;

        var r = await c.Receipts.CreateAsync(new ReceiptInput(p.SupplierId, null, [new(p.ProductId, need, 0, null, null, null)]), c.Staff);
        await c.Receipts.SubmitAsync(r.ReceiptId, c.Staff);
        Assert.NotNull(c.OpenAlert("THT-01")); // nothing changes before approval
        await c.Receipts.ApproveAsync(r.ReceiptId, c.Manager);

        Assert.Null(c.OpenAlert("THT-01"));
        var closed = c.Db.StockAlerts.Single(a => a.Product.SKU == "THT-01");
        Assert.Equal(AlertStatus.Closed, closed.Status);
        Assert.NotNull(closed.ClosedAt);
        Assert.Equal(ProposalStatus.Closed, Assert.Single(c.Proposals("THT-01")).Status);
    }

    [Fact]
    public async Task Delivery_that_drops_stock_to_ROP_raises_an_alert()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var p = c.P("THT-02");
        var take = c.Available("THT-02") - (int)Math.Floor(p.Policy!.CurrentROP!.Value);
        var order = await c.Issues.RecordOrderAsync(new OrderInput("DH-ROP-1", null, null, [new("THT-02", take)]));
        var issue = await c.Issues.CreateAsync(order.OrderId, c.Staff);
        await c.Issues.ApproveAsync(issue.IssueId, c.Manager);
        foreach (var s in c.Db.StockItems.Where(i => i.IssueDetail!.IssueId == issue.IssueId).Select(i => i.SerialCode).ToList())
            await c.Issues.ScanAsync(issue.IssueId, s);
        Assert.Null(c.OpenAlert("THT-02"));

        await c.Issues.DeliverAsync(issue.IssueId, "Anh Bình", c.Staff);

        Assert.NotNull(c.OpenAlert("THT-02"));
        Assert.Single(c.Proposals("THT-02"));
    }

    [Fact]
    public async Task Manager_adjusts_approves_and_rejects_proposals()
    {
        await using var c = await Setup();
        await c.Replenish.RecalculateAsync();
        var pending = c.Db.ReplenishmentProposals.Where(r => r.Status == ProposalStatus.Pending).ToList();
        Assert.True(pending.Count >= 2);
        var (a, b) = (pending[0], pending[1]);

        var e = await Assert.ThrowsAsync<ValidationException>(() => c.Replenish.AdjustAsync(a.ProposalId, a.OriginalQuantity + 50, null));
        Assert.True(e.Errors.ContainsKey("reason"));
        await c.Replenish.AdjustAsync(a.ProposalId, a.OriginalQuantity + 50, "Làm tròn theo pallet 50 cái");
        Assert.Equal(a.OriginalQuantity + 50, a.ProposedQuantity);

        // A recalculation keeps the manager's quantity and refreshes the system one.
        await c.Replenish.RecalculateAsync();
        Assert.Equal(a.OriginalQuantity + 50, a.ProposedQuantity);

        await c.Replenish.ApproveAsync([a.ProposalId], c.Manager);
        Assert.Equal(ProposalStatus.Approved, a.Status);
        Assert.Equal(c.Manager, a.ApprovedBy);
        await Assert.ThrowsAsync<RuleException>(() => c.Replenish.ApproveAsync([a.ProposalId], c.Manager));

        await c.Replenish.RejectAsync(b.ProposalId, "Nhà cung cấp tạm ngưng giao", c.Manager);
        Assert.Equal(ProposalStatus.Rejected, b.Status);

        // Still under ROP, but this low-stock episode already has a decision: no new pending proposal.
        await c.Replenish.RecalculateAsync();
        Assert.DoesNotContain(c.Db.ReplenishmentProposals, r => r.ProductId == a.ProductId && r.Status == ProposalStatus.Pending);
        Assert.DoesNotContain(c.Db.ReplenishmentProposals, r => r.ProductId == b.ProductId && r.Status == ProposalStatus.Pending);
    }
}
