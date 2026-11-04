using Cronos;
using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Decision;

namespace Vibasic.Api;

/// <summary>
/// NFR "tác vụ tính ROP, EOQ chạy nền theo lịch": recalculates every product on a weekly cron in Vietnam time
/// (config <c>Replenishment:Cron</c>, default Monday 02:00). On start-up it also runs when the last run is over a week old.
/// </summary>
public class ReplenishmentJob(IServiceScopeFactory scopes, IConfiguration config, ILogger<ReplenishmentJob> log) : BackgroundService
{
    private static readonly TimeZoneInfo Vietnam = TimeZoneInfo.CreateCustomTimeZone("ICT", VnTime.Offset, "Giờ Việt Nam", "Giờ Việt Nam");

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var cron = CronExpression.Parse(config["Replenishment:Cron"] ?? "0 2 * * 1");
        await RunAsync(onlyIfStale: true, stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            var next = cron.GetNextOccurrence(DateTimeOffset.UtcNow, Vietnam);
            if (next is null) return;
            var wait = next.Value - DateTimeOffset.UtcNow;
            if (wait > TimeSpan.Zero) await Task.Delay(wait, stoppingToken);
            await RunAsync(onlyIfStale: false, stoppingToken);
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
}
