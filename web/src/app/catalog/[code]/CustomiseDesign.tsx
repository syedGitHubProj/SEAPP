"use client";

import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DesignArt } from "@/components/DesignArt";
import { OrderSteps } from "@/components/OrderFlow";
import { Button, Card, Money } from "@/components/ui";
import { findDesign } from "@/data/sample";
import { addDraftItem, listUnitPrice } from "@/lib/prototype-store";

export function CustomiseDesign({ code }: { code: string }) {
  const t = useTranslations("customise");
  const tm = useTranslations("materials");
  const tacc = useTranslations("accessories");
  const router = useRouter();
  const design = findDesign(code)!;

  const [tab, setTab] = useState<"customise" | "details">("customise");
  const [materialId, setMaterialId] = useState(design.materials[0].id);
  const [color, setColor] = useState(design.colors[1] ?? design.colors[0]);
  const [accessoryIds, setAccessoryIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  // null = follow the catalogue price; a string = the salesman typed an agreed price.
  const [agreedText, setAgreedText] = useState<string | null>(null);

  const options = { designCode: code, materialId, color, accessoryIds, quantity };
  const listUnit = listUnitPrice(options);
  const typed = agreedText === null ? null : Number(agreedText.replace(/[^\d]/g, "")) || 0;
  const agreedUnit = typed ?? listUnit;
  const discount = Math.max(0, listUnit - agreedUnit) * quantity;
  const total = agreedUnit * quantity;

  const toggleAccessory = (id: string) =>
    setAccessoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const addToOrder = () => {
    addDraftItem({ ...options, agreedUnitPrice: agreedUnit });
    router.push("/orders/new");
  };

  return (
    <>
      <OrderSteps current={2} />
      <Link href="/catalog" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-700">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <DesignArt category={design.category} className="aspect-[4/3]" />
          <div className="flex items-start justify-between gap-3 p-4">
            <div>
              <h1 className="text-xl font-semibold text-brand-900">{design.name}</h1>
              <p className="text-sm text-zinc-500">{design.code}</p>
            </div>
            <Money amount={design.price} className="text-lg font-semibold" />
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
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("dimensions")}</dt><dd>{design.dimensions}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("wood")}</dt><dd>{design.wood}</dd></div>
              <div><dt className="text-zinc-500">{t("description")}</dt><dd className="mt-1">{design.description}</dd></div>
            </dl>
          ) : (
            <div className="space-y-5">
              <fieldset>
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
                      {tm(m.id)}
                      {m.surcharge > 0 && <span className="ms-1 opacity-80">(+<Money amount={m.surcharge} />)</span>}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{t("color")}</legend>
                <div className="flex flex-wrap gap-2">
                  {design.colors.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={color === c}
                      aria-label={t("colorOption", { n: i + 1 })}
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`flex size-11 items-center justify-center rounded-xl border ${
                        color === c ? "border-brand-800 ring-2 ring-brand-600 ring-offset-2" : "border-black/10"
                      }`}
                    >
                      {color === c && <Check className="size-5 text-white mix-blend-difference" />}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{t("accessories")}</legend>
                <div className="space-y-2">
                  {design.accessories.map((a) => (
                    <label key={a.id} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-black/10 px-3">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={accessoryIds.includes(a.id)}
                          onChange={() => toggleAccessory(a.id)}
                          className="size-5 accent-brand-700"
                        />
                        {tacc(a.id)}
                      </span>
                      <span className="text-sm text-zinc-600">+<Money amount={a.price} /></span>
                    </label>
                  ))}
                </div>
              </fieldset>

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
