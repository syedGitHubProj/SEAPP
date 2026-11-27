namespace SellEase.Api.Photos;

/// <summary>Recognises allowed photo types from the file's first bytes, not from its name.</summary>
public static class ImageFiles
{
    public const long MaxBytes = 10 * 1024 * 1024;

    /// <summary>Returns (content type, extension) for JPEG, PNG or WebP, otherwise null.</summary>
    public static (string ContentType, string Extension)? Detect(ReadOnlySpan<byte> head)
    {
        if (head.Length >= 3 && head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF)
            return ("image/jpeg", "jpg");
        if (head.Length >= 8 && head[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return ("image/png", "png");
        if (head.Length >= 12 && head[..4].SequenceEqual("RIFF"u8) && head[8..12].SequenceEqual("WEBP"u8))
            return ("image/webp", "webp");
        return null;
    }
}
