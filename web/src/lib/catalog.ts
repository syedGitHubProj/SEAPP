import type { DesignDto } from "./api-types";

/** What the salesman chose for one design: a material, and how many of each item (0 = not chosen). */
export interface DesignChoice {
  materialId: string | null;
  quantities: Record<string, number>;
}

/** The items ticked by default, one of each: where a salesman starts. */
export function defaultQuantities(design: Pick<DesignDto, "items">): Record<string, number> {
  return Object.fromEntries(design.items.filter((i) => i.isDefault && i.isActive).map((i) => [i.id, 1]));
}

/**
 * Catalogue price of the chosen set: each chosen item's price × its quantity, plus the material's
 * extra charge (once). Null when the person may not see prices (the API leaves them out for a Salesman).
 */
export function catalogPrice(design: Pick<DesignDto, "materials" | "items">, choice: DesignChoice): number | null {
  const chosen = design.items.filter((i) => (choice.quantities[i.id] ?? 0) > 0);
  if (design.items.some((i) => i.price === null)) return null;
  const items = chosen.reduce((sum, i) => sum + (i.price ?? 0) * choice.quantities[i.id], 0);
  const surcharge = design.materials.find((m) => m.id === choice.materialId)?.surcharge ?? 0;
  return chosen.length === 0 ? 0 : items + surcharge;
}

/** The placeholder artwork to show for a category name when a design has no photo. */
export type ArtKind = "royal" | "sofa" | "bedroom" | "dining" | "living";

export function artFor(categoryName: string | undefined): ArtKind {
  const name = (categoryName ?? "").toLowerCase();
  if (name.includes("royal")) return "royal";
  if (name.includes("bed")) return "bedroom";
  if (name.includes("dining")) return "dining";
  if (name.includes("sofa")) return "sofa";
  return "living";
}

/** Parses a typed money amount ("125,000" → 125000). Returns null when it isn't a valid amount. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}
