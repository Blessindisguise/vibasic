using Vibasic.Domain;
using Vibasic.Infrastructure.Decision;

namespace Vibasic.Tests;

/// <summary>The formulas of "Quy tắc đề xuất bổ sung hàng hóa", checked against its worked example (mục 5).</summary>
public class ReplenishmentRulesTests
{
    [Fact]
    public void Worked_example_of_the_rule_book()
    {
        // d = 5, σ = 2, L = 7, D = 1.825, S = 500.000, H = 400.000, net 30 (no short-term trend adjustment).
        var ss = ReplenishmentRules.SafetyStock(2, 7);
        Assert.Equal(8.73m, ss);                                            // ≈ 8,7
        var rop = ReplenishmentRules.Rop(5, 7, ss);
        Assert.Equal(43.73m, rop);                                          // ≈ 44
        var eoq = ReplenishmentRules.Eoq(5, 500_000, 400_000);
        Assert.Equal(68m, eoq);                                             // √4.562,5 = 67,5 → 68
        Assert.Equal(6m, ReplenishmentRules.DaysLeft(30, 5));
        Assert.Equal(Priority.Urgent, ReplenishmentRules.Classify(30, rop, 5, 7)); // 6 days < L = 7

        var q = ReplenishmentRules.ProposalQuantity(rop, eoq, 30, 5);
        Assert.Equal(82, q.Base);                                           // 43,73 + 68 − 30
        Assert.Equal(82, q.Proposed);                                       // under the 12-week cap (420)
        Assert.Null(q.Basis);
    }

    [Fact]
    public void Demand_statistics_use_the_28_days_including_days_without_orders()
    {
        var daily = Enumerable.Repeat(0, 14).Concat(Enumerable.Repeat(10, 14)).ToArray();
        var s = ReplenishmentRules.DemandStats(daily);
        Assert.Equal(5m, s.D);
        Assert.Equal(5m, s.Sigma); // population σ of fourteen 0s and fourteen 10s
        Assert.Throws<ArgumentException>(() => ReplenishmentRules.DemandStats([1, 2, 3]));
    }

    [Theory]
    [InlineData(50.0, 80.0, 30, 100)]   // ROP + EOQ − net
    [InlineData(50.4, 80.0, 30, 101)]   // rounded up
    [InlineData(50.0, 80.0, -20, 150)]  // orders beyond stock add to the quantity
    [InlineData(10.0, 0.0, 30, 1)]      // never below 1
    public void Quantity_is_ROP_plus_EOQ_minus_net_stock(double rop, double eoq, int net, int expected)
    {
        var q = ReplenishmentRules.ProposalQuantity((decimal)rop, (decimal)eoq, net, 5);
        Assert.Equal(expected, q.Base);
        Assert.Equal(expected, q.Proposed);
        Assert.Null(q.Basis);
    }

    [Fact]
    public void Quantity_never_exceeds_twelve_weeks_of_demand()
    {
        var q = ReplenishmentRules.ProposalQuantity(10, 300, 0, 2); // base 310, cap 12 × 7 × 2 = 168
        Assert.Equal(310, q.Base);
        Assert.Equal(168, q.Proposed);
        Assert.Equal("Vượt trần nhu cầu 12 tuần, giảm còn 168", q.Basis);
    }

    [Fact]
    public void Priority_levels_follow_Q12_in_order()
    {
        // d = 4, L = 5, ROP = 30.
        Assert.Equal(Priority.Urgent, ReplenishmentRules.Classify(0, 30, 4, 5));    // nothing left for the open orders
        Assert.Equal(Priority.Urgent, ReplenishmentRules.Classify(-6, 30, 4, 5));
        Assert.Equal(Priority.Urgent, ReplenishmentRules.Classify(19, 30, 4, 5));   // 4,75 days < L
        Assert.Equal(Priority.Order, ReplenishmentRules.Classify(20, 30, 4, 5));    // 5 days = L
        Assert.Equal(Priority.Order, ReplenishmentRules.Classify(30, 30, 4, 5));
        Assert.Equal(Priority.Watch, ReplenishmentRules.Classify(58, 30, 4, 5));    // ROP in 7 days
        Assert.Null(ReplenishmentRules.Classify(59, 30, 4, 5));
        Assert.Null(ReplenishmentRules.Classify(5, 3, 0, 5));                       // no demand: never urgent by days left
        Assert.Null(ReplenishmentRules.DaysLeft(5, 0));
    }

    [Fact]
    public void Without_demand_only_a_shortage_is_proposed()
    {
        // No order in the last 4 weeks: d = 0, ROP = EOQ = 0.
        Assert.Null(ReplenishmentRules.Classify(0, 0, 0, 7));                       // nothing on the shelf, nothing wanted
        Assert.Null(ReplenishmentRules.Classify(12, 0, 0, 7));
        Assert.Equal(Priority.Urgent, ReplenishmentRules.Classify(-5, 0, 0, 7));    // open orders 5 above stock
        Assert.Equal(5, ReplenishmentRules.ProposalQuantity(0, 0, -5, 0).Proposed); // exactly the shortage
    }

    [Fact]
    public void A_reported_product_is_proposed_again_three_days_after_the_lead_time()
    {
        var reported = new DateTime(2026, 11, 1, 1, 30, 0, DateTimeKind.Utc);
        Assert.Equal(reported.AddDays(10), ReplenishmentRules.ReproposeFrom(reported, 7));
    }

    [Fact]
    public void A_week_starts_on_Monday_midnight_in_Vietnam()
    {
        var wednesday = new DateTime(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc);
        Assert.Equal(new DateTime(2026, 11, 1, 17, 0, 0, DateTimeKind.Utc), ReplenishmentRules.WeekStart(wednesday)); // Mon 2/11 00:00 +07
        var sundayNight = new DateTime(2026, 11, 8, 16, 59, 0, DateTimeKind.Utc);
        Assert.Equal(new DateTime(2026, 11, 1, 17, 0, 0, DateTimeKind.Utc), ReplenishmentRules.WeekStart(sundayNight));
        Assert.Equal(new DateTime(2026, 11, 8, 17, 0, 0, DateTimeKind.Utc), ReplenishmentRules.WeekStart(sundayNight.AddMinutes(1)));
    }
}
