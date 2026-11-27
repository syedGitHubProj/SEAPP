using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Admin;

public static partial class AdminEndpoints
{
    public sealed record UserDto(Guid Id, string UserName, string FullName, string Role, bool IsActive);
    public sealed record CreateUserRequest(string UserName, string FullName, string Role, string Password);
    public sealed record SetActiveRequest(bool IsActive);
    public sealed record SetRoleRequest(string Role);
    public sealed record ResetPasswordRequest(string Password);
    public sealed record SettingsDto(string BusinessName, string CurrencyCode, string CurrencySymbol, string TimeZone);
    /// <summary>One audit row. <c>Label</c> is a readable name for the record (e.g. "CU-000012 Ahmed Raza"), when known.</summary>
    public sealed record AuditDto(Guid Id, DateTimeOffset At, string? UserName, string Action, string EntityType, string EntityId, string? Label, string? Changes);

    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        MapUsers(app.MapGroup("/api/admin/users").RequireAuthorization(Permissions.UsersManage));
        MapSettings(app);

        app.MapGet("/api/admin/audit", ListAuditAsync).RequireAuthorization(Permissions.AuditView);
    }

    /// <summary>
    /// Newest first. <paramref name="before"/> pages backwards ("show older"); <paramref name="entityType"/>
    /// limits the list to one kind of record (a design's options and photos count as the design).
    /// </summary>
    private static async Task<List<AuditDto>> ListAuditAsync(
        AppDbContext db, int? take, DateTimeOffset? before, string? entityType, string? userName)
    {
        var query = db.AuditEntries.AsNoTracking();
        if (before is not null) query = query.Where(a => a.At < before);
        if (!string.IsNullOrWhiteSpace(entityType))
        {
            string[] types = entityType == nameof(Design)
                ? [nameof(Design), nameof(DesignMaterial), nameof(DesignColor), nameof(DesignAccessory), nameof(DesignPhoto)]
                : [entityType];
            query = query.Where(a => types.Contains(a.EntityType));
        }
        if (!string.IsNullOrWhiteSpace(userName)) query = query.Where(a => a.UserName == userName.Trim());

        var rows = await query.OrderByDescending(a => a.At).ThenByDescending(a => a.Id)
            .Take(Math.Clamp(take ?? 100, 1, 500)).ToListAsync();
        var labels = await AuditLabelsAsync(db, rows);
        return rows.Select(a => new AuditDto(a.Id, a.At, a.UserName, a.Action, a.EntityType, a.EntityId,
            labels.GetValueOrDefault((a.EntityType, a.EntityId)), a.Changes)).ToList();
    }

    /// <summary>Readable names for the records in a page of audit rows, looked up in a few small queries.</summary>
    private static async Task<Dictionary<(string, string), string>> AuditLabelsAsync(AppDbContext db, List<AuditEntry> rows)
    {
        Guid[] IdsOf(params string[] types) => rows.Where(r => types.Contains(r.EntityType))
            .Select(r => Guid.TryParse(r.EntityId, out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty).Distinct().ToArray();

        var labels = new Dictionary<(string, string), string>();
        void Add(string type, Guid id, string label) => labels[(type, id.ToString())] = label;

        var ids = IdsOf(nameof(Customer));
        foreach (var c in await db.Customers.Where(c => ids.Contains(c.Id)).Select(c => new { c.Id, c.Number, c.Name }).ToListAsync())
            Add(nameof(Customer), c.Id, $"{c.Number} {c.Name}");

        ids = IdsOf(nameof(Factory));
        foreach (var f in await db.Factories.Where(f => ids.Contains(f.Id)).Select(f => new { f.Id, f.Number, f.Name }).ToListAsync())
            Add(nameof(Factory), f.Id, $"{f.Number} {f.Name}");

        ids = IdsOf(nameof(Category));
        foreach (var c in await db.Categories.Where(c => ids.Contains(c.Id)).Select(c => new { c.Id, c.Name }).ToListAsync())
            Add(nameof(Category), c.Id, c.Name);

        ids = IdsOf(nameof(AppUser));
        foreach (var u in await db.Users.Where(u => ids.Contains(u.Id)).Select(u => new { u.Id, u.FullName, u.UserName }).ToListAsync())
            Add(nameof(AppUser), u.Id, $"{u.FullName} ({u.UserName})");

        // A design's options and photos are named after the design they belong to.
        var optionIds = IdsOf(nameof(DesignMaterial), nameof(DesignColor), nameof(DesignAccessory));
        var options = (await db.Set<DesignMaterial>().Where(o => optionIds.Contains(o.Id)).Select(o => new { o.Id, o.DesignId, o.Name }).ToListAsync())
            .Concat(await db.Set<DesignColor>().Where(o => optionIds.Contains(o.Id)).Select(o => new { o.Id, o.DesignId, o.Name }).ToListAsync())
            .Concat(await db.Set<DesignAccessory>().Where(o => optionIds.Contains(o.Id)).Select(o => new { o.Id, o.DesignId, o.Name }).ToListAsync())
            .ToList();
        var photoIds = IdsOf(nameof(DesignPhoto));
        var photos = await db.Set<DesignPhoto>().Where(p => photoIds.Contains(p.Id)).Select(p => new { p.Id, p.DesignId }).ToListAsync();

        var designIds = IdsOf(nameof(Design)).Concat(options.Select(o => o.DesignId)).Concat(photos.Select(p => p.DesignId)).Distinct().ToArray();
        var designs = await db.Designs.Where(d => designIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => $"{d.Code} {d.Name}");
        foreach (var (id, label) in designs) Add(nameof(Design), id, label);
        foreach (var r in rows.Where(r => r.EntityType is nameof(DesignMaterial) or nameof(DesignColor) or nameof(DesignAccessory)))
        {
            var option = options.FirstOrDefault(o => o.Id.ToString() == r.EntityId);
            if (option is not null) labels[(r.EntityType, r.EntityId)] = $"{designs.GetValueOrDefault(option.DesignId, "?")} · {option.Name}";
        }
        foreach (var p in photos)
            Add(nameof(DesignPhoto), p.Id, designs.GetValueOrDefault(p.DesignId, "?"));

        return labels;
    }

    private static void MapUsers(RouteGroupBuilder users)
    {
        users.MapGet("/", async (AppDbContext db) =>
        {
            var roleOf = await (from ur in db.UserRoles
                                join r in db.Roles on ur.RoleId equals r.Id
                                select new { ur.UserId, r.Name }).ToDictionaryAsync(x => x.UserId, x => x.Name!);
            var list = await db.Users.OrderBy(u => u.FullName).ToListAsync();
            return list.Select(u => new UserDto(u.Id, u.UserName!, u.FullName, roleOf.GetValueOrDefault(u.Id, ""), u.IsActive));
        });

        users.MapPost("/", async (CreateUserRequest req, AppDbContext db, UserManager<AppUser> userManager, AuditLog audit) =>
        {
            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(req.FullName)) errors["fullName"] = ["required"];
            if (!Roles.All.Contains(req.Role)) errors["role"] = ["unknownRole"];
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var branch = await db.Branches.OrderBy(b => b.Code).FirstAsync();
            var user = new AppUser
            {
                UserName = UserNames.Normalize(req.UserName ?? ""),
                FullName = req.FullName.Trim(),
                BranchId = branch.Id,
            };
            var created = await userManager.CreateAsync(user, req.Password ?? "");
            if (!created.Succeeded) return IdentityProblem(created);

            await userManager.AddToRoleAsync(user, req.Role);
            audit.Record("RoleAssigned", nameof(AppUser), user.Id.ToString(), new { role = req.Role });
            await db.SaveChangesAsync();

            return Results.Created($"/api/admin/users/{user.Id}",
                new UserDto(user.Id, user.UserName, user.FullName, req.Role, user.IsActive));
        });

        users.MapPut("/{id:guid}/active", async (Guid id, SetActiveRequest req, ICurrentUser me, UserManager<AppUser> userManager) =>
        {
            if (id == me.Id) return Results.ValidationProblem(new Dictionary<string, string[]> { ["isActive"] = ["cannotChangeSelf"] });
            var user = await userManager.FindByIdAsync(id.ToString());
            if (user is null) return Results.NotFound();

            user.IsActive = req.IsActive;
            await userManager.UpdateAsync(user);
            // Signs the person out everywhere if they were deactivated.
            await userManager.UpdateSecurityStampAsync(user);
            return Results.NoContent();
        });

        users.MapPut("/{id:guid}/role", async (Guid id, SetRoleRequest req, ICurrentUser me, AppDbContext db,
            UserManager<AppUser> userManager, AuditLog audit) =>
        {
            if (!Roles.All.Contains(req.Role)) return Results.ValidationProblem(new Dictionary<string, string[]> { ["role"] = ["unknownRole"] });
            if (id == me.Id) return Results.ValidationProblem(new Dictionary<string, string[]> { ["role"] = ["cannotChangeSelf"] });
            var user = await userManager.FindByIdAsync(id.ToString());
            if (user is null) return Results.NotFound();

            var current = await userManager.GetRolesAsync(user);
            await userManager.RemoveFromRolesAsync(user, current);
            await userManager.AddToRoleAsync(user, req.Role);
            await userManager.UpdateSecurityStampAsync(user);
            audit.Record("RoleChanged", nameof(AppUser), user.Id.ToString(), new { from = current.FirstOrDefault(), to = req.Role });
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        users.MapPost("/{id:guid}/password", async (Guid id, ResetPasswordRequest req, AppDbContext db,
            UserManager<AppUser> userManager, AuditLog audit) =>
        {
            var user = await userManager.FindByIdAsync(id.ToString());
            if (user is null) return Results.NotFound();

            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var reset = await userManager.ResetPasswordAsync(user, token, req.Password ?? "");
            if (!reset.Succeeded) return IdentityProblem(reset);

            await userManager.SetLockoutEndDateAsync(user, null);
            audit.Record("PasswordReset", nameof(AppUser), user.Id.ToString());
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static void MapSettings(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/settings", async (AppDbContext db) =>
        {
            var s = await db.Settings.SingleAsync();
            return new SettingsDto(s.BusinessName, s.CurrencyCode, s.CurrencySymbol, s.TimeZone);
        }).RequireAuthorization();

        app.MapPut("/api/settings", async (SettingsDto req, AppDbContext db) =>
        {
            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(req.BusinessName)) errors["businessName"] = ["required"];
            if (!CurrencyCode().IsMatch(req.CurrencyCode ?? "")) errors["currencyCode"] = ["invalid"];
            if (string.IsNullOrWhiteSpace(req.CurrencySymbol) || req.CurrencySymbol.Trim().Length > 10) errors["currencySymbol"] = ["invalid"];
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var s = await db.Settings.SingleAsync();
            s.BusinessName = req.BusinessName.Trim();
            s.CurrencyCode = req.CurrencyCode!;
            s.CurrencySymbol = req.CurrencySymbol.Trim();
            // The time zone stays Asia/Karachi for now; it is not editable.
            await db.SaveChangesAsync();
            return Results.Ok(new SettingsDto(s.BusinessName, s.CurrencyCode, s.CurrencySymbol, s.TimeZone));
        }).RequireAuthorization(Permissions.SettingsManage);
    }

    private static IResult IdentityProblem(IdentityResult result) =>
        Results.ValidationProblem(result.Errors
            .GroupBy(e => e.Code.Contains("Password") ? "password" : e.Code.Contains("UserName") ? "userName" : "general")
            .ToDictionary(g => g.Key, g => g.Select(e => e.Code).ToArray()));

    [GeneratedRegex("^[A-Z]{3}$")]
    private static partial Regex CurrencyCode();
}
