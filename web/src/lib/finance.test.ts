import { describe, expect, it } from "vitest";
import { closingCash, profitAndLoss } from "./finance";

describe("finance calculations", () => {
  it("matches the brief's daily cash example (closing cash 178,000)", () => {
    expect(
      closingCash(100_000, [
        { amount: 80_000, direction: "in" },
        { amount: 120_000, direction: "in" },
        { amount: 95_000, direction: "out" },
        { amount: 7_000, direction: "out" },
        { amount: 20_000, direction: "out" },
      ]),
    ).toBe(178_000);
  });

  it("matches the brief's monthly P&L example (net operating profit 300,000)", () => {
    const result = profitAndLoss({
      netSales: 1_500_000,
      costOfGoodsSold: 950_000,
      operatingExpenses: [
        { amount: 120_000 },
        { amount: 80_000 },
        { amount: 35_000 },
        { amount: 15_000 },
      ],
    });
    expect(result.grossProfit).toBe(550_000);
    expect(result.netOperatingProfit).toBe(300_000);
    expect(result.grossMarginPct).toBe(36.7);
    expect(result.operatingMarginPct).toBe(20);
  });

  it("handles zero sales without dividing by zero", () => {
    expect(profitAndLoss({ netSales: 0, costOfGoodsSold: 0, operatingExpenses: [] }).grossMarginPct).toBe(0);
  });
});
