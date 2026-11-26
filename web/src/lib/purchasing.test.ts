import { describe, expect, it } from "vitest";
import {
  discountGiven,
  factoryCostForSalesOrder,
  findPoLine,
  linesAwaitingPurchase,
  linkedSalesOrders,
  purchaseOrderTotal,
  salesOrderTotal,
  type PurchaseOrderLine,
  type SalesOrderLine,
} from "./purchasing";

const soLines: SalesOrderLine[] = [
  { id: "1", designCode: "SF-310", description: "Modern Sofa Set", quantity: 1, listUnitPrice: 125_000, agreedUnitPrice: 120_000 },
  { id: "2", designCode: "LV-402", description: "Coffee Table Set", quantity: 2, listUnitPrice: 42_000, agreedUnitPrice: 42_000 },
];

const sofaPo = {
  number: "PO-000035",
  lines: [{ soNumber: "SO-000142", soLineId: "1", description: "Modern Sofa Set", quantity: 1, unitCost: 78_000 }] as PurchaseOrderLine[],
};

describe("sales order totals", () => {
  it("uses the agreed price, not the catalogue price", () => {
    expect(salesOrderTotal(soLines)).toBe(204_000);
  });

  it("reports the discount given against the catalogue", () => {
    expect(discountGiven(soLines)).toBe(5_000);
  });
});

describe("purchase orders linked to sales orders", () => {
  it("finds which purchase order covers a sales-order line", () => {
    expect(findPoLine("SO-000142", "1", [sofaPo])?.po.number).toBe("PO-000035");
    expect(findPoLine("SO-000142", "2", [sofaPo])).toBeUndefined();
    // Same line id on a different sales order is not a match.
    expect(findPoLine("SO-000999", "1", [sofaPo])).toBeUndefined();
  });

  it("lists sales-order lines still waiting for a factory order", () => {
    expect(linesAwaitingPurchase("SO-000142", soLines, [sofaPo]).map((l) => l.id)).toEqual(["2"]);
    expect(linesAwaitingPurchase("SO-000142", soLines, [])).toHaveLength(2);
  });

  it("totals factory cost per purchase order and per sales order", () => {
    const tablePo = {
      lines: [{ soNumber: "SO-000142", soLineId: "2", description: "Coffee Table Set", quantity: 2, unitCost: 12_000 }],
    };
    expect(purchaseOrderTotal(tablePo.lines)).toBe(24_000);
    expect(factoryCostForSalesOrder("SO-000142", [sofaPo, tablePo])).toBe(102_000);
    expect(factoryCostForSalesOrder("SO-000001", [sofaPo, tablePo])).toBe(0);
  });

  it("lists the sales orders a purchase order serves", () => {
    expect(
      linkedSalesOrders([
        { soNumber: "SO-1", soLineId: "1", description: "", quantity: 1, unitCost: 1 },
        { soNumber: "SO-2", soLineId: "1", description: "", quantity: 1, unitCost: 1 },
        { soNumber: "SO-1", soLineId: "2", description: "", quantity: 1, unitCost: 1 },
      ]),
    ).toEqual(["SO-1", "SO-2"]);
  });
});
