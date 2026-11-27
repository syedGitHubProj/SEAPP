using System.Net;
using System.Net.Http.Json;
using SellEase.Api.Auth;

namespace SellEase.Api.Tests;

/// <summary>The rules in docs/PLAN.md, "Who can do what".</summary>
public class PermissionTableTests
{
    [Theory]
    [InlineData(Roles.Salesman, Permissions.CatalogView, true)]
    [InlineData(Roles.Salesman, Permissions.CustomersEdit, true)]
    [InlineData(Roles.Salesman, Permissions.SaleOrdersEdit, true)]
    [InlineData(Roles.Salesman, Permissions.PurchaseOrdersCreate, true)]
    [InlineData(Roles.Salesman, Permissions.CatalogEdit, false)]
    [InlineData(Roles.Salesman, Permissions.FactoriesEdit, false)]
    [InlineData(Roles.Salesman, Permissions.OperationsManage, false)]
    [InlineData(Roles.Salesman, Permissions.UsersManage, false)]
    [InlineData(Roles.Manager, Permissions.CatalogEdit, true)]
    [InlineData(Roles.Manager, Permissions.FactoriesEdit, true)]
    [InlineData(Roles.Manager, Permissions.CustomersEdit, true)]
    [InlineData(Roles.Manager, Permissions.OperationsManage, true)]
    [InlineData(Roles.Manager, Permissions.UsersManage, false)]
    [InlineData(Roles.Manager, Permissions.SettingsManage, false)]
    [InlineData(Roles.Manager, Permissions.AuditView, false)]
    public void Role_has_expected_permission(string role, string permission, bool expected)
    {
        Assert.Equal(expected, Permissions.For([role]).Contains(permission));
    }

    [Fact]
    public void Admin_has_every_permission()
    {
        Assert.Equal(Permissions.All.Order(), Permissions.For([Roles.Admin]));
    }
}

[Collection(ApiCollection.Name)]
public class PermissionEndpointTests(ApiFixture api)
{
    [Theory]
    [InlineData(ApiFixture.SalesmanUser, HttpStatusCode.Forbidden)]
    [InlineData(ApiFixture.ManagerUser, HttpStatusCode.Forbidden)]
    [InlineData(ApiFixture.AdminUser, HttpStatusCode.OK)]
    public async Task Only_admin_manages_staff_accounts(string userName, HttpStatusCode expected)
    {
        var client = await api.SignInAsync(userName);
        Assert.Equal(expected, (await client.GetAsync("/api/admin/users")).StatusCode);
    }

    [Theory]
    [InlineData(ApiFixture.SalesmanUser, HttpStatusCode.Forbidden)]
    [InlineData(ApiFixture.ManagerUser, HttpStatusCode.Forbidden)]
    [InlineData(ApiFixture.AdminUser, HttpStatusCode.OK)]
    public async Task Only_admin_sees_the_audit_log(string userName, HttpStatusCode expected)
    {
        var client = await api.SignInAsync(userName);
        Assert.Equal(expected, (await client.GetAsync("/api/admin/audit")).StatusCode);
    }

    [Fact]
    public async Task Everyone_can_read_settings_but_only_admin_changes_them()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var settings = await manager.GetFromJsonAsync<Dictionary<string, string>>("/api/settings");
        Assert.Equal("PKR", settings!["currencyCode"]);

        var response = await manager.PutAsJsonAsync("/api/settings", settings);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
