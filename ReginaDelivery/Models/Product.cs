using System.ComponentModel.DataAnnotations.Schema;

namespace ReginaDelivery.Models;

public class Product
{
    public int Id { get; set; }
    public string Code { get; set; } = "";          // unique slug, e.g. "rc-urbano"
    public string Name { get; set; } = "";          // "Urbano"
    public string Brand { get; set; } = "";         // "Regina Colori" | "Regina Polvere" | "Bau Farbe" | "Bau Putz"
    public string Description { get; set; } = "";   // "Pittura Per Interni"
    public string DefaultUnit { get; set; } = "copë"; // copë / thes / kovë / kg / L / paletë
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    /// <summary>Packaging sizes, comma separated (e.g. "0.75L,3L,9L,14L"). Empty = no size choice.</summary>
    public string Sizes { get; set; } = "";

    /// <summary>Factory-tinted ranges (e.g. Recasa RG 101–172): the driver enters the shade number.</summary>
    public string? ShadePrefix { get; set; }
    public int? ShadeMin { get; set; }
    public int? ShadeMax { get; set; }

    [NotMapped]
    public string[] SizeList =>
        Sizes.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    [NotMapped]
    public bool HasShade => ShadeMin.HasValue && ShadeMax.HasValue;
}
