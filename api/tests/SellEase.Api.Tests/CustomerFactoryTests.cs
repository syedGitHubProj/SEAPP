using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;

namespace SellEase.Api.Tests;

public sealed record CustomerDto(Guid Id, string Number, string Name, string Phone, string? Address, string? Note, bool IsActive, uint Version);
public sealed record FactoryDto(Guid Id, string Number, string Name, string? ContactPerson, string Phone, string City, string? Speciality, bool IsActive, uint Version);

[Collection(ApiCollection.Name)]
public class CustomerTests(ApiFixture api)
{
    private static async Task<CustomerDto> CreateAsync(HttpClient client, string name, string phone)
    {
        var response = await client.PostAsJsonAsync("/api/customers", new { name, phone, address = "DHA Phase 5" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<CustomerDto>())!;
    }

    [Fact]
    public async Task Salesman_adds_a_customer_with_a_readable_number()
    {
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);

        var c = await CreateAsync(salesman, "Mr. Imran Khan", "0321-4567890");

        Assert.Matches(@"^CU-\d{6}$", c.Number);
        Assert.Equal("Mr. Imran Khan", c.Name);
        Assert.True(c.IsActive);
    }

    [Fact]
    public async Task Manager_finds_customers_by_name_or_by_phone_however_it_is_typed()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var name = ApiFixture.UniqueName("Ayesha");
        var phone = "0300-" + Random.Shared.Next(1_000_000, 9_999_999);
        await CreateAsync(manager, name, phone);

        var byName = await manager.GetFromJsonAsync<List<CustomerDto>>($"/api/customers?q={name[..10].ToUpperInvariant()}");
        var byPhone = await manager.GetFromJsonAsync<List<CustomerDto>>($"/api/customers?q={phone.Replace("-", "")}");

        Assert.Contains(byName!, c => c.Name == name);
        Assert.Contains(byPhone!, c => c.Name == name);
    }

    [Fact]
    public async Task Salesman_cannot_browse_or_edit_customers()
    {
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var c = await CreateAsync(salesman, ApiFixture.UniqueName("Private"), "0333-" + Random.Shared.Next(1_000_000, 9_999_999));

        Assert.Equal(HttpStatusCode.Forbidden, (await salesman.GetAsync("/api/customers")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await salesman.GetAsync("/api/customers?q=a")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await salesman.PutAsJsonAsync($"/api/customers/{c.Id}", c with { Note = "x" })).StatusCode);
    }

    [Fact]
    public async Task Salesman_finds_a_customer_only_by_the_full_phone_number()
    {
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var seven = Random.Shared.Next(1_000_000, 9_999_999).ToString();
        var name = ApiFixture.UniqueName("Phone");
        await CreateAsync(salesman, name, $"0322-{seven}");

        // However the number is typed, with or without +92, it matches.
        foreach (var typed in new[] { $"0322{seven}", $"0322 {seven}", $"+92 322 {seven}", $"92-322-{seven}" })
        {
            var found = await salesman.GetFromJsonAsync<List<CustomerDto>>($"/api/customers/lookup?phone={Uri.EscapeDataString(typed)}");
            Assert.Contains(found!, c => c.Name == name);
        }

        // Part of the number finds nobody, and too short a number is refused.
        var partial = await salesman.GetFromJsonAsync<List<CustomerDto>>($"/api/customers/lookup?phone=322{seven}"[..^1]);
        Assert.DoesNotContain(partial!, c => c.Name == name);
        Assert.Equal(HttpStatusCode.BadRequest, (await salesman.GetAsync("/api/customers/lookup?phone=4567")).StatusCode);
    }

    [Fact]
    public async Task Missing_name_and_bad_phone_are_refused()
    {
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);

        var response = await salesman.PostAsJsonAsync("/api/customers", new { name = " ", phone = "12" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("required", body);
        Assert.Contains("invalidPhone", body);
    }

    [Fact]
    public async Task Edit_is_saved_and_audited_but_a_stale_edit_is_refused()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var c = await CreateAsync(admin, ApiFixture.UniqueName("Sana"), "0345-2233445");

        var first = await manager.PutAsJsonAsync($"/api/customers/{c.Id}", c with { Address = "Johar Town" });
        var stale = await admin.PutAsJsonAsync($"/api/customers/{c.Id}", c with { Note = "Wants delivery on Sunday" });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Contains("changedByOthers", await stale.Content.ReadAsStringAsync());

        var entry = await api.WithDbAsync(db => db.AuditEntries
            .SingleAsync(a => a.EntityId == c.Id.ToString() && a.Action == "Modified"));
        Assert.Equal(ApiFixture.ManagerUser, entry.UserName);
        Assert.Contains("Johar Town", entry.Changes);
    }

    [Fact]
    public async Task Switched_off_customers_are_hidden_unless_asked_for()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var name = ApiFixture.UniqueName("Hamza");
        var phone = "0301-" + Random.Shared.Next(1_000_000, 9_999_999);
        var c = await CreateAsync(manager, name, phone);

        await manager.PutAsJsonAsync($"/api/customers/{c.Id}", c with { IsActive = false });

        Assert.DoesNotContain(await manager.GetFromJsonAsync<List<CustomerDto>>($"/api/customers?q={name}") ?? [], x => x.Id == c.Id);
        Assert.Contains(await manager.GetFromJsonAsync<List<CustomerDto>>($"/api/customers?q={name}&includeInactive=true") ?? [], x => x.Id == c.Id);
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        Assert.DoesNotContain(await salesman.GetFromJsonAsync<List<CustomerDto>>($"/api/customers/lookup?phone={phone}") ?? [], x => x.Id == c.Id);
    }

    [Fact]
    public async Task Customers_need_sign_in()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.Factory.CreateClient().GetAsync("/api/customers")).StatusCode);
    }
}

[Collection(ApiCollection.Name)]
public class FactoryTests(ApiFixture api)
{
    private static object NewFactory(string name) =>
        new { name, contactPerson = "Haji Aslam", phone = "0300-6611223", city = "Chiniot", speciality = "Royal carved sets" };

    [Fact]
    public async Task Salesman_can_list_factories_but_not_add_them()
    {
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);

        Assert.Equal(HttpStatusCode.OK, (await salesman.GetAsync("/api/factories")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await salesman.PostAsJsonAsync("/api/factories", NewFactory("Nope Works"))).StatusCode);
    }

    [Fact]
    public async Task Manager_adds_and_edits_a_factory()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var name = ApiFixture.UniqueName("Chiniot Royal Works");

        var created = await manager.PostAsJsonAsync("/api/factories", NewFactory(name));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var f = (await created.Content.ReadFromJsonAsync<FactoryDto>())!;
        Assert.Matches(@"^FA-\d{6}$", f.Number);

        var edited = await manager.PutAsJsonAsync($"/api/factories/{f.Id}", f with { City = "Lahore" });
        Assert.Equal("Lahore", (await edited.Content.ReadFromJsonAsync<FactoryDto>())!.City);

        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        Assert.Contains(await salesman.GetFromJsonAsync<List<FactoryDto>>("/api/factories") ?? [], x => x.Name == name);
    }

    [Fact]
    public async Task Two_factories_cannot_share_a_name()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var name = ApiFixture.UniqueName("Lahore Woodcraft");

        await manager.PostAsJsonAsync("/api/factories", NewFactory(name));
        var second = await manager.PostAsJsonAsync("/api/factories", NewFactory(name));

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Contains("duplicate", await second.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Admin_has_the_same_factory_access_as_manager()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        Assert.Equal(HttpStatusCode.Created,
            (await admin.PostAsJsonAsync("/api/factories", NewFactory(ApiFixture.UniqueName("Gujrat House")))).StatusCode);
    }
}
