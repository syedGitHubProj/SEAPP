"use client";

import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { SwitchActiveButton } from "@/components/SwitchActiveButton";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Badge, Button, Card, LoadState, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { api, errorKey, useApiQuery } from "@/lib/api";
import type { FactoryDto } from "@/lib/api-types";
import { usePurchaseOrders } from "@/lib/prototype-store";
import { purchaseOrderTotal } from "@/lib/purchasing";
import { useCan } from "@/lib/session";

type Editing = { mode: "add" } | { mode: "edit"; factory: FactoryDto } | null;

export default function FactoriesPage() {
  const t = useTranslations("factories");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const canEdit = useCan("factories.edit");
  const purchaseOrders = usePurchaseOrders();
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const { data, error, loading, reload } = useApiQuery<FactoryDto[]>(
    canEdit ? `/api/factories${showInactive ? "?includeInactive=true" : ""}` : null,
  );

  if (!canEdit) {
    return <Card className="p-6 text-center text-sm text-zinc-600">{t("noAccess")}</Card>;
  }

  // Until Phase 3, factory orders are sample data matched by factory name.
  const openOrders = (name: string) => purchaseOrders.filter((p) => p.factory === name && p.status !== "received").length;
  const owed = (name: string) =>
    purchaseOrders.filter((p) => p.factory === name).reduce((s, p) => s + purchaseOrderTotal(p.lines) - p.paid, 0);

  const fields = [
    { name: "name", label: t("name"), required: true },
    { name: "contactPerson", label: t("contact") },
    { name: "phone", label: t("phone"), required: true, inputMode: "tel" as const, placeholder: "03xx-xxxxxxx" },
    { name: "city", label: t("city"), required: true },
    { name: "speciality", label: t("speciality") },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          editing === null && (
            <Button onClick={() => setEditing({ mode: "add" })}>
              <Plus className="size-4" /> {t("add")}
            </Button>
          )
        }
      />
      {editing !== null && (
        <QuickAddForm
          key={editing.mode === "edit" ? editing.factory.id : "add"}
          title={editing.mode === "edit" ? t("editTitle") : t("addTitle")}
          fields={fields}
          initial={
            editing.mode === "edit"
              ? {
                  name: editing.factory.name,
                  contactPerson: editing.factory.contactPerson ?? "",
                  phone: editing.factory.phone,
                  city: editing.factory.city,
                  speciality: editing.factory.speciality ?? "",
                }
              : {}
          }
          onSave={async (v) => {
            if (editing.mode === "edit") {
              const f = editing.factory;
              await api(`/api/factories/${f.id}`, { method: "PUT", json: { ...v, isActive: f.isActive, version: f.version } });
            } else {
              await api("/api/factories", { method: "POST", json: v });
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

      <label className="mb-4 flex min-h-11 items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="size-5 accent-brand-700" />
        {tc("showInactive")}
      </label>

      {data === undefined ? (
        <LoadState loading={loading} error={error} onRetry={reload} loadingText={tc("loading")} errorText={te(errorKey(error))} retryText={tc("retry")} />
      ) : (
        <ResponsiveTable
          rows={data}
          rowKey={(f) => f.id}
          empty={t("empty")}
          columns={[
            {
              key: "name",
              label: t("name"),
              primary: true,
              render: (f) => (
                <span className="font-medium">
                  {f.name} {!f.isActive && <Badge>{tc("inactive")}</Badge>}
                </span>
              ),
            },
            { key: "contact", label: t("contact"), render: (f) => f.contactPerson || tc("none") },
            { key: "phone", label: t("phone"), render: (f) => <a href={`tel:${f.phone}`} className="text-brand-700">{f.phone}</a> },
            { key: "city", label: t("city"), render: (f) => f.city },
            { key: "speciality", label: t("speciality"), render: (f) => <span className="text-zinc-600">{f.speciality || tc("none")}</span> },
            { key: "open", label: t("openOrders"), align: "end", render: (f) => openOrders(f.name) },
            { key: "owed", label: t("owed"), align: "end", render: (f) => <Money amount={owed(f.name)} /> },
            {
              key: "edit",
              label: tc("edit"),
              align: "end",
              render: (f) => (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <Button variant="ghost" className="min-h-9 px-2" onClick={() => setEditing({ mode: "edit", factory: f })} aria-label={`${tc("edit")} ${f.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <SwitchActiveButton
                    name={f.name}
                    isActive={f.isActive}
                    confirmText={t("switchOffConfirm", { name: f.name })}
                    onSwitch={async (isActive) => {
                      setProblem(null);
                      try {
                        // The API reads the fields it knows and ignores the rest (id, number).
                        await api(`/api/factories/${f.id}`, { method: "PUT", json: { ...f, isActive } });
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
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
