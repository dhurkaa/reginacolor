namespace ReginaDelivery.Models;

/// <summary>An order taken by a field rep at a customer. Agents are notified and process it.</summary>
public class Order
{
    public int Id { get; set; }
    public int FieldUserId { get; set; }
    public User FieldUser { get; set; } = null!;

    public string CompanyName { get; set; } = "";   // customer / company, required
    public string Location { get; set; } = "";      // city / address, required
    public string? Phone { get; set; }
    public string? Note { get; set; }
    public double? Latitude { get; set; }           // optional, from browser geolocation
    public double? Longitude { get; set; }

    public DateTime CreatedAtUtc { get; set; }      // SET BY SERVER, never by client
    public List<OrderItem> Items { get; set; } = new();

    public bool IsVoided { get; set; }              // agent can void a wrong entry (no hard delete)
    public string? VoidReason { get; set; }

    // Audit
    public string? CreatedByIp { get; set; }
    public string? UserAgent { get; set; }

    /// <summary>Token from the form's hidden field; unique per user to stop double submits.</summary>
    public string IdempotencyKey { get; set; } = "";

    public decimal Total => Items.Sum(i => i.LineTotal);
    public bool HasMissingPrice => Items.Any(i => i.UnitPrice is null);

    public bool HasGps => Latitude.HasValue && Longitude.HasValue;

    public string MapUrl => HasGps
        ? FormattableString.Invariant($"https://www.google.com/maps?q={Latitude:0.######},{Longitude:0.######}")
        : "";
}
