/**
 * Order calculations used by the prototype screens.
 * Amounts are whole rupees here; the real API (Phase 2+) uses exact decimals.
 */

export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface PricedOption {
  price: number;
}

export interface OrderLine {
  basePrice: number;
  /** Extra charge for the chosen material (e.g. leather), 0 if none. */
  materialSurcharge: number;
  accessories: PricedOption[];
  quantity: number;
}

/** Price of one piece: design price + material surcharge + accessories. */
export function unitPrice(line: Omit<OrderLine, "quantity">): number {
  const accessories = line.accessories.reduce((sum, a) => sum + a.price, 0);
  return line.basePrice + line.materialSurcharge + accessories;
}

export function lineTotal(line: OrderLine): number {
  return unitPrice(line) * line.quantity;
}

export function orderTotal(lines: OrderLine[], discount = 0): number {
  const gross = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  return Math.max(0, gross - discount);
}

export function balanceDue(total: number, paid: number): number {
  return Math.max(0, total - paid);
}

/** Payment status is tracked separately from the order's delivery progress. */
export function paymentStatus(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

export interface OrderCosts {
  sellingPrice: number;
  factoryCost: number;
  deliveryExpense: number;
  otherDirectExpense: number;
}

/** Order contribution (not company profit: overheads are separate). */
export function orderContribution(c: OrderCosts): number {
  return c.sellingPrice - c.factoryCost - c.deliveryExpense - c.otherDirectExpense;
}

/** Formats a sequence number as a readable order number, e.g. 145 -> SO-000145. */
export function formatOrderNumber(sequence: number, prefix = "SO"): string {
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}
