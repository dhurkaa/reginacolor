using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;

namespace ReginaDelivery.Services;

public static class AppClaims
{
    public const string FullName = "full_name";
    public const string Stamp = "stamp";

    public static int GetUserId(this ClaimsPrincipal p) =>
        int.TryParse(p.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    public static string GetFullName(this ClaimsPrincipal p) =>
        p.FindFirstValue(FullName) ?? p.Identity?.Name ?? "";

    public static ClaimsPrincipal CreatePrincipal(User u) => new(new ClaimsIdentity(
    [
        new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()),
        new Claim(ClaimTypes.Name, u.Username),
        new Claim(FullName, u.FullName),
        new Claim(ClaimTypes.Role, u.Role.ToString()),
        new Claim(Stamp, u.SecurityStamp),
    ], CookieAuthenticationDefaults.AuthenticationScheme));

    /// <summary>Everyone works from a phone: 14-day sliding session, so nobody re-logs in every day
    /// and an agent tapping a notification lands straight on the order.</summary>
    public static AuthenticationProperties CreateProperties(User u) =>
        new() { IsPersistent = true, AllowRefresh = true, ExpiresUtc = DateTimeOffset.UtcNow.AddDays(14) };

    public static string HomeFor(ClaimsPrincipal p) => p.IsInRole(nameof(Role.Agent)) ? "/agent" : "/field";
}

public static class AuthEvents
{
    /// <summary>On every request: reject the cookie if the user was disabled, removed, re-roled or had a password reset.</summary>
    public static async Task ValidatePrincipalAsync(CookieValidatePrincipalContext ctx)
    {
        var principal = ctx.Principal;
        var userId = principal?.GetUserId() ?? 0;
        var stamp = principal?.FindFirstValue(AppClaims.Stamp);
        var role = principal?.FindFirstValue(ClaimTypes.Role);

        var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var user = userId == 0 ? null : await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.IsActive, u.SecurityStamp, u.Role })
            .FirstOrDefaultAsync();

        if (user is null || !user.IsActive || user.SecurityStamp != stamp || user.Role.ToString() != role)
        {
            ctx.RejectPrincipal();
            await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }
    }

    private static bool IsFetch(HttpRequest r) => r.Headers["X-Requested-With"] == "fetch";

    public static Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> ctx)
    {
        if (IsFetch(ctx.Request)) ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        else ctx.Response.Redirect(ctx.RedirectUri);
        return Task.CompletedTask;
    }

    /// <summary>Real 403 status on the requested URL (the status-code page renders the message).</summary>
    public static Task AccessDenied(RedirectContext<CookieAuthenticationOptions> ctx)
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}
