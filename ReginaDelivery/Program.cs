using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;
using ReginaDelivery.Services;

var builder = WebApplication.CreateBuilder(args);

// --- Storage: SQLite file (DB_PATH, default ./app.db); data-protection keys next to it so logins survive restarts.
var dbPath = builder.Configuration["DB_PATH"];
if (string.IsNullOrWhiteSpace(dbPath)) dbPath = Path.Combine(builder.Environment.ContentRootPath, "app.db");
dbPath = Path.GetFullPath(dbPath);
var dataDir = Path.GetDirectoryName(dbPath)!;
Directory.CreateDirectory(dataDir);

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite($"Data Source={dbPath}"));
builder.Services.AddDataProtection()
    .SetApplicationName("ReginaDelivery")
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(dataDir, "keys")));

builder.Services.AddSingleton<TimeService>();
builder.Services.AddSingleton<LoginThrottle>();
builder.Services.AddScoped<CsvExportService>();
builder.Services.AddSingleton(sp => new VapidKeys(builder.Configuration, dataDir, sp.GetRequiredService<ILogger<VapidKeys>>()));
builder.Services.AddSingleton<NotificationQueue>();
builder.Services.AddScoped<NotificationSender>();
builder.Services.AddHostedService<NotificationWorker>();
builder.Services.AddHttpClient("webpush", c => c.Timeout = TimeSpan.FromSeconds(15));
builder.Services.AddHttpClient("telegram", c => c.Timeout = TimeSpan.FromSeconds(15));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddRouting(o => o.LowercaseUrls = true);

// --- Auth: cookies, roles Agent / Field.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.LoginPath = "/login";
        o.LogoutPath = "/logout";
        o.Cookie.Name = "rc_auth";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        o.ExpireTimeSpan = TimeSpan.FromDays(14);
        o.SlidingExpiration = true;
        o.Events.OnValidatePrincipal = AuthEvents.ValidatePrincipalAsync;
        o.Events.OnRedirectToLogin = AuthEvents.RedirectToLogin;
        o.Events.OnRedirectToAccessDenied = AuthEvents.AccessDenied;
    });

builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("Agent", p => p.RequireRole(nameof(Role.Agent)));
    o.AddPolicy("Field", p => p.RequireRole(nameof(Role.Field)));
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

builder.Services.AddRazorPages(o =>
{
    o.Conventions.AuthorizeFolder("/Agent", "Agent");
    o.Conventions.AuthorizeFolder("/Field", "Field");
    o.Conventions.AllowAnonymousToPage("/Login");
    o.Conventions.AllowAnonymousToPage("/Error");
});

var app = builder.Build();

// --- Migrate + seed (first agent from env vars, products). Fail fast with a readable message.
using (var scope = app.Services.CreateScope())
{
    try
    {
        await Seeder.SeedAsync(scope.ServiceProvider, app.Configuration, app.Logger);
    }
    catch (Seeder.StartupException ex)
    {
        app.Logger.LogCritical("STARTUP FAILED: {Message}", ex.Message);
        Console.Error.WriteLine("STARTUP FAILED: " + ex.Message);
        return 1;
    }
}

if (string.Equals(app.Configuration["TRUST_PROXY"], "true", StringComparison.OrdinalIgnoreCase))
{
    // Behind Caddy / Railway / Render: take the real client IP and scheme from X-Forwarded-* headers.
    var fwd = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
    };
    fwd.KnownNetworks.Clear();
    fwd.KnownProxies.Clear();
    app.UseForwardedHeaders(fwd);
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/error/500");
    app.UseHsts();
}

app.UseStatusCodePagesWithReExecute("/error/{0}");
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapRazorPages();

app.MapGet("/agent/export.csv", async ([AsParameters] OrderFilter filter, CsvExportService csv, TimeService time, CancellationToken ct) =>
{
    var bytes = await csv.BuildAsync(filter, ct);
    var (from, to) = filter.Range(time);
    return Results.File(bytes, "text/csv; charset=utf-8", $"porosite_{from:yyyy-MM-dd}_{to:yyyy-MM-dd}.csv");
}).RequireAuthorization("Agent");

await app.RunAsync();
return 0;
