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

## Chạy trên một máy mới

### 1. Cài phần mềm (một lần)

| Phần mềm | Tải ở đâu | Kiểm tra bằng lệnh |
|---|---|---|
| Git | git-scm.com | `git --version` |
| .NET 8 SDK | dotnet.microsoft.com/download/dotnet/8.0 (chọn **SDK**, không phải Runtime) | `dotnet --version` ra `8.x` |
| Node.js 20 trở lên | nodejs.org (bản LTS) | `node -v` |
| SQL Server LocalDB | Trình cài SQL Server Express, chọn **Download Media**, chọn **LocalDB**. Nếu máy có Visual Studio thì thường đã có sẵn. | `sqllocaldb info` có dòng `MSSQLLocalDB` |

### 2. Tải code về

```powershell
git clone https://github.com/Blessindisguise/vibasic.git
cd vibasic
```

### 3. Chạy API (cửa sổ PowerShell thứ nhất)

```powershell
cd api
dotnet run --project Vibasic.Api --launch-profile http
```

Lần chạy đầu, lệnh này tự tải thư viện, tạo DB `Vibasic` trên `(localdb)\MSSQLLocalDB` và nạp dữ liệu mẫu. Việc này mất khoảng một phút.

API sẵn sàng khi thấy dòng `Now listening on: http://localhost:5030`. Swagger ở `http://localhost:5030/swagger`. Giữ cửa sổ này mở.

### 4. Chạy web (cửa sổ PowerShell thứ hai)

```powershell
cd web
npm install      # chỉ cần lần đầu, hoặc khi package.json thay đổi
npm run dev
```

Mở `http://localhost:5173` rồi đăng nhập bằng một tài khoản mẫu ở dưới.

### Dùng trên tablet hoặc điện thoại

Thiết bị phải cùng mạng wifi với máy chạy app. `npm run dev` in ra một dòng `Network: http://192.168.x.x:5173`; mở địa chỉ đó trên thiết bị. Nếu Windows hỏi về tường lửa cho Node.js, chọn cho phép trên mạng riêng (Private).

### Lấy code mới về máy đã cài

```powershell
git pull
```

Sau đó chạy lại API: nếu CSDL có thay đổi, API tự áp migration mới và giữ nguyên dữ liệu. Nếu `package.json` thay đổi thì chạy lại `npm install`.

### Tùy chọn

- **Dùng SQL Server khác:** sửa `ConnectionStrings:Vibasic` trong `api/Vibasic.Api/appsettings.json`, hoặc đặt biến môi trường `ConnectionStrings__Vibasic`.
- **Nạp lại dữ liệu mẫu từ đầu:** xóa DB rồi chạy lại API. Lệnh này **xóa hết dữ liệu** trong DB.

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

Sau lịch sử, `Seed/DemoScenarios.cs` dựng thêm các việc đang dở của hôm nay. Phần này đi qua đúng các service nghiệp vụ nên theo cùng quy tắc với app, và giúp mỗi trạng thái đều có mẫu để demo:

- **Nhập kho:** phiếu "Đang nhập kho"; phiếu "Chờ duyệt" có lô tạm cách ly và một dòng lệch chứng từ; phiếu "Từ chối"; phiếu đã duyệt có lô "Tạm cách ly" chờ xử lý biên bản; biên bản lô cách ly bị từ chối (lô về "Bình thường"); lô không đạt đã khóa rồi trả nhà cung cấp (lô về tồn 0); lô không đạt đã khóa, chờ tiêu hủy.
- **Xuất kho:** phiếu "Chờ lấy hàng" chưa ai nhận; phiếu đang lấy dở (đã quét một phần); phiếu đã quét đủ chờ giao; phiếu đã giao hôm nay; đơn bị hủy khi đang lấy hàng (phiếu "Đã hủy"); đơn "Chờ xử lý" vì không đủ hàng.
- **Biên bản bất thường:** đủ ba nguồn (nhập kho, xuất kho, kiểm kê). Có đủ các trạng thái Chờ duyệt, Chờ xử lý, Đang xử lý, Đã xử lý (cả rời kho và sửa xong trở về kho) và Từ chối; có một biên bản "Cả lô" làm lô tạm cách ly. Vài biên bản chờ duyệt có sẵn hướng xử lý do nhân viên đề xuất. Biên bản lô bị khóa trong lịch sử đã xử lý xong (trả nhà cung cấp).
- **Kiểm kê:** kế hoạch định kỳ toàn kho chờ thực hiện; phiếu chờ duyệt có lô dư; phiếu đã duyệt có sản phẩm "Thất thoát" (một lô đếm bằng quét tem); phiếu bị từ chối (kế hoạch quay về "Chờ thực hiện"); kế hoạch có biên bản lỗi phát hiện khi kiểm kê.

Phần này chỉ chạy khi API vừa tạo DB mới (không chạy trong test). Bước nào lỗi thì ghi cảnh báo `[demo seed]` vào log rồi bỏ qua.

## Cấu trúc và cách hoạt động

Trình duyệt chạy web React. Web gọi API qua đường dẫn `/api/...`: khi chạy dev, Vite chuyển các lời gọi này sang API ở cổng 5030. API kiểm tra quyền bằng JWT, xử lý nghiệp vụ rồi đọc ghi SQL Server qua EF Core.

```
Trình duyệt (React, :5173) ──/api──▶ ASP.NET Core API (:5030) ──EF Core──▶ SQL Server "Vibasic" (22 bảng)
```

### `api/`: phía máy chủ, chia 4 project

| Project | Vai trò |
|---|---|
| `Vibasic.Domain` | Lớp dữ liệu (`Entities.cs`: 22 bảng) và trạng thái (`Enums.cs`). Trạng thái lưu trong DB bằng nhãn tiếng Việt, ví dụ "Chờ lấy hàng". |
| `Vibasic.Infrastructure` | Toàn bộ quy tắc nghiệp vụ, mỗi nhóm một service: `Receiving` (nhập kho), `Issuing` (xuất kho FIFO, hủy đơn), `Stocktaking` (kiểm kê), `Abnormal` (biên bản bất thường), `Decision` (ROP, EOQ, cảnh báo, đề xuất), `Catalog` (danh mục). Ngoài ra có `VibasicDbContext` (ánh xạ bảng), `CodeGenerator` (mã phiếu, mã lô, mã sản phẩm), `Migrations` (lịch sử thay đổi CSDL) và `Seed` (dữ liệu mẫu). |
| `Vibasic.Api` | Cửa vào HTTP. `Controllers/` nhận yêu cầu, kiểm tra vai trò rồi gọi service tương ứng. `Auth/` cấp JWT khi đăng nhập. `ReplenishmentJob` chạy nền, tính lại ROP và EOQ lúc 02:00 thứ Hai. `Program.cs` cấu hình mọi thứ và tự áp migration khi khởi động. |
| `Vibasic.Tests` | Kiểm thử tự động bằng xUnit, chạy trên DB giả trong bộ nhớ. |

Mỗi thay đổi tồn kho đều đi qua cùng một luồng: controller gọi service, service kiểm tra quy tắc rồi ghi DB, sau đó gọi `ReplenishmentService.CheckAsync`. Hàm này mở, cập nhật hoặc đóng cảnh báo và đề xuất bổ sung theo tồn ròng mới.

### `web/`: phía giao diện

| Thư mục | Vai trò |
|---|---|
| `src/app/` | Phần dùng chung: `router.tsx` (đường dẫn trang), `api.ts` (gọi API kèm JWT), `auth.tsx` (đăng nhập và vai trò), và các file hook gọi API theo nghiệp vụ như `issuing.ts`, `receiving.ts`, `stock.ts`, `decision.ts`. |
| `src/features/` | Màn hình theo nghiệp vụ: `manager/` (khung giao diện Quản lý), `staff/` (khung giao diện Nhân viên kho cho tablet và điện thoại), `receiving/`, `issuing/`, `stocktake/`, `abnormal/`, `decision/`, `reports/`, `print/` (trang in tem, biên bản, báo cáo). |
| `src/design/` | Bộ component, màu và font chép từ `design-system/vibasic-design`. |

Đường dẫn trang theo vai trò: `/ql/...` cho Quản lý, `/kho/...` cho Nhân viên kho, `/in/...` cho các trang in.

### `docs/`

- [Hướng dẫn sử dụng](docs/huong-dan-su-dung.md): quy tắc, trạng thái và cách thao tác.
- [Từ điển dữ liệu](docs/tu-dien-du-lieu.md): 22 bảng, từng cột, màn hình nào dùng bảng nào, quy trình từng bước.
- [Thay đổi so với CSDL trong báo cáo](docs/schema-changes.md).
- Sơ đồ lớp: [ảnh](docs/so-do-lop.png), [PlantUML](docs/so-do-lop.puml), [Mermaid](docs/so-do-lop.mmd).
- `anh-giao-dien/`: ảnh chụp từng màn hình và từng bước quy trình.

## Kiểm thử

```powershell
cd api; dotnet test Vibasic.Tests      # 80 test quy tắc nghiệp vụ
cd web; npm run build; npm run lint    # kiểm tra kiểu TypeScript, build, lint
```

## Tiến độ

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Nền tảng: CSDL theo sơ đồ lớp Hình 3.10, dữ liệu mẫu, đăng nhập JWT, khung giao diện cho hai vai trò | Xong |
| 2 | Danh mục (UC_01–03) và chính sách tồn kho | Xong |
| 3 | Nhập kho (UC_04–06), duyệt phiếu nhập (UC_10), xử lý biên bản của lô cách ly khi nhập (UC_12) | Xong |
| 4 | Xuất kho FIFO (UC_07–09), báo hàng lỗi khi xuất (UC_11 nguồn xuất kho) | Xong |
| 5 | Biên bản bất thường, kiểm kê, tra cứu lô (UC_11–16) | Xong |
| 6 | ROP, EOQ, cảnh báo, đề xuất (UC_17–18) | Xong |
| 7 | Báo cáo và tổng quan (UC_19) | Xong |
| 8 | Hủy đơn hàng (UC_20), đề xuất theo bộ quy tắc Q1–Q20, báo cáo đề xuất DX; phiếu xuất không cần duyệt; bỏ thông báo trong app; CSDL chốt 22 bảng | Xong |
