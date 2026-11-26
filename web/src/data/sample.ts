import type { PurchaseOrderLine, SalesOrderLine } from "@/lib/purchasing";

/**
 * Sample data for the Phase 1 clickable prototype only.
 * Replaced by real API data from Phase 2 onwards. Names and numbers are made up.
 */

export type Category = "royal" | "sofa" | "bedroom" | "dining" | "living";

export interface MaterialOption {
  id: string;
  surcharge: number;
}

export interface Accessory {
  id: string;
  price: number;
}

export interface Design {
  code: string;
  name: string;
  category: Category;
  price: number;
  dimensions: string;
  wood: string;
  description: string;
  materials: MaterialOption[];
  colors: string[];
  accessories: Accessory[];
}

export const categories: Category[] = ["royal", "sofa", "bedroom", "dining", "living"];

/** Upholstery colours (hex) offered on sofas and chairs. */
const fabricColors = ["#efe6d2", "#216b44", "#1e3a5f", "#8b1e2d", "#8c8c8c"];
const woodColors = ["#d9b98c", "#8a5a2b", "#5a3a1e", "#2b1d12"];

const sofaMaterials: MaterialOption[] = [
  { id: "velvet", surcharge: 0 },
  { id: "leather", surcharge: 15_000 },
  { id: "fabric", surcharge: 0 },
];
const woodMaterials: MaterialOption[] = [
  { id: "sheesham", surcharge: 0 },
  { id: "teak", surcharge: 20_000 },
  { id: "deodar", surcharge: 8_000 },
];

export const designs: Design[] = [
  {
    code: "RY-101", name: "Royal Sofa Set", category: "royal", price: 185_000,
    dimensions: "3+2+1 seater", wood: "Sheesham", description: "Hand-carved frame with gold-leaf detailing.",
    materials: sofaMaterials, colors: fabricColors,
    accessories: [{ id: "centerTable", price: 25_000 }, { id: "sideTables", price: 18_000 }],
  },
  {
    code: "RY-102", name: "Royal Bed Set", category: "royal", price: 265_000,
    dimensions: "King, 6x6.5 ft", wood: "Sheesham", description: "Carved headboard, two side tables and dressing table.",
    materials: woodMaterials, colors: woodColors,
    accessories: [{ id: "mattress", price: 45_000 }, { id: "wardrobe", price: 120_000 }],
  },
  {
    code: "RY-103", name: "Royal Dining (8 seats)", category: "royal", price: 320_000,
    dimensions: "8 ft table", wood: "Teak", description: "Carved dining table with eight cushioned chairs.",
    materials: woodMaterials, colors: woodColors,
    accessories: [{ id: "glassTop", price: 22_000 }, { id: "sideboard", price: 75_000 }],
  },
  {
    code: "SF-310", name: "Modern Sofa Set", category: "sofa", price: 125_000,
    dimensions: "3+2+1 seater", wood: "Deodar", description: "Clean lines with removable cushion covers.",
    materials: sofaMaterials, colors: fabricColors,
    accessories: [{ id: "centerTable", price: 25_000 }, { id: "sideTables", price: 18_000 }],
  },
  {
    code: "SF-322", name: "L-Shape Corner Sofa", category: "sofa", price: 158_000,
    dimensions: "9 x 6 ft", wood: "Deodar", description: "Seven-seater corner sofa for family lounges.",
    materials: sofaMaterials, colors: fabricColors,
    accessories: [{ id: "centerTable", price: 25_000 }, { id: "cushions", price: 6_000 }],
  },
  {
    code: "BD-204", name: "Luxury Bedroom Set", category: "bedroom", price: 245_000,
    dimensions: "King, 6x6.5 ft", wood: "Sheesham", description: "Bed, two side tables, dressing table and wardrobe.",
    materials: woodMaterials, colors: woodColors,
    accessories: [{ id: "mattress", price: 45_000 }, { id: "storageBed", price: 20_000 }],
  },
  {
    code: "BD-215", name: "Classic Bed", category: "bedroom", price: 98_000,
    dimensions: "Queen, 5x6.5 ft", wood: "Kikar", description: "Simple panelled bed with storage drawers.",
    materials: woodMaterials, colors: woodColors,
    accessories: [{ id: "mattress", price: 45_000 }],
  },
  {
    code: "DN-108", name: "Classic Dining Set", category: "dining", price: 165_000,
    dimensions: "6 seats", wood: "Sheesham", description: "Six-seat dining table with upholstered chairs.",
    materials: woodMaterials, colors: woodColors,
    accessories: [{ id: "glassTop", price: 22_000 }, { id: "sideboard", price: 75_000 }],
  },
  {
    code: "LV-402", name: "Coffee Table Set", category: "living", price: 42_000,
    dimensions: "4 x 2 ft + 2 side tables", wood: "Teak", description: "Coffee table with matching side tables.",
    materials: woodMaterials, colors: woodColors,
    accessories: [{ id: "glassTop", price: 9_000 }],
  },
  {
    code: "LV-415", name: "TV Console", category: "living", price: 58_000,
    dimensions: "7 ft", wood: "Deodar", description: "Wall-mounted console with closed storage.",
    materials: woodMaterials, colors: woodColors,
    accessories: [{ id: "wallShelves", price: 12_000 }],
  },
];

export function findDesign(code: string): Design | undefined {
  return designs.find((d) => d.code === code);
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  area: string;
  orders: number;
  balance: number;
}

export const customers: Customer[] = [
  { id: "c1", name: "Mr. Imran Khan", phone: "0321-4567890", area: "DHA Phase 5", orders: 2, balance: 148_000 },
  { id: "c2", name: "Mrs. Ayesha Siddiqui", phone: "0300-1122334", area: "Gulberg III", orders: 1, balance: 0 },
  { id: "c3", name: "Mr. Bilal Ahmed", phone: "0333-9876543", area: "Model Town", orders: 3, balance: 65_000 },
  { id: "c4", name: "Mrs. Sana Raza", phone: "0345-2233445", area: "Johar Town", orders: 1, balance: 115_000 },
  { id: "c5", name: "Mr. Usman Tariq", phone: "0312-5566778", area: "Bahria Town", orders: 1, balance: 0 },
  { id: "c6", name: "Mr. Hamza Qureshi", phone: "0301-6655443", area: "Cantt", orders: 2, balance: 210_000 },
];

export type FulfilmentStatus =
  | "draft" | "confirmed" | "factoryOrdered" | "inProduction" | "received"
  | "readyForDelivery" | "delivered" | "closed" | "cancelled";

export interface SalesOrder {
  number: string;
  customer: string;
  date: string;
  lines: SalesOrderLine[];
  paid: number;
  status: FulfilmentStatus;
  deliveryDate: string;
  salesman: string;
}

const line = (id: string, designCode: string, description: string, listUnitPrice: number, agreedUnitPrice = listUnitPrice, quantity = 1): SalesOrderLine =>
  ({ id, designCode, description, quantity, listUnitPrice, agreedUnitPrice });

export const salesOrders: SalesOrder[] = [
  { number: "SO-000144", customer: "Mrs. Sana Raza", date: "2026-11-24", paid: 125_000, status: "confirmed", deliveryDate: "2026-12-20", salesman: "Ali",
    lines: [line("1", "BD-204", "Luxury Bedroom Set — Sheesham", 245_000, 240_000)] },
  { number: "SO-000143", customer: "Mr. Hamza Qureshi", date: "2026-11-22", paid: 132_000, status: "factoryOrdered", deliveryDate: "2026-12-28", salesman: "Ali",
    lines: [line("1", "RY-103", "Royal Dining (8 seats) — Teak, glass top", 342_000)] },
  { number: "SO-000142", customer: "Mr. Bilal Ahmed", date: "2026-11-18", paid: 102_000, status: "inProduction", deliveryDate: "2026-12-10", salesman: "Kashif",
    lines: [line("1", "SF-310", "Modern Sofa Set — Velvet", 125_000), line("2", "LV-402", "Coffee Table Set — Teak", 42_000)] },
  { number: "SO-000141", customer: "Mr. Imran Khan", date: "2026-11-12", paid: 80_000, status: "inProduction", deliveryDate: "2026-12-05", salesman: "Ali",
    lines: [line("1", "RY-101", "Royal Sofa Set — Velvet, centre table, side tables", 228_000)] },
  { number: "SO-000140", customer: "Mrs. Ayesha Siddiqui", date: "2026-11-05", paid: 165_000, status: "readyForDelivery", deliveryDate: "2026-11-27", salesman: "Kashif",
    lines: [line("1", "DN-108", "Classic Dining Set — Sheesham", 165_000)] },
  { number: "SO-000139", customer: "Mr. Usman Tariq", date: "2026-10-28", paid: 158_000, status: "delivered", deliveryDate: "2026-11-21", salesman: "Ali",
    lines: [line("1", "SF-322", "L-Shape Corner Sofa — Fabric", 158_000)] },
  { number: "SO-000138", customer: "Mr. Bilal Ahmed", date: "2026-10-20", paid: 98_000, status: "closed", deliveryDate: "2026-11-15", salesman: "Kashif",
    lines: [line("1", "BD-215", "Classic Bed — Kikar", 98_000)] },
];

/** The next order numbers the prototype hands out. */
export const nextOrderSequence = 145;
export const nextPurchaseOrderSequence = 37;

export interface FactoryRecord {
  id: string;
  name: string;
  contact: string;
  phone: string;
  city: string;
  speciality: string;
}

export const factories: FactoryRecord[] = [
  { id: "f1", name: "Chiniot Royal Works", contact: "Haji Aslam", phone: "0300-6611223", city: "Chiniot", speciality: "Royal carved sets, dining" },
  { id: "f2", name: "Lahore Woodcraft", contact: "Rashid Mehmood", phone: "0321-7654321", city: "Lahore", speciality: "Sofas, living room" },
  { id: "f3", name: "Gujrat Furniture House", contact: "Nadeem Butt", phone: "0333-4455667", city: "Gujrat", speciality: "Bedroom, dining" },
];

export type PurchaseOrderStatus = "ordered" | "inProduction" | "late" | "received";

export interface PurchaseOrder {
  number: string;
  factory: string;
  date: string;
  lines: PurchaseOrderLine[];
  paid: number;
  expected: string;
  status: PurchaseOrderStatus;
}

const poLine = (soNumber: string, soLineId: string, description: string, unitCost: number, quantity = 1): PurchaseOrderLine =>
  ({ soNumber, soLineId, description, quantity, unitCost });

export const purchaseOrders: PurchaseOrder[] = [
  { number: "PO-000036", factory: "Chiniot Royal Works", date: "2026-11-23", paid: 60_000, expected: "2026-12-18", status: "ordered",
    lines: [poLine("SO-000143", "1", "Royal Dining (8 seats) — Teak, glass top", 205_000)] },
  { number: "PO-000035", factory: "Lahore Woodcraft", date: "2026-11-19", paid: 30_000, expected: "2026-12-02", status: "inProduction",
    lines: [poLine("SO-000142", "1", "Modern Sofa Set — Velvet", 78_000)] },
  { number: "PO-000034", factory: "Lahore Woodcraft", date: "2026-11-19", paid: 0, expected: "2026-12-02", status: "inProduction",
    lines: [poLine("SO-000142", "2", "Coffee Table Set — Teak", 24_000)] },
  { number: "PO-000033", factory: "Chiniot Royal Works", date: "2026-11-13", paid: 50_000, expected: "2026-11-22", status: "late",
    lines: [poLine("SO-000141", "1", "Royal Sofa Set — Velvet, centre table, side tables", 140_000)] },
  { number: "PO-000032", factory: "Gujrat Furniture House", date: "2026-11-06", paid: 95_000, expected: "2026-11-20", status: "received",
    lines: [poLine("SO-000140", "1", "Classic Dining Set — Sheesham", 95_000)] },
  { number: "PO-000030", factory: "Lahore Woodcraft", date: "2026-10-29", paid: 98_000, expected: "2026-11-13", status: "received",
    lines: [poLine("SO-000139", "1", "L-Shape Corner Sofa — Fabric", 98_000)] },
  { number: "PO-000029", factory: "Chiniot Royal Works", date: "2026-10-21", paid: 60_000, expected: "2026-11-07", status: "received",
    lines: [poLine("SO-000138", "1", "Classic Bed — Kikar", 60_000)] },
];

export interface GoodsReceipt {
  number: string;
  purchaseOrder: string;
  factory: string;
  date: string;
  condition: "good" | "minorDamage";
  invoiceNo: string;
  receivedBy: string;
}

export const goodsReceipts: GoodsReceipt[] = [
  { number: "GR-000021", purchaseOrder: "PO-000032", factory: "Gujrat Furniture House", date: "2026-11-21", condition: "good", invoiceNo: "GFH-8812", receivedBy: "Rashid" },
  { number: "GR-000020", purchaseOrder: "PO-000030", factory: "Lahore Woodcraft", date: "2026-11-14", condition: "minorDamage", invoiceNo: "LW-2291", receivedBy: "Rashid" },
  { number: "GR-000019", purchaseOrder: "PO-000029", factory: "Chiniot Royal Works", date: "2026-11-08", condition: "good", invoiceNo: "CRW-0457", receivedBy: "Naveed" },
];

export type DeliveryStatus = "scheduled" | "outForDelivery" | "delivered";

export interface Delivery {
  order: string;
  customer: string;
  address: string;
  date: string;
  team: string;
  balanceToCollect: number;
  status: DeliveryStatus;
}

export const deliveries: Delivery[] = [
  { order: "SO-000140", customer: "Mrs. Ayesha Siddiqui", address: "Gulberg III", date: "2026-11-27", team: "Rashid, Naveed", balanceToCollect: 0, status: "scheduled" },
  { order: "SO-000141", customer: "Mr. Imran Khan", address: "DHA Phase 5", date: "2026-12-05", team: "Rashid, Javed", balanceToCollect: 148_000, status: "scheduled" },
  { order: "SO-000142", customer: "Mr. Bilal Ahmed", address: "Model Town", date: "2026-12-10", team: "—", balanceToCollect: 65_000, status: "scheduled" },
  { order: "SO-000139", customer: "Mr. Usman Tariq", address: "Bahria Town", date: "2026-11-21", team: "Naveed, Javed", balanceToCollect: 0, status: "delivered" },
];

export type ExpenseCategory = "lunch" | "tea" | "transport" | "salaries" | "rent" | "utilities" | "repairs" | "misc";

export interface Expense {
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  enteredBy: string;
  approved: boolean;
}

export const expenses: Expense[] = [
  { date: "2026-11-25", category: "lunch", description: "Workers' lunch (6)", amount: 3_000, enteredBy: "Ali", approved: true },
  { date: "2026-11-25", category: "tea", description: "Guest tea", amount: 800, enteredBy: "Ali", approved: true },
  { date: "2026-11-25", category: "transport", description: "Loader to Gulberg", amount: 3_200, enteredBy: "Manager", approved: false },
  { date: "2026-11-24", category: "salaries", description: "Weekly wages (5 workers)", amount: 20_000, enteredBy: "Manager", approved: true },
  { date: "2026-11-23", category: "repairs", description: "Showroom light fittings", amount: 4_500, enteredBy: "Manager", approved: true },
  { date: "2026-11-01", category: "rent", description: "Showroom rent, November", amount: 60_000, enteredBy: "Manager", approved: true },
  { date: "2026-11-01", category: "utilities", description: "Electricity bill", amount: 20_000, enteredBy: "Manager", approved: true },
];

/** Today's cash book (the brief's worked example). */
export const cashBook = {
  date: "2026-11-25",
  opening: 100_000,
  lines: [
    { key: "advances", amount: 80_000, direction: "in" as const },
    { key: "balanceCollections", amount: 120_000, direction: "in" as const },
    { key: "factoryPayments", amount: 95_000, direction: "out" as const },
    { key: "dailyExpenses", amount: 7_000, direction: "out" as const },
    { key: "salaries", amount: 20_000, direction: "out" as const },
  ],
};

/** A month's profit & loss (the brief's worked example). */
export const monthlyPnl = {
  month: "2026-11",
  netSales: 1_500_000,
  costOfGoodsSold: 950_000,
  operatingExpenses: [
    { key: "salaries", amount: 120_000 },
    { key: "rentUtilities", amount: 80_000 },
    { key: "delivery", amount: 35_000 },
    { key: "refreshments", amount: 15_000 },
  ],
};

export type Role = "salesman" | "manager" | "admin";

export interface StaffUser {
  name: string;
  username: string;
  role: Role | "worker" | "skilledWorker";
  active: boolean;
}

export const staffUsers: StaffUser[] = [
  { name: "Ali Hassan", username: "ali", role: "salesman", active: true },
  { name: "Kashif Mehmood", username: "kashif", role: "salesman", active: true },
  { name: "Tariq Javed", username: "tariq", role: "manager", active: true },
  { name: "Owner", username: "admin", role: "admin", active: true },
  { name: "Rashid", username: "rashid", role: "worker", active: true },
  { name: "Naveed", username: "naveed", role: "worker", active: true },
  { name: "Javed (carpenter)", username: "javed", role: "skilledWorker", active: true },
];

/** Manager dashboard figures for "this week". */
export const weekKpis = {
  sales: 1_285_000,
  collections: 820_000,
  openFactoryOrders: 6,
  pendingDeliveries: 4,
};

export const auditEvents = [
  { when: "2026-11-25 16:42", who: "Ali", action: "orderCreated", ref: "SO-000144" },
  { when: "2026-11-25 15:10", who: "Tariq", action: "expenseApproved", ref: "EX-000318" },
  { when: "2026-11-25 12:05", who: "Tariq", action: "poIssued", ref: "PO-000036" },
  { when: "2026-11-24 18:30", who: "admin", action: "userChanged", ref: "kashif" },
];
