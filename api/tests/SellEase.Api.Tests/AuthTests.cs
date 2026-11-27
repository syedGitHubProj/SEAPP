using System.Net;
using System.Net.Http.Json;
using SellEase.Api.Auth;

namespace SellEase.Api.Tests;

[Collection(ApiCollection.Name)]
public class AuthTests(ApiFixture api)
{
    private sealed record Me(Guid Id, string UserName, string FullName, string Role, string[] Permissions);
    private sealed record ErrorBody(string Error);

    [Fact]
    public async Task Signed_in_user_sees_their_role_and_permissions()
    {
        var client = await api.SignInAsync(ApiFixture.SalesmanUser);

        var me = await client.GetFromJsonAsync<Me>("/api/auth/me");

        Assert.Equal(Roles.Salesman, me!.Role);
        Assert.Contains(Permissions.CustomersEdit, me.Permissions);
        Assert.DoesNotContain(Permissions.FactoriesEdit, me.Permissions);
    }

    [Fact]
    public async Task Phone_number_can_be_typed_with_dashes_and_spaces()
    {
        await api.SignInAsync("0311-111 1111");
    }

    [Fact]
    public async Task Wrong_password_is_refused()
    {
        var client = api.Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/sign-in", new { userName = ApiFixture.AdminUser, password = "wrong-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("invalidCredentials", (await response.Content.ReadFromJsonAsync<ErrorBody>())!.Error);
    }

    [Fact]
    public async Task Unknown_user_gets_the_same_answer_as_a_wrong_password()
    {
        var client = api.Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/sign-in", new { userName = "nobody", password = ApiFixture.Password });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("invalidCredentials", (await response.Content.ReadFromJsonAsync<ErrorBody>())!.Error);
    }

    [Fact]
    public async Task Nothing_is_available_without_signing_in()
    {
        var client = api.Factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/settings")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/users")).StatusCode);
    }

    [Fact]
    public async Task Sign_out_ends_the_session()
    {
        var client = await api.SignInAsync(ApiFixture.ManagerUser);

        await client.PostAsync("/api/auth/sign-out", null);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Account_locks_after_five_wrong_passwords()
    {
        var userName = ApiFixture.UniqueName("lock");
        await api.CreateUserAsync(userName, Roles.Salesman);
        var client = api.Factory.CreateClient();

        for (var i = 0; i < 5; i++)
            await client.PostAsJsonAsync("/api/auth/sign-in", new { userName, password = "wrong-password" });
        var response = await client.PostAsJsonAsync("/api/auth/sign-in", new { userName, password = ApiFixture.Password });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("lockedOut", (await response.Content.ReadFromJsonAsync<ErrorBody>())!.Error);
    }
}
