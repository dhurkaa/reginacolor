using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;
using ReginaDelivery.Resources;
using ReginaDelivery.Services;

namespace ReginaDelivery.Pages;

public class LoginModel(AppDbContext db, LoginThrottle throttle, IPasswordHasher<User> hasher) : PageModel
{
    [BindProperty] public string Username { get; set; } = "";
    [BindProperty] public string Password { get; set; } = "";
    [BindProperty(SupportsGet = true)] public string? ReturnUrl { get; set; }

    public string? Error { get; private set; }

    public IActionResult OnGet()
    {
        if (User.Identity?.IsAuthenticated == true) return LocalRedirect(AppClaims.HomeFor(User));
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        var username = (Username ?? "").Trim().ToLowerInvariant();
        var key = LoginThrottle.Key(username, HttpContext.Connection.RemoteIpAddress?.ToString());

        if (throttle.IsBlocked(key))
        {
            Error = Strings.LoginLocked;
            return Page();
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
        var result = user is null || !user.IsActive
            ? PasswordVerificationResult.Failed
            : hasher.VerifyHashedPassword(user, user.PasswordHash, Password ?? "");

        if (user is null || result == PasswordVerificationResult.Failed)
        {
            throttle.RegisterFailure(key);
            Error = throttle.IsBlocked(key) ? Strings.LoginLocked : Strings.LoginInvalid;
            Password = "";
            return Page();
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = hasher.HashPassword(user, Password ?? "");
            await db.SaveChangesAsync();
        }

        throttle.Reset(key);
        var principal = AppClaims.CreatePrincipal(user);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, AppClaims.CreateProperties(user));

        var home = AppClaims.HomeFor(principal);
        // Only honour a local return URL inside the user's own area.
        if (!string.IsNullOrEmpty(ReturnUrl) && Url.IsLocalUrl(ReturnUrl)
            && ReturnUrl.StartsWith(home, StringComparison.OrdinalIgnoreCase))
            return LocalRedirect(ReturnUrl);
        return LocalRedirect(home);
    }
}
