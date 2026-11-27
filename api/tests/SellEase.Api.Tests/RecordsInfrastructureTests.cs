using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Tests;

[Collection(ApiCollection.Name)]
public class NumberSequenceTests(ApiFixture api)
{
    private async Task AddSequenceAsync(string prefix) =>
        await api.WithDbAsync(async db =>
        {
            db.NumberSequences.Add(new NumberSequence { Prefix = prefix });
            return await db.SaveChangesAsync();
        });

    private async Task<string> NextAsync(string prefix)
    {
        using var scope = api.Factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<NumberSequences>().NextAsync(prefix);
    }

    [Fact]
    public async Task Sale_and_purchase_order_sequences_exist()
    {
        var prefixes = await api.WithDbAsync(db => db.NumberSequences.Select(s => s.Prefix).ToListAsync());
        Assert.Contains("SO", prefixes);
        Assert.Contains("PO", prefixes);
    }

    [Fact]
    public async Task Numbers_are_padded_and_consecutive()
    {
        await AddSequenceAsync("T1");

        Assert.Equal("T1-000001", await NextAsync("T1"));
        Assert.Equal("T1-000002", await NextAsync("T1"));
    }

    [Fact]
    public async Task Many_people_saving_at_once_never_get_the_same_number()
    {
        await AddSequenceAsync("T2");

        var numbers = await Task.WhenAll(Enumerable.Range(0, 25).Select(_ => NextAsync("T2")));

        Assert.Equal(25, numbers.Distinct().Count());
        Assert.Equal(Enumerable.Range(1, 25).Select(i => NumberSequences.Format("T2", i)).Order(), numbers.Order());
    }

    [Fact]
    public async Task Unknown_prefix_is_an_error()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => NextAsync("NOPE"));
    }
}

[Collection(ApiCollection.Name)]
public class SettingsTests(ApiFixture api)
{
    private sealed record SettingsDto(string BusinessName, string CurrencyCode, string CurrencySymbol, string TimeZone);

    [Fact]
    public async Task Defaults_are_PKR_and_Karachi_time()
    {
        var client = await api.SignInAsync(ApiFixture.SalesmanUser);
        var s = await client.GetFromJsonAsync<SettingsDto>("/api/settings");

        Assert.Equal("Rs.", s!.CurrencySymbol);
        Assert.Equal("Asia/Karachi", s.TimeZone);
    }

    [Fact]
    public async Task Admin_changes_currency_and_the_change_is_audited()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var before = (await admin.GetFromJsonAsync<SettingsDto>("/api/settings"))!;

        try
        {
            var response = await admin.PutAsJsonAsync("/api/settings", before with { CurrencyCode = "AED", CurrencySymbol = "AED" });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var entry = await api.WithDbAsync(db => db.AuditEntries
                .Where(a => a.EntityType == nameof(BusinessSettings) && a.Action == "Modified")
                .OrderByDescending(a => a.At).FirstAsync());
            Assert.Equal(ApiFixture.AdminUser, entry.UserName);
            Assert.Contains("AED", entry.Changes);
        }
        finally
        {
            await admin.PutAsJsonAsync("/api/settings", before);
        }
    }

    [Fact]
    public async Task Invalid_currency_code_is_refused()
    {
        var admin = await api.SignInAsync(ApiFixture.AdminUser);
        var s = (await admin.GetFromJsonAsync<SettingsDto>("/api/settings"))!;

        var response = await admin.PutAsJsonAsync("/api/settings", s with { CurrencyCode = "rupees" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

[Collection(ApiCollection.Name)]
public class DatabaseSetupTests(ApiFixture api)
{
    [Fact]
    public async Task Setup_creates_roles_branch_and_settings_once()
    {
        using (var scope = api.Factory.Services.CreateScope())
            await SellEase.Api.Setup.DatabaseSetup.RunAsync(scope.ServiceProvider); // running again changes nothing

        var (roles, branches, settings) = await api.WithDbAsync(async db =>
            (await db.Roles.Select(r => r.Name!).ToListAsync(), await db.Branches.CountAsync(), await db.Settings.CountAsync()));

        Assert.Equal(Roles.All.Order(), roles.Order());
        Assert.Equal(1, branches);
        Assert.Equal(1, settings);
    }

    [Fact]
    public async Task Migrations_match_the_code()
    {
        // Fails if someone changes the tables in code but forgets "dotnet ef migrations add".
        Assert.False(await api.WithDbAsync(db => Task.FromResult(db.Database.HasPendingModelChanges())));
    }

    [Fact]
    public async Task Money_columns_are_numeric_18_2()
    {
        // Guard for the "never floating point" rule: the convention applies to every decimal property.
        var model = await api.WithDbAsync(db => Task.FromResult(db.Model));
        var decimals = model.GetEntityTypes().SelectMany(t => t.GetProperties()).Where(p => p.ClrType == typeof(decimal));
        Assert.All(decimals, p => Assert.Equal((18, 2), (p.GetPrecision(), p.GetScale())));
    }
}

public class UserNameTests
{
    [Theory]
    [InlineData("0300-123 4567", "03001234567")]
    [InlineData(" 03001234567 ", "03001234567")]
    [InlineData("+92 300 1234567", "+923001234567")]
    [InlineData("  admin ", "admin")]
    [InlineData("ali-raza", "ali-raza")]
    public void Phone_like_names_keep_only_digits(string input, string expected)
    {
        Assert.Equal(expected, UserNames.Normalize(input));
    }
}
