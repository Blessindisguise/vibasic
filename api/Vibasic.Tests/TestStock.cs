using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Decision;
using Vibasic.Infrastructure.Receiving;

namespace Vibasic.Tests;

internal static class TestStock
{
    /// <summary>The SKUs whose FIFO tests need stock in more than one lot.</summary>
    public static readonly string[] MultiLot = ["MUO-01", "MUO-03", "THT-01"];

    /// <summary>
    /// Receives and approves a newer lot (30 units) of each SKU through ReceiptService, so tests that need stock spread over
    /// several lots do not depend on where the seeded history leaves each product.
    /// </summary>
    public static async Task AddLotsAsync(VibasicDbContext db, IClock clock, params string[] skus)
    {
        var notifier = new Notifier(db, clock);
        var receipts = new ReceiptService(db, new CodeGenerator(db), notifier, clock, new ReplenishmentService(db, notifier, clock));
        var staff = db.Users.First(u => u.Username == "nhanvien1").UserId;
        var manager = db.Users.First(u => u.Username == "quanly").UserId;
        foreach (var group in db.Products.Where(p => skus.Contains(p.SKU)).ToList().GroupBy(p => p.SupplierId))
        {
            var lines = group.Select(p => new ReceiptLineInput(p.ProductId, 30, 0, null, null, null)).ToList();
            var r = await receipts.CreateAsync(new ReceiptInput(group.Key, null, lines), staff);
            await receipts.SubmitAsync(r.ReceiptId, staff);
            await receipts.ApproveAsync(r.ReceiptId, manager);
        }
    }
}
