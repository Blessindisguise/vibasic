using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Catalog;
using Vibasic.Infrastructure.Decision;

namespace Vibasic.Api.Controllers;

// Read endpoints are open to both roles (staff pick products/suppliers on receipts); writes are manager-only.

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController(VibasicDbContext db, CatalogService catalog) : ControllerBase
{
    public record CategoryRow(int Id, string Name, string? Description, int ProductCount);

    [HttpGet]
    public async Task<List<CategoryRow>> List() =>
        await db.ProductCategories.OrderBy(c => c.CategoryName)
            .Select(c => new CategoryRow(c.CategoryId, c.CategoryName, c.Description, db.Products.Count(p => p.CategoryId == c.CategoryId)))
            .ToListAsync();

    [HttpPost, Authorize(Policy = Policies.Manager)]
    public async Task<CategoryRow> Create(CategoryInput input) => await Row((await catalog.SaveCategoryAsync(null, input)).CategoryId);

    [HttpPut("{id:int}"), Authorize(Policy = Policies.Manager)]
    public async Task<CategoryRow> Update(int id, CategoryInput input) => await Row((await catalog.SaveCategoryAsync(id, input)).CategoryId);

    private Task<CategoryRow> Row(int id) => db.ProductCategories.Where(c => c.CategoryId == id)
        .Select(c => new CategoryRow(c.CategoryId, c.CategoryName, c.Description, db.Products.Count(p => p.CategoryId == c.CategoryId)))
        .SingleAsync();
}

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController(VibasicDbContext db, CatalogService catalog) : ControllerBase
{
    public record SupplierRow(int Id, string Name, string? Phone, string? Address, int ProductCount);

    [HttpGet]
    public async Task<List<SupplierRow>> List() =>
        await Rows(db.Suppliers.OrderBy(s => s.SupplierName)).ToListAsync();

    [HttpPost, Authorize(Policy = Policies.Manager)]
    public async Task<SupplierRow> Create(SupplierInput input)
    {
        var s = await catalog.SaveSupplierAsync(null, input);
        return await Rows(db.Suppliers.Where(x => x.SupplierId == s.SupplierId)).SingleAsync();
    }

    [HttpPut("{id:int}"), Authorize(Policy = Policies.Manager)]
    public async Task<SupplierRow> Update(int id, SupplierInput input)
    {
        await catalog.SaveSupplierAsync(id, input);
        return await Rows(db.Suppliers.Where(x => x.SupplierId == id)).SingleAsync();
    }

    // Filter/sort on the entity first; EF cannot translate predicates on the projected record.
    private IQueryable<SupplierRow> Rows(IQueryable<Supplier> source) => source.Select(s =>
        new SupplierRow(s.SupplierId, s.SupplierName, s.Phone, s.Address, db.Products.Count(p => p.SupplierId == s.SupplierId)));
}

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController(VibasicDbContext db, CatalogService catalog) : ControllerBase
{
    /// <param name="SafetyStock">Q4: calculated weekly with ROP and EOQ (null while they cannot be calculated).</param>
    public record PolicyDto(int LeadTimeDays, decimal OrderingCost, decimal HoldingCost, decimal? SafetyStock,
        decimal? CurrentRop, decimal? CurrentEoq, decimal? AvgDailyDemand, decimal? DemandStdDev, DemandState DemandState,
        DateTime? LastRopCalculatedAt, DateTime? LastEoqCalculatedAt);
    /// <param name="Available">Tồn kho khả dụng: sum of QuantityOnHand over "Bình thường" lots.</param>
    /// <param name="Ordered">Orders received but not issued yet (Q8).</param>
    /// <param name="LotCount">Lots ever received; the SKU is frozen once this is above 0.</param>
    public record ProductRow(int Id, string Sku, string Name, string Unit, int CategoryId, string CategoryName,
        int SupplierId, string SupplierName, int Available, int Ordered, int LotCount, PolicyDto? Policy)
    {
        /// <summary>Tồn ròng = Available − Ordered (Q8), compared with ROP.</summary>
        public int Net => Available - Ordered;
    }

    [HttpGet]
    public async Task<List<ProductRow>> List() => await Rows(db.Products.OrderBy(p => p.SKU)).ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductRow>> Get(int id) =>
        await Rows(db.Products.Where(p => p.ProductId == id)).SingleOrDefaultAsync() is { } row ? row
            : Problem(statusCode: 404, title: "Không tìm thấy hàng hóa.");

    [HttpPost, Authorize(Policy = Policies.Manager)]
    public async Task<ProductRow> Create(ProductInput input)
    {
        var p = await catalog.SaveProductAsync(null, input);
        return await Rows(db.Products.Where(x => x.ProductId == p.ProductId)).SingleAsync();
    }

    [HttpPut("{id:int}"), Authorize(Policy = Policies.Manager)]
    public async Task<ProductRow> Update(int id, ProductInput input)
    {
        await catalog.SaveProductAsync(id, input);
        return await Rows(db.Products.Where(x => x.ProductId == id)).SingleAsync();
    }

    // Filter/sort on the entity first; EF cannot translate predicates on the projected record.
    private IQueryable<ProductRow> Rows(IQueryable<Product> source) => source.Select(p => new ProductRow(
        p.ProductId, p.SKU, p.ProductName, p.Unit, p.CategoryId, p.Category.CategoryName, p.SupplierId, p.Supplier.SupplierName,
        db.GoodsReceiptDetails.Where(d => d.ProductId == p.ProductId && d.Status == LotStatus.Normal).Sum(d => (int?)d.QuantityOnHand) ?? 0,
        db.OrderDetails.Where(d => d.ProductId == p.ProductId && ReplenishmentService.OpenOrders.Contains(d.Order.Status)).Sum(d => (int?)d.Quantity) ?? 0,
        db.GoodsReceiptDetails.Count(d => d.ProductId == p.ProductId),
        p.Policy == null ? null : new PolicyDto(p.Policy.LeadTimeDays, p.Policy.OrderingCost, p.Policy.HoldingCost, p.Policy.SafetyStock,
            p.Policy.CurrentROP, p.Policy.CurrentEOQ, p.Policy.AvgDailyDemand, p.Policy.DemandStdDev, p.Policy.DemandState,
            p.Policy.LastROPCalculatedAt, p.Policy.LastEOQCalculatedAt)));
}

[ApiController]
[Route("api/users")]
[Authorize(Policy = Policies.Manager)]
public class UsersController(VibasicDbContext db, CatalogService catalog) : ControllerBase
{
    public record UserRow(int Id, string Username, string FullName, UserRole Role, bool IsActive);

    [HttpGet]
    public async Task<List<UserRow>> List() =>
        (await db.Users.ToListAsync())
            .OrderByDescending(u => u.IsActive).ThenBy(u => u.Role).ThenBy(u => u.FullName)
            .Select(ToRow).ToList();

    [HttpPost]
    public async Task<UserRow> Create(UserInput input) => ToRow(await catalog.SaveUserAsync(null, input, User.UserId()));

    [HttpPut("{id:int}")]
    public async Task<UserRow> Update(int id, UserInput input) => ToRow(await catalog.SaveUserAsync(id, input, User.UserId()));

    [HttpPost("{id:int}/deactivate")]
    public async Task<UserRow> Deactivate(int id) => ToRow(await catalog.SetUserActiveAsync(id, false, User.UserId()));

    [HttpPost("{id:int}/activate")]
    public async Task<UserRow> Activate(int id) => ToRow(await catalog.SetUserActiveAsync(id, true, User.UserId()));

    private static UserRow ToRow(User u) => new(u.UserId, u.Username, u.FullName, u.Role, u.IsActive);
}
