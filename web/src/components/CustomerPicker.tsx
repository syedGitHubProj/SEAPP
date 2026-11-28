"use client";

import { Search, UserCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { api, errorKey } from "@/lib/api";
import type { CustomerDto } from "@/lib/api-types";
import { Button } from "./ui";

type Lookup =
  | { state: "idle" }
  | { state: "searching" }
  | { state: "found"; phone: string; customers: CustomerDto[] }
  | { state: "error"; error: unknown };

/**
 * Finds a customer by their full phone number. Nobody can browse the customer list from here:
 * the server only answers an exact number. When nobody has that number, the person can add a
 * new customer with it.
 */
export function CustomerPicker({
  selectedName,
  onSelect,
  onNew,
}: {
  /** The chosen customer's name, or null when none is chosen yet. */
  selectedName: string | null;
  onSelect: (customer: CustomerDto | null) => void;
  /** Called with the typed number when the person chooses to add a new customer. */
  onNew: (phone: string) => void;
}) {
  const t = useTranslations("customerPicker");
  const te = useTranslations("errors");
  const id = useId();
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });

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

  const find = async (e: FormEvent) => {
    e.preventDefault();
    const typed = phone.trim();
    if (!typed) return;
    setLookup({ state: "searching" });
    try {
      const customers = await api<CustomerDto[]>(`/api/customers/lookup?phone=${encodeURIComponent(typed)}`);
      setLookup({ state: "found", phone: typed, customers });
    } catch (error) {
      setLookup({ state: "error", error });
    }
  };

  return (
    <div className="text-sm">
      <form onSubmit={find}>
        <label htmlFor={`${id}-phone`} className="mb-1 block font-medium">
          {t("label")} *
        </label>
        <div className="flex gap-2">
          <input
            id={`${id}-phone`}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (lookup.state !== "idle") setLookup({ state: "idle" });
            }}
            placeholder={t("placeholder")}
            autoComplete="off"
            className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3"
          />
          <Button type="submit" className="shrink-0" disabled={!phone.trim() || lookup.state === "searching"}>
            <Search className="size-4" /> {t("find")}
          </Button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{t("hint")}</p>
      </form>

      <div aria-live="polite" className="mt-2">
        {lookup.state === "searching" && <p className="text-zinc-500">{t("searching")}</p>}
        {lookup.state === "error" && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-red-800">
            {errorKey(lookup.error) === "checkFields" ? t("invalidPhone") : te(errorKey(lookup.error))}
          </p>
        )}
        {lookup.state === "found" && lookup.customers.length > 0 && (
          <ul aria-label={t("matches")} className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
            {lookup.customers.map((c) => (
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
            ))}
          </ul>
        )}
        {lookup.state === "found" && lookup.customers.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/15 bg-white px-3 py-3">
            <p className="mb-2 text-zinc-700">{t("notFound")}</p>
            <Button variant="secondary" onClick={() => onNew(lookup.phone)}>
              <UserPlus className="size-4" /> {t("addNew")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
