import { describe, expect, it } from "vitest";
import { artFor, catalogPrice, defaultQuantities, parseAmount } from "./catalog";

const item = (id: string, name: string, price: number | null, isDefault: boolean) => ({ id, categoryItemId: id, name, price, isDefault, isActive: true });

// The owner's example: a bedroom design with 1, 3, 6 and 7 ticked by default.
const shandar = {
  materials: [
    { id: "m1", name: "Sheesham", surcharge: 0 },
    { id: "m2", name: "Teak", surcharge: 20_000 },
  ],
  items: [
    item("bedKing", "Bed king", 120_000, true),
    item("bedQueen", "Bed queen", 100_000, false),
    item("almari4", "Almari 4 door", 80_000, true),
    item("sideTable", "Side table", 15_000, true),
    item("dressing", "Dressing table", 30_000, true),
  ],
};

describe("catalogue price", () => {
  it("starts with the default items, one of each", () => {
    expect(defaultQuantities(shandar)).toEqual({ bedKing: 1, almari4: 1, sideTable: 1, dressing: 1 });
    expect(catalogPrice(shandar, { materialId: "m1", quantities: defaultQuantities(shandar) })).toBe(245_000);
  });

  it("adds each item's price times its quantity, and the material charge once", () => {
    const quantities = { bedQueen: 1, sideTable: 2 };
    expect(catalogPrice(shandar, { materialId: "m2", quantities })).toBe(100_000 + 30_000 + 20_000);
  });

  it("is zero when nothing is chosen", () => {
    expect(catalogPrice(shandar, { materialId: "m2", quantities: { bedKing: 0 } })).toBe(0);
  });

  it("is unknown when prices are hidden", () => {
    const hidden = { materials: [], items: [item("a", "Bed king", null, true)] };
    expect(catalogPrice(hidden, { materialId: null, quantities: { a: 1 } })).toBeNull();
  });
});

describe("typed amounts", () => {
  it("accepts commas and up to two decimals", () => {
    expect(parseAmount("125,000")).toBe(125_000);
    expect(parseAmount("99.50")).toBe(99.5);
  });

  it("refuses text, negatives and too many decimals", () => {
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
});

describe("placeholder artwork", () => {
  it("matches category names loosely", () => {
    expect(artFor("Royal")).toBe("royal");
    expect(artFor("Bedroom sets")).toBe("bedroom");
    expect(artFor("Office")).toBe("living");
  });
});
