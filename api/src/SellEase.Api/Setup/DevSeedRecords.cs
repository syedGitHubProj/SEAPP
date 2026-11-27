using Microsoft.EntityFrameworkCore;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Setup;

/// <summary>
/// Made-up customers, factories and designs (the same as the Phase 1 prototype) for a developer's
/// own computer. Never used on a server. Only added when the tables are empty.
/// </summary>
public static class DevSeedRecords
{
    private static readonly (string Name, decimal Surcharge)[] Fabrics = [("Velvet", 0), ("Leather", 15_000), ("Fabric", 0)];
    private static readonly (string Name, decimal Surcharge)[] Woods = [("Sheesham", 0), ("Teak", 20_000), ("Deodar", 8_000)];
    private static readonly (string Name, string Hex)[] FabricColors =
        [("Cream", "#efe6d2"), ("Bottle green", "#216b44"), ("Navy", "#1e3a5f"), ("Maroon", "#8b1e2d"), ("Grey", "#8c8c8c")];
    private static readonly (string Name, string Hex)[] WoodColors =
        [("Natural", "#d9b98c"), ("Walnut", "#8a5a2b"), ("Dark walnut", "#5a3a1e"), ("Ebony", "#2b1d12")];

    public static async Task RunAsync(AppDbContext db, NumberSequences numbers)
    {
        if (!await db.Factories.AnyAsync())
        {
            (string, string, string, string, string)[] factories =
            [
                ("Chiniot Royal Works", "Haji Aslam", "0300-6611223", "Chiniot", "Royal carved sets, dining"),
                ("Lahore Woodcraft", "Rashid Mehmood", "0321-7654321", "Lahore", "Sofas, living room"),
                ("Gujrat Furniture House", "Nadeem Butt", "0333-4455667", "Gujrat", "Bedroom, dining"),
            ];
            foreach (var (name, contact, phone, city, speciality) in factories)
                db.Factories.Add(new Factory
                {
                    Number = await numbers.NextAsync(NumberSequences.Factory),
                    Name = name, ContactPerson = contact, Phone = phone, City = city, Speciality = speciality,
                });
        }

        if (!await db.Customers.AnyAsync())
        {
            (string, string, string)[] customers =
            [
                ("Mr. Imran Khan", "0321-4567890", "DHA Phase 5"),
                ("Mrs. Ayesha Siddiqui", "0300-1122334", "Gulberg III"),
                ("Mr. Bilal Ahmed", "0333-9876543", "Model Town"),
                ("Mrs. Sana Raza", "0345-2233445", "Johar Town"),
                ("Mr. Usman Tariq", "0312-5566778", "Bahria Town"),
                ("Mr. Hamza Qureshi", "0301-6655443", "Cantt"),
            ];
            foreach (var (name, phone, address) in customers)
                db.Customers.Add(new Customer
                {
                    Number = await numbers.NextAsync(NumberSequences.Customer),
                    Name = name, Phone = phone, PhoneDigits = Validator.DigitsOf(phone), Address = address,
                });
        }

        if (!await db.Designs.AnyAsync())
        {
            var category = await db.Categories.ToDictionaryAsync(c => c.Name, c => c.Id);
            var designs = new[]
            {
                Make("RY-101", "Royal Sofa Set", category["Royal"], 185_000, "3+2+1 seater", "Sheesham", "Hand-carved frame with gold-leaf detailing.", true, [("Centre table", 25_000), ("Side tables (pair)", 18_000)]),
                Make("RY-102", "Royal Bed Set", category["Royal"], 265_000, "King, 6x6.5 ft", "Sheesham", "Carved headboard, two side tables and dressing table.", false, [("Mattress", 45_000), ("Wardrobe", 120_000)]),
                Make("SF-310", "Modern Sofa Set", category["Sofa"], 125_000, "3+2+1 seater", "Deodar", "Clean lines with removable cushion covers.", true, [("Centre table", 25_000), ("Side tables (pair)", 18_000)]),
                Make("SF-322", "L-Shape Corner Sofa", category["Sofa"], 158_000, "9 x 6 ft", "Deodar", "Seven-seater corner sofa for family lounges.", true, [("Centre table", 25_000), ("Extra cushions", 6_000)]),
                Make("BD-204", "Luxury Bedroom Set", category["Bedroom"], 245_000, "King, 6x6.5 ft", "Sheesham", "Bed, two side tables, dressing table and wardrobe.", false, [("Mattress", 45_000), ("Storage under bed", 20_000)]),
                Make("DN-108", "Classic Dining Set", category["Dining"], 165_000, "6 seats", "Sheesham", "Six-seat dining table with upholstered chairs.", false, [("Glass top", 22_000), ("Sideboard", 75_000)]),
                Make("LV-402", "Coffee Table Set", category["Living"], 42_000, "4 x 2 ft + 2 side tables", "Teak", "Coffee table with matching side tables.", false, [("Glass top", 9_000)]),
            };
            db.Designs.AddRange(designs);
        }

        await db.SaveChangesAsync();
    }

    private static Design Make(string code, string name, Guid categoryId, decimal price, string dimensions, string wood,
        string description, bool upholstered, (string Name, decimal Price)[] accessories) => new()
    {
        Code = code, Name = name, CategoryId = categoryId, BasePrice = price,
        Dimensions = dimensions, Wood = wood, Description = description,
        Materials = (upholstered ? Fabrics : Woods).Select((m, i) => new DesignMaterial { Name = m.Name, Surcharge = m.Surcharge, SortOrder = i }).ToList(),
        Colors = (upholstered ? FabricColors : WoodColors).Select((c, i) => new DesignColor { Name = c.Name, Hex = c.Hex, SortOrder = i }).ToList(),
        Accessories = accessories.Select((a, i) => new DesignAccessory { Name = a.Name, Price = a.Price, SortOrder = i }).ToList(),
    };
}
