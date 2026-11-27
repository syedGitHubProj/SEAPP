using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Admin;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Photos;
using SellEase.Api.Records;
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

builder.Services.AddPhotoStore(builder.Configuration, builder.Environment.ContentRootPath);

// ── Running behind Caddy on a server ───────────────────────────────────────
// Caddy handles HTTPS and passes the original scheme on. The API is only reachable from inside the
// server's Docker network, so the forwarded headers can be trusted.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});
// The keys that protect sign-in cookies are kept on disk, so people stay signed in after a redeploy.
var keysPath = builder.Configuration["DataProtection:KeysPath"];
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("SellEase");
if (!string.IsNullOrWhiteSpace(keysPath)) dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keysPath));
var onServer = builder.Environment.IsProduction() || builder.Environment.IsStaging();

// ── Sign-in (username or phone number + password, cookie session) ───────────
builder.Services
    .AddIdentityCore<AppUser>(o =>
    {
        // Staff-friendly: at least 8 characters, nothing else required (the screens say the same).
        o.Password.RequiredLength = 8;
        o.Password.RequireDigit = false;
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
    // On a server the cookie only ever travels over HTTPS.
    o.Cookie.SecurePolicy = onServer ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
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

app.UseForwardedHeaders();
app.UseAuthentication();
app.UseAuthorization();

// Simple liveness check used by Docker, Caddy and uptime monitoring.
app.MapGet("/health", () => Results.Ok(new { status = "ok", app = "SellEase" })).AllowAnonymous();
app.MapAuthEndpoints();
app.MapAdminEndpoints();
app.MapCustomerEndpoints();
app.MapFactoryEndpoints();
app.MapCatalogEndpoints();
app.MapPhotoEndpoints();

app.Run();

// Lets the integration tests start the API in memory.
public partial class Program;
