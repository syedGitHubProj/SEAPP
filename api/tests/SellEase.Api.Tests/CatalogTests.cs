using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;

namespace SellEase.Api.Tests;

public sealed record CategoryItemDto(Guid Id, string Name, int SortOrder, bool IsActive, uint Version);
public sealed record CategoryDto(Guid Id, string Name, int SortOrder, bool IsActive, uint Version, CategoryItemDto[]? Items = null);
public sealed record MaterialDto(Guid? Id, string Name, decimal? Surcharge);
public sealed record ColorDto(Guid? Id, string Name, string Hex);
public sealed record DesignItemDto(Guid? Id, Guid CategoryItemId, string? Name, decimal? Price, bool IsDefault, bool IsActive = true);
public sealed record DesignDto(
    Guid Id, string Code, string Name, Guid CategoryId, string? Description,
    MaterialDto[] Materials, ColorDto[] Colors, DesignItemDto[] Items,
    bool IsActive, uint Version, PhotoDto[]? Photos = null);
public sealed record PhotoDto(Guid Id, string Url);
public sealed record OtherItemDto(Guid Id, string Name, decimal? Price, int SortOrder, bool IsActive, uint Version);

/// <summary>Builds test designs. Each gets its own fresh category items, so tests don't share them.</summary>
public static class TestCatalog
{
    public static string NewCode() => "T-" + Random.Shared.Next(10_000, 99_999);

    public static async Task<Guid> CategoryIdAsync(HttpClient client, string name = "Sofa") =>
        (await client.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories"))!.Single(c => c.Name == name).Id;

    public static async Task<CategoryItemDto> AddItemAsync(HttpClient manager, Guid categoryId, string name)
    {
        var response = await manager.PostAsJsonAsync($"/api/catalog/categories/{categoryId}/items", new { name, sortOrder = 10 });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<CategoryItemDto>())!;
    }

    /// <summary>A sofa design offering a 3 seater (60,000, ticked) and a centre table (25,000, not ticked).</summary>
    public static async Task<object> SofaInputAsync(HttpClient manager, string code)
    {
        var categoryId = await CategoryIdAsync(manager);
        var seater = await AddItemAsync(manager, categoryId, ApiFixture.UniqueName("3 seater"));
        var table = await AddItemAsync(manager, categoryId, ApiFixture.UniqueName("Centre table"));
        return new
        {
            code,
            name = "Modern Sofa Set",
            categoryId,
            description = "Clean lines with removable cushion covers.",
            materials = new[] { new { name = "Velvet", surcharge = 0m }, new { name = "Leather", surcharge = 15_000m } },
            colors = new[] { new { name = "Bottle green", hex = "#216B44" } },
            items = new[]
            {
                new { categoryItemId = seater.Id, price = 60_000m, isDefault = true },
                new { categoryItemId = table.Id, price = 25_000m, isDefault = false },
            },
        };
    }

    public static async Task<DesignDto> NewDesignAsync(HttpClient manager, string? code = null)
    {
        var response = await manager.PostAsJsonAsync("/api/catalog/designs", await SofaInputAsync(manager, code ?? NewCode()));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<DesignDto>())!;
    }
}

[Collection(ApiCollection.Name)]
public class CatalogTests(ApiFixture api)
{
    [Fact]
    public async Task Starting_categories_are_there()
    {
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var names = (await salesman.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories"))!.Select(c => c.Name);
        Assert.Equal(["Royal", "Sofa", "Bedroom", "Dining", "Living"], names.Take(5));
    }

    [Fact]
    public async Task Manager_adds_a_design_with_items_and_a_salesman_sees_them_but_no_prices()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var code = TestCatalog.NewCode();
        var created = await TestCatalog.NewDesignAsync(manager, code);

        Assert.Equal(2, created.Items.Length);
        Assert.StartsWith("3 seater", created.Items[0].Name);
        Assert.Equal(60_000m, created.Items[0].Price);
        Assert.True(created.Items[0].IsDefault);
        Assert.False(created.Items[1].IsDefault);

        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var design = await salesman.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{code.ToLowerInvariant()}");

        Assert.Equal(["Velvet", "Leather"], design!.Materials.Select(m => m.Name));
        Assert.Equal("#216b44", design.Colors.Single().Hex);
        Assert.Equal(created.Items.Select(i => i.Name), design.Items.Select(i => i.Name));
        Assert.Equal([true, false], design.Items.Select(i => i.IsDefault));
        Assert.All(design.Items, i => Assert.Null(i.Price));
        Assert.All(design.Materials, m => Assert.Null(m.Surcharge));

        var list = await salesman.GetFromJsonAsync<List<DesignDto>>($"/api/catalog/designs?q={code}");
        Assert.All(list!.SelectMany(d => d.Items), i => Assert.Null(i.Price));

        var forManager = await manager.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{code}");
        Assert.Equal(15_000m, forManager!.Materials[1].Surcharge);
        Assert.Equal(25_000m, forManager.Items[1].Price);
    }

    [Fact]
    public async Task Salesman_cannot_change_designs_categories_or_items()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var input = await TestCatalog.SofaInputAsync(manager, TestCatalog.NewCode());
        var sofa = await TestCatalog.CategoryIdAsync(manager);
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);

        Assert.Equal(HttpStatusCode.Forbidden, (await salesman.PostAsJsonAsync("/api/catalog/designs", input)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await salesman.PostAsJsonAsync("/api/catalog/categories", new { name = "Office", sortOrder = 9 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await salesman.PostAsJsonAsync($"/api/catalog/categories/{sofa}/items", new { name = "Pouf", sortOrder = 9 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await salesman.PostAsJsonAsync("/api/catalog/other-items", new { name = "Pouf", price = 1m, sortOrder = 9 })).StatusCode);
    }

    [Fact]
    public async Task Editing_items_keeps_updates_adds_and_removes_and_audits_each()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var d = await TestCatalog.NewDesignAsync(manager);
        var seater = d.Items[0];
        var extra = await TestCatalog.AddItemAsync(manager, d.CategoryId, ApiFixture.UniqueName("Side table"));

        var response = await manager.PutAsJsonAsync($"/api/catalog/designs/{d.Id}", d with
        {
            Items = [seater with { Price = 62_500m, IsDefault = false }, new DesignItemDto(null, extra.Id, null, 9_000m, true)],
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<DesignDto>())!;
        Assert.Equal([seater.Name, extra.Name], updated.Items.Select(i => i.Name));
        Assert.Equal(seater.Id, updated.Items[0].Id); // the same item row, updated in place
        Assert.Equal(62_500m, updated.Items[0].Price);
        Assert.False(updated.Items[0].IsDefault);
        Assert.True(updated.Items[1].IsDefault);

        var removed = d.Items[1].Id.ToString();
        var actions = await api.WithDbAsync(db => db.AuditEntries
            .Where(a => a.EntityType == "DesignItem" && (a.EntityId == removed || a.EntityId == seater.Id.ToString()))
            .Select(a => a.Action).ToListAsync());
        Assert.Contains("Deleted", actions);
        Assert.Contains("Modified", actions);
    }

    [Fact]
    public async Task A_stale_edit_is_refused_even_when_only_options_changed()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var d = await TestCatalog.NewDesignAsync(manager);

        var first = await admin.PutAsJsonAsync($"/api/catalog/designs/{d.Id}", d with { Name = "Modern Sofa Set (new)" });
        var stale = await manager.PutAsJsonAsync($"/api/catalog/designs/{d.Id}", d with { Colors = [] });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
    }

    [Fact]
    public async Task Bad_designs_are_refused()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var d = await TestCatalog.NewDesignAsync(manager);
        var sofa = d.CategoryId;
        var item = d.Items[0].CategoryItemId;
        var bedroomItem = await TestCatalog.AddItemAsync(manager, await TestCatalog.CategoryIdAsync(manager, "Bedroom"), ApiFixture.UniqueName("Bed king"));
        object One(decimal price) => new[] { new { categoryItemId = item, price, isDefault = true } };

        var duplicate = await manager.PostAsJsonAsync("/api/catalog/designs", await TestCatalog.SofaInputAsync(manager, d.Code.ToLowerInvariant()));
        var badCategory = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = TestCatalog.NewCode(), name = "X", categoryId = Guid.NewGuid(), items = One(1m) });
        var badMoney = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = TestCatalog.NewCode(), name = "X", categoryId = sofa, items = One(10.555m) });
        var negative = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = TestCatalog.NewCode(), name = "X", categoryId = sofa, items = One(1m), materials = new[] { new { name = "A", surcharge = -5m } } });
        var badColor = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = TestCatalog.NewCode(), name = "X", categoryId = sofa, items = One(1m), colors = new[] { new { name = "Green", hex = "green" } } });
        var noItems = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = TestCatalog.NewCode(), name = "X", categoryId = sofa });
        var otherCategory = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = TestCatalog.NewCode(), name = "X", categoryId = sofa, items = new[] { new { categoryItemId = bedroomItem.Id, price = 1m, isDefault = true } } });
        var twice = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = TestCatalog.NewCode(), name = "X", categoryId = sofa, items = new[] { new { categoryItemId = item, price = 1m, isDefault = true }, new { categoryItemId = item, price = 2m, isDefault = false } } });

        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Contains("unknownCategory", await badCategory.Content.ReadAsStringAsync());
        Assert.Contains("invalidAmount", await badMoney.Content.ReadAsStringAsync());
        Assert.Contains("invalidAmount", await negative.Content.ReadAsStringAsync());
        Assert.Contains("invalidColor", await badColor.Content.ReadAsStringAsync());
        Assert.Contains("\"items\"", await noItems.Content.ReadAsStringAsync());
        Assert.Contains("unknownItem", await otherCategory.Content.ReadAsStringAsync());
        Assert.Contains("duplicate", await twice.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Switched_off_design_is_hidden_from_salesmen_but_kept_for_managers()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var d = await TestCatalog.NewDesignAsync(manager);
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
        var d = await TestCatalog.NewDesignAsync(manager);

        var sofas = await manager.GetFromJsonAsync<List<DesignDto>>($"/api/catalog/designs?categoryId={d.CategoryId}");
        var found = await manager.GetFromJsonAsync<List<DesignDto>>($"/api/catalog/designs?q={d.Code}");

        Assert.All(sofas!, x => Assert.Equal(d.CategoryId, x.CategoryId));
        Assert.Contains(found!, x => x.Id == d.Id);
    }

    [Fact]
    public async Task A_category_lists_its_items_and_a_switched_off_item_disappears_for_salesmen()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var d = await TestCatalog.NewDesignAsync(manager);
        var table = (await manager.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories"))!
            .Single(c => c.Id == d.CategoryId).Items!.Single(i => i.Id == d.Items[1].CategoryItemId);

        var renamed = await manager.PutAsJsonAsync($"/api/catalog/category-items/{table.Id}", table with { Name = table.Name + " (glass)", IsActive = false });
        var clash = await manager.PostAsJsonAsync($"/api/catalog/categories/{d.CategoryId}/items", new { name = d.Items[0].Name, sortOrder = 1 });
        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, clash.StatusCode);

        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var categories = await salesman.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories?includeInactive=true");
        Assert.DoesNotContain(categories!.SelectMany(c => c.Items!), i => i.Id == table.Id);
        var forSalesman = await salesman.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{d.Code}");
        Assert.Equal([d.Items[0].Name], forSalesman!.Items.Select(i => i.Name));

        // The manager still sees it, renamed and marked as switched off, so old designs can be fixed.
        var forManager = await manager.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{d.Code}");
        Assert.Contains(forManager!.Items, i => i.Name == table.Name + " (glass)" && !i.IsActive);
        var all = await manager.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories?includeInactive=true");
        Assert.Contains(all!.SelectMany(c => c.Items!), i => i.Id == table.Id && !i.IsActive);
    }

    [Fact]
    public async Task Other_items_are_sold_without_a_design_and_salesmen_see_no_price()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var name = ApiFixture.UniqueName("Mirror");
        var created = await manager.PostAsJsonAsync("/api/catalog/other-items", new { name, price = 8_000m, sortOrder = 10 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var item = (await created.Content.ReadFromJsonAsync<OtherItemDto>())!;
        Assert.Equal(8_000m, item.Price);

        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var seen = await salesman.GetFromJsonAsync<List<OtherItemDto>>("/api/catalog/other-items");
        Assert.Null(Assert.Single(seen!, i => i.Name == name).Price);

        var bad = await manager.PostAsJsonAsync("/api/catalog/other-items", new { name = " ", price = -1m, sortOrder = 1 });
        Assert.Contains("invalidAmount", await bad.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Conflict, (await manager.PostAsJsonAsync("/api/catalog/other-items", new { name, price = 1m, sortOrder = 1 })).StatusCode);

        await manager.PutAsJsonAsync($"/api/catalog/other-items/{item.Id}", new { name, price = 8_000m, sortOrder = 10, isActive = false, version = item.Version });
        Assert.DoesNotContain(await salesman.GetFromJsonAsync<List<OtherItemDto>>("/api/catalog/other-items") ?? [], i => i.Id == item.Id);
        Assert.Contains(await manager.GetFromJsonAsync<List<OtherItemDto>>("/api/catalog/other-items?includeInactive=true") ?? [], i => i.Id == item.Id && !i.IsActive);
    }
}
