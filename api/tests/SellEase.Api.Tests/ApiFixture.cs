using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SellEase.Api.Auth;
using SellEase.Api.Data;
using SellEase.Api.Domain;
using SellEase.Api.Setup;
using Testcontainers.PostgreSql;

namespace SellEase.Api.Tests;

/// <summary>
/// Starts a real PostgreSQL in Docker once for all database tests, applies the migrations,
/// and creates one staff account per role.
/// </summary>
public sealed class ApiFixture : IAsyncLifetime
{
    /// <summary>A throwaway password made fresh for each test run.</summary>
    public static readonly string Password = "test-" + Guid.NewGuid().ToString("N")[..12];

    public const string AdminUser = "test-admin";
    public const string ManagerUser = "test-manager";
    public const string SalesmanUser = "03111111111";

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public WebApplicationFactory<Program> Factory { get; private set; } = null!;

    /// <summary>Uploaded photos go to a temporary folder that is removed afterwards.</summary>
    public string PhotoFolder { get; } = Path.Combine(Path.GetTempPath(), "sellease-test-photos-" + Guid.NewGuid().ToString("N"));

    public async Task InitializeAsync()
    {
        await _db.StartAsync();
        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseEnvironment("Testing");
            b.UseSetting("ConnectionStrings:Default", _db.GetConnectionString());
            b.UseSetting("Photos:Store", "Local");
            b.UseSetting("Photos:LocalPath", PhotoFolder);
        });

        using var scope = Factory.Services.CreateScope();
        await DatabaseSetup.RunAsync(scope.ServiceProvider);
        await CreateUserAsync(AdminUser, Roles.Admin);
        await CreateUserAsync(ManagerUser, Roles.Manager);
        await CreateUserAsync(SalesmanUser, Roles.Salesman);
    }

    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
        await _db.DisposeAsync();
        if (Directory.Exists(PhotoFolder)) Directory.Delete(PhotoFolder, recursive: true);
    }

    public async Task<AppUser> CreateUserAsync(string userName, string role)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var branch = await db.Branches.FirstAsync();
        var user = new AppUser { UserName = userName, FullName = $"Test {role}", BranchId = branch.Id };
        var result = await users.CreateAsync(user, Password);
        Assert.True(result.Succeeded, string.Join("; ", result.Errors.Select(e => e.Code)));
        await users.AddToRoleAsync(user, role);
        return user;
    }

    public async Task<HttpClient> SignInAsync(string userName, string? password = null)
    {
        var client = Factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/sign-in", new { userName, password = password ?? Password });
        response.EnsureSuccessStatusCode();
        return client;
    }

    public async Task<T> WithDbAsync<T>(Func<AppDbContext, Task<T>> work)
    {
        using var scope = Factory.Services.CreateScope();
        return await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    public static string UniqueName(string prefix) => $"{prefix}-{Guid.NewGuid().ToString("N")[..8]}";
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFixture>
{
    public const string Name = "api";
}
