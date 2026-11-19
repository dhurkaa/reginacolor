using System.Globalization;

namespace ReginaDelivery.Models;

public static class Money
{
    private static readonly NumberFormatInfo Nfi = new()
    {
        NumberDecimalSeparator = ",",
        NumberGroupSeparator = ".",
        NumberGroupSizes = [3],
    };

    /// <summary>1234.5 → "1.234,50 €"</summary>
    public static string Format(decimal amount) => amount.ToString("#,##0.00", Nfi) + " €";

    /// <summary>Plain value for inputs / CSV: "1234.50"</summary>
    public static string Plain(decimal amount) => amount.ToString("0.00", CultureInfo.InvariantCulture);

    /// <summary>Accepts "12,50", "12.50", "1.234,50", "1,234.50".</summary>
    public static bool TryParse(string? text, out decimal value)
    {
        value = 0;
        var s = (text ?? "").Trim().Replace("€", "").Replace(" ", "");
        if (s.Length == 0) return false;
        var lastComma = s.LastIndexOf(',');
        var lastDot = s.LastIndexOf('.');
        if (lastComma > lastDot) s = s.Replace(".", "").Replace(',', '.');   // European style
        else s = s.Replace(",", "");                                          // English style
        return decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out value) && value >= 0;
    }
}
