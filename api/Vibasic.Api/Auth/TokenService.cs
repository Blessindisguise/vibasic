using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Vibasic.Domain;

namespace Vibasic.Api.Auth;

public record JwtOptions
{
    public string Key { get; init; } = "";
    public string Issuer { get; init; } = "vibasic";
    public int ExpiresHours { get; init; } = 12;
}

public static class Policies
{
    public const string Manager = "Manager";
    public const string Staff = "Staff";
}

public class TokenService(JwtOptions options)
{
    public (string token, DateTime expiresUtc) Issue(User user)
    {
        var expires = DateTime.UtcNow.AddHours(options.ExpiresHours);
        var claims = new[]
        {
            new Claim("sub", user.UserId.ToString()),
            new Claim("name", user.FullName),
            new Claim("username", user.Username),
            new Claim("role", user.Role.ToString()),
        };
        var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Key)), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(options.Issuer, options.Issuer, claims, expires: expires, signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }
}

public static class ClaimsExtensions
{
    public static int UserId(this ClaimsPrincipal p) => int.Parse(p.FindFirstValue("sub")!);
}
