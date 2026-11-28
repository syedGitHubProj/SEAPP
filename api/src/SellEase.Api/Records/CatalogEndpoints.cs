using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Records;

/// <summary>
/// The catalogue: every role can view it; Manager and Admin add and edit categories, their items,
/// designs and other items. Records are switched off rather than deleted, because old Sale Orders
/// refer to them. Prices are sent only to roles that may see them; a Salesman gets null and agrees
/// the price with the customer.
/// </summary>
public static class CatalogEndpoints
{
    public sealed record CategoryItemDto(Guid Id, string Name, int SortOrder, bool IsActive, uint Version);
    public sealed record CategoryDto(Guid Id, string Name, int SortOrder, bool IsActive, uint Version, CategoryItemDto[] Items);
    public sealed record CategoryInput(string Name, int SortOrder, bool IsActive = true, uint Version = 0);
    public sealed record CategoryItemInput(string Name, int SortOrder, bool IsActive = true, uint Version = 0);

    public sealed record MaterialDto(Guid? Id, string Name, decimal Surcharge);
    public sealed record MaterialView(Guid? Id, string Name, decimal? Surcharge);
    public sealed record ColorDto(Guid? Id, string Name, string Hex);
    public sealed record PhotoDto(Guid Id, string Url);
    /// <summary>An item a design offers. <c>IsActive</c> is false when the category item was switched off.</summary>
    public sealed record DesignItemView(Guid Id, Guid CategoryItemId, string Name, decimal? Price, bool IsDefault, bool IsActive);
    public sealed record DesignItemInput(Guid? Id, Guid CategoryItemId, decimal Price, bool IsDefault);

    public sealed record DesignDto(
        Guid Id, string Code, string Name, Guid CategoryId, string? Description,
        MaterialView[] Materials, ColorDto[] Colors, DesignItemView[] Items,
        bool IsActive, uint Version, PhotoDto[] Photos);

    public sealed record DesignInput(
        string Code, string Name, Guid CategoryId, string? Description,
        MaterialDto[]? Materials, ColorDto[]? Colors, DesignItemInput[]? Items,
        bool IsActive = true, uint Version = 0);

    public sealed record OtherItemDto(Guid Id, string Name, decimal? Price, int SortOrder, bool IsActive, uint Version);
    public sealed record OtherItemInput(string Name, decimal Price, int SortOrder, bool IsActive = true, uint Version = 0);

    private static CategoryItemDto ToDto(CategoryItem i) => new(i.Id, i.Name, i.SortOrder, i.IsActive, i.Version);

    private static CategoryDto ToDto(Category c, bool includeInactiveItems) => new(
        c.Id, c.Name, c.SortOrder, c.IsActive, c.Version,
        c.Items.Where(i => includeInactiveItems || i.IsActive).OrderBy(i => i.SortOrder).ThenBy(i => i.Name).Select(ToDto).ToArray());

    private static OtherItemDto ToDto(OtherItem i, bool prices) => new(i.Id, i.Name, prices ? i.Price : null, i.SortOrder, i.IsActive, i.Version);

    public static PhotoDto ToDto(DesignPhoto p) => new(p.Id, $"/api/catalog/photos/{p.Id}");

    /// <summary>
    /// Builds what the screen shows for designs. Item names come from the category's item list.
    /// Items whose category item was switched off are left out unless <paramref name="editor"/>.
    /// </summary>
    private static async Task<List<DesignDto>> ToDtosAsync(AppDbContext db, IReadOnlyCollection<Design> designs, bool prices, bool editor)
    {
        var itemIds = designs.SelectMany(d => d.Items).Select(i => i.CategoryItemId).Distinct().ToList();
        var names = await db.CategoryItems.AsNoTracking().Where(i => itemIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id, i => (i.Name, i.IsActive));
        return designs.Select(d => new DesignDto(
            d.Id, d.Code, d.Name, d.CategoryId, d.Description,
            d.Materials.OrderBy(m => m.SortOrder).Select(m => new MaterialView(m.Id, m.Name, prices ? m.Surcharge : null)).ToArray(),
            d.Colors.OrderBy(c => c.SortOrder).Select(c => new ColorDto(c.Id, c.Name, c.Hex)).ToArray(),
            d.Items.OrderBy(i => i.SortOrder)
                .Select(i => (i, info: names.GetValueOrDefault(i.CategoryItemId, ("?", false))))
                .Where(x => editor || x.info.Item2)
                .Select(x => new DesignItemView(x.i.Id, x.i.CategoryItemId, x.info.Item1, prices ? x.i.Price : null, x.i.IsDefault, x.info.Item2))
                .ToArray(),
            d.IsActive, d.Version,
            d.Photos.OrderBy(p => p.SortOrder).Select(ToDto).ToArray())).ToList();
    }

    private static async Task<DesignDto> ToDtoAsync(AppDbContext db, Design d, bool prices, bool editor) =>
        (await ToDtosAsync(db, [d], prices, editor))[0];

    private static bool CanEdit(ClaimsPrincipal user) => Permissions.RolesWith(Permissions.CatalogEdit).Any(user.IsInRole);
    private static bool SeesPrices(ClaimsPrincipal user) => Permissions.RolesWith(Permissions.CatalogPrices).Any(user.IsInRole);

    private static IQueryable<Design> WithOptions(AppDbContext db) =>
        db.Designs.Include(d => d.Materials).Include(d => d.Colors).Include(d => d.Items).Include(d => d.Photos).AsSplitQuery();

    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var view = app.MapGroup("/api/catalog").RequireAuthorization(Permissions.CatalogView);
        var edit = app.MapGroup("/api/catalog").RequireAuthorization(Permissions.CatalogEdit);

        // ── Categories and their items ──────────────────────────────────────
        view.MapGet("/categories", async (AppDbContext db, ClaimsPrincipal user, bool? includeInactive) =>
        {
            var all = includeInactive == true && CanEdit(user);
            var query = db.Categories.Include(c => c.Items).AsNoTracking();
            if (!all) query = query.Where(c => c.IsActive);
            return (await query.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync()).Select(c => ToDto(c, all));
        });

        edit.MapPost("/categories", async (CategoryInput input, AppDbContext db) =>
        {
            var v = new Validator().Required("name", input.Name, 100);
            if (!v.IsValid) return v.Problem();
            var category = new Category { Name = input.Name.Trim(), SortOrder = input.SortOrder };
            db.Categories.Add(category);
            return await db.SaveOrConflictAsync() ?? Results.Created($"/api/catalog/categories/{category.Id}", ToDto(category, true));
        });

        edit.MapPut("/categories/{id:guid}", async (Guid id, CategoryInput input, AppDbContext db) =>
        {
            var v = new Validator().Required("name", input.Name, 100);
            if (!v.IsValid) return v.Problem();
            var category = await db.Categories.Include(c => c.Items).FirstOrDefaultAsync(c => c.Id == id);
            if (category is null) return Results.NotFound();

            db.ExpectVersion(category, input.Version);
            category.Name = input.Name.Trim();
            category.SortOrder = input.SortOrder;
            category.IsActive = input.IsActive;
            return await db.SaveOrConflictAsync() ?? Results.Ok(ToDto(category, true));
        });

        edit.MapPost("/categories/{id:guid}/items", async (Guid id, CategoryItemInput input, AppDbContext db) =>
        {
            var v = new Validator().Required("name", input.Name, 100);
            if (!v.IsValid) return v.Problem();
            if (!await db.Categories.AnyAsync(c => c.Id == id)) return Results.NotFound();
            var item = new CategoryItem { CategoryId = id, Name = input.Name.Trim(), SortOrder = input.SortOrder };
            db.CategoryItems.Add(item);
            return await db.SaveOrConflictAsync() ?? Results.Created($"/api/catalog/category-items/{item.Id}", ToDto(item));
        });

        edit.MapPut("/category-items/{id:guid}", async (Guid id, CategoryItemInput input, AppDbContext db) =>
        {
            var v = new Validator().Required("name", input.Name, 100);
            if (!v.IsValid) return v.Problem();
            var item = await db.CategoryItems.FindAsync(id);
            if (item is null) return Results.NotFound();

            db.ExpectVersion(item, input.Version);
            item.Name = input.Name.Trim();
            item.SortOrder = input.SortOrder;
            item.IsActive = input.IsActive;
            return await db.SaveOrConflictAsync() ?? Results.Ok(ToDto(item));
        });

        // ── Designs ─────────────────────────────────────────────────────────
        view.MapGet("/designs", async (AppDbContext db, ClaimsPrincipal user, Guid? categoryId, string? q, bool? includeInactive) =>
        {
            var editor = CanEdit(user);
            var query = WithOptions(db).AsNoTracking();
            if (includeInactive != true || !editor) query = query.Where(d => d.IsActive);
            if (categoryId is not null) query = query.Where(d => d.CategoryId == categoryId);
            if (!string.IsNullOrWhiteSpace(q))
            {
                var text = $"%{q.Trim()}%";
                query = query.Where(d => EF.Functions.ILike(d.Name, text) || EF.Functions.ILike(d.Code, text));
            }
            return await ToDtosAsync(db, await query.OrderBy(d => d.Code).ToListAsync(), SeesPrices(user), editor);
        });

        view.MapGet("/designs/{code}", async (string code, AppDbContext db, ClaimsPrincipal user) =>
        {
            var normalized = code.Trim().ToUpperInvariant();
            var editor = CanEdit(user);
            var design = await WithOptions(db).AsNoTracking().FirstOrDefaultAsync(d => d.Code == normalized);
            return design is null || (!design.IsActive && !editor)
                ? Results.NotFound()
                : Results.Ok(await ToDtoAsync(db, design, SeesPrices(user), editor));
        });

        edit.MapPost("/designs", async (DesignInput input, AppDbContext db) =>
        {
            if (await ValidateAsync(input, db) is { IsValid: false } v) return v.Problem();
            var design = new Design { Code = "", Name = "" };
            Apply(design, input, db);
            db.Designs.Add(design);
            return await db.SaveOrConflictAsync()
                ?? Results.Created($"/api/catalog/designs/{design.Code}", await ToDtoAsync(db, design, prices: true, editor: true));
        });

        edit.MapPut("/designs/{id:guid}", async (Guid id, DesignInput input, AppDbContext db) =>
        {
            if (await ValidateAsync(input, db) is { IsValid: false } v) return v.Problem();
            var design = await WithOptions(db).FirstOrDefaultAsync(d => d.Id == id);
            if (design is null) return Results.NotFound();

            db.ExpectVersion(design, input.Version);
            Apply(design, input, db);
            design.IsActive = input.IsActive;
            return await db.SaveOrConflictAsync() ?? Results.Ok(await ToDtoAsync(db, design, prices: true, editor: true));
        });

        // ── Other items (sold without a design) ─────────────────────────────
        view.MapGet("/other-items", async (AppDbContext db, ClaimsPrincipal user, bool? includeInactive) =>
        {
            var query = db.OtherItems.AsNoTracking();
            if (includeInactive != true || !CanEdit(user)) query = query.Where(i => i.IsActive);
            var prices = SeesPrices(user);
            return (await query.OrderBy(i => i.SortOrder).ThenBy(i => i.Name).ToListAsync()).Select(i => ToDto(i, prices));
        });

        edit.MapPost("/other-items", async (OtherItemInput input, AppDbContext db) =>
        {
            var v = new Validator().Required("name", input.Name, 200).Money("price", input.Price);
            if (!v.IsValid) return v.Problem();
            var item = new OtherItem { Name = input.Name.Trim(), Price = input.Price, SortOrder = input.SortOrder };
            db.OtherItems.Add(item);
            return await db.SaveOrConflictAsync() ?? Results.Created($"/api/catalog/other-items/{item.Id}", ToDto(item, true));
        });

        edit.MapPut("/other-items/{id:guid}", async (Guid id, OtherItemInput input, AppDbContext db) =>
        {
            var v = new Validator().Required("name", input.Name, 200).Money("price", input.Price);
            if (!v.IsValid) return v.Problem();
            var item = await db.OtherItems.FindAsync(id);
            if (item is null) return Results.NotFound();

            db.ExpectVersion(item, input.Version);
            item.Name = input.Name.Trim();
            item.Price = input.Price;
            item.SortOrder = input.SortOrder;
            item.IsActive = input.IsActive;
            return await db.SaveOrConflictAsync() ?? Results.Ok(ToDto(item, true));
        });
    }

    private static async Task<Validator> ValidateAsync(DesignInput input, AppDbContext db)
    {
        var v = new Validator()
            .Required("code", input.Code, 20)
            .Required("name", input.Name, 200)
            .Optional("description", input.Description, 2000);

        if (!await db.Categories.AnyAsync(c => c.Id == input.CategoryId)) v.Add("categoryId", "unknownCategory");

        foreach (var (m, i) in (input.Materials ?? []).Select((m, i) => (m, i)))
            v.Required($"materials[{i}].name", m.Name, 100).Money($"materials[{i}].surcharge", m.Surcharge);
        foreach (var (c, i) in (input.Colors ?? []).Select((c, i) => (c, i)))
        {
            v.Required($"colors[{i}].name", c.Name, 100);
            if (!Validator.IsHexColor(c.Hex)) v.Add($"colors[{i}].hex", "invalidColor");
        }

        // A design offers at least one item, each from its own category's list, each once.
        var items = input.Items ?? [];
        if (items.Length == 0) v.Add("items", "required");
        var allowed = (await db.CategoryItems.Where(ci => ci.CategoryId == input.CategoryId).Select(ci => ci.Id).ToListAsync()).ToHashSet();
        var seen = new HashSet<Guid>();
        foreach (var (item, i) in items.Select((item, i) => (item, i)))
        {
            v.Money($"items[{i}].price", item.Price);
            if (!allowed.Contains(item.CategoryItemId)) v.Add($"items[{i}].categoryItemId", "unknownItem");
            else if (!seen.Add(item.CategoryItemId)) v.Add($"items[{i}].categoryItemId", "duplicate");
        }
        return v;
    }

    private static void Apply(Design d, DesignInput input, AppDbContext db)
    {
        d.Code = input.Code.Trim().ToUpperInvariant();
        d.Name = input.Name.Trim();
        d.CategoryId = input.CategoryId;
        d.Description = Validator.Clean(input.Description);

        Sync(db, d.Materials, input.Materials, m => m.Id, () => new DesignMaterial { Name = "" },
            (o, m) => { o.Name = m.Name.Trim(); o.Surcharge = m.Surcharge; });
        Sync(db, d.Colors, input.Colors, c => c.Id, () => new DesignColor { Name = "", Hex = "" },
            (o, c) => { o.Name = c.Name.Trim(); o.Hex = c.Hex.ToLowerInvariant(); });
        Sync(db, d.Items, input.Items, i => i.Id, () => new DesignItem(),
            (o, i) => { o.CategoryItemId = i.CategoryItemId; o.Price = i.Price; o.IsDefault = i.IsDefault; });
    }

    /// <summary>
    /// Makes a design's list (materials, colours, items) match what was sent: rows with a known id
    /// are updated, new ones added, and ones left out removed. Each change shows separately in the audit log.
    /// </summary>
    private static void Sync<TRow, TInput>(
        AppDbContext db, List<TRow> existing, TInput[]? inputs, Func<TInput, Guid?> idOf,
        Func<TRow> create, Action<TRow, TInput> apply) where TRow : class, IOrderedRow
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
            var row = existing.FirstOrDefault(o => o.Id == idOf(inputs[i]));
            if (row is null)
            {
                row = create();
                existing.Add(row);
            }
            apply(row, inputs[i]);
            row.SortOrder = i;
        }
    }
}
