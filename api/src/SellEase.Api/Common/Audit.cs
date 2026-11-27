using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Common;

/// <summary>
/// Writes an audit entry for every added, changed or deleted <see cref="IAudited"/> record,
/// in the same database transaction as the change itself.
/// </summary>
public sealed class AuditInterceptor(ICurrentUser currentUser) : SaveChangesInterceptor
{
    /// <summary>Never copied into the audit log (secrets or sign-in housekeeping).</summary>
    private static readonly HashSet<string> Ignored =
    [
        nameof(AppUser.PasswordHash), nameof(AppUser.SecurityStamp), nameof(AppUser.ConcurrencyStamp),
        nameof(AppUser.NormalizedUserName), nameof(AppUser.NormalizedEmail),
        nameof(AppUser.AccessFailedCount), nameof(AppUser.LockoutEnd),
    ];

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is AppDbContext db) AddAuditEntries(db);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is AppDbContext db) AddAuditEntries(db);
        return base.SavingChanges(eventData, result);
    }

    private void AddAuditEntries(AppDbContext db)
    {
        var entries = db.ChangeTracker.Entries()
            .Where(e => e.Entity is IAudited && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        foreach (var entry in entries)
        {
            var changes = Describe(entry);
            if (changes.Count == 0) continue; // only housekeeping fields changed

            db.AuditEntries.Add(new AuditEntry
            {
                UserId = currentUser.Id,
                UserName = currentUser.UserName,
                Action = entry.State.ToString(),
                EntityType = entry.Metadata.ClrType.Name,
                EntityId = KeyOf(entry),
                Changes = JsonSerializer.Serialize(changes),
            });
        }
    }

    private static Dictionary<string, object?> Describe(EntityEntry entry)
    {
        var result = new Dictionary<string, object?>();
        foreach (var p in entry.Properties)
        {
            var name = p.Metadata.Name;
            if (Ignored.Contains(name)) continue;
            switch (entry.State)
            {
                case EntityState.Added:
                    result[name] = p.CurrentValue;
                    break;
                case EntityState.Deleted:
                    result[name] = p.OriginalValue;
                    break;
                case EntityState.Modified when p.IsModified && !Equals(p.OriginalValue, p.CurrentValue):
                    result[name] = new { from = p.OriginalValue, to = p.CurrentValue };
                    break;
            }
        }
        return result;
    }

    private static string KeyOf(EntityEntry entry) =>
        string.Join(",", entry.Metadata.FindPrimaryKey()!.Properties.Select(p => entry.Property(p.Name).CurrentValue));
}

/// <summary>Records actions that are not plain data changes, such as a password reset.</summary>
public sealed class AuditLog(AppDbContext db, ICurrentUser currentUser)
{
    public void Record(string action, string entityType, string entityId, object? details = null) =>
        db.AuditEntries.Add(new AuditEntry
        {
            UserId = currentUser.Id,
            UserName = currentUser.UserName,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Changes = details is null ? null : JsonSerializer.Serialize(details),
        });
}
