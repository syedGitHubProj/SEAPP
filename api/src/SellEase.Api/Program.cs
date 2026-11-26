var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

// Simple liveness check used by Docker, Caddy and uptime monitoring.
app.MapGet("/health", () => Results.Ok(new { status = "ok", app = "SellEase" }));

app.Run();

// Lets the integration tests start the API in memory.
public partial class Program;
