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
import { artFor, catalogUnitPrice } from "@/lib/catalog";
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

  const [tab, setTab] = useState<"customise" | "details">("customise");
  const [materialId, setMaterialId] = useState<string | null>(design.materials[0]?.id ?? null);
  const [colorId, setColorId] = useState<string | null>(design.colors[0]?.id ?? null);
  const [accessoryIds, setAccessoryIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  // null = follow the catalogue price; a string = the salesman typed an agreed price.
  const [agreedText, setAgreedText] = useState<string | null>(null);

  const listUnit = catalogUnitPrice(design, { materialId, accessoryIds });
  const typed = agreedText === null ? null : Number(agreedText.replace(/[^\d]/g, "")) || 0;
  const agreedUnit = typed ?? listUnit;
  const discount = Math.max(0, listUnit - agreedUnit) * quantity;
  const total = agreedUnit * quantity;

  const toggleAccessory = (id: string) =>
    setAccessoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

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
      accessories: design.accessories.filter((a) => a.id && accessoryIds.includes(a.id)).map((a) => ({ name: a.name, price: a.price })),
      quantity,
      listUnitPrice: listUnit,
      agreedUnitPrice: agreedUnit,
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
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
          <div className="flex items-start justify-between gap-3 p-4">
            <div>
              <h1 className="text-xl font-semibold text-brand-900">{design.name}</h1>
              <p className="text-sm text-zinc-500">{design.code}</p>
            </div>
            <Money amount={design.basePrice} className="text-lg font-semibold" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-sand-100 p-1" role="tablist">
            {(["customise", "details"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`min-h-10 rounded-lg text-sm font-semibold ${tab === k ? "bg-white text-brand-800 shadow-sm" : "text-zinc-600"}`}
              >
                {t(k)}
              </button>
            ))}
          </div>

          {tab === "details" ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("dimensions")}</dt><dd>{design.dimensions ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("wood")}</dt><dd>{design.wood ?? "—"}</dd></div>
              <div><dt className="text-zinc-500">{t("description")}</dt><dd className="mt-1">{design.description ?? "—"}</dd></div>
            </dl>
          ) : (
            <div className="space-y-5">
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
                      {m.surcharge > 0 && <span className="ms-1 opacity-80">(+<Money amount={m.surcharge} />)</span>}
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

              {design.accessories.length > 0 && <fieldset>
                <legend className="mb-2 text-sm font-semibold">{t("accessories")}</legend>
                <div className="space-y-2">
                  {design.accessories.map((a) => (
                    <label key={a.id} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-black/10 px-3">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={a.id !== null && accessoryIds.includes(a.id)}
                          onChange={() => a.id && toggleAccessory(a.id)}
                          className="size-5 accent-brand-700"
                        />
                        {a.name}
                      </span>
                      <span className="text-sm text-zinc-600">+<Money amount={a.price} /></span>
                    </label>
                  ))}
                </div>
              </fieldset>}

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{t("quantity")}</span>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label={t("less")} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex size-10 items-center justify-center rounded-xl border border-black/10">
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
                  <button type="button" aria-label={t("more")} onClick={() => setQuantity((q) => q + 1)} className="flex size-10 items-center justify-center rounded-xl border border-black/10">
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3 border-t border-black/5 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">{t("catalogPrice")}</span>
              <Money amount={listUnit} />
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">{t("agreedPrice")}</span>
              <input
                inputMode="numeric"
                value={agreedText ?? String(listUnit)}
                onChange={(e) => setAgreedText(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-black/10 px-3 font-semibold tabular-nums"
              />
              <span className="mt-1 block text-xs text-zinc-500">{t("agreedPriceHint")}</span>
            </label>
            {discount > 0 && (
              <p className="text-sm text-amber-800">
                {t("discount")}: <Money amount={discount} />
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/5 pt-4">
            <div>
              <div className="text-xs text-zinc-500">{t("totalPrice")}</div>
              <Money amount={total} className="text-lg font-semibold text-brand-900" />
            </div>
            <Button onClick={addToOrder} disabled={agreedUnit <= 0}>{t("addToOrder")}</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
