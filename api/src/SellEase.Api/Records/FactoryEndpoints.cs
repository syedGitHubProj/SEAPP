using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Records;

/// <summary>
/// Factories: every signed-in user can list them (a salesman picks one when ordering),
/// but only Manager and Admin add or edit them.
/// </summary>
public static class FactoryEndpoints
{
    public sealed record FactoryDto(Guid Id, string Number, string Name, string? ContactPerson, string Phone, string City, string? Speciality, bool IsActive, uint Version);
    public sealed record FactoryInput(string Name, string? ContactPerson, string Phone, string City, string? Speciality, bool IsActive = true, uint Version = 0);

    private static FactoryDto ToDto(Factory f) =>
        new(f.Id, f.Number, f.Name, f.ContactPerson, f.Phone, f.City, f.Speciality, f.IsActive, f.Version);

    public static void MapFactoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/factories");

        group.MapGet("/", async (AppDbContext db, bool? includeInactive) =>
        {
            var query = db.Factories.AsNoTracking();
            if (includeInactive != true) query = query.Where(f => f.IsActive);
            return (await query.OrderBy(f => f.Name).ToListAsync()).Select(ToDto);
        }).RequireAuthorization();

        group.MapGet("/{id:guid}", async (Guid id, AppDbContext db) =>
            await db.Factories.FindAsync(id) is { } f ? Results.Ok(ToDto(f)) : Results.NotFound())
            .RequireAuthorization();

        group.MapPost("/", async (FactoryInput input, AppDbContext db, NumberSequences numbers) =>
        {
            if (Validate(input) is { IsValid: false } v) return v.Problem();
            var factory = new Factory
            {
                Number = await numbers.NextAsync(NumberSequences.Factory),
                Name = input.Name.Trim(),
                Phone = input.Phone.Trim(),
                City = input.City.Trim(),
            };
            Apply(factory, input);
            db.Factories.Add(factory);
            return await db.SaveOrConflictAsync() ?? Results.Created($"/api/factories/{factory.Id}", ToDto(factory));
        }).RequireAuthorization(Permissions.FactoriesEdit);

        group.MapPut("/{id:guid}", async (Guid id, FactoryInput input, AppDbContext db) =>
        {
            if (Validate(input) is { IsValid: false } v) return v.Problem();
            var factory = await db.Factories.FindAsync(id);
            if (factory is null) return Results.NotFound();

            db.ExpectVersion(factory, input.Version);
            Apply(factory, input);
            factory.IsActive = input.IsActive;
            return await db.SaveOrConflictAsync() ?? Results.Ok(ToDto(factory));
        }).RequireAuthorization(Permissions.FactoriesEdit);
    }

    private static Validator Validate(FactoryInput input) =>
        new Validator()
            .Required("name", input.Name, 200)
            .Optional("contactPerson", input.ContactPerson, 200)
            .Phone("phone", input.Phone)
            .Required("city", input.City, 100)
            .Optional("speciality", input.Speciality, 500);

    private static void Apply(Factory f, FactoryInput input)
    {
        f.Name = input.Name.Trim();
        f.ContactPerson = Validator.Clean(input.ContactPerson);
        f.Phone = input.Phone.Trim();
        f.City = input.City.Trim();
        f.Speciality = Validator.Clean(input.Speciality);
    }
}
