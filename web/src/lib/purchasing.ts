/**
 * Sales orders (what the customer buys from us) and purchase orders (what we buy
 * from a factory) are separate records. Each purchase-order line points back to
 * the sales-order line it is made for, so one sales order can be split across
 * several factories, and every piece's factory cost is traceable to its sale.
 */

export interface SalesOrderLine {
  id: string;
  designCode: string;
  description: string;
  quantity: number;
  /** Catalogue price per piece (design + material + accessories). */
  listUnitPrice: number | null;
  /** Price per piece agreed with the customer. */
  agreedUnitPrice: number;
}

export interface PurchaseOrderLine {
  soNumber: string;
  soLineId: string;
  description: string;
  quantity: number;
  /** Factory cost per piece. */
  unitCost: number;
}

export const soLineTotal = (l: SalesOrderLine) => l.agreedUnitPrice * l.quantity;

export const salesOrderTotal = (lines: SalesOrderLine[]) =>
  lines.reduce((sum, l) => sum + soLineTotal(l), 0);

/** How much below the catalogue price the agreed price is (0 if not discounted). */
export const discountGiven = (lines: SalesOrderLine[]) =>
  lines.reduce((sum, l) => sum + Math.max(0, (l.listUnitPrice ?? l.agreedUnitPrice) - l.agreedUnitPrice) * l.quantity, 0);

export const poLineTotal = (l: PurchaseOrderLine) => l.unitCost * l.quantity;

export const purchaseOrderTotal = (lines: PurchaseOrderLine[]) =>
  lines.reduce((sum, l) => sum + poLineTotal(l), 0);

/** The purchase-order line (if any) that covers a given sales-order line. */
export function findPoLine<T extends { lines: PurchaseOrderLine[] }>(
  soNumber: string,
  soLineId: string,
  purchaseOrders: T[],
): { po: T; line: PurchaseOrderLine } | undefined {
  for (const po of purchaseOrders) {
    const line = po.lines.find((l) => l.soNumber === soNumber && l.soLineId === soLineId);
    if (line) return { po, line };
  }
  return undefined;
}

/** Sales-order lines that have not yet been ordered from any factory. */
export function linesAwaitingPurchase(
  soNumber: string,
  soLines: SalesOrderLine[],
  purchaseOrders: { lines: PurchaseOrderLine[] }[],
): SalesOrderLine[] {
  return soLines.filter((l) => !findPoLine(soNumber, l.id, purchaseOrders));
}

/** Total factory cost booked against a sales order so far. */
export function factoryCostForSalesOrder(
  soNumber: string,
  purchaseOrders: { lines: PurchaseOrderLine[] }[],
): number {
  return purchaseOrders
    .flatMap((po) => po.lines)
    .filter((l) => l.soNumber === soNumber)
    .reduce((sum, l) => sum + poLineTotal(l), 0);
}

/** Sales order numbers a purchase order is linked to. */
export const linkedSalesOrders = (lines: PurchaseOrderLine[]) => [...new Set(lines.map((l) => l.soNumber))];
