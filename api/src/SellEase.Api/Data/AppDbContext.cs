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
