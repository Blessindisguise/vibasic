using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Catalog;
using Vibasic.Infrastructure.Seed;

namespace Vibasic.Tests;

public class CatalogTests
{
    private static async Task<VibasicDbContext> SeededDb()
    {
        var db = new VibasicDbContext(new DbContextOptionsBuilder<VibasicDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        await DbSeeder.SeedAsync(db, new DateTime(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc));
        return db;
    }

    private static ProductInput NewProduct(VibasicDbContext db, string sku = "THT-04") => new(
        sku, "Thớt gỗ xà cừ 25cm", "cái", db.ProductCategories.First().CategoryId, db.Suppliers.First().SupplierId, 7, 10, 300_000, 5_000);

    private static async Task<ValidationException> Invalid(Func<Task> act) => await Assert.ThrowsAsync<ValidationException>(act);

    [Fact]
    public async Task Product_is_created_with_its_inventory_policy_and_normalised_sku()
    {
        await using var db = await SeededDb();
        var p = await new CatalogService(db).SaveProductAsync(null, NewProduct(db, " tht-04 "));
        var saved = await db.Products.Include(x => x.Policy).SingleAsync(x => x.ProductId == p.ProductId);
        Assert.Equal("THT-04", saved.SKU);
        Assert.Equal(7, saved.Policy!.LeadTimeDays);
        Assert.Null(saved.Policy.CurrentROP); // derived later by the weekly job, never entered by hand
    }

    [Fact]
    public async Task Duplicate_sku_and_missing_category_are_rejected_per_field()
    {
        await using var db = await SeededDb();
        var e = await Invalid(() => new CatalogService(db).SaveProductAsync(null, NewProduct(db, "THT-01") with { CategoryId = null }));
        Assert.Contains("THT-01", e.Errors["sku"]);
        Assert.True(e.Errors.ContainsKey("categoryId"));
    }

    [Fact]
    public async Task Sku_cannot_change_once_the_product_has_lots()
    {
        await using var db = await SeededDb();
        var p = await db.Products.Include(x => x.Policy).FirstAsync(x => x.SKU == "THT-01");
        var input = new ProductInput("THT-99", p.ProductName, p.Unit, p.CategoryId, p.SupplierId, 10, 18, 450_000, 9_000);
        var e = await Invalid(() => new CatalogService(db).SaveProductAsync(p.ProductId, input));
        Assert.Contains("đã có lô nhập kho", e.Errors["sku"]);

        // Other fields can still be edited.
        await new CatalogService(db).SaveProductAsync(p.ProductId, input with { Sku = "THT-01", LeadTimeDays = 12 });
        Assert.Equal(12, (await db.InventoryPolicies.SingleAsync(x => x.ProductId == p.ProductId)).LeadTimeDays);
    }

    [Fact]
    public async Task Category_name_is_unique_and_supplier_name_required()
    {
        await using var db = await SeededDb();
        var svc = new CatalogService(db);
        Assert.True((await Invalid(() => svc.SaveCategoryAsync(null, new("Thớt", null)))).Errors.ContainsKey("name"));
        Assert.True((await Invalid(() => svc.SaveSupplierAsync(null, new("  ", "0903 118 245", null)))).Errors.ContainsKey("name"));
        var s = await svc.SaveSupplierAsync(null, new("  Gỗ   Hòa Phát ", null, null));
        Assert.Equal("Gỗ Hòa Phát", s.SupplierName);
    }

    [Fact]
    public async Task User_password_is_hashed_and_username_unique()
    {
        await using var db = await SeededDb();
        var svc = new CatalogService(db);
        var manager = await db.Users.FirstAsync(u => u.Role == UserRole.Manager);

        var u = await svc.SaveUserAsync(null, new("NhanVien3", "Trần Minh Khoa", "kho@2026x", UserRole.Staff), manager.UserId);
        Assert.Equal("nhanvien3", u.Username);
        Assert.True(BCrypt.Net.BCrypt.Verify("kho@2026x", u.PasswordHash));

        var e = await Invalid(() => svc.SaveUserAsync(null, new("nhanvien1", "X", "12345678", UserRole.Staff), manager.UserId));
        Assert.True(e.Errors.ContainsKey("username"));
        e = await Invalid(() => svc.SaveUserAsync(null, new("nv4", "X", null, UserRole.Staff), manager.UserId));
        Assert.True(e.Errors.ContainsKey("password"));

        // Editing without a password keeps the old one.
        var hash = u.PasswordHash;
        await svc.SaveUserAsync(u.UserId, new("nhanvien3", "Trần Minh Khoa", "", UserRole.Staff), manager.UserId);
        Assert.Equal(hash, u.PasswordHash);
    }

    [Fact]
    public async Task Manager_cannot_lock_themselves_out()
    {
        await using var db = await SeededDb();
        var svc = new CatalogService(db);
        var manager = await db.Users.FirstAsync(u => u.Role == UserRole.Manager);
        await Assert.ThrowsAsync<RuleException>(() => svc.SetUserActiveAsync(manager.UserId, false, manager.UserId));
        var e = await Invalid(() => svc.SaveUserAsync(manager.UserId, new(manager.Username, manager.FullName, null, UserRole.Staff), manager.UserId));
        Assert.True(e.Errors.ContainsKey("role"));

        var staff = await db.Users.FirstAsync(u => u.Role == UserRole.Staff);
        Assert.False((await svc.SetUserActiveAsync(staff.UserId, false, manager.UserId)).IsActive);
    }
}
