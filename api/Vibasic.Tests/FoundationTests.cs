using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Seed;

namespace Vibasic.Tests;

public class FoundationTests
{
    private static VibasicDbContext NewDb() =>
        new(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Theory]
    [InlineData(LotStatus.Quarantined, "Tạm cách ly")]
    [InlineData(LotStatus.Locked, "Đã khóa")]
    [InlineData(IssueStatus.OnHold, "Chờ xử lý")]
    public void Status_is_persisted_as_vietnamese_label(object value, string label)
    {
        var conv = (Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter)
            Activator.CreateInstance(typeof(LabelConverter<>).MakeGenericType(value.GetType()))!;
        Assert.Equal(label, conv.ConvertToProvider(value));
        Assert.Equal(value, conv.ConvertFromProvider(label));
    }

    [Fact]
    public void Every_status_label_fits_nvarchar_20()
    {
        var labels = typeof(LabelAttribute).Assembly.GetTypes().Where(t => t.IsEnum)
            .SelectMany(t => t.GetFields().Select(f => f.GetCustomAttributes(typeof(LabelAttribute), false).Cast<LabelAttribute>().FirstOrDefault()))
            .Where(a => a is not null).Select(a => a!.Text);
        Assert.All(labels, l => Assert.True(l.Length <= 20, l));
    }

    [Fact]
    public void Vietnam_time_is_utc_plus_7()
    {
        var utc = new DateTime(2026, 10, 31, 18, 30, 0, DateTimeKind.Utc); // 01:30 on 01/11 in Vietnam
        Assert.Equal(new DateOnly(2026, 11, 1), VnTime.Today(utc));
        Assert.Equal("2611", VnTime.Yymm(utc));
    }

    [Fact]
    public async Task Codes_continue_from_the_last_saved_code_in_the_month()
    {
        await using var db = NewDb();
        var now = new DateTime(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc);
        await DbSeeder.SeedAsync(db, now);
        var gen = new CodeGenerator(db);

        var lastIssue = await db.GoodsIssues.Where(x => x.Code.StartsWith("PX-2611-")).MaxAsync(x => x.Code);
        var next = await gen.NextDocumentAsync(CodeGenerator.Issue, now);
        Assert.Equal(int.Parse(lastIssue[^4..]) + 1, int.Parse(next[^4..]));
        // Two codes in one unit of work never collide.
        Assert.NotEqual(next, await gen.NextDocumentAsync(CodeGenerator.Issue, now));

        Assert.Equal("PN-2611-0001", await gen.NextDocumentAsync(CodeGenerator.Receipt, now));
        var (head, first) = await gen.ReserveSerialsAsync("THT-01", now, 5);
        Assert.Equal("SP-THT01-2611-", head);
        Assert.Equal(1, first);
        var (_, after) = await gen.ReserveSerialsAsync("THT-01", now, 1);
        Assert.Equal(6, after);
    }

    [Fact]
    public async Task Seed_keeps_lot_quantity_equal_to_items_in_stock()
    {
        await using var db = NewDb();
        await DbSeeder.SeedAsync(db, new DateTime(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc));
        var lots = await db.StockLots.Include(l => l.Items).ToListAsync();
        Assert.All(lots, l => Assert.Equal(l.QuantityOnHand, l.Items.Count(i => i.Status == ItemStatus.InStock)));
        Assert.Equal(3, await db.Orders.CountAsync(o => o.Status == OrderStatus.Open));
    }
}
