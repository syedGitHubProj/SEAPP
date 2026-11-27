using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Setup;

/// <summary>Sample staff accounts for a developer's own computer. Never used on a server.</summary>
public static class DevSeed
{
    private static readonly (string UserName, string FullName, string Role)[] Staff =
    [
        ("admin", "Owner (Admin)", Roles.Admin),
        ("manager", "Imran (Manager)", Roles.Manager),
        ("03001234567", "Bilal (Salesman)", Roles.Salesman),
    ];

    public static async Task RunAsync(IServiceProvider services, IConfiguration config)
    {
        var password = config["DevSeed:Password"]
            ?? throw new InvalidOperationException("DevSeed:Password is missing from appsettings.Development.json.");
        var db = services.GetRequiredService<AppDbContext>();
        var users = services.GetRequiredService<UserManager<AppUser>>();
        var branch = await db.Branches.OrderBy(b => b.Code).FirstAsync();

        foreach (var (userName, fullName, role) in Staff)
        {
            if (await users.FindByNameAsync(userName) is not null) continue;
            var user = new AppUser { UserName = userName, FullName = fullName, BranchId = branch.Id };
            var result = await users.CreateAsync(user, password);
            if (!result.Succeeded) throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
            await users.AddToRoleAsync(user, role);
        }

        await DevSeedRecords.RunAsync(db, services.GetRequiredService<SellEase.Api.Common.NumberSequences>());
    }
}
