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
}

public enum IssueStatus
{
    [Label("Chờ duyệt")] Pending,
    [Label("Đã duyệt")] Approved,
    [Label("Từ chối")] Rejected,
    [Label("Chờ xử lý")] OnHold,
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

public enum ProposalStatus
{
    [Label("Chờ duyệt")] Pending,
    [Label("Đã duyệt")] Approved,
    [Label("Từ chối")] Rejected,
    [Label("Đã đóng")] Closed,
    /// <summary>Goods of an approved proposal arrived on an approved receipt. // + ext</summary>
    [Label("Đã nhập hàng")] Received,
}
