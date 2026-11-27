"use client";

import { Pencil, Search, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { SwitchActiveButton } from "@/components/SwitchActiveButton";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Badge, Button, LoadState, PageHeader, PrototypeNote } from "@/components/ui";
import { api, errorKey, useApiQuery } from "@/lib/api";
import type { CustomerDto } from "@/lib/api-types";

type Editing = { mode: "add" } | { mode: "edit"; customer: CustomerDto } | null;

export default function CustomersPage() {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const deferredQuery = useDeferredValue(query.trim());

  const params = new URLSearchParams({ take: "200" });
  if (deferredQuery) params.set("q", deferredQuery);
  if (showInactive) params.set("includeInactive", "true");
  const { data, error, loading, reload } = useApiQuery<CustomerDto[]>(`/api/customers?${params}`);

  const fields = [
    { name: "name", label: t("name"), required: true, autoComplete: "off" },
    { name: "phone", label: t("phone"), required: true, inputMode: "tel" as const, placeholder: "03xx-xxxxxxx" },
    { name: "address", label: t("address") },
    { name: "note", label: t("note") },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          editing === null && (
            <Button onClick={() => setEditing({ mode: "add" })}>
              <UserPlus className="size-4" /> {t("add")}
            </Button>
          )
        }
      />
      {editing !== null && (
        <QuickAddForm
          key={editing.mode === "edit" ? editing.customer.id : "add"}
          title={editing.mode === "edit" ? t("editTitle") : t("addTitle")}
          fields={fields}
          initial={
            editing.mode === "edit"
              ? { name: editing.customer.name, phone: editing.customer.phone, address: editing.customer.address ?? "", note: editing.customer.note ?? "" }
              : {}
          }
          onSave={async (v) => {
            if (editing.mode === "edit") {
              const c = editing.customer;
              await api(`/api/customers/${c.id}`, { method: "PUT", json: { ...v, isActive: c.isActive, version: c.version } });
            } else {
              await api("/api/customers", { method: "POST", json: v });
            }
            setEditing(null);
            reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {problem !== null && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {te(errorKey(problem))}
        </p>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={tc("search")}
            className="min-h-11 w-full rounded-xl border border-black/10 bg-white ps-9 pe-3 text-sm"
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="size-5 accent-brand-700" />
          {tc("showInactive")}
        </label>
      </div>

      {data === undefined ? (
        <LoadState loading={loading} error={error} onRetry={reload} loadingText={tc("loading")} errorText={te(errorKey(error))} retryText={tc("retry")} />
      ) : (
        <ResponsiveTable
          rows={data}
          rowKey={(c) => c.id}
          empty={t("empty")}
          columns={[
            {
              key: "name",
              label: t("name"),
              primary: true,
              render: (c) => (
                <span className="font-medium">
                  {c.name} {!c.isActive && <Badge>{tc("inactive")}</Badge>}
                </span>
              ),
            },
            { key: "number", label: t("number"), render: (c) => <span className="text-zinc-600">{c.number}</span> },
            { key: "phone", label: t("phone"), render: (c) => <a href={`tel:${c.phone}`} className="text-brand-700">{c.phone}</a> },
            { key: "address", label: t("address"), render: (c) => c.address || tc("none") },
            {
              key: "edit",
              label: tc("edit"),
              align: "end",
              render: (c) => (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <Button variant="ghost" className="min-h-9 px-2" onClick={() => setEditing({ mode: "edit", customer: c })} aria-label={`${tc("edit")} ${c.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <SwitchActiveButton
                    name={c.name}
                    isActive={c.isActive}
                    confirmText={t("switchOffConfirm", { name: c.name })}
                    onSwitch={async (isActive) => {
                      setProblem(null);
                      try {
                        // The API reads the fields it knows and ignores the rest (id, number).
                        await api(`/api/customers/${c.id}`, { method: "PUT", json: { ...c, isActive } });
                        reload();
                      } catch (e) {
                        setProblem(e);
                      }
                    }}
                  />
                </span>
              ),
            },
          ]}
        />
      )}
      <PrototypeNote>{t("help")}</PrototypeNote>
    </>
  );
}
