/** Simple finance calculations for the prototype's cash book and profit & loss pages. */

export interface CashMovement {
  amount: number;
  direction: "in" | "out";
}

export function closingCash(opening: number, movements: CashMovement[]): number {
  return movements.reduce(
    (cash, m) => (m.direction === "in" ? cash + m.amount : cash - m.amount),
    opening,
  );
}

export interface ProfitAndLossInput {
  netSales: number;
  costOfGoodsSold: number;
  operatingExpenses: { amount: number }[];
}

export interface ProfitAndLoss {
  grossProfit: number;
  totalOperatingExpenses: number;
  netOperatingProfit: number;
  /** Percent, rounded to one decimal place. */
  grossMarginPct: number;
  operatingMarginPct: number;
}

const pct = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

export function profitAndLoss(input: ProfitAndLossInput): ProfitAndLoss {
  const grossProfit = input.netSales - input.costOfGoodsSold;
  const totalOperatingExpenses = input.operatingExpenses.reduce((s, e) => s + e.amount, 0);
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  return {
    grossProfit,
    totalOperatingExpenses,
    netOperatingProfit,
    grossMarginPct: pct(grossProfit, input.netSales),
    operatingMarginPct: pct(netOperatingProfit, input.netSales),
  };
}
