"use client";

import { ArrowLeft, ListChecks, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { SwitchActiveButton } from "@/components/SwitchActiveButton";
import { Badge, Button, Card, LinkButton, LoadState, PageHeader, PrototypeNote } from "@/components/ui";
import { api, errorKey, useApiQuery } from "@/lib/api";
import type { CategoryDto, CategoryItemDto } from "@/lib/api-types";
import { useCan } from "@/lib/session";

type Editing = { mode: "add" } | { mode: "edit"; category: CategoryDto } | null;

const toOrder = (text: string, fallback: number) => {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Managers and Admin add, rename, reorder and switch off catalogue categories, and keep each
 * category's item list (e.g. Bedroom: Bed king, Almari 4 door) that its designs pick from.
 */
export default function CategoriesPage() {
  const t = useTranslations("categoryAdmin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const canEdit = useCan("catalog.edit");
  const [editing, setEditing] = useState<Editing>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const [itemsFor, setItemsFor] = useState<string | null>(null);
  const { data, error, loading, reload } = useApiQuery<CategoryDto[]>(canEdit ? "/api/catalog/categories?includeInactive=true" : null);

  if (!canEdit) return <Card className="p-6 text-center text-sm text-zinc-600">{te("notAllowed")}</Card>;

  // New categories go to the end of the list unless the person picks a place.
  const nextOrder = Math.max(0, ...(data ?? []).map((c) => c.sortOrder)) + 10;
  const fields = [
    { name: "name", label: t("name"), required: true, autoComplete: "off" },
    { name: "sortOrder", label: t("order"), inputMode: "numeric" as const, hint: t("orderHint") },
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

      {itemsFor !== null && data?.some((c) => c.id === itemsFor) && (
        <CategoryItems key={itemsFor} category={data.find((c) => c.id === itemsFor)!} onChanged={reload} onClose={() => setItemsFor(null)} />
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
              key: "items",
              label: t("items"),
              render: (c) => (
                <span className="text-zinc-600">{t("itemCount", { count: c.items.filter((i) => i.isActive).length })}</span>
              ),
            },
            {
              key: "actions",
              label: tc("edit"),
              align: "end",
              render: (c) => (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <Button variant="secondary" className="min-h-9 px-2" onClick={() => setItemsFor(c.id)} aria-label={t("itemsFor", { name: c.name })}>
                    <ListChecks className="size-4" /> {t("items")}
                  </Button>
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

type ItemEditing = { mode: "add" } | { mode: "edit"; item: CategoryItemDto } | null;

/** The items one category's designs pick from. Items are switched off, never deleted. */
function CategoryItems({ category, onChanged, onClose }: { category: CategoryDto; onChanged: () => void; onClose: () => void }) {
  const t = useTranslations("categoryAdmin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [editing, setEditing] = useState<ItemEditing>(null);
  const [problem, setProblem] = useState<unknown>(null);
  const nextOrder = Math.max(0, ...category.items.map((i) => i.sortOrder)) + 10;
  const fields = [
    { name: "name", label: t("itemName"), required: true, autoComplete: "off", placeholder: t("itemPlaceholder") },
    { name: "sortOrder", label: t("order"), inputMode: "numeric" as const },
  ];

  return (
    <Card className="mb-5 p-4" aria-label={t("itemsFor", { name: category.name })} role="region">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-brand-900">{t("itemsFor", { name: category.name })}</h2>
          <p className="text-xs text-zinc-500">{t("itemsHelp")}</p>
        </div>
        <span className="flex gap-2">
          {editing === null && (
            <Button variant="secondary" className="min-h-9" onClick={() => setEditing({ mode: "add" })}>
              <Plus className="size-4" /> {t("addItem")}
            </Button>
          )}
          <Button variant="ghost" className="min-h-9" onClick={onClose}>
            {tc("close")}
          </Button>
        </span>
      </div>

      {editing !== null && (
        <QuickAddForm
          key={editing.mode === "edit" ? editing.item.id : "add"}
          title={editing.mode === "edit" ? t("editItem") : t("addItem")}
          fields={fields}
          initial={editing.mode === "edit" ? { name: editing.item.name, sortOrder: String(editing.item.sortOrder) } : { sortOrder: String(nextOrder) }}
          onSave={async (v) => {
            if (editing.mode === "edit") {
              const i = editing.item;
              await api(`/api/catalog/category-items/${i.id}`, {
                method: "PUT",
                json: { name: v.name, sortOrder: toOrder(v.sortOrder, i.sortOrder), isActive: i.isActive, version: i.version },
              });
            } else {
              await api(`/api/catalog/categories/${category.id}/items`, { method: "POST", json: { name: v.name, sortOrder: toOrder(v.sortOrder, nextOrder) } });
            }
            setEditing(null);
            onChanged();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {problem !== null && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {te(errorKey(problem))}
        </p>
      )}

      {category.items.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("noItems")}</p>
      ) : (
        <ul className="divide-y divide-black/5 rounded-xl border border-black/10">
          {category.items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <span className="me-2 tabular-nums text-zinc-400">{i.sortOrder}</span>
                <span className="font-medium">{i.name}</span> {!i.isActive && <Badge>{tc("inactive")}</Badge>}
              </span>
              <span className="inline-flex gap-1">
                <Button variant="ghost" className="min-h-9 px-2" onClick={() => setEditing({ mode: "edit", item: i })} aria-label={`${tc("edit")} ${i.name}`}>
                  <Pencil className="size-4" />
                </Button>
                <SwitchActiveButton
                  name={i.name}
                  isActive={i.isActive}
                  confirmText={t("itemSwitchOffConfirm", { name: i.name })}
                  onSwitch={async (isActive) => {
                    setProblem(null);
                    try {
                      await api(`/api/catalog/category-items/${i.id}`, { method: "PUT", json: { ...i, isActive } });
                      onChanged();
                    } catch (e) {
                      setProblem(e);
                    }
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
