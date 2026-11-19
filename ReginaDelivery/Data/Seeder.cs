using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Models;

namespace ReginaDelivery.Data;

public static class Seeder
{
    /// <summary>Thrown when startup can't continue; the message is shown to whoever runs the app.</summary>
    public class StartupException(string message) : Exception(message);

    private sealed record ProductSeed(
        string Code, string Brand, string Name, string Description,
        string[]? Sizes, string? Unit, string? ShadePrefix, int? ShadeMin, int? ShadeMax);

    public static async Task SeedAsync(IServiceProvider services, IConfiguration config, ILogger logger)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();

        await db.Database.MigrateAsync();

        // 1. First agent from env vars (never a hard-coded default).
        if (!await db.Users.AnyAsync(u => u.Role == Role.Agent))
        {
            var username = (config["ADMIN_USERNAME"] ?? "").Trim().ToLowerInvariant();
            var password = config["ADMIN_PASSWORD"] ?? "";
            if (username.Length == 0 || password.Length == 0)
                throw new StartupException(
                    "No agent account exists yet. Set the ADMIN_USERNAME and ADMIN_PASSWORD environment variables " +
                    "and start the app again to create the first agent.");
            if (!UserRules.IsValidUsername(username))
                throw new StartupException(UserRules.UsernameRuleText + " (ADMIN_USERNAME)");
            if (password.Length < UserRules.MinPasswordLength)
                throw new StartupException($"ADMIN_PASSWORD must be at least {UserRules.MinPasswordLength} characters.");

            var admin = new User { Username = username, FullName = config["ADMIN_FULLNAME"] is { Length: > 0 } fn ? fn.Trim() : "Agjenti", Role = Role.Agent };
            admin.PasswordHash = hasher.HashPassword(admin, password);
            db.Users.Add(admin);
            await db.SaveChangesAsync();
            logger.LogInformation("Created agent user '{Username}'.", username);
        }

        // 2. Products: insert any code that is missing (never overwrites admin edits).
        var seeds = LoadProductSeeds();
        var existing = (await db.Products.Select(p => p.Code).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added = 0;
        for (var i = 0; i < seeds.Count; i++)
        {
            var s = seeds[i];
            if (existing.Contains(s.Code)) continue;
            db.Products.Add(new Product
            {
                Code = s.Code,
                Brand = s.Brand,
                Name = s.Name,
                Description = s.Description,
                Sizes = string.Join(",", s.Sizes ?? []),
                DefaultUnit = s.Unit ?? DefaultUnitForBrand(s.Brand),
                ShadePrefix = s.ShadePrefix,
                ShadeMin = s.ShadeMin,
                ShadeMax = s.ShadeMax,
                SortOrder = (i + 1) * 10,
                IsActive = true,
            });
            added++;
        }
        if (added > 0)
        {
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded {Count} products.", added);
        }
    }

    public static string DefaultUnitForBrand(string brand) => brand switch
    {
        "Regina Polvere" or "Bau Putz" => "thes",
        "Regina Colori" or "Bau Farbe" => "kovë",
        _ => "copë",
    };

    private static List<ProductSeed> LoadProductSeeds()
    {
        using var stream = typeof(Seeder).Assembly.GetManifestResourceStream("ReginaDelivery.products.json")
            ?? throw new StartupException("Embedded resource products.json is missing.");
        return JsonSerializer.Deserialize<List<ProductSeed>>(stream, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? [];
    }
}
