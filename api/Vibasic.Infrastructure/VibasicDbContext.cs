using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;

namespace Vibasic.Infrastructure;

public class VibasicDbContext(DbContextOptions<VibasicDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StockItem> StockItems => Set<StockItem>();
    public DbSet<GoodsReceipt> GoodsReceipts => Set<GoodsReceipt>();
    public DbSet<GoodsReceiptDetail> GoodsReceiptDetails => Set<GoodsReceiptDetail>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderDetail> OrderDetails => Set<OrderDetail>();
    public DbSet<GoodsIssue> GoodsIssues => Set<GoodsIssue>();
    public DbSet<GoodsIssueDetail> GoodsIssueDetails => Set<GoodsIssueDetail>();
    public DbSet<StocktakePlan> StocktakePlans => Set<StocktakePlan>();
    public DbSet<StocktakePlanDetail> StocktakePlanDetails => Set<StocktakePlanDetail>();
    public DbSet<Stocktake> Stocktakes => Set<Stocktake>();
    public DbSet<StocktakeDetail> StocktakeDetails => Set<StocktakeDetail>();
    public DbSet<StocktakeItem> StocktakeItems => Set<StocktakeItem>();
    public DbSet<AbnormalReport> AbnormalReports => Set<AbnormalReport>();
    public DbSet<AbnormalReportItem> AbnormalReportItems => Set<AbnormalReportItem>();
    public DbSet<InventoryPolicy> InventoryPolicies => Set<InventoryPolicy>();
    public DbSet<StockAlert> StockAlerts => Set<StockAlert>();
    public DbSet<ReplenishmentProposal> ReplenishmentProposals => Set<ReplenishmentProposal>();
    public DbSet<ReplenishmentReport> ReplenishmentReports => Set<ReplenishmentReport>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        b.Properties<decimal>().HavePrecision(18, 2);
        // datetime2 has no time zone; every value is stored in UTC, so mark it UTC on the way out.
        // Otherwise JSON omits the "Z" and browsers read the time as local (7 hours off in Vietnam).
        b.Properties<DateTime>().HaveColumnType("datetime2").HaveConversion<UtcDateTimeConverter>();
        b.Properties<DateTime?>().HaveColumnType("datetime2").HaveConversion<UtcDateTimeConverter>();
        // Every status enum is persisted as its Vietnamese label in nvarchar(20).
        foreach (var t in typeof(LabelAttribute).Assembly.GetTypes().Where(t => t.IsEnum))
        {
            var conv = typeof(LabelConverter<>).MakeGenericType(t);
            b.Properties(t).HaveConversion(conv).HaveMaxLength(20);
        }
    }

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<User>(e =>
        {
            e.ToTable("User").HasKey(x => x.UserId);
            e.Property(x => x.Username).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.PasswordHash).HasMaxLength(255).IsRequired();
            e.Property(x => x.FullName).HasMaxLength(100).IsRequired();
            e.Property(x => x.IsActive).HasDefaultValue(true);
        });
        m.Entity<ProductCategory>(e =>
        {
            e.ToTable("ProductCategory").HasKey(x => x.CategoryId);
            e.Property(x => x.CategoryName).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.CategoryName).IsUnique();
            e.Property(x => x.Description).HasMaxLength(255);
        });
        m.Entity<Supplier>(e =>
        {
            e.ToTable("Supplier").HasKey(x => x.SupplierId);
            e.Property(x => x.SupplierName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Address).HasMaxLength(255);
        });
        m.Entity<Product>(e =>
        {
            e.ToTable("Product").HasKey(x => x.ProductId);
            e.Property(x => x.SKU).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.SKU).IsUnique();
            e.Property(x => x.ProductName).HasMaxLength(150).IsRequired();
            e.Property(x => x.Unit).HasMaxLength(20).IsRequired();
            e.HasOne(x => x.Supplier).WithMany().HasForeignKey(x => x.SupplierId);
            e.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId);
        });
        m.Entity<StockItem>(e =>
        {
            e.ToTable("StockItem").HasKey(x => x.ItemId);
            e.Property(x => x.SerialCode).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.SerialCode).IsUnique();
            e.HasOne(x => x.ReceiptDetail).WithMany(d => d.Items).HasForeignKey(x => x.ReceiptDetailId);
            e.HasOne(x => x.IssueDetail).WithMany(d => d.Items).HasForeignKey(x => x.IssueDetailId);
            // Two issues must not reserve the same item at once: the UPDATE only succeeds if nobody changed the link meanwhile.
            e.Property(x => x.IssueDetailId).IsConcurrencyToken();
        });
        m.Entity<GoodsReceipt>(e =>
        {
            e.ToTable("GoodsReceipt").HasKey(x => x.ReceiptId);
            e.Property(x => x.Code).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.RejectReason).HasMaxLength(255);
            e.Property(x => x.DeliveryNoteNo).HasMaxLength(50);
            e.Property(x => x.Note).HasMaxLength(255);
            e.HasOne(x => x.Supplier).WithMany().HasForeignKey(x => x.SupplierId);
            e.HasOne(x => x.Creator).WithMany().HasForeignKey(x => x.CreatedBy);
            e.HasOne(x => x.Approver).WithMany().HasForeignKey(x => x.ApprovedBy);
        });
        m.Entity<GoodsReceiptDetail>(e =>
        {
            e.ToTable("GoodsReceiptDetail").HasKey(x => x.ReceiptDetailId);
            e.Property(x => x.LotCode).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.LotCode).IsUnique();
            e.Property(x => x.QuantityOnHand).HasDefaultValue(0);
            e.HasIndex(x => new { x.ProductId, x.Status });
            e.Property(x => x.Note).HasMaxLength(255);
            e.HasOne(x => x.Receipt).WithMany(r => r.Details).HasForeignKey(x => x.ReceiptId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
        });
        m.Entity<Order>(e =>
        {
            e.ToTable("Order").HasKey(x => x.OrderId);
            e.Property(x => x.ExternalCode).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.ExternalCode).IsUnique();
            e.Property(x => x.CustomerName).HasMaxLength(150);
            e.Property(x => x.CustomerPhone).HasMaxLength(20);
            e.Property(x => x.ShippingAddress).HasMaxLength(300);
            e.Property(x => x.Note).HasMaxLength(500);
            e.Property(x => x.CancelReason).HasMaxLength(255);
            e.HasOne(x => x.Canceller).WithMany().HasForeignKey(x => x.CancelledBy).OnDelete(DeleteBehavior.Restrict);
            // Two staff opening an issue for the same order: only the first status change is saved.
            e.Property(x => x.Status).IsConcurrencyToken();
        });
        m.Entity<OrderDetail>(e =>
        {
            e.ToTable("OrderDetail").HasKey(x => x.OrderDetailId);
            e.HasOne(x => x.Order).WithMany(o => o.Details).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
        });
        m.Entity<GoodsIssue>(e =>
        {
            e.ToTable("GoodsIssue").HasKey(x => x.IssueId);
            e.Property(x => x.Code).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.RejectReason).HasMaxLength(255);
            e.Property(x => x.HoldReason).HasMaxLength(255);
            e.Property(x => x.ReceiverName).HasMaxLength(100);
            e.HasOne(x => x.Order).WithMany().HasForeignKey(x => x.OrderId);
            e.HasOne(x => x.Creator).WithMany().HasForeignKey(x => x.CreatedBy);
            e.HasOne(x => x.Approver).WithMany().HasForeignKey(x => x.ApprovedBy);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.DeliveredBy);
            e.HasOne(x => x.Picker).WithMany().HasForeignKey(x => x.PickerId);
            // Two staff claiming the same issue at once: the second save fails instead of silently taking it.
            e.Property(x => x.PickerId).IsConcurrencyToken();
        });
        m.Entity<GoodsIssueDetail>(e =>
        {
            e.ToTable("GoodsIssueDetail").HasKey(x => x.IssueDetailId);
            e.HasOne(x => x.Issue).WithMany(i => i.Details).HasForeignKey(x => x.IssueId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
            e.HasIndex(x => new { x.IssueId, x.ProductId }).IsUnique();
        });
        m.Entity<StocktakePlan>(e =>
        {
            e.ToTable("StocktakePlan").HasKey(x => x.PlanId);
            e.Property(x => x.Code).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Note).HasMaxLength(255);
            e.HasOne(x => x.Creator).WithMany().HasForeignKey(x => x.CreatedBy);
        });
        m.Entity<StocktakePlanDetail>(e =>
        {
            e.ToTable("StocktakePlanDetail").HasKey(x => x.PlanDetailId);
            e.HasOne(x => x.Plan).WithMany(p => p.Details).HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ReceiptDetail).WithMany().HasForeignKey(x => x.ReceiptDetailId);
        });
        m.Entity<Stocktake>(e =>
        {
            e.ToTable("Stocktake").HasKey(x => x.StocktakeId);
            e.Property(x => x.Code).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.RejectReason).HasMaxLength(255);
            e.HasOne(x => x.Plan).WithMany().HasForeignKey(x => x.PlanId);
            e.HasOne(x => x.Creator).WithMany().HasForeignKey(x => x.CreatedBy);
            e.HasOne(x => x.Approver).WithMany().HasForeignKey(x => x.ApprovedBy);
        });
        m.Entity<StocktakeDetail>(e =>
        {
            e.ToTable("StocktakeDetail").HasKey(x => x.DetailId);
            e.Property(x => x.Reason).HasMaxLength(255);
            e.Property(x => x.Method).HasDefaultValue(CountMethod.Manual);
            e.HasOne(x => x.Stocktake).WithMany(s => s.Details).HasForeignKey(x => x.StocktakeId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ReceiptDetail).WithMany().HasForeignKey(x => x.ReceiptDetailId);
        });
        m.Entity<StocktakeItem>(e =>
        {
            e.ToTable("StocktakeItem").HasKey(x => x.StocktakeItemId);
            e.HasOne(x => x.Detail).WithMany(d => d.Items).HasForeignKey(x => x.DetailId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Item).WithMany().HasForeignKey(x => x.ItemId);
            e.HasIndex(x => new { x.DetailId, x.ItemId }).IsUnique();
        });
        m.Entity<AbnormalReport>(e =>
        {
            e.ToTable("AbnormalReport").HasKey(x => x.ReportId);
            e.Property(x => x.Code).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Description).HasMaxLength(500).IsRequired();
            e.Property(x => x.RejectReason).HasMaxLength(255);
            e.HasOne(x => x.ReceiptDetail).WithMany().HasForeignKey(x => x.ReceiptDetailId);
            e.HasOne(x => x.Creator).WithMany().HasForeignKey(x => x.CreatedBy);
            e.HasOne(x => x.Approver).WithMany().HasForeignKey(x => x.ApprovedBy);
            e.HasOne<GoodsIssue>().WithMany().HasForeignKey(x => x.IssueId);
        });
        m.Entity<AbnormalReportItem>(e =>
        {
            e.ToTable("AbnormalReportItem").HasKey(x => x.ReportItemId);
            e.HasOne(x => x.Report).WithMany(r => r.Items).HasForeignKey(x => x.ReportId);
            e.HasOne(x => x.Item).WithMany().HasForeignKey(x => x.ItemId);
            e.HasIndex(x => new { x.ReportId, x.ItemId }).IsUnique();
        });
        m.Entity<InventoryPolicy>(e =>
        {
            e.ToTable("InventoryPolicy").HasKey(x => x.PolicyId);
            e.HasIndex(x => x.ProductId).IsUnique();
            e.Property(x => x.AvgDailyDemand).HasPrecision(18, 4);
            e.Property(x => x.DemandStdDev).HasPrecision(18, 4);
            e.HasOne(x => x.Product).WithOne(p => p.Policy).HasForeignKey<InventoryPolicy>(x => x.ProductId);
        });
        m.Entity<StockAlert>(e =>
        {
            e.ToTable("StockAlert").HasKey(x => x.AlertId);
            e.HasIndex(x => new { x.ProductId, x.Status });
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
        });
        m.Entity<ReplenishmentProposal>(e =>
        {
            e.ToTable("ReplenishmentProposal").HasKey(x => x.ProposalId);
            e.HasIndex(x => new { x.ProductId, x.Status });
            e.Property(x => x.AdjustReason).HasMaxLength(255);
            e.Property(x => x.RejectReason).HasMaxLength(255);
            e.Property(x => x.AdjustBasis).HasMaxLength(255);
            e.Property(x => x.AvgDailyDemand).HasPrecision(18, 4);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.Approver).WithMany().HasForeignKey(x => x.ApprovedBy);
            e.HasOne(x => x.Report).WithMany(r => r.Proposals).HasForeignKey(x => x.ReportId);
        });
        m.Entity<ReplenishmentReport>(e =>
        {
            e.ToTable("ReplenishmentReport").HasKey(x => x.ReportId);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Code).HasMaxLength(20);
            e.HasOne(x => x.Creator).WithMany().HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        });
        m.Entity<Notification>(e =>
        {
            e.ToTable("Notification").HasKey(x => x.NotificationId);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Message).HasMaxLength(500);
            e.Property(x => x.Link).HasMaxLength(200);
            e.Property(x => x.Tone).HasMaxLength(10);
            e.HasIndex(x => new { x.UserId, x.IsRead });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
        });

        // Documents reference users and lots (receipt detail lines) many times; never cascade-delete through them.
        // Only a detail row is deleted together with its parent document.
        var detailTables = new[] { typeof(GoodsReceiptDetail), typeof(OrderDetail), typeof(GoodsIssueDetail), typeof(StocktakePlanDetail), typeof(StocktakeDetail), typeof(StocktakeItem), typeof(AbnormalReportItem) };
        foreach (var fk in m.Model.GetEntityTypes().SelectMany(t => t.GetForeignKeys()))
        {
            var isDetailToParent = detailTables.Contains(fk.DeclaringEntityType.ClrType)
                && fk.PrincipalEntityType.ClrType != typeof(GoodsReceiptDetail) && fk.PrincipalEntityType.ClrType != typeof(Product)
                && fk.PrincipalEntityType.ClrType != typeof(StockItem);
            fk.DeleteBehavior = isDetailToParent ? DeleteBehavior.Cascade : DeleteBehavior.Restrict;
        }
    }
}
