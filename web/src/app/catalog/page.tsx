"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DesignArt } from "@/components/DesignArt";
import { OrderSteps, OrderSummaryPanel } from "@/components/OrderFlow";
import { Card, LinkButton, Money, PageHeader } from "@/components/ui";
import { categories, designs, type Category } from "@/data/sample";
import { useDraft } from "@/lib/prototype-store";

export default function CatalogPage() {
  const t = useTranslations("catalog");
  const tc = useTranslations("categories");
  const draft = useDraft();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const q = query.trim().toLowerCase();
  const shown = designs.filter(
    (d) =>
      (category === "all" || d.category === category) &&
      (q === "" || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)),
  );

  const countFor = (c: Category | "all") => (c === "all" ? designs.length : designs.filter((d) => d.category === c).length);

  return (
    <>
      {draft.items.length > 0 && <OrderSteps current={1} />}
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
            {(["all", ...categories] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-medium ${
                  category === c ? "bg-brand-700 text-white" : "border border-black/10 bg-white text-zinc-700"
                }`}
              >
                {tc(c)} <span className="opacity-70">({countFor(c)})</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <Card className="p-6 text-center text-sm text-zinc-500">{t("noResults")}</Card>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((d) => (
                <li key={d.code}>
                  <Card className="flex h-full flex-col overflow-hidden">
                    <DesignArt category={d.category} className="aspect-[4/3]" />
                    <div className="flex flex-1 flex-col p-3">
                      <h2 className="text-sm font-semibold">{d.name}</h2>
                      <p className="text-xs text-zinc-500">{d.code}</p>
                      <Money amount={d.price} className="mt-1 text-sm font-semibold text-brand-800" />
                      <LinkButton href={`/catalog/${d.code}`} className="mt-3 min-h-9 w-full" aria-label={t("selectDesign", { name: d.name })}>
                        {t("select")}
                      </LinkButton>
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
