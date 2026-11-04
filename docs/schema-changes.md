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

- **Chính sách tồn kho (L, SS, S, H):** UC_02 không có các ô này, nhưng ROP và EOQ cần chúng, nên app thêm vào biểu mẫu hàng hóa. ROP và EOQ thì hệ thống tự tính, không nhập tay.
- **Tài khoản ngừng hoạt động (UC_01 5.1):** phiên đang mở bị từ chối ngay ở request kế tiếp, không phải chờ token hết hạn. Đổi vai trò cũng làm phiên cũ hết hiệu lực. Quản lý không tự ngừng hoạt động hoặc tự đổi vai trò của chính mình.
- **Mã SKU:** chỉ sửa được khi hàng hóa chưa có lô nhập kho, vì mã định danh sản phẩm (SP-{SKU}-yymm-nnnn) chứa SKU.

- **Nhập kho (UC_04, UC_05):**
  - Mỗi mặt hàng nhập 2 con số: số thực nhận và số không đạt. Phần đạt thành lô "Bình thường", phần không đạt thành lô "Tạm cách ly" trên cùng phiếu. Mã lô và mã sản phẩm được tạo ngay khi lưu phiếu.
  - Mô tả lỗi nhập cùng dòng hàng. Khi nhân viên xác nhận nhập kho và gửi duyệt, hệ thống lập mỗi lô cách ly một biên bản bất thường ("Chờ duyệt").
  - Phiếu "Từ chối" được sửa rồi gửi lại. Mặt hàng giữ nguyên số đạt và không đạt thì giữ mã lô cũ; mặt hàng đổi số lượng được tạo mã mới và phải in lại nhãn.
  - Biên bản của lô cách ly khi nhập chỉ được xử lý sau khi phiếu nhập đã duyệt (UC_05 bước 6 rồi bước 7).
  - Khi phiếu bị từ chối, `ApprovedBy` và `ApprovedAt` ghi người và thời điểm từ chối. Khi phiếu được gửi lại, hai cột này được xoá.
  - Mỗi dòng nhận tối đa 2.000 sản phẩm, vì mã sản phẩm có 4 chữ số cho mỗi SKU trong tháng.
- **Xuất kho (UC_07–10):**
  - Sản phẩm được phân bổ khi đang "Trong kho", chưa gắn phiếu nào, thuộc lô "Bình thường" của phiếu nhập đã duyệt. Thứ tự FIFO tính theo ngày phiếu nhập, rồi theo lô, rồi theo mã sản phẩm.
  - Lập phiếu thì sản phẩm chuyển "Đã giữ chỗ" và vẫn được tính trong tồn của lô cho đến khi giao hàng.
  - Thiếu hàng thì không tạo phiếu: đơn chuyển "Chờ xử lý" và Quản lý nhận thông báo.
  - Quản lý từ chối phiếu thì sản phẩm được trả về tồn kho và đơn trở về "Chưa xuất".
  - Mỗi sản phẩm phải được quét trước khi xác nhận giao hàng. Mã quét bị từ chối khi sai phiếu, sai thứ tự FIFO, thuộc lô bị khoá hoặc cách ly, hoặc là mã lô.
- **Báo hàng lỗi khi xuất (UC_08 3.1, UC_11):**
  - Mỗi lô có hàng lỗi được lập một biên bản (`IssueId` ghi phiếu xuất) và cả lô chuyển "Tạm cách ly".
  - Mọi sản phẩm của lô đó đang giữ chỗ trên các phiếu chưa xuất được đổi ngay sang sản phẩm kế tiếp theo FIFO. Hàng đã quét phải trả lại kệ. Người lập các phiếu khác bị đổi hàng nhận được thông báo.
  - Việc thay thế làm ngay khi lập biên bản, không chờ Quản lý duyệt, vì lô đã cách ly thì không xuất được nữa.
  - Không đủ hàng thay thế thì phiếu chuyển "Chờ xử lý" (UC_08 3.2): mọi sản phẩm được gỡ khỏi phiếu và đơn chuyển "Chờ xử lý".
- **Kiểm kê (UC_13–15):**
  - Ngày dự kiến của kế hoạch không được trước hôm nay (giờ Việt Nam).
  - Phạm vi "Toàn bộ kho" gồm mọi lô của phiếu nhập đã duyệt còn tồn tại thời điểm kiểm, kể cả lô tạm cách ly và đã khóa, vì chúng vẫn nằm trong kho.
  - Số đếm được lưu nháp trên máy nhân viên. Phiếu kiểm kê chỉ được tạo khi gửi, và `SystemQuantity` là tồn của lô tại lúc đó.
  - Nhân viên phải nhập số cho mọi lô (không tìm thấy thì nhập 0) và ghi lý do cho lô có chênh lệch.
  - Gửi phiếu thì kế hoạch chuyển "Đang kiểm kê". Từ chối thì kế hoạch trở về "Chờ thực hiện" để kiểm lại (lần sau là phiếu mới). Duyệt thì kế hoạch "Hoàn thành".
  - Khi duyệt, tồn được điều chỉnh theo chênh lệch (thực tế − hệ thống) của từng lô:
    - Phần thiếu: sản phẩm "Trong kho" chuyển "Thất thoát" trước. Nếu vẫn thiếu thì đến sản phẩm "Đã giữ chỗ": chúng được gỡ khỏi phiếu xuất và thay theo FIFO; không đủ thay thì phiếu đó chuyển "Chờ xử lý".
    - Phần thừa: được tạo mã định danh mới.
  - Biên bản lập trong lúc kiểm kê (nguồn "Kiểm kê") làm lô chuyển "Tạm cách ly" ngay. Sản phẩm của lô đang giữ chỗ trên phiếu xuất được thay theo FIFO, như khi báo lỗi lúc xuất.
- **Tra cứu lô (UC_16):** chỉ hiện lô của phiếu nhập đã duyệt. Quét mã lô hoặc mã sản phẩm đều mở được lô tương ứng.
- **ROP, EOQ (Hình 3.8, 3.9):**
  - d = tổng số lượng của các phiếu xuất đã giao trong 28 ngày gần nhất ÷ 28. ROP = d × L + SS. EOQ = √(2DS/H), với D = d × 365 (nhu cầu năm), vì H là chi phí lưu kho trên một đơn vị trong một năm.
  - "Chưa đủ dữ liệu": hàng hóa chưa có lô của phiếu nhập đã duyệt từ 28 ngày trở lên. Hàng loại này không có ROP, không bị cảnh báo, không có đề xuất.
  - Tác vụ nền chạy mỗi thứ Hai 02:00 giờ Việt Nam (cấu hình `Replenishment:Cron`). Khi khởi động, nó chạy ngay nếu lần tính gần nhất đã quá 7 ngày. Quản lý có nút "Tính lại ngay".
  - Việc kiểm tra cảnh báo chạy sau mọi thay đổi tồn khả dụng: duyệt phiếu nhập, giao hàng, báo lỗi (lô bị cách ly), duyệt kiểm kê, duyệt hoặc từ chối biên bản.
  - Tồn ≤ ROP: mở cảnh báo (kèm thông báo cho Quản lý) hoặc cập nhật cảnh báo đang mở, và tạo hoặc cập nhật đề xuất "Chờ duyệt" với số lượng = EOQ làm tròn lên. Tồn > ROP: cảnh báo chuyển "Đã đóng" (ghi `ClosedAt`) và đề xuất đang chờ chuyển "Đã đóng".
  - Mỗi đợt thiếu hàng chỉ có một đề xuất. Đề xuất đã duyệt hoặc từ chối không được tạo lại cho đến khi tồn vượt ROP rồi giảm lại.
  - Quản lý sửa số lượng đề xuất thì phải ghi lý do. `OriginalQuantity` giữ số lượng do hệ thống tính (EOQ), và lần tính lại không ghi đè số đã sửa.
  - Ưu tiên "Khẩn cấp" khi tồn ≤ tồn kho an toàn (SS), còn lại là "Cần đặt". "Theo dõi" là hàng có tồn trong khoảng (ROP, 1,2 × ROP] và không có đề xuất.
- **Báo cáo (UC_19):**
  - Báo cáo tồn kho lấy số tại thời điểm xem và tách thành khả dụng, giữ chỗ, tạm cách ly, đã khóa.
  - Báo cáo biến động nhập xuất cho một kỳ (từ ngày – đến ngày, giờ Việt Nam). Tồn thực tế chỉ thay đổi khi duyệt phiếu nhập (+), giao hàng (−) và duyệt kiểm kê (±), nên tồn cuối kỳ được tính bằng tồn hiện tại trừ đi các phát sinh sau kỳ. Tồn đầu kỳ = tồn cuối − nhập + xuất − điều chỉnh. Nhờ vậy tồn cuối kỳ này luôn bằng tồn đầu kỳ sau.
  - "Xuất báo cáo" tải file CSV (UTF-8 có BOM, mở được bằng Excel) hoặc in trực tiếp từ trình duyệt.
  - Hai báo cáo trong sơ đồ BFD ("Báo cáo bất thường" và "Báo cáo hỗ trợ bổ sung hàng") không có màn báo cáo riêng. Nội dung của chúng nằm ở màn Biên bản bất thường (lọc theo trạng thái, nguồn) và các màn Cảnh báo, Đề xuất.
- **Thời gian:** EF đọc mọi cột `datetime2` với Kind = UTC, nên JSON có hậu tố `Z` và giao diện đổi đúng sang giờ Việt Nam. Trước bản sửa này, giờ hiển thị bị lệch 7 tiếng.
- **Đơn hàng:** `POST /api/orders` là điểm tiếp nhận đơn từ hệ thống bán hàng. Tạm thời dùng quyền Quản lý thay cho khóa tích hợp.
- **Thông báo:** gửi duyệt thì báo cho mọi Quản lý đang hoạt động. Duyệt hoặc từ chối phiếu và biên bản thì báo cho người lập.

## Cần sửa trong báo cáo cho khớp với Hình 3.10

- **Mục 3.3.1:** đổi "20 bảng" thành "19 bảng". Nhóm "tồn kho theo lô (StockLot, StockItem)" chỉ còn StockItem; lô thuộc nhóm nhập kho (GoodsReceiptDetail).
- **Bảng 3.24 StockLot:** xoá.
- **Bảng 3.25 StockItem:** `LotId` → `ReceiptDetailId` FK(GoodsReceiptDetail).
- **Bảng 3.27 GoodsReceiptDetail:** bỏ `LotId`; thêm `ProductId` FK(Product), `QuantityOnHand` int DEFAULT 0, `Status` nvarchar(20) (Bình thường / Tạm cách ly / Đã khóa).
- **Bảng 3.31 GoodsIssueDetail:** `LotId` → `ProductId` FK(Product); đổi mô tả thành "mỗi mặt hàng một dòng".
- **Bảng 3.33, 3.35, 3.36** (StocktakePlanDetail, StocktakeDetail, AbnormalReport): `LotId` → `ReceiptDetailId`.
- **UC_18 luồng 3.1** (nhóm "Chưa xác định nhà cung cấp"): `Product.SupplierId` là NOT NULL (bảng 3.23) nên trường hợp này không xảy ra. Nên bỏ luồng này hoặc cho phép SupplierId NULL.
- **Sơ đồ BFD (Hình 3.1):** có "Báo cáo bất thường" và "Báo cáo hỗ trợ bổ sung hàng", nhưng UC_19 chỉ có báo cáo tồn kho và báo cáo biến động nhập xuất. App làm theo UC_19.
