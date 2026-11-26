"use client";

/**
 * Browser-only state for the clickable prototype: who you are "viewing as",
 * the sales order being built, and sales/purchase orders created during the demo.
 * Kept in localStorage so a page refresh doesn't lose the demo. Replaced by the API in Phase 2+.
 */
import { useMemo, useSyncExternalStore } from "react";
import {
  findDesign,
  purchaseOrders as samplePurchaseOrders,
  salesOrders as sampleSalesOrders,
  type FulfilmentStatus,
  type PurchaseOrder,
  type Role,
  type SalesOrder,
} from "@/data/sample";
import { type OrderLine, unitPrice } from "@/lib/orders";
import { findPoLine } from "@/lib/purchasing";

export interface DraftItem {
  id: string;
  designCode: string;
  materialId: string;
  color: string;
  accessoryIds: string[];
  quantity: number;
  /** Price per piece agreed with the customer (may be below the catalogue price). */
  agreedUnitPrice: number;
}

export interface NewCustomer {
  name: string;
  phone: string;
  address: string;
}

export interface Draft {
  items: DraftItem[];
  customerId: string | null;
  newCustomer: NewCustomer | null;
  deliveryDate: string;
}

export type PaymentMethod = "cash" | "bank" | "other";

interface State {
  role: Role;
  draft: Draft;
  /** Sales orders created in this demo (newest first). */
  placed: SalesOrder[];
  /** Purchase orders created in this demo (newest first). */
  purchases: PurchaseOrder[];
}

const STORAGE_KEY = "sellease-prototype-v2";

const emptyDraft: Draft = { items: [], customerId: null, newCustomer: null, deliveryDate: "" };
const initialState: State = { role: "salesman", draft: emptyDraft, placed: [], purchases: [] };

function load(): State {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialState, ...(JSON.parse(raw) as Partial<State>) } : initialState;
  } catch {
    return initialState;
  }
}

let state: State | null = null;
const listeners = new Set<() => void>();

function current(): State {
  if (state === null) state = load();
  return state;
}

function update(change: (s: State) => State) {
  state = change(current());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked (private window): the demo still works until refresh.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(current()),
    () => select(initialState),
  );
}

export const useRole = () => useStore((s) => s.role);
export const useDraft = () => useStore((s) => s.draft);
/** Only the sales orders created in this demo (newest first). */
export const usePlacedSalesOrders = () => useStore((s) => s.placed);
/** Only the purchase orders created in this demo (newest first). */
export const useCreatedPurchaseOrders = () => useStore((s) => s.purchases);

/** Purchase orders: demo-created first, then the sample ones. */
export function usePurchaseOrders(): PurchaseOrder[] {
  const created = useStore((s) => s.purchases);
  return useMemo(() => [...created, ...samplePurchaseOrders], [created]);
}

/**
 * Sales orders: demo-created first, then the sample ones. A confirmed order
 * shows as "Factory ordered" once any of its lines is on a purchase order.
 */
export function useSalesOrders(): SalesOrder[] {
  const placed = useStore((s) => s.placed);
  const pos = usePurchaseOrders();
  return useMemo(
    () =>
      [...placed, ...sampleSalesOrders].map((so) => {
        const ordered = so.lines.some((l) => findPoLine(so.number, l.id, pos));
        const status: FulfilmentStatus = so.status === "confirmed" && ordered ? "factoryOrdered" : so.status;
        return status === so.status ? so : { ...so, status };
      }),
    [placed, pos],
  );
}

export function setRole(role: Role) {
  update((s) => ({ ...s, role }));
}

export function addDraftItem(item: Omit<DraftItem, "id">) {
  const id = `${item.designCode}-${Date.now()}`;
  update((s) => ({ ...s, draft: { ...s.draft, items: [...s.draft.items, { ...item, id }] } }));
}

export function removeDraftItem(id: string) {
  update((s) => ({ ...s, draft: { ...s.draft, items: s.draft.items.filter((i) => i.id !== id) } }));
}

export function updateDraft(patch: Partial<Draft>) {
  update((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
}

export function placeOrder(order: SalesOrder) {
  update((s) => ({ ...s, placed: [order, ...s.placed], draft: emptyDraft }));
}

export function createPurchaseOrder(po: PurchaseOrder) {
  update((s) => ({ ...s, purchases: [po, ...s.purchases] }));
}

/** Catalogue price figures for a draft item (before any agreed discount). */
export function toOrderLine(item: Omit<DraftItem, "id" | "agreedUnitPrice">): OrderLine {
  const design = findDesign(item.designCode);
  if (!design) return { basePrice: 0, materialSurcharge: 0, accessories: [], quantity: item.quantity };
  return {
    basePrice: design.price,
    materialSurcharge: design.materials.find((m) => m.id === item.materialId)?.surcharge ?? 0,
    accessories: design.accessories.filter((a) => item.accessoryIds.includes(a.id)),
    quantity: item.quantity,
  };
}

export const listUnitPrice = (item: Omit<DraftItem, "id" | "agreedUnitPrice">) => unitPrice(toOrderLine(item));

export const draftItemTotal = (item: DraftItem) => item.agreedUnitPrice * item.quantity;

export const draftTotal = (draft: Draft) => draft.items.reduce((sum, i) => sum + draftItemTotal(i), 0);
