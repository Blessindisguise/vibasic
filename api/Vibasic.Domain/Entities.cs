namespace Vibasic.Domain;

// Tables follow the class diagram in Chương 3 (Hình 3.10): a lot is a goods-receipt detail line, there is no StockLot table.
// Columns not in the report are marked "// + ext" and listed in docs/schema-changes.md.

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

#region Sản phẩm trong lô

public class StockItem
{
    public int ItemId { get; set; }
    public int ReceiptDetailId { get; set; }
    /// <summary>The lot (receipt detail line) the item belongs to.</summary>
    public GoodsReceiptDetail ReceiptDetail { get; set; } = null!;
    public string SerialCode { get; set; } = "";
    public ItemStatus Status { get; set; }
    public int? IssueDetailId { get; set; }
    public GoodsIssueDetail? IssueDetail { get; set; }
    /// <summary>Scanned during picking (UC_08 step 2). // + ext</summary>
    public DateTime? PickedAt { get; set; }
    /// <summary>When the item was set aside as defective (status "Lỗi"). Kept after a repair, so stock movements show both steps. // + ext</summary>
    public DateTime? DefectiveAt { get; set; }
    /// <summary>When its abnormal report was handled for this item: it left the warehouse ("Đã loại bỏ") or came back repaired. // + ext</summary>
    public DateTime? HandledAt { get; set; }
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
    /// <summary>Số chứng từ giao hàng của nhà cung cấp. // + ext</summary>
    public string? DeliveryNoteNo { get; set; }
    public List<GoodsReceiptDetail> Details { get; set; } = [];
}

/// <summary>
/// One line of a receipt = one lot. Passed goods form a "Bình thường" lot; failed goods of the same product form a
/// separate "Tạm cách ly" lot (UC_04). FIFO order: Receipt.ReceiptDate, then ReceiptDetailId.
/// </summary>
public class GoodsReceiptDetail
{
    public int ReceiptDetailId { get; set; }
    public int ReceiptId { get; set; }
    public GoodsReceipt Receipt { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    /// <summary>Barcode label of the lot, LOT-yymm-nnn. // + ext</summary>
    public string LotCode { get; set; } = "";
    /// <summary>Quantity received into this lot.</summary>
    public int Quantity { get; set; }
    /// <summary>0 until the receipt is approved, then reduced by issues and stocktake adjustments.</summary>
    public int QuantityOnHand { get; set; }
    public LotStatus Status { get; set; }
    /// <summary>Quantity on the supplier's delivery note, when it differs. // + ext</summary>
    public int? DocumentQuantity { get; set; }
    public string? Note { get; set; }                      // + ext
    public List<StockItem> Items { get; set; } = [];
}

#endregion

#region Xuất kho

public class Order
{
    public int OrderId { get; set; }
    public string ExternalCode { get; set; } = "";
    public string? CustomerName { get; set; }              // + ext
    public string? CustomerPhone { get; set; }             // + ext (giao hàng)
    public string? ShippingAddress { get; set; }           // + ext
    public string? Note { get; set; }                      // + ext
    public DateTime OrderDate { get; set; }
    public OrderStatus Status { get; set; }
    public List<OrderDetail> Details { get; set; } = [];
    /// <summary>"Đã hủy": why, when and by whom. // + ext</summary>
    public string? CancelReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public int? CancelledBy { get; set; }
    public User? Canceller { get; set; }
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
    public IssueStatus Status { get; set; }
    /// <summary>Why the issue was cancelled ("Đã hủy"). // + ext</summary>
    public string? CancelReason { get; set; }
    /// <summary>Who took the goods at the warehouse: the driver or the customer collecting them (biên bản giao hàng). // + ext</summary>
    public string? ReceiverName { get; set; }
    /// <summary>Phone of the receiver, to reach the driver while the goods are on the road. // + ext</summary>
    public string? ReceiverPhone { get; set; }
    /// <summary>Biển số xe chở hàng, e.g. 29C-123.45. Empty when the customer collects without a vehicle. // + ext</summary>
    public string? VehiclePlate { get; set; }
    public DateTime? DeliveredAt { get; set; }             // + ext
    public int? DeliveredBy { get; set; }                  // + ext
    /// <summary>Staff member who claimed the issue for picking; only they may scan, report defects and deliver.</summary>
    public int? PickerId { get; set; }                     // + ext
    public User? Picker { get; set; }
    public DateTime? PickStartedAt { get; set; }           // + ext
    /// <summary>Last claim/scan by the picker; after the timeout another staff member may take the issue over.</summary>
    public DateTime? PickActiveAt { get; set; }            // + ext
    public List<GoodsIssueDetail> Details { get; set; } = [];
}

public class GoodsIssueDetail
{
    public int IssueDetailId { get; set; }
    public int IssueId { get; set; }
    public GoodsIssue Issue { get; set; } = null!;
    /// <summary>One line per product; its items may come from several lots (UC_07 4.1).</summary>
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
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
    public int ReceiptDetailId { get; set; }
    public GoodsReceiptDetail ReceiptDetail { get; set; } = null!;
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
    public int ReceiptDetailId { get; set; }
    public GoodsReceiptDetail ReceiptDetail { get; set; } = null!;
    public int SystemQuantity { get; set; }
    public int ActualQuantity { get; set; }
    public string? Reason { get; set; }
    /// <summary>When the lot was counted; the system quantity is the shelf quantity at that moment. // + ext</summary>
    public DateTime? CountedAt { get; set; }
    public CountMethod Method { get; set; }
    /// <summary>Counted by scanning: items found without a readable label (counted, get new codes on approval). // + ext</summary>
    public int UnlabeledQuantity { get; set; }
    /// <summary>Counted by scanning: the items whose labels were scanned. Empty when the count was typed in. // + ext</summary>
    public List<StocktakeItem> Items { get; set; } = [];
}

/// <summary>An item scanned while counting a lot (K4). // + ext table</summary>
public class StocktakeItem
{
    public int StocktakeItemId { get; set; }
    public int DetailId { get; set; }
    public StocktakeDetail Detail { get; set; } = null!;
    public int ItemId { get; set; }
    public StockItem Item { get; set; } = null!;
}

#endregion

#region Biên bản bất thường

public class AbnormalReport
{
    public int ReportId { get; set; }
    public string Code { get; set; } = "";                 // + ext
    public int ReceiptDetailId { get; set; }
    public GoodsReceiptDetail ReceiptDetail { get; set; } = null!;
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
    /// <summary>Only the listed items, or the whole lot. The manager may change it when approving. // + ext</summary>
    public ReportScope Scope { get; set; } = ReportScope.Lot;
    /// <summary>The defective items (for a report raised at receiving: every item of the failed lot). // + ext</summary>
    public List<AbnormalReportItem> Items { get; set; } = [];
    /// <summary>Hướng xử lý chosen by the manager on approval. // + ext</summary>
    public HandlingMethod? HandlingMethod { get; set; }
    /// <summary>Mô tả hướng xử lý: proposed by staff when filing (optional), settled by the manager on approval. // + ext</summary>
    public string? HandlingPlan { get; set; }
    /// <summary>Set once approved: Chờ xử lý → Đang xử lý (a staff member took it) → Đã xử lý. // + ext</summary>
    public HandlingStatus? HandlingStatus { get; set; }
    /// <summary>Staff member handling the report. // + ext</summary>
    public int? HandledBy { get; set; }
    public User? Handler { get; set; }
    public DateTime? HandlingStartedAt { get; set; }       // + ext
    /// <summary>When the handling was done and stock updated. // + ext</summary>
    public DateTime? HandledAt { get; set; }
}

/// <summary>An item listed on an abnormal report. // + ext table</summary>
public class AbnormalReportItem
{
    public int ReportItemId { get; set; }
    public int ReportId { get; set; }
    public AbnormalReport Report { get; set; } = null!;
    public int ItemId { get; set; }
    public StockItem Item { get; set; } = null!;
}

#endregion

#region Hỗ trợ ra quyết định

public class InventoryPolicy
{
    public int PolicyId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int LeadTimeDays { get; set; }
    /// <summary>Q4: SS = z × σ × √L, calculated weekly (no longer entered). Null while ROP cannot be calculated. // changed</summary>
    public decimal? SafetyStock { get; set; }
    public decimal OrderingCost { get; set; }
    /// <summary>Per unit per year.</summary>
    public decimal HoldingCost { get; set; }
    public decimal? CurrentROP { get; set; }
    public decimal? CurrentEOQ { get; set; }
    /// <summary>d used for the current ROP: ordered quantity of the last 4 weeks ÷ 28 (Q2). // + ext</summary>
    public decimal? AvgDailyDemand { get; set; }
    /// <summary>σ of daily demand over the last 4 weeks (Q2). // + ext</summary>
    public decimal? DemandStdDev { get; set; }
    /// <summary>Q3: Chưa đủ dữ liệu / Hàng chậm luân chuyển get no ROP, EOQ or proposal. // + ext</summary>
    public DemandState DemandState { get; set; }
    public DateTime? LastROPCalculatedAt { get; set; }
    public DateTime? LastEOQCalculatedAt { get; set; }
}

public class StockAlert
{
    public int AlertId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    /// <summary>Net stock (tồn ròng, Q8) at the last check.</summary>
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
    /// <summary>Available stock and ROP the proposal was based on: refreshed while pending, frozen once decided or closed. // + ext</summary>
    public int AvailableQuantity { get; set; }
    public decimal ROPValue { get; set; }                  // + ext
    /// <summary>Net stock (Q8) and d of the basis, the Q13 quantity and why it was cut to the 12-week cap (Q15–Q16). // + ext</summary>
    public int NetQuantity { get; set; }
    public decimal? AvgDailyDemand { get; set; }
    public int BaseQuantity { get; set; }
    public string? AdjustBasis { get; set; }
    /// <summary>Q12 priority (Urgent or Order) at the last update. // + ext</summary>
    public Priority Priority { get; set; } = Priority.Order;
    public DateTime ProposalDate { get; set; }
    /// <summary>Who decided and when: put in a report ("Đã lập báo cáo") or left out ("Không đề xuất").</summary>
    public int? ApprovedBy { get; set; }
    public User? Approver { get; set; }
    public DateTime? ApprovedAt { get; set; }              // + ext
    public ProposalStatus Status { get; set; }
    /// <summary>System quantity (Q13, Q15) before the manager edited it. // + ext</summary>
    public int OriginalQuantity { get; set; }
    public string? AdjustReason { get; set; }              // + ext
    public string? RejectReason { get; set; }              // + ext
    /// <summary>The report this proposal went into. // + ext</summary>
    public int? ReportId { get; set; }
    public ReplenishmentReport? Report { get; set; }
}

/// <summary>
/// Báo cáo đề xuất bổ sung hàng (Q17–Q19), made by the manager from the proposals ticked on the Đề xuất screen. The system stops
/// here: what to buy, how much and when is decided outside it. The content is kept as made so it prints the same again. // + ext
/// </summary>
public class ReplenishmentReport
{
    public int ReportId { get; set; }
    /// <summary>DX-yymm-nnnn.</summary>
    public string Code { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public int CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    public int ProposalCount { get; set; }
    public int SupplierCount { get; set; }
    public int TotalQuantity { get; set; }
    /// <summary>The report as made (JSON): supplier groups, proposal lines and "Theo dõi" lines with their figures.</summary>
    public string Snapshot { get; set; } = "";
    public List<ReplenishmentProposal> Proposals { get; set; } = [];
}

#endregion

