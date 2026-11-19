# Thay đổi so với thiết kế CSDL (Chương 3)

CSDL làm theo **sơ đồ lớp Hình 3.10**: 19 bảng, tên bảng và tên cột giữ như sơ đồ. Các trạng thái được lưu bằng đúng nhãn tiếng Việt, kiểu `nvarchar(20)`.

Điểm chính của Hình 3.10: **không có bảng StockLot**. Mỗi dòng `GoodsReceiptDetail` là một lô, có `ProductId`, `Quantity`, `QuantityOnHand` và `Status` (Bình thường / Tạm cách ly / Đã khóa). Các bảng `StockItem`, `StocktakePlanDetail`, `StocktakeDetail` và `AbnormalReport` tham chiếu lô qua `ReceiptDetailId`. `GoodsIssueDetail` có một dòng cho mỗi mặt hàng (`ProductId`), và các sản phẩm gắn vào dòng đó có thể thuộc nhiều lô (UC_07 4.1).

Các bảng dưới đây liệt kê những cột và giá trị **được thêm** vì đặc tả use case cần mà sơ đồ chưa có chỗ lưu. Mục đích là để cập nhật lại báo cáo cho khớp với code.

## Bỏ duyệt phiếu xuất và bỏ thông báo (migration `IssueNoApprovalNoNotifications`, 12/11/2026)

- **Phiếu xuất không cần Quản lý duyệt.** Đơn hàng đã quyết định xuất gì, hệ thống chọn lô theo FIFO, quét từng tem khi lấy hàng chặn lấy nhầm; bước duyệt không kiểm soát thêm được gì mà làm chậm khi có nhiều đơn lẻ. Quản lý vẫn có Hủy đơn, Gỡ người lấy hàng và duyệt biên bản bất thường.
  - `GoodsIssue.Status`: **Chờ lấy hàng** / Đã hủy / Đã xuất. Bỏ Chờ duyệt, Đã duyệt, Từ chối. Dữ liệu cũ: Chờ duyệt và Đã duyệt → Chờ lấy hàng; Từ chối → Đã hủy, lý do "Quản lý từ chối: …".
  - `GoodsIssue` bỏ cột `ApprovedBy`, `ApprovedAt`, `RejectReason`. Cột `HoldReason` đổi tên thành `CancelReason`.
  - UC_10 không còn áp dụng cho phiếu xuất (chỉ còn phiếu nhập; phiếu kiểm kê ở UC_15, biên bản ở UC_12).
- **Bỏ thông báo trong app.** Mỗi việc đã có màn hình riêng (Chờ duyệt, Cảnh báo tồn kho, Đơn chờ xuất có dấu "Đủ hàng", Cần lấy hàng, Kiểm kê).
  - Xoá bảng `Notification` và cột `Order.ReadyNotifiedAt`.
  - Danh sách mã đã lấy khi phiếu bị hủy (trước đây gửi kèm thông báo) không lưu lại: hàng đã lấy đang ở trên tay nhân viên và mỗi sản phẩm có tem ghi mã lô, nên chỉ cần trả toàn bộ hàng của phiếu về kệ. Phiếu "Đã hủy" ghi lời nhắc này. Cột `GoodsIssue.ReturnSerials` từng thêm cho việc này đã bỏ (migration `IssueDropReturnSerials`).
  - Lý do "hủy duyệt" phiếu nhập và "hủy quyết định" biên bản vẫn bắt buộc nhập nhưng không còn được lưu ở đâu (trước đây chỉ gửi kèm thông báo).

## Cột thêm

| Bảng | Cột | Kiểu | Lý do (use case) |
|---|---|---|---|
| GoodsReceipt, GoodsIssue, Stocktake, AbnormalReport, StocktakePlan | `Code` | nvarchar(20), UNIQUE | Mã hiển thị PN-/PX-/KK-/BC-/KH-yymm-nnnn trên chứng từ và màn hình |
| GoodsReceipt, Stocktake, AbnormalReport, ReplenishmentProposal | `RejectReason` | nvarchar(255) NULL | UC_05 4.1, UC_12 3.1, UC_15 4.1, UC_18 6.1: "ghi lý do từ chối" |
| GoodsReceipt, Stocktake, AbnormalReport, ReplenishmentProposal | `ApprovedAt` | datetime2 NULL | Hiển thị thời điểm duyệt cạnh người duyệt (tiến trình duyệt) |
| GoodsReceipt | `SubmittedAt`, `Note` | datetime2 NULL, nvarchar(255) NULL | Thời điểm gửi duyệt; ghi chú chung của phiếu |
| GoodsReceiptDetail | `LotCode` | nvarchar(50), UNIQUE | Mã lô LOT-yymm-nnn in trên mã vạch lô (UC_04 bước 8). Sơ đồ lớp không có cột mã lô. |
| GoodsReceiptDetail | `DocumentQuantity`, `Note` | int NULL, nvarchar(255) NULL | UC_04 3.1: số lượng trên chứng từ khác số thực nhận, ghi chú chênh lệch |
| GoodsIssue | `CreatedBy` | int FK(User) | NFR bảo mật: ghi người lập trên mọi chứng từ |
| GoodsIssue | `ReceiverName`, `DeliveredAt`, `DeliveredBy` | nvarchar(100), datetime2, int FK(User) | UC_08 bước 6: biên bản giao hàng |
| GoodsIssue | `CancelReason` (trước là `HoldReason`) | nvarchar(255) NULL | UC_07 3.1, UC_08 3.2: lý do phiếu "Đã hủy" (không đủ hàng thay thế, hoặc đơn bị hủy) |
| Order | `CustomerName` | nvarchar(150) NULL | Hiển thị khách hàng khi chọn đơn cần xuất |
| Order | `CancelReason`, `CancelledAt`, `CancelledBy` | nvarchar(255) NULL, datetime2 NULL, int FK(User) NULL | Khách hủy đơn: Quản lý (thay cho hệ thống bán hàng) hủy đơn chưa giao, ghi lý do (migration `OrderCancel`) |
| Order | `CustomerPhone`, `ShippingAddress`, `Note` | nvarchar(20), nvarchar(300), nvarchar(500), NULL | Thông tin giao hàng của đơn: số điện thoại, địa chỉ, ghi chú. Hiện ở đơn chờ xuất, màn phân bổ và phiếu xuất |
| GoodsIssue | `PickerId`, `PickStartedAt`, `PickActiveAt` | int FK(User) NULL, datetime2 NULL, datetime2 NULL | Nhân viên đang lấy hàng phiếu này, lúc nhận phiếu (phiếu được giữ 3 ngày từ lúc này), lần thao tác cuối (xem quy ước "Nhận phiếu khi lấy hàng") |
| StockItem | `PickedAt` | datetime2 NULL | UC_08 bước 2: ghi nhận đã quét đối chiếu |
| StocktakePlan | `Note` | nvarchar(255) NULL | Ghi chú kế hoạch |
| AbnormalReport | `CreatedAt` | datetime2 | Thời điểm lập biên bản |
| AbnormalReport | `IssueId` | int FK(GoodsIssue) NULL | UC_08 3.1: biên bản phát sinh trong lúc xuất kho, để tìm hàng thay thế |
| InventoryPolicy | `AvgDailyDemand` | decimal(18,4) NULL | Lưu d đã dùng để tính ROP, phục vụ "căn cứ tính" (NFR giải thích được) |
| InventoryPolicy | `DemandStdDev`, `DemandState` | decimal(18,4) NULL, nvarchar(20) | σ của lần tính gần nhất (Q2), tình trạng nhu cầu "Bình thường / Chưa đủ dữ liệu / Chậm luân chuyển" (Q3) |
| InventoryPolicy | `SafetyStock` | **đổi** int → decimal(18,2) NULL | SS do hệ thống tính hằng tuần: z × σ × √L (Q4), không còn nhập tay. Null khi chưa tính được |
| StockAlert | `ClosedAt` | datetime2 NULL | Thời điểm tự đóng cảnh báo |
| ReplenishmentProposal | `OriginalQuantity`, `AdjustReason` | int, nvarchar(255) NULL | Quản lý sửa số lượng đề xuất, giữ số gốc (= EOQ) và lý do |
| ReplenishmentProposal | `NetQuantity`, `AvgDailyDemand`, `BaseQuantity`, `Priority`, `AdjustBasis` | int, decimal(18,4) NULL, int, nvarchar(20), nvarchar(255) NULL | Căn cứ theo Q8–Q16: tồn ròng, d, số lượng gốc ROP + EOQ − tồn ròng, mức ưu tiên Khẩn cấp / Cần đặt, căn cứ khi bị chặn trần 12 tuần. `OriginalQuantity` từ nay là số hệ thống đề xuất (số lượng gốc, hoặc trần nếu vượt) |
| ReplenishmentProposal | `AvailableQuantity`, `ROPValue` | int, decimal(18,2) | Căn cứ của đề xuất: tồn khả dụng và ROP lúc lập. Cập nhật khi đề xuất còn chờ xem xét, giữ nguyên khi đã lập báo cáo, không đề xuất hoặc đóng, để đề xuất cũ vẫn giải thích được (NFR giải thích được) |
| ReplenishmentProposal | `ReportId` | int FK(ReplenishmentReport) NULL | Báo cáo chứa đề xuất (trạng thái "Đã lập báo cáo"). `ApprovedBy`, `ApprovedAt` là người và lúc xử lý: lập báo cáo hoặc loại (migration `ProposalReports`, thay cho `ReceiptId`, `ReceivedQuantity`, `CloseReason` của migration `ProposalReceiving`) |
| GoodsReceipt | `DeliveryNoteNo` | nvarchar(50) NULL | Số chứng từ giao hàng của nhà cung cấp, tìm phiếu nhập theo số này |
| StocktakeDetail | `CountedAt` | datetime2 NULL | Thời điểm đếm lô; số hệ thống được lấy tại thời điểm này |
| StocktakeDetail | `Method`, `UnlabeledQuantity` | nvarchar(20) DEFAULT 'Nhập số', int DEFAULT 0 | Cách đếm (Nhập số / Quét tem); số sản phẩm không có tem khi đếm bằng quét |
| StockItem | `DefectiveAt` | datetime2 NULL | Thời điểm sản phẩm bị tách ra vì lỗi; kiểm kê dùng để biết lúc đếm sản phẩm còn trên kệ hay chưa |
| AbnormalReport | `Scope` | nvarchar(20) DEFAULT 'Cả lô' | Phạm vi xử lý: "Sản phẩm lỗi" (chỉ các mã ghi trên biên bản) hoặc "Cả lô" (cách ly / khóa cả lô như Chương 3) |
| AbnormalReport | `HandlingMethod`, `HandlingPlan` | nvarchar(20) NULL, nvarchar(500) NULL | Hướng xử lý Quản lý chọn khi duyệt (Trả nhà cung cấp / Tiêu hủy / Thanh lý giảm giá / Sửa chữa, tân trang) và mô tả. Nhân viên có thể ghi đề xuất vào `HandlingPlan` khi biên bản còn chờ duyệt (migration `AbnormalHandling`) |
| AbnormalReport | `HandlingStatus`, `HandledBy` FK(User), `HandlingStartedAt`, `HandledAt` | nvarchar(20) NULL, int NULL, datetime2 NULL ×2 | Xử lý biên bản đã duyệt: Chờ xử lý → Đang xử lý (nhân viên nhận) → Đã xử lý; ai xử lý, nhận lúc nào, xong lúc nào. Migration đặt "Chờ xử lý" cho các biên bản đã duyệt có sẵn |
| StockItem | `HandledAt` | datetime2 NULL | Thời điểm biên bản xử lý xong sản phẩm: rời kho ("Đã loại bỏ") hoặc sửa xong trở về kho. Báo cáo nhập–xuất–tồn dùng để ghi điều chỉnh đúng ngày |

## Bảng thêm

| Bảng | Cột | Lý do |
|---|---|---|
| `StocktakeItem` | StocktakeItemId, DetailId FK(StocktakeDetail, xoá theo), ItemId FK(StockItem), UNIQUE(DetailId, ItemId) | Các mã đã quét khi đếm lô bằng tem, để biết chính xác sản phẩm nào thiếu |
| `ReplenishmentReport` | ReportId, Code (DX-yymm-nnnn, UNIQUE), CreatedAt, CreatedBy FK(User), ProposalCount, SupplierCount, TotalQuantity, Snapshot nvarchar(max) | UC_18: báo cáo đề xuất bổ sung Quản lý lập từ các đề xuất đã chọn. `Snapshot` lưu nội dung báo cáo (JSON) để in lại đúng như lúc lập |
| `AbnormalReportItem` | ReportItemId, ReportId FK(AbnormalReport, xoá theo), ItemId FK(StockItem), UNIQUE(ReportId, ItemId) | Các sản phẩm lỗi ghi trên biên bản. Biên bản lập khi nhập kho ghi mọi sản phẩm của lô không đạt |

## Giá trị trạng thái thêm

| Cột | Giá trị gốc | Thêm | Lý do |
|---|---|---|---|
| StockItem.Status | Trong kho / Đã xuất | **Chờ nhập**, **Đã giữ chỗ**, **Thất thoát**, **Lỗi**, **Đã loại bỏ** | Sản phẩm được tạo khi lập phiếu nhập nhưng chỉ vào tồn khi phiếu được duyệt. Sản phẩm được giữ chỗ theo FIFO khi lập phiếu xuất. Phần thiếu khi kiểm kê được đánh dấu thất thoát (UC_15 bước 7). Sản phẩm ghi trên biên bản bất thường được tách ra ở trạng thái "Lỗi". "Đã loại bỏ": rời kho khi biên bản được xử lý xong theo hướng trả nhà cung cấp, tiêu hủy hoặc thanh lý. |
| AbnormalReport.HandlingStatus (mới) | — | **Chờ xử lý**, **Đang xử lý**, **Đã xử lý** | Theo dõi việc xử lý hàng lỗi sau khi duyệt. Trên màn hình gộp với trạng thái duyệt: Chờ duyệt / Chờ xử lý / Đang xử lý / Đã xử lý / Từ chối |
| Order.Status | Chưa xuất / Chờ xử lý / Đã xuất | **Đang xuất**, **Đã hủy** | Đang xuất: đơn đã có phiếu xuất nhưng chưa giao. Đã hủy: khách hủy, không còn tính vào tồn ròng (Q8) và nhu cầu (Q1) |
| GoodsIssue.Status | Chờ duyệt / Đã duyệt / Từ chối / Chờ xử lý / Đã xuất | **Đổi thành** Chờ lấy hàng / Đã hủy / Đã xuất | Phiếu không cần duyệt: lập xong là "Chờ lấy hàng". "Đã hủy" (thay cho Chờ xử lý, migration `OrderCancel`): phiếu kết thúc không giao, hàng đã nhả, vì đơn bị hủy hoặc không đủ hàng thay thế (UC_08 3.2). Lý do ở `CancelReason` |
| StocktakePlan.Status | Chờ thực hiện / Hoàn thành | **Đang kiểm kê** | Đã có phiếu kiểm kê đang chờ duyệt |
| ReplenishmentProposal.Status | Chờ duyệt / Đã duyệt / Từ chối | **Đổi thành** Chờ xem xét / Đã lập báo cáo / Không đề xuất; thêm **Đã đóng** | Đề xuất chỉ là gợi ý: Quản lý xem xét rồi lập báo cáo cho bộ phận mua hàng, hệ thống dừng ở đó (không theo dõi mua hay hàng về). Đã đóng: hệ thống tự đóng khi tồn vượt ROP trước khi Quản lý xử lý. Migration đổi dữ liệu cũ: Đã duyệt và Đã nhập hàng → Đã lập báo cáo, Chờ duyệt → Chờ xem xét, Từ chối → Không đề xuất |

## Quy ước

- **Thời gian:** mọi cột `datetime2` lưu theo **UTC**. Giao diện hiển thị theo giờ Việt Nam (UTC+7). `StocktakePlan.PlannedDate` là ngày địa phương (`date`).
- **Ghi nhận tồn khi nhập:** lô (dòng chi tiết phiếu nhập) được tạo lúc lập phiếu với `QuantityOnHand = 0`, sản phẩm ở trạng thái "Chờ nhập". Khi phiếu được duyệt, `QuantityOnHand` của mọi lô trong phiếu được gán bằng `Quantity`, kể cả lô "Tạm cách ly", và sản phẩm chuyển sang "Trong kho". Quy ước này đáp ứng NFR "tồn kho chỉ được ghi nhận sau khi phiếu được duyệt".
- **Tồn kho khả dụng:** tổng `QuantityOnHand` của các dòng `GoodsReceiptDetail` có `Status = 'Bình thường'` (UC_17). Lô chưa duyệt có tồn bằng 0 nên không được tính.
- **Thứ tự FIFO:** sắp theo `GoodsReceipt.ReceiptDate` của lô (UC_16: "ngày nhập theo phiếu nhập"); hai lô cùng ngày thì xét theo `ReceiptDetailId`.
- **Hàng không đạt khi nhập:** phần không đạt của một mặt hàng tạo thành một dòng (lô) riêng ở trạng thái "Tạm cách ly", nằm trên cùng phiếu với lô đạt (UC_04). Vì vậy không cần cột kết quả kiểm định riêng.

- **Chính sách tồn kho (L, S, H):** UC_02 không có các ô này, nhưng ROP và EOQ cần chúng, nên app thêm vào biểu mẫu hàng hóa. SS, ROP và EOQ thì hệ thống tự tính (Q4–Q5), không nhập tay.
- **Tài khoản ngừng hoạt động (UC_01 5.1):** phiên đang mở bị từ chối ngay ở request kế tiếp, không phải chờ token hết hạn. Đổi vai trò cũng làm phiên cũ hết hiệu lực. Quản lý không tự ngừng hoạt động hoặc tự đổi vai trò của chính mình.
- **Mã SKU:** chỉ sửa được khi hàng hóa chưa có lô nhập kho, vì mã định danh sản phẩm (SP-{SKU}-yymm-nnnn) chứa SKU.

- **Nhập kho (UC_04, UC_05):**
  - Mỗi mặt hàng nhập 2 con số: số thực nhận và số không đạt. Phần đạt thành lô "Bình thường", phần không đạt thành lô "Tạm cách ly" trên cùng phiếu. Mã lô và mã sản phẩm được tạo ngay khi lưu phiếu.
  - Mô tả lỗi nhập cùng dòng hàng. Khi nhân viên xác nhận nhập kho và gửi duyệt, hệ thống lập mỗi lô cách ly một biên bản bất thường ("Chờ duyệt").
  - Phiếu "Từ chối" được sửa rồi gửi lại. Mặt hàng giữ nguyên số đạt và không đạt thì giữ mã lô cũ; mặt hàng đổi số lượng được tạo mã mới và phải in lại nhãn.
  - Biên bản của lô cách ly khi nhập chỉ được xử lý sau khi phiếu nhập đã duyệt (UC_05 bước 6 rồi bước 7).
  - Khi phiếu bị từ chối, `ApprovedBy` và `ApprovedAt` ghi người và thời điểm từ chối. Khi phiếu được gửi lại, hai cột này được xoá.
  - Mỗi dòng nhận tối đa 2.000 sản phẩm, vì mã sản phẩm có 4 chữ số cho mỗi SKU trong tháng.
  - Mặt hàng trên phiếu phải do nhà cung cấp của phiếu cung cấp (nhà cung cấp chính của hàng hóa). Chọn nhà cung cấp trước thì chỉ hiện hàng của nhà cung cấp đó; chọn mặt hàng trước thì nhà cung cấp được chọn theo, và danh sách nhà cung cấp chỉ còn nhà cung cấp của các mặt hàng đã chọn. Server cũng kiểm tra điều này.
- **Xuất kho (UC_07–09):**
  - Sản phẩm được phân bổ khi đang "Trong kho", chưa gắn phiếu nào, thuộc lô "Bình thường" của phiếu nhập đã duyệt. Thứ tự FIFO tính theo ngày phiếu nhập, rồi theo lô, rồi theo mã sản phẩm.
  - Lập phiếu thì sản phẩm chuyển "Đã giữ chỗ" và vẫn được tính trong tồn của lô cho đến khi giao hàng. Phiếu ở "Chờ lấy hàng", không qua duyệt.
  - Thiếu hàng thì không tạo phiếu: đơn chuyển "Chờ xử lý".
  - Mỗi sản phẩm phải được quét trước khi xác nhận giao hàng. Mã quét bị từ chối khi sai phiếu, sai thứ tự FIFO (khác lô), thuộc lô bị khoá hoặc cách ly, hoặc là mã lô.
  - **Sản phẩm cùng lô thay được cho nhau.** Nhân viên quét một sản phẩm cùng lô nhưng không có trong danh sách thì hệ thống đổi chỗ giữ, FIFO vẫn đúng vì cùng lô:
    - Sản phẩm đang tự do thì được gắn vào phiếu, và một sản phẩm chưa quét cùng lô của phiếu được trả về tồn.
    - Sản phẩm đang giữ chỗ cho phiếu khác (chưa quét) thì hai phiếu đổi sản phẩm cho nhau.
    - Sản phẩm đã quét cho phiếu khác thì không lấy được.
- **Biên bản bất thường ghi từng sản phẩm lỗi (UC_11, UC_12):**
  - Biên bản lưu mã các sản phẩm lỗi (bảng `AbnormalReportItem`). Khi xuất kho, nhân viên chọn mã trong danh sách lấy hàng. Khi kiểm kê, nhân viên quét tem từng sản phẩm lỗi. Biên bản lập khi nhập kho ghi mọi sản phẩm của lô không đạt.
  - Sản phẩm lỗi được tách ra ngay khi lập biên bản: trạng thái "Lỗi", ra khỏi `QuantityOnHand` (như "Thất thoát"), không được giữ chỗ hay xuất. Nhân viên để chúng ở khu hàng lỗi.
  - **Phạm vi "Sản phẩm lỗi"** (mặc định khi xuất kho và kiểm kê): phần còn lại của lô vẫn "Bình thường" và xuất được. Duyệt thì sản phẩm giữ trạng thái "Lỗi" (chờ trả nhà cung cấp hoặc hủy). Từ chối thì chúng về "Trong kho".
  - **Phạm vi "Cả lô"**, khi nhân viên tick "Nghi lỗi cả lô" (mốc, ẩm, lỗi sấy…): lô "Tạm cách ly" như Chương 3, duyệt thì khóa lô, từ chối thì lô về "Bình thường". Biên bản lập khi nhập kho luôn là "Cả lô", vì lô đó chỉ gồm hàng không đạt.
  - Khi duyệt, Quản lý có thể đổi phạm vi: khóa cả lô dù nhân viên chỉ báo vài sản phẩm, hoặc ngược lại chỉ loại các sản phẩm lỗi và đưa lô về "Bình thường".
  - Hủy quyết định đưa biên bản về "Chờ duyệt" cùng trạng thái lúc chờ: sản phẩm lại "Lỗi", lô "Cả lô" lại "Tạm cách ly". Sản phẩm đã được giữ chỗ sau khi từ chối được thay theo FIFO. Sản phẩm ghi trên biên bản đã quét lấy, đã xuất hoặc thất thoát thì không hủy được.
  - Một lô có thể có nhiều biên bản "Sản phẩm lỗi" cùng lúc. Khi lô đang có biên bản "Cả lô" chờ duyệt thì không lập thêm được.
  - Báo cáo tồn kho có thêm cột "Hàng lỗi", không tính vào tồn thực tế. Báo cáo biến động tính sản phẩm bị tách ra là điều chỉnh âm tại thời điểm lập biên bản.
- **Xử lý biên bản sau khi duyệt:**
  - Khi duyệt, Quản lý chọn **hướng xử lý** (bắt buộc) và ghi mô tả. Nhân viên có thể đề xuất hướng xử lý lúc báo lỗi hoặc trên biên bản còn chờ duyệt. Mỗi hướng gắn với một kết quả tồn kho cố định, nên không có lựa chọn "Khác".
  - Biên bản đã duyệt đi qua **Chờ xử lý → Đang xử lý → Đã xử lý**. Mỗi lúc chỉ một nhân viên xử lý ("Nhận xử lý"). Người đó có thể "Trả lại việc"; Quản lý có thể "Gỡ người xử lý" và sửa hướng xử lý cho tới khi xong.
  - **Hoàn thành xử lý cập nhật tồn kho:** trả nhà cung cấp, tiêu hủy, thanh lý thì sản phẩm chuyển "Đã loại bỏ"; với "Cả lô" mọi sản phẩm còn trong lô cũng vậy và lô về tồn 0 (vẫn "Đã khóa"). Sửa chữa thì sản phẩm "Lỗi" về "Trong kho"; với "Cả lô" lô được mở khóa. Một biên bản chỉ có một kết quả cho mọi sản phẩm.
  - Báo cáo biến động: sản phẩm sửa xong có điều chỉnh +1 lúc xong (giữ −1 lúc tách ra); sản phẩm của lô khóa bị loại bỏ có điều chỉnh −1 lúc xong.
  - Hủy quyết định và hủy duyệt phiếu nhập không làm được khi biên bản đã có người nhận xử lý.
- **Báo hàng lỗi khi xuất (UC_08 3.1, UC_11):**
  - Mỗi lô có hàng lỗi được lập một biên bản (`IssueId` ghi phiếu xuất). Sản phẩm lỗi được gỡ khỏi phiếu và thay ngay bằng sản phẩm kế tiếp theo FIFO, có thể cùng lô. Hàng đã quét khác của lô vẫn giữ nguyên.
  - Chọn "Nghi lỗi cả lô" thì cả lô chuyển "Tạm cách ly". Mọi sản phẩm của lô đang giữ chỗ trên các phiếu chưa xuất được đổi sang lô khác theo FIFO, hàng đã quét phải trả lại kệ; danh sách lấy hàng của các phiếu khác tự cập nhật.
  - Việc thay thế làm ngay khi lập biên bản, không chờ Quản lý duyệt.
  - Không đủ hàng thay thế thì phiếu chuyển "Đã hủy" (UC_08 3.2): mọi sản phẩm được gỡ khỏi phiếu và đơn chuyển "Chờ xử lý". Hàng đã quét được trả lại kệ. Khi hàng về đủ, đơn có dấu "Đủ hàng" ở tab Đơn chờ xuất để lập phiếu mới.
  - Quét một sản phẩm "Lỗi" khi lấy hàng thì bị từ chối.
- **Kiểm kê (UC_13–15):**
  - Ngày dự kiến của kế hoạch không được trước hôm nay (giờ Việt Nam).
  - Quản lý mở kế hoạch để xem chi tiết: loại, phạm vi, ngày, ghi chú, các lô cần kiểm (phạm vi "Toàn bộ kho" thì là các lô đang có hàng) và mọi phiếu kiểm kê đã gửi cho kế hoạch.
  - **Sửa kế hoạch** (loại, ngày, phạm vi, lô, ghi chú) chỉ được khi kế hoạch "Chờ thực hiện", kể cả sau khi phiếu kiểm kê bị từ chối. Khi "Đang kiểm kê" (có phiếu chờ duyệt) hoặc "Hoàn thành" thì không sửa được. Kế hoạch đang sửa được giữ ngày cũ dù ngày đó đã qua, và giữ được lô đã hết hàng. Lô mới thêm vào phải còn tồn.
  - Phạm vi "Toàn bộ kho" gồm mọi lô của phiếu nhập đã duyệt còn tồn tại thời điểm kiểm, kể cả lô tạm cách ly và đã khóa, vì chúng vẫn nằm trong kho.
  - Số đếm được lưu nháp trên máy nhân viên, kèm thời điểm đếm từng lô (`CountedAt`). Phiếu kiểm kê chỉ được tạo khi gửi.
  - **Số hệ thống = số sản phẩm trên kệ tại thời điểm đếm lô.** Gồm sản phẩm "Trong kho", "Đã giữ chỗ" và "Đã xuất", cùng sản phẩm "Lỗi" bị tách ra sau lúc đếm (`DefectiveAt` > `CountedAt`). Trừ những sản phẩm đã được quét lấy cho phiếu xuất trước thời điểm đó (`PickedAt` ≤ `CountedAt`), vì chúng đang ở khu soạn hàng hoặc đã giao. Nhờ vậy:
    - Hàng giao đi sau lúc đếm không làm phiếu ra "thừa".
    - Hàng đang soạn không bị tính là "thiếu".
    - Đếm xong lô rồi mới báo lỗi vài sản phẩm thì phiếu vẫn khớp.
    - Thời điểm đếm được chấp nhận trong 30 ngày gần nhất và không được ở tương lai.
  - Màn đếm **không hiện số hệ thống** cho tới khi lô đã đếm xong (đếm mù). Lô có hàng đang soạn thì hiện riêng số đó.
  - **Hai cách đếm mỗi lô:**
    - **Nhập số:** như cũ.
    - **Quét tem:** quét từng sản phẩm. Mã lạ, mã thuộc lô khác, mã đã xuất hoặc đang soạn đều bị báo ngay. Sản phẩm không quét được thì ghi vào "Không có tem". Số thực tế = số mã quét được + số không có tem.
  - Nhân viên phải đếm mọi lô (không tìm thấy thì nhập 0) và ghi lý do cho lô có chênh lệch. Lô đang nằm trong một phiếu kiểm kê khác còn chờ duyệt thì không gửi được.
  - Gửi phiếu thì kế hoạch chuyển "Đang kiểm kê". Từ chối thì kế hoạch trở về "Chờ thực hiện" để kiểm lại (lần sau là phiếu mới). Duyệt thì kế hoạch "Hoàn thành".
  - Khi duyệt, tồn được điều chỉnh theo từng lô:
    - **Lô quét tem:** đúng những sản phẩm có trên kệ lúc đếm mà không quét được (và hiện vẫn còn trên kệ) chuyển "Thất thoát". Sản phẩm đang "Thất thoát" mà quét thấy thì về "Trong kho". Phần không có tem được tạo mã mới.
    - **Lô nhập số**, phần thiếu: chọn trong số sản phẩm còn trên kệ, "Trong kho" trước rồi đến "Đã giữ chỗ" chưa quét lấy. Sản phẩm đã quét lấy cho phiếu xuất không bao giờ bị ghi thất thoát.
    - **Lô nhập số**, phần thừa: được tạo mã định danh mới.
    - Sản phẩm giữ chỗ bị ghi thất thoát được gỡ khỏi phiếu xuất và thay theo FIFO. Không đủ hàng thay thì phiếu đó chuyển "Đã hủy" và đơn "Chờ xử lý".
  - Biên bản lập trong lúc kiểm kê (nguồn "Kiểm kê"): nhân viên quét tem các sản phẩm lỗi, chúng được tách ra ngay. Sản phẩm lỗi đang giữ chỗ trên phiếu xuất (chưa quét lấy) được thay theo FIFO. Chọn "Nghi lỗi cả lô" thì lô "Tạm cách ly" và mọi sản phẩm giữ chỗ của lô được thay, như khi báo lỗi lúc xuất.
- **Tra cứu lô (UC_16):** chỉ hiện lô của phiếu nhập đã duyệt. Quét mã lô hoặc mã sản phẩm đều mở được lô tương ứng.
- **ROP, EOQ, đề xuất bổ sung: bộ "Quy tắc đề xuất bổ sung hàng hóa" (Q1–Q20).** Công thức nằm ở `ReplenishmentRules`; dịch vụ và dữ liệu mẫu dùng chung. Các ngưỡng là hằng số hệ thống, không nhập theo mặt hàng.
  - **Hằng số:**
    - cửa sổ nhu cầu 4 tuần (28 ngày), z = 1,65;
    - "Theo dõi" khi chạm ROP trong 7 ngày, trần số lượng là nhu cầu 12 tuần;
    - chậm luân chuyển khi không có đơn trong 8 tuần.
  - **Nhu cầu (Q1–Q3):**
    - Nhu cầu ngày là tổng `OrderDetails.Quantity` của các đơn đặt trong ngày đó, theo `OrderDate` giờ Việt Nam. Mọi đơn đã tiếp nhận đều tính, dù đã xuất hay chưa.
    - Cửa sổ là 28 ngày trọn vẹn trước ngày tính. d = tổng ÷ 28. σ là độ lệch chuẩn tổng thể của 28 ngày, kể cả ngày bằng 0.
    - "Chưa đủ dữ liệu": ngày có dữ liệu đầu tiên (đơn đầu tiên hoặc phiếu nhập đã duyệt đầu tiên, lấy ngày sớm hơn) chưa đủ 28 ngày.
    - "Chậm luân chuyển": không có đơn trong 56 ngày.
    - Hai loại này không có SS, ROP, EOQ, không cảnh báo, không đề xuất. Màn Cảnh báo gợi ý rà soát hàng chậm luân chuyển.
  - **Tính hằng tuần (Q4–Q6):**
    - SS = z × σ × √L. ROP = d × L + SS. EOQ = √(2DS/H) với D = d × 365, làm tròn lên.
    - Tác vụ nền chạy mỗi thứ Hai 02:00 giờ Việt Nam (cấu hình `Replenishment:Cron`). Khi khởi động, nó chạy ngay nếu lần tính gần nhất đã quá 7 ngày. Quản lý có nút "Tính lại ngay".
    - Giữa hai lần tính, hệ thống chỉ so sánh với các giá trị đã lưu.
  - **Điều kiện (Q7–Q10):**
    - Tồn khả dụng = tổng `QuantityOnHand` của các lô "Bình thường" thuộc phiếu nhập đã duyệt.
    - Tồn ròng = tồn khả dụng − tổng số lượng của các đơn "Chưa xuất / Chờ xử lý / Đang xuất".
    - Việc kiểm tra chạy sau mọi thay đổi tồn hoặc đơn: tiếp nhận đơn mới, duyệt hoặc hủy duyệt phiếu nhập, giao hàng, báo lỗi, duyệt kiểm kê, duyệt hoặc từ chối biên bản.
    - **Tồn ròng ≤ ROP:**
      - Mở cảnh báo hoặc cập nhật cảnh báo đang mở. `StockAlert.CurrentQuantity` lưu tồn ròng.
      - Mỗi mặt hàng có tối đa một đề xuất mở. Đề xuất "Chờ xem xét" được cập nhật căn cứ và số lượng; số quản lý đã sửa thì giữ.
    - **Tồn ròng > ROP:** cảnh báo và đề xuất đang chờ chuyển "Đã đóng".
    - **Đã chốt: đề xuất chỉ là gợi ý.** Quản lý tick các đề xuất và lập báo cáo (bảng `ReplenishmentReport`); đề xuất chuyển "Đã lập báo cáo" và kết thúc. Mua gì, bao nhiêu, khi nào do bộ phận mua hàng quyết định ngoài hệ thống, nên phiếu nhập không nối với đề xuất.
    - **Đã chốt (đọc Q10):** sau khi lập báo cáo, mặt hàng không có đề xuất mới trong L + 3 ngày (hàng có thể đang về). Hết thời gian đó, nếu tồn ròng vẫn ≤ ROP thì tạo đề xuất mới; tác vụ nền kiểm tra lại mỗi ngày lúc 02:00, ngoài các lần kiểm tra khi tồn thay đổi.
    - Đề xuất bị loại ("Không đề xuất") không được tạo lại trong cùng tuần (từ thứ Hai 00:00 giờ Việt Nam). Sang tuần sau, nếu tồn ròng vẫn ≤ ROP thì tạo đề xuất mới.
  - **Ưu tiên (Q11–Q12):**
    - Số ngày tồn còn lại = tồn ròng ÷ d.
    - Khẩn cấp: số ngày tồn còn lại < L, hoặc tồn ròng ≤ 0. Cần đặt: tồn ròng ≤ ROP. Theo dõi: (tồn ròng − ROP) ÷ d ≤ 7.
    - **Đã chốt: d = 0** (không có đơn trong 4 tuần nhưng chưa tới 8 tuần, nên ROP = EOQ = 0): không cảnh báo, không đề xuất. Chỉ khi đơn chưa xuất vượt tồn (tồn ròng < 0) mới là Khẩn cấp, số lượng đúng phần thiếu.
    - Mức ưu tiên lưu trên đề xuất (`Priority`).
  - **Số lượng (Q13–Q16):**
    - Số lượng gốc = ROP + EOQ − tồn ròng (`BaseQuantity`).
    - **Đã chốt: bỏ nhu cầu ngắn hạn d2 và điều chỉnh xu hướng (Q14).** Hàng gia dụng ít biến động nên chỉ dùng nhu cầu 4 tuần gần nhất. Hai cột `RecentDailyDemand` đã xoá (migration `DropShortTermDemand`).
    - Không vượt 12 × 7 × d. Làm tròn lên. Kết quả lưu ở `OriginalQuantity`.
    - Khi bị chặn trần, căn cứ lưu ở `AdjustBasis`, ví dụ "Vượt trần nhu cầu 12 tuần, giảm còn 420". Không bị chặn thì số đề xuất = số lượng gốc.
  - **Báo cáo và duyệt (Q17–Q20):**
    - Tab "Chờ duyệt" của màn Đề xuất chính là báo cáo, kèm bản in A4 ngang (`/in/bao-cao/de-xuat`).
    - Nhóm theo nhà cung cấp chính. Trong nhóm sắp theo Khẩn cấp → Cần đặt → Theo dõi, rồi theo số ngày còn lại tăng dần.
    - Dòng "Theo dõi" là mặt hàng không có đề xuất mở. Nó chỉ xuất hiện trong nhóm nhà cung cấp có hàng Khẩn cấp hoặc Cần đặt, để gợi ý gộp đơn.
    - Mỗi dòng có đủ các cột Q19.
    - Quản lý duyệt hoặc từ chối (bắt buộc lý do). Hệ thống không tạo đơn mua hàng.
  - **Mở rộng giữ lại:**
    - Duyệt nhiều đề xuất một lúc.
    - Quản lý sửa số lượng phải ghi lý do (`AdjustReason`). `OriginalQuantity` giữ số hệ thống đề xuất.
    - Đề xuất lưu căn cứ lúc lập (`AvailableQuantity`, `NetQuantity`, `ROPValue`, `EOQValue`, d). Đề xuất đã xử lý hiển thị các số này thay vì số hiện tại.
- **Báo cáo (UC_19):**
  - Báo cáo tồn kho lấy số tại thời điểm xem và tách thành khả dụng, giữ chỗ, tạm cách ly, đã khóa.
  - Báo cáo biến động nhập xuất cho một kỳ (từ ngày – đến ngày, giờ Việt Nam). Tồn thực tế chỉ thay đổi khi duyệt phiếu nhập (+), giao hàng (−) và duyệt kiểm kê (±), nên tồn cuối kỳ được tính bằng tồn hiện tại trừ đi các phát sinh sau kỳ. Tồn đầu kỳ = tồn cuối − nhập + xuất − điều chỉnh. Nhờ vậy tồn cuối kỳ này luôn bằng tồn đầu kỳ sau.
  - "Xuất báo cáo" tải file CSV (UTF-8 có BOM, mở được bằng Excel) hoặc in trực tiếp từ trình duyệt.
  - Hai báo cáo trong sơ đồ BFD ("Báo cáo bất thường" và "Báo cáo hỗ trợ bổ sung hàng") không có màn báo cáo riêng. Nội dung của chúng nằm ở màn Biên bản bất thường (lọc theo trạng thái, nguồn) và các màn Cảnh báo, Đề xuất.
- **Thời gian:** EF đọc mọi cột `datetime2` với Kind = UTC, nên JSON có hậu tố `Z` và giao diện đổi đúng sang giờ Việt Nam. Trước bản sửa này, giờ hiển thị bị lệch 7 tiếng.
- **Đơn hàng:** `POST /api/orders` là điểm tiếp nhận đơn từ hệ thống bán hàng. Tạm thời dùng quyền Quản lý thay cho khóa tích hợp.
- **Thông báo:** gửi duyệt thì báo cho mọi Quản lý đang hoạt động. Duyệt hoặc từ chối phiếu và biên bản thì báo cho người lập.
- **Nhận phiếu khi lấy hàng (mở rộng):** mỗi lúc chỉ một nhân viên lấy hàng một phiếu xuất "Đã duyệt".
  - Bấm "Bắt đầu lấy hàng" là nhận phiếu. Quét mã trên phiếu chưa ai nhận cũng tự nhận phiếu.
  - Người khác mở phiếu thì chỉ xem được, kèm dòng "Đang do … lấy hàng". Họ không quét, báo lỗi hay xác nhận giao hàng được.
  - Phiếu được giữ cho người đã nhận trong 3 ngày, tính từ lúc nhận phiếu (quét thêm không gia hạn). Hết 3 ngày, người khác được bấm "Nhận lại phiếu" và hai người tự bàn giao hàng đã lấy. Trong 3 ngày đó, muốn đổi người thì người đang giữ nhường phiếu hoặc Quản lý gỡ. Quét mã không bao giờ tự chiếm phiếu của người khác.
  - "Nhường phiếu" (người đang lấy) và "Gỡ người lấy hàng" (Quản lý, bất cứ lúc nào) trả phiếu về trạng thái chưa ai nhận. Các mã đã quét được giữ nguyên.
  - Từ chối phiếu thì xóa người lấy hàng. Hủy duyệt thì giữ, để khi duyệt lại người đó lấy tiếp.
- **Chống ghi đè khi hai người thao tác cùng lúc:** ba cột được đánh dấu concurrency token (EF thêm điều kiện vào câu UPDATE, không thêm cột):
  - `GoodsIssue.PickerId`: hai người cùng nhận một phiếu.
  - `Order.Status`: hai người cùng lập phiếu xuất cho một đơn.
  - `StockItem.IssueDetailId`: hai phiếu cùng giữ chỗ một sản phẩm.
  - Bên lưu sau nhận lỗi 409 "Dữ liệu vừa được người khác thay đổi. Tải lại trang rồi thử lại."
- **Hủy duyệt (mở rộng, Chương 3 không có):** Quản lý có thể rút lại quyết định đã đưa ra. Mỗi lần hủy bắt buộc nhập lý do (tối thiểu 5 ký tự). Lý do bắt buộc nhập nhưng không lưu thành cột riêng.
  - **Phiếu nhập** "Đã duyệt" trở về "Chờ duyệt". Tồn của mọi lô trong phiếu về 0, sản phẩm về "Chờ nhập". Biên bản bất thường của phiếu trở về "Chờ duyệt" và lô liên quan về "Tạm cách ly". Đề xuất bổ sung đã chuyển "Đã nhập hàng" nhờ phiếu này trở về "Đã duyệt". Sau đó Quản lý duyệt lại, hoặc từ chối để nhân viên sửa phiếu. Không hủy được trong các trường hợp sau:
    - Có sản phẩm đã được giữ chỗ, đã xuất hoặc bị điều chỉnh (tồn lô khác số nhập).
    - Lô đã nằm trong kế hoạch kiểm kê hoặc phiếu kiểm kê.
    - Lô có biên bản phát sinh sau khi nhập.
    - Khi rơi vào một trong các trường hợp trên, màn chi tiết phiếu không hiện nút "Hủy duyệt" mà ghi lý do.
  - **Phiếu xuất** "Đã duyệt" (chưa giao) trở về "Chờ duyệt". Sản phẩm vẫn được giữ chỗ và các mã đã quét được giữ nguyên, nhưng nhân viên không quét tiếp được cho đến khi phiếu được duyệt lại. Nếu Quản lý từ chối thì hàng được trả về tồn như khi từ chối thông thường. Phiếu "Đã xuất" thì không hủy được, vì tồn kho đã trừ và hàng đã giao cho khách.
  - **Biên bản bất thường** "Đã duyệt" hoặc "Từ chối" trở về "Chờ duyệt": sản phẩm ghi trên biên bản lại "Lỗi", biên bản "Cả lô" thì lô lại "Tạm cách ly". Không hủy được trong các trường hợp sau:
    - Trạng thái lô đã khác trạng thái mà quyết định này đặt ra.
    - Lô có biên bản mới hơn.
    - Sau khi từ chối biên bản, sản phẩm của lô đã được giữ chỗ hoặc đã xuất.
  - Phiếu kiểm kê và đề xuất bổ sung chưa có chức năng hủy duyệt.

## Cần sửa trong báo cáo cho khớp với Hình 3.10

- **UC_02, UC_03:** thêm bước "Xem chi tiết". Hàng hóa: tồn theo trạng thái lô, chính sách tồn kho (ROP, EOQ) và danh sách lô. Nhà cung cấp: hàng hóa cung cấp, hàng đã đặt chưa về và phiếu nhập kho. Từ màn chi tiết Quản lý sửa được thông tin.
- **UC_13:** thêm luồng "Xem chi tiết và sửa kế hoạch". Chỉ sửa được khi kế hoạch "Chờ thực hiện".
- **UC_11, UC_12:** thêm bước "In biên bản". Biên bản in khổ A4 gồm: hàng hóa liên quan, mô tả lỗi, danh sách mã sản phẩm lỗi, ý kiến xử lý của quản lý và chỗ ký của người lập, quản lý kho (và đại diện nhà cung cấp nếu phát hiện khi nhập kho).
- **UC_19:** "In báo cáo" mở báo cáo thành văn bản khổ A4 ngang: phần tổng hợp, bảng chi tiết chia theo nhóm hàng có dòng cộng nhóm và tổng cộng, ghi chú cách tính, ngày lập và chỗ ký của người lập biểu, quản lý kho. Điều kiện lọc (kỳ, nhóm hàng, mặt hàng) giữ nguyên như trên màn hình.
- **Mục 3.3.1:** đổi "20 bảng" thành "19 bảng". Nhóm "tồn kho theo lô (StockLot, StockItem)" chỉ còn StockItem; lô thuộc nhóm nhập kho (GoodsReceiptDetail).
- **Bảng 3.24 StockLot:** xoá.
- **Bảng 3.25 StockItem:** `LotId` → `ReceiptDetailId` FK(GoodsReceiptDetail).
- **Bảng 3.27 GoodsReceiptDetail:** bỏ `LotId`; thêm `ProductId` FK(Product), `QuantityOnHand` int DEFAULT 0, `Status` nvarchar(20) (Bình thường / Tạm cách ly / Đã khóa).
- **Bảng 3.31 GoodsIssueDetail:** `LotId` → `ProductId` FK(Product); đổi mô tả thành "mỗi mặt hàng một dòng".
- **Bảng 3.33, 3.35, 3.36** (StocktakePlanDetail, StocktakeDetail, AbnormalReport): `LotId` → `ReceiptDetailId`.
- **UC_18 luồng 3.1** (nhóm "Chưa xác định nhà cung cấp"): `Product.SupplierId` là NOT NULL (bảng 3.23) nên trường hợp này không xảy ra. Nên bỏ luồng này hoặc cho phép SupplierId NULL.
- **Sơ đồ BFD (Hình 3.1):** có "Báo cáo bất thường" và "Báo cáo hỗ trợ bổ sung hàng", nhưng UC_19 chỉ có báo cáo tồn kho và báo cáo biến động nhập xuất. App làm theo UC_19.
- **UC_14 (kiểm đếm):**
  - Thêm cách đếm bằng quét tem (luồng thay thế cho bước nhập số thực tế).
  - Số hệ thống không hiện trước khi đếm xong lô.
  - Hàng đang soạn cho phiếu xuất được tách ra khỏi số trên kệ.
  - Bảng 3.35 StocktakeDetail thêm `CountedAt`, `Method`, `UnlabeledQuantity`; thêm bảng StocktakeItem.
- **UC_15 bước 7:** sản phẩm ghi "Thất thoát" là đúng các mã không quét được (lô quét tem). Mã đang thất thoát mà quét thấy thì được khôi phục.
- **UC_08 bước 2:** quét sản phẩm khác nhưng cùng lô thì hệ thống nhận và đổi chỗ giữ, không báo sai FIFO.
- **UC_08 (lấy hàng):**
  - Thêm bước đầu "Nhận phiếu lấy hàng". Thêm ngoại lệ "Phiếu đang do nhân viên khác lấy hàng": chỉ xem được, nhận lại được sau 3 ngày kể từ lúc người kia nhận phiếu. Bảng 3.30 GoodsIssue thêm `PickerId`, `PickStartedAt`, `PickActiveAt`.
  - Ở bước quét, nhân viên có thể gõ SKU, tên hàng hoặc mã lô: hệ thống đưa tới mặt hàng đó và chỉ lô, mã cần lấy tiếp theo FIFO.
- **UC_07 / bảng 3.28 Order:** đơn hàng nhận từ hệ thống bán hàng có thêm số điện thoại, địa chỉ giao hàng, ghi chú (`CustomerPhone`, `ShippingAddress`, `Note`).
- **UC_11, UC_12 (biên bản bất thường):**
  - Biên bản ghi mã từng sản phẩm lỗi (thêm bảng AbnormalReportItem) và phạm vi xử lý (bảng 3.36 thêm `Scope`).
  - Mặc định chỉ tách các sản phẩm lỗi (trạng thái mới "Lỗi" của StockItem, bảng 3.25 thêm `DefectiveAt`), không khóa cả lô. Khóa cả lô khi nhân viên báo nghi lỗi cả lô hoặc Quản lý chọn khi duyệt.
  - UC_14 3.1: nhân viên quét tem sản phẩm lỗi thay vì nhập số lượng.
  - UC_12 thêm bước sau duyệt: chọn hướng xử lý; nhân viên nhận xử lý và hoàn thành; tồn kho cập nhật theo hướng xử lý (bảng 3.36 thêm `HandlingMethod`, `HandlingPlan`, `HandlingStatus`, `HandledBy`, `HandlingStartedAt`, `HandledAt`; bảng 3.25 thêm `HandledAt`, trạng thái "Đã loại bỏ").
- **UC_04, UC_18:**
  - Phiếu nhập có thêm số chứng từ giao hàng (bảng 3.26 thêm `DeliveryNoteNo`).
  - UC_04 bước 4 (chọn mặt hàng): chỉ chọn được mặt hàng của nhà cung cấp đã chọn, hoặc chọn mặt hàng trước để hệ thống chọn nhà cung cấp.
  - UC_18: "duyệt đề xuất" thành "lập báo cáo đề xuất" (bảng mới `ReplenishmentReport`, bảng 3.39 thêm `ReportId` và đổi giá trị trạng thái). Phiếu nhập không nối với đề xuất.
