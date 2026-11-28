import { describe, expect, it } from "vitest";
import { artFor, catalogUnitPrice, parseAmount } from "./catalog";

const sofa = {
  basePrice: 125_000,
  materials: [
    { id: "m1", name: "Velvet", surcharge: 0 },
    { id: "m2", name: "Leather", surcharge: 15_000 },
  ],
  accessories: [
    { id: "a1", name: "Centre table", price: 25_000 },
    { id: "a2", name: "Side tables", price: 18_000 },
  ],
};

describe("catalogue price", () => {
  it("is the base price when nothing extra is chosen", () => {
    expect(catalogUnitPrice(sofa, { materialId: "m1", accessoryIds: [] })).toBe(125_000);
  });

  it("adds the material surcharge and chosen accessories", () => {
    expect(catalogUnitPrice(sofa, { materialId: "m2", accessoryIds: ["a1", "a2"] })).toBe(183_000);
  });

  it("is unknown when prices are hidden", () => {
    const hidden = { basePrice: null, materials: [], accessories: [] };
    expect(catalogUnitPrice(hidden, { materialId: null, accessoryIds: [] })).toBeNull();
  });

  it("ignores unknown choices", () => {
    expect(catalogUnitPrice(sofa, { materialId: "gone", accessoryIds: ["gone"] })).toBe(125_000);
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
