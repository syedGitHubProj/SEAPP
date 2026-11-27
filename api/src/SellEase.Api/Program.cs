using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Admin;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;
using SellEase.Api.Setup;

var builder = WebApplication.CreateBuilder(args);

// ── Database ────────────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<AuditInterceptor>();
builder.Services.AddScoped<AuditLog>();
builder.Services.AddScoped<NumberSequences>();
builder.Services.AddDbContext<AppDbContext>((sp, options) => options
    .UseNpgsql(builder.Configuration.GetConnectionString("Default"))
    .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));

// ── Sign-in (username or phone number + password, cookie session) ───────────
builder.Services
    .AddIdentityCore<AppUser>(o =>
    {
        o.Password.RequiredLength = 8;
        o.Password.RequireNonAlphanumeric = false;
        o.Password.RequireUppercase = false;
        o.Password.RequireLowercase = false;
        o.Lockout.MaxFailedAccessAttempts = 5;
        o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        o.User.RequireUniqueEmail = false;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
builder.Services.ConfigureApplicationCookie(o =>
{
    o.Cookie.Name = "sellease_session";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Lax;
    o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    o.ExpireTimeSpan = TimeSpan.FromHours(12);
    o.SlidingExpiration = true;
    // An API answers 401/403 instead of redirecting to a login page.
    o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
});
// A deactivated user or changed role takes effect within a minute.
builder.Services.Configure<SecurityStampValidatorOptions>(o => o.ValidationInterval = TimeSpan.FromMinutes(1));

builder.Services.AddAuthorization(o =>
{
    foreach (var permission in Permissions.All)
        o.AddPolicy(permission, p => p.RequireRole(Permissions.RolesWith(permission)));
    // Everything needs a signed-in user unless an endpoint says otherwise.
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

var app = builder.Build();

if (Commands.IsCommand(args))
{
    Environment.ExitCode = await Commands.RunAsync(app, args);
    return;
}

app.UseAuthentication();
app.UseAuthorization();

// Simple liveness check used by Docker, Caddy and uptime monitoring.
app.MapGet("/health", () => Results.Ok(new { status = "ok", app = "SellEase" })).AllowAnonymous();
app.MapAuthEndpoints();
app.MapAdminEndpoints();

app.Run();

// Lets the integration tests start the API in memory.
public partial class Program;
