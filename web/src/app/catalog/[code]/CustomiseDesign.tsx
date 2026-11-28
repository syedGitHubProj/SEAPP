"use client";

import { ArrowLeft, Check, Minus, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DesignImage } from "@/components/DesignArt";
import { OrderSteps } from "@/components/OrderFlow";
import { Button, Card, LinkButton, LoadState, Money } from "@/components/ui";
import { ApiError, errorKey, useApiQuery } from "@/lib/api";
import type { CategoryDto, DesignDto } from "@/lib/api-types";
import { artFor, catalogPrice, defaultQuantities } from "@/lib/catalog";
import { addDraftItem } from "@/lib/prototype-store";
import { useCan } from "@/lib/session";

export function CustomiseDesign({ code }: { code: string }) {
  const t = useTranslations("customise");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const { data: design, error, loading, reload } = useApiQuery<DesignDto>(`/api/catalog/designs/${encodeURIComponent(code)}`);
  const categories = useApiQuery<CategoryDto[]>("/api/catalog/categories");

  if (!design) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Card className="p-6 text-center text-sm">
          <p className="mb-4 text-zinc-600">{t("notFound")}</p>
          <LinkButton href="/catalog">{t("back")}</LinkButton>
        </Card>
      );
    }
    return <LoadState loading={loading} error={error} onRetry={reload} loadingText={tc("loading")} errorText={te(errorKey(error))} retryText={tc("retry")} />;
  }
  const categoryName = categories.data?.find((c) => c.id === design.categoryId)?.name;
  return <Customiser key={design.id} design={design} categoryName={categoryName} />;
}

function Customiser({ design, categoryName }: { design: DesignDto; categoryName: string | undefined }) {
  const t = useTranslations("customise");
  const router = useRouter();
  const canEdit = useCan("catalog.edit");
  const art = artFor(categoryName);
  // Items whose category item was switched off are shown only to editors; they can't be sold.
  const items = design.items.filter((i) => i.isActive);

  const [materialId, setMaterialId] = useState<string | null>(design.materials[0]?.id ?? null);
  const [colorId, setColorId] = useState<string | null>(design.colors[0]?.id ?? null);
  // How many of each item; the design's default items start at 1.
  const [quantities, setQuantities] = useState<Record<string, number>>(() => defaultQuantities(design));
  // null = follow the catalogue price; a string = the agreed price typed in.
  const [agreedText, setAgreedText] = useState<string | null>(null);

  const chosen = items.filter((i) => (quantities[i.id] ?? 0) > 0);
  // Null when prices are hidden (Salesman): then the agreed price must be typed in.
  const listPrice = catalogPrice(design, { materialId, quantities });
  const typed = agreedText === null ? null : Number(agreedText.replace(/[^\d]/g, "")) || 0;
  const agreed = typed ?? listPrice ?? 0;
  const discount = listPrice === null ? 0 : Math.max(0, listPrice - agreed);

  const setQuantity = (id: string, n: number) => setQuantities((q) => ({ ...q, [id]: Math.max(0, n) }));

  const addToOrder = () => {
    const material = design.materials.find((m) => m.id === materialId);
    const color = design.colors.find((c) => c.id === colorId);
    // Snapshot of the design, choices and prices as they are right now.
    addDraftItem({
      designId: design.id,
      designCode: design.code,
      designName: design.name,
      art,
      photoUrl: design.photos[0]?.url ?? null,
      materialName: material?.name ?? null,
      colorName: color?.name ?? null,
      colorHex: color?.hex ?? null,
      items: chosen.map((i) => ({ name: i.name, quantity: quantities[i.id], price: i.price })),
      quantity: 1,
      listUnitPrice: listPrice,
      agreedUnitPrice: agreed,
    });
    router.push("/orders/new");
  };

  return (
    <>
      <OrderSteps current={2} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href="/catalog" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-700">
          <ArrowLeft className="size-4" /> {t("back")}
        </Link>
        {canEdit && (
          <Link href={`/catalog/edit?code=${encodeURIComponent(design.code)}`} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-700">
            <Pencil className="size-4" /> {t("editDesign")}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <Card className="h-fit overflow-hidden">
          <DesignImage photoUrl={design.photos[0]?.url} category={art} alt={design.name} className="aspect-[4/3] w-full" />
          {design.photos.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto px-4 pt-3">
              {design.photos.slice(1).map((p) => (
                <li key={p.id} className="shrink-0">
                  <DesignImage photoUrl={p.url} category={art} alt={design.name} className="size-16 rounded-lg" />
                </li>
              ))}
            </ul>
          )}
          <div className="p-4">
            <h1 className="text-xl font-semibold text-brand-900">{design.name}</h1>
            <p className="text-sm text-zinc-500">{design.code}</p>
            {design.description && <p className="mt-2 text-sm text-zinc-700">{design.description}</p>}
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t("items")}</legend>
              <p className="mb-2 text-xs text-zinc-500">{t("itemsHint")}</p>
              <ul className="space-y-2">
                {items.map((i) => {
                  const n = quantities[i.id] ?? 0;
                  return (
                    <li key={i.id} className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-black/10 px-3 py-1.5">
                      <label className="flex min-h-10 flex-1 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={n > 0}
                          onChange={(e) => setQuantity(i.id, e.target.checked ? 1 : 0)}
                          className="size-5 accent-brand-700"
                        />
                        <span className="min-w-0">
                          <span className="block">{i.name}</span>
                          {i.price !== null && (
                            <span className="block text-xs text-zinc-500">
                              <Money amount={i.price} />
                            </span>
                          )}
                        </span>
                      </label>
                      {n > 0 && (
                        <span className="flex items-center gap-1.5">
                          <button type="button" aria-label={t("less", { name: i.name })} onClick={() => setQuantity(i.id, n - 1)} className="flex size-9 items-center justify-center rounded-lg border border-black/10">
                            <Minus className="size-4" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-label={t("quantityOf", { name: i.name })}>
                            {n}
                          </span>
                          <button type="button" aria-label={t("more", { name: i.name })} onClick={() => setQuantity(i.id, n + 1)} className="flex size-9 items-center justify-center rounded-lg border border-black/10">
                            <Plus className="size-4" />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            {design.materials.length > 0 && <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t("material")}</legend>
              <div className="flex flex-wrap gap-2">
                {design.materials.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={materialId === m.id}
                    onClick={() => setMaterialId(m.id)}
                    className={`min-h-10 rounded-xl px-4 text-sm font-medium ${
                      materialId === m.id ? "bg-brand-700 text-white" : "border border-black/10 bg-white"
                    }`}
                  >
                    {m.name}
                    {m.surcharge !== null && m.surcharge > 0 && <span className="ms-1 opacity-80">(+<Money amount={m.surcharge} />)</span>}
                  </button>
                ))}
              </div>
            </fieldset>}

            {design.colors.length > 0 && <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t("color")}</legend>
              <div className="flex flex-wrap gap-2">
                {design.colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={colorId === c.id}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setColorId(c.id)}
                    style={{ backgroundColor: c.hex }}
                    className={`flex size-11 items-center justify-center rounded-xl border ${
                      colorId === c.id ? "border-brand-800 ring-2 ring-brand-600 ring-offset-2" : "border-black/10"
                    }`}
                  >
                    {colorId === c.id && <Check className="size-5 text-white mix-blend-difference" />}
                  </button>
                ))}
              </div>
              {colorId && <p className="mt-1 text-xs text-zinc-600">{design.colors.find((c) => c.id === colorId)?.name}</p>}
            </fieldset>}
          </div>

          <div className="mt-6 space-y-3 border-t border-black/5 pt-4">
            {listPrice !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">{t("catalogPrice")}</span>
                <Money amount={listPrice} />
              </div>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">{t("agreedPrice")}{listPrice === null && " *"}</span>
              <input
                inputMode="numeric"
                value={agreedText ?? (listPrice === null ? "" : String(listPrice))}
                onChange={(e) => setAgreedText(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-black/10 px-3 font-semibold tabular-nums"
              />
              <span className="mt-1 block text-xs text-zinc-500">{t(listPrice === null ? "agreedPriceTypeHint" : "agreedPriceHint")}</span>
            </label>
            {discount > 0 && (
              <p className="text-sm text-amber-800">
                {t("discount")}: <Money amount={discount} />
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/5 pt-4">
            <div>
              <div className="text-xs text-zinc-500">{t("itemsChosen", { count: chosen.reduce((s, i) => s + quantities[i.id], 0) })}</div>
              <Money amount={agreed} className="text-lg font-semibold text-brand-900" />
            </div>
            <Button onClick={addToOrder} disabled={agreed <= 0 || chosen.length === 0}>{t("addToOrder")}</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
