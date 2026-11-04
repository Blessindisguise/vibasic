# Thay đổi so với thiết kế CSDL (Chương 3)

CSDL làm theo **sơ đồ lớp Hình 3.10**: 19 bảng, tên bảng và tên cột giữ như sơ đồ. Các trạng thái được lưu bằng đúng nhãn tiếng Việt, kiểu `nvarchar(20)`.

Điểm chính của Hình 3.10: **không có bảng StockLot**. Mỗi dòng `GoodsReceiptDetail` là một lô, có `ProductId`, `Quantity`, `QuantityOnHand` và `Status` (Bình thường / Tạm cách ly / Đã khóa). Các bảng `StockItem`, `StocktakePlanDetail`, `StocktakeDetail` và `AbnormalReport` tham chiếu lô qua `ReceiptDetailId`. `GoodsIssueDetail` có một dòng cho mỗi mặt hàng (`ProductId`), và các sản phẩm gắn vào dòng đó có thể thuộc nhiều lô (UC_07 4.1).

Các bảng dưới đây liệt kê những cột và giá trị **được thêm** vì đặc tả use case cần mà sơ đồ chưa có chỗ lưu. Mục đích là để cập nhật lại báo cáo cho khớp với code.

## Cột thêm

| Bảng | Cột | Kiểu | Lý do (use case) |
|---|---|---|---|
| GoodsReceipt, GoodsIssue, Stocktake, AbnormalReport, StocktakePlan | `Code` | nvarchar(20), UNIQUE | Mã hiển thị PN-/PX-/KK-/BC-/KH-yymm-nnnn trên chứng từ và màn hình |
| GoodsReceipt, GoodsIssue, Stocktake, AbnormalReport, ReplenishmentProposal | `RejectReason` | nvarchar(255) NULL | UC_05 4.1, UC_10 3.1, UC_12 3.1, UC_15 4.1, UC_18 6.1: "ghi lý do từ chối" |
| GoodsReceipt, GoodsIssue, Stocktake, AbnormalReport, ReplenishmentProposal | `ApprovedAt` | datetime2 NULL | Hiển thị thời điểm duyệt cạnh người duyệt (tiến trình duyệt) |
| GoodsReceipt | `SubmittedAt`, `Note` | datetime2 NULL, nvarchar(255) NULL | Thời điểm gửi duyệt; ghi chú chung của phiếu |
| GoodsReceiptDetail | `LotCode` | nvarchar(50), UNIQUE | Mã lô LOT-yymm-nnn in trên mã vạch lô (UC_04 bước 8). Sơ đồ lớp không có cột mã lô. |
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
| StockItem.Status | Trong kho / Đã xuất | **Chờ nhập**, **Đã giữ chỗ**, **Thất thoát** | Sản phẩm được tạo khi lập phiếu nhập nhưng chỉ vào tồn khi phiếu được duyệt. Sản phẩm được giữ chỗ theo FIFO khi lập phiếu xuất. Phần thiếu khi kiểm kê được đánh dấu thất thoát (UC_15 bước 7). |
| Order.Status | Chưa xuất / Chờ xử lý / Đã xuất | **Đang xuất** | Đơn đã có phiếu xuất nhưng chưa giao |
| StocktakePlan.Status | Chờ thực hiện / Hoàn thành | **Đang kiểm kê** | Đã có phiếu kiểm kê đang chờ duyệt |

## Quy ước

- **Thời gian:** mọi cột `datetime2` lưu theo **UTC**. Giao diện hiển thị theo giờ Việt Nam (UTC+7). `StocktakePlan.PlannedDate` là ngày địa phương (`date`).
- **Ghi nhận tồn khi nhập:** lô (dòng chi tiết phiếu nhập) được tạo lúc lập phiếu với `QuantityOnHand = 0`, sản phẩm ở trạng thái "Chờ nhập". Khi phiếu được duyệt, `QuantityOnHand` của mọi lô trong phiếu được gán bằng `Quantity`, kể cả lô "Tạm cách ly", và sản phẩm chuyển sang "Trong kho". Quy ước này đáp ứng NFR "tồn kho chỉ được ghi nhận sau khi phiếu được duyệt".
- **Tồn kho khả dụng:** tổng `QuantityOnHand` của các dòng `GoodsReceiptDetail` có `Status = 'Bình thường'` (UC_17). Lô chưa duyệt có tồn bằng 0 nên không được tính.
- **Thứ tự FIFO:** sắp theo `GoodsReceipt.ReceiptDate` của lô (UC_16: "ngày nhập theo phiếu nhập"); hai lô cùng ngày thì xét theo `ReceiptDetailId`.
- **Hàng không đạt khi nhập:** phần không đạt của một mặt hàng tạo thành một dòng (lô) riêng ở trạng thái "Tạm cách ly", nằm trên cùng phiếu với lô đạt (UC_04). Vì vậy không cần cột kết quả kiểm định riêng.

## Cần sửa trong báo cáo cho khớp với Hình 3.10

- **Mục 3.3.1:** đổi "20 bảng" thành "19 bảng". Nhóm "tồn kho theo lô (StockLot, StockItem)" chỉ còn StockItem; lô thuộc nhóm nhập kho (GoodsReceiptDetail).
- **Bảng 3.24 StockLot:** xoá.
- **Bảng 3.25 StockItem:** `LotId` → `ReceiptDetailId` FK(GoodsReceiptDetail).
- **Bảng 3.27 GoodsReceiptDetail:** bỏ `LotId`; thêm `ProductId` FK(Product), `QuantityOnHand` int DEFAULT 0, `Status` nvarchar(20) (Bình thường / Tạm cách ly / Đã khóa).
- **Bảng 3.31 GoodsIssueDetail:** `LotId` → `ProductId` FK(Product); đổi mô tả thành "mỗi mặt hàng một dòng".
- **Bảng 3.33, 3.35, 3.36** (StocktakePlanDetail, StocktakeDetail, AbnormalReport): `LotId` → `ReceiptDetailId`.
- **UC_18 luồng 3.1** (nhóm "Chưa xác định nhà cung cấp"): `Product.SupplierId` là NOT NULL (bảng 3.23) nên trường hợp này không xảy ra. Nên bỏ luồng này hoặc cho phép SupplierId NULL.
- **Sơ đồ BFD (Hình 3.1):** có "Báo cáo bất thường" và "Báo cáo hỗ trợ bổ sung hàng", nhưng UC_19 chỉ có báo cáo tồn kho và báo cáo biến động nhập xuất. App làm theo UC_19.
