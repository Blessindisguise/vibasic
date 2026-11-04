using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;

namespace Vibasic.Infrastructure.Seed;

/// <summary>
/// Demo data for a wooden-kitchenware warehouse. History is generated relative to "now" so that
/// the 4-week consumption window used by ROP always has data. Deterministic (fixed random seed).
/// </summary>
public static class DbSeeder
{
    public const string DemoPassword = "Vibasic@123";

    private record P(string Sku, string Name, string Unit, string Cat, string Sup, double D, int Lead, int Ss, decimal S, decimal H, int Current);

    // D = average daily demand; Current = target stock today (picked so priorities vary).
    private static readonly P[] Catalog =
    [
        new("THT-01", "Thớt gỗ me tây tròn 30cm", "cái", "Thớt", "ml", 6, 10, 18, 450_000, 9_000, 52),
        new("THT-02", "Thớt gỗ keo chữ nhật 40×28cm", "cái", "Thớt", "pt", 9, 7, 20, 300_000, 6_000, 160),
        new("THT-03", "Thớt gỗ teak có rãnh 35cm", "cái", "Thớt", "ml", 3, 10, 9, 450_000, 14_000, 21),
        new("DUA-01", "Đũa tre ăn cơm (hộp 10 đôi)", "hộp", "Đũa", "ta", 14, 5, 25, 200_000, 2_500, 70),
        new("DUA-02", "Đũa gỗ dừa (hộp 10 đôi)", "hộp", "Đũa", "ta", 8, 5, 15, 200_000, 4_000, 150),
        new("DUA-03", "Đũa nấu gỗ teak 33cm", "đôi", "Đũa", "ml", 5, 10, 12, 450_000, 2_000, 95),
        new("MUO-01", "Muỗng gỗ ăn súp 18cm", "cái", "Muỗng, vá & sạn", "pt", 12, 7, 24, 300_000, 1_500, 85),
        new("MUO-02", "Vá gỗ múc canh 30cm", "cái", "Muỗng, vá & sạn", "ml", 4, 10, 10, 450_000, 3_500, 48),
        new("MUO-03", "Sạn gỗ chiên xào 30cm", "cái", "Muỗng, vá & sạn", "pt", 7, 7, 14, 300_000, 3_000, 120),
        new("KHA-01", "Khay gỗ chữ nhật 40×25cm", "cái", "Khay, ống & hộp đựng", "ml", 2, 10, 6, 450_000, 18_000, 24),
        new("KHA-02", "Ống cắm đũa gỗ tròn", "cái", "Khay, ống & hộp đựng", "ta", 3, 5, 6, 200_000, 5_000, 60),
        new("KHA-03", "Hộp đựng gia vị gỗ 3 ngăn", "cái", "Khay, ống & hộp đựng", "pt", 2, 7, 5, 300_000, 16_000, 30),
    ];

    private static readonly string[] Customers =
    [
        "Siêu thị Co.opmart Bình Dương", "Nhà hàng Mộc Gia", "Cửa hàng Bếp Việt Quận 7",
        "Khách sạn Lá Phong", "Đại lý Thanh Tâm Thủ Đức", "Sàn TMĐT Vibasic Store",
    ];

    public static async Task SeedAsync(VibasicDbContext db, DateTime utcNow)
    {
        if (await db.Users.AnyAsync()) return;

        var rnd = new Random(20261104);
        var hash = BCrypt.Net.BCrypt.HashPassword(DemoPassword);
        var manager = new User { Username = "quanly", FullName = "Nguyễn Thu Hà", Role = UserRole.Manager, PasswordHash = hash };
        var staff1 = new User { Username = "nhanvien1", FullName = "Lê Văn Tâm", Role = UserRole.Staff, PasswordHash = hash };
        var staff2 = new User { Username = "nhanvien2", FullName = "Phạm Thị Lan", Role = UserRole.Staff, PasswordHash = hash };
        db.Users.AddRange(manager, staff1, staff2);

        var sups = new Dictionary<string, Supplier>
        {
            ["ml"] = new() { SupplierName = "Xưởng gỗ Minh Long", Phone = "0903 118 245", Address = "KCN Tân Uyên, Bình Dương" },
            ["pt"] = new() { SupplierName = "Gỗ keo Phú Thịnh", Phone = "0918 402 771", Address = "Thuận An, Bình Dương" },
            ["ta"] = new() { SupplierName = "Tre Việt Tân Á", Phone = "0937 650 112", Address = "Châu Thành, Bến Tre" },
        };
        db.Suppliers.AddRange(sups.Values);

        var cats = Catalog.Select(p => p.Cat).Distinct()
            .ToDictionary(c => c, c => new ProductCategory { CategoryName = c });
        cats["Thớt"].Description = "Thớt gỗ nguyên khối và ghép";
        cats["Đũa"].Description = "Đũa ăn và đũa nấu";
        db.ProductCategories.AddRange(cats.Values);

        var products = Catalog.ToDictionary(p => p.Sku, p => new Product
        {
            SKU = p.Sku, ProductName = p.Name, Unit = p.Unit, Category = cats[p.Cat], Supplier = sups[p.Sup],
            Policy = new InventoryPolicy { LeadTimeDays = p.Lead, SafetyStock = p.Ss, OrderingCost = p.S, HoldingCost = p.H },
        });
        db.Products.AddRange(products.Values);

        // ---- History: 42 days of daily demand, consumed FIFO from lots received earlier. ----
        var today = VnTime.Today(utcNow);
        DateTime At(int dayOffset, int hour) => VnTime.ToUtc(today.AddDays(dayOffset).ToDateTime(new TimeOnly(hour, 0)));
        const int historyDays = 42;

        var demand = Catalog.ToDictionary(p => p.Sku,
            p => Enumerable.Range(0, historyDays).Select(_ => (int)Math.Round(p.D * (0.5 + rnd.NextDouble()))).ToArray());

        var lotSeq = new Dictionary<string, int>();
        var serialSeq = new Dictionary<string, int>();
        var lots = new Dictionary<string, List<(GoodsReceiptDetail lot, DateTime received, Queue<StockItem> free)>>();
        var receipts = new List<GoodsReceipt>();

        // A lot is a receipt detail line (Hình 3.10). Receipts in the seed are already approved, so stock is recorded.
        GoodsReceiptDetail NewLot(P p, int qty, DateTime receivedUtc, LotStatus status = LotStatus.Normal)
        {
            var yymm = VnTime.Yymm(receivedUtc);
            lotSeq[yymm] = lotSeq.GetValueOrDefault(yymm) + 1;
            var lot = new GoodsReceiptDetail
            {
                LotCode = $"LOT-{yymm}-{lotSeq[yymm]:D3}", Product = products[p.Sku],
                Quantity = qty, QuantityOnHand = qty, Status = status,
            };
            var head = $"SP-{CodeGenerator.SkuPart(p.Sku)}-{yymm}-";
            for (var i = 0; i < qty; i++)
            {
                serialSeq[head] = serialSeq.GetValueOrDefault(head) + 1;
                lot.Items.Add(new StockItem { SerialCode = head + serialSeq[head].ToString("D4"), Status = ItemStatus.InStock });
            }
            return lot;
        }

        // Receipts are grouped by supplier and day, like real deliveries.
        GoodsReceipt ReceiptFor(string sup, DateTime utc)
        {
            var r = receipts.FirstOrDefault(x => x.Supplier == sups[sup] && x.ReceiptDate == utc);
            if (r is not null) return r;
            r = new GoodsReceipt
            {
                Supplier = sups[sup], ReceiptDate = utc, Creator = rnd.Next(2) == 0 ? staff1 : staff2,
                Approver = manager, SubmittedAt = utc.AddHours(2), ApprovedAt = utc.AddHours(3), Status = ReceiptStatus.Approved,
            };
            receipts.Add(r);
            return r;
        }

        foreach (var p in Catalog)
        {
            var total = demand[p.Sku].Sum();
            var l1 = (int)Math.Ceiling(total * 0.6);
            var l2 = (int)Math.Ceiling(total * 0.45);
            var l3 = p.Current + total - l1 - l2;
            if (l3 <= 0) { l2 = total + p.Current - l1; l3 = 0; }

            var plan = new List<(int day, int qty)> { (-118, l1), (-40, l2) };
            if (l3 > 0) plan.Add((-12, l3));
            lots[p.Sku] = [];
            foreach (var (day, qty) in plan)
            {
                var utc = At(day, 8);
                var lot = NewLot(p, qty, utc);
                lots[p.Sku].Add((lot, utc, new Queue<StockItem>(lot.Items)));
                ReceiptFor(p.Sup, utc).Details.Add(lot);
            }
        }

        // Daily orders: products split across two customers per day, issued and delivered the same day.
        var orderNo = 0;
        for (var i = 0; i < historyDays; i++)
        {
            var day = i - historyDays; // -42 .. -1
            var skus = Catalog.Select(p => p.Sku).Where(s => demand[s][i] > 0).OrderBy(_ => rnd.Next()).ToList();
            foreach (var group in skus.Chunk((skus.Count + 1) / 2).Where(g => g.Length > 0))
            {
                var utc = At(day, 9 + rnd.Next(6));
                var order = new Order
                {
                    ExternalCode = $"DH-{VnTime.Yymm(utc)}-{++orderNo:D4}", CustomerName = Customers[rnd.Next(Customers.Length)],
                    OrderDate = utc.AddHours(-20), Status = OrderStatus.Issued,
                };
                var issue = new GoodsIssue
                {
                    Order = order, IssueDate = utc, Creator = rnd.Next(2) == 0 ? staff1 : staff2, Approver = manager,
                    ApprovedAt = utc.AddMinutes(30), Status = IssueStatus.Issued, ReceiverName = "Tài xế Nguyễn Văn Bình",
                    DeliveredAt = utc.AddHours(2), DeliveredBy = null,
                };
                foreach (var sku in group)
                {
                    order.Details.Add(new OrderDetail { Product = products[sku], Quantity = demand[sku][i] });
                    // One issue line per product; its items are taken FIFO and may span several lots.
                    var detail = new GoodsIssueDetail { Product = products[sku] };
                    var need = demand[sku][i];
                    foreach (var (lot, _, free) in lots[sku].Where(x => x.received < utc))
                    {
                        if (need == 0) break;
                        var take = Math.Min(need, free.Count);
                        for (var k = 0; k < take; k++)
                        {
                            var item = free.Dequeue();
                            item.Status = ItemStatus.Issued;
                            item.PickedAt = utc.AddMinutes(60);
                            detail.Items.Add(item);
                        }
                        lot.QuantityOnHand -= take;
                        need -= take;
                    }
                    detail.Quantity = detail.Items.Count;
                    if (detail.Quantity > 0) issue.Details.Add(detail);
                }
                if (issue.Details.Count == 0) continue;
                db.Orders.Add(order);
                db.GoodsIssues.Add(issue);
            }
        }

        // UC_04: in the THT-01 delivery 40 days ago, 12 boards failed QC. They became a separate lot on the same receipt,
        // the abnormal report was approved and the lot is locked ("Đã khóa").
        var defectAt = At(-40, 8);
        var defect = NewLot(Catalog[0], 12, defectAt, LotStatus.Locked);
        defect.Note = "Nứt mặt thớt khi sấy";
        ReceiptFor(Catalog[0].Sup, defectAt).Details.Add(defect);

        // Document codes in date order.
        var seq = new Dictionary<string, int>();
        string Next(string prefix, DateTime utc)
        {
            var head = $"{prefix}-{VnTime.Yymm(utc)}-";
            seq[head] = seq.GetValueOrDefault(head) + 1;
            return head + seq[head].ToString("D4");
        }
        foreach (var r in receipts.OrderBy(r => r.ReceiptDate)) r.Code = Next(CodeGenerator.Receipt, r.ReceiptDate);
        db.GoodsReceipts.AddRange(receipts);
        foreach (var gi in db.ChangeTracker.Entries<GoodsIssue>().Select(e => e.Entity).OrderBy(x => x.IssueDate))
            gi.Code = Next(CodeGenerator.Issue, gi.IssueDate);

        db.AbnormalReports.Add(new AbnormalReport
        {
            Code = Next(CodeGenerator.Abnormal, At(-40, 10)), ReceiptDetail = defect, SourceType = AbnormalSource.Receipt,
            Description = "Nứt mặt thớt khi sấy, 12 cái không đạt kiểm định", Quantity = 12, Creator = staff1,
            CreatedAt = At(-40, 10), Approver = manager, ApprovedAt = At(-40, 14), Status = ApprovalStatus.Approved,
        });

        // Open orders from the sales system, waiting to be issued (UC_07).
        var open = new (string customer, (string sku, int qty)[] lines)[]
        {
            ("Nhà hàng Mộc Gia", [("THT-02", 24), ("MUO-01", 40), ("DUA-03", 20)]),
            ("Siêu thị Co.opmart Bình Dương", [("DUA-01", 60), ("DUA-02", 30), ("KHA-02", 12)]),
            ("Khách sạn Lá Phong", [("KHA-01", 10), ("THT-03", 8), ("MUO-02", 15), ("MUO-03", 15)]),
        };
        foreach (var (customer, lines) in open)
        {
            var o = new Order
            {
                ExternalCode = $"DH-{VnTime.Yymm(utcNow)}-{++orderNo:D4}", CustomerName = customer,
                OrderDate = utcNow.AddHours(-rnd.Next(2, 18)), Status = OrderStatus.Open,
            };
            foreach (var (sku, qty) in lines) o.Details.Add(new OrderDetail { Product = products[sku], Quantity = qty });
            db.Orders.Add(o);
        }

        await db.SaveChangesAsync();
    }
}
