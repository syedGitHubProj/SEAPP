import { Armchair, BedDouble, Crown, Sofa, UtensilsCrossed } from "lucide-react";
import type { Category } from "@/data/sample";

const art: Record<Category, { icon: typeof Sofa; bg: string }> = {
  royal: { icon: Crown, bg: "from-amber-100 via-amber-50 to-brand-100" },
  sofa: { icon: Sofa, bg: "from-brand-100 via-sand-50 to-sky-100" },
  bedroom: { icon: BedDouble, bg: "from-violet-100 via-sand-50 to-amber-50" },
  dining: { icon: UtensilsCrossed, bg: "from-orange-100 via-sand-50 to-brand-50" },
  living: { icon: Armchair, bg: "from-sky-100 via-sand-50 to-brand-100" },
};

/** Placeholder artwork until real design photos are uploaded (Phase 2). */
export function DesignArt({ category, className = "" }: { category: Category; className?: string }) {
  const { icon: Icon, bg } = art[category];
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center bg-gradient-to-br ${bg} ${className}`}
    >
      <Icon className="size-1/3 max-h-20 max-w-20 text-brand-800/70" strokeWidth={1.25} />
    </div>
  );
}
