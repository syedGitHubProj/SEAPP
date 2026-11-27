using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Domain;

namespace SellEase.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<BusinessSettings> Settings => Set<BusinessSettings>();
    public DbSet<NumberSequence> NumberSequences => Set<NumberSequence>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Factory> Factories => Set<Factory>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Design> Designs => Set<Design>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configuration)
    {
        // Money is always numeric(18,2), never floating point.
        configuration.Properties<decimal>().HavePrecision(18, 2);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<Branch>(e =>
        {
            e.Property(x => x.Code).HasMaxLength(20);
            e.Property(x => x.Name).HasMaxLength(200);
            e.HasIndex(x => x.Code).IsUnique();
        });

        b.Entity<AppUser>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(200);
            e.HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<BusinessSettings>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.BusinessName).HasMaxLength(200);
            e.Property(x => x.CurrencyCode).HasMaxLength(3);
            e.Property(x => x.CurrencySymbol).HasMaxLength(10);
            e.Property(x => x.TimeZone).HasMaxLength(50);
        });

        b.Entity<NumberSequence>(e =>
        {
            e.HasKey(x => x.Prefix);
            e.Property(x => x.Prefix).HasMaxLength(10);
        });

        b.Entity<Customer>(e =>
        {
            e.Property(x => x.Number).HasMaxLength(20);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Phone).HasMaxLength(30);
            e.Property(x => x.PhoneDigits).HasMaxLength(30);
            e.Property(x => x.Address).HasMaxLength(500);
            e.Property(x => x.Note).HasMaxLength(1000);
            e.HasIndex(x => x.Number).IsUnique();
            e.HasIndex(x => x.PhoneDigits);
            e.HasIndex(x => x.Name);
        });

        b.Entity<Factory>(e =>
        {
            e.Property(x => x.Number).HasMaxLength(20);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.ContactPerson).HasMaxLength(200);
            e.Property(x => x.Phone).HasMaxLength(30);
            e.Property(x => x.City).HasMaxLength(100);
            e.Property(x => x.Speciality).HasMaxLength(500);
            e.HasIndex(x => x.Number).IsUnique();
            e.HasIndex(x => x.Name).IsUnique();
        });

        b.Entity<Category>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.HasIndex(x => x.Name).IsUnique();
        });

        b.Entity<Design>(e =>
        {
            e.Property(x => x.Code).HasMaxLength(20);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Dimensions).HasMaxLength(200);
            e.Property(x => x.Wood).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.HasIndex(x => x.Code).IsUnique();
            e.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Materials).WithOne().HasForeignKey(x => x.DesignId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Colors).WithOne().HasForeignKey(x => x.DesignId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Accessories).WithOne().HasForeignKey(x => x.DesignId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Photos).WithOne().HasForeignKey(x => x.DesignId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<DesignMaterial>(e => { e.ToTable("DesignMaterials"); e.Property(x => x.Name).HasMaxLength(100); });
        b.Entity<DesignColor>(e =>
        {
            e.ToTable("DesignColors");
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Hex).HasMaxLength(7);
        });
        b.Entity<DesignAccessory>(e => { e.ToTable("DesignAccessories"); e.Property(x => x.Name).HasMaxLength(100); });

        b.Entity<DesignPhoto>(e =>
        {
            e.ToTable("DesignPhotos");
            e.Property(x => x.StorageKey).HasMaxLength(300);
            e.Property(x => x.ContentType).HasMaxLength(50);
        });

        b.Entity<AuditEntry>(e =>
        {
            e.Property(x => x.UserName).HasMaxLength(256);
            e.Property(x => x.Action).HasMaxLength(50);
            e.Property(x => x.EntityType).HasMaxLength(100);
            e.Property(x => x.EntityId).HasMaxLength(100);
            e.Property(x => x.Changes).HasColumnType("jsonb");
            e.HasIndex(x => x.At);
            e.HasIndex(x => new { x.EntityType, x.EntityId });
        });
    }
}
