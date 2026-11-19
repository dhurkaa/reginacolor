namespace ReginaDelivery.Models;

/// <summary>Price list entry: one price per product and packaging size ("" when the product has no sizes).</summary>
public class ProductPrice
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string Size { get; set; } = "";
    public decimal Price { get; set; }              // EUR per unit (bucket / bag / piece)
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
