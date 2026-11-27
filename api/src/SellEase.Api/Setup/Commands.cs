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
///   seed-dev                        sample staff accounts + demo data (Development only)
///   load-demo                       demo customers, factories and designs, no staff (Development or Staging)
///   wipe-staging                    delete everything and start again with only the basics (Staging only)
///   create-admin USERNAME "NAME"    create an Admin; the password is typed in, never passed as an argument
/// </summary>
public static class Commands
{
    public static bool IsCommand(string[] args) =>
        args.Length > 0 && args[0] is "migrate" or "seed-dev" or "load-demo" or "wipe-staging" or "create-admin";

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
                Console.WriteLine("Sample staff, customers, factories and designs are ready (password in appsettings.Development.json).");
                return 0;

            case "load-demo":
                if (!DemoData.IsAllowed(app.Environment))
                {
                    Console.Error.WriteLine($"load-demo is not allowed here ({app.Environment.EnvironmentName}). Only on staging or a developer's computer.");
                    return 1;
                }
                await DatabaseSetup.RunAsync(services);
                await DemoData.RunAsync(services.GetRequiredService<AppDbContext>(), services.GetRequiredService<SellEase.Api.Common.NumberSequences>());
                Console.WriteLine("Demo customers, factories and designs are loaded (no staff accounts).");
                return 0;

            case "wipe-staging":
                if (!app.Environment.IsStaging())
                {
                    Console.Error.WriteLine($"wipe-staging only runs on staging (this is {app.Environment.EnvironmentName}). Nothing was changed.");
                    return 1;
                }
                var db = services.GetRequiredService<AppDbContext>();
                await db.Database.EnsureDeletedAsync();
                await DatabaseSetup.RunAsync(services);
                Console.WriteLine("Staging is wiped and back to the basics. Create the Admin account again with create-admin.");
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
