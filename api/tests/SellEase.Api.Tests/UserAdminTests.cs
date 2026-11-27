using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;

namespace SellEase.Api.Tests;

[Collection(ApiCollection.Name)]
public class UserAdminTests(ApiFixture api)
{
    private sealed record UserDto(Guid Id, string UserName, string FullName, string Role, bool IsActive);

    private async Task<UserDto> CreateViaApiAsync(HttpClient admin, string userName, string role = Roles.Salesman)
    {
        var response = await admin.PostAsJsonAsync("/api/admin/users",
            new { userName, fullName = "New Salesman", role, password = ApiFixture.Password });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<UserDto>())!;
    }

    [Fact]
    public async Task Admin_creates_a_staff_account_that_can_sign_in()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var userName = ApiFixture.UniqueName("staff");

        var created = await CreateViaApiAsync(admin, userName);

        Assert.Equal(Roles.Salesman, created.Role);
        await api.SignInAsync(userName);
        var list = await admin.GetFromJsonAsync<List<UserDto>>("/api/admin/users");
        Assert.Contains(list!, u => u.UserName == userName && u.Role == Roles.Salesman);
    }

    [Fact]
    public async Task Creating_a_user_is_written_to_the_audit_log_without_the_password()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var created = await CreateViaApiAsync(admin, ApiFixture.UniqueName("audited"));

        var entries = await api.WithDbAsync(db =>
            db.AuditEntries.Where(a => a.EntityId == created.Id.ToString()).ToListAsync());

        var added = Assert.Single(entries, e => e.Action == "Added");
        Assert.Equal(ApiFixture.AdminUser, added.UserName);
        Assert.DoesNotContain("PasswordHash", added.Changes);
        Assert.Contains(entries, e => e.Action == "RoleAssigned" && e.Changes!.Contains(Roles.Salesman));
    }

    [Fact]
    public async Task Duplicate_user_name_and_weak_password_are_refused()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);

        var duplicate = await admin.PostAsJsonAsync("/api/admin/users",
            new { userName = ApiFixture.ManagerUser, fullName = "Copy", role = Roles.Manager, password = ApiFixture.Password });
        var weak = await admin.PostAsJsonAsync("/api/admin/users",
            new { userName = ApiFixture.UniqueName("weak"), fullName = "Weak", role = Roles.Manager, password = "short" });
        var badRole = await admin.PostAsJsonAsync("/api/admin/users",
            new { userName = ApiFixture.UniqueName("role"), fullName = "Role", role = "Owner", password = ApiFixture.Password });

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badRole.StatusCode);
    }

    [Fact]
    public async Task Deactivated_user_cannot_sign_in()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var userName = ApiFixture.UniqueName("leaver");
        var created = await CreateViaApiAsync(admin, userName);

        var response = await admin.PutAsJsonAsync($"/api/admin/users/{created.Id}/active", new { isActive = false });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var signIn = await api.Factory.CreateClient()
            .PostAsJsonAsync("/api/auth/sign-in", new { userName, password = ApiFixture.Password });
        Assert.Equal(HttpStatusCode.Unauthorized, signIn.StatusCode);
    }

    [Fact]
    public async Task Admin_cannot_deactivate_or_demote_themselves()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var me = await admin.GetFromJsonAsync<UserDto>("/api/auth/me");

        Assert.Equal(HttpStatusCode.BadRequest,
            (await admin.PutAsJsonAsync($"/api/admin/users/{me!.Id}/active", new { isActive = false })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await admin.PutAsJsonAsync($"/api/admin/users/{me.Id}/role", new { role = Roles.Salesman })).StatusCode);
    }

    [Fact]
    public async Task Role_change_takes_effect_and_is_audited()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var userName = ApiFixture.UniqueName("promote");
        var created = await CreateViaApiAsync(admin, userName);

        await admin.PutAsJsonAsync($"/api/admin/users/{created.Id}/role", new { role = Roles.Manager });

        var promoted = await api.SignInAsync(userName);
        var me = await promoted.GetFromJsonAsync<UserDto>("/api/auth/me");
        Assert.Equal(Roles.Manager, me!.Role);
        var changed = await api.WithDbAsync(db =>
            db.AuditEntries.AnyAsync(a => a.EntityId == created.Id.ToString() && a.Action == "RoleChanged"));
        Assert.True(changed);
    }

    [Fact]
    public async Task Admin_resets_a_password()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var userName = ApiFixture.UniqueName("forgot");
        var created = await CreateViaApiAsync(admin, userName);
        var newPassword = "reset-" + Guid.NewGuid().ToString("N")[..10];

        var response = await admin.PostAsJsonAsync($"/api/admin/users/{created.Id}/password", new { password = newPassword });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await api.SignInAsync(userName, newPassword);
    }
}
