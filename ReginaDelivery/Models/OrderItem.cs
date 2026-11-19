using System.Globalization;

namespace ReginaDelivery.Models;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Quantity { get; set; }           // > 0
    public string Unit { get; set; } = "copë";

    /// <summary>Chosen packaging size, e.g. "14L" or "25kg".</summary>
    public string? Size { get; set; }

    /// <summary>Shade number for factory-tinted products (e.g. RG 135).</summary>
    public int? Shade { get; set; }

    /// <summary>Price per unit in EUR, copied from the price list when the order is created
    /// (so later price changes don't rewrite history). Agents may adjust it. Null = no price set.</summary>
    public decimal? UnitPrice { get; set; }

    public decimal LineTotal => Math.Round((UnitPrice ?? 0) * Quantity, 2);

    public static string FormatQty(decimal q) => q.ToString("0.###", CultureInfo.InvariantCulture);

    /// <summary>"Urbano 14L" / "Recasa RG 135" — product + variant, without quantity.</summary>
    public string ProductLabel
    {
        get
        {
            var s = Product?.Name ?? "";
            if (!string.IsNullOrEmpty(Size)) s += " " + Size;
            if (Shade.HasValue) s += " " + (Product?.ShadePrefix ?? "") + " " + Shade.Value;
            return s.Replace("  ", " ").Trim();
        }
    }

    /// <summary>"Urbano 14L ×10 kovë"</summary>
    public string Describe() => $"{ProductLabel} ×{FormatQty(Quantity)} {Unit}";
}
