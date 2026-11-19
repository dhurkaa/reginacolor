using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;
using ReginaDelivery.Services;

namespace ReginaDelivery.Pages.Agent;

public record ProductTotal(string Brand, string Product, string? Size, string Unit, decimal Quantity, decimal Value, int Orders);
public record Option(string Value, string Label);

public class IndexModel(AppDbContext db, TimeService time) : PageModel
{
    public const int PageSize = 50;

    [BindProperty(SupportsGet = true)] public DateOnly? From { get; set; }
    [BindProperty(SupportsGet = true)] public DateOnly? To { get; set; }
    [BindProperty(SupportsGet = true)] public int? Field { get; set; }
    [BindProperty(SupportsGet = true)] public string? Brand { get; set; }
    [BindProperty(SupportsGet = true)] public int? Product { get; set; }
    [BindProperty(SupportsGet = true)] public string? Q { get; set; }
    [BindProperty(SupportsGet = true, Name = "p")] public int PageNo { get; set; } = 1;

    public OrderFilter Filter => new() { From = From, To = To, Field = Field, Brand = Brand, Product = Product, Q = Q };
    public DateOnly RangeFrom { get; private set; }
    public DateOnly RangeTo { get; private set; }

    // KPIs (voided excluded)
    public int OrdersToday { get; private set; }
    public int OrdersWeek { get; private set; }
    public decimal SalesWeek { get; private set; }
    public decimal SalesMonth { get; private set; }
    public int LatestOrderId { get; private set; }

    public List<Order> Rows { get; private set; } = new();
    public int TotalCount { get; private set; }
    public int PageCount => Math.Max(1, (TotalCount + PageSize - 1) / PageSize);
    public List<ProductTotal> Totals { get; private set; } = new();
    public decimal TotalsValue => Totals.Sum(t => t.Value);

    public List<Option> FieldOptions { get; private set; } = new();
    public List<string> BrandOptions { get; private set; } = new();
    public List<Option> ProductOptions { get; private set; } = new();
    public string UpdatedAt { get; private set; } = "";

    public async Task OnGetAsync()
    {
        await LoadKpisAsync();
        await LoadOptionsAsync();
        await LoadTableAsync();
    }

    /// <summary>Partial for the auto-refresh (KPIs + table + totals).</summary>
    public async Task<IActionResult> OnGetTableAsync()
    {
        await LoadKpisAsync();
        await LoadTableAsync();
        return Partial("_OrdersTable", this);
    }

    private async Task LoadKpisAsync()
    {
        var today = time.TodayLocal;
        var todayStart = time.StartOfDayUtc(today);
        var weekStart = time.StartOfDayUtc(TimeService.StartOfWeek(today));
        var monthStart = time.StartOfDayUtc(new DateOnly(today.Year, today.Month, 1));
        var since = new[] { todayStart, weekStart, monthStart }.Min();

        var recent = await db.Orders.AsNoTracking()
            .Where(o => !o.IsVoided && o.CreatedAtUtc >= since)
            .Select(o => new { o.CreatedAtUtc, Lines = o.Items.Select(i => new { i.Quantity, i.UnitPrice }).ToList() })
            .ToListAsync();

        decimal Value(IEnumerable<decimal> v) => v.Sum();
        var withValue = recent.Select(o => new
        {
            o.CreatedAtUtc,
            Value = Value(o.Lines.Select(l => Math.Round((l.UnitPrice ?? 0) * l.Quantity, 2))),
        }).ToList();

        OrdersToday = withValue.Count(o => o.CreatedAtUtc >= todayStart);
        OrdersWeek = withValue.Count(o => o.CreatedAtUtc >= weekStart);
        SalesWeek = withValue.Where(o => o.CreatedAtUtc >= weekStart).Sum(o => o.Value);
        SalesMonth = withValue.Where(o => o.CreatedAtUtc >= monthStart).Sum(o => o.Value);
        LatestOrderId = await db.Orders.MaxAsync(o => (int?)o.Id) ?? 0;
        UpdatedAt = time.LocalNow.ToString("HH:mm:ss", CultureInfo.InvariantCulture);
    }

    private async Task LoadOptionsAsync()
    {
        FieldOptions = (await db.Users.AsNoTracking()
                .Where(u => u.Role == Role.Field)
                .OrderBy(u => u.FullName)
                .Select(u => new { u.Id, u.FullName, u.IsActive })
                .ToListAsync())
            .Select(u => new Option(u.Id.ToString(), u.IsActive ? u.FullName : $"{u.FullName} ({Resources.Strings.Inactive})"))
            .ToList();

        var products = await db.Products.AsNoTracking()
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Name)
            .Select(p => new { p.Id, p.Name, p.Brand })
            .ToListAsync();
        BrandOptions = products.Select(p => p.Brand).Distinct().ToList();
        ProductOptions = products.Select(p => new Option(p.Id.ToString(), $"{p.Name} — {p.Brand}")).ToList();
    }

    private async Task LoadTableAsync()
    {
        var filter = Filter;
        (RangeFrom, RangeTo) = filter.Range(time);
        var q = filter.Apply(db.Orders.AsNoTracking(), time);

        TotalCount = await q.CountAsync();
        PageNo = Math.Clamp(PageNo, 1, PageCount);

        Rows = await q
            .OrderByDescending(o => o.CreatedAtUtc).ThenByDescending(o => o.Id)
            .Skip((PageNo - 1) * PageSize).Take(PageSize)
            .Include(o => o.FieldUser)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .AsSplitQuery()
            .ToListAsync();

        // Totals for the whole filter (all pages), voided excluded, item-level brand/product filter applied.
        var items = await q.Where(o => !o.IsVoided)
            .SelectMany(o => o.Items)
            .Include(i => i.Product)
            .ToListAsync();

        Totals = Aggregate(items.Where(filter.ItemMatches));
    }

    public static List<ProductTotal> Aggregate(IEnumerable<OrderItem> items) => items
        .GroupBy(i => new { i.Product.Brand, i.Product.Name, i.Product.SortOrder, i.Size, i.Unit })
        .Select(g => new
        {
            g.Key,
            Total = new ProductTotal(g.Key.Brand, g.Key.Name, g.Key.Size, g.Key.Unit,
                g.Sum(i => i.Quantity), g.Sum(i => i.LineTotal), g.Select(i => i.OrderId).Distinct().Count()),
        })
        .OrderBy(x => x.Key.SortOrder).ThenBy(x => x.Key.Name).ThenBy(x => SizeSortKey(x.Key.Size)).ThenBy(x => x.Key.Unit)
        .Select(x => x.Total)
        .ToList();

    /// <summary>Sort "0.75L, 3L, 14L" numerically rather than alphabetically.</summary>
    public static decimal SizeSortKey(string? size)
    {
        if (string.IsNullOrEmpty(size)) return 0;
        var digits = new string(size.TakeWhile(c => char.IsDigit(c) || c == '.').ToArray());
        return decimal.TryParse(digits, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) ? n : 0;
    }

    public string QueryFor(int page) => Filter.ToQueryString(page);
}
