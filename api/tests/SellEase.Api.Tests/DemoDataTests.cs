using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using SellEase.Api.Common;
using SellEase.Api.Setup;

namespace SellEase.Api.Tests;

public class DemoDataRulesTests
{
    private sealed class Env(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "SellEase";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    [Theory]
    [InlineData("Development", true)]
    [InlineData("Staging", true)]
    [InlineData("Production", false)]
    [InlineData("Testing", false)]
    public void Demo_data_is_only_allowed_on_a_developer_computer_or_staging(string environment, bool allowed)
    {
        Assert.Equal(allowed, DemoData.IsAllowed(new Env(environment)));
    }
}

[Collection(ApiCollection.Name)]
public class DemoDataLoadTests(ApiFixture api)
{
    [Fact]
    public async Task Demo_data_adds_designs_factories_and_customers_but_no_staff_and_only_once()
    {
        var staffBefore = await api.WithDbAsync(db => db.Users.CountAsync());

        for (var run = 0; run < 2; run++)
        {
            using var scope = api.Factory.Services.CreateScope();
            var sp = scope.ServiceProvider;
            await DemoData.RunAsync(sp.GetRequiredService<SellEase.Api.Data.AppDbContext>(), sp.GetRequiredService<NumberSequences>());
        }

        var (sofa, factories, staffAfter) = await api.WithDbAsync(async db => (
            await db.Designs.Include(d => d.Items).SingleAsync(d => d.Code == "SF-310"),
            await db.Factories.CountAsync(f => f.Name == "Chiniot Royal Works"),
            await db.Users.CountAsync()));

        var itemNames = await api.WithDbAsync(db => db.CategoryItems.ToDictionaryAsync(i => i.Id, i => i.Name));
        Assert.Contains(sofa.Items, i => itemNames[i.CategoryItemId] == "Centre table" && i.Price == 25_000m && !i.IsDefault);
        Assert.Contains(sofa.Items, i => itemNames[i.CategoryItemId] == "3 seater sofa" && i.IsDefault);
        var shandar = await api.WithDbAsync(db => db.Designs.Include(d => d.Items).SingleAsync(d => d.Code == "BD-210"));
        // The owner's example: Bed king, Almari 4 door, Side table and Dressing table ticked by default.
        Assert.Equal(["Bed king", "Almari 4 door", "Side table", "Dressing table"],
            shandar.Items.OrderBy(i => i.SortOrder).Where(i => i.IsDefault).Select(i => itemNames[i.CategoryItemId]));
        Assert.Equal(4, await api.WithDbAsync(db => db.OtherItems.CountAsync(i => new[] { "Mirror", "Locks & Handles", "Lights", "Mattress" }.Contains(i.Name))));
        Assert.Equal(1, factories); // running it twice does not add copies
        Assert.Equal(staffBefore, staffAfter); // never any staff accounts
    }
}
