"use client";

import { Package, Pencil, Plus, Search, Tags } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { DesignImage } from "@/components/DesignArt";
import { OrderSteps, OrderSummaryPanel } from "@/components/OrderFlow";
import { Badge, Card, LinkButton, LoadState, Money, PageHeader } from "@/components/ui";
import { errorKey, useApiQuery } from "@/lib/api";
import type { CategoryDto, DesignDto, OtherItemDto } from "@/lib/api-types";
import { artFor, catalogPrice, defaultQuantities } from "@/lib/catalog";
import { useDraft } from "@/lib/prototype-store";
import { useCan } from "@/lib/session";

const OTHERS = "other-items";

/** Price of a design's default items, for those who may see prices. */
function DefaultPrice({ design }: { design: DesignDto }) {
  const price = catalogPrice(design, { materialId: design.materials[0]?.id ?? null, quantities: defaultQuantities(design) });
  return price === null || price === 0 ? null : <Money amount={price} className="mt-1 text-sm font-semibold text-brand-800" />;
}

export default function CatalogPage() {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const draft = useDraft();
  const canManage = useCan("catalog.edit");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  const categories = useApiQuery<CategoryDto[]>("/api/catalog/categories");
  const designs = useApiQuery<DesignDto[]>(`/api/catalog/designs${showInactive ? "?includeInactive=true" : ""}`);
  const others = useApiQuery<OtherItemDto[]>("/api/catalog/other-items");
  const categoryName = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c.name])), [categories.data]);

  const all = designs.data ?? [];
  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (d) =>
      (category === "all" || d.categoryId === category) &&
      (q === "" ||
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (categoryName.get(d.categoryId) ?? "").toLowerCase().includes(q)),
  );
  const countFor = (id: string) => (id === "all" ? all.length : all.filter((d) => d.categoryId === id).length);
  // "Other items" (mirror, lights…) are sold without a design; they have their own filter.
  const showOthers = category === OTHERS;
  const shownOthers = (others.data ?? []).filter((i) => q === "" || i.name.toLowerCase().includes(q));
  const failed = designs.error ?? categories.error;

  return (
    <>
      {draft.items.length > 0 && <OrderSteps current={1} />}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canManage && (
            <span className="flex flex-wrap gap-2">
              <LinkButton href="/catalog/categories" variant="ghost">
                <Tags className="size-4" /> {t("manageCategories")}
              </LinkButton>
              <LinkButton href="/catalog/other-items" variant="ghost">
                <Package className="size-4" /> {t("manageOtherItems")}
              </LinkButton>
              <LinkButton href="/catalog/edit" variant="secondary">
                <Plus className="size-4" /> {t("addDesign")}
              </LinkButton>
            </span>
          )
        }
      />

      <div className="lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6">
        <div className="min-w-0">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="min-h-11 w-full rounded-xl border border-black/10 bg-white ps-9 pe-3 text-sm"
            />
          </div>

          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t("categories")}>
            {[{ id: "all", name: t("all") }, ...(categories.data ?? [])].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-medium ${
                  category === c.id ? "bg-brand-700 text-white" : "border border-black/10 bg-white text-zinc-700"
                }`}
              >
                {c.name} <span className="opacity-70">({countFor(c.id)})</span>
              </button>
            ))}
            <button
              type="button"
              aria-pressed={showOthers}
              onClick={() => setCategory(OTHERS)}
              className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-medium ${
                showOthers ? "bg-brand-700 text-white" : "border border-black/10 bg-white text-zinc-700"
              }`}
            >
              {t("otherItems")} <span className="opacity-70">({others.data?.length ?? 0})</span>
            </button>
          </div>

          {canManage && !showOthers && (
            <label className="mb-4 flex min-h-10 items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="size-5 accent-brand-700" />
              {tc("showInactive")}
            </label>
          )}

          {showOthers ? (
            others.data === undefined ? (
              <LoadState loading={others.loading} error={others.error} onRetry={others.reload} loadingText={tc("loading")} errorText={te(errorKey(others.error))} retryText={tc("retry")} />
            ) : shownOthers.length === 0 ? (
              <Card className="p-6 text-center text-sm text-zinc-500">{t("noOtherItems")}</Card>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {shownOthers.map((i) => (
                  <li key={i.id}>
                    <Card className="flex h-full flex-col p-3">
                      <Package className="mb-2 size-6 text-brand-700" />
                      <h2 className="text-sm font-semibold">{i.name}</h2>
                      {i.price !== null && <Money amount={i.price} className="mt-1 text-sm font-semibold text-brand-800" />}
                      <LinkButton href={`/catalog/sell-item?id=${i.id}`} className="mt-auto min-h-9" aria-label={t("selectDesign", { name: i.name })}>
                        {t("select")}
                      </LinkButton>
                    </Card>
                  </li>
                ))}
              </ul>
            )
          ) : designs.data === undefined || failed ? (
            <LoadState
              loading={designs.loading}
              error={failed}
              onRetry={() => {
                designs.reload();
                categories.reload();
              }}
              loadingText={tc("loading")}
              errorText={`${t("loadFailed")} ${te(errorKey(failed))}`}
              retryText={tc("retry")}
            />
          ) : shown.length === 0 ? (
            <Card className="p-6 text-center text-sm text-zinc-500">{t("noResults")}</Card>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((d) => (
                <li key={d.id}>
                  <Card className="flex h-full flex-col overflow-hidden">
                    <DesignImage
                      photoUrl={d.photos[0]?.url}
                      category={artFor(categoryName.get(d.categoryId))}
                      alt={d.name}
                      className="aspect-[4/3] w-full"
                    />
                    <div className="flex flex-1 flex-col p-3">
                      <h2 className="text-sm font-semibold">{d.name}</h2>
                      <p className="text-xs text-zinc-500">
                        {d.code} {!d.isActive && <Badge>{t("inactiveBadge")}</Badge>}
                      </p>
                      <DefaultPrice design={d} />
                      <div className="mt-auto flex gap-2 pt-3">
                        {d.isActive && (
                          <LinkButton href={`/catalog/${d.code}`} className="min-h-9 flex-1" aria-label={t("selectDesign", { name: d.name })}>
                            {t("select")}
                          </LinkButton>
                        )}
                        {canManage && (
                          <Link
                            href={`/catalog/edit?code=${encodeURIComponent(d.code)}`}
                            aria-label={`${t("edit")} ${d.code}`}
                            className="flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-black/10 text-brand-800 hover:bg-brand-50"
                          >
                            <Pencil className="size-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="mt-6 hidden lg:mt-0 lg:block">
          <div className="sticky top-20">
            <OrderSummaryPanel />
          </div>
        </aside>
      </div>

      {draft.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-4 lg:hidden">
          <Link
            href="/orders/new"
            className="mx-auto flex max-w-lg items-center justify-between rounded-2xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white shadow-lg"
          >
            <span>{t("itemsInOrder", { count: draft.items.length })}</span>
            <span>{t("continue")}</span>
          </Link>
        </div>
      )}
    </>
  );
}
