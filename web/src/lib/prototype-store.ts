"use client";

/**
 * Browser-only state for the parts that are still a prototype until Phase 3: the Sale Order being
 * built, and Sale Orders and factory orders created during the demo. Kept in localStorage so a page
 * refresh doesn't lose them. Customers, factories, the catalogue and sign-in now come from the API.
 */
import { useMemo, useSyncExternalStore } from "react";
import {
  purchaseOrders as samplePurchaseOrders,
  salesOrders as sampleSalesOrders,
  type FulfilmentStatus,
  type PurchaseOrder,
  type SalesOrder,
} from "@/data/sample";
import type { ArtKind } from "@/lib/catalog";
import { findPoLine } from "@/lib/purchasing";

/**
 * One design in the Sale Order being built. It keeps a snapshot of the design, the choices and
 * the prices at the moment it was added, so later catalogue changes don't alter the order.
 */
export interface DraftItem {
  id: string;
  designId: string;
  designCode: string;
  designName: string;
  art: ArtKind;
  photoUrl: string | null;
  materialName: string | null;
  colorName: string | null;
  colorHex: string | null;
  accessories: { name: string; price: number | null }[];
  quantity: number;
  /** Catalogue price per piece (base + material + accessories); null when hidden from a Salesman. */
  listUnitPrice: number | null;
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
  customerName: string | null;
  newCustomer: NewCustomer | null;
  deliveryDate: string;
}

export type PaymentMethod = "cash" | "bank" | "other";

interface State {
  draft: Draft;
  /** Sale Orders created in this demo (newest first). */
  placed: SalesOrder[];
  /** Factory orders created in this demo (newest first). */
  purchases: PurchaseOrder[];
}

// v3: draft items keep a snapshot of the API design (older saved drafts are ignored).
const STORAGE_KEY = "sellease-prototype-v3";

const emptyDraft: Draft = { items: [], customerId: null, customerName: null, newCustomer: null, deliveryDate: "" };
const initialState: State = { draft: emptyDraft, placed: [], purchases: [] };

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

export const useDraft = () => useStore((s) => s.draft);
/** Only the Sale Orders created in this demo (newest first). */
export const usePlacedSalesOrders = () => useStore((s) => s.placed);
/** Only the factory orders created in this demo (newest first). */
export const useCreatedPurchaseOrders = () => useStore((s) => s.purchases);

/** Factory orders: demo-created first, then the sample ones. */
export function usePurchaseOrders(): PurchaseOrder[] {
  const created = useStore((s) => s.purchases);
  return useMemo(() => [...created, ...samplePurchaseOrders], [created]);
}

/**
 * Sale Orders: demo-created first, then the sample ones. A confirmed order
 * shows as "Factory ordered" once any of its lines is on a factory order.
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

/** Saves a Sale Order (in this browser only until Phase 3) and clears the draft. */
export function placeOrder(order: SalesOrder) {
  update((s) => ({ ...s, placed: [order, ...s.placed], draft: emptyDraft }));
}

export function createPurchaseOrder(po: PurchaseOrder) {
  update((s) => ({ ...s, purchases: [po, ...s.purchases] }));
}

/** Short description of a draft item's choices, e.g. "Leather · Bottle green · Centre table". */
export const draftItemOptions = (item: DraftItem) =>
  [item.materialName, item.colorName, ...item.accessories.map((a) => a.name)].filter(Boolean).join(" · ");

export const draftItemTotal = (item: DraftItem) => item.agreedUnitPrice * item.quantity;

export const draftTotal = (draft: Draft) => draft.items.reduce((sum, i) => sum + draftItemTotal(i), 0);
