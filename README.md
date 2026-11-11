# Vibasic: quản lý tồn kho và hỗ trợ ra quyết định bổ sung hàng

Ứng dụng web nội bộ cho công ty đồ gỗ gia dụng. Hai vai trò:
- **Quản lý** dùng trên desktop.
- **Nhân viên kho** dùng trên tablet và điện thoại.

Đặc tả nghiệp vụ lấy từ Chương 3. Giao diện theo `design-system/vibasic-design`.

| Phần | Công nghệ |
|---|---|
| `api/` | ASP.NET Core 8, EF Core 8, SQL Server (LocalDB khi chạy local), JWT |
| `web/` | React 18, Vite, TypeScript, React Router, TanStack Query; style bằng tokens và class `vb-*` của design system |
| `docs/` | Ghi chú thiết kế, các thay đổi so với CSDL trong báo cáo; [hướng dẫn sử dụng](docs/huong-dan-su-dung.md) (quy tắc, trạng thái, cách thao tác) |

## Chạy local

Cần có: .NET 8 SDK, Node 20+, SQL Server LocalDB (cài kèm Visual Studio hoặc SQL Server Express).

```powershell
# 1. API: lần chạy đầu tự tạo DB "Vibasic" trên (localdb)\MSSQLLocalDB và nạp dữ liệu mẫu
cd api
dotnet run --project Vibasic.Api --launch-profile http     # http://localhost:5030, Swagger ở /swagger

# 2. Web (một cửa sổ khác)
cd web
npm install
npm run dev                                                # http://localhost:5173
```

Muốn dùng SQL Server khác thì sửa `ConnectionStrings:Vibasic` trong `api/Vibasic.Api/appsettings.json`.

Muốn nạp lại dữ liệu mẫu từ đầu thì xoá DB rồi chạy lại API:

```powershell
cd api; dotnet tool restore; dotnet ef database drop -f -p Vibasic.Infrastructure -s Vibasic.Api
```

### Tài khoản mẫu (mật khẩu `Vibasic@123`)

| Tên đăng nhập | Họ tên | Vai trò |
|---|---|---|
| `quanly` | Nguyễn Thu Hà | Quản lý |
| `nhanvien1` | Lê Văn Tâm | Nhân viên kho |
| `nhanvien2` | Phạm Thị Lan | Nhân viên kho |

### Dữ liệu mẫu

- 14 mặt hàng thuộc 4 nhóm hàng và 3 nhà cung cấp. Trong đó có 1 mặt hàng mới nhập 10 ngày ("Chưa đủ dữ liệu") và 1 mặt hàng 8 tuần không có đơn ("Chậm luân chuyển").
- 12 tuần vận hành mô phỏng theo bộ quy tắc Q1–Q20:
  - nhập tồn đầu kỳ ngày đầu;
  - đơn hàng tiếp nhận chiều hôm trước, xuất kho theo FIFO;
  - tính lại SS, ROP, EOQ mỗi thứ Hai từ đơn hàng 4 tuần;
  - đề xuất khi tồn ròng ≤ ROP.
- Quản lý mẫu duyệt (có lúc sửa số lượng), từ chối hoặc để đó. Hàng đã duyệt về sau thời gian giao hàng L, trên phiếu nhập gộp theo nhà cung cấp. Không đủ hàng giao đơn thì có phiếu "Nhập gấp".
- Khoảng 25 phiếu nhập, 7.800 sản phẩm có mã định danh riêng và 170 phiếu xuất.
- Khoảng 30 đề xuất bổ sung đủ các trạng thái:
  - chờ duyệt: có Khẩn cấp, có một đề xuất đã sửa số lượng;
  - đã duyệt chờ hàng (có một đề xuất nhà cung cấp mới giao một phần và đã quá hạn giao), đã nhập hàng, từ chối, đã đóng.
- Báo cáo đề xuất có dòng "Theo dõi". Đề xuất 5 ngày gần nhất (trừ Khẩn cấp) để trống cho người dùng duyệt.
- 2 đơn sỉ vừa tiếp nhận, chưa xuất, làm giảm tồn ròng.
- 1 lô hàng không đạt đã khoá, nằm cùng phiếu nhập với lô đạt, kèm biên bản bất thường.
- 3 đơn hàng thường và 2 đơn sỉ đang chờ xuất.

Lịch sử được sinh lùi từ ngày chạy seed nên luôn còn mới.

## Kiểm thử

```powershell
cd api; dotnet test Vibasic.Tests
cd web; npx tsc -b
```

## Tiến độ

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Nền tảng: CSDL 19 bảng theo sơ đồ lớp Hình 3.10, dữ liệu mẫu, đăng nhập JWT, khung giao diện cho hai vai trò | Xong |
| 2 | Danh mục (UC_01–03) và chính sách tồn kho | Xong |
| 3 | Nhập kho (UC_04–06, UC_10 phần nhập), xử lý biên bản của lô cách ly khi nhập (UC_12), thông báo | Xong |
| 4 | Xuất kho FIFO (UC_07–10), báo hàng lỗi khi xuất (UC_11 nguồn xuất kho) | Xong |
| 5 | Biên bản bất thường, kiểm kê, tra cứu lô (UC_11–16) | Xong |
| 6 | ROP, EOQ, cảnh báo, đề xuất (UC_17–18) | Xong |
| 7 | Báo cáo và tổng quan (UC_19) | Xong |
