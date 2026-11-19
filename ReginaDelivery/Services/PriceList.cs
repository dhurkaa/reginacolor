using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;

namespace ReginaDelivery.Services;

/// <summary>Current prices keyed by (productId, size). Size is "" for products without sizes.</summary>
public static class PriceList
{
    public static async Task<Dictionary<(int ProductId, string Size), decimal>> LoadAsync(AppDbContext db, CancellationToken ct = default) =>
        (await db.ProductPrices.AsNoTracking().ToListAsync(ct))
            .ToDictionary(p => (p.ProductId, p.Size), p => p.Price);

    public static decimal? Lookup(this Dictionary<(int ProductId, string Size), decimal> prices, int productId, string? size) =>
        prices.TryGetValue((productId, size ?? ""), out var p) ? p : null;
}
