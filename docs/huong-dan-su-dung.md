# Hướng dẫn sử dụng Vibasic

Vibasic quản lý kho hàng gia dụng gỗ theo **lô** và theo **mã định danh từng sản phẩm**: nhập kho, xuất kho theo FIFO, kiểm kê, biên bản bất thường, cảnh báo tồn kho thấp và đề xuất bổ sung hàng.

Tài liệu này gom các quy tắc, ý nghĩa trạng thái và cách thao tác mà ứng dụng không ghi trên màn hình.

**Mục lục**

1. [Bắt đầu](#1-bắt-đầu)
2. [Khái niệm và trạng thái](#2-khái-niệm-và-trạng-thái)
3. [Nhân viên kho](#3-nhân-viên-kho)
4. [Quản lý](#4-quản-lý)
5. [In ấn](#5-in-ấn)
6. [Phụ lục: hằng số quy tắc](#6-phụ-lục-hằng-số-quy-tắc)

---

## 1. Bắt đầu

Kho: **Kho Vibasic Long Biên**, Số A15, NO-06B, Lô HH06, Khu ĐTM Việt Hưng, P. Giang Biên, Q. Long Biên, Hà Nội. Địa chỉ này in ở đầu mọi chứng từ.

### Vai trò

| Vai trò | Làm gì | Màn hình |
|---|---|---|
| **Nhân viên kho** | Nhập kho, lấy hàng và giao hàng, kiểm kê, báo hàng lỗi, tra cứu lô | Giao diện cảm ứng (máy tính bảng, điện thoại), địa chỉ bắt đầu bằng `/kho` |
| **Quản lý** | Duyệt phiếu và biên bản, xem cảnh báo, xem xét đề xuất bổ sung và lập báo cáo đề xuất, lập kế hoạch kiểm kê, xem báo cáo, quản lý danh mục và tài khoản | Giao diện máy tính, địa chỉ bắt đầu bằng `/ql` |

Đăng nhập xong, hệ thống tự mở màn hình của vai trò.

Tài khoản mẫu (mật khẩu `Vibasic@123`):
- `quanly`: Quản lý
- `nhanvien1`, `nhanvien2`: Nhân viên kho

### Menu của Quản lý

- **Theo dõi:** Tổng quan, Cảnh báo tồn kho, Đề xuất bổ sung.
- **Nghiệp vụ:** Chờ duyệt, Phiếu nhập kho, Phiếu xuất kho, Tra cứu lô, Kiểm kê, Biên bản bất thường.
- **Phân tích:** Báo cáo.
- **Danh mục:** Hàng hóa, Nhà cung cấp, Tài khoản.

### Việc cần làm ở đâu

App không gửi thông báo. Mỗi việc hiện ở màn hình riêng, kèm số đếm trên menu:
- **Quản lý:** Chờ duyệt (phiếu nhập, phiếu kiểm kê, biên bản), Cảnh báo tồn kho, Đề xuất bổ sung.
- **Nhân viên kho:** Đơn chờ xuất (đơn đủ hàng có dấu **Đủ hàng**), Cần lấy hàng, Kiểm kê (kế hoạch "Chờ thực hiện"), Báo lỗi (biên bản "Chờ xử lý").
- Kết quả duyệt hoặc từ chối xem ở trạng thái và lý do ghi trên từng chứng từ.

### Ô tìm kiếm

Ô tìm kiếm ở mọi danh sách chỉ tìm theo **thuộc tính xác định**: mã chứng từ, mã lô, SKU, tên hàng, nhà cung cấp, khách hàng, số điện thoại, và người liên quan (người lập, người duyệt, người lấy hàng, người xử lý). Không tìm trong các ô văn bản tự do như mô tả lỗi, ghi chú, lý do hay địa chỉ. Gợi ý dưới ô ghi rõ tìm được những gì.

---

## 2. Khái niệm và trạng thái

### Lô, sản phẩm, FIFO

- **Lô:** mỗi dòng của phiếu nhập là một lô (mã `LOT-yymm-nnn`).
  - Hàng đạt của một mặt hàng tạo thành lô "Bình thường".
  - Hàng không đạt của cùng mặt hàng tách thành một lô riêng ở trạng thái "Tạm cách ly".
- **Sản phẩm:** mỗi sản phẩm có tem mã định danh riêng (`SP-<SKU>-yymm-nnnn`), dán khi nhập kho.
- **FIFO:** khi xuất kho, lô nhập sớm nhất được lấy trước (theo ngày nhập, rồi theo thứ tự lô trong phiếu). Trong cùng một lô, lấy sản phẩm nào cũng được.

### Các loại tồn kho

| Tên | Cách tính |
|---|---|
| **Tồn khả dụng** | Số sản phẩm còn trên kệ của các lô "Bình thường" thuộc phiếu nhập đã duyệt. Gồm cả số đang giữ chỗ cho phiếu xuất chưa giao. |
| **Giữ chỗ** | Sản phẩm đã được gắn vào một phiếu xuất chưa giao. Vẫn nằm trong tồn khả dụng cho tới khi giao. |
| **Tồn ròng** | Tồn khả dụng − tổng số lượng của các đơn hàng đã tiếp nhận nhưng chưa xuất (trạng thái Chưa xuất, Chờ xử lý, Đang xuất). Đây là số dùng cho cảnh báo và đề xuất bổ sung. |
| **Tồn thực tế** | Khả dụng + tạm cách ly + đã khóa. |
| **Hàng lỗi** | Sản phẩm đã tách ra theo biên bản bất thường, chờ xử lý theo hướng quản lý đã chọn. Không tính vào tồn thực tế. Xử lý xong thì rời kho ("Đã loại bỏ") hoặc, nếu sửa được, trở về "Trong kho". |

Lô "Tạm cách ly" và "Đã khóa" **không được xuất** và không tính vào tồn khả dụng.

### Trạng thái chứng từ

**Phiếu nhập kho**

| Trạng thái | Ý nghĩa |
|---|---|
| Đang nhập kho | Nhân viên đã lập phiếu và đang dán tem, xếp hàng. Phiếu còn sửa được. |
| Chờ duyệt | Đã gửi quản lý. Tồn kho **chưa** được ghi nhận. |
| Đã duyệt | Tồn kho của các lô "Bình thường" được ghi nhận. |
| Từ chối | Tồn kho giữ nguyên. Nhân viên sửa phiếu và gửi lại; phiếu gửi lại hiện lý do lần trước. |

**Lô**

| Trạng thái | Ý nghĩa |
|---|---|
| Bình thường | Được xuất, tính vào tồn khả dụng. |
| Tạm cách ly | Đang chờ quản lý xử lý biên bản bất thường. Không được xuất. |
| Đã khóa | Biên bản "cả lô" đã được duyệt. Không được xuất. Xử lý xong theo hướng rời kho thì lô về tồn 0; sửa xong thì lô trở về Bình thường. |

**Sản phẩm (mã định danh)**

| Trạng thái | Ý nghĩa |
|---|---|
| Chờ nhập | Thuộc phiếu nhập chưa duyệt. |
| Trong kho | Trên kệ, xuất được. |
| Đã giữ chỗ | Đã gắn vào phiếu xuất. |
| Đã xuất | Đã giao cho khách. |
| Thất thoát | Kiểm kê không tìm thấy. Nếu sau đó quét lại được thì được khôi phục khi duyệt phiếu kiểm kê. |
| Lỗi | Đã tách ra theo biên bản bất thường, chờ xử lý. |
| Đã loại bỏ | Đã rời kho khi biên bản được xử lý xong (trả nhà cung cấp, tiêu hủy hoặc thanh lý). |

**Đơn hàng** (nhận từ hệ thống bán hàng)

| Trạng thái | Ý nghĩa |
|---|---|
| Chưa xuất | Chờ nhân viên lập phiếu xuất. |
| Chờ xử lý | Thiếu hàng. Khi hàng về đủ, đơn có dấu **Đủ hàng** ở tab Đơn chờ xuất; lập lại phiếu xuất. |
| Đang xuất | Đã có phiếu xuất đang chờ lấy hàng. |
| Đã xuất | Đã giao. |
| Đã hủy | Khách hủy đơn; Quản lý hủy, có lý do. Đơn không còn tính vào tồn ròng. |

**Phiếu xuất kho**

| Trạng thái | Ý nghĩa |
|---|---|
| Chờ lấy hàng | Phiếu vừa lập, sản phẩm trong danh sách đã được giữ chỗ. **Không cần quản lý duyệt**: nhân viên lấy hàng ngay theo danh sách lô FIFO. |
| Đã xuất | Đã giao hàng; tồn kho trừ theo từng lô. |
| Đã hủy | Phiếu kết thúc mà không giao, sản phẩm đã giữ chỗ trả về tồn kho. Lý do ghi trên phiếu: đơn bị hủy, hoặc không đủ hàng thay thế khi báo lỗi (khi đó đơn chuyển "Chờ xử lý" và lập phiếu mới khi có hàng). Nếu đã lấy một phần hàng, trả toàn bộ hàng đã lấy của phiếu về kệ (xem mã lô trên tem). |

Phiếu xuất không qua bước duyệt vì đơn hàng đã quyết định xuất gì, hệ thống chọn lô theo FIFO, và việc quét từng tem khi lấy hàng đã chặn lấy nhầm. Quản lý vẫn kiểm soát bằng Hủy đơn, Gỡ người lấy hàng và duyệt biên bản bất thường khi có hàng lỗi.

**Kế hoạch kiểm kê:** Chờ thực hiện → Đang kiểm kê (đã gửi phiếu, chờ duyệt) → Hoàn thành (phiếu được duyệt). Phiếu bị từ chối thì kế hoạch trở về "Chờ thực hiện".

**Biên bản bất thường**

| Trạng thái | Ý nghĩa |
|---|---|
| Chờ duyệt | Nhân viên đã lập, chờ quản lý quyết định. Nhân viên có thể ghi hướng xử lý đề xuất. |
| Chờ xử lý | Quản lý đã duyệt và chọn hướng xử lý; chưa có nhân viên nhận. |
| Đang xử lý | Một nhân viên đã bấm "Nhận xử lý". Chỉ người đó hoàn thành được. |
| Đã xử lý | Đã hoàn thành; tồn kho đã cập nhật theo hướng xử lý. |
| Từ chối | Hàng được xem là đạt, trở lại kho. |

Quản lý có thể "Hủy quyết định" để đưa biên bản về Chờ duyệt, nhưng chỉ khi biên bản còn Chờ xử lý (chưa ai nhận).

**Cảnh báo tồn kho:** Đang mở / Đã đóng. Cảnh báo tự đóng khi tồn ròng vượt ROP.

**Đề xuất bổ sung**

| Trạng thái | Ý nghĩa |
|---|---|
Đề xuất chỉ là **gợi ý bổ sung hàng**. Mua mặt hàng nào, bao nhiêu, khi nào do bộ phận mua hàng quyết định ngoài hệ thống.

| Trạng thái | Ý nghĩa |
|---|---|
| Chờ xem xét | Hệ thống lập khi tồn ròng ≤ ROP. Số liệu tự cập nhật theo tồn kho cho tới khi Quản lý xử lý. |
| Đã lập báo cáo | Đã đưa vào một báo cáo đề xuất (mã DX-…). **Kết thúc**: hệ thống không theo dõi việc mua hay hàng về. |
| Không đề xuất | Quản lý loại khỏi đề xuất, có lý do. |
| Đã đóng | Hệ thống tự đóng khi tồn ròng vượt ROP trước khi Quản lý xử lý. |

---

## 3. Nhân viên kho

### 3.1 Nhập kho (`Nhập kho`)

1. Chọn **Lập phiếu nhập**.
2. Chọn nhà cung cấp, hoặc chọn mặt hàng trước để hệ thống chọn nhà cung cấp theo.
   - Khi đã có mặt hàng, danh sách chỉ còn nhà cung cấp của các mặt hàng đó. Bỏ các mặt hàng để chọn nhà cung cấp khác.
3. Với mỗi mặt hàng:
   - **Số thực nhận:** tổng số đếm được, **gồm cả hàng không đạt**.
   - **Số không đạt:** phần này tách thành một lô "Tạm cách ly". Bắt buộc ghi **mô tả lỗi**; mô tả dùng để lập biên bản bất thường.
   - **Số trên chứng từ:** chỉ ghi khi số thực nhận khác chứng từ giao hàng. Khi khác, bắt buộc ghi **ghi chú chênh lệch**.
5. Lưu phiếu. Hệ thống tạo lô và mã sản phẩm, phiếu ở trạng thái "Đang nhập kho".
6. **In mã vạch:**
   - dán nhãn lô lên kiện hàng, dán nhãn sản phẩm lên từng sản phẩm;
   - xếp hàng vào kho; lô tạm cách ly để riêng ở khu hàng không đạt.
7. Chọn **Xác nhận nhập kho và gửi duyệt**.
   - Hệ thống lập biên bản bất thường cho mỗi lô tạm cách ly.
   - Sau khi gửi, phiếu không sửa được, trừ khi bị từ chối.

**Sửa phiếu** (chỉ khi phiếu đang nhập kho hoặc bị từ chối):
- Mặt hàng giữ nguyên số đạt và số không đạt thì **giữ mã lô cũ**.
- Mặt hàng đổi số lượng được tạo **mã lô và mã sản phẩm mới**, nên phải **in lại mã vạch**.

### 3.2 Xuất kho (`Xuất kho`)

Màn hình có ba tab: **Đơn chờ xuất**, **Lấy hàng**, **Phiếu xuất**.

**Lập phiếu xuất từ đơn hàng**
1. Ở tab Đơn chờ xuất, chọn đơn. Hệ thống chọn lô theo FIFO; lô bị khóa hoặc tạm cách ly không được tính.
2. **Đủ hàng:** bấm **Lập phiếu xuất**. Hộp xác nhận liệt kê từng mặt hàng, số lượng và các lô sẽ giữ. Kiểm lại rồi bấm **Lập phiếu**. Các sản phẩm trong danh sách được **giữ chỗ** và phiếu ở trạng thái **Chờ lấy hàng**, lấy được ngay, không chờ duyệt. Sau khi lập, nhân viên không tự hủy được phiếu; chỉ quản lý hủy đơn mới gỡ giữ chỗ.
3. **Thiếu hàng:** chọn **Ghi nhận thiếu hàng**. Hộp xác nhận liệt kê các mặt hàng thiếu. Xác nhận thì đơn chuyển "Chờ xử lý".
   - Khi hàng về đủ (duyệt phiếu nhập, mở khóa lô…), đơn có dấu **Đủ hàng** trong tab Đơn chờ xuất; mở đơn để lập phiếu. Nhiều đơn cùng chờ thì lập phiếu cho đơn đặt trước trước.

**Lấy hàng** (phiếu Chờ lấy hàng)
1. Ở tab Lấy hàng, chọn phiếu rồi **Bắt đầu lấy hàng**. Bấm vào phiếu chưa ai nhận cũng tự nhận phiếu.
   - Trong lúc bạn lấy hàng, nhân viên khác chỉ xem được phiếu.
   - Phiếu được **giữ cho bạn 3 ngày** kể từ lúc nhận phiếu. Quá hạn thì người khác có thể **Nhận lại phiếu**, hoặc quản lý gỡ người lấy hàng.
   - Người nhận phiếu sau được bàn giao các mã đã quét trước đó, không phải quét lại.
2. Quét tem từng sản phẩm.
   - Gõ SKU hoặc tên hàng để xem cần lấy lô nào tiếp theo.
   - Lấy sai lô thì hệ thống báo lô đúng cần lấy trước.
   - **Quét tem lô (lấy nguyên lô):** chỉ dùng được khi phiếu lấy **toàn bộ** phần còn lại của lô. Điều kiện là không còn sản phẩm nào của lô nằm ngoài phiếu, kể cả sản phẩm đang giữ cho phiếu khác. Khi đó một lần quét đánh dấu đã lấy mọi sản phẩm của lô.
   - Nếu phiếu chỉ lấy một phần lô, quét tem lô sẽ bị từ chối, ví dụ "Phiếu chỉ lấy 49/72 cái của lô …". Khi đó quét từng tem sản phẩm, hoặc dùng **Chọn mã**.
   - **Không quét được** (tem mờ, không có máy quét), mỗi lô còn hàng chưa lấy có hai nút:
     - **Lấy cả lô (N cái):** chỉ hiện khi phiếu lấy toàn bộ phần còn lại của lô, cùng điều kiện với quét tem lô. Bấm một lần là đánh dấu đã lấy cả lô.
     - **Chọn mã:** mở danh sách các mã của phiếu ở lô đó. Bấm chọn từng mã, hoặc **Chọn tất cả**, rồi **Lấy N sản phẩm**. Chỉ chọn được mã có trong danh sách lấy hàng, nên thứ tự FIFO vẫn giữ đúng.
   - Quét tem vẫn là cách chính xác nhất. Khi chọn tay, chỉ chọn những sản phẩm đã thực sự lấy khỏi kệ.
3. **Nhường phiếu:** dừng lấy hàng. Các mã đã quét được giữ nguyên và bàn giao cho người nhận phiếu sau.
4. **Báo hàng lỗi** khi lấy hàng:
   - Chọn các sản phẩm lỗi trong danh sách của phiếu, có ô tìm theo mã, vài số cuối, mã lô hoặc SKU. Ghi mô tả. Hệ thống lập biên bản bất thường, tách các sản phẩm đó khỏi tồn kho và **thay bằng sản phẩm kế tiếp theo FIFO**.
   - Để sản phẩm lỗi ở khu hàng lỗi, rồi quét sản phẩm thay thế theo danh sách mới.
   - **Nghi lỗi cả lô** (mốc, ẩm, lỗi sấy…): cả lô chuyển "Tạm cách ly" và không xuất cho tới khi quản lý xử lý. Các sản phẩm đã lấy từ lô đó được đổi sang lô kế tiếp; trả lại kệ các sản phẩm đã lấy từ lô đó.
   - Không đủ hàng thay thế thì phiếu chuyển **Đã hủy** và đơn chuyển "Chờ xử lý". Trả lại kệ các mã ghi trên phiếu đã hủy; lập phiếu mới khi có hàng.
5. Quét đủ thì **Xác nhận giao hàng** và ghi biên bản giao hàng. Tồn kho trừ theo từng lô.
   - **Người nhận hàng tại kho** (bắt buộc): tài xế đến lấy hàng, hoặc khách tự đến lấy. Nút "Khách tự lấy" điền sẵn tên và số điện thoại của khách.
   - **Số điện thoại người nhận** và **biển số xe** (ví dụ 29C-123.45): không bắt buộc, nhưng nên ghi để liên lạc và đối chiếu khi hàng đã rời kho.
   - Nhân viên bấm xác nhận được ghi là người giao hàng.

### 3.3 Kiểm kê (`Kiểm kê`)

Quản lý lập kế hoạch; kế hoạch mới hiện ở màn Kiểm kê với trạng thái "Chờ thực hiện".

1. Mở kế hoạch, đếm thực tế **từng lô**:
   - **Nhập số:** gõ số đếm được.
   - **Quét tem:** quét từng sản phẩm của lô rồi chọn **Đếm xong lô**. Cách này biết chính xác mã nào thiếu.
   - Không tìm thấy lô thì nhập 0.
2. **Số hệ thống chỉ hiện sau khi bạn đếm xong lô**, để không ảnh hưởng việc đếm. Có chênh lệch thì bắt buộc ghi lý do.
3. Hàng **đang soạn cho phiếu xuất** không nằm trên kệ và không được đếm. Màn hình ghi rõ số này ở từng lô.
4. **Không có tem / tem hỏng:** ghi số sản phẩm của lô không quét được. Các sản phẩm này được cấp mã mới khi quản lý duyệt.
5. Khi quét, hệ thống báo các trường hợp không tính vào số đếm:
   - mã của lô khác: để lại đúng vị trí;
   - mã đã xuất kho: báo quản lý;
   - mã đang soạn cho phiếu xuất;
   - mã đã tách ra do lỗi;
   - mã đang ghi "Thất thoát": nếu tìm thấy lại thì được khôi phục khi duyệt.
6. Phát hiện hàng lỗi thì chọn **Báo hàng lỗi** ở lô đó, rồi đếm tiếp. Quét tem từng sản phẩm lỗi, hoặc gõ mã (hay vài số cuối) vào ô "Hoặc tìm và chọn mã" rồi bấm mã cần chọn. Danh sách chỉ gồm sản phẩm của lô còn trên kệ. Cách xử lý như khi xuất kho:
   - chỉ sản phẩm lỗi: các sản phẩm đã quét bị tách khỏi tồn kho, phần còn lại của lô vẫn xuất bình thường;
   - nghi lỗi cả lô: cả lô "Tạm cách ly".
7. Đếm hết các lô thì kiểm tra lại rồi **Gửi phiếu kiểm kê**. Tồn kho chỉ điều chỉnh khi quản lý duyệt.

Phiếu bị từ chối thì kiểm đếm lại theo cùng kế hoạch.

### 3.4 Biên bản bất thường (`Báo lỗi`)

Biên bản được lập khi nhập kho (lô không đạt), khi lấy hàng xuất kho hoặc khi kiểm kê (báo hàng lỗi). Màn này liệt kê mọi biên bản và trạng thái của chúng.

- **Đề xuất hướng xử lý:** khi báo lỗi (xuất kho, kiểm kê) có ô "Hướng xử lý đề xuất", không bắt buộc. Biên bản còn Chờ duyệt thì mở biên bản, bấm "Đề xuất hướng xử lý" (dùng cho cả biên bản lập khi nhập kho).
- **Xử lý biên bản đã duyệt:**
  1. Lọc "Chờ xử lý", mở biên bản, đọc hướng xử lý quản lý đã chọn, bấm **Nhận xử lý**.
  2. Làm theo hướng xử lý (trả nhà cung cấp, tiêu hủy, thanh lý, hoặc sửa chữa).
  3. Bấm **Hoàn thành xử lý**. Hộp xác nhận ghi rõ bao nhiêu sản phẩm rời kho hoặc trở về kho. Không hoàn tác được.
  - Không làm tiếp được thì bấm **Trả lại việc** để người khác nhận.
  - Lọc **Việc của tôi** để xem các biên bản bạn đang xử lý.
- **Tìm kiếm:** theo mã biên bản, mã lô, SKU, tên hàng, phiếu nhập, nhà cung cấp, người lập, người duyệt hoặc người xử lý. Không tìm theo nội dung mô tả lỗi. Lọc thêm theo người lập, hướng xử lý, nguồn phát hiện và ngày lập.

### 3.5 Tra cứu lô (`Tra cứu`)

- Tìm theo mã lô, mã sản phẩm `SP-…`, SKU, tên hàng hoặc phiếu nhập. Quét tem một sản phẩm để xem trạng thái, đơn, phiếu xuất và biên bản của sản phẩm đó.
- Mặc định chỉ hiện lô còn hàng. Chọn **Gồm lô đã hết hàng** để xem lịch sử.
- Cột tồn ghi kèm "giữ chỗ N": số sản phẩm của lô đã gắn vào phiếu xuất.

---

## 4. Quản lý

### 4.1 Tổng quan

- Các ô số liệu:
  - tồn khả dụng;
  - số chứng từ chờ duyệt (phiếu nhập, kiểm kê, biên bản);
  - cảnh báo tồn kho thấp;
  - số lô tạm cách ly hoặc đã khóa (không được xuất).
- Panel **Dưới điểm đặt hàng** liệt kê các cảnh báo đang mở: **tồn ròng** / ROP, cùng chuẩn với màn Cảnh báo và Đề xuất.

### 4.2 Chờ duyệt

Gom mọi chứng từ chờ duyệt theo ba loại: phiếu nhập, phiếu kiểm kê, biên bản bất thường. Phiếu xuất không cần duyệt. Lý do của mọi thao tác từ chối hoặc hủy tối thiểu 5 ký tự; lý do từ chối ghi trên chứng từ.

**Phiếu nhập kho**
- **Duyệt:** ghi nhận tồn kho các lô "Bình thường". Lô tạm cách ly vẫn chưa xuất được cho tới khi xử lý biên bản.
- **Từ chối:** tồn kho giữ nguyên; nhân viên sửa phiếu và gửi lại.
- **Hủy duyệt:**
  - tồn kho của phiếu bị gỡ ra; các biên bản của phiếu trở về Chờ duyệt và lô liên quan trở về Tạm cách ly;
  - phiếu trở về Chờ duyệt để duyệt lại hoặc từ chối.
  - Chỉ hủy được khi hàng của phiếu **chưa** bị giữ chỗ, xuất kho, đưa vào kiểm kê hoặc lập biên bản sau khi nhập. Nếu không hủy được, màn hình hiện "Không hủy duyệt được"; rê chuột lên để xem lý do.
- Biên bản của lô không đạt chỉ xét được sau khi phiếu nhập đã duyệt.

**Phiếu xuất kho** (không cần duyệt; quản lý theo dõi ở màn Phiếu xuất kho)
- **Gỡ người lấy hàng:** người đó không quét tiếp được. Các mã đã quét giữ nguyên; nhân viên khác nhận phiếu sẽ lấy tiếp. Quản lý báo trực tiếp cho người bị gỡ để bàn giao hàng đã lấy.
- **Hủy đơn** (khách hủy): có ở phiếu Chờ lấy hàng, và ở màn **Đơn hàng chưa giao** (nút trên màn Phiếu xuất kho). Bắt buộc ghi lý do.
  - Đơn chuyển **Đã hủy**; phiếu đang mở của đơn chuyển **Đã hủy** và sản phẩm giữ chỗ trả về tồn kho.
  - Nếu đã lấy một phần hàng, báo người lấy hàng **trả lại kệ** toàn bộ hàng đã lấy của phiếu.
  - Đơn đã giao thì không hủy được.
  - Đơn hủy không còn tính vào tồn ròng và nhu cầu, nên cảnh báo hoặc đề xuất có thể tự đóng.
  - Màn Đơn hàng có tab **Đã hủy** ghi lý do và thời điểm hủy.

**Phiếu kiểm kê**
- Cột **Trên kệ (HT)** là số hệ thống ghi nhận trên kệ tại lúc đếm từng lô, không gồm hàng đang soạn cho phiếu xuất.
- **Duyệt:** tồn kho điều chỉnh theo số thực tế.
  - Sản phẩm thiếu được đánh dấu **Thất thoát**. Với lô quét tem, đó đúng là các mã không quét được.
  - Sản phẩm thừa hoặc không có tem được tạo mã định danh mới.
  - Sản phẩm thiếu đang giữ chỗ cho phiếu xuất được thay theo FIFO.
  - Kế hoạch chuyển "Hoàn thành".
- **Từ chối:** tồn kho giữ nguyên; kế hoạch về "Chờ thực hiện" để kiểm lại.
- Biên bản kèm phiếu kiểm kê được xử lý ở bảng bên dưới phiếu.

**Biên bản bất thường**: xem [4.5](#45-biên-bản-bất-thường).

### 4.3 Cảnh báo tồn kho

- Cảnh báo **mở** khi tồn ròng ≤ ROP và **tự đóng** khi tồn ròng vượt ROP. Số cảnh báo đang mở hiện trên menu Cảnh báo tồn kho.
- Việc kiểm tra chạy sau mọi thay đổi tồn kho hoặc đơn hàng: tiếp nhận đơn, duyệt hoặc hủy duyệt phiếu nhập, giao hàng, báo lỗi, duyệt kiểm kê, xử lý biên bản.
- Cột **So với ROP** = tồn ròng − ROP (đỏ khi ≤ 0). Cột **Căn cứ** hiện phép tính ROP.
- Tab **Tất cả mặt hàng** cho biết tình trạng từng mặt hàng:
  - **Không lớn hơn ROP:** tồn ròng ≤ ROP, đang có cảnh báo.
  - **Theo dõi:** sẽ chạm ROP trong 7 ngày.
  - **Đủ hàng:** còn xa ROP.
  - **Chưa đủ dữ liệu:** dữ liệu đầu tiên (đơn hàng hoặc phiếu nhập đầu tiên) chưa đủ 4 tuần. Không tính ROP, không đề xuất.
  - **Chậm luân chuyển:** không có đơn hàng trong 8 tuần. Không tính ROP, không đề xuất; nên rà soát mặt hàng.
- ROP, EOQ được tính lại **tự động mỗi thứ Hai lúc 02:00**. Bấm **Tính lại ngay** để tính ngay.

### 4.4 Đề xuất bổ sung hàng

#### Quy tắc tính

1. **Nhu cầu:** lấy từ đơn hàng đã tiếp nhận, theo ngày đặt, trong **4 tuần gần nhất** (28 ngày trọn, không tính hôm nay).
   - **d** = tổng số lượng ÷ 28 (ngày không có đơn tính là 0).
   - **σ** = độ lệch chuẩn của nhu cầu theo ngày trong 28 ngày đó.
2. **Tồn kho an toàn:** SS = 1,65 × σ × √L (mức phục vụ 95%, L là thời gian giao hàng tính bằng ngày).
3. **Điểm đặt hàng lại:** ROP = d × L + SS.
4. **Lượng đặt hàng kinh tế:** EOQ = √(2 × D × S ÷ H), làm tròn lên.
   - D = d × 365.
   - S: chi phí mỗi lần đặt hàng.
   - H: chi phí lưu kho một đơn vị trong một năm.
5. **Khi nào có đề xuất:** khi tồn ròng ≤ ROP. Mỗi mặt hàng có tối đa **một** đề xuất đang mở.
6. **Mức ưu tiên** (số ngày tồn còn lại = tồn ròng ÷ d):
   - **Khẩn cấp:** tồn ròng ≤ 0, hoặc số ngày tồn còn lại < L (không đủ bán hết thời gian giao hàng);
   - **Cần đặt:** tồn ròng ≤ ROP;
   - **Theo dõi:** chưa tới ROP nhưng sẽ chạm ROP trong 7 ngày. Dòng này chỉ là gợi ý, không phải đề xuất.
7. **Số lượng đề xuất** = ROP + EOQ − tồn ròng, làm tròn lên, tối thiểu 1.
   - Không vượt **nhu cầu 12 tuần** (84 × d). Khi bị chặn, cột căn cứ ghi "Vượt trần nhu cầu 12 tuần, giảm còn N".
8. **Không có nhu cầu trong 4 tuần** (d = 0, nhưng chưa tới mức chậm luân chuyển): không cảnh báo, không đề xuất.
   - Ngoại lệ: đơn chưa xuất vượt tồn (tồn ròng < 0). Khi đó có đề xuất Khẩn cấp với số lượng đúng phần thiếu.
9. **Chưa đủ dữ liệu** hoặc **chậm luân chuyển**: không tính ROP, không đề xuất.

#### Vòng đời đề xuất

- **Chờ xem xét:**
  - Căn cứ và số lượng tự cập nhật theo tồn kho.
  - Số lượng Quản lý đã sửa thì được giữ.
  - Tồn ròng vượt ROP trước khi Quản lý xử lý thì đề xuất tự **Đã đóng**.
- **Đã lập báo cáo:**
  - Số liệu và số lượng giữ nguyên như lúc lập báo cáo. Đây là trạng thái cuối.
  - Hệ thống **không** nối đề xuất với phiếu nhập: số lượng mua thực tế có thể khác đề xuất.
  - Trong **L + 3 ngày** kể từ lúc lập báo cáo, mặt hàng không có đề xuất mới, để hàng có thể đang về không bị đề xuất trùng. Sau đó, nếu tồn ròng vẫn ≤ ROP thì có đề xuất mới (hệ thống kiểm tra mỗi ngày lúc 02:00 và mỗi khi tồn kho thay đổi).
- **Không đề xuất:**
  - Bắt buộc ghi lý do.
  - Trong **tuần đó** (tính từ thứ Hai 00:00), hệ thống không tạo lại đề xuất cho mặt hàng.
  - Sang tuần sau, nếu tồn ròng vẫn ≤ ROP thì có đề xuất mới.

#### Thao tác trên màn hình

- **Tab Chờ xem xét** hiện các đề xuất như sẽ vào báo cáo, nhóm theo nhà cung cấp chính.
  - Trong mỗi nhóm: Khẩn cấp → Cần đặt → Theo dõi, rồi theo số ngày tồn còn lại.
  - Dòng **Theo dõi** là mặt hàng cùng nhà cung cấp sắp chạm ROP. Nên cân nhắc đặt chung đơn để dùng chung chi phí đặt hàng.
- **Sửa số lượng:** mở dòng đề xuất, đổi số lượng. Bắt buộc ghi lý do khi khác số hệ thống, ví dụ làm tròn theo thùng. Số hệ thống vẫn được giữ để đối chiếu.
- **Loại:** bỏ một đề xuất khỏi danh sách, bắt buộc ghi lý do. Đề xuất chuyển **Không đề xuất**.
- **Lập báo cáo:** tick các đề xuất rồi bấm **Lập báo cáo N đề xuất**, xác nhận.
  - Hệ thống tạo báo cáo có mã **DX-yymm-nnnn**, mở bản in, và chuyển các đề xuất đã tick sang **Đã lập báo cáo**.
  - Báo cáo gồm các đề xuất đã tick, nhóm theo nhà cung cấp, kèm dòng Theo dõi của các nhà cung cấp đó.
  - Gửi báo cáo cho bộ phận mua hàng. Báo cáo là gợi ý, **không thay thế** đơn đặt hàng gửi nhà cung cấp.
- **Báo cáo đề xuất** (nút cạnh các tab): danh sách báo cáo đã lập (mã, ngày lập, người lập, số đề xuất). Bấm **In lại** để in đúng nội dung lúc lập.
  - Tab **Đã lập báo cáo** thì liệt kê từng đề xuất (mỗi mặt hàng một dòng) đã nằm trong một báo cáo nào đó, kèm mã báo cáo.
- Các tab còn lại xem đề xuất đã xử lý cùng căn cứ lúc lập và căn cứ hiện tại. Đề xuất đã lập báo cáo có mã báo cáo; bấm mã để mở bản in.

### 4.5 Biên bản bất thường

**Phạm vi xử lý**
- **Chỉ sản phẩm lỗi:** chỉ các sản phẩm ghi trong biên bản bị tách khỏi tồn kho.
- **Cả lô:** cả lô tạm cách ly cho tới khi quản lý quyết định.

Nhân viên đề xuất phạm vi; khi duyệt, Quản lý có thể đổi. Biên bản lập khi nhập kho luôn xử lý cả lô.

**Duyệt**
- Cả lô: lô bị **khóa**, không được xuất và không tính vào tồn khả dụng. Sản phẩm của lô đang giữ chỗ cho phiếu xuất được thay theo FIFO.
- Chỉ sản phẩm lỗi: các sản phẩm đó chuyển trạng thái **Lỗi**, chờ xử lý. Phần còn lại của lô xuất bình thường.
- Bắt buộc chọn **hướng xử lý** và ghi mô tả (ô mô tả điền sẵn đề xuất của nhân viên nếu có). Biên bản chuyển **Chờ xử lý**.

**Hướng xử lý và kết quả khi nhân viên hoàn thành**

| Hướng | Chỉ sản phẩm lỗi | Cả lô |
|---|---|---|
| Trả nhà cung cấp / Tiêu hủy / Thanh lý giảm giá | Sản phẩm lỗi chuyển **Đã loại bỏ** (đã bị trừ tồn lúc báo lỗi, tồn không đổi thêm). | Mọi sản phẩm còn trong lô chuyển **Đã loại bỏ**, lô về tồn 0 (vẫn Đã khóa). |
| Sửa chữa, tân trang | Sản phẩm lỗi trở về **Trong kho**, xuất được. | Lô được mở khóa, trở về **Bình thường**. |

- Một biên bản chỉ có một kết quả cho mọi sản phẩm. Nếu thực tế khác hướng đã chọn (ví dụ không sửa được), bấm **Sửa hướng xử lý** trước khi nhân viên hoàn thành.
- **Gỡ người xử lý:** đưa biên bản đang xử lý về Chờ xử lý để nhân viên khác nhận.
- Báo cáo nhập–xuất–tồn ghi các thay đổi này vào cột Điều chỉnh đúng ngày hoàn thành.

**Từ chối**
- Cả lô: lô trở về **Bình thường** và được tính vào tồn khả dụng.
- Chỉ sản phẩm lỗi: các sản phẩm được xem là hàng đạt, trở về **Trong kho**. Nhân viên đưa lại lên kệ.

**Hủy quyết định:** biên bản trở về Chờ duyệt để quyết định lại. Chỉ làm được khi chưa có nhân viên nhận xử lý.
- Hủy "Đã duyệt" cả lô: lô được mở khóa, trở về Tạm cách ly (vẫn chưa xuất được).
- Hủy "Từ chối" cả lô: lô trở về Tạm cách ly, không còn tính vào tồn khả dụng.
- Hủy "Đã duyệt" chỉ sản phẩm lỗi: sản phẩm lỗi vẫn để riêng, không xuất được.
- Hủy "Từ chối" chỉ sản phẩm lỗi: sản phẩm lại được tách khỏi tồn kho; nếu đang giữ chỗ thì được thay theo FIFO.

Biên bản cũ lập trước khi hệ thống ghi mã từng sản phẩm lỗi thì không có danh sách mã.

### 4.6 Kiểm kê

- **Lập kế hoạch:**
  - loại: Định kỳ hoặc Chỉ định;
  - ngày dự kiến: không trước hôm nay;
  - phạm vi: **Toàn bộ kho** hoặc **Một số lô**.
- **Toàn bộ kho:** nhân viên kiểm mọi lô đang có hàng tại lúc kiểm, kể cả lô tạm cách ly và đã khóa. Danh sách lô vì thế thay đổi theo tồn kho.
- **Sửa kế hoạch:** nhân viên mở lại kế hoạch để xem danh sách lô mới; số đã đếm của các lô còn trong kế hoạch được giữ trên máy. Không sửa được khi đã có phiếu chờ duyệt hoặc kế hoạch đã hoàn thành.
- Duyệt hoặc từ chối phiếu kiểm kê: xem [4.2](#42-chờ-duyệt).

### 4.7 Báo cáo

**Tồn kho**
- Tồn thực tế = khả dụng + cách ly + đã khóa.
- Khả dụng gồm cả số đang giữ chỗ cho phiếu xuất chưa giao.
- Tồn ròng = khả dụng − số lượng các đơn đã tiếp nhận chưa xuất. "Dưới ROP" khi tồn ròng ≤ ROP, cùng điều kiện với cảnh báo tồn kho.
- Hàng lỗi không tính vào tồn thực tế.

**Nhập xuất**
- Tồn cuối kỳ = tồn đầu kỳ + nhập − xuất ± điều chỉnh.
- Nhập tính theo ngày duyệt phiếu nhập, xuất theo ngày giao hàng, điều chỉnh theo ngày duyệt phiếu kiểm kê.
- Số chứng từ là số phiếu có mặt hàng đó. Một phiếu có thể gồm nhiều mặt hàng nên không cộng dồn.

### 4.8 Danh mục

**Hàng hóa**
- Mỗi hàng hóa cần một **nhóm hàng** và một **nhà cung cấp chính**. Thêm nhóm hàng hoặc nhà cung cấp trước nếu chưa có.
- **SKU** (ví dụ `THT-04`) nằm trong mã định danh của từng sản phẩm. SKU không đổi được khi hàng hóa đã có lô nhập kho.
- **Chính sách tồn kho:** nhập thời gian giao hàng L (ngày), chi phí đặt hàng S (đồng/lần), chi phí lưu kho H (đồng/đơn vị/năm).
  - d, σ, SS, ROP, EOQ do hệ thống tính (xem [4.4](#44-đề-xuất-bổ-sung-hàng)).
  - Thay đổi thông số được áp dụng ở lần tính kế tiếp (thứ Hai 02:00, hoặc khi bấm "Tính lại ngay").
- **Chi tiết hàng hóa:**
  - **Tồn ròng** = khả dụng − đơn chưa xuất.
  - Khi tồn ròng ≤ ROP, màn hình hiện cảnh báo kèm link tới đề xuất.
  - Lô hàng chỉ xuất hiện khi phiếu nhập kho được duyệt.

**Nhà cung cấp**
- Nhà cung cấp gắn với hàng hóa qua trường "Nhà cung cấp chính".

**Nhóm hàng:** dùng để phân loại và lọc hàng hóa, đề xuất bổ sung và báo cáo.

**Tài khoản**
- Tên đăng nhập: chữ không dấu, chữ số, dấu chấm, gạch dưới.
- Mật khẩu tối thiểu 8 ký tự và được mã hóa trước khi lưu.
  - Gửi mật khẩu ban đầu cho nhân viên và đề nghị đổi sau lần đăng nhập đầu.
  - Khi sửa tài khoản, để trống mật khẩu nếu không đổi.
- Không tự đổi vai trò của tài khoản đang đăng nhập.
- **Khóa tài khoản:** người đó không đăng nhập được nữa; phiên đang mở bị đăng xuất ở thao tác kế tiếp. Có thể mở lại bất cứ lúc nào.

---

## 5. In ấn

Mỗi bản in mở trong tab mới. Trong hộp thoại in của trình duyệt, **bỏ chọn "Đầu trang và chân trang"** để giấy không in kèm địa chỉ web.

| Bản in | Mở từ | Khổ giấy |
|---|---|---|
| Mã vạch lô và sản phẩm | Chi tiết phiếu nhập | Tem nhãn |
| Biên bản bất thường | Chi tiết biên bản | A4 dọc |
| Báo cáo tồn kho, báo cáo nhập xuất | Báo cáo | A4 ngang |
| Báo cáo đề xuất bổ sung hàng | Đề xuất bổ sung: "Lập báo cáo", hoặc "In lại" ở màn Báo cáo đề xuất | A4 ngang |

- **Mã vạch:** dán nhãn lô lên kiện hàng, nhãn sản phẩm lên từng sản phẩm. Lô tạm cách ly để riêng ở khu hàng không đạt.
- **Biên bản lập khi nhập kho:** in hai bản, kho giữ một bản, nhà cung cấp giữ một bản. Các biên bản khác lưu tại kho cùng chứng từ liên quan.

---

## 6. Phụ lục: hằng số quy tắc

Các hằng số áp dụng chung cho mọi mặt hàng (khai báo trong `api/Vibasic.Infrastructure/Decision/ReplenishmentRules.cs`).

| Hằng số | Giá trị |
|---|---|
| Cửa sổ nhu cầu | 4 tuần (28 ngày trọn, không tính hôm nay) |
| Hệ số z (mức phục vụ 95%) | 1,65 |
| Ngưỡng "Theo dõi" | chạm ROP trong 7 ngày |
| Trần số lượng đề xuất | nhu cầu 12 tuần (84 × d) |
| Chậm luân chuyển | không có đơn trong 8 tuần (56 ngày) |
| Chưa đủ dữ liệu | dữ liệu đầu tiên chưa đủ 4 tuần |
| Chặn đề xuất sau khi lập báo cáo | L + 3 ngày kể từ lúc lập báo cáo |
| Chặn đề xuất sau khi loại (Không đề xuất) | tới hết tuần (thứ Hai 00:00 giờ Việt Nam) |
| Lịch tính ROP, EOQ | thứ Hai 02:00 hằng tuần |
| Kiểm tra lại mặt hàng hết thời gian chặn | 02:00 hằng ngày |
| Giữ phiếu lấy hàng | 3 ngày kể từ lúc nhận phiếu |
| Lý do từ chối, hủy, loại | tối thiểu 5 ký tự |
