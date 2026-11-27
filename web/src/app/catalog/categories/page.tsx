"use client";

import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { SwitchActiveButton } from "@/components/SwitchActiveButton";
import { Badge, Button, Card, LinkButton, LoadState, PageHeader, PrototypeNote } from "@/components/ui";
import { api, errorKey, useApiQuery } from "@/lib/api";
import type { CategoryDto } from "@/lib/api-types";
import { useCan } from "@/lib/session";

type Editing = { mode: "add" } | { mode: "edit"; category: CategoryDto } | null;

/** Managers and Admin add, rename, reorder and switch off catalogue categories. */
export default function CategoriesPage() {
  const t = useTranslations("categoryAdmin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const canEdit = useCan("catalog.edit");
  const [editing, setEditing] = useState<Editing>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const { data, error, loading, reload } = useApiQuery<CategoryDto[]>(canEdit ? "/api/catalog/categories?includeInactive=true" : null);

  if (!canEdit) return <Card className="p-6 text-center text-sm text-zinc-600">{te("notAllowed")}</Card>;

  // New categories go to the end of the list unless the person picks a place.
  const nextOrder = Math.max(0, ...(data ?? []).map((c) => c.sortOrder)) + 10;
  const fields = [
    { name: "name", label: t("name"), required: true, autoComplete: "off" },
    { name: "sortOrder", label: t("order"), inputMode: "numeric" as const, hint: t("orderHint") },
  ];
  const toOrder = (text: string, fallback: number) => {
    const n = Number.parseInt(text, 10);
    return Number.isFinite(n) ? n : fallback;
  };

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
          key={editing.mode === "edit" ? editing.category.id : "add"}
          title={editing.mode === "edit" ? t("editTitle") : t("addTitle")}
          fields={fields}
          initial={
            editing.mode === "edit"
              ? { name: editing.category.name, sortOrder: String(editing.category.sortOrder) }
              : { sortOrder: String(nextOrder) }
          }
          onSave={async (v) => {
            if (editing.mode === "edit") {
              const c = editing.category;
              await api(`/api/catalog/categories/${c.id}`, {
                method: "PUT",
                json: { name: v.name, sortOrder: toOrder(v.sortOrder, c.sortOrder), isActive: c.isActive, version: c.version },
              });
            } else {
              await api("/api/catalog/categories", { method: "POST", json: { name: v.name, sortOrder: toOrder(v.sortOrder, nextOrder) } });
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
            { key: "order", label: t("order"), render: (c) => <span className="tabular-nums text-zinc-600">{c.sortOrder}</span> },
            {
              key: "actions",
              label: tc("edit"),
              align: "end",
              render: (c) => (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <Button variant="ghost" className="min-h-9 px-2" onClick={() => setEditing({ mode: "edit", category: c })} aria-label={`${tc("edit")} ${c.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <SwitchActiveButton
                    name={c.name}
                    isActive={c.isActive}
                    confirmText={t("switchOffConfirm", { name: c.name })}
                    onSwitch={async (isActive) => {
                      setProblem(null);
                      try {
                        await api(`/api/catalog/categories/${c.id}`, { method: "PUT", json: { ...c, isActive } });
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
