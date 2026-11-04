namespace Vibasic.Domain;

// Tables follow Chương 3 §3.3.2. Columns not in the report are marked "// + ext" and listed in docs/schema-changes.md.

#region Danh mục

public class User
{
    public int UserId { get; set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string FullName { get; set; } = "";
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ProductCategory
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = "";
    public string? Description { get; set; }
}

public class Supplier
{
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = "";
    public string? Phone { get; set; }
    public string? Address { get; set; }
}

public class Product
{
    public int ProductId { get; set; }
    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public int CategoryId { get; set; }
    public ProductCategory Category { get; set; } = null!;
    public string SKU { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string Unit { get; set; } = "";
    public InventoryPolicy? Policy { get; set; }
}

#endregion

#region Tồn kho theo lô

public class StockLot
{
    public int LotId { get; set; }
    public string LotCode { get; set; } = "";
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    /// <summary>Determines FIFO order.</summary>
    public DateTime ReceivedDate { get; set; }
    public int QuantityOnHand { get; set; }
    public LotStatus Status { get; set; }
    public List<StockItem> Items { get; set; } = [];
}

public class StockItem
{
    public int ItemId { get; set; }
    public int LotId { get; set; }
    public StockLot Lot { get; set; } = null!;
    public string SerialCode { get; set; } = "";
    public ItemStatus Status { get; set; }
    public int? IssueDetailId { get; set; }
    public GoodsIssueDetail? IssueDetail { get; set; }
    /// <summary>Scanned during picking (UC_08 step 2). // + ext</summary>
    public DateTime? PickedAt { get; set; }
}

#endregion

#region Nhập kho

public class GoodsReceipt
{
    public int ReceiptId { get; set; }
    public string Code { get; set; } = "";                 // + ext
    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public DateTime ReceiptDate { get; set; }
    public int CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    public int? ApprovedBy { get; set; }
    public User? Approver { get; set; }
    public DateTime? SubmittedAt { get; set; }             // + ext
    public DateTime? ApprovedAt { get; set; }              // + ext
    public ReceiptStatus Status { get; set; }
    public string? RejectReason { get; set; }              // + ext
    public string? Note { get; set; }                      // + ext
    public List<GoodsReceiptDetail> Details { get; set; } = [];
}

public class GoodsReceiptDetail
{
    public int ReceiptDetailId { get; set; }
    public int ReceiptId { get; set; }
    public GoodsReceipt Receipt { get; set; } = null!;
    public int LotId { get; set; }
    public StockLot Lot { get; set; } = null!;
    public int Quantity { get; set; }
    public QcResult QcResult { get; set; }                 // + ext
    /// <summary>Quantity on the supplier's delivery note, when it differs. // + ext</summary>
    public int? DocumentQuantity { get; set; }
    public string? Note { get; set; }                      // + ext
}

#endregion

#region Xuất kho

public class Order
{
    public int OrderId { get; set; }
    public string ExternalCode { get; set; } = "";
    public string? CustomerName { get; set; }              // + ext
    public DateTime OrderDate { get; set; }
    public OrderStatus Status { get; set; }
    public List<OrderDetail> Details { get; set; } = [];
}

public class OrderDetail
{
    public int OrderDetailId { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Quantity { get; set; }
}

public class GoodsIssue
{
    public int IssueId { get; set; }
    public string Code { get; set; } = "";                 // + ext
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public DateTime IssueDate { get; set; }
    public int CreatedBy { get; set; }                     // + ext
    public User Creator { get; set; } = null!;
    public int? ApprovedBy { get; set; }
    public User? Approver { get; set; }
    public DateTime? ApprovedAt { get; set; }              // + ext
    public IssueStatus Status { get; set; }
    public string? RejectReason { get; set; }              // + ext
    public string? HoldReason { get; set; }                // + ext
    public string? ReceiverName { get; set; }              // + ext (biên bản giao hàng)
    public DateTime? DeliveredAt { get; set; }             // + ext
    public int? DeliveredBy { get; set; }                  // + ext
    public List<GoodsIssueDetail> Details { get; set; } = [];
}

public class GoodsIssueDetail
{
    public int IssueDetailId { get; set; }
    public int IssueId { get; set; }
    public GoodsIssue Issue { get; set; } = null!;
    public int LotId { get; set; }
    public StockLot Lot { get; set; } = null!;
    public int Quantity { get; set; }
    public List<StockItem> Items { get; set; } = [];
}

#endregion

#region Kiểm kê

public class StocktakePlan
{
    public int PlanId { get; set; }
    public string Code { get; set; } = "";                 // + ext
    public StocktakePlanType PlanType { get; set; }
    public StocktakeScope ScopeType { get; set; }
    public DateOnly PlannedDate { get; set; }
    public int CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    public StocktakePlanStatus Status { get; set; }
    public string? Note { get; set; }                      // + ext
    public List<StocktakePlanDetail> Details { get; set; } = [];
}

public class StocktakePlanDetail
{
    public int PlanDetailId { get; set; }
    public int PlanId { get; set; }
    public StocktakePlan Plan { get; set; } = null!;
    public int LotId { get; set; }
    public StockLot Lot { get; set; } = null!;
}

public class Stocktake
{
    public int StocktakeId { get; set; }
    public string Code { get; set; } = "";                 // + ext
    public int PlanId { get; set; }
    public StocktakePlan Plan { get; set; } = null!;
    public DateTime StocktakeDate { get; set; }
    public int CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    public int? ApprovedBy { get; set; }
    public User? Approver { get; set; }
    public DateTime? ApprovedAt { get; set; }              // + ext
    public ApprovalStatus Status { get; set; }
    public string? RejectReason { get; set; }              // + ext
    public List<StocktakeDetail> Details { get; set; } = [];
}

public class StocktakeDetail
{
    public int DetailId { get; set; }
    public int StocktakeId { get; set; }
    public Stocktake Stocktake { get; set; } = null!;
    public int LotId { get; set; }
    public StockLot Lot { get; set; } = null!;
    public int SystemQuantity { get; set; }
    public int ActualQuantity { get; set; }
    public string? Reason { get; set; }
}

#endregion

#region Biên bản bất thường

public class AbnormalReport
{
    public int ReportId { get; set; }
    public string Code { get; set; } = "";                 // + ext
    public int LotId { get; set; }
    public StockLot Lot { get; set; } = null!;
    public AbnormalSource SourceType { get; set; }
    public string Description { get; set; } = "";
    public int Quantity { get; set; }
    public int CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    public DateTime CreatedAt { get; set; }                // + ext
    public int? ApprovedBy { get; set; }
    public User? Approver { get; set; }
    public DateTime? ApprovedAt { get; set; }              // + ext
    public ApprovalStatus Status { get; set; }
    public string? RejectReason { get; set; }              // + ext
    /// <summary>Goods issue during which the defect was found, if any. // + ext</summary>
    public int? IssueId { get; set; }
}

#endregion

#region Hỗ trợ ra quyết định

public class InventoryPolicy
{
    public int PolicyId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int LeadTimeDays { get; set; }
    public int SafetyStock { get; set; }
    public decimal OrderingCost { get; set; }
    /// <summary>Per unit per year.</summary>
    public decimal HoldingCost { get; set; }
    public decimal? CurrentROP { get; set; }
    public decimal? CurrentEOQ { get; set; }
    /// <summary>d used for the current ROP (4 weeks ÷ 28). // + ext</summary>
    public decimal? AvgDailyDemand { get; set; }
    public DateTime? LastROPCalculatedAt { get; set; }
    public DateTime? LastEOQCalculatedAt { get; set; }
}

public class StockAlert
{
    public int AlertId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int CurrentQuantity { get; set; }
    public decimal ROPValue { get; set; }
    public DateTime AlertDate { get; set; }
    public AlertStatus Status { get; set; }
    public DateTime? ClosedAt { get; set; }                // + ext
}

public class ReplenishmentProposal
{
    public int ProposalId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int ProposedQuantity { get; set; }
    public decimal EOQValue { get; set; }
    public DateTime ProposalDate { get; set; }
    public int? ApprovedBy { get; set; }
    public User? Approver { get; set; }
    public DateTime? ApprovedAt { get; set; }              // + ext
    public ProposalStatus Status { get; set; }
    /// <summary>System quantity (EOQ) before the manager edited it. // + ext</summary>
    public int OriginalQuantity { get; set; }
    public string? AdjustReason { get; set; }              // + ext
    public string? RejectReason { get; set; }              // + ext
}

#endregion

/// <summary>In-app notification. // + ext (table not in the report)</summary>
public class Notification
{
    public int NotificationId { get; set; }
    /// <summary>Recipient. Role-wide notifications are fanned out to one row per active user.</summary>
    public int UserId { get; set; }
    public string Title { get; set; } = "";
    public string? Message { get; set; }
    public string? Link { get; set; }
    public string Tone { get; set; } = "info";
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }
}
