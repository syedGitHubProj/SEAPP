using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Records;

/// <summary>
/// The catalogue: every role can view it; Manager and Admin add and edit categories and designs.
/// Designs are switched off rather than deleted, because old Sale Orders refer to them.
/// Prices are sent only to roles that may see them; a Salesman gets null and agrees the price with the customer.
/// </summary>
public static class CatalogEndpoints
{
    public sealed record CategoryDto(Guid Id, string Name, int SortOrder, bool IsActive, uint Version);
    public sealed record CategoryInput(string Name, int SortOrder, bool IsActive = true, uint Version = 0);

    public sealed record MaterialDto(Guid? Id, string Name, decimal Surcharge);
    public sealed record MaterialView(Guid? Id, string Name, decimal? Surcharge);
    public sealed record ColorDto(Guid? Id, string Name, string Hex);
    public sealed record AccessoryDto(Guid? Id, string Name, decimal Price);
    public sealed record AccessoryView(Guid? Id, string Name, decimal? Price);
    public sealed record PhotoDto(Guid Id, string Url);

    public sealed record DesignDto(
        Guid Id, string Code, string Name, Guid CategoryId, decimal? BasePrice,
        string? Dimensions, string? Wood, string? Description,
        MaterialView[] Materials, ColorDto[] Colors, AccessoryView[] Accessories,
        bool IsActive, uint Version, PhotoDto[] Photos);

    public sealed record DesignInput(
        string Code, string Name, Guid CategoryId, decimal BasePrice,
        string? Dimensions, string? Wood, string? Description,
        MaterialDto[]? Materials, ColorDto[]? Colors, AccessoryDto[]? Accessories,
        bool IsActive = true, uint Version = 0);

    private static CategoryDto ToDto(Category c) => new(c.Id, c.Name, c.SortOrder, c.IsActive, c.Version);

    private static DesignDto ToDto(Design d, bool prices) => new(
        d.Id, d.Code, d.Name, d.CategoryId, prices ? d.BasePrice : null, d.Dimensions, d.Wood, d.Description,
        d.Materials.OrderBy(m => m.SortOrder).Select(m => new MaterialView(m.Id, m.Name, prices ? m.Surcharge : null)).ToArray(),
        d.Colors.OrderBy(c => c.SortOrder).Select(c => new ColorDto(c.Id, c.Name, c.Hex)).ToArray(),
        d.Accessories.OrderBy(a => a.SortOrder).Select(a => new AccessoryView(a.Id, a.Name, prices ? a.Price : null)).ToArray(),
        d.IsActive, d.Version,
        d.Photos.OrderBy(p => p.SortOrder).Select(ToDto).ToArray());

    public static PhotoDto ToDto(DesignPhoto p) => new(p.Id, $"/api/catalog/photos/{p.Id}");

    private static bool CanEdit(ClaimsPrincipal user) => Permissions.RolesWith(Permissions.CatalogEdit).Any(user.IsInRole);
    private static bool SeesPrices(ClaimsPrincipal user) => Permissions.RolesWith(Permissions.CatalogPrices).Any(user.IsInRole);

    private static IQueryable<Design> WithOptions(AppDbContext db) =>
        db.Designs.Include(d => d.Materials).Include(d => d.Colors).Include(d => d.Accessories).Include(d => d.Photos).AsSplitQuery();

    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var view = app.MapGroup("/api/catalog").RequireAuthorization(Permissions.CatalogView);
        var edit = app.MapGroup("/api/catalog").RequireAuthorization(Permissions.CatalogEdit);

        // ── Categories ──────────────────────────────────────────────────────
        view.MapGet("/categories", async (AppDbContext db, ClaimsPrincipal user, bool? includeInactive) =>
        {
            var query = db.Categories.AsNoTracking();
            if (includeInactive != true || !CanEdit(user)) query = query.Where(c => c.IsActive);
            return (await query.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync()).Select(ToDto);
        });

        edit.MapPost("/categories", async (CategoryInput input, AppDbContext db) =>
        {
            var v = new Validator().Required("name", input.Name, 100);
            if (!v.IsValid) return v.Problem();
            var category = new Category { Name = input.Name.Trim(), SortOrder = input.SortOrder };
            db.Categories.Add(category);
            return await db.SaveOrConflictAsync() ?? Results.Created($"/api/catalog/categories/{category.Id}", ToDto(category));
        });

        edit.MapPut("/categories/{id:guid}", async (Guid id, CategoryInput input, AppDbContext db) =>
        {
            var v = new Validator().Required("name", input.Name, 100);
            if (!v.IsValid) return v.Problem();
            var category = await db.Categories.FindAsync(id);
            if (category is null) return Results.NotFound();

            db.ExpectVersion(category, input.Version);
            category.Name = input.Name.Trim();
            category.SortOrder = input.SortOrder;
            category.IsActive = input.IsActive;
            return await db.SaveOrConflictAsync() ?? Results.Ok(ToDto(category));
        });

        // ── Designs ─────────────────────────────────────────────────────────
        view.MapGet("/designs", async (AppDbContext db, ClaimsPrincipal user, Guid? categoryId, string? q, bool? includeInactive) =>
        {
            var query = WithOptions(db).AsNoTracking();
            if (includeInactive != true || !CanEdit(user)) query = query.Where(d => d.IsActive);
            if (categoryId is not null) query = query.Where(d => d.CategoryId == categoryId);
            if (!string.IsNullOrWhiteSpace(q))
            {
                var text = $"%{q.Trim()}%";
                query = query.Where(d => EF.Functions.ILike(d.Name, text) || EF.Functions.ILike(d.Code, text));
            }
            var prices = SeesPrices(user);
            return (await query.OrderBy(d => d.Code).ToListAsync()).Select(d => ToDto(d, prices));
        });

        view.MapGet("/designs/{code}", async (string code, AppDbContext db, ClaimsPrincipal user) =>
        {
            var normalized = code.Trim().ToUpperInvariant();
            var design = await WithOptions(db).AsNoTracking().FirstOrDefaultAsync(d => d.Code == normalized);
            return design is null || (!design.IsActive && !CanEdit(user)) ? Results.NotFound() : Results.Ok(ToDto(design, SeesPrices(user)));
        });

        edit.MapPost("/designs", async (DesignInput input, AppDbContext db) =>
        {
            if (await ValidateAsync(input, db) is { IsValid: false } v) return v.Problem();
            var design = new Design { Code = "", Name = "" };
            Apply(design, input, db);
            db.Designs.Add(design);
            return await db.SaveOrConflictAsync() ?? Results.Created($"/api/catalog/designs/{design.Code}", ToDto(design, prices: true));
        });

        edit.MapPut("/designs/{id:guid}", async (Guid id, DesignInput input, AppDbContext db) =>
        {
            if (await ValidateAsync(input, db) is { IsValid: false } v) return v.Problem();
            var design = await WithOptions(db).FirstOrDefaultAsync(d => d.Id == id);
            if (design is null) return Results.NotFound();

            db.ExpectVersion(design, input.Version);
            Apply(design, input, db);
            design.IsActive = input.IsActive;
            return await db.SaveOrConflictAsync() ?? Results.Ok(ToDto(design, prices: true));
        });
    }

    private static async Task<Validator> ValidateAsync(DesignInput input, AppDbContext db)
    {
        var v = new Validator()
            .Required("code", input.Code, 20)
            .Required("name", input.Name, 200)
            .Money("basePrice", input.BasePrice)
            .Optional("dimensions", input.Dimensions, 200)
            .Optional("wood", input.Wood, 100)
            .Optional("description", input.Description, 2000);

        if (!await db.Categories.AnyAsync(c => c.Id == input.CategoryId)) v.Add("categoryId", "unknownCategory");

        foreach (var (m, i) in (input.Materials ?? []).Select((m, i) => (m, i)))
            v.Required($"materials[{i}].name", m.Name, 100).Money($"materials[{i}].surcharge", m.Surcharge);
        foreach (var (c, i) in (input.Colors ?? []).Select((c, i) => (c, i)))
        {
            v.Required($"colors[{i}].name", c.Name, 100);
            if (!Validator.IsHexColor(c.Hex)) v.Add($"colors[{i}].hex", "invalidColor");
        }
        foreach (var (a, i) in (input.Accessories ?? []).Select((a, i) => (a, i)))
            v.Required($"accessories[{i}].name", a.Name, 100).Money($"accessories[{i}].price", a.Price);
        return v;
    }

    private static void Apply(Design d, DesignInput input, AppDbContext db)
    {
        d.Code = input.Code.Trim().ToUpperInvariant();
        d.Name = input.Name.Trim();
        d.CategoryId = input.CategoryId;
        d.BasePrice = input.BasePrice;
        d.Dimensions = Validator.Clean(input.Dimensions);
        d.Wood = Validator.Clean(input.Wood);
        d.Description = Validator.Clean(input.Description);

        Sync(db, d.Materials, input.Materials, m => m.Id, () => new DesignMaterial { Name = "" },
            (o, m) => { o.Name = m.Name.Trim(); o.Surcharge = m.Surcharge; });
        Sync(db, d.Colors, input.Colors, c => c.Id, () => new DesignColor { Name = "", Hex = "" },
            (o, c) => { o.Name = c.Name.Trim(); o.Hex = c.Hex.ToLowerInvariant(); });
        Sync(db, d.Accessories, input.Accessories, a => a.Id, () => new DesignAccessory { Name = "" },
            (o, a) => { o.Name = a.Name.Trim(); o.Price = a.Price; });
    }

    /// <summary>
    /// Makes a design's option list match what was sent: options with a known id are updated,
    /// new ones added, and ones left out removed. Each change shows separately in the audit log.
    /// </summary>
    private static void Sync<TOption, TInput>(
        AppDbContext db, List<TOption> existing, TInput[]? inputs, Func<TInput, Guid?> idOf,
        Func<TOption> create, Action<TOption, TInput> apply) where TOption : DesignOption
    {
        inputs ??= [];
        var keep = inputs.Select(idOf).Where(id => id is not null).ToHashSet();
        foreach (var removed in existing.Where(o => !keep.Contains(o.Id)).ToList())
        {
            existing.Remove(removed);
            db.Remove(removed);
        }

        for (var i = 0; i < inputs.Length; i++)
        {
            var option = existing.FirstOrDefault(o => o.Id == idOf(inputs[i]));
            if (option is null)
            {
                option = create();
                existing.Add(option);
            }
            apply(option, inputs[i]);
            option.SortOrder = i;
        }
    }
}
