using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace SellEase.Api.Common;

/// <summary>Collects field errors as short codes ("required", "tooLong", ...) that the website translates.</summary>
public sealed partial class Validator
{
    private readonly Dictionary<string, List<string>> _errors = [];

    public bool IsValid => _errors.Count == 0;

    public Validator Add(string field, string code)
    {
        if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = [];
        list.Add(code);
        return this;
    }

    public Validator Required(string field, string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return Add(field, "required");
        return value.Trim().Length > maxLength ? Add(field, "tooLong") : this;
    }

    public Validator Optional(string field, string? value, int maxLength) =>
        value is not null && value.Trim().Length > maxLength ? Add(field, "tooLong") : this;

    /// <summary>Money: zero or more, whole paisa (at most 2 decimal places).</summary>
    public Validator Money(string field, decimal value) =>
        value < 0 || value != Math.Round(value, 2) || value > 9_999_999_999_999_999.99m ? Add(field, "invalidAmount") : this;

    public Validator Phone(string field, string? value)
    {
        Required(field, value, 30);
        return value is not null && DigitsOf(value).Length is > 0 and < 7 ? Add(field, "invalidPhone") : this;
    }

    public IResult Problem() =>
        Results.ValidationProblem(_errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));

    public static string DigitsOf(string value) => new(value.Where(char.IsAsciiDigit).ToArray());

    /// <summary>Trims, and turns blank into null.</summary>
    public static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static bool IsHexColor(string? value) => value is not null && HexColor().IsMatch(value);

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColor();
}

public static class Saving
{
    /// <summary>
    /// Saves, turning the two expected clashes into clear answers:
    /// someone else edited the record first (409 changedByOthers), or a name/code already exists (409 duplicate).
    /// Returns null when the save worked.
    /// </summary>
    public static async Task<IResult?> SaveOrConflictAsync(this DbContext db, CancellationToken ct = default)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return null;
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict(new { error = "changedByOthers" });
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Results.Conflict(new { error = "duplicate" });
        }
    }

    /// <summary>Applies the version the editor last saw, so a stale edit is refused.</summary>
    public static void ExpectVersion<T>(this DbContext db, T record, uint version) where T : Domain.EditableRecord
    {
        db.Entry(record).Property(r => r.Version).OriginalValue = version;
        record.UpdatedAt = DateTimeOffset.UtcNow;
    }
}
