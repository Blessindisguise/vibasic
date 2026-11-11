using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure.Decision;

namespace Vibasic.Infrastructure.Seed;

/// <summary>
/// Demo data for a wooden-kitchenware warehouse, generated relative to "now" with a fixed random seed.
/// <para>
/// The history is an event-by-event run of the warehouse under the system's own rules (Q1–Q20, <see cref="ReplenishmentRules"/>
/// and <see cref="ReplenishmentService.Evaluate"/>): orders arrive the afternoon before they are issued (FIFO) and delivered,
/// ROP/EOQ are recalculated every Monday 02:00 from the ordered quantities of the last 4 weeks, and every change of stock or
/// open orders opens or closes the low-stock alert and the proposal. A scripted manager puts proposals in a report each morning
/// (sometimes with a changed quantity), leaves them out, or lets them close; purchasing then orders outside the system and the
/// goods arrive after the lead time on an ordinary receipt. Proposals of the last few days are left for the user to decide.
/// </para>
/// </summary>
public static class DbSeeder
{
    public const string DemoPassword = "Vibasic@123";

    /// <summary>Days of history. The opening stock is received on the first day; ROP needs 4 weeks of data.</summary>
    public const int HistoryDays = 84;

    /// <summary>Proposals of the last days are not reviewed yet, so the demo always has some to decide.</summary>
    private const int UnreviewedDays = 5;

    /// <param name="D">Average daily demand.</param>
    /// <param name="Open">Days of demand in the opening receipt (staggers the first low-stock episode).</param>
    /// <param name="First">Day of the first receipt (a product added later has "Chưa đủ dữ liệu").</param>
    /// <param name="Last">Last day with orders (a product without orders for 8 weeks is "Hàng chậm luân chuyển").</param>
    /// <remarks>H is per unit per year (about a quarter of the purchase price), so EOQ covers 3–5 weeks of demand.</remarks>
    private record P(string Sku, string Name, string Unit, string Cat, string Sup, double D, int Lead, decimal S, decimal H, int Open,
        int First = -HistoryDays, int Last = -1);

    private static readonly P[] Catalog =
    [
        new("THT-01", "Thớt gỗ me tây tròn 30cm", "cái", "Thớt", "ml", 6, 10, 450_000, 110_000, 51),
        new("THT-02", "Thớt gỗ keo chữ nhật 40×28cm", "cái", "Thớt", "pt", 9, 7, 300_000, 60_000, 49),
        new("THT-03", "Thớt gỗ teak có rãnh 35cm", "cái", "Thớt", "ml", 3, 10, 450_000, 140_000, 57),
        new("THT-04", "Thớt gỗ óc chó chữ nhật 45×30cm", "cái", "Thớt", "ml", 2, 10, 450_000, 150_000, 20, First: -10),
        new("DUA-01", "Đũa tre ăn cơm (hộp 10 đôi)", "hộp", "Đũa", "ta", 14, 5, 200_000, 20_000, 44),
        new("DUA-02", "Đũa gỗ dừa (hộp 10 đôi)", "hộp", "Đũa", "ta", 8, 5, 200_000, 35_000, 49),
        new("DUA-03", "Đũa nấu gỗ teak 33cm", "đôi", "Đũa", "ml", 5, 10, 450_000, 60_000, 59),
        new("MUO-01", "Muỗng gỗ ăn súp 18cm", "cái", "Muỗng, vá & sạn", "pt", 12, 7, 300_000, 30_000, 48),
        new("MUO-02", "Vá gỗ múc canh 30cm", "cái", "Muỗng, vá & sạn", "ml", 4, 10, 450_000, 70_000, 57),
        new("MUO-03", "Sạn gỗ chiên xào 30cm", "cái", "Muỗng, vá & sạn", "pt", 7, 7, 300_000, 40_000, 50),
        new("KHA-01", "Khay gỗ chữ nhật 40×25cm", "cái", "Khay, ống & hộp đựng", "ml", 2, 10, 450_000, 120_000, 62),
        new("KHA-02", "Ống cắm đũa gỗ tròn", "cái", "Khay, ống & hộp đựng", "ta", 3, 5, 200_000, 40_000, 45),
        new("KHA-03", "Hộp đựng gia vị gỗ 3 ngăn", "cái", "Khay, ống & hộp đựng", "pt", 2, 7, 300_000, 80_000, 55),
        new("KHA-04", "Khay gỗ trang trí khắc laser", "cái", "Khay, ống & hộp đựng", "pt", 1.5, 7, 300_000, 90_000, 40, Last: -66),
    ];

    /// <summary>Demo customers with their delivery contact. Also used by the PickingAndOrderContact migration to fill older orders.</summary>
    internal static readonly (string Name, string Phone, string Address)[] Customers =
    [
        ("Siêu thị Co.opmart Bình Dương", "0274 3822 115", "Số 1 Đại lộ Bình Dương, P. Phú Hòa, TP. Thủ Dầu Một, Bình Dương"),
        ("Nhà hàng Mộc Gia", "0908 214 667", "45 Nguyễn Thị Minh Khai, P. Bến Nghé, Quận 1, TP.HCM"),
        ("Cửa hàng Bếp Việt Quận 7", "0932 558 019", "212 Huỳnh Tấn Phát, P. Tân Thuận Tây, Quận 7, TP.HCM"),
        ("Khách sạn Lá Phong", "0283 9301 288", "18 Lý Tự Trọng, P. Bến Thành, Quận 1, TP.HCM"),
        ("Đại lý Thanh Tâm Thủ Đức", "0916 773 402", "77 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP.HCM"),
        ("Sàn TMĐT Vibasic Store", "1900 6868 12", "Kho trung chuyển Vibasic, KCN Sóng Thần, Dĩ An, Bình Dương"),
    ];

    // ---- The manager's decisions, taken in turn by each new proposal (After = days later, at 08:30). ----
    private enum Act { Report, Adjust, Reject, Ignore }
    private enum Change { Case, Space, Peak }
    /// <param name="Follow">Reject: the goods ordered another way arrive this many days after the rejection.
    /// Ignore: a standing order arrives this many days after the proposal, which then closes by itself.</param>
    /// <param name="Cover">Days of demand on that other delivery.</param>
    private record Plan(Act Act, int After, Change Change = Change.Case, string? Reason = null, int Follow = 0, int Cover = 0);

    private static readonly Plan[] Script =
    [
        new(Act.Report, 1),
        new(Act.Adjust, 1, Change.Case),
        new(Act.Report, 1),
        new(Act.Ignore, 0, Follow: 2, Cover: 25),
        new(Act.Report, 1),
        new(Act.Reject, 1, Reason: "Đã đặt gộp vào đơn định kỳ của nhà cung cấp, hàng về trong tuần.", Follow: 3, Cover: 25),
        new(Act.Adjust, 1, Change.Space),
        new(Act.Report, 1),
        new(Act.Report, 1),
        new(Act.Adjust, 1, Change.Peak),
        new(Act.Report, 1),
        new(Act.Reject, 1, Reason: "Nhà cung cấp báo tăng giá 15%, chờ chốt giá mới rồi đặt.", Follow: 3, Cover: 22),
        new(Act.Report, 1),
        new(Act.Ignore, 0, Follow: 1, Cover: 30),
        new(Act.Adjust, 1, Change.Case),
        new(Act.Report, 1),
    ];

    /// <summary>Where a wholesale order leaves a product's net stock (Q12).</summary>
    private enum Target { Urgent, Order, Watch }

    /// <summary>
    /// Two wholesale orders received this morning and not issued yet. Through net stock (Q8) they take a few products to a chosen
    /// priority, so the report always has Khẩn cấp, Cần đặt and Theo dõi lines. A product already at or below its target is left out.
    /// </summary>
    private static readonly (string Customer, string Note, (string Sku, Target Target)[] Lines)[] Wholesale =
    [
        ("Sàn TMĐT Vibasic Store", "Đơn sỉ cho chương trình khuyến mãi cuối tuần.", [("MUO-01", Target.Urgent), ("DUA-01", Target.Order), ("KHA-03", Target.Watch)]),
        ("Đại lý Thanh Tâm Thủ Đức", "Đơn sỉ nhập hàng cho cửa hàng mới.", [("THT-03", Target.Order), ("KHA-02", Target.Order), ("THT-01", Target.Watch)]),
    ];

    private sealed class Stock(P p, Product product)
    {
        public P P { get; } = p;
        public Product Product { get; } = product;
        public InventoryPolicy Policy => Product.Policy!;
        /// <summary>Lots in FIFO order with the time they became available and the items not yet taken.</summary>
        public List<(GoodsReceiptDetail Lot, DateTime At, Queue<StockItem> Free)> Lots { get; } = [];
        public int Available { get; set; }
        /// <summary>Ordered and not issued yet (Q8).</summary>
        public int Ordered { get; set; }
        public DateTime? FirstData { get; set; }
        /// <summary>Every order line, by order date (Q1).</summary>
        public List<(DateTime OrderDate, int Quantity)> Demand { get; } = [];
        public StockAlert? Alert { get; set; }
        public List<ReplenishmentProposal> Proposals { get; } = [];
        public ReplenishmentProposal? Pending => Proposals.FirstOrDefault(r => r.Status == ProposalStatus.Pending);
    }

    private record Arrival(int Day, P P, int Qty, string Note);

    /// <summary>An order of the history: received the afternoon before, issued at IssueUtc, delivered two hours later.</summary>
    private sealed class Planned(DateTime orderUtc, DateTime issueUtc, string customer, string? note, List<(string Sku, int Qty)> lines)
    {
        public DateTime OrderUtc { get; } = orderUtc;
        public DateTime IssueUtc { get; } = issueUtc;
        public string Customer { get; } = customer;
        public string? Note { get; } = note;
        public List<(string Sku, int Qty)> Lines { get; set; } = lines;
        public Order? Order { get; set; }
    }

    private static Order WithContact(Order o)
    {
        var c = Customers.FirstOrDefault(x => x.Name == o.CustomerName);
        if (c.Name is not null) { o.CustomerPhone = c.Phone; o.ShippingAddress = c.Address; }
        return o;
    }

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
            Policy = new InventoryPolicy { LeadTimeDays = p.Lead, OrderingCost = p.S, HoldingCost = p.H, DemandState = DemandState.InsufficientData },
        });
        db.Products.AddRange(products.Values);
        var stock = Catalog.ToDictionary(p => p.Sku, p => new Stock(p, products[p.Sku]));

        var today = VnTime.Today(utcNow);
        DateTime At(int day, int hour, int minute = 0) => VnTime.ToUtc(today.AddDays(day).ToDateTime(new TimeOnly(hour, minute)));
        int DayOf(DateTime utc) => VnTime.Today(utc).DayNumber - today.DayNumber;
        var reviewUntil = utcNow.AddDays(-UnreviewedDays);

        // Daily demand; days outside a product's First..Last get none.
        var demand = Catalog.ToDictionary(p => p.Sku, p => Enumerable.Range(0, HistoryDays).Select(i =>
        {
            var day = i - HistoryDays;
            var q = p.D * (0.5 + rnd.NextDouble());
            return day > p.First && day <= p.Last ? (int)Math.Round(q) : 0;
        }).ToArray());

        // ---- Lots and receipts ----
        var lotSeq = new Dictionary<string, int>();
        var serialSeq = new Dictionary<string, int>();
        var receipts = new List<GoodsReceipt>();

        // A lot is a receipt detail line (Hình 3.10). Receipts in the seed are approved an hour after arrival, which records stock.
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
        GoodsReceipt ReceiptFor(string sup, DateTime utc, string note)
        {
            var r = receipts.FirstOrDefault(x => x.Supplier == sups[sup] && x.ReceiptDate == utc);
            if (r is not null) return r;
            r = new GoodsReceipt
            {
                Supplier = sups[sup], ReceiptDate = utc, Creator = rnd.Next(2) == 0 ? staff1 : staff2, Note = note,
                Approver = manager, SubmittedAt = utc.AddMinutes(30), ApprovedAt = utc.AddHours(1), Status = ReceiptStatus.Approved,
            };
            receipts.Add(r);
            return r;
        }

        void AddLot(Stock s, GoodsReceipt r, GoodsReceiptDetail lot)
        {
            r.Details.Add(lot);
            if (lot.Status != LotStatus.Normal) return;
            s.Lots.Add((lot, r.ApprovedAt!.Value, new Queue<StockItem>(lot.Items)));
            s.Available += lot.Quantity;
            if (s.FirstData is null || r.ReceiptDate < s.FirstData) s.FirstData = r.ReceiptDate;
        }

        // ---- kiemTraCanhBao + kiemTraDeXuat: ReplenishmentService.Evaluate on the simulated stock ----
        var plans = new List<(ReplenishmentProposal R, Stock S, int Day, Plan Plan)>();
        var arrivals = new List<Arrival>();
        var proposalNo = 0;
        var reports = new List<ReplenishmentReport>();
        int Cover(Stock s, int days) => (int)Math.Round(s.P.D * days);
        var reportSuppliers = new Dictionary<ReplenishmentReport, HashSet<string>>();

        // A report made by the manager; its content is rebuilt from the proposals when printed (Snapshot left empty).
        ReplenishmentReport NewReport(DateTime at)
        {
            var x = new ReplenishmentReport { CreatedAt = at, Creator = manager };
            reports.Add(x);
            reportSuppliers[x] = [];
            return x;
        }
        void AddToReport(ReplenishmentReport x, ReplenishmentProposal r, Stock s, DateTime at)
        {
            r.Status = ProposalStatus.Reported;
            r.Approver = manager;
            r.ApprovedAt = at;
            r.Report = x;
            x.Proposals.Add(r);
            x.ProposalCount++;
            x.TotalQuantity += r.ProposedQuantity;
            reportSuppliers[x].Add(s.P.Sup);
            x.SupplierCount = reportSuppliers[x].Count;
        }

        void Check(Stock s, DateTime t)
        {
            var open = s.Proposals.Where(r => r.Status is ProposalStatus.Pending or ProposalStatus.Reported or ProposalStatus.Rejected).ToList();
            var outcome = ReplenishmentService.Evaluate(s.Policy, s.Available, s.Ordered, s.Alert, open, t, ReplenishmentRules.WeekStart(t));
            if (s.Alert?.Status == AlertStatus.Closed) s.Alert = null;
            if (outcome.NewAlert is { } alert)
            {
                alert.Product = s.Product;
                db.StockAlerts.Add(alert);
                s.Alert = alert;
            }
            if (outcome.NewProposal is { } r)
            {
                r.Product = s.Product;
                db.ReplenishmentProposals.Add(r);
                s.Proposals.Add(r);
                var plan = Script[proposalNo++ % Script.Length];
                plans.Add((r, s, DayOf(t), plan));
                if (plan.Act == Act.Ignore) arrivals.Add(new(DayOf(t) + plan.Follow, s.P, Cover(s, plan.Cover), "Hàng của đơn đặt định kỳ với nhà cung cấp"));
            }
        }

        // ---- tinhToanROP_DinhKy + tinhToanEOQ_DinhKy, as ReplenishmentService.RecalculateAsync ----
        void Recalculate(DateTime t)
        {
            var (from, to) = ReplenishmentService.DemandWindow(t);
            var slowFrom = to.AddDays(-ReplenishmentRules.SlowMovingDays);
            foreach (var s in stock.Values)
            {
                var pol = s.Policy;
                pol.LastROPCalculatedAt = t;
                pol.LastEOQCalculatedAt = t;
                var state = s.FirstData is not { } first || first > from ? DemandState.InsufficientData
                    : !s.Demand.Any(x => x.OrderDate >= slowFrom && x.OrderDate < t) ? DemandState.SlowMoving : DemandState.Normal;
                ReplenishmentService.Apply(pol, state, ReplenishmentService.DailyDemand(s.Demand, from));
            }
            foreach (var s in stock.Values) Check(s, t);
        }

        int Changed(Stock s, ReplenishmentProposal r, Change change)
        {
            var q = r.OriginalQuantity;
            return change switch
            {
                Change.Space when s.Policy.AvgDailyDemand is { } d && Math.Round(d * 21 / 10) * 10 < q => (int)(Math.Round(d * 21 / 10) * 10),
                Change.Peak => (int)Math.Ceiling(q * 1.3 / 10) * 10,
                _ => q % 50 == 0 ? q + 50 : (q / 50 + 1) * 50,
            };
        }
        string ChangeReason(Stock s, Change change, int qty, int original) => change switch
        {
            Change.Space when qty < original => "Kệ chứa chỉ còn chỗ cho khoảng 3 tuần hàng.",
            Change.Peak => "Sắp vào mùa cưới cuối năm, đặt thêm khoảng 30%.",
            _ => $"Làm tròn theo thùng 50 {s.P.Unit}.",
        };

        // ---- Orders ----
        var orderNo = 0;
        var issues = new List<GoodsIssue>();
        GoodsReceiptDetail? defect = null;

        // The day's orders: products split across two customers, received the afternoon before, issued 09:00–15:00.
        var planned = new List<Planned>();
        for (var day = -HistoryDays; day < 0; day++)
        {
            var i = day + HistoryDays;
            var skus = Catalog.Select(p => p.Sku).Where(s => demand[s][i] > 0).OrderBy(_ => rnd.Next()).ToList();
            if (skus.Count == 0) continue;
            foreach (var group in skus.Chunk((skus.Count + 1) / 2).Where(g => g.Length > 0))
            {
                var issueUtc = At(day, 9 + rnd.Next(6), rnd.Next(4) * 15);
                planned.Add(new(issueUtc.AddHours(-20), issueUtc, Customers[rnd.Next(Customers.Length)].Name, null,
                    group.Select(sku => (sku, demand[sku][i])).ToList()));
            }
        }

        // Received from the sales system: the order now holds stock (Q8) and counts as demand (Q1).
        void Receive(Planned o, DateTime t)
        {
            o.Order = WithContact(new Order
            {
                ExternalCode = $"DH-{VnTime.Yymm(o.OrderUtc)}-{++orderNo:D4}", CustomerName = o.Customer, Note = o.Note,
                OrderDate = o.OrderUtc, Status = OrderStatus.Open,
            });
            foreach (var (sku, qty) in o.Lines)
            {
                var s = stock[sku];
                o.Order.Details.Add(new OrderDetail { Product = s.Product, Quantity = qty });
                s.Ordered += qty;
                s.Demand.Add((o.OrderUtc, qty));
                if (s.FirstData is null || o.OrderUtc < s.FirstData) s.FirstData = o.OrderUtc;
            }
            db.Orders.Add(o.Order);
            foreach (var sku in o.Lines.Select(l => l.Sku).Distinct()) Check(stock[sku], t);
        }

        // A supplier delivery: one receipt, approved an hour later.
        void Supply(string sup, DateTime arrive, string note, List<(P P, int Qty)> goods)
        {
            var r = ReceiptFor(sup, arrive, note);
            var before = r.Details.Count;
            foreach (var (p, qty) in goods)
            {
                var s = stock[p.Sku];
                if (p.Sku == "THT-01" && defect is null && qty > 24)
                {
                    // UC_04: 12 boards of this delivery failed QC. They became a separate lot on the same receipt,
                    // the abnormal report was approved and the lot is locked ("Đã khóa").
                    AddLot(s, r, NewLot(p, qty - 12, arrive));
                    defect = NewLot(p, 12, arrive, LotStatus.Locked);
                    defect.Note = "Nứt mặt thớt khi sấy";
                    AddLot(s, r, defect);
                }
                else AddLot(s, r, NewLot(p, qty, arrive));
            }
            foreach (var s in goods.Select(g => stock[g.P.Sku]).Distinct())
            {
                Check(s, r.ApprovedAt!.Value);
            }
        }

        // Issued at IssueUtc (items taken FIFO across lots) and delivered two hours later. When the shelf cannot cover a line,
        // the supplier rushes a week of goods in before the issue ("Nhập gấp"), so every order of the history is delivered in full.
        void Deliver(Planned o)
        {
            var order = o.Order!;
            var shortages = o.Lines.Select(l => (S: stock[l.Sku], Missing: l.Qty - stock[l.Sku].Lots.Where(x => x.At <= o.IssueUtc).Sum(x => x.Free.Count)))
                .Where(x => x.Missing > 0).ToList();
            foreach (var g in shortages.GroupBy(x => x.S.P.Sup))
                Supply(g.Key, o.IssueUtc.AddHours(-2), "Nhập gấp vì không đủ hàng giao đơn", g.Select(x => (x.S.P, x.Missing + Cover(x.S, 7))).ToList());
            var delivered = o.IssueUtc.AddHours(2);
            var issue = new GoodsIssue
            {
                Order = order, IssueDate = o.IssueUtc, Creator = rnd.Next(2) == 0 ? staff1 : staff2, Approver = manager,
                ApprovedAt = o.IssueUtc.AddMinutes(30), Status = IssueStatus.Issued, ReceiverName = "Tài xế Nguyễn Văn Bình",
                DeliveredAt = delivered, DeliveredBy = null,
            };
            foreach (var (sku, qty) in o.Lines)
            {
                var s = stock[sku];
                s.Ordered -= qty;
                var detail = new GoodsIssueDetail { Product = s.Product };
                var need = qty;
                foreach (var (lot, _, free) in s.Lots.Where(x => x.At <= o.IssueUtc))
                {
                    if (need == 0) break;
                    var take = Math.Min(need, free.Count);
                    for (var k = 0; k < take; k++)
                    {
                        var item = free.Dequeue();
                        item.Status = ItemStatus.Issued;
                        item.PickedAt = o.IssueUtc.AddMinutes(60);
                        detail.Items.Add(item);
                    }
                    lot.QuantityOnHand -= take;
                    need -= take;
                }
                detail.Quantity = detail.Items.Count;
                if (detail.Quantity == 0) continue;
                issue.Details.Add(detail);
                s.Available -= detail.Quantity;
            }
            order.Status = OrderStatus.Issued;
            if (issue.Details.Count > 0)
            {
                db.GoodsIssues.Add(issue);
                issues.Add(issue);
            }
            foreach (var sku in o.Lines.Select(l => l.Sku).Distinct()) Check(stock[sku], delivered);
        }

        // Wholesale lines: the quantity that takes net stock to the line's target priority.
        List<(string, int)> WholesaleLines((string Sku, Target Target)[] lines)
        {
            var wanted = new List<(string, int)>();
            foreach (var (sku, target) in lines)
            {
                var s = stock[sku];
                if (s.Policy.CurrentROP is not { } rop || s.Policy.AvgDailyDemand is not { } d || d <= 0) continue;
                var net = s.Available - s.Ordered;
                var goal = target switch
                {
                    Target.Urgent => (int)Math.Floor(d * s.P.Lead) - 2,
                    Target.Order => (int)Math.Floor(rop) - 1,
                    _ => (int)Math.Floor(rop + 3 * d),
                };
                if (goal > 0 && net > goal) wanted.Add((sku, net - goal));
            }
            return wanted;
        }

        // ---- The days: every event in time order ----
        var opening = At(-HistoryDays, 7);
        foreach (var group in Catalog.Where(p => p.First == -HistoryDays).GroupBy(p => p.Sup))
        {
            var r = ReceiptFor(group.Key, opening, "Nhập tồn đầu kỳ khi bắt đầu dùng hệ thống");
            foreach (var p in group) AddLot(stock[p.Sku], r, NewLot(p, (int)Math.Round(p.D * p.Open), opening));
        }
        foreach (var p in Catalog.Where(p => p.First > -HistoryDays))
            arrivals.Add(new(p.First, p, (int)Math.Round(p.D * p.Open), "Nhập lô đầu tiên của mặt hàng mới"));

        for (var day = -HistoryDays; day <= 0; day++)
        {
            var events = new List<(DateTime At, int Order, Action Run)>();
            var local = today.AddDays(day);
            if (local.DayOfWeek == DayOfWeek.Monday) events.Add((At(day, 2), 0, () => Recalculate(At(day, 2))));

            // 07:00: deliveries from suppliers; the receipt is approved at 08:00.
            var arrive = At(day, 7);
            var d0 = day;
            events.Add((arrive, 1, () =>
            {
                foreach (var group in arrivals.Where(a => a.Day == d0).GroupBy(a => a.P.Sup))
                    Supply(group.Key, arrive, group.First().Note, group.Select(a => (a.P, a.Qty)).ToList());
            }));

            // 08:30: the manager goes through the proposals that are due.
            events.Add((At(day, 8, 30), 2, () =>
            {
                var minute = 30;
                ReplenishmentReport? report = null;
                // Proposals due today; an urgent one is never left for later (not even in the last, unreviewed days).
                foreach (var (r, s, _, plan) in plans.Where(x => x.Plan.Act != Act.Ignore && x.R.Status == ProposalStatus.Pending
                             && (x.Day + x.Plan.After == d0 || (x.R.Priority == Priority.Urgent && x.Day < d0))).ToList())
                {
                    var at = At(d0, 8, minute++);
                    if (at >= reviewUntil && r.Priority != Priority.Urgent) continue;
                    r.Approver = manager;
                    r.ApprovedAt = at;
                    if (plan.Act == Act.Reject)
                    {
                        r.Status = ProposalStatus.Rejected;
                        r.RejectReason = plan.Reason;
                        arrivals.Add(new(d0 + plan.Follow, s.P, Cover(s, plan.Cover), "Hàng đặt gộp theo lịch giao của nhà cung cấp"));
                        continue;
                    }
                    if (plan.Act == Act.Adjust)
                    {
                        r.ProposedQuantity = Changed(s, r, plan.Change);
                        r.AdjustReason = ChangeReason(s, plan.Change, r.ProposedQuantity, r.OriginalQuantity);
                    }
                    report ??= NewReport(At(d0, 8, 30));
                    AddToReport(report, r, s, at);
                    // Purchasing orders outside the system after the report; the goods come with the supplier's next delivery.
                    arrivals.Add(new(d0 + s.P.Lead, s.P, r.ProposedQuantity, "Hàng đặt theo báo cáo đề xuất bổ sung"));
                }
            }));

            // Orders received today (for tomorrow), and today's deliveries. Orders dated before the first day arrive with it.
            foreach (var o in planned.Where(o => DayOf(o.OrderUtc) == day || (day == -HistoryDays && DayOf(o.OrderUtc) < day)))
            {
                var at = DayOf(o.OrderUtc) < day ? At(day, 0) : o.OrderUtc;
                events.Add((at, 3, () => Receive(o, at)));
            }
            foreach (var o in planned.Where(o => DayOf(o.IssueUtc) == day)) events.Add((o.IssueUtc.AddHours(2), 4, () => Deliver(o)));

            foreach (var e in events.Where(e => e.At < utcNow).OrderBy(e => e.At).ThenBy(e => e.Order)) e.Run();
        }

        // Open orders from the sales system, waiting to be issued (UC_07): they lower net stock now (Q8).
        var openOrders = new (string customer, string? note, (string sku, int qty)[] lines)[]
        {
            ("Nhà hàng Mộc Gia", "Giao trước 10 giờ sáng, gọi trước khi tới.", [("THT-02", 12), ("MUO-01", 15), ("DUA-03", 8)]),
            ("Siêu thị Co.opmart Bình Dương", "Giao ở cổng nhận hàng phía sau, giờ hành chính.", [("DUA-01", 20), ("DUA-02", 10), ("KHA-02", 4)]),
            ("Khách sạn Lá Phong", null, [("KHA-01", 3), ("THT-03", 4), ("MUO-02", 5), ("MUO-03", 8)]),
        };
        foreach (var (customer, note, lines) in openOrders)
        {
            var at = utcNow.AddHours(-rnd.Next(4, 18));
            Receive(new Planned(at, at, customer, note, lines.Select(l => (l.sku, l.qty)).ToList()), utcNow);
        }
        foreach (var (customer, note, lines) in Wholesale)
        {
            var wanted = WholesaleLines(lines);
            var at = utcNow.AddHours(-rnd.Next(1, 3));
            if (wanted.Count > 0) Receive(new Planned(at, at, customer, note, wanted), utcNow);
        }

        // A customer cancelled an order before it was picked; the manager recorded it for the sales system. Not demand, not ordered.
        var cancelled = WithContact(new Order
        {
            ExternalCode = $"DH-{VnTime.Yymm(utcNow)}-{++orderNo:D4}", CustomerName = "Đại lý Thanh Tâm Thủ Đức", OrderDate = utcNow.AddHours(-20),
            Status = OrderStatus.Cancelled, CancelReason = "Khách đổi sang mẫu khác, sẽ đặt đơn mới.", CancelledAt = utcNow.AddHours(-3), Canceller = manager,
        });
        cancelled.Details.Add(new OrderDetail { Product = stock["THT-01"].Product, Quantity = 6 });
        cancelled.Details.Add(new OrderDetail { Product = stock["DUA-02"].Product, Quantity = 10 });
        db.Orders.Add(cancelled);

        // This morning the manager put the proposal that had waited longest in a report, so there is always a recent one.
        var waiting = stock.Values.Select(s => s.Pending).OfType<ReplenishmentProposal>().OrderBy(r => r.ProposalDate).ToList();
        if (waiting.Count >= 3 && !reports.Any(x => x.CreatedAt >= At(-1, 0)))
        {
            var r = waiting[0];
            var at = At(0, 8, 30) < utcNow ? At(0, 8, 30) : At(-1, 16, 30);
            AddToReport(NewReport(at), r, stock.Values.Single(x => x.Pending == r), at);
        }

        // The manager has started on one of the waiting proposals: a changed quantity, not approved yet.
        var started = stock.Values.Where(s => s.Pending is { Priority: Priority.Order }).Select(s => s.Pending!)
            .OrderByDescending(r => r.ProposalDate).FirstOrDefault();
        if (started is not null)
        {
            var s = stock.Values.Single(x => x.Pending == started);
            started.ProposedQuantity = Changed(s, started, Change.Case);
            started.AdjustReason = ChangeReason(s, Change.Case, started.ProposedQuantity, started.OriginalQuantity);
        }

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
        foreach (var gi in issues.OrderBy(x => x.IssueDate)) gi.Code = Next(CodeGenerator.Issue, gi.IssueDate);
        foreach (var x in reports.OrderBy(x => x.CreatedAt)) x.Code = Next(CodeGenerator.Replenishment, x.CreatedAt);
        db.ReplenishmentReports.AddRange(reports);

        if (defect is not null)
        {
            var at = receipts.Single(r => r.Details.Contains(defect)).ReceiptDate;
            db.AbnormalReports.Add(new AbnormalReport
            {
                Code = Next(CodeGenerator.Abnormal, at.AddHours(1)), ReceiptDetail = defect, SourceType = AbnormalSource.Receipt,
                Description = "Nứt mặt thớt khi sấy, 12 cái không đạt kiểm định", Quantity = 12, Creator = staff1,
                CreatedAt = at.AddMinutes(20), Approver = manager, ApprovedAt = at.AddMinutes(50), Status = ApprovalStatus.Approved, Scope = ReportScope.Lot,
                Items = defect.Items.Select(i => new AbnormalReportItem { Item = i }).ToList(),
            });
        }

        await db.SaveChangesAsync();
    }
}
