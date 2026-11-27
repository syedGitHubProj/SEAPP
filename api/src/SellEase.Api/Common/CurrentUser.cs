using System.Security.Claims;

namespace SellEase.Api.Common;

public interface ICurrentUser
{
    Guid? Id { get; }
    string? UserName { get; }
}

/// <summary>The signed-in staff member for this request (empty for command-line tasks).</summary>
public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? Id =>
        Guid.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public string? UserName => Principal?.Identity?.IsAuthenticated == true ? Principal.Identity.Name : null;
}
