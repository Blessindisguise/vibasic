namespace Vibasic.Domain;

/// <summary>Asia/Ho_Chi_Minh is a fixed UTC+7 (no DST). The DB stores UTC; business dates are Vietnamese local dates.</summary>
public static class VnTime
{
    public static readonly TimeSpan Offset = TimeSpan.FromHours(7);

    public static DateTime ToLocal(DateTime utc) => DateTime.SpecifyKind(utc + Offset, DateTimeKind.Unspecified);
    public static DateTime ToUtc(DateTime local) => DateTime.SpecifyKind(local - Offset, DateTimeKind.Utc);
    public static DateOnly Today(DateTime utcNow) => DateOnly.FromDateTime(ToLocal(utcNow));
    /// <summary>"yymm" of the local date, used in document and lot codes.</summary>
    public static string Yymm(DateTime utc) => ToLocal(utc).ToString("yyMM");
}

public interface IClock
{
    DateTime UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}
