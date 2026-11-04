using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;

namespace Vibasic.Infrastructure.Catalog;

public record CategoryInput(string? Name, string? Description);
public record SupplierInput(string? Name, string? Phone, string? Address);
public record ProductInput(
    string? Sku, string? Name, string? Unit, int? CategoryId, int? SupplierId,
    int? LeadTimeDays, int? SafetyStock, decimal? OrderingCost, decimal? HoldingCost);
public record UserInput(string? Username, string? FullName, string? Password, UserRole? Role);

/// <summary>Master data: UC_01 (accounts), UC_02 (products, categories, inventory policy), UC_03 (suppliers).</summary>
public partial class CatalogService(VibasicDbContext db)
{
    public const int MinPasswordLength = 8;

    [GeneratedRegex(@"^[A-Z0-9]+(-[A-Z0-9]+)*$")] private static partial Regex SkuPattern();
    [GeneratedRegex(@"^[a-z0-9._-]{3,50}$")] private static partial Regex UsernamePattern();
    [GeneratedRegex(@"^[0-9+().\s-]{8,20}$")] private static partial Regex PhonePattern();
    [GeneratedRegex(@"\s+")] private static partial Regex Spaces();

    /// <summary>Trims, collapses inner whitespace, and turns blank into null.</summary>
    public static string? Clean(string? s)
    {
        s = s?.Trim();
        return string.IsNullOrEmpty(s) ? null : Spaces().Replace(s, " ");
    }

    // ---------------- Nhóm hàng (UC_02 3.1) ----------------

    public async Task<ProductCategory> SaveCategoryAsync(int? id, CategoryInput input)
    {
        var entity = id is null ? new ProductCategory()
            : await db.ProductCategories.FindAsync(id) ?? throw new NotFoundException("Không tìm thấy nhóm hàng.");
        var name = Clean(input.Name);
        var description = Clean(input.Description);

        var v = new Validator()
            .Check(name is not null, "name", "Nhập tên nhóm hàng.")
            .Check(name is null || name.Length <= 100, "name", "Tên nhóm hàng tối đa 100 ký tự.")
            .Check(description is null || description.Length <= 255, "description", "Mô tả tối đa 255 ký tự.");
        if (!v.Has("name") && await db.ProductCategories.AnyAsync(c => c.CategoryName == name && c.CategoryId != entity.CategoryId))
            v.Check(false, "name", $"Đã có nhóm hàng \"{name}\".");
        v.ThrowIfAny();

        entity.CategoryName = name!;
        entity.Description = description;
        if (id is null) db.ProductCategories.Add(entity);
        await db.SaveChangesAsync();
        return entity;
    }

    // ---------------- Nhà cung cấp (UC_03) ----------------

    public async Task<Supplier> SaveSupplierAsync(int? id, SupplierInput input)
    {
        var entity = id is null ? new Supplier()
            : await db.Suppliers.FindAsync(id) ?? throw new NotFoundException("Không tìm thấy nhà cung cấp.");
        var name = Clean(input.Name);
        var phone = Clean(input.Phone);
        var address = Clean(input.Address);

        new Validator()
            .Check(name is not null, "name", "Nhập tên nhà cung cấp.")
            .Check(name is null || name.Length <= 150, "name", "Tên nhà cung cấp tối đa 150 ký tự.")
            .Check(phone is null || PhonePattern().IsMatch(phone), "phone", "Số điện thoại gồm 8–20 ký tự: chữ số, dấu cách, +, -, (, ).")
            .Check(address is null || address.Length <= 255, "address", "Địa chỉ tối đa 255 ký tự.")
            .ThrowIfAny();

        entity.SupplierName = name!;
        entity.Phone = phone;
        entity.Address = address;
        if (id is null) db.Suppliers.Add(entity);
        await db.SaveChangesAsync();
        return entity;
    }

    // ---------------- Hàng hóa + chính sách tồn kho (UC_02) ----------------

    public async Task<Product> SaveProductAsync(int? id, ProductInput input)
    {
        var entity = id is null ? new Product()
            : await db.Products.Include(p => p.Policy).SingleOrDefaultAsync(p => p.ProductId == id)
              ?? throw new NotFoundException("Không tìm thấy hàng hóa.");
        var sku = Clean(input.Sku)?.ToUpperInvariant();
        var name = Clean(input.Name);
        var unit = Clean(input.Unit);

        var v = new Validator()
            .Check(sku is not null, "sku", "Nhập mã SKU.")
            .Check(sku is null || (sku.Length <= 20 && SkuPattern().IsMatch(sku)), "sku",
                "Mã SKU tối đa 20 ký tự, chỉ gồm chữ không dấu, chữ số và dấu gạch ngang, ví dụ THT-04.")
            .Check(name is not null, "name", "Nhập tên hàng.")
            .Check(name is null || name.Length <= 150, "name", "Tên hàng tối đa 150 ký tự.")
            .Check(unit is not null, "unit", "Nhập đơn vị tính, ví dụ cái, hộp, đôi.")
            .Check(unit is null || unit.Length <= 20, "unit", "Đơn vị tính tối đa 20 ký tự.")
            .Check(input.CategoryId is not null, "categoryId", "Chọn nhóm hàng.")
            .Check(input.SupplierId is not null, "supplierId", "Chọn nhà cung cấp chính.")
            .Check(input.LeadTimeDays is >= 1 and <= 365, "leadTimeDays", "Thời gian giao hàng từ 1 đến 365 ngày.")
            .Check(input.SafetyStock is >= 0 and <= 1_000_000, "safetyStock", "Tồn kho an toàn là số nguyên từ 0 trở lên.")
            .Check(input.OrderingCost is > 0 and <= 1_000_000_000, "orderingCost", "Chi phí đặt hàng phải lớn hơn 0.")
            .Check(input.HoldingCost is > 0 and <= 1_000_000_000, "holdingCost", "Chi phí lưu kho phải lớn hơn 0.");

        if (input.CategoryId is not null && !await db.ProductCategories.AnyAsync(c => c.CategoryId == input.CategoryId))
            v.Check(false, "categoryId", "Nhóm hàng không còn trong danh mục.");
        if (input.SupplierId is not null && !await db.Suppliers.AnyAsync(s => s.SupplierId == input.SupplierId))
            v.Check(false, "supplierId", "Nhà cung cấp không còn trong danh mục.");
        if (!v.Has("sku"))
        {
            if (await db.Products.AnyAsync(p => p.SKU == sku && p.ProductId != entity.ProductId))
                v.Check(false, "sku", $"Mã SKU {sku} đã được dùng cho hàng hóa khác.");
            // Serial codes printed on items embed the SKU (SP-{SKU}-yymm-nnnn), so it is frozen once stock exists.
            else if (id is not null && sku != entity.SKU && await db.GoodsReceiptDetails.AnyAsync(d => d.ProductId == id))
                v.Check(false, "sku", $"Không đổi được mã SKU vì hàng hóa đã có lô nhập kho. Mã định danh đã in trên sản phẩm chứa SKU {entity.SKU}.");
        }
        v.ThrowIfAny();

        entity.SKU = sku!;
        entity.ProductName = name!;
        entity.Unit = unit!;
        entity.CategoryId = input.CategoryId!.Value;
        entity.SupplierId = input.SupplierId!.Value;
        // ROP/EOQ are derived by the weekly job (UC_17/18); only their inputs are entered here.
        entity.Policy ??= new InventoryPolicy();
        entity.Policy.LeadTimeDays = input.LeadTimeDays!.Value;
        entity.Policy.SafetyStock = input.SafetyStock!.Value;
        entity.Policy.OrderingCost = input.OrderingCost!.Value;
        entity.Policy.HoldingCost = input.HoldingCost!.Value;
        if (id is null) db.Products.Add(entity);
        await db.SaveChangesAsync();
        return entity;
    }

    // ---------------- Tài khoản nhân viên (UC_01) ----------------

    public async Task<User> SaveUserAsync(int? id, UserInput input, int actingUserId)
    {
        var entity = id is null ? new User()
            : await db.Users.FindAsync(id) ?? throw new NotFoundException("Không tìm thấy tài khoản.");
        var username = Clean(input.Username)?.ToLowerInvariant();
        var fullName = Clean(input.FullName);
        var password = string.IsNullOrEmpty(input.Password) ? null : input.Password;

        var v = new Validator()
            .Check(username is not null, "username", "Nhập tên đăng nhập.")
            .Check(username is null || UsernamePattern().IsMatch(username), "username",
                "Tên đăng nhập 3–50 ký tự, chỉ gồm chữ không dấu, chữ số, dấu chấm, gạch dưới và gạch ngang.")
            .Check(fullName is not null, "fullName", "Nhập họ tên.")
            .Check(fullName is null || fullName.Length <= 100, "fullName", "Họ tên tối đa 100 ký tự.")
            .Check(id is not null || password is not null, "password", "Nhập mật khẩu cho tài khoản mới.")
            .Check(password is null || password.Length is >= MinPasswordLength and <= 100, "password", $"Mật khẩu tối thiểu {MinPasswordLength} ký tự.")
            .Check(input.Role is not null, "role", "Chọn vai trò.")
            .Check(id != actingUserId || input.Role == UserRole.Manager, "role", "Không tự đổi vai trò của tài khoản đang đăng nhập.");
        if (!v.Has("username") && await db.Users.AnyAsync(u => u.Username == username && u.UserId != entity.UserId))
            v.Check(false, "username", $"Tên đăng nhập \"{username}\" đã tồn tại.");
        v.ThrowIfAny();

        entity.Username = username!;
        entity.FullName = fullName!;
        entity.Role = input.Role!.Value;
        if (password is not null) entity.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        if (id is null) db.Users.Add(entity);
        await db.SaveChangesAsync();
        return entity;
    }

    /// <summary>UC_01 5.1: an inactive account cannot sign in; its open sessions are rejected on the next request.</summary>
    public async Task<User> SetUserActiveAsync(int id, bool active, int actingUserId)
    {
        var entity = await db.Users.FindAsync(id) ?? throw new NotFoundException("Không tìm thấy tài khoản.");
        if (!active && id == actingUserId)
            throw new RuleException("Không thể ngừng hoạt động tài khoản đang đăng nhập.");
        entity.IsActive = active;
        await db.SaveChangesAsync();
        return entity;
    }
}
