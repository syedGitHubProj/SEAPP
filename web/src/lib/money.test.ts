import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats PKR with thousands separators", () => {
    expect(formatMoney(228000)).toBe("Rs. 228,000");
  });

  it("shows negative amounts with a minus sign", () => {
    expect(formatMoney(-95000)).toBe("-Rs. 95,000");
  });

  it("uses the currency code for other currencies", () => {
    expect(formatMoney(1500, "USD")).toBe("USD 1,500");
  });
});
