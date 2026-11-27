using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace SellEase.Api.Photos;

/// <summary>Where photo files live. The database only keeps each photo's key.</summary>
public interface IPhotoStore
{
    Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct = default);
    /// <summary>Opens a stored photo, or returns null if it is missing.</summary>
    Task<Stream?> OpenAsync(string key, CancellationToken ct = default);
}

/// <summary>
/// Settings under "Photos" in appsettings / environment variables:
///   Photos__Store = Local | S3
///   Photos__LocalPath (Local)            folder for files, default "local-photos"
///   Photos__S3__ServiceUrl, __Bucket,    DigitalOcean Spaces endpoint and bucket
///   Photos__S3__Prefix                   folder per client inside the bucket, e.g. "abc/"
///   Photos__S3__AccessKey, __SecretKey   set by the owner in the server's .env only
/// </summary>
public sealed class PhotoOptions
{
    public string Store { get; set; } = "Local";
    public string LocalPath { get; set; } = "local-photos";
    public S3Options S3 { get; set; } = new();

    public sealed class S3Options
    {
        public string? ServiceUrl { get; set; }
        public string? Bucket { get; set; }
        public string Prefix { get; set; } = "";
        public string? AccessKey { get; set; }
        public string? SecretKey { get; set; }
    }
}

/// <summary>Keeps photos in a folder on this computer (development, tests).</summary>
public sealed class LocalPhotoStore(string root) : IPhotoStore
{
    private string PathFor(string key)
    {
        var full = Path.GetFullPath(Path.Combine(root, key));
        if (!full.StartsWith(Path.GetFullPath(root) + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new ArgumentException("Invalid photo key.", nameof(key));
        return full;
    }

    public async Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct = default)
    {
        var path = PathFor(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var file = File.Create(path);
        await content.CopyToAsync(file, ct);
    }

    public Task<Stream?> OpenAsync(string key, CancellationToken ct = default)
    {
        var path = PathFor(key);
        return Task.FromResult<Stream?>(File.Exists(path) ? File.OpenRead(path) : null);
    }
}

/// <summary>Keeps photos in DigitalOcean Spaces (S3-compatible). The bucket stays private; the API serves the photos.</summary>
public sealed class S3PhotoStore : IPhotoStore, IDisposable
{
    private readonly AmazonS3Client _client;
    private readonly string _bucket;
    private readonly string _prefix;

    public S3PhotoStore(PhotoOptions.S3Options o)
    {
        if (string.IsNullOrWhiteSpace(o.ServiceUrl) || string.IsNullOrWhiteSpace(o.Bucket)
            || string.IsNullOrWhiteSpace(o.AccessKey) || string.IsNullOrWhiteSpace(o.SecretKey))
            throw new InvalidOperationException("Photos:S3 needs ServiceUrl, Bucket, AccessKey and SecretKey.");

        _client = new AmazonS3Client(new BasicAWSCredentials(o.AccessKey, o.SecretKey), new AmazonS3Config
        {
            ServiceURL = o.ServiceUrl,
            // Spaces does not support the newer optional checksum headers.
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
        });
        _bucket = o.Bucket;
        _prefix = o.Prefix;
    }

    public async Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct = default) =>
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucket,
            Key = _prefix + key,
            InputStream = content,
            ContentType = contentType,
            CannedACL = S3CannedACL.Private,
        }, ct);

    public async Task<Stream?> OpenAsync(string key, CancellationToken ct = default)
    {
        try
        {
            var response = await _client.GetObjectAsync(_bucket, _prefix + key, ct);
            return response.ResponseStream;
        }
        catch (AmazonS3Exception e) when (e.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public void Dispose() => _client.Dispose();
}

public static class PhotoStoreSetup
{
    public static IServiceCollection AddPhotoStore(this IServiceCollection services, IConfiguration _, string contentRoot) =>
        services.AddSingleton<IPhotoStore>(sp =>
        {
            // Read when first needed, so test and server settings are always the final ones.
            var options = sp.GetRequiredService<IConfiguration>().GetSection("Photos").Get<PhotoOptions>() ?? new PhotoOptions();
            return options.Store.Equals("S3", StringComparison.OrdinalIgnoreCase)
                ? new S3PhotoStore(options.S3)
                : new LocalPhotoStore(Path.Combine(contentRoot, options.LocalPath));
        });
}
