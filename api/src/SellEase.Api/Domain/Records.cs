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
}

/// <summary>A catalogue design. Its code (e.g. RY-101) is its readable number.</summary>
public class Design : EditableRecord
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public Guid CategoryId { get; set; }
    /// <summary>Catalogue price per piece before material surcharge and accessories.</summary>
    public decimal BasePrice { get; set; }
    public string? Dimensions { get; set; }
    public string? Wood { get; set; }
    public string? Description { get; set; }

    public List<DesignMaterial> Materials { get; set; } = [];
    public List<DesignColor> Colors { get; set; } = [];
    public List<DesignAccessory> Accessories { get; set; } = [];
}

/// <summary>Common parts of a design's option lists.</summary>
public abstract class DesignOption : IAudited
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
