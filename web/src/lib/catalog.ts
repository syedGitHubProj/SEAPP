import type { DesignDto } from "./api-types";

/** What the salesman chose for one design. */
export interface DesignChoice {
  materialId: string | null;
  accessoryIds: string[];
}

/**
 * Catalogue price for one piece: base price + material surcharge + chosen accessories.
 * Null when the person may not see prices (the API leaves them out for a Salesman).
 */
export function catalogUnitPrice(design: Pick<DesignDto, "basePrice" | "materials" | "accessories">, choice: DesignChoice): number | null {
  if (design.basePrice === null) return null;
  const surcharge = design.materials.find((m) => m.id === choice.materialId)?.surcharge ?? 0;
  const accessories = design.accessories
    .filter((a) => a.id !== null && choice.accessoryIds.includes(a.id))
    .reduce((sum, a) => sum + (a.price ?? 0), 0);
  return design.basePrice + surcharge + accessories;
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
