using System.Net;
using System.Net.Http.Json;

namespace SellEase.Api.Tests;

[Collection(ApiCollection.Name)]
public class AuditLogTests(ApiFixture api)
{
    private sealed record AuditDto(Guid Id, DateTimeOffset At, string? UserName, string Action, string EntityType, string EntityId, string? Label, string? Changes);
    private sealed record CustomerDto(Guid Id, string Number, string Name);
    private sealed record CategoryDto(Guid Id, string Name);
    private sealed record DesignDto(Guid Id, string Code);

    [Fact]
    public async Task Audit_rows_name_the_record_and_can_be_filtered_by_kind()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var name = ApiFixture.UniqueName("Audit Customer");
        var created = await admin.PostAsJsonAsync("/api/customers", new { name, phone = "0300-1234567" });
        var customer = (await created.Content.ReadFromJsonAsync<CustomerDto>())!;

        var rows = await admin.GetFromJsonAsync<List<AuditDto>>("/api/admin/audit?entityType=Customer&take=50");

        Assert.All(rows!, r => Assert.Equal("Customer", r.EntityType));
        var row = Assert.Single(rows!, r => r.EntityId == customer.Id.ToString());
        Assert.Equal("Added", row.Action);
        Assert.Equal($"{customer.Number} {name}", row.Label);
        Assert.Equal(ApiFixture.AdminUser, row.UserName);
    }

    [Fact]
    public async Task A_designs_options_are_named_after_the_design_and_listed_with_it()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var category = (await admin.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories"))!.First();
        var code = "AU-" + Random.Shared.Next(1000, 9999);
        var response = await admin.PostAsJsonAsync("/api/catalog/designs", new
        {
            code, name = "Audit Sofa", categoryId = category.Id, basePrice = 1000m,
            materials = new[] { new { name = "Velvet", surcharge = 500m } },
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var rows = (await admin.GetFromJsonAsync<List<AuditDto>>("/api/admin/audit?entityType=Design&take=100"))!;

        Assert.Contains(rows, r => r.EntityType == "Design" && r.Label == $"{code} Audit Sofa");
        Assert.Contains(rows, r => r.EntityType == "DesignMaterial" && r.Label == $"{code} Audit Sofa · Velvet");
    }

    [Fact]
    public async Task Older_rows_come_page_by_page_without_repeats()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        for (var i = 0; i < 3; i++)
            await admin.PostAsJsonAsync("/api/customers", new { name = ApiFixture.UniqueName("Paged"), phone = "0300-7654321" });

        var first = (await admin.GetFromJsonAsync<List<AuditDto>>("/api/admin/audit?take=2"))!;
        var before = Uri.EscapeDataString(first[^1].At.ToString("O"));
        var second = (await admin.GetFromJsonAsync<List<AuditDto>>($"/api/admin/audit?take=2&before={before}"))!;

        Assert.Equal(2, first.Count);
        Assert.NotEmpty(second);
        Assert.DoesNotContain(second, r => first.Any(f => f.Id == r.Id));
        Assert.All(second, r => Assert.True(r.At < first[^1].At));
    }

    [Fact]
    public async Task Rows_can_be_filtered_by_who_made_the_change()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        await manager.PostAsJsonAsync("/api/customers", new { name = ApiFixture.UniqueName("By Manager"), phone = "0300-1112223" });
        var admin = await api.SignInAsync(ApiFixture.AdminUser);

        var rows = (await admin.GetFromJsonAsync<List<AuditDto>>($"/api/admin/audit?userName={ApiFixture.ManagerUser}"))!;

        Assert.NotEmpty(rows);
        Assert.All(rows, r => Assert.Equal(ApiFixture.ManagerUser, r.UserName));
    }
}
