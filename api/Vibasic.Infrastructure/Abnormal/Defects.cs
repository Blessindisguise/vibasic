using Vibasic.Domain;

namespace Vibasic.Infrastructure.Abnormal;

/// <summary>
/// Item-level defects. A defective item is set aside: status "Lỗi", out of the lot's QuantityOnHand (like "Thất thoát"), never
/// allocated, not counted on the shelf afterwards. Rejecting its report puts it back "Trong kho". Once the approved report is
/// handled, the item either leaves the warehouse ("Đã loại bỏ") or comes back repaired ("Trong kho").
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
        item.HandledAt = null;
        item.PickedAt = null;
        item.ReceiptDetail.QuantityOnHand -= 1;
    }

    /// <summary>The report was rejected: the item was never defective after all.</summary>
    public static void Restore(StockItem item)
    {
        if (item.Status != ItemStatus.Defective) return;
        item.Status = ItemStatus.InStock;
        item.DefectiveAt = null;
        item.ReceiptDetail.QuantityOnHand += 1;
    }

    /// <summary>Repaired: back in stock. DefectiveAt stays, so stock movements show it left and came back.</summary>
    public static void Repair(StockItem item, DateTime now)
    {
        if (item.Status != ItemStatus.Defective) return;
        item.Status = ItemStatus.InStock;
        item.HandledAt = now;
        item.ReceiptDetail.QuantityOnHand += 1;
    }

    /// <summary>Leaves the warehouse for good. A defective item is already out of stock on hand; any other item leaves it now.</summary>
    public static void Dispose(StockItem item, DateTime now)
    {
        if (item.Status is not (ItemStatus.Defective or ItemStatus.InStock)) return;
        if (item.Status == ItemStatus.InStock) item.ReceiptDetail.QuantityOnHand -= 1;
        item.Status = ItemStatus.Disposed;
        item.HandledAt = now;
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
        ItemStatus.Disposed => $"{item.SerialCode} đã loại bỏ khỏi kho theo biên bản",
        _ => $"{item.SerialCode} chưa nhập kho",
    };

    /// <summary>Hướng xử lý that bring the goods back into stock; every other one takes them out of the warehouse.</summary>
    public static bool BackToStock(HandlingMethod method) => method == HandlingMethod.Repair;
}
