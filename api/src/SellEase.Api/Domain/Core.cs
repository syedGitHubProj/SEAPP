using Microsoft.AspNetCore.Identity;

namespace SellEase.Api.Domain;

/// <summary>Marks an entity whose additions, changes and deletions go to the audit log.</summary>
public interface IAudited;

/// <summary>A showroom. There is one for now; branch-specific tables carry a BranchId.</summary>
public class Branch : IAudited
{
    public Guid Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>A staff member who signs in. The user name may be a phone number.</summary>
public class AppUser : IdentityUser<Guid>, IAudited
{
    public required string FullName { get; set; }
    public Guid BranchId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>Business-wide settings. There is exactly one row (Id = 1).</summary>
public class BusinessSettings : IAudited
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;
    public required string BusinessName { get; set; }
    public string CurrencyCode { get; set; } = "PKR";
    public string CurrencySymbol { get; set; } = "Rs.";
    public string TimeZone { get; set; } = "Asia/Karachi";
}

/// <summary>The next readable number for a record type, for example SO → SO-000145.</summary>
public class NumberSequence
{
    public required string Prefix { get; set; }
    public long NextValue { get; set; } = 1;
}

/// <summary>Who changed what, and when. Rows are only ever added.</summary>
public class AuditEntry
{
    public Guid Id { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    /// <summary>Added, Modified, Deleted, or a named action such as PasswordReset.</summary>
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public required string EntityId { get; set; }
    /// <summary>JSON describing the change.</summary>
    public string? Changes { get; set; }
}
