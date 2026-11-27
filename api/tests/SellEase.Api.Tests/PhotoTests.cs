using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using SellEase.Api.Photos;

namespace SellEase.Api.Tests;

[Collection(ApiCollection.Name)]
public class PhotoTests(ApiFixture api)
{
    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private static byte[] FakePng(int size = 2_000)
    {
        var bytes = new byte[size];
        Random.Shared.NextBytes(bytes);
        PngSignature.CopyTo(bytes, 0);
        return bytes;
    }

    private static MultipartFormDataContent Form(byte[] bytes, string fileName = "sofa.png", string contentType = "image/png")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { file, "file", fileName } };
    }

    private async Task<(HttpClient Manager, DesignDto Design)> NewDesignAsync()
    {
        var manager = await api.SignInAsync(ApiFixture.ManagerUser);
        var category = (await manager.GetFromJsonAsync<List<CategoryDto>>("/api/catalog/categories"))!.First();
        var response = await manager.PostAsJsonAsync("/api/catalog/designs",
            new { code = "P-" + Random.Shared.Next(10_000, 99_999), name = "Photo test", categoryId = category.Id, basePrice = 50_000m });
        return (manager, (await response.Content.ReadFromJsonAsync<DesignDto>())!);
    }

    private static async Task<PhotoDto> UploadAsync(HttpClient client, Guid designId, byte[]? bytes = null)
    {
        var response = await client.PostAsync($"/api/catalog/designs/{designId}/photos", Form(bytes ?? FakePng()));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<PhotoDto>())!;
    }

    [Fact]
    public async Task Manager_uploads_a_photo_and_a_salesman_sees_it()
    {
        var (manager, design) = await NewDesignAsync();
        var bytes = FakePng();

        var photo = await UploadAsync(manager, design.Id, bytes);

        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);
        var shown = await salesman.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{design.Code}");
        Assert.Equal(photo.Url, Assert.Single(shown!.Photos!).Url);

        var file = await salesman.GetAsync(photo.Url);
        Assert.Equal(HttpStatusCode.OK, file.StatusCode);
        Assert.Equal("image/png", file.Content.Headers.ContentType!.MediaType);
        Assert.Equal(bytes, await file.Content.ReadAsByteArrayAsync());
        Assert.Contains("immutable", file.Headers.CacheControl!.ToString());
    }

    [Fact]
    public async Task Salesman_cannot_upload_and_photos_need_sign_in()
    {
        var (manager, design) = await NewDesignAsync();
        var photo = await UploadAsync(manager, design.Id);
        var salesman = await api.SignInAsync(ApiFixture.SalesmanUser);

        Assert.Equal(HttpStatusCode.Forbidden,
            (await salesman.PostAsync($"/api/catalog/designs/{design.Id}/photos", Form(FakePng()))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.Factory.CreateClient().GetAsync(photo.Url)).StatusCode);
    }

    [Fact]
    public async Task Files_that_are_not_photos_empty_or_too_large_are_refused()
    {
        var (manager, design) = await NewDesignAsync();
        var url = $"/api/catalog/designs/{design.Id}/photos";

        var disguised = await manager.PostAsync(url, Form("not really a picture"u8.ToArray(), "sofa.jpg", "image/jpeg"));
        var empty = await manager.PostAsync(url, Form([]));
        var huge = await manager.PostAsync(url, Form(FakePng((int)ImageFiles.MaxBytes + 1)));

        Assert.Contains("notAPhoto", await disguised.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        Assert.Contains("tooLarge", await huge.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task At_most_ten_photos_per_design()
    {
        var (manager, design) = await NewDesignAsync();
        for (var i = 0; i < PhotoEndpoints.MaxPhotosPerDesign; i++) await UploadAsync(manager, design.Id);

        var eleventh = await manager.PostAsync($"/api/catalog/designs/{design.Id}/photos", Form(FakePng()));

        Assert.Contains("tooManyPhotos", await eleventh.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Photos_can_be_reordered_and_the_first_is_the_main_photo()
    {
        var (manager, design) = await NewDesignAsync();
        var first = await UploadAsync(manager, design.Id);
        var second = await UploadAsync(manager, design.Id);

        var reordered = await manager.PutAsJsonAsync($"/api/catalog/designs/{design.Id}/photos/order", new { photoIds = new[] { second.Id, first.Id } });
        var incomplete = await manager.PutAsJsonAsync($"/api/catalog/designs/{design.Id}/photos/order", new { photoIds = new[] { second.Id } });

        Assert.Equal(HttpStatusCode.OK, reordered.StatusCode);
        Assert.Contains("mustListEveryPhoto", await incomplete.Content.ReadAsStringAsync());
        var shown = await manager.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{design.Code}");
        Assert.Equal([second.Id, first.Id], shown!.Photos!.Select(p => p.Id));
    }

    [Fact]
    public async Task Removing_a_photo_unlinks_it_and_is_audited()
    {
        var (manager, design) = await NewDesignAsync();
        var photo = await UploadAsync(manager, design.Id);

        var removed = await manager.DeleteAsync($"/api/catalog/designs/{design.Id}/photos/{photo.Id}");

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        var shown = await manager.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{design.Code}");
        Assert.Empty(shown!.Photos!);
        Assert.Equal(HttpStatusCode.NotFound, (await manager.GetAsync(photo.Url)).StatusCode);
        var audited = await api.WithDbAsync(db => db.AuditEntries
            .AnyAsync(a => a.EntityType == "DesignPhoto" && a.EntityId == photo.Id.ToString() && a.Action == "Deleted"));
        Assert.True(audited);
        // The file itself is kept in storage.
        Assert.NotEmpty(Directory.GetFiles(Path.Combine(api.PhotoFolder, "designs", design.Id.ToString())));
    }

    [Fact]
    public async Task Editing_a_design_keeps_its_photos()
    {
        var (manager, design) = await NewDesignAsync();
        await UploadAsync(manager, design.Id);
        var current = await manager.GetFromJsonAsync<DesignDto>($"/api/catalog/designs/{design.Code}");

        var edited = await manager.PutAsJsonAsync($"/api/catalog/designs/{design.Id}", current! with { BasePrice = 55_000m });

        Assert.Single((await edited.Content.ReadFromJsonAsync<DesignDto>())!.Photos!);
    }
}

public class ImageFileTests
{
    [Fact]
    public void Recognises_jpeg_png_and_webp_by_their_first_bytes()
    {
        Assert.Equal("image/jpeg", ImageFiles.Detect([0xFF, 0xD8, 0xFF, 0xE0])?.ContentType);
        Assert.Equal("image/png", ImageFiles.Detect([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])?.ContentType);
        Assert.Equal("image/webp", ImageFiles.Detect("RIFF\0\0\0\0WEBP"u8)?.ContentType);
        Assert.Null(ImageFiles.Detect("GIF89a"u8));
        Assert.Null(ImageFiles.Detect("%PDF-1.7"u8));
    }

    [Fact]
    public void Spaces_store_refuses_to_start_without_its_settings()
    {
        Assert.Throws<InvalidOperationException>(() => new S3PhotoStore(new PhotoOptions.S3Options { Bucket = "x" }));
    }

    [Fact]
    public async Task Local_store_will_not_write_outside_its_folder()
    {
        var store = new LocalPhotoStore(Path.Combine(Path.GetTempPath(), "sellease-guard"));
        await Assert.ThrowsAsync<ArgumentException>(() => store.SaveAsync("../escape.png", new MemoryStream([1]), "image/png"));
    }
}
