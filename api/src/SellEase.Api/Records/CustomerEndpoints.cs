using Microsoft.EntityFrameworkCore;
using SellEase.Api.Auth;
using SellEase.Api.Common;
using SellEase.Api.Data;
using SellEase.Api.Domain;

namespace SellEase.Api.Records;

/// <summary>Customers: every role may view, add and edit them.</summary>
public static class CustomerEndpoints
{
    public sealed record CustomerDto(Guid Id, string Number, string Name, string Phone, string? Address, string? Note, bool IsActive, uint Version);
    public sealed record CustomerInput(string Name, string Phone, string? Address, string? Note, bool IsActive = true, uint Version = 0);

    private static CustomerDto ToDto(Customer c) => new(c.Id, c.Number, c.Name, c.Phone, c.Address, c.Note, c.IsActive, c.Version);

    public static void MapCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/customers").RequireAuthorization(Permissions.CustomersEdit);

        group.MapGet("/", async (AppDbContext db, string? q, bool? includeInactive, int? take) =>
        {
            var query = db.Customers.AsNoTracking();
            if (includeInactive != true) query = query.Where(c => c.IsActive);
            if (!string.IsNullOrWhiteSpace(q))
            {
                var text = $"%{q.Trim()}%";
                var digits = Validator.DigitsOf(q);
                query = query.Where(c => EF.Functions.ILike(c.Name, text) || EF.Functions.ILike(c.Number, text)
                    || (digits.Length >= 3 && c.PhoneDigits.Contains(digits)));
            }
            var list = await query.OrderBy(c => c.Name).Take(Math.Clamp(take ?? 50, 1, 200)).ToListAsync();
            return list.Select(ToDto);
        });

        group.MapGet("/{id:guid}", async (Guid id, AppDbContext db) =>
            await db.Customers.FindAsync(id) is { } c ? Results.Ok(ToDto(c)) : Results.NotFound());

        group.MapPost("/", async (CustomerInput input, AppDbContext db, NumberSequences numbers) =>
        {
            if (Validate(input) is { IsValid: false } v) return v.Problem();
            var customer = new Customer
            {
                Number = await numbers.NextAsync(NumberSequences.Customer),
                Name = input.Name.Trim(),
                Phone = input.Phone.Trim(),
            };
            Apply(customer, input);
            db.Customers.Add(customer);
            return await db.SaveOrConflictAsync() ?? Results.Created($"/api/customers/{customer.Id}", ToDto(customer));
        });

        group.MapPut("/{id:guid}", async (Guid id, CustomerInput input, AppDbContext db) =>
        {
            if (Validate(input) is { IsValid: false } v) return v.Problem();
            var customer = await db.Customers.FindAsync(id);
            if (customer is null) return Results.NotFound();

            db.ExpectVersion(customer, input.Version);
            Apply(customer, input);
            customer.IsActive = input.IsActive;
            return await db.SaveOrConflictAsync() ?? Results.Ok(ToDto(customer));
        });
    }

    private static Validator Validate(CustomerInput input) =>
        new Validator()
            .Required("name", input.Name, 200)
            .Phone("phone", input.Phone)
            .Optional("address", input.Address, 500)
            .Optional("note", input.Note, 1000);

    private static void Apply(Customer c, CustomerInput input)
    {
        c.Name = input.Name.Trim();
        c.Phone = input.Phone.Trim();
        c.PhoneDigits = Validator.DigitsOf(input.Phone);
        c.Address = Validator.Clean(input.Address);
        c.Note = Validator.Clean(input.Note);
    }
}
