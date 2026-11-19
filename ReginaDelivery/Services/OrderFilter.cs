using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Models;

namespace ReginaDelivery.Services;

/// <summary>Agent order-list filters. Bound from the query string (list, refresh partial and CSV export).</summary>
public class OrderFilter
{
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public int? Field { get; set; }
    public string? Brand { get; set; }
    public int? Product { get; set; }
    public string? Q { get; set; }

    /// <summary>Resolves the date range: defaults to the last 7 days (local), swaps if reversed.</summary>
    public (DateOnly from, DateOnly to) Range(TimeService time)
    {
        var to = To ?? time.TodayLocal;
        var from = From ?? to.AddDays(-6);
        return from <= to ? (from, to) : (to, from);
    }

    public IQueryable<Order> Apply(IQueryable<Order> q, TimeService time)
    {
        var (from, to) = Range(time);
        var startUtc = time.StartOfDayUtc(from);
        var endUtc = time.StartOfDayUtc(to.AddDays(1));
        q = q.Where(o => o.CreatedAtUtc >= startUtc && o.CreatedAtUtc < endUtc);

        if (Field is int fieldId) q = q.Where(o => o.FieldUserId == fieldId);
        if (!string.IsNullOrWhiteSpace(Brand))
        {
            var brand = Brand.Trim();
            q = q.Where(o => o.Items.Any(i => i.Product.Brand == brand));
        }
        if (Product is int productId) q = q.Where(o => o.Items.Any(i => i.ProductId == productId));
        if (!string.IsNullOrWhiteSpace(Q))
        {
            var pattern = "%" + EscapeLike(Q.Trim()) + "%";
            q = q.Where(o => EF.Functions.Like(o.CompanyName, pattern, "\\")
                          || EF.Functions.Like(o.Location, pattern, "\\"));
        }
        return q;
    }

    /// <summary>Item-level filter (brand/product) used for totals and CSV rows.</summary>
    public bool ItemMatches(OrderItem i) =>
        (string.IsNullOrWhiteSpace(Brand) || i.Product.Brand == Brand.Trim())
        && (Product is not int pid || i.ProductId == pid);

    public string ToQueryString(int? page = null)
    {
        var values = new List<KeyValuePair<string, string>>();
        void Add(string k, string? v) { if (!string.IsNullOrWhiteSpace(v)) values.Add(new(k, v)); }
        Add("from", From?.ToString("yyyy-MM-dd"));
        Add("to", To?.ToString("yyyy-MM-dd"));
        Add("field", Field?.ToString());
        Add("brand", Brand);
        Add("product", Product?.ToString());
        Add("q", Q);
        if (page is > 1) Add("p", page.Value.ToString());
        return values.Count == 0
            ? ""
            : "?" + string.Join("&", values.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));
    }

    private static string EscapeLike(string s) =>
        s.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
