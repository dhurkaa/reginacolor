namespace ReginaDelivery.Models;

/// <summary>Agent = full privileges (receives notifications, sees everything). Field = sales rep in the field, creates orders only.</summary>
public enum Role { Agent, Field }

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";      // unique, lowercase
    public string FullName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public Role Role { get; set; }
    public bool IsActive { get; set; } = true;      // an agent can disable a user
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>Changes on password reset / disable, so existing sessions are rejected.</summary>
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
}
