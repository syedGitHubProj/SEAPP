"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DesignArt } from "@/components/DesignArt";
import { Card, LinkButton, Money } from "@/components/ui";
import { findDesign } from "@/data/sample";
import { draftItemTotal, draftTotal, listUnitPrice, removeDraftItem, useDraft, type DraftItem } from "@/lib/prototype-store";

const steps = ["selectDesigns", "customise", "customerPayment", "confirm"] as const;

/** Step indicator for the new-order wizard (1-based current step). */
export function OrderSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  const t = useTranslations("orderSteps");
  return (
    <ol className="mb-5 flex items-center gap-1" aria-label={t("label")}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={s} className="flex flex-1 items-center gap-1" aria-current={active ? "step" : undefined}>
            <span className="flex flex-col items-center gap-1 text-center">
              <span
                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                  active ? "bg-brand-700 text-white" : done ? "bg-brand-200 text-brand-900" : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {n}
              </span>
              <span className={`hidden text-xs sm:block ${active ? "font-semibold text-brand-800" : "text-zinc-500"}`}>{t(s)}</span>
            </span>
            {n < steps.length && <span className="h-px flex-1 bg-zinc-300" />}
          </li>
        );
      })}
    </ol>
  );
}

export function DraftItemRow({ item, editable = true }: { item: DraftItem; editable?: boolean }) {
  const t = useTranslations("newOrder");
  const tm = useTranslations("materials");
  const tacc = useTranslations("accessories");
  const design = findDesign(item.designCode);
  if (!design) return null;
  const extras = [tm(item.materialId), ...item.accessoryIds.map((a) => tacc(a))].join(" · ");
  return (
    <div className="flex items-center gap-3 py-3">
      <DesignArt category={design.category} className="size-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{design.name}</div>
        <div className="truncate text-xs text-zinc-500">
          {design.code} · {extras}
          {item.quantity > 1 && ` · ×${item.quantity}`}
        </div>
        <div className="flex items-baseline gap-2">
          <Money amount={draftItemTotal(item)} className="text-sm font-semibold" />
          {item.agreedUnitPrice < listUnitPrice(item) && (
            <s className="text-xs text-zinc-400">
              <Money amount={listUnitPrice(item) * item.quantity} />
            </s>
          )}
        </div>
      </div>
      {editable && (
        <div className="flex shrink-0">
          <button
            type="button"
            onClick={() => removeDraftItem(item.id)}
            aria-label={t("removeItem", { name: design.name })}
            className="flex size-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Running order summary shown beside the catalogue on wide screens. */
export function OrderSummaryPanel() {
  const t = useTranslations("newOrder");
  const draft = useDraft();
  if (draft.items.length === 0) return null;
  return (
    <Card className="p-4">
      <h2 className="font-semibold text-brand-900">{t("summaryTitle")}</h2>
      <p className="text-xs text-zinc-500">{t("selectedItems", { count: draft.items.length })}</p>
      <div className="divide-y divide-black/5">
        {draft.items.map((i) => (
          <DraftItemRow key={i.id} item={i} />
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-black/5 pt-3 font-semibold">
        <span>{t("total")}</span>
        <Money amount={draftTotal(draft)} />
      </div>
      <LinkButton href="/orders/new" className="mt-4 w-full">
        {t("nextCustomer")}
      </LinkButton>
    </Card>
  );
}
