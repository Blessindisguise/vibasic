using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Api;
using Vibasic.Infrastructure;
using Vibasic.Infrastructure.Abnormal;
using Vibasic.Infrastructure.Catalog;
using Vibasic.Infrastructure.Issuing;
using Vibasic.Infrastructure.Receiving;
using Vibasic.Infrastructure.Seed;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<VibasicDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Vibasic")));
builder.Services.AddScoped<CodeGenerator>();
builder.Services.AddScoped<CatalogService>();
builder.Services.AddScoped<Notifier>();
builder.Services.AddScoped<ReceiptService>();
builder.Services.AddScoped<AbnormalReportService>();
builder.Services.AddScoped<IssueService>();
builder.Services.AddSingleton<IClock, SystemClock>();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Issuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            NameClaimType = "name",
            RoleClaimType = "role",
        };
        // UC_01: a deactivated account, or one whose role changed, loses access on its next request, not when the token expires.
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var db = ctx.HttpContext.RequestServices.GetRequiredService<VibasicDbContext>();
                var id = int.Parse(ctx.Principal!.FindFirstValue("sub")!);
                var user = await db.Users.AsNoTracking().Where(u => u.UserId == id)
                    .Select(u => new { u.IsActive, u.Role }).SingleOrDefaultAsync();
                if (user is null || !user.IsActive || user.Role.ToString() != ctx.Principal!.FindFirstValue("role"))
                    ctx.Fail("Tài khoản đã ngừng hoạt động hoặc đã đổi vai trò.");
            },
        };
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.Manager, p => p.RequireRole(nameof(UserRole.Manager)))
    .AddPolicy(Policies.Staff, p => p.RequireRole(nameof(UserRole.Staff)));

builder.Services.AddControllers(o => o.Filters.Add<ApiExceptionFilter>()).AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
}).ConfigureApiBehaviorOptions(o =>
{
    // Unreadable request bodies: keep the details, but show a Vietnamese title.
    var inner = o.InvalidModelStateResponseFactory;
    o.InvalidModelStateResponseFactory = ctx =>
    {
        var result = inner(ctx);
        if (result is ObjectResult { Value: ProblemDetails p }) p.Title = "Dữ liệu gửi lên không đọc được. Tải lại trang rồi thử lại.";
        return result;
    };
});
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<VibasicDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db, DateTime.UtcNow);

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
