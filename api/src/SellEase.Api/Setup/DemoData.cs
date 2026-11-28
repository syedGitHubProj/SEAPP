using Microsoft.EntityFrameworkCore;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Setup;

/// <summary>
/// Made-up customers, factories and designs (the same as the Phase 1 prototype), for a developer's
/// computer and for staging so staff can try the app. No staff accounts. Never allowed on production.
/// Each kind is only added when that table is empty.
/// </summary>
public static class DemoData
{
    /// <summary>Demo data may be loaded on a developer's computer and on staging, never on production.</summary>
    public static bool IsAllowed(IHostEnvironment env) => env.IsDevelopment() || env.IsStaging();

    private static readonly (string Name, decimal Surcharge)[] Fabrics = [("Velvet", 0), ("Leather", 15_000), ("Fabric", 0)];
    private static readonly (string Name, decimal Surcharge)[] Woods = [("Sheesham", 0), ("Teak", 20_000), ("Deodar", 8_000)];
    private static readonly (string Name, string Hex)[] FabricColors =
        [("Cream", "#efe6d2"), ("Bottle green", "#216b44"), ("Navy", "#1e3a5f"), ("Maroon", "#8b1e2d"), ("Grey", "#8c8c8c")];
    private static readonly (string Name, string Hex)[] WoodColors =
        [("Natural", "#d9b98c"), ("Walnut", "#8a5a2b"), ("Dark walnut", "#5a3a1e"), ("Ebony", "#2b1d12")];

    public static async Task RunAsync(AppDbContext db, NumberSequences numbers)
    {
        // Each demo record is added unless one with the same name (or design code) is already there,
        // so loading twice changes nothing and staff's own records are never touched.
        var factoryNames = (await db.Factories.Select(f => f.Name).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        {
            (string, string, string, string, string)[] factories =
            [
                ("Chiniot Royal Works", "Haji Aslam", "0300-6611223", "Chiniot", "Royal carved sets, dining"),
                ("Lahore Woodcraft", "Rashid Mehmood", "0321-7654321", "Lahore", "Sofas, living room"),
                ("Gujrat Furniture House", "Nadeem Butt", "0333-4455667", "Gujrat", "Bedroom, dining"),
            ];
            foreach (var (name, contact, phone, city, speciality) in factories.Where(f => !factoryNames.Contains(f.Item1)))
                db.Factories.Add(new Factory
                {
                    Number = await numbers.NextAsync(NumberSequences.Factory),
                    Name = name, ContactPerson = contact, Phone = phone, City = city, Speciality = speciality,
                });
        }

        var customerKeys = (await db.Customers.Select(c => c.Name + "|" + c.PhoneDigits).ToListAsync()).ToHashSet();
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
            foreach (var (name, phone, address) in customers.Where(c => !customerKeys.Contains(c.Item1 + "|" + Validator.DigitsOf(c.Item2))))
                db.Customers.Add(new Customer
                {
                    Number = await numbers.NextAsync(NumberSequences.Customer),
                    Name = name, Phone = phone, PhoneDigits = Validator.DigitsOf(phone), Address = address,
                });
        }

        var designCodes = (await db.Designs.Select(d => d.Code).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        {
            var existingCategories = await db.Categories.ToListAsync();
            var categoryIds = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
            foreach (var c in existingCategories) categoryIds.TryAdd(c.Name, c.Id);
            // A category may have been renamed on staging: demo designs then go into a new one of the old name.
            var category = new CategoryLookup(name =>
            {
                if (categoryIds.TryGetValue(name, out var id)) return id;
                var created = new Category { Name = name, SortOrder = existingCategories.Count + categoryIds.Count + 1 };
                db.Categories.Add(created);
                categoryIds[name] = created.Id = Guid.CreateVersion7();
                return created.Id;
            });

            // Each category's item list; an item already there (same name) is reused.
            var categoryItems = await db.CategoryItems.ToListAsync();
            Guid ItemId(Guid categoryId, string name)
            {
                var found = categoryItems.FirstOrDefault(i => i.CategoryId == categoryId && string.Equals(i.Name, name, StringComparison.OrdinalIgnoreCase));
                if (found is not null) return found.Id;
                var created = new CategoryItem
                {
                    Id = Guid.CreateVersion7(), CategoryId = categoryId, Name = name,
                    SortOrder = (categoryItems.Count(i => i.CategoryId == categoryId) + 1) * 10,
                };
                categoryItems.Add(created);
                db.CategoryItems.Add(created);
                return created.Id;
            }

            // The owner's example (2026-11-28): a bedroom design's items, with 1, 3, 6 and 7 ticked by default.
            (string, decimal, bool)[] bedroom =
            [
                ("Bed king", 120_000, true), ("Bed queen", 100_000, false), ("Almari 4 door", 80_000, true),
                ("Almari 3 door", 65_000, false), ("Almari 2 door", 50_000, false), ("Side table", 15_000, true),
                ("Dressing table", 30_000, true), ("Bed footrest", 12_000, false),
            ];
            var demo = new (string Code, string Name, string Category, string Description, bool Upholstered, (string Item, decimal Price, bool Default)[] Items)[]
            {
                ("RY-101", "Royal Sofa Set", "Royal", "Hand-carved frame with gold-leaf detailing.", true,
                    [("3 seater sofa", 85_000, true), ("2 seater sofa", 60_000, true), ("1 seater sofa", 40_000, true), ("Centre table", 25_000, false), ("Side table", 9_000, false)]),
                ("RY-102", "Royal Bed Set", "Royal", "Carved headboard, two side tables and dressing table.", false,
                    [("Bed king", 150_000, true), ("Side table", 20_000, true), ("Dressing table", 45_000, true), ("Almari 4 door", 120_000, false)]),
                ("SF-310", "Modern Sofa Set", "Sofa", "Clean lines with removable cushion covers.", true,
                    [("3 seater sofa", 60_000, true), ("2 seater sofa", 40_000, true), ("1 seater sofa", 25_000, true), ("Centre table", 25_000, false), ("Side table", 9_000, false)]),
                ("SF-322", "L-Shape Corner Sofa", "Sofa", "Seven-seater corner sofa for family lounges.", true,
                    [("Corner sofa (L-shape)", 158_000, true), ("Centre table", 25_000, false), ("Extra cushions", 6_000, false)]),
                ("BD-204", "Luxury Bedroom Set", "Bedroom", "Bed, side tables, dressing table and almari.", false, bedroom),
                ("BD-210", "Shandar Bedroom Set", "Bedroom", "Carved bedroom set; pick the bed size and almari.", false, bedroom),
                ("DN-108", "Classic Dining Set", "Dining", "Dining table with upholstered chairs.", false,
                    [("Dining table (6 seats)", 75_000, true), ("Dining chair", 15_000, true), ("Sideboard", 75_000, false), ("Glass top", 22_000, false)]),
                ("LV-402", "Coffee Table Set", "Living", "Coffee table with matching side tables.", false,
                    [("Coffee table", 30_000, true), ("Side table", 6_000, true), ("Glass top", 9_000, false)]),
            };

            List<DesignItem> ItemsFor(Guid categoryId, (string Item, decimal Price, bool Default)[] items) =>
                items.Select((x, i) => new DesignItem { CategoryItemId = ItemId(categoryId, x.Item), Price = x.Price, IsDefault = x.Default, SortOrder = i }).ToList();

            foreach (var d in demo.Where(d => !designCodes.Contains(d.Code)))
            {
                var categoryId = category[d.Category];
                db.Designs.Add(new Design
                {
                    Code = d.Code, Name = d.Name, CategoryId = categoryId, Description = d.Description,
                    Materials = (d.Upholstered ? Fabrics : Woods).Select((m, i) => new DesignMaterial { Name = m.Name, Surcharge = m.Surcharge, SortOrder = i }).ToList(),
                    Colors = (d.Upholstered ? FabricColors : WoodColors).Select((c, i) => new DesignColor { Name = c.Name, Hex = c.Hex, SortOrder = i }).ToList(),
                    Items = ItemsFor(categoryId, d.Items),
                });
            }

            // Demo designs loaded before items existed (2026-11-28) get their items now.
            var codes = demo.Select(d => d.Code).ToArray();
            foreach (var old in await db.Designs.Include(x => x.Items).Where(x => codes.Contains(x.Code) && !x.Items.Any()).ToListAsync())
                old.Items = ItemsFor(old.CategoryId, demo.First(d => d.Code == old.Code).Items);
        }

        var otherNames = (await db.OtherItems.Select(i => i.Name).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        {
            (string, decimal)[] others = [("Mirror", 8_000), ("Locks & Handles", 3_500), ("Lights", 6_000), ("Mattress", 45_000)];
            foreach (var (name, price, i) in others.Select((o, i) => (o.Item1, o.Item2, i)).Where(o => !otherNames.Contains(o.Item1)))
                db.OtherItems.Add(new OtherItem { Name = name, Price = price, SortOrder = (i + 1) * 10 });
        }

        await db.SaveChangesAsync();
    }

    private sealed class CategoryLookup(Func<string, Guid> find)
    {
        public Guid this[string name] => find(name);
    }
}
