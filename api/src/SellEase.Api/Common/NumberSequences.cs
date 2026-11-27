using Microsoft.EntityFrameworkCore;
using SellEase.Api.Data;

namespace SellEase.Api.Common;

/// <summary>Hands out readable record numbers such as SO-000145. Safe when many people save at once.</summary>
public sealed class NumberSequences(AppDbContext db)
{
    public const string SaleOrder = "SO";
    public const string PurchaseOrder = "PO";
    public const string Customer = "CU";
    public const string Factory = "FA";

    /// <summary>Every prefix the app uses; created by the database setup.</summary>
    public static readonly string[] All = [SaleOrder, PurchaseOrder, Customer, Factory];

    public static string Format(string prefix, long value) => $"{prefix}-{value:D6}";

    public async Task<string> NextAsync(string prefix, CancellationToken ct = default)
    {
        // One atomic statement: the row lock stops two people getting the same number.
        var values = await db.Database
            .SqlQuery<long>($"""
                UPDATE "NumberSequences" SET "NextValue" = "NextValue" + 1
                WHERE "Prefix" = {prefix}
                RETURNING "NextValue" - 1 AS "Value"
                """)
            .ToListAsync(ct);

        if (values.Count == 0) throw new InvalidOperationException($"No number sequence for '{prefix}'.");
        return Format(prefix, values[0]);
    }
}
