using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Setup;

/// <summary>
/// Applies database migrations and makes sure the fixed reference data exists
/// (roles, the main branch, settings, number sequences). Safe to run more than once.
/// On a server this runs only from the manual "migrate" GitHub Actions workflow.
/// </summary>
public static class DatabaseSetup
{
    public static async Task RunAsync(IServiceProvider services, CancellationToken ct = default)
    {
        var db = services.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync(ct);

        var roles = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in Roles.All)
            if (!await roles.RoleExistsAsync(role))
                await roles.CreateAsync(new IdentityRole<Guid>(role));

        if (!await db.Branches.AnyAsync(ct))
            db.Branches.Add(new Branch { Code = "MAIN", Name = "Main showroom" });

        if (!await db.Settings.AnyAsync(ct))
            db.Settings.Add(new BusinessSettings { BusinessName = "ABC Furniture" });

        var existing = await db.NumberSequences.Select(s => s.Prefix).ToListAsync(ct);
        foreach (var prefix in NumberSequences.All.Except(existing))
            db.NumberSequences.Add(new NumberSequence { Prefix = prefix });

        await db.SaveChangesAsync(ct);
    }
}
