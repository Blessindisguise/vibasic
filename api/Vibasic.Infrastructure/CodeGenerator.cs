using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;

namespace Vibasic.Infrastructure;

/// <summary>
/// Business codes: PN-/PX-/KK-/BC-/KH-/DX- yymm-nnnn, LOT-yymm-nnn, SP-{SKU}-yymm-nnnn.
/// Call inside the same transaction that inserts the row; the UNIQUE index is the final guard.
/// </summary>
public class CodeGenerator(VibasicDbContext db)
{
    public const string Receipt = "PN", Issue = "PX", Stocktake = "KK", Abnormal = "BC", Plan = "KH", Replenishment = "DX";

    private readonly Dictionary<string, int> _issued = [];

    public async Task<string> NextDocumentAsync(string prefix, DateTime utc)
    {
        var head = $"{prefix}-{VnTime.Yymm(utc)}-";
        var codes = prefix switch
        {
            Receipt => db.GoodsReceipts.Select(x => x.Code),
            Issue => db.GoodsIssues.Select(x => x.Code),
            Stocktake => db.Stocktakes.Select(x => x.Code),
            Abnormal => db.AbnormalReports.Select(x => x.Code),
            Plan => db.StocktakePlans.Select(x => x.Code),
            Replenishment => db.ReplenishmentReports.Select(x => x.Code),
            _ => throw new ArgumentOutOfRangeException(nameof(prefix)),
        };
        return head + (await NextAsync(head, codes)).ToString("D4");
    }

    public async Task<string> NextLotAsync(DateTime utc)
    {
        var head = $"LOT-{VnTime.Yymm(utc)}-";
        return head + (await NextAsync(head, db.GoodsReceiptDetails.Select(x => x.LotCode))).ToString("D3");
    }

    /// <summary>First serial number for <paramref name="count"/> new items of a SKU received in the month of <paramref name="utc"/>.</summary>
    public async Task<(string head, int first)> ReserveSerialsAsync(string sku, DateTime utc, int count)
    {
        var head = $"SP-{SkuPart(sku)}-{VnTime.Yymm(utc)}-";
        var first = await NextAsync(head, db.StockItems.Select(x => x.SerialCode));
        _issued[head] = first + count - 1;
        return (head, first);
    }

    public static string SkuPart(string sku) => sku.Replace("-", "").ToUpperInvariant();

    private async Task<int> NextAsync(string head, IQueryable<string> codes)
    {
        var last = await codes.Where(c => c.StartsWith(head)).OrderByDescending(c => c).FirstOrDefaultAsync();
        var n = last is null ? 0 : int.Parse(last[head.Length..]);
        // Codes handed out earlier in this unit of work but not saved yet.
        if (_issued.TryGetValue(head, out var pending)) n = Math.Max(n, pending);
        _issued[head] = n + 1;
        return n + 1;
    }
}
