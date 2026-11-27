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
    public sealed record AuditDto(DateTimeOffset At, string? UserName, string Action, string EntityType, string EntityId, string? Changes);

    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        MapUsers(app.MapGroup("/api/admin/users").RequireAuthorization(Permissions.UsersManage));
        MapSettings(app);

        app.MapGet("/api/admin/audit", async (AppDbContext db, int? take) =>
            await db.AuditEntries.OrderByDescending(a => a.At)
                .Take(Math.Clamp(take ?? 100, 1, 500))
                .Select(a => new AuditDto(a.At, a.UserName, a.Action, a.EntityType, a.EntityId, a.Changes))
                .ToListAsync())
            .RequireAuthorization(Permissions.AuditView);
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
