using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;
using ReginaDelivery.Resources;
using ReginaDelivery.Services;

namespace ReginaDelivery.Pages.Field;

public class OrderInput
{
    public string CompanyName { get; set; } = "";
    public string Location { get; set; } = "";
    public string? Phone { get; set; }
    public string? Note { get; set; }
    public string? Latitude { get; set; }
    public string? Longitude { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public List<ItemInput> Items { get; set; } = new();
}

public class ItemInput
{
    public int ProductId { get; set; }
    public string Quantity { get; set; } = "";
    public string Unit { get; set; } = "";
    public string? Size { get; set; }
    public string? Shade { get; set; }
}

/// <summary>Product as sent to the browser. Prices: size ("" when no sizes) → EUR.</summary>
public record ProductDto(int Id, string Name, string Brand, string Description, string Unit,
    string[] Sizes, string? ShadePrefix, int? ShadeMin, int? ShadeMax, Dictionary<string, decimal> Prices);

public class IndexModel(AppDbContext db, NotificationQueue notifications) : PageModel
{
    [BindProperty] public OrderInput Input { get; set; } = new();

    public List<ProductDto> Products { get; private set; } = new();
    public List<string> Errors { get; } = new();

    /// <summary>Set when showing the success screen.</summary>
    public Order? Done { get; private set; }

    public async Task<IActionResult> OnGetAsync(int? done)
    {
        if (done is int id)
        {
            var me = User.GetUserId();
            Done = await db.Orders.AsNoTracking()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(o => o.Id == id && o.FieldUserId == me);
            if (Done is null) return RedirectToPage();
            return Page();
        }

        Input = new OrderInput { IdempotencyKey = Guid.NewGuid().ToString("N") };
        await LoadProductsAsync();
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        var me = User.GetUserId();
        var key = (Input.IdempotencyKey ?? "").Trim();
        if (key.Length is < 8 or > 64) key = Guid.NewGuid().ToString("N");
        Input.IdempotencyKey = key;

        // Same form submitted twice → show the first result, create nothing.
        var existingId = await FindExistingAsync(me, key);
        if (existingId is int already) return RedirectToPage(new { done = already });

        var company = (Input.CompanyName ?? "").Trim();
        var location = (Input.Location ?? "").Trim();
        var phone = string.IsNullOrWhiteSpace(Input.Phone) ? null : Input.Phone.Trim();
        var note = string.IsNullOrWhiteSpace(Input.Note) ? null : Input.Note.Trim();

        if (company.Length == 0) Errors.Add(Strings.ErrCompany);
        if (location.Length == 0) Errors.Add(Strings.ErrLocation);
        if (Input.Items.Count == 0) Errors.Add(Strings.ErrNoItems);

        var productIds = Input.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await db.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id) && p.IsActive)
            .ToDictionaryAsync(p => p.Id);
        var prices = await PriceList.LoadAsync(db);

        var items = new List<OrderItem>();
        var itemError = false;
        var missingSize = false;
        foreach (var line in Input.Items.Take(100))
        {
            if (!products.TryGetValue(line.ProductId, out var p)) { itemError = true; continue; }

            var qtyText = (line.Quantity ?? "").Trim().Replace(',', '.');
            if (!decimal.TryParse(qtyText, NumberStyles.Number, CultureInfo.InvariantCulture, out var qty)
                || qty <= 0 || qty > 1_000_000) { itemError = true; continue; }
            qty = Math.Round(qty, 3);

            var unit = UserRules.Units.FirstOrDefault(u => u == line.Unit) ?? p.DefaultUnit;

            string? size = null;
            var sizes = p.SizeList;
            if (sizes.Length > 0)
            {
                size = sizes.FirstOrDefault(s => s == line.Size);
                if (size is null) { missingSize = true; continue; }
            }

            int? shade = null;
            if (p.HasShade)
            {
                if (!int.TryParse(line.Shade, NumberStyles.Integer, CultureInfo.InvariantCulture, out var sh)
                    || sh < p.ShadeMin || sh > p.ShadeMax) { itemError = true; continue; }
                shade = sh;
            }

            items.Add(new OrderItem
            {
                ProductId = p.Id, Quantity = qty, Unit = unit, Size = size, Shade = shade,
                UnitPrice = prices.Lookup(p.Id, size), // price snapshot from the list, never from the client
            });
        }
        if (missingSize) Errors.Add(Strings.ErrMissingSize);
        if (itemError) Errors.Add(Strings.ErrItem);

        if (Errors.Count > 0)
        {
            await LoadProductsAsync();
            return Page();
        }

        var order = new Order
        {
            FieldUserId = me,
            CompanyName = Truncate(company, 150),
            Location = Truncate(location, 200),
            Phone = phone is null ? null : Truncate(phone, 40),
            Note = note is null ? null : Truncate(note, 500),
            CreatedAtUtc = DateTime.UtcNow,   // server time only
            Items = items,
            IdempotencyKey = key,
            CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Truncate(Request.Headers.UserAgent.ToString(), 512),
        };
        (order.Latitude, order.Longitude) = ParseGps(Input.Latitude, Input.Longitude);

        db.Orders.Add(order);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Lost a race with an identical concurrent submit: the unique index kept only one.
            db.ChangeTracker.Clear();
            existingId = await FindExistingAsync(me, key);
            if (existingId is int raced) return RedirectToPage(new { done = raced });
            throw;
        }

        notifications.OrderCreated(order.Id); // push + Telegram to agents, in the background
        return RedirectToPage(new { done = order.Id });
    }

    private Task<int?> FindExistingAsync(int userId, string key) =>
        db.Orders.AsNoTracking()
            .Where(o => o.FieldUserId == userId && o.IdempotencyKey == key)
            .Select(o => (int?)o.Id)
            .FirstOrDefaultAsync();

    private async Task LoadProductsAsync()
    {
        var list = await db.Products.AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Name)
            .ToListAsync();
        var prices = await db.ProductPrices.AsNoTracking().ToListAsync();
        var byProduct = prices.GroupBy(p => p.ProductId).ToDictionary(g => g.Key, g => g.ToDictionary(p => p.Size, p => p.Price));

        Products = list.Select(p => new ProductDto(p.Id, p.Name, p.Brand, p.Description, p.DefaultUnit,
            p.SizeList, p.ShadePrefix, p.ShadeMin, p.ShadeMax,
            byProduct.TryGetValue(p.Id, out var pr) ? pr : new Dictionary<string, decimal>())).ToList();
    }

    private static (double?, double?) ParseGps(string? lat, string? lng)
    {
        if (double.TryParse(lat, NumberStyles.Float, CultureInfo.InvariantCulture, out var la)
            && double.TryParse(lng, NumberStyles.Float, CultureInfo.InvariantCulture, out var lo)
            && la is >= -90 and <= 90 && lo is >= -180 and <= 180)
            return (Math.Round(la, 6), Math.Round(lo, 6));
        return (null, null);
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];
}
