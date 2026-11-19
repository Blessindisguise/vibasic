# CLAUDE.md

Ứng dụng web quản lý tồn kho và hỗ trợ ra quyết định bổ sung hàng cho công ty đồ gỗ gia dụng. Có hai vai trò: **Quản lý** (desktop, `/ql/...`) và **Nhân viên kho** (tablet/điện thoại, `/kho/...`). Trang in ở `/in/...`.

Đọc thêm: [README.md](README.md) (cấu trúc, cách chạy), [docs/huong-dan-su-dung.md](docs/huong-dan-su-dung.md) (quy tắc, trạng thái), [docs/tu-dien-du-lieu.md](docs/tu-dien-du-lieu.md) (22 bảng, từng cột), [docs/schema-changes.md](docs/schema-changes.md) (khác biệt so với CSDL trong báo cáo Chương 3).

## Chạy và kiểm tra

- **API** (ASP.NET Core 8, EF Core 8, SQL Server): `cd api; dotnet run --project Vibasic.Api --launch-profile http`, cổng 5030. Ở môi trường Development, API tự áp migration và tự seed khi DB còn trống.
- **Web** (React 18, Vite, TypeScript, TanStack Query): `cd web; npm run dev -- --host`, cổng 5173; Vite chuyển `/api` sang cổng 5030.
- **Test API:** `cd api; dotnet test Vibasic.Tests`. Hiện có 88 test chạy trên InMemory DB, phải qua hết.
- **Kiểm tra web:** `cd web; npm run build; npm run lint`. Lint có sẵn khoảng 19 cảnh báo `react-refresh/only-export-components` từ trước; yêu cầu là 0 lỗi.
- **Máy không có LocalDB:** đặt biến môi trường user `ConnectionStrings__Vibasic` trỏ tới SQL Server khác (ví dụ `Server=.\SQLEXPRESS;Database=Vibasic;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True`). Không sửa `appsettings.json` trong repo vì máy khác vẫn dùng LocalDB.
- **Nạp lại dữ liệu demo** (xóa hết dữ liệu): dừng API, chạy `cd api; dotnet tool restore; dotnet ef database drop -f -p Vibasic.Infrastructure -s Vibasic.Api`, rồi chạy lại API. Log phải có dòng `[demo seed] Tình huống demo: N bước xong, 0 bước bỏ qua.`
- **Migration mới:** `cd api; dotnet ef migrations add <Tên> -p Vibasic.Infrastructure -s Vibasic.Api`. Phải dừng API trước, vì API đang chạy giữ khóa các DLL nên build sẽ lỗi. Dữ liệu cần chuyển đổi thì thêm `migrationBuilder.Sql(...)` vào migration.

## Quy ước git

- Làm việc và commit trên **nhánh phụ** (hiện là `giai-doan-3`). **Không commit thẳng lên `main`.**
- Chỉ merge vào `main` hoặc push khi người dùng bảo.
- Commit message viết tiếng Việt: dòng đầu tóm tắt, rồi các gạch đầu dòng.
- Trên Windows PowerShell 5.1, message có dấu ngoặc kép sẽ bị hỏng khi truyền thẳng cho `git commit -m`. Ghi message ra file rồi dùng `git commit -F <file>`.

## Quy ước code

- Comment trong code viết **tiếng Anh**. Chữ trên giao diện, câu báo lỗi và tài liệu viết **tiếng Việt**.
- Enum trạng thái lưu trong DB bằng nhãn tiếng Việt `[Label("…")]` (`Vibasic.Domain/Enums.cs`, `LabelConverter`), cột nvarchar(20): **nhãn tối đa 20 ký tự**. Phía web nhận giá trị enum dạng camelCase (`returnToSupplier`).
- Cột hoặc bảng không có trong báo cáo Chương 3 thì đánh dấu `// + ext` trong `Entities.cs`, và cập nhật `docs/schema-changes.md` cùng `docs/tu-dien-du-lieu.md` (đánh dấu ★). CSDL đang chốt **22 bảng**: ưu tiên thêm cột, tránh thêm bảng.
- Mọi thay đổi tồn kho đi qua service trong `Vibasic.Infrastructure` (`Receiving`, `Issuing`, `Stocktaking`, `Abnormal`, `Decision`). Sau khi lưu, service gọi `ReplenishmentService.CheckAsync` / `CheckLotsAsync` để mở hoặc đóng cảnh báo và đề xuất. Controller chỉ kiểm tra vai trò rồi gọi service.
- Thời gian lấy từ `IClock` (test dùng đồng hồ cố định). DB lưu UTC; ngày nghiệp vụ và mã chứng từ theo giờ Việt Nam (`VnTime`).
- Lỗi nghiệp vụ: `RuleException` (HTTP 409, câu báo nói rõ chuyện gì xảy ra và cần làm gì). Lỗi nhập liệu: `Validator` → `ValidationException` (HTTP 400, lỗi theo từng trường, tên trường camelCase).
- `web/src/design` là bản chép của `design-system/vibasic-design`: **không sửa**, lint cũng bỏ qua thư mục này. Chỉ dùng icon có sẵn trong `web/src/design/components/core/Icon.jsx`. Dùng các component có sẵn (`Segmented`, `SelectField`, `ConfirmDialog`, `DataTable`…) thay vì viết mới.
- **Ô tìm kiếm** chỉ tìm theo thuộc tính xác định: mã chứng từ, mã lô, SKU, tên hàng, đối tác, số điện thoại, người lập/duyệt/xử lý/lấy hàng. **Không** tìm trong ô văn bản tự do (mô tả, ghi chú, lý do, địa chỉ). Mỗi danh sách định nghĩa tập trường tìm kiếm ở một hàm duy nhất, dùng chung cho cả lọc bảng và gợi ý `suggestFrom` (ví dụ `reportSearchFields` trong `web/src/app/receiving.ts`, `issueSearchFields` trong `web/src/app/issuing.ts`). Placeholder ghi đúng những gì tìm được.

## Quy tắc nghiệp vụ dễ làm sai

Chi tiết ở `docs/`. Ít nhất phải nhớ:

- Lô là `GoodsReceiptDetail` (không có bảng StockLot). Mỗi sản phẩm (`StockItem`) có mã riêng. Với lô của phiếu nhập đã duyệt, `QuantityOnHand` luôn bằng số sản phẩm "Trong kho" cộng "Đã giữ chỗ".
- Tồn kho chỉ ghi nhận khi phiếu nhập được duyệt. Lô "Tạm cách ly" và "Đã khóa" không xuất được và không tính vào tồn khả dụng.
- Phiếu xuất không qua bước duyệt. FIFO xếp theo ngày phiếu nhập, rồi `ReceiptDetailId`. Mỗi lúc chỉ một nhân viên giữ một phiếu xuất.
- **Biên bản bất thường:**
  - Khi duyệt, bắt buộc có hướng xử lý (`HandlingMethod` + `HandlingPlan`). Sau đó biên bản đi qua Chờ xử lý → Đang xử lý (một nhân viên giữ) → Đã xử lý.
  - Hoàn thành thì tồn kho cập nhật theo hướng. Trả nhà cung cấp, tiêu hủy, thanh lý: sản phẩm chuyển "Đã loại bỏ", lô khóa về tồn 0. Sửa chữa: sản phẩm về "Trong kho", lô được mở khóa.
  - Đã có người nhận xử lý thì không hủy quyết định được, và không hủy duyệt phiếu nhập được.
- Báo cáo nhập–xuất–tồn (`ReportsController.Movements`) tính điều chỉnh của hàng lỗi từ `StockItem.DefectiveAt` và `HandledAt`. Khi đổi cách xử lý hàng lỗi phải giữ đúng các điều chỉnh này. Có test kiểm tra trong `AbnormalHandlingTests`.

## Dữ liệu demo

- `Vibasic.Infrastructure/Seed/DbSeeder.cs` sinh lịch sử 12 tuần lùi từ thời điểm seed, theo bộ quy tắc Q1–Q20. Nhiều test gọi `DbSeeder.SeedAsync`, nên sửa seeder có thể làm hỏng test.
- `Seed/DemoScenarios.cs` dựng các việc đang dở của hôm nay bằng chính các service, để mọi trạng thái đều có mẫu khi demo. Chỉ `Program.cs` gọi bước này, khi DB vừa được tạo; test không gọi. Bước nào lỗi thì ghi log rồi bỏ qua.
- Thêm trạng thái hoặc luồng mới thì thêm tình huống tương ứng vào `DemoScenarios`, rồi nạp lại DB để kiểm tra "0 bước bỏ qua".
- Tài khoản mẫu, mật khẩu `Vibasic@123`: `quanly` (Quản lý), `nhanvien1`, `nhanvien2` (Nhân viên kho).
