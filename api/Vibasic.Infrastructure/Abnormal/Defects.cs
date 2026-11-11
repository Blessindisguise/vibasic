using Vibasic.Domain;

namespace Vibasic.Infrastructure.Abnormal;

/// <summary>
/// Item-level defects. A defective item is set aside: status "Lỗi", out of the lot's QuantityOnHand (like "Thất thoát"), never
/// allocated, not counted on the shelf afterwards. Rejecting its report puts it back "Trong kho".
/// </summary>
public static class Defects
{
    /// <summary>The item must already be off any issue (free in stock); the lot must be loaded.</summary>
    public static void Mark(StockItem item, DateTime now)
    {
        if (item.Status != ItemStatus.InStock || item.IssueDetailId is not null)
            throw new InvalidOperationException($"{item.SerialCode} must be free in stock before it is marked defective.");
        item.Status = ItemStatus.Defective;
        item.DefectiveAt = now;
        item.PickedAt = null;
        item.ReceiptDetail.QuantityOnHand -= 1;
    }

    public static void Restore(StockItem item)
    {
        if (item.Status != ItemStatus.Defective) return;
        item.Status = ItemStatus.InStock;
        item.DefectiveAt = null;
        item.ReceiptDetail.QuantityOnHand += 1;
    }

    /// <summary>Why an item cannot go on a new report, or null when it can (free, or reserved but not scanned yet).</summary>
    public static string? WhyNot(StockItem item) => item.Status switch
    {
        ItemStatus.InStock => null,
        ItemStatus.Reserved when item.PickedAt is null => null,
        ItemStatus.Reserved => $"{item.SerialCode} đang soạn cho phiếu xuất",
        ItemStatus.Defective => $"{item.SerialCode} đã có biên bản lỗi",
        ItemStatus.Issued => $"{item.SerialCode} đã xuất kho",
        ItemStatus.Lost => $"{item.SerialCode} đang ghi Thất thoát",
        _ => $"{item.SerialCode} chưa nhập kho",
    };
}
