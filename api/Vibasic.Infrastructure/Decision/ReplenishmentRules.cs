using System.Globalization;
using Vibasic.Domain;

namespace Vibasic.Infrastructure.Decision;

/// <summary>
/// "Quy tắc đề xuất bổ sung hàng hóa" (Q1–Q20) as pure functions, shared by <see cref="ReplenishmentService"/> and the demo seeder.
/// The constants are system-wide (mục 3), never per product. Household goods have steady demand, so there is no short-term
/// (2-week) trend adjustment: demand is the last 4 weeks only.
/// </summary>
public static class ReplenishmentRules
{
    /// <summary>Main demand window: the last 4 weeks.</summary>
    public const int WindowDays = 28;
    /// <summary>Service level 95 %.</summary>
    public const decimal Z = 1.65m;
    /// <summary>"Theo dõi": reaches ROP within this many days.</summary>
    public const int WatchDays = 7;
    /// <summary>A proposal never exceeds 12 weeks of demand.</summary>
    public const int CapDays = 84;
    /// <summary>No demand for 8 weeks: "Hàng chậm luân chuyển".</summary>
    public const int SlowMovingDays = 56;

    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");

    public record Demand(decimal D, decimal Sigma);

    /// <summary>Q2 from the ordered quantity of each of the last 28 Vietnamese days, oldest first (days without orders count as 0).</summary>
    public static Demand DemandStats(IReadOnlyList<int> daily)
    {
        if (daily.Count != WindowDays) throw new ArgumentException($"Cần đúng {WindowDays} ngày nhu cầu.", nameof(daily));
        var mean = daily.Sum() / (double)WindowDays;
        var sigma = Math.Sqrt(daily.Sum(x => (x - mean) * (x - mean)) / WindowDays);
        return new(Math.Round(daily.Sum() / (decimal)WindowDays, 4), Math.Round((decimal)sigma, 4));
    }

    /// <summary>Q4: SS = z × σ × √L.</summary>
    public static decimal SafetyStock(decimal sigma, int leadTimeDays) =>
        Math.Round(Z * sigma * (decimal)Math.Sqrt(leadTimeDays), 2);

    /// <summary>Q4: ROP = d × L + SS.</summary>
    public static decimal Rop(decimal d, int leadTimeDays, decimal safetyStock) => Math.Round(d * leadTimeDays + safetyStock, 2);

    /// <summary>Q5: EOQ = √(2DS/H) with D = d × 365, rounded up.</summary>
    public static decimal Eoq(decimal d, decimal orderingCost, decimal holdingCost)
    {
        if (holdingCost <= 0 || d <= 0) return 0;
        return (decimal)Math.Ceiling(Math.Round(Math.Sqrt(2 * (double)(d * 365) * (double)orderingCost / (double)holdingCost), 6));
    }

    /// <summary>Q11: days of net stock left; null when there is no demand.</summary>
    public static decimal? DaysLeft(int net, decimal d) => d > 0 ? Math.Round(net / d, 1) : null;

    /// <summary>
    /// Q12, in order: Khẩn cấp, Cần đặt, Theo dõi; null when none applies. Without demand in the last 4 weeks (d = 0, ROP = 0)
    /// only a shortage counts: open orders above available stock (net &lt; 0) are Khẩn cấp, anything else needs nothing.
    /// </summary>
    public static Priority? Classify(int net, decimal rop, decimal d, int leadTimeDays)
    {
        if (d <= 0) return net < 0 ? Priority.Urgent : null;
        if (net <= 0 || net / d < leadTimeDays) return Priority.Urgent;
        if (net <= rop) return Priority.Order;
        if ((net - rop) / d <= WatchDays) return Priority.Watch;
        return null;
    }

    /// <summary>Days after the lead time during which a reported product gets no new proposal (goods may still be on the way).</summary>
    public const int ReproposeGraceDays = 3;

    /// <summary>Reported and rejected proposals older than this cannot block a new one any more (L + 3 and the week are far shorter).</summary>
    public const int RecentDecisionDays = 120;

    /// <summary>Q10: after a report, the product is proposed again only from report + L + grace, if still at or below ROP.</summary>
    public static DateTime ReproposeFrom(DateTime reportedAt, int leadTimeDays) => reportedAt.AddDays(leadTimeDays + ReproposeGraceDays);

    /// <param name="Base">Q13: ROP + EOQ − net, rounded up.</param>
    /// <param name="Proposed">Base, at most 12 weeks of demand (Q15), rounded up.</param>
    /// <param name="Basis">Q16: why the quantity was cut to the cap; null when it was not.</param>
    public record Quantity(int Base, int Proposed, string? Basis);

    /// <summary>Q13, Q15, Q16 (Q14, the short-term trend adjustment, is not used).</summary>
    public static Quantity ProposalQuantity(decimal rop, decimal eoq, int net, decimal d)
    {
        var raw = Math.Max(1, Up(rop + eoq - net));
        var cap = d > 0 ? Up(CapDays * d) : int.MaxValue;
        return raw > cap
            ? new(raw, Math.Max(1, cap), $"Vượt trần nhu cầu 12 tuần, giảm còn {Math.Max(1, cap).ToString("#,##0", Vi)}")
            : new(raw, raw, null);
    }

    /// <summary>Monday 00:00 (Vietnam) of the week holding <paramref name="utc"/>, in UTC. Q10: a rejection holds for this week.</summary>
    public static DateTime WeekStart(DateTime utc)
    {
        var local = VnTime.ToLocal(utc).Date;
        var back = ((int)local.DayOfWeek + 6) % 7;
        return VnTime.ToUtc(local.AddDays(-back));
    }

    private static int Up(decimal x) => (int)Math.Ceiling(Math.Round(x, 6));
}
