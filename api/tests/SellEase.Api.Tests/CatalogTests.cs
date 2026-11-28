using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;

namespace SellEase.Api.Tests;

public sealed record CategoryDto(Guid Id, string Name, int SortOrder, bool IsActive, uint Version);
public sealed record MaterialDto(Guid? Id, string Name, decimal? Surcharge);
public sealed record ColorDto(Guid? Id, string Name, string Hex);
public sealed record AccessoryDto(Guid? Id, string Name, decimal? Price);
public sealed record DesignDto(
    Guid Id, string Code, string Name, Guid CategoryId, decimal? BasePrice,
    string? Dimensions, string? Wood, string? Description,
    MaterialDto[] Materials, ColorDto[] Colors, AccessoryDto[] Accessories,
    bool IsActive, uint Version, PhotoDto[]? Photos = null);
public sealed record PhotoDto(Guid Id, string Url);

[Collection(ApiCollection.Name)]
public class CatalogTests(ApiFixture api)
{
    private static string NewCode() => "T-" + Random.Shared.Next(10_000, 99_999);

    private static async Task<Guid> SofaCategoryAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories"))!.Single(c => c.Name == "Sofa").Id;

    private static async Task<object> SofaInputAsync(HttpClient client, string code) => new
    {
        code,
        name = "Modern Sofa Set",
        categoryId = await SofaCategoryAsync(client),
        basePrice = 125_000m,
        dimensions = "3+2+1 seater",
        wood = "Deodar",
        description = "Clean lines with removable cushion covers.",
        materials = new[] { new { name = "Velvet", surcharge = 0m }, new { name = "Leather", surcharge = 15_000m } },
        colors = new[] { new { name = "Bottle green", hex = "#216B44" } },
        accessories = new[] { new { name = "Centre table", price = 25_000m }, new { name = "Side tables", price = 18_000m } },
    };

    private static async Task<DesignDto> CreateAsync(HttpClient manager, string code)
    {
        var response = await manager.PostAsJsonAsync("/api/catalog/designs", await SofaInputAsync(manager, code));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<DesignDto>())!;
    }

    [Fact]
    public async Task Starting_categories_are_there()
    {
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var names = (await salesman.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories"))!.Select(c => c.Name);
        Assert.Equal(["Royal", "Sofa", "Bedroom", "Dining", "Living"], names.Take(5));
    }

    [Fact]
    public async Task Manager_adds_a_design_and_a_salesman_sees_it_with_its_options_but_no_prices()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var code = NewCode();
        await CreateAsync(manager, code);

        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var design = await salesman.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{code.ToLowerInvariant()}");

        Assert.Equal(["Velvet", "Leather"], design!.Materials.Select(m => m.Name));
        Assert.Equal("#216b44", design.Colors.Single().Hex);
        Assert.Equal(["Centre table", "Side tables"], design.Accessories.Select(a => a.Name));
        Assert.Null(design.BasePrice);
        Assert.All(design.Materials, m => Assert.Null(m.Surcharge));
        Assert.All(design.Accessories, a => Assert.Null(a.Price));

        var list = await salesman.GetFromJsonAsync<List<DesignDto>>($"/api/catalog/designs?q={code}");
        Assert.All(list!, d => Assert.Null(d.BasePrice));

        var forManager = await manager.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{code}");
        Assert.Equal(125_000m, forManager!.BasePrice);
        Assert.Equal(15_000m, forManager.Materials[1].Surcharge);
        Assert.Equal(25_000m, forManager.Accessories[0].Price);
    }

    [Fact]
    public async Task Salesman_cannot_add_or_change_designs_or_categories()
    {
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);

        var design = await salesman.PostAsJsonAsync("/api/catalog/designs", await SofaInputAsync(salesman, NewCode()));
        var category = await salesman.PostAsJsonAsync("/api/catalog/categories", new { name = "Office", sortOrder = 9 });

        Assert.Equal(HttpStatusCode.Forbidden, design.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, category.StatusCode);
    }

    [Fact]
    public async Task Editing_options_keeps_updates_adds_and_removes_and_audits_each()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var d = await CreateAsync(manager, NewCode());
        var centre = d.Accessories[0];

        var response = await manager.PutAsJsonAsync($"/api/catalog/designs/{d.Id}", d with
        {
            BasePrice = 130_000m,
            Accessories = [centre with { Price = 27_500m }, new AccessoryDto(null, "Cushions", 6_000m)],
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<DesignDto>())!;
        Assert.Equal(130_000m, updated.BasePrice);
        Assert.Equal(["Centre table", "Cushions"], updated.Accessories.Select(a => a.Name));
        Assert.Equal(centre.Id, updated.Accessories[0].Id); // the same option, updated in place
        Assert.Equal(27_500m, updated.Accessories[0].Price);

        var removed = d.Accessories[1].Id.ToString();
        var actions = await api.WithDbAsync(db => db.AuditEntries
            .Where(a => a.EntityType == "DesignAccessory" && (a.EntityId == removed || a.EntityId == centre.Id.ToString()))
            .Select(a => a.Action).ToListAsync());
        Assert.Contains("Deleted", actions);
        Assert.Contains("Modified", actions);
    }

    [Fact]
    public async Task A_stale_edit_is_refused_even_when_only_options_changed()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var d = await CreateAsync(manager, NewCode());

        var first = await admin.PutAsJsonAsync($"/api/catalog/designs/{d.Id}", d with { Name = "Modern Sofa Set (new)" });
        var stale = await manager.PutAsJsonAsync($"/api/catalog/designs/{d.Id}", d with { Colors = [] });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
    }

    [Fact]
    public async Task Duplicate_code_unknown_category_and_bad_money_are_refused()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var d = await CreateAsync(manager, NewCode());
        var categoryId = await SofaCategoryAsync(manager);

        var duplicate = await manager.PostAsJsonAsync("/api/catalog/designs", await SofaInputAsync(manager, d.Code.ToLowerInvariant()));
        var badCategory = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = NewCode(), name = "X", categoryId = Guid.NewGuid(), basePrice = 1m });
        var badMoney = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = NewCode(), name = "X", categoryId, basePrice = 10.555m });
        var negative = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = NewCode(), name = "X", categoryId, basePrice = 1m, accessories = new[] { new { name = "A", price = -5m } } });
        var badColor = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = NewCode(), name = "X", categoryId, basePrice = 1m, colors = new[] { new { name = "Green", hex = "green" } } });

        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Contains("unknownCategory", await badCategory.Content.ReadAsStringAsync());
        Assert.Contains("invalidAmount", await badMoney.Content.ReadAsStringAsync());
        Assert.Contains("invalidAmount", await negative.Content.ReadAsStringAsync());
        Assert.Contains("invalidColor", await badColor.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Switched_off_design_is_hidden_from_salesmen_but_kept_for_managers()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var d = await CreateAsync(manager, NewCode());
        await manager.PutAsJsonAsync($"/api/catalog/designs/{d.Id}", d with { IsActive = false });

        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        Assert.Equal(HttpStatusCode.NotFound, (await salesman.GetAsync($"/api/catalog/designs/{d.Code}")).StatusCode);
        Assert.DoesNotContain(await salesman.GetFromJsonAsync<List<DesignDto>>("/api/catalog/designs?includeInactive=true") ?? [], x => x.Id == d.Id);

        Assert.Contains(await manager.GetFromJsonAsync<List<DesignDto>>("/api/catalog/designs?includeInactive=true") ?? [], x => x.Id == d.Id);
        Assert.Equal(HttpStatusCode.OK, (await manager.GetAsync($"/api/catalog/designs/{d.Code}")).StatusCode);
    }

    [Fact]
    public async Task Designs_can_be_filtered_by_category_and_searched()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var d = await CreateAsync(manager, NewCode());

        var sofas = await manager.GetFromJsonAsync<List<DesignDto>>($"/api/catalog/designs?categoryId={d.CategoryId}");
        var found = await manager.GetFromJsonAsync<List<DesignDto>>($"/api/catalog/designs?q={d.Code}");

        Assert.All(sofas!, x => Assert.Equal(d.CategoryId, x.CategoryId));
        Assert.Contains(found!, x => x.Id == d.Id);
    }
}
