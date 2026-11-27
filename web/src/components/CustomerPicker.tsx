"use client";

import { Search, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useId, useState } from "react";
import { errorKey, useApiQuery } from "@/lib/api";
import type { CustomerDto } from "@/lib/api-types";
import { Button } from "./ui";

/** How many matches to show at once; the person narrows the search to see others. */
const MATCHES = 8;

/**
 * Finds a customer by name, CU number or phone, asking the server as the person types,
 * so it works however many customers there are.
 */
export function CustomerPicker({
  selectedName,
  onSelect,
}: {
  /** The chosen customer's name, or null when none is chosen yet. */
  selectedName: string | null;
  onSelect: (customer: CustomerDto | null) => void;
}) {
  const t = useTranslations("customerPicker");
  const te = useTranslations("errors");
  const listId = useId();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const params = new URLSearchParams({ take: String(MATCHES + 1) });
  if (q) params.set("q", q);
  const { data, error, loading } = useApiQuery<CustomerDto[]>(selectedName === null ? `/api/customers?${params}` : null);

  if (selectedName !== null) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-brand-700 bg-brand-50 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-brand-900">
          <UserCheck className="size-4" /> {selectedName}
        </span>
        <Button variant="ghost" className="min-h-9 px-2" onClick={() => onSelect(null)}>
          {t("change")}
        </Button>
      </div>
    );
  }

  const matches = (data ?? []).slice(0, MATCHES);
  const more = (data ?? []).length > MATCHES;

  return (
    <div className="text-sm">
      <label htmlFor={`${listId}-q`} className="mb-1 block font-medium">
        {t("label")} *
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          id={`${listId}-q`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          aria-controls={listId}
          autoComplete="off"
          className="min-h-11 w-full rounded-xl border border-black/10 bg-white ps-9 pe-3"
        />
      </div>
      <ul id={listId} aria-label={t("matches")} aria-busy={loading} className="mt-2 divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
        {error !== null && data === undefined ? (
          <li className="px-3 py-2 text-red-800">{te(errorKey(error))}</li>
        ) : data === undefined ? (
          <li className="px-3 py-2 text-zinc-500">{t("loading")}</li>
        ) : matches.length === 0 ? (
          <li className="px-3 py-2 text-zinc-500">{q ? t("noMatch") : t("none")}</li>
        ) : (
          matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 px-3 py-2 text-start hover:bg-brand-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-zinc-500">
                  {c.phone} · {c.number}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
      {more && <p className="mt-1 text-xs text-zinc-500">{t("more")}</p>}
    </div>
  );
}
