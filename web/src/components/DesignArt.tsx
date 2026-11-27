import { Armchair, BedDouble, Crown, Sofa, UtensilsCrossed } from "lucide-react";
import type { ArtKind } from "@/lib/catalog";

const art: Record<ArtKind, { icon: typeof Sofa; bg: string }> = {
  royal: { icon: Crown, bg: "from-amber-100 via-amber-50 to-brand-100" },
  sofa: { icon: Sofa, bg: "from-brand-100 via-sand-50 to-sky-100" },
  bedroom: { icon: BedDouble, bg: "from-violet-100 via-sand-50 to-amber-50" },
  dining: { icon: UtensilsCrossed, bg: "from-orange-100 via-sand-50 to-brand-50" },
  living: { icon: Armchair, bg: "from-sky-100 via-sand-50 to-brand-100" },
};

/** Placeholder artwork for a design that has no photo yet. */
export function DesignArt({ category, className = "" }: { category: ArtKind; className?: string }) {
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

/** A design's main photo, or the placeholder artwork when it has none. */
export function DesignImage({ photoUrl, category, alt, className = "" }: { photoUrl: string | null | undefined; category: ArtKind; alt: string; className?: string }) {
  if (!photoUrl) return <DesignArt category={category} className={className} />;
  // A plain <img>: photos come from our own API with the sign-in cookie, which the Next.js image optimiser can't send.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photoUrl} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}
