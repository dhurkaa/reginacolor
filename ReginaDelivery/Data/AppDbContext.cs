using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ReginaDelivery.Models;

namespace ReginaDelivery.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductPrice> ProductPrices => Set<ProductPrice>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<PushDevice> PushDevices => Set<PushDevice>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // SQLite has no DateTime kind; everything we store is UTC, so mark it as such on read.
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.Property(u => u.Username).HasMaxLength(32);
            e.Property(u => u.FullName).HasMaxLength(100);
            e.Property(u => u.Role).HasConversion<string>().HasMaxLength(16);
            e.Property(u => u.SecurityStamp).HasMaxLength(64);
        });

        b.Entity<Product>(e =>
        {
            e.HasIndex(p => p.Code).IsUnique();
            e.Property(p => p.Code).HasMaxLength(64);
            e.Property(p => p.Name).HasMaxLength(100);
            e.Property(p => p.Brand).HasMaxLength(60);
            e.Property(p => p.Description).HasMaxLength(200);
            e.Property(p => p.DefaultUnit).HasMaxLength(16);
            e.Property(p => p.Sizes).HasMaxLength(200);
            e.Property(p => p.ShadePrefix).HasMaxLength(10);
        });

        b.Entity<ProductPrice>(e =>
        {
            e.HasIndex(p => new { p.ProductId, p.Size }).IsUnique();
            e.Property(p => p.Size).HasMaxLength(20);
            e.HasOne<Product>().WithMany().HasForeignKey(p => p.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Order>(e =>
        {
            e.HasIndex(o => o.CreatedAtUtc);
            e.HasIndex(o => new { o.FieldUserId, o.IdempotencyKey }).IsUnique();
            e.Property(o => o.CompanyName).HasMaxLength(150);
            e.Property(o => o.Location).HasMaxLength(200);
            e.Property(o => o.Phone).HasMaxLength(40);
            e.Property(o => o.Note).HasMaxLength(500);
            e.Property(o => o.VoidReason).HasMaxLength(300);
            e.Property(o => o.CreatedByIp).HasMaxLength(64);
            e.Property(o => o.UserAgent).HasMaxLength(512);
            e.Property(o => o.IdempotencyKey).HasMaxLength(64);
            e.HasOne(o => o.FieldUser).WithMany().HasForeignKey(o => o.FieldUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(o => o.Items).WithOne().HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderItem>(e =>
        {
            e.Property(i => i.Unit).HasMaxLength(16);
            e.Property(i => i.Size).HasMaxLength(20);
            e.HasOne(i => i.Product).WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<PushDevice>(e =>
        {
            e.HasIndex(d => d.Endpoint).IsUnique();
            e.Property(d => d.Endpoint).HasMaxLength(1000);
            e.Property(d => d.P256dh).HasMaxLength(200);
            e.Property(d => d.Auth).HasMaxLength(100);
            e.Property(d => d.UserAgent).HasMaxLength(512);
            e.HasOne(d => d.User).WithMany().HasForeignKey(d => d.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    internal sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
