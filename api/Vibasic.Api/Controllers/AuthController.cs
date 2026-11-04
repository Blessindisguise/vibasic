using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vibasic.Api.Auth;
using Vibasic.Domain;
using Vibasic.Infrastructure;

namespace Vibasic.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(VibasicDbContext db, TokenService tokens) : ControllerBase
{
    public record LoginRequest(string Username, string Password);
    public record UserDto(int Id, string Username, string FullName, UserRole Role);
    public record LoginResponse(string Token, DateTime ExpiresAt, UserDto User);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest req)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Username == req.Username.Trim());
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Problem(statusCode: 401, title: "Sai tên đăng nhập hoặc mật khẩu.");
        if (!user.IsActive)
            return Problem(statusCode: 403, title: "Tài khoản đã ngừng hoạt động. Liên hệ quản lý để mở lại.");

        var (token, expires) = tokens.Issue(user);
        return new LoginResponse(token, expires, ToDto(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await db.Users.FindAsync(User.UserId());
        if (user is null || !user.IsActive) return Unauthorized();
        return ToDto(user);
    }

    private static UserDto ToDto(User u) => new(u.UserId, u.Username, u.FullName, u.Role);
}
