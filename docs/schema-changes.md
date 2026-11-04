# Thay đổi so với thiết kế CSDL (Chương 3, §3.3.2)

Hệ thống giữ nguyên 20 bảng, tên bảng, tên cột, khóa và kiểu dữ liệu như trong báo cáo. Các trạng thái được lưu đúng bằng nhãn tiếng Việt trong cột `nvarchar(20)`.

Bảng dưới đây liệt kê những cột và giá trị **được thêm** vì đặc tả use case cần đến mà bảng gốc chưa có chỗ lưu. Mục đích là để cập nhật lại báo cáo và sơ đồ lớp cho khớp với code.

## Cột thêm

| Bảng | Cột | Kiểu | Lý do (use case) |
|---|---|---|---|
| GoodsReceipt, GoodsIssue, Stocktake, AbnormalReport, StocktakePlan | `Code` | nvarchar(20), UNIQUE | Mã hiển thị PN-/PX-/KK-/BC-/KH-yymm-nnnn trên chứng từ và màn hình |
| GoodsReceipt, GoodsIssue, Stocktake, AbnormalReport, ReplenishmentProposal | `RejectReason` | nvarchar(255) NULL | UC_05 4.1, UC_10 3.1, UC_12 3.1, UC_15 4.1, UC_18 6.1: "ghi lý do từ chối" |
| GoodsReceipt, GoodsIssue, Stocktake, AbnormalReport, ReplenishmentProposal | `ApprovedAt` | datetime2 NULL | Hiển thị thời điểm duyệt cạnh người duyệt (tiến trình duyệt) |
| GoodsReceipt | `SubmittedAt`, `Note` | datetime2 NULL, nvarchar(255) NULL | Thời điểm gửi duyệt; ghi chú chung của phiếu |
| GoodsReceiptDetail | `QcResult` | nvarchar(20) (Đạt/Không đạt) | UC_04 bước 2: kết quả kiểm định từng dòng |
| GoodsReceiptDetail | `DocumentQuantity`, `Note` | int NULL, nvarchar(255) NULL | UC_04 3.1: số lượng trên chứng từ khác số thực nhận, ghi chú chênh lệch |
| GoodsIssue | `CreatedBy` | int FK(User) | NFR bảo mật: ghi người lập trên mọi chứng từ |
| GoodsIssue | `ReceiverName`, `DeliveredAt`, `DeliveredBy` | nvarchar(100), datetime2, int FK(User) | UC_08 bước 6: biên bản giao hàng |
| GoodsIssue | `HoldReason` | nvarchar(255) NULL | UC_07 3.1, UC_08 3.2: lý do chuyển "Chờ xử lý" |
| Order | `CustomerName` | nvarchar(150) NULL | Hiển thị khách hàng khi chọn đơn cần xuất |
| StockItem | `PickedAt` | datetime2 NULL | UC_08 bước 2: ghi nhận đã quét đối chiếu |
| StocktakePlan | `Note` | nvarchar(255) NULL | Ghi chú kế hoạch |
| AbnormalReport | `CreatedAt` | datetime2 | Thời điểm lập biên bản |
| AbnormalReport | `IssueId` | int FK(GoodsIssue) NULL | UC_08 3.1: biên bản phát sinh trong lúc xuất kho, để tìm hàng thay thế |
| InventoryPolicy | `AvgDailyDemand` | decimal(18,4) NULL | Lưu d đã dùng để tính ROP, phục vụ "căn cứ tính" (NFR giải thích được) |
| StockAlert | `ClosedAt` | datetime2 NULL | Thời điểm tự đóng cảnh báo |
| ReplenishmentProposal | `OriginalQuantity`, `AdjustReason` | int, nvarchar(255) NULL | Quản lý sửa số lượng đề xuất, giữ số gốc (= EOQ) và lý do |

## Bảng thêm

| Bảng | Cột | Lý do |
|---|---|---|
| `Notification` | NotificationId, UserId FK, Title, Message, Link, Tone, CreatedAt, IsRead | Các use case "thông báo cho Quản lý / nhân viên kho" (UC_05, UC_10, UC_11, UC_12, sơ đồ 3.8) |

## Giá trị trạng thái thêm

| Cột | Giá trị gốc | Thêm | Lý do |
|---|---|---|---|
| StockItem.Status | Trong kho / Đã xuất | **Chờ nhập**, **Đã giữ chỗ**, **Đã điều chỉnh** | Item được tạo khi lập phiếu nhập nhưng chỉ vào tồn khi phiếu được duyệt. Item được giữ chỗ theo FIFO khi lập phiếu xuất. Item bị trừ khi kiểm kê thiếu. |
| Order.Status | Chưa xuất / Chờ xử lý / Đã xuất | **Đang xuất** | Đơn đã có phiếu xuất nhưng chưa giao |
| StocktakePlan.Status | Chờ thực hiện / Hoàn thành | **Đang kiểm kê** | Đã có phiếu kiểm kê đang chờ duyệt |

## Quy ước

- **Thời gian:** mọi cột `datetime2` lưu theo **UTC**. Giao diện hiển thị theo giờ Việt Nam (UTC+7). `StocktakePlan.PlannedDate` là ngày địa phương (`date`).
- **Tồn kho khả dụng:** tổng `QuantityOnHand` của các lô có `Status = 'Bình thường'`.
