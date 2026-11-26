import { describe, expect, it } from "vitest";
import {
  balanceDue,
  formatOrderNumber,
  lineTotal,
  orderContribution,
  orderTotal,
  paymentStatus,
  unitPrice,
} from "./orders";

// Royal Sofa Set from the sample screens: Rs. 185,000 + centre table 25,000 + side tables 18,000.
const royalSofa = {
  basePrice: 185_000,
  materialSurcharge: 0,
  accessories: [{ price: 25_000 }, { price: 18_000 }],
  quantity: 1,
};

describe("order calculations", () => {
  it("adds accessories and material surcharge to the unit price", () => {
    expect(unitPrice(royalSofa)).toBe(228_000);
    expect(unitPrice({ ...royalSofa, materialSurcharge: 15_000 })).toBe(243_000);
  });

  it("multiplies by quantity and sums lines", () => {
    expect(lineTotal({ ...royalSofa, quantity: 2 })).toBe(456_000);
    const chair = { basePrice: 20_000, materialSurcharge: 0, accessories: [], quantity: 4 };
    expect(orderTotal([royalSofa, chair])).toBe(308_000);
  });

  it("applies a discount but never goes below zero", () => {
    expect(orderTotal([royalSofa], 8_000)).toBe(220_000);
    expect(orderTotal([royalSofa], 999_999)).toBe(0);
  });

  it("matches the sample screen: 228,000 total, 80,000 advance, 148,000 balance", () => {
    const total = orderTotal([royalSofa]);
    expect(balanceDue(total, 80_000)).toBe(148_000);
    expect(paymentStatus(total, 80_000)).toBe("partial");
  });

  it("works out payment status", () => {
    expect(paymentStatus(100, 0)).toBe("unpaid");
    expect(paymentStatus(100, 100)).toBe("paid");
    expect(balanceDue(100, 150)).toBe(0);
  });

  it("matches the brief's order contribution example (48,000)", () => {
    expect(
      orderContribution({
        sellingPrice: 150_000,
        factoryCost: 95_000,
        deliveryExpense: 5_000,
        otherDirectExpense: 2_000,
      }),
    ).toBe(48_000);
  });

  it("formats order numbers", () => {
    expect(formatOrderNumber(145)).toBe("SO-000145");
    expect(formatOrderNumber(32, "PO")).toBe("PO-000032");
  });
});
