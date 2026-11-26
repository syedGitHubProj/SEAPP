"use client";

/**
 * Browser-only state for the clickable prototype: who you are "viewing as",
 * the order being built, and orders placed during the demo.
 * Kept in localStorage so a page refresh doesn't lose the demo. Replaced by the API in Phase 2+.
 */
import { useSyncExternalStore } from "react";
import { findDesign, type Role } from "@/data/sample";
import { orderTotal, type OrderLine } from "@/lib/orders";

export interface DraftItem {
  id: string;
  designCode: string;
  materialId: string;
  color: string;
  accessoryIds: string[];
  quantity: number;
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

export interface PlacedOrder {
  number: string;
  customerName: string;
  items: string;
  total: number;
  advance: number;
  method: PaymentMethod;
  deliveryDate: string;
  createdAt: string;
}

interface State {
  role: Role;
  draft: Draft;
  placed: PlacedOrder[];
}

const STORAGE_KEY = "sellease-prototype-v1";

const emptyDraft: Draft = { items: [], customerId: null, newCustomer: null, deliveryDate: "" };
const initialState: State = { role: "salesman", draft: emptyDraft, placed: [] };

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
export const usePlacedOrders = () => useStore((s) => s.placed);

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

export function placeOrder(order: PlacedOrder) {
  update((s) => ({ ...s, placed: [order, ...s.placed], draft: emptyDraft }));
}

export function clearDraft() {
  update((s) => ({ ...s, draft: emptyDraft }));
}

/** Converts a draft item into priced order-line figures using the sample catalogue. */
export function toOrderLine(item: DraftItem): OrderLine {
  const design = findDesign(item.designCode);
  if (!design) return { basePrice: 0, materialSurcharge: 0, accessories: [], quantity: item.quantity };
  return {
    basePrice: design.price,
    materialSurcharge: design.materials.find((m) => m.id === item.materialId)?.surcharge ?? 0,
    accessories: design.accessories.filter((a) => item.accessoryIds.includes(a.id)),
    quantity: item.quantity,
  };
}

export function draftTotal(draft: Draft): number {
  return orderTotal(draft.items.map(toOrderLine));
}
