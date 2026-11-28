"use client";

import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { SwitchActiveButton } from "@/components/SwitchActiveButton";
import { Badge, Button, Card, LinkButton, LoadState, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { api, errorKey, useApiQuery } from "@/lib/api";
import type { OtherItemDto } from "@/lib/api-types";
import { parseAmount } from "@/lib/catalog";
import { useCan } from "@/lib/session";

type Editing = { mode: "add" } | { mode: "edit"; item: OtherItemDto } | null;

const toOrder = (text: string, fallback: number) => {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? n : fallback;
};

/** Managers and Admin keep the list of things sold without a design: mirrors, lights, mattresses. */
export default function OtherItemsPage() {
  const t = useTranslations("otherItems");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const canEdit = useCan("catalog.edit");
  const [editing, setEditing] = useState<Editing>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const { data, error, loading, reload } = useApiQuery<OtherItemDto[]>(canEdit ? "/api/catalog/other-items?includeInactive=true" : null);

  if (!canEdit) return <Card className="p-6 text-center text-sm text-zinc-600">{te("notAllowed")}</Card>;

  const nextOrder = Math.max(0, ...(data ?? []).map((i) => i.sortOrder)) + 10;
  const fields = [
    { name: "name", label: t("name"), required: true, autoComplete: "off" },
    { name: "price", label: t("price"), required: true, inputMode: "numeric" as const },
    { name: "sortOrder", label: t("order"), inputMode: "numeric" as const },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <span className="flex gap-2">
            <LinkButton href="/catalog" variant="ghost">
              <ArrowLeft className="size-4 rtl:rotate-180" /> {t("back")}
            </LinkButton>
            {editing === null && (
              <Button onClick={() => setEditing({ mode: "add" })}>
                <Plus className="size-4" /> {t("add")}
              </Button>
            )}
          </span>
        }
      />

      {editing !== null && (
        <QuickAddForm
          key={editing.mode === "edit" ? editing.item.id : "add"}
          title={editing.mode === "edit" ? t("editTitle") : t("addTitle")}
          fields={fields}
          initial={
            editing.mode === "edit"
              ? { name: editing.item.name, price: String(editing.item.price ?? ""), sortOrder: String(editing.item.sortOrder) }
              : { sortOrder: String(nextOrder) }
          }
          onSave={async (v) => {
            // Invalid amounts go as -1 so the API reports them next to the field.
            const price = parseAmount(v.price) ?? -1;
            if (editing.mode === "edit") {
              const i = editing.item;
              await api(`/api/catalog/other-items/${i.id}`, {
                method: "PUT",
                json: { name: v.name, price, sortOrder: toOrder(v.sortOrder, i.sortOrder), isActive: i.isActive, version: i.version },
              });
            } else {
              await api("/api/catalog/other-items", { method: "POST", json: { name: v.name, price, sortOrder: toOrder(v.sortOrder, nextOrder) } });
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

      {data === undefined ? (
        <LoadState loading={loading} error={error} onRetry={reload} loadingText={tc("loading")} errorText={te(errorKey(error))} retryText={tc("retry")} />
      ) : (
        <ResponsiveTable
          rows={data}
          rowKey={(i) => i.id}
          empty={t("empty")}
          columns={[
            {
              key: "name",
              label: t("name"),
              primary: true,
              render: (i) => (
                <span className="font-medium">
                  {i.name} {!i.isActive && <Badge>{tc("inactive")}</Badge>}
                </span>
              ),
            },
            { key: "price", label: t("price"), align: "end", render: (i) => (i.price === null ? "—" : <Money amount={i.price} />) },
            { key: "order", label: t("order"), render: (i) => <span className="tabular-nums text-zinc-600">{i.sortOrder}</span> },
            {
              key: "actions",
              label: tc("edit"),
              align: "end",
              render: (i) => (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <Button variant="ghost" className="min-h-9 px-2" onClick={() => setEditing({ mode: "edit", item: i })} aria-label={`${tc("edit")} ${i.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <SwitchActiveButton
                    name={i.name}
                    isActive={i.isActive}
                    confirmText={t("switchOffConfirm", { name: i.name })}
                    onSwitch={async (isActive) => {
                      setProblem(null);
                      try {
                        await api(`/api/catalog/other-items/${i.id}`, { method: "PUT", json: { ...i, isActive } });
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
