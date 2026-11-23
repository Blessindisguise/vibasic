# Từ điển dữ liệu — CSDL Vibasic

Lấy trực tiếp từ DB hiện tại `(localdb)\MSSQLLocalDB` → `Vibasic` (đã áp đủ 10 migration, ngày 11/11/2026). Cập nhật ngày 12/11/2026 theo migration `IssueNoApprovalNoNotifications`: phiếu xuất không cần duyệt, bỏ bảng Notification.

**Quy ước**
- **PK**: khóa chính, tự tăng (`IDENTITY`). **FK → Bảng**: khóa ngoại. **UQ**: giá trị không trùng.
- **Null**: "Có" là được để trống.
- ★ đánh dấu thuộc tính hoặc bảng thêm so với thiết kế Chương 3 (Hình 3.10). Chi tiết lý do ở [schema-changes.md](schema-changes.md).
- Thời điểm (`datetime2`) lưu theo giờ UTC; app đổi sang giờ Việt Nam khi hiển thị.
- Trạng thái lưu bằng chữ tiếng Việt (`nvarchar(20)`), đúng các giá trị liệt kê ở từng bảng.
- Mã chứng từ có dạng `TIỀN TỐ-yymm-nnnn`, ví dụ PN-2611-0001:
  - PN: phiếu nhập; PX: phiếu xuất;
  - KH: kế hoạch kiểm kê; KK: phiếu kiểm kê;
  - BC: biên bản bất thường; DX: báo cáo đề xuất.

Có 22 bảng, chia theo nhóm:
- **Danh mục:** User, ProductCategory, Supplier, Product.
- **Nhập kho:** GoodsReceipt, GoodsReceiptDetail, StockItem.
- **Xuất kho:** Order, OrderDetail, GoodsIssue, GoodsIssueDetail.
- **Kiểm kê:** StocktakePlan, StocktakePlanDetail, Stocktake, StocktakeDetail, StocktakeItem★.
- **Biên bản bất thường:** AbnormalReport, AbnormalReportItem★.
- **Hỗ trợ ra quyết định:** InventoryPolicy, StockAlert, ReplenishmentProposal, ReplenishmentReport★.

App không có thông báo trong app: mỗi việc cần làm hiện ở màn hình riêng của nó (Chờ duyệt, Cảnh báo tồn kho, Đơn chờ xuất, Cần lấy hàng, Kiểm kê).

---

## 1. Danh mục

### User — Người dùng
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| UserId | int | Không | PK | Mã người dùng |
| Username | nvarchar(50) | Không | UQ | Tên đăng nhập |
| PasswordHash | nvarchar(255) | Không | | Mật khẩu đã băm (không lưu mật khẩu gốc) |
| FullName | nvarchar(100) | Không | | Họ tên |
| Role | nvarchar(20) | Không | | Vai trò: Quản lý / Nhân viên kho |
| IsActive | bit | Không | | 1 = đang hoạt động; 0 = đã khóa, không đăng nhập được |

### ProductCategory — Nhóm hàng
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| CategoryId | int | Không | PK | Mã nhóm hàng |
| CategoryName | nvarchar(100) | Không | UQ | Tên nhóm hàng |
| Description | nvarchar(255) | Có | | Mô tả |

### Supplier — Nhà cung cấp
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| SupplierId | int | Không | PK | Mã nhà cung cấp |
| SupplierName | nvarchar(150) | Không | | Tên nhà cung cấp |
| Phone | nvarchar(20) | Có | | Số điện thoại |
| Address | nvarchar(255) | Có | | Địa chỉ |

### Product — Mặt hàng
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| ProductId | int | Không | PK | Mã mặt hàng |
| SupplierId | int | Không | FK → Supplier | Nhà cung cấp của mặt hàng |
| CategoryId | int | Không | FK → ProductCategory | Nhóm hàng |
| SKU | nvarchar(50) | Không | UQ | Mã hàng (SKU), dùng để tạo mã sản phẩm SP-… |
| ProductName | nvarchar(150) | Không | | Tên mặt hàng |
| Unit | nvarchar(20) | Không | | Đơn vị tính (cái, hộp…) |

---

## 2. Nhập kho

### GoodsReceipt — Phiếu nhập kho
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| ReceiptId | int | Không | PK | Mã phiếu nhập |
| Code ★ | nvarchar(20) | Không | UQ | Số phiếu hiển thị, PN-yymm-nnnn |
| SupplierId | int | Không | FK → Supplier | Nhà cung cấp giao hàng |
| ReceiptDate | datetime2 | Không | | Ngày nhập; dùng xếp thứ tự FIFO |
| CreatedBy | int | Không | FK → User | Nhân viên lập phiếu |
| ApprovedBy | int | Có | FK → User | Quản lý duyệt hoặc từ chối |
| SubmittedAt ★ | datetime2 | Có | | Thời điểm gửi duyệt |
| ApprovedAt ★ | datetime2 | Có | | Thời điểm duyệt hoặc từ chối |
| Status | nvarchar(20) | Không | | Đang nhập kho / Chờ duyệt / Đã duyệt / Từ chối |
| RejectReason ★ | nvarchar(255) | Có | | Lý do từ chối |
| Note ★ | nvarchar(255) | Có | | Ghi chú |
| DeliveryNoteNo ★ | nvarchar(50) | Có | | Số chứng từ giao hàng của nhà cung cấp |

### GoodsReceiptDetail — Chi tiết phiếu nhập = Lô hàng
Mỗi dòng chi tiết là một **lô**; không có bảng Lô riêng. Hàng đạt và hàng không đạt của cùng một mặt hàng nằm ở hai lô khác nhau.

| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| ReceiptDetailId | int | Không | PK | Mã lô |
| ReceiptId | int | Không | FK → GoodsReceipt | Phiếu nhập chứa lô |
| ProductId | int | Không | FK → Product | Mặt hàng của lô |
| LotCode ★ | nvarchar(50) | Không | UQ | Mã tem lô, LOT-yymm-nnn |
| Quantity | int | Không | | Số lượng thực nhận vào lô |
| QuantityOnHand | int | Không | | Tồn hiện tại của lô. Bằng 0 cho tới khi phiếu được duyệt; giảm khi xuất hoặc kiểm kê điều chỉnh |
| Status | nvarchar(20) | Không | | Trạng thái lô: Bình thường / Tạm cách ly / Đã khóa |
| DocumentQuantity ★ | int | Có | | Số lượng trên chứng từ nhà cung cấp, khi khác số thực nhận |
| Note ★ | nvarchar(255) | Có | | Ghi chú của lô |

### StockItem — Sản phẩm (từng đơn vị hàng có mã riêng)
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| ItemId | int | Không | PK | Mã sản phẩm |
| ReceiptDetailId | int | Không | FK → GoodsReceiptDetail | Lô chứa sản phẩm |
| SerialCode | nvarchar(50) | Không | UQ | Mã tem sản phẩm, SP-{SKU}-yymm-nnnn |
| Status | nvarchar(20) | Không | | Chờ nhập / Trong kho / Đã giữ chỗ / Đã xuất / Thất thoát / Lỗi★ / Đã loại bỏ★ |
| IssueDetailId | int | Có | FK → GoodsIssueDetail | Dòng phiếu xuất đang giữ hoặc đã xuất sản phẩm |
| PickedAt ★ | datetime2 | Có | | Thời điểm quét khi lấy hàng |
| DefectiveAt ★ | datetime2 | Có | | Thời điểm bị tách ra là hàng lỗi. Giữ lại sau khi sửa xong để báo cáo nhập–xuất–tồn thấy cả lúc tách ra và lúc trở về |
| HandledAt ★ | datetime2 | Có | | Thời điểm biên bản xử lý xong sản phẩm này: rời kho (Đã loại bỏ) hoặc sửa xong trở về kho |

Ý nghĩa trạng thái:
- **Chờ nhập:** phiếu nhập chưa duyệt.
- **Đã giữ chỗ:** đã phân cho một phiếu xuất theo FIFO.
- **Thất thoát:** thiếu khi kiểm kê.
- **Lỗi:** nằm trên biên bản bất thường; không tính tồn, không được xuất.
- **Đã loại bỏ:** đã rời kho khi biên bản được xử lý xong theo hướng trả nhà cung cấp, tiêu hủy hoặc thanh lý. Không tính tồn, không xuất, không kiểm kê.

---

## 3. Xuất kho

### Order — Đơn hàng (từ hệ thống bán hàng)
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| OrderId | int | Không | PK | Mã đơn trong hệ thống |
| ExternalCode | nvarchar(50) | Không | UQ | Mã đơn bên hệ thống bán hàng |
| CustomerName ★ | nvarchar(150) | Có | | Tên khách; trống là khách lẻ |
| OrderDate | datetime2 | Không | | Thời điểm đặt; đơn cũ hơn được ưu tiên |
| Status | nvarchar(20) | Không | | Chưa xuất / Chờ xử lý / Đang xuất★ / Đã xuất / Đã hủy★ |
| CustomerPhone ★ | nvarchar(20) | Có | | SĐT người nhận |
| Note ★ | nvarchar(500) | Có | | Ghi chú giao hàng |
| ShippingAddress ★ | nvarchar(300) | Có | | Địa chỉ giao |
| CancelReason ★ | nvarchar(255) | Có | | Lý do hủy đơn |
| CancelledAt ★ | datetime2 | Có | | Thời điểm hủy |
| CancelledBy ★ | int | Có | FK → User | Quản lý hủy đơn |

Ý nghĩa trạng thái:
- **Chờ xử lý:** thiếu hàng.
- **Đang xuất:** đã có phiếu xuất chưa giao.
- **Đã hủy:** không còn tính vào tồn ròng và nhu cầu.

### OrderDetail — Chi tiết đơn hàng
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| OrderDetailId | int | Không | PK | Mã dòng |
| OrderId | int | Không | FK → Order | Đơn hàng |
| ProductId | int | Không | FK → Product | Mặt hàng đặt |
| Quantity | int | Không | | Số lượng đặt |

### GoodsIssue — Phiếu xuất kho
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| IssueId | int | Không | PK | Mã phiếu xuất |
| Code ★ | nvarchar(20) | Không | UQ | Số phiếu, PX-yymm-nnnn |
| OrderId | int | Không | FK → Order | Đơn hàng được xuất |
| IssueDate | datetime2 | Không | | Ngày lập phiếu |
| CreatedBy ★ | int | Không | FK → User | Nhân viên lập phiếu |
| Status | nvarchar(20) | Không | | Chờ lấy hàng★ / Đã hủy★ / Đã xuất |
| CancelReason ★ | nvarchar(255) | Có | | Lý do phiếu "Đã hủy": đơn bị hủy, hoặc không đủ hàng thay thế khi báo lỗi |
| ReceiverName ★ | nvarchar(100) | Có | | Người nhận hàng tại kho: tài xế, hoặc khách tự đến lấy (biên bản giao hàng) |
| ReceiverPhone ★ | nvarchar(20) | Có | | Số điện thoại người nhận, để liên lạc khi hàng đang trên đường |
| VehiclePlate ★ | nvarchar(20) | Có | | Biển số xe chở hàng, ví dụ 29C-123.45. Trống nếu khách tự lấy không dùng xe |
| DeliveredAt ★ | datetime2 | Có | | Thời điểm giao |
| DeliveredBy ★ | int | Có | FK → User | Nhân viên giao hàng |
| PickActiveAt ★ | datetime2 | Có | | Lần cuối người lấy hàng nhận phiếu hoặc quét |
| PickStartedAt ★ | datetime2 | Có | | Thời điểm nhận phiếu lấy hàng; phiếu được giữ cho người này 3 ngày |
| PickerId ★ | int | Có | FK → User | Nhân viên đang lấy hàng; chỉ người này được quét, báo lỗi, giao |

### GoodsIssueDetail — Chi tiết phiếu xuất
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| IssueDetailId | int | Không | PK | Mã dòng |
| IssueId | int | Không | FK → GoodsIssue | Phiếu xuất |
| ProductId | int | Không | FK → Product | Mặt hàng. Mỗi mặt hàng chỉ một dòng: UQ(IssueId, ProductId). Sản phẩm của dòng có thể đến từ nhiều lô (xem StockItem.IssueDetailId) |
| Quantity | int | Không | | Số lượng xuất |

---

## 4. Kiểm kê

### StocktakePlan — Kế hoạch kiểm kê
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| PlanId | int | Không | PK | Mã kế hoạch |
| Code ★ | nvarchar(20) | Không | UQ | Số kế hoạch, KH-yymm-nnnn |
| PlanType | nvarchar(20) | Không | | Định kỳ / Chỉ định |
| ScopeType | nvarchar(20) | Không | | Toàn bộ kho / Một số lô |
| PlannedDate | date | Không | | Ngày dự kiến kiểm kê |
| CreatedBy | int | Không | FK → User | Người lập kế hoạch |
| Status | nvarchar(20) | Không | | Chờ thực hiện / Đang kiểm kê / Hoàn thành |
| Note ★ | nvarchar(255) | Có | | Ghi chú |

### StocktakePlanDetail — Lô thuộc kế hoạch
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| PlanDetailId | int | Không | PK | Mã dòng |
| PlanId | int | Không | FK → StocktakePlan | Kế hoạch |
| ReceiptDetailId | int | Không | FK → GoodsReceiptDetail | Lô cần kiểm |

### Stocktake — Phiếu kiểm kê
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| StocktakeId | int | Không | PK | Mã phiếu kiểm kê |
| Code ★ | nvarchar(20) | Không | UQ | Số phiếu, KK-yymm-nnnn |
| PlanId | int | Không | FK → StocktakePlan | Kế hoạch được thực hiện |
| StocktakeDate | datetime2 | Không | | Ngày kiểm kê |
| CreatedBy | int | Không | FK → User | Nhân viên kiểm kê |
| ApprovedBy | int | Có | FK → User | Quản lý duyệt hoặc từ chối |
| ApprovedAt ★ | datetime2 | Có | | Thời điểm duyệt hoặc từ chối |
| Status | nvarchar(20) | Không | | Chờ duyệt / Đã duyệt / Từ chối |
| RejectReason ★ | nvarchar(255) | Có | | Lý do từ chối |

### StocktakeDetail — Kết quả kiểm từng lô
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| DetailId | int | Không | PK | Mã dòng |
| StocktakeId | int | Không | FK → Stocktake | Phiếu kiểm kê |
| ReceiptDetailId | int | Không | FK → GoodsReceiptDetail | Lô được kiểm |
| SystemQuantity | int | Không | | Số trên hệ thống (số trên kệ tại lúc đếm) |
| ActualQuantity | int | Không | | Số đếm thực tế |
| Reason | nvarchar(255) | Có | | Lý do chênh lệch |
| CountedAt ★ | datetime2 | Có | | Thời điểm đếm lô |
| Method ★ | nvarchar(20) | Không | | Cách đếm: Nhập số / Quét tem |
| UnlabeledQuantity ★ | int | Không | | Đếm bằng quét: số sản phẩm mất hoặc hỏng tem. Vẫn tính vào số thực tế; được cấp mã mới khi duyệt |

### StocktakeItem ★ — Sản phẩm đã quét khi kiểm kê
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| StocktakeItemId | int | Không | PK | Mã dòng |
| DetailId | int | Không | FK → StocktakeDetail | Lô đang kiểm |
| ItemId | int | Không | FK → StockItem | Sản phẩm đã quét. UQ(DetailId, ItemId): mỗi mã chỉ tính một lần |

Sản phẩm của lô không có trong bảng này bị xem là thiếu. Khi duyệt phiếu, chúng chuyển "Thất thoát".

---

## 5. Biên bản bất thường

### AbnormalReport — Biên bản bất thường
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| ReportId | int | Không | PK | Mã biên bản |
| Code ★ | nvarchar(20) | Không | UQ | Số biên bản, BC-yymm-nnnn |
| ReceiptDetailId | int | Không | FK → GoodsReceiptDetail | Lô có hàng bất thường |
| SourceType | nvarchar(20) | Không | | Phát hiện khi: Nhập kho / Xuất kho / Kiểm kê |
| Description | nvarchar(500) | Không | | Mô tả tình trạng |
| Quantity | int | Không | | Số lượng hàng lỗi |
| CreatedBy | int | Không | FK → User | Người lập |
| CreatedAt ★ | datetime2 | Không | | Thời điểm lập |
| ApprovedBy | int | Có | FK → User | Quản lý duyệt hoặc từ chối |
| ApprovedAt ★ | datetime2 | Có | | Thời điểm duyệt hoặc từ chối |
| Status | nvarchar(20) | Không | | Chờ duyệt / Đã duyệt / Từ chối |
| RejectReason ★ | nvarchar(255) | Có | | Lý do từ chối (khi đó sản phẩm trở lại "Trong kho") |
| IssueId ★ | int | Có | FK → GoodsIssue | Phiếu xuất đang lấy hàng khi phát hiện lỗi |
| Scope ★ | nvarchar(20) | Không | | Phạm vi, quản lý có thể đổi khi duyệt. **Sản phẩm lỗi:** chỉ tách các mã ghi trên biên bản. **Cả lô:** lô bị cách ly, khi duyệt thì khóa |
| HandlingMethod ★ | nvarchar(20) | Có | | Hướng xử lý quản lý chọn khi duyệt: Trả nhà cung cấp / Tiêu hủy / Thanh lý giảm giá (hàng rời kho khi xong) hoặc Sửa chữa, tân trang (hàng trở về kho) |
| HandlingPlan ★ | nvarchar(500) | Có | | Mô tả hướng xử lý. Nhân viên có thể đề xuất khi lập biên bản; quản lý chốt khi duyệt |
| HandlingStatus ★ | nvarchar(20) | Có | | Có từ khi duyệt: Chờ xử lý / Đang xử lý / Đã xử lý |
| HandledBy ★ | int | Có | FK → User | Nhân viên đang hoặc đã xử lý |
| HandlingStartedAt ★ | datetime2 | Có | | Thời điểm nhân viên nhận xử lý |
| HandledAt ★ | datetime2 | Có | | Thời điểm hoàn thành xử lý (tồn kho cập nhật theo hướng xử lý) |

### AbnormalReportItem ★ — Sản phẩm ghi trên biên bản
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| ReportItemId | int | Không | PK | Mã dòng |
| ReportId | int | Không | FK → AbnormalReport | Biên bản |
| ItemId | int | Không | FK → StockItem | Sản phẩm lỗi. UQ(ReportId, ItemId) |

---

## 6. Hỗ trợ ra quyết định

### InventoryPolicy — Chính sách tồn kho (mỗi mặt hàng một dòng)
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| PolicyId | int | Không | PK | Mã chính sách |
| ProductId | int | Không | FK → Product, UQ | Mặt hàng |
| LeadTimeDays | int | Không | | L: số ngày từ lúc đặt tới lúc hàng về |
| SafetyStock (đổi) | decimal(18,2) | Có | | SS: tồn kho an toàn, SS = z × σ × √L. Hệ thống tự tính hằng tuần, không nhập tay. Trống khi chưa tính được |
| OrderingCost | decimal(18,2) | Không | | S: chi phí mỗi lần đặt hàng (đồng) |
| HoldingCost | decimal(18,2) | Không | | H: chi phí lưu kho 1 đơn vị / năm (đồng) |
| CurrentROP | decimal(18,2) | Có | | ROP hiện tại = d × L + SS |
| CurrentEOQ | decimal(18,2) | Có | | EOQ hiện tại = √(2 × D × S / H), với D = d × 365 |
| AvgDailyDemand ★ | decimal(18,4) | Có | | d: nhu cầu bình quân ngày, bằng số lượng đặt 4 tuần gần nhất ÷ 28 |
| LastROPCalculatedAt | datetime2 | Có | | Lần tính ROP gần nhất |
| LastEOQCalculatedAt | datetime2 | Có | | Lần tính EOQ gần nhất |
| DemandState ★ | nvarchar(20) | Không | | Bình thường / Chưa đủ dữ liệu / Chậm luân chuyển. Hai trạng thái sau không tính ROP, EOQ và không sinh đề xuất |
| DemandStdDev ★ | decimal(18,4) | Có | | σ: độ lệch chuẩn nhu cầu ngày trong 4 tuần |

### StockAlert — Cảnh báo tồn kho thấp
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| AlertId | int | Không | PK | Mã cảnh báo |
| ProductId | int | Không | FK → Product | Mặt hàng |
| CurrentQuantity | int | Không | | Tồn ròng ở lần kiểm tra gần nhất. Tồn ròng = khả dụng − số lượng các đơn chưa xuất |
| ROPValue | decimal(18,2) | Không | | ROP dùng để so |
| AlertDate | datetime2 | Không | | Thời điểm mở cảnh báo |
| Status | nvarchar(20) | Không | | Đang mở / Đã đóng (tự đóng khi tồn ròng vượt ROP) |
| ClosedAt ★ | datetime2 | Có | | Thời điểm đóng |

### ReplenishmentProposal — Đề xuất bổ sung hàng
| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| ProposalId | int | Không | PK | Mã đề xuất |
| ProductId | int | Không | FK → Product | Mặt hàng |
| ProposedQuantity | int | Không | | Số lượng đề xuất cuối cùng (sau khi quản lý sửa, nếu có) |
| EOQValue | decimal(18,2) | Không | | EOQ làm căn cứ |
| ProposalDate | datetime2 | Không | | Thời điểm tạo đề xuất |
| ApprovedBy | int | Có | FK → User | Quản lý quyết định (đưa vào báo cáo hoặc loại) |
| ApprovedAt ★ | datetime2 | Có | | Thời điểm quyết định |
| Status | nvarchar(20) | Không | | Chờ xem xét / Đã lập báo cáo / Không đề xuất / Đã đóng |
| OriginalQuantity ★ | int | Không | | Số lượng hệ thống tính, trước khi quản lý sửa |
| AdjustReason ★ | nvarchar(255) | Có | | Lý do quản lý sửa số lượng |
| RejectReason ★ | nvarchar(255) | Có | | Lý do không đề xuất |
| ReportId ★ | int | Có | FK → ReplenishmentReport | Báo cáo chứa đề xuất |
| AvailableQuantity ★ | int | Không | | Tồn khả dụng làm căn cứ |
| ROPValue ★ | decimal(18,2) | Không | | ROP làm căn cứ |
| AdjustBasis ★ | nvarchar(255) | Có | | Giải thích khi hệ thống giảm số lượng về mức trần 12 tuần nhu cầu |
| AvgDailyDemand ★ | decimal(18,4) | Có | | d làm căn cứ |
| BaseQuantity ★ | int | Không | | Số lượng gốc theo công thức, trước khi áp trần |
| NetQuantity ★ | int | Không | | Tồn ròng làm căn cứ |
| Priority ★ | nvarchar(20) | Không | | Mức ưu tiên: Khẩn cấp / Cần đặt |

Ghi chú:
- Các cột căn cứ (AvailableQuantity, ROPValue, NetQuantity, AvgDailyDemand, Priority) cập nhật liên tục khi đề xuất còn "Chờ xem xét". Khi đã quyết định hoặc đóng thì giữ nguyên.
- Trạng thái "Đã đóng": hệ thống tự đóng khi tồn ròng trở lại trên ROP, hoặc mặt hàng không còn ROP.

### ReplenishmentReport ★ — Báo cáo đề xuất bổ sung hàng
Quản lý lập báo cáo từ các đề xuất đã chọn để gửi bên mua hàng. Hệ thống dừng ở đây; việc mua gì, bao nhiêu, khi nào do bên khác quyết định.

| Thuộc tính | Kiểu dữ liệu | Null | Khóa | Ý nghĩa |
|---|---|---|---|---|
| ReportId | int | Không | PK | Mã báo cáo |
| Code | nvarchar(20) | Không | UQ | Số báo cáo, DX-yymm-nnnn |
| CreatedAt | datetime2 | Không | | Thời điểm lập |
| CreatedBy | int | Không | FK → User | Quản lý lập báo cáo |
| ProposalCount | int | Không | | Số đề xuất trong báo cáo |
| SupplierCount | int | Không | | Số nhà cung cấp |
| TotalQuantity | int | Không | | Tổng số lượng đề xuất |
| Snapshot | nvarchar(max) | Không | | Nội dung báo cáo lúc lập (JSON): nhóm theo nhà cung cấp, các dòng đề xuất và dòng "Theo dõi". Lưu lại để in ra giống hệt lần đầu |


---

## 7. Giao diện và bảng dữ liệu liên quan

Ảnh chụp ngày 11/11/2026 từ app đang chạy với dữ liệu mẫu, khung 1280×900. Ảnh nằm trong thư mục [anh-giao-dien/](anh-giao-dien/). Dưới mỗi ảnh là các bảng mà màn hình đó đọc hoặc ghi.

### 7.1. Đăng nhập
![Đăng nhập](anh-giao-dien/01-dang-nhap.png)
*Bảng: User.*

### 7.2. Quản lý — Theo dõi

**Tổng quan kho**
![Tổng quan](anh-giao-dien/10-ql-tong-quan.png)
*Bảng: StockItem, GoodsReceiptDetail, StockAlert, ReplenishmentProposal, GoodsReceipt, GoodsIssue, Stocktake, AbnormalReport, Order, StocktakePlan.*

**Cảnh báo tồn kho thấp**
![Cảnh báo tồn kho](anh-giao-dien/70-ql-canh-bao.png)
*Bảng: StockAlert, InventoryPolicy, Product, Order/OrderDetail (tồn ròng).*

**Đề xuất bổ sung hàng**
![Đề xuất bổ sung](anh-giao-dien/71-ql-de-xuat.png)
*Bảng: ReplenishmentProposal, InventoryPolicy, Product, Supplier.*

**Danh sách báo cáo đề xuất**
![Báo cáo đề xuất](anh-giao-dien/72-ql-bao-cao-de-xuat.png)
*Bảng: ReplenishmentReport, User.*

**In báo cáo đề xuất (DX)**
![In báo cáo đề xuất](anh-giao-dien/73-in-bao-cao-de-xuat.png)
*Bảng: ReplenishmentReport (cột Snapshot), ReplenishmentProposal.*

### 7.3. Quản lý — Nghiệp vụ

**Chờ duyệt** (phiếu nhập, phiếu kiểm kê, biên bản; phiếu xuất không cần duyệt)
![Chờ duyệt](anh-giao-dien/11-ql-cho-duyet.png)
*Bảng: GoodsReceipt, Stocktake, AbnormalReport.*

**Danh sách phiếu nhập kho**
![Phiếu nhập kho](anh-giao-dien/20-ql-nhap-kho.png)
*Bảng: GoodsReceipt, Supplier, User.*

**Chi tiết phiếu nhập**
![Chi tiết phiếu nhập](anh-giao-dien/21-ql-phieu-nhap.png)
*Bảng: GoodsReceipt, GoodsReceiptDetail (lô), Product, AbnormalReport.*

**In mã vạch lô và sản phẩm**
![In tem nhập kho](anh-giao-dien/22-in-tem-nhap-kho.png)
*Bảng: GoodsReceiptDetail (LotCode), StockItem (SerialCode).*

**Danh sách phiếu xuất kho**
![Phiếu xuất kho](anh-giao-dien/30-ql-xuat-kho.png)
*Bảng: GoodsIssue, Order, User.*

**Chi tiết phiếu xuất đang chờ lấy hàng**
![Phiếu xuất chờ lấy hàng](anh-giao-dien/31-ql-phieu-xuat-cho-lay-hang.png)
*Bảng: GoodsIssue, GoodsIssueDetail, StockItem, GoodsReceiptDetail, Order.*

**Phiếu xuất đã giao**
![Phiếu xuất đã xuất](anh-giao-dien/32-ql-phieu-xuat-da-xuat.png)
*Bảng: GoodsIssue (ReceiverName, DeliveredAt, PickerId…), GoodsIssueDetail, StockItem.*

**Đơn hàng chưa giao / đã hủy**
![Đơn hàng](anh-giao-dien/33-ql-don-hang.png)
*Bảng: Order (CancelReason, CancelledAt…), OrderDetail, GoodsIssue.*

**Tra cứu lô**
![Tra cứu lô](anh-giao-dien/40-ql-lo-hang.png)
*Bảng: GoodsReceiptDetail, GoodsReceipt, Product.*

**Chi tiết lô**
![Chi tiết lô](anh-giao-dien/41-ql-chi-tiet-lo.png)
*Bảng: GoodsReceiptDetail, StockItem, GoodsIssue, AbnormalReport.*

**Kiểm kê: kế hoạch và phiếu**
![Kiểm kê](anh-giao-dien/50-ql-kiem-ke.png)
*Bảng: StocktakePlan, Stocktake.*

**Chi tiết kế hoạch kiểm kê**
![Kế hoạch kiểm kê](anh-giao-dien/51-ql-ke-hoach-kiem-ke.png)
*Bảng: StocktakePlan, StocktakePlanDetail, GoodsReceiptDetail, Stocktake.*

**Danh sách biên bản bất thường**
![Biên bản bất thường](anh-giao-dien/60-ql-bien-ban.png)
*Bảng: AbnormalReport, GoodsReceiptDetail, User.*

**Chi tiết biên bản**
![Chi tiết biên bản](anh-giao-dien/61-ql-chi-tiet-bien-ban.png)
*Bảng: AbnormalReport, AbnormalReportItem, StockItem, GoodsReceiptDetail.*

**In biên bản**
![In biên bản](anh-giao-dien/62-in-bien-ban.png)
*Bảng: AbnormalReport, AbnormalReportItem.*

### 7.4. Quản lý — Phân tích

**Báo cáo tồn kho, biến động nhập xuất**
![Báo cáo](anh-giao-dien/80-ql-bao-cao.png)
*Bảng: StockItem, GoodsReceiptDetail, Product, ProductCategory, InventoryPolicy, Order/OrderDetail.*

**In báo cáo tồn kho**
![In báo cáo tồn kho](anh-giao-dien/81-in-bao-cao-ton-kho.png)

**In báo cáo biến động nhập xuất**
![In báo cáo nhập xuất](anh-giao-dien/82-in-bao-cao-nhap-xuat.png)
*Bảng: GoodsReceipt/GoodsReceiptDetail, GoodsIssue/GoodsIssueDetail, Stocktake/StocktakeDetail, AbnormalReport.*

### 7.5. Quản lý — Danh mục

**Hàng hóa**
![Hàng hóa](anh-giao-dien/90-ql-hang-hoa.png)
*Bảng: Product, ProductCategory, Supplier, InventoryPolicy.*

**Chi tiết hàng hóa và chính sách tồn kho**
![Chi tiết hàng hóa](anh-giao-dien/91-ql-chi-tiet-hang-hoa.png)
*Bảng: Product, InventoryPolicy, GoodsReceiptDetail.*

**Nhà cung cấp**
![Nhà cung cấp](anh-giao-dien/92-ql-nha-cung-cap.png)
*Bảng: Supplier, Product.*

**Chi tiết nhà cung cấp**
![Chi tiết nhà cung cấp](anh-giao-dien/93-ql-chi-tiet-nha-cung-cap.png)
*Bảng: Supplier, Product, GoodsReceipt.*

**Tài khoản**
![Tài khoản](anh-giao-dien/94-ql-tai-khoan.png)
*Bảng: User.*

### 7.6. Nhân viên kho

**Xuất kho: đơn chờ xuất, hàng chờ lấy hàng**
![Xuất kho](anh-giao-dien/a0-kho-xuat-kho.png)
*Bảng: Order, OrderDetail, GoodsIssue, StockItem.*

**Lập phiếu xuất theo FIFO**
![Lập phiếu xuất](anh-giao-dien/a1-kho-lap-phieu-xuat.png)
*Bảng: Order, OrderDetail, GoodsReceiptDetail, StockItem. Khi lập phiếu, ghi vào GoodsIssue và GoodsIssueDetail.*

**Phiếu xuất (lấy hàng, quét mã, giao hàng)**
![Phiếu xuất](anh-giao-dien/a2-kho-phieu-xuat.png)
*Bảng: GoodsIssue, GoodsIssueDetail, StockItem (PickedAt).*

**Danh sách phiếu nhập**
![Nhập kho](anh-giao-dien/b0-kho-nhap-kho.png)
*Bảng: GoodsReceipt.*

**Lập phiếu nhập**
![Lập phiếu nhập](anh-giao-dien/b1-kho-lap-phieu-nhap.png)
*Bảng: ghi vào GoodsReceipt, GoodsReceiptDetail, StockItem, AbnormalReport (khi có hàng không đạt).*

**Tra cứu lô**
![Tra cứu lô](anh-giao-dien/c0-kho-tra-cuu-lo.png)

**Chi tiết lô**
![Chi tiết lô](anh-giao-dien/c1-kho-chi-tiet-lo.png)
*Bảng: GoodsReceiptDetail, StockItem.*

**Kế hoạch cần kiểm kê**
![Kiểm kê](anh-giao-dien/d0-kho-kiem-ke.png)
*Bảng: StocktakePlan, Stocktake.*

**Đếm kiểm kê** (nhập số hoặc quét tem)
![Đếm kiểm kê](anh-giao-dien/d1-kho-dem-kiem-ke.png)
*Bảng: ghi vào Stocktake, StocktakeDetail, StocktakeItem.*

**Báo lỗi (biên bản đã lập)**
![Báo lỗi](anh-giao-dien/e0-kho-bao-loi.png)
*Bảng: AbnormalReport, AbnormalReportItem.*

---

## 8. Quy trình từng bước

Các bước dưới đây được làm thật trên **bản sao** của CSDL, nên dữ liệu thật không bị thay đổi. Ảnh nằm trong [anh-giao-dien/quy-trinh/](anh-giao-dien/quy-trinh/). Dưới mỗi bước có ghi dữ liệu thay đổi ở bảng nào.

### 8.1. Nhập kho (UC_04, UC_05)

**Bước 1. Nhân viên mở phiếu nhập mới**
![](anh-giao-dien/quy-trinh/n01-lap-phieu-nhap-moi.png)

**Bước 2. Điền phiếu**
- Chọn mặt hàng thì nhà cung cấp được điền theo.
- Nhập số thực nhận, số không đạt, số trên chứng từ.
- Khi số liệu chênh lệch thì bắt buộc ghi chú; khi có hàng không đạt thì bắt buộc mô tả lỗi.

![](anh-giao-dien/quy-trinh/n02-lap-phieu-nhap-dien.png)
![](anh-giao-dien/quy-trinh/n03-lap-phieu-nhap-dien-2.png)

**Bước 3. "Lưu và tạo mã lô"**
- Phiếu ở trạng thái *Đang nhập kho*.
- Hàng đạt thành lô *Bình thường*; hàng không đạt thành lô riêng, *Tạm cách ly*.

![](anh-giao-dien/quy-trinh/n04-phieu-nhap-dang-nhap-kho.png)
*Dữ liệu ghi vào:*
- GoodsReceipt (Status = Đang nhập kho);
- GoodsReceiptDetail: 3 lô, LotCode, DocumentQuantity, Note;
- StockItem: mỗi sản phẩm một mã SerialCode, Status = Chờ nhập.

**Bước 4. Xác nhận nhập kho và gửi duyệt**
- Biên bản bất thường cho lô không đạt được lập tự động.

![](anh-giao-dien/quy-trinh/n05-xac-nhan-gui-duyet-nhap.png)
![](anh-giao-dien/quy-trinh/n06-phieu-nhap-cho-duyet.png)
*Dữ liệu:*
- GoodsReceipt: Status = Chờ duyệt, SubmittedAt;
- AbnormalReport: SourceType = Nhập kho, Scope = Cả lô;
- AbnormalReportItem: các mã sản phẩm của lô lỗi.

**Bước 5. Quản lý xem việc chờ duyệt**
![](anh-giao-dien/quy-trinh/q01-ql-cho-duyet.png)

Biên bản lập khi nhập kho chỉ được xử lý sau khi phiếu nhập đã duyệt (góc phải màn hình ghi "Duyệt phiếu … trước").
![](anh-giao-dien/quy-trinh/q02-ql-bien-ban-nhap-kho.png)

**Bước 6. Quản lý duyệt phiếu nhập**
![](anh-giao-dien/quy-trinh/q05-ql-duyet-phieu-nhap.png)
![](anh-giao-dien/quy-trinh/q06-ql-phieu-nhap-da-duyet.png)
*Dữ liệu:*
- GoodsReceipt: Status = Đã duyệt, ApprovedBy, ApprovedAt;
- GoodsReceiptDetail.QuantityOnHand = Quantity;
- StockItem: Chờ nhập → Trong kho.

**Bước 7. Quản lý duyệt biên bản của lô lỗi, khóa lô**
![](anh-giao-dien/quy-trinh/q07-ql-duyet-bien-ban.png)
![](anh-giao-dien/quy-trinh/q08-ql-bien-ban-da-duyet.png)
![](anh-giao-dien/quy-trinh/q09-ql-chi-tiet-bien-ban-da-duyet.png)
*Dữ liệu:*
- AbnormalReport: Status = Đã duyệt; HandlingMethod, HandlingPlan; HandlingStatus = Chờ xử lý;
- GoodsReceiptDetail: Status = Đã khóa;
- StockItem: Lỗi, DefectiveAt.

**Bước 8. Nhân viên xử lý biên bản** (xem mục 8.3, "Xử lý biên bản đã duyệt")

### 8.2. Xuất kho theo FIFO (UC_07 – UC_09)

**Bước 1. Nhân viên chọn đơn chờ xuất**
![](anh-giao-dien/quy-trinh/x00-kho-don-cho-xuat.png)

**Bước 2. Xem phân bổ FIFO**
- Hệ thống chọn lô nhập sớm nhất trước và chỉ ra dải mã sản phẩm cần lấy.

![](anh-giao-dien/quy-trinh/x01-kho-phan-bo-fifo.png)

**Bước 3. "Lập phiếu xuất"**
- Hộp xác nhận tóm tắt các mặt hàng và lô sẽ lấy.
- Phiếu không cần Quản lý duyệt: lập xong là lấy hàng được ngay.

![](anh-giao-dien/quy-trinh/x02-kho-xac-nhan-lap-phieu-xuat.png)
*Dữ liệu:*
- GoodsIssue: Status = Chờ lấy hàng;
- GoodsIssueDetail;
- StockItem: Đã giữ chỗ, IssueDetailId;
- Order: Status = Đang xuất.

**Bước 4. Nhân viên nhận phiếu, bắt đầu lấy hàng**
![](anh-giao-dien/quy-trinh/x06-kho-phieu-xuat-cho-lay-hang.png)
![](anh-giao-dien/quy-trinh/x07-kho-bat-dau-lay-hang.png)
*Dữ liệu:* GoodsIssue: PickerId, PickStartedAt, PickActiveAt.

**Bước 5. Quét tem từng sản phẩm**
- Quét đúng mã thì sản phẩm được đánh dấu đã lấy.
- Quét mã không thuộc phiếu thì bị báo lỗi ngay.

![](anh-giao-dien/quy-trinh/x08-kho-quet-tem-san-pham.png)
![](anh-giao-dien/quy-trinh/x09-kho-quet-sai-ma.png)
*Dữ liệu:* StockItem.PickedAt.

**Bước 6. Phát hiện hàng lỗi khi lấy hàng**
- Chọn các sản phẩm lỗi, mô tả lỗi rồi bấm "Lập biên bản".
- Hệ thống tách các sản phẩm lỗi và thay bằng sản phẩm kế tiếp theo FIFO.

![](anh-giao-dien/quy-trinh/x10-kho-bao-hang-loi-khi-xuat.png)
![](anh-giao-dien/quy-trinh/x11-kho-da-lap-bien-ban-thay-hang.png)
*Dữ liệu:*
- AbnormalReport: SourceType = Xuất kho, IssueId, Scope = Sản phẩm lỗi;
- AbnormalReportItem;
- StockItem: sản phẩm lỗi chuyển Lỗi; sản phẩm thay thế chuyển Đã giữ chỗ.

**Bước 7. Quét đủ rồi xác nhận giao hàng**
![](anh-giao-dien/quy-trinh/x12-kho-da-quet-du.png)
![](anh-giao-dien/quy-trinh/x13-kho-xac-nhan-giao-hang.png)
![](anh-giao-dien/quy-trinh/x14-kho-da-xuat-kho.png)
*Dữ liệu:*
- GoodsIssue: Status = Đã xuất, ReceiverName, ReceiverPhone, VehiclePlate, DeliveredAt, DeliveredBy;
- StockItem: Đã xuất;
- GoodsReceiptDetail.QuantityOnHand giảm theo từng lô;
- Order: Status = Đã xuất.

### 8.3. Biên bản bất thường (UC_11, UC_12)

Biên bản được lập ở ba chỗ:
- khi nhập kho: tự động, xem mục 8.1, bước 4;
- khi xuất kho: xem mục 8.2, bước 6;
- khi kiểm kê: xem bên dưới.

**Lập biên bản khi kiểm kê**
- Ở màn đếm kiểm kê, bấm "Báo hàng lỗi" tại lô có hàng lỗi.
- Quét tem từng sản phẩm lỗi, mô tả lỗi rồi bấm "Lập biên bản".

![](anh-giao-dien/quy-trinh/k01-kho-bao-loi-khi-kiem-ke.png)
![](anh-giao-dien/quy-trinh/k02-kho-da-lap-bien-ban-kiem-ke.png)

Nhân viên theo dõi các biên bản mình đã lập ở màn Báo lỗi:
![](anh-giao-dien/quy-trinh/k03-kho-danh-sach-bao-loi.png)

**Quản lý xử lý biên bản**
![](anh-giao-dien/quy-trinh/b01-ql-danh-sach-bien-ban.png)
![](anh-giao-dien/quy-trinh/b02-ql-bien-ban-khi-xuat.png)

Khi duyệt, quản lý chọn phạm vi: chỉ loại các sản phẩm lỗi, hoặc khóa cả lô.
![](anh-giao-dien/quy-trinh/b03-ql-duyet-bien-ban-chon-pham-vi.png)
![](anh-giao-dien/quy-trinh/b04-ql-bien-ban-da-duyet.png)

Muốn từ chối thì phải ghi lý do. Khi từ chối, các sản phẩm trên biên bản trở lại "Trong kho".
![](anh-giao-dien/quy-trinh/b05-ql-tu-choi-bien-ban.png)

Khi duyệt, quản lý còn chọn **hướng xử lý** và ghi mô tả (điền sẵn đề xuất của nhân viên nếu có).
*Dữ liệu:* AbnormalReport: HandlingMethod, HandlingPlan, HandlingStatus = Chờ xử lý.

**Xử lý biên bản đã duyệt**
1. Nhân viên bấm "Nhận xử lý". *Dữ liệu:* HandlingStatus = Đang xử lý, HandledBy, HandlingStartedAt.
2. Người đang xử lý có thể "Trả lại việc"; quản lý có thể "Gỡ người xử lý" hoặc "Sửa hướng xử lý". *Dữ liệu:* về Chờ xử lý, HandledBy = NULL.
3. Người đang xử lý bấm "Hoàn thành xử lý". *Dữ liệu:* HandlingStatus = Đã xử lý, HandledAt, và tồn kho theo hướng xử lý:
   - Trả nhà cung cấp / Tiêu hủy / Thanh lý giảm giá: StockItem của biên bản (và với "Cả lô" là mọi sản phẩm còn trong lô) chuyển "Đã loại bỏ", HandledAt; với "Cả lô" GoodsReceiptDetail.QuantityOnHand = 0, lô vẫn "Đã khóa".
   - Sửa chữa, tân trang: StockItem "Lỗi" của biên bản về "Trong kho", HandledAt, QuantityOnHand tăng; với "Cả lô" lô về "Bình thường".

**In biên bản**
![](anh-giao-dien/quy-trinh/b06-in-bien-ban-khi-xuat.png)
