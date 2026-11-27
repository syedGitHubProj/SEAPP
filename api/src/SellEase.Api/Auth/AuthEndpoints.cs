using Microsoft.AspNetCore.Identity;
using SellEase.Api.Domain;

namespace SellEase.Api.Auth;

public static class AuthEndpoints
{
    public sealed record SignInRequest(string UserName, string Password);

    public sealed record MeResponse(Guid Id, string UserName, string FullName, string Role, string[] Permissions);

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth");

        auth.MapPost("/sign-in", async (SignInRequest req, UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            var user = await users.FindByNameAsync(UserNames.Normalize(req.UserName ?? ""));
            if (user is null || !user.IsActive)
                return Results.Json(new { error = "invalidCredentials" }, statusCode: StatusCodes.Status401Unauthorized);

            var result = await signIn.PasswordSignInAsync(user, req.Password ?? "", isPersistent: false, lockoutOnFailure: true);
            if (result.IsLockedOut)
                return Results.Json(new { error = "lockedOut" }, statusCode: StatusCodes.Status401Unauthorized);
            if (!result.Succeeded)
                return Results.Json(new { error = "invalidCredentials" }, statusCode: StatusCodes.Status401Unauthorized);

            return Results.Ok(await DescribeAsync(user, users));
        }).AllowAnonymous();

        auth.MapPost("/sign-out", async (SignInManager<AppUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return Results.NoContent();
        }).AllowAnonymous();

        auth.MapGet("/me", async (HttpContext http, UserManager<AppUser> users) =>
        {
            var user = await users.GetUserAsync(http.User);
            return user is null || !user.IsActive ? Results.Unauthorized() : Results.Ok(await DescribeAsync(user, users));
        }).RequireAuthorization();
    }

    private static async Task<MeResponse> DescribeAsync(AppUser user, UserManager<AppUser> users)
    {
        var roles = await users.GetRolesAsync(user);
        return new MeResponse(user.Id, user.UserName!, user.FullName, roles.FirstOrDefault() ?? "", Permissions.For(roles));
    }
}
