using Cronos;
using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Decision;

namespace Vibasic.Api;

/// <summary>
/// NFR "tác vụ tính ROP, EOQ chạy nền theo lịch": recalculates every product on a weekly cron in Vietnam time
/// (config <c>Replenishment:Cron</c>, default Monday 02:00). On start-up it also runs when the last run is over a week old.
/// Every day (config <c>Replenishment:DailyCron</c>, default 02:00) it checks again the products whose report block (L + 3 days)
/// has ended, so a new proposal follows when net stock is still at or below ROP.
/// </summary>
public class ReplenishmentJob(IServiceScopeFactory scopes, IConfiguration config, ILogger<ReplenishmentJob> log) : BackgroundService
{
    private static readonly TimeZoneInfo Vietnam = TimeZoneInfo.CreateCustomTimeZone("ICT", VnTime.Offset, "Giờ Việt Nam", "Giờ Việt Nam");

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var weekly = CronExpression.Parse(config["Replenishment:Cron"] ?? "0 2 * * 1");
        var daily = CronExpression.Parse(config["Replenishment:DailyCron"] ?? "0 2 * * *");
        var lastCheck = DateTime.UtcNow.AddDays(-1);
        await RunAsync(onlyIfStale: true, stoppingToken);
        lastCheck = await CheckReportedAsync(lastCheck, stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            var nextWeekly = weekly.GetNextOccurrence(DateTimeOffset.UtcNow, Vietnam);
            var nextDaily = daily.GetNextOccurrence(DateTimeOffset.UtcNow, Vietnam);
            var next = new[] { nextWeekly, nextDaily }.Where(x => x is not null).Min();
            if (next is null) return;
            var wait = next.Value - DateTimeOffset.UtcNow;
            if (wait > TimeSpan.Zero) await Task.Delay(wait, stoppingToken);
            // The weekly run checks every product, the reported ones included.
            if (next == nextWeekly) { await RunAsync(onlyIfStale: false, stoppingToken); lastCheck = DateTime.UtcNow; }
            else lastCheck = await CheckReportedAsync(lastCheck, stoppingToken);
        }
    }

    private async Task RunAsync(bool onlyIfStale, CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<VibasicDbContext>();
            var weekAgo = DateTime.UtcNow.AddDays(-7);
            if (onlyIfStale && !await db.InventoryPolicies.AnyAsync(p => p.LastROPCalculatedAt == null || p.LastROPCalculatedAt < weekAgo, ct)) return;
            var count = await scope.ServiceProvider.GetRequiredService<ReplenishmentService>().RecalculateAsync();
            log.LogInformation("Đã tính lại ROP, EOQ cho {Count} mặt hàng", count);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogError(e, "Tính ROP, EOQ thất bại");
        }
    }

    /// <returns>The time this check covered up to, for the next one.</returns>
    private async Task<DateTime> CheckReportedAsync(DateTime since, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        try
        {
            using var scope = scopes.CreateScope();
            var count = await scope.ServiceProvider.GetRequiredService<ReplenishmentService>().CheckReportedAsync(since);
            if (count > 0) log.LogInformation("Kiểm tra lại {Count} mặt hàng đã lập báo cáo đề xuất", count);
            return now;
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogError(e, "Kiểm tra mặt hàng đã lập báo cáo thất bại");
            return since;
        }
    }
}
