using Microsoft.EntityFrameworkCore;
using Vibasic.Domain;

namespace Vibasic.Infrastructure;

/// <summary>
/// In-app notifications (the "thông báo cho Quản lý / nhân viên kho" steps of the use cases).
/// Rows are added to the context; the caller's SaveChanges commits them with the business change.
/// </summary>
public class Notifier(VibasicDbContext db, IClock clock)
{
    public const string Info = "info", Success = "success", Warning = "warning", Danger = "danger";

    public void ToUser(int userId, string title, string? message = null, string? link = null, string tone = Info) =>
        db.Notifications.Add(new Notification
        {
            UserId = userId, Title = Trim(title, 200)!, Message = Trim(message, 500), Link = link, Tone = tone, CreatedAt = clock.UtcNow,
        });

    /// <summary>One row per active user of the role.</summary>
    public async Task ToRoleAsync(UserRole role, string title, string? message = null, string? link = null, string tone = Info)
    {
        var ids = await db.Users.Where(u => u.Role == role && u.IsActive).Select(u => u.UserId).ToListAsync();
        foreach (var id in ids) ToUser(id, title, message, link, tone);
    }

    private static string? Trim(string? s, int max) => s is null || s.Length <= max ? s : s[..(max - 1)] + "…";
}
