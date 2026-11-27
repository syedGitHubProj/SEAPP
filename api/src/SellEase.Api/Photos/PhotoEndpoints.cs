using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Data;
using SellEase.Api.Domain;
using SellEase.Api.Records;

namespace SellEase.Api.Photos;

/// <summary>
/// Design photos. Manager and Admin upload, reorder and remove them; everyone can view them.
/// A removed photo's file is kept in storage (only the link to the design is removed, and audited).
/// </summary>
public static class PhotoEndpoints
{
    public const int MaxPhotosPerDesign = 10;

    public sealed record ReorderRequest(Guid[] PhotoIds);

    public static void MapPhotoEndpoints(this IEndpointRouteBuilder app)
    {
        var edit = app.MapGroup("/api/catalog/designs/{designId:guid}/photos").RequireAuthorization(Permissions.CatalogEdit);

        edit.MapPost("/", async (Guid designId, IFormFile? file, AppDbContext db, IPhotoStore store, CancellationToken ct) =>
        {
            if (file is null || file.Length == 0) return Problem("file", "required");
            if (file.Length > ImageFiles.MaxBytes) return Problem("file", "tooLarge");

            var design = await db.Designs.Include(d => d.Photos).FirstOrDefaultAsync(d => d.Id == designId, ct);
            if (design is null) return Results.NotFound();
            if (design.Photos.Count >= MaxPhotosPerDesign) return Problem("file", "tooManyPhotos");

            var head = new byte[12];
            await using (var peek = file.OpenReadStream())
                await peek.ReadAtLeastAsync(head, head.Length, throwOnEndOfStream: false, ct);
            if (ImageFiles.Detect(head) is not { } type) return Problem("file", "notAPhoto");

            var photo = new DesignPhoto
            {
                Id = Guid.CreateVersion7(),
                DesignId = design.Id,
                StorageKey = "",
                ContentType = type.ContentType,
                SizeBytes = file.Length,
                SortOrder = design.Photos.Count == 0 ? 0 : design.Photos.Max(p => p.SortOrder) + 1,
            };
            photo.StorageKey = $"designs/{design.Id}/{photo.Id}.{type.Extension}";

            await using (var content = file.OpenReadStream())
                await store.SaveAsync(photo.StorageKey, content, type.ContentType, ct);

            db.Add(photo);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/catalog/photos/{photo.Id}", CatalogEndpoints.ToDto(photo));
        })
        // Uploads come from the SellEase website itself; the session cookie is SameSite=Lax,
        // so other sites cannot post with it.
        .DisableAntiforgery()
        .WithMetadata(new RequestSizeLimitAttribute(ImageFiles.MaxBytes + 1024 * 1024));

        edit.MapPut("/order", async (Guid designId, ReorderRequest req, AppDbContext db) =>
        {
            var photos = await db.Set<DesignPhoto>().Where(p => p.DesignId == designId).ToListAsync();
            if (!photos.Select(p => p.Id).ToHashSet().SetEquals(req.PhotoIds ?? []) || req.PhotoIds!.Length != photos.Count)
                return Problem("photoIds", "mustListEveryPhoto");

            for (var i = 0; i < req.PhotoIds.Length; i++)
                photos.Single(p => p.Id == req.PhotoIds[i]).SortOrder = i;
            await db.SaveChangesAsync();
            return Results.Ok(photos.OrderBy(p => p.SortOrder).Select(CatalogEndpoints.ToDto));
        });

        edit.MapDelete("/{photoId:guid}", async (Guid designId, Guid photoId, AppDbContext db) =>
        {
            var photo = await db.Set<DesignPhoto>().FirstOrDefaultAsync(p => p.Id == photoId && p.DesignId == designId);
            if (photo is null) return Results.NotFound();
            db.Remove(photo);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        app.MapGet("/api/catalog/photos/{photoId:guid}", async (Guid photoId, AppDbContext db, IPhotoStore store, HttpContext http, CancellationToken ct) =>
        {
            var photo = await db.Set<DesignPhoto>().AsNoTracking().FirstOrDefaultAsync(p => p.Id == photoId, ct);
            if (photo is null) return Results.NotFound();
            var stream = await store.OpenAsync(photo.StorageKey, ct);
            if (stream is null) return Results.NotFound();

            // A photo's file never changes (a new upload gets a new id), so browsers may keep it for a long time.
            http.Response.Headers.CacheControl = "private, max-age=2592000, immutable";
            return Results.Stream(stream, photo.ContentType);
        }).RequireAuthorization(Permissions.CatalogView);
    }

    private static IResult Problem(string field, string code) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [field] = [code] });
}
