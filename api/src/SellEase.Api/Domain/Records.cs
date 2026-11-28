using System.ComponentModel.DataAnnotations;

namespace SellEase.Api.Domain;

/// <summary>
/// Records that staff edit. <c>Version</c> maps to PostgreSQL's row version (xmin), so if two people
/// edit the same record at once the second save is refused instead of silently overwriting.
/// Records are never deleted; they are switched off with <c>IsActive</c>.
/// </summary>
public abstract class EditableRecord : IAudited
{
    public Guid Id { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    /// <summary>Set on every edit, so a change to a design's options also checks <c>Version</c>.</summary>
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public uint Version { get; set; }
}

public class Customer : EditableRecord
{
    /// <summary>Readable number, e.g. CU-000012.</summary>
    public required string Number { get; set; }
    public required string Name { get; set; }
    public required string Phone { get; set; }
    /// <summary>The phone number's digits only, for searching.</summary>
    public string PhoneDigits { get; set; } = "";
    public string? Address { get; set; }
    public string? Note { get; set; }
}

public class Factory : EditableRecord
{
    /// <summary>Readable number, e.g. FA-000003.</summary>
    public required string Number { get; set; }
    public required string Name { get; set; }
    public string? ContactPerson { get; set; }
    public required string Phone { get; set; }
    public required string City { get; set; }
    public string? Speciality { get; set; }
}

public class Category : EditableRecord
{
    public required string Name { get; set; }
    public int SortOrder { get; set; }
    /// <summary>The items designs in this category can include, e.g. Bed king, Almari 4 door.</summary>
    public List<CategoryItem> Items { get; set; } = [];
}

/// <summary>An item a category's designs can include, e.g. "Bed king" for Bedroom.</summary>
public class CategoryItem : EditableRecord
{
    public Guid CategoryId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>
/// An item one design offers (from its category's list), with this design's price for it and
/// whether it is ticked when a salesman opens the design. The chosen items add up to the price.
/// </summary>
public class DesignItem : IAudited, IOrderedRow
{
    public Guid Id { get; set; }
    public Guid DesignId { get; set; }
    public Guid CategoryItemId { get; set; }
    public decimal Price { get; set; }
    public bool IsDefault { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>Something sold on its own, without a design: mirror, locks and handles, lights, mattress.</summary>
public class OtherItem : EditableRecord
{
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>A catalogue design. Its code (e.g. RY-101) is its readable number.</summary>
public class Design : EditableRecord
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public Guid CategoryId { get; set; }
    /// <summary>No longer used (2026-11-28): the price is now the sum of the chosen items. Old values are kept.</summary>
    public decimal? BasePrice { get; set; }
    /// <summary>No longer used (2026-11-28). Old values are kept.</summary>
    public string? Dimensions { get; set; }
    /// <summary>No longer used (2026-11-28). Old values are kept.</summary>
    public string? Wood { get; set; }
    public string? Description { get; set; }

    public List<DesignMaterial> Materials { get; set; } = [];
    public List<DesignColor> Colors { get; set; } = [];
    /// <summary>The items this design offers, in display order.</summary>
    public List<DesignItem> Items { get; set; } = [];
    /// <summary>No longer used (2026-11-28): replaced by <see cref="Items"/>. Old rows are kept.</summary>
    public List<DesignAccessory> Accessories { get; set; } = [];
    /// <summary>Photos in display order; the first is the main photo.</summary>
    public List<DesignPhoto> Photos { get; set; } = [];
}

/// <summary>A design photo. The file is in the photo store under <c>StorageKey</c>.</summary>
public class DesignPhoto : IAudited
{
    public Guid Id { get; set; }
    public Guid DesignId { get; set; }
    public required string StorageKey { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>A row in one of a design's ordered lists (materials, colours, items).</summary>
public interface IOrderedRow
{
    Guid Id { get; }
    int SortOrder { get; set; }
}

/// <summary>Common parts of a design's option lists.</summary>
public abstract class DesignOption : IAudited, IOrderedRow
{
    public Guid Id { get; set; }
    public Guid DesignId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>A material choice, e.g. leather (+15,000).</summary>
public class DesignMaterial : DesignOption
{
    public decimal Surcharge { get; set; }
}

/// <summary>A colour choice, with a swatch colour for the screen.</summary>
public class DesignColor : DesignOption
{
    /// <summary>Swatch, e.g. #216b44.</summary>
    public required string Hex { get; set; }
}

/// <summary>An optional add-on sold with the design, e.g. centre table.</summary>
public class DesignAccessory : DesignOption
{
    public decimal Price { get; set; }
}
