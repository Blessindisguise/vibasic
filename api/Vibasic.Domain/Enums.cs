namespace Vibasic.Domain;

/// <summary>
/// Vietnamese label persisted to the database (nvarchar(20)), matching the status values in Chương 3.
/// </summary>
[AttributeUsage(AttributeTargets.Field)]
public sealed class LabelAttribute(string text) : Attribute
{
    public string Text { get; } = text;
}

public enum UserRole
{
    [Label("Quản lý")] Manager,
    [Label("Nhân viên kho")] Staff,
}

public enum LotStatus
{
    [Label("Bình thường")] Normal,
    [Label("Tạm cách ly")] Quarantined,
    [Label("Đã khóa")] Locked,
}

public enum ItemStatus
{
    /// <summary>Created with a receipt that is not approved yet.</summary>
    [Label("Chờ nhập")] Incoming,
    [Label("Trong kho")] InStock,
    /// <summary>Reserved by a goods issue (FIFO allocation).</summary>
    [Label("Đã giữ chỗ")] Reserved,
    [Label("Đã xuất")] Issued,
    /// <summary>Missing at stocktake; removed from stock when the stocktake is approved (UC_15 step 7).</summary>
    [Label("Thất thoát")] Lost,
    /// <summary>Listed on an abnormal report: set aside, out of stock on hand, never allocated. Back to "Trong kho" if the report is rejected. // + ext</summary>
    [Label("Lỗi")] Defective,
}

/// <summary>What an abnormal report takes out of stock. // + ext</summary>
public enum ReportScope
{
    /// <summary>Only the listed items; the rest of the lot stays issuable.</summary>
    [Label("Sản phẩm lỗi")] Items,
    /// <summary>The whole lot: quarantined while pending, locked once approved (Chương 3).</summary>
    [Label("Cả lô")] Lot,
}

public enum ReceiptStatus
{
    [Label("Đang nhập kho")] Receiving,
    [Label("Chờ duyệt")] Pending,
    [Label("Đã duyệt")] Approved,
    [Label("Từ chối")] Rejected,
}

public enum OrderStatus
{
    [Label("Chưa xuất")] Open,
    [Label("Chờ xử lý")] OnHold,
    [Label("Đang xuất")] InProgress,
    [Label("Đã xuất")] Issued,
    /// <summary>The customer cancelled: the manager (for the sales system) cancels it with a reason; no longer counts as ordered. // + ext</summary>
    [Label("Đã hủy")] Cancelled,
}

public enum IssueStatus
{
    /// <summary>Created from an order with its FIFO items reserved; no approval step. // + ext</summary>
    [Label("Chờ lấy hàng")] Ready,
    /// <summary>Ended without delivery, items released (reason in CancelReason): the order was cancelled, or no replacement was left (UC_08 3.2). // + ext</summary>
    [Label("Đã hủy")] Cancelled,
    [Label("Đã xuất")] Issued,
}

public enum StocktakePlanType
{
    [Label("Định kỳ")] Periodic,
    [Label("Chỉ định")] AdHoc,
}

public enum StocktakeScope
{
    [Label("Toàn bộ kho")] Warehouse,
    [Label("Một số lô")] SelectedLots,
}

/// <summary>How a lot was counted (K4). // + ext</summary>
public enum CountMethod
{
    [Label("Nhập số")] Manual,
    [Label("Quét tem")] Scan,
}

public enum StocktakePlanStatus
{
    [Label("Chờ thực hiện")] Waiting,
    [Label("Đang kiểm kê")] InProgress,
    [Label("Hoàn thành")] Done,
}

public enum ApprovalStatus
{
    [Label("Chờ duyệt")] Pending,
    [Label("Đã duyệt")] Approved,
    [Label("Từ chối")] Rejected,
}

public enum AbnormalSource
{
    [Label("Nhập kho")] Receipt,
    [Label("Xuất kho")] Issue,
    [Label("Kiểm kê")] Stocktake,
}

public enum AlertStatus
{
    [Label("Đang mở")] Open,
    [Label("Đã đóng")] Closed,
}

/// <summary>
/// A proposal is only a suggestion: the manager reviews it, then puts it in a report for whoever buys the goods, or leaves it out.
/// The system does not follow the purchase after that.
/// </summary>
public enum ProposalStatus
{
    [Label("Chờ xem xét")] Pending,
    [Label("Đã lập báo cáo")] Reported,
    [Label("Không đề xuất")] Rejected,
    /// <summary>Closed by the system while waiting for review: net stock back above ROP, or no ROP any more.</summary>
    [Label("Đã đóng")] Closed,
}

/// <summary>Q12: restock priority. A proposal is Urgent or Order; Watch rows appear only on the report. // + ext</summary>
public enum Priority
{
    [Label("Khẩn cấp")] Urgent,
    [Label("Cần đặt")] Order,
    [Label("Theo dõi")] Watch,
}

/// <summary>Q3: whether a product's demand can be used for ROP/EOQ. // + ext</summary>
public enum DemandState
{
    [Label("Bình thường")] Normal,
    [Label("Chưa đủ dữ liệu")] InsufficientData,
    [Label("Chậm luân chuyển")] SlowMoving,
}
