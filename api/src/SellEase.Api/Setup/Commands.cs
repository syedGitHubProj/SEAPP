using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Setup;

/// <summary>
/// One-off tasks run from the command line instead of starting the web server:
///   migrate                         apply database changes and reference data
///   seed-dev                        add sample staff accounts (Development only)
///   create-admin USERNAME "NAME"    create an Admin; the password is typed in, never passed as an argument
/// </summary>
public static class Commands
{
    public static bool IsCommand(string[] args) =>
        args.Length > 0 && args[0] is "migrate" or "seed-dev" or "create-admin";

    public static async Task<int> RunAsync(WebApplication app, string[] args)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;

        switch (args[0])
        {
            case "migrate":
                await DatabaseSetup.RunAsync(services);
                Console.WriteLine("Database is up to date.");
                return 0;

            case "seed-dev":
                if (!app.Environment.IsDevelopment())
                {
                    Console.Error.WriteLine("seed-dev only runs in Development.");
                    return 1;
                }
                await DatabaseSetup.RunAsync(services);
                await DevSeed.RunAsync(services, app.Configuration);
                Console.WriteLine("Sample staff accounts are ready (see appsettings.Development.json).");
                return 0;

            case "create-admin" when args.Length >= 3:
                return await CreateAdminAsync(services, args[1], args[2]);

            default:
                Console.Error.WriteLine("Usage: create-admin USERNAME \"FULL NAME\"");
                return 1;
        }
    }

    private static async Task<int> CreateAdminAsync(IServiceProvider services, string userName, string fullName)
    {
        var password = ReadHidden("Password: ");
        if (password != ReadHidden("Type it again: "))
        {
            Console.Error.WriteLine("The passwords do not match.");
            return 1;
        }

        var db = services.GetRequiredService<AppDbContext>();
        var users = services.GetRequiredService<UserManager<AppUser>>();
        var branch = await db.Branches.OrderBy(b => b.Code).FirstAsync();
        var user = new AppUser { UserName = UserNames.Normalize(userName), FullName = fullName, BranchId = branch.Id };

        var result = await users.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            foreach (var e in result.Errors) Console.Error.WriteLine(e.Description);
            return 1;
        }
        await users.AddToRoleAsync(user, Roles.Admin);
        Console.WriteLine($"Admin '{user.UserName}' created.");
        return 0;
    }

    private static string ReadHidden(string prompt)
    {
        Console.Write(prompt);
        if (Console.IsInputRedirected) return Console.ReadLine() ?? "";

        var text = new StringBuilder();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter) break;
            if (key.Key == ConsoleKey.Backspace) { if (text.Length > 0) text.Length--; }
            else if (!char.IsControl(key.KeyChar)) text.Append(key.KeyChar);
        }
        Console.WriteLine();
        return text.ToString();
    }
}
