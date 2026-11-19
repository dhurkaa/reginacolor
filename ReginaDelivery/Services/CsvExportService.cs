using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using ReginaDelivery.Data;
using ReginaDelivery.Models;

namespace ReginaDelivery.Services;

/// <summary>CSV of filtered orders, one row per item. UTF-8 with BOM so Excel shows ë/ç correctly.</summary>
public class CsvExportService(AppDbContext db, TimeService time, IConfiguration config)
{
    public async Task<byte[]> BuildAsync(OrderFilter filter, CancellationToken ct = default)
    {
        var sep = config["CSV_SEPARATOR"] is { Length: 1 } s ? s[0] : ',';

        var orders = await filter.Apply(db.Orders.AsNoTracking(), time)
            .Include(o => o.FieldUser)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .OrderByDescending(o => o.CreatedAtUtc).ThenByDescending(o => o.Id)
            .AsSplitQuery()
            .ToListAsync(ct);

        var sb = new StringBuilder();
        void Row(params string?[] cells) =>
            sb.Append(string.Join(sep, cells.Select(c => Escape(c, sep)))).Append("\r\n");

        Row("Porosia", "Data & Ora", "Terrenisti", "Kompania", "Vendi", "Telefoni", "Brendi", "Produkti", "Masa",
            "Nuanca", "Sasia", "Njësia", "Çmimi (EUR)", "Vlera (EUR)", "Shënim", "Statusi", "Arsyeja e anulimit", "GPS");

        foreach (var o in orders)
        {
            foreach (var i in o.Items.Where(filter.ItemMatches).OrderBy(i => i.Id))
            {
                Row(o.Id.ToString(CultureInfo.InvariantCulture),
                    time.Format(o.CreatedAtUtc),
                    o.FieldUser.FullName,
                    o.CompanyName,
                    o.Location,
                    o.Phone,
                    i.Product.Brand,
                    i.Product.Name,
                    i.Size,
                    i.Shade.HasValue ? $"{i.Product.ShadePrefix} {i.Shade}".Trim() : "",
                    OrderItem.FormatQty(i.Quantity),
                    i.Unit,
                    i.UnitPrice.HasValue ? Money.Plain(i.UnitPrice.Value) : "",
                    Money.Plain(i.LineTotal),
                    o.Note,
                    o.IsVoided ? "Anuluar" : "OK",
                    o.VoidReason,
                    o.MapUrl);
            }
        }

        return [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(sb.ToString())];
    }

    private static string Escape(string? value, char sep)
    {
        if (string.IsNullOrEmpty(value)) return "";
        // Neutralise spreadsheet formula injection from free-text fields.
        if (value[0] is '=' or '+' or '-' or '@' && !decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out _))
            value = "'" + value;
        var needsQuotes = value.Contains(sep) || value.Contains('"') || value.Contains('\n') || value.Contains('\r');
        return needsQuotes ? "\"" + value.Replace("\"", "\"\"") + "\"" : value;
    }
}
