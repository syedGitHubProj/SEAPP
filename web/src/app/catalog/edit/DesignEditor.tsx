"use client";

import { ArrowLeft, ImagePlus, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button, Card, LoadState, PageHeader } from "@/components/ui";
import { api, ApiError, errorKey, useApiQuery } from "@/lib/api";
import type { CategoryDto, DesignDto, PhotoDto } from "@/lib/api-types";
import { parseAmount } from "@/lib/catalog";
import { useCan } from "@/lib/session";

const inputClass = "min-h-11 w-full rounded-xl border bg-white px-3 text-sm";

interface Row {
  key: string;
  id: string | null;
  name: string;
  /** Money for materials/accessories, swatch colour for colours. */
  value: string;
}

interface Form {
  code: string;
  name: string;
  categoryId: string;
  basePrice: string;
  dimensions: string;
  wood: string;
  description: string;
  isActive: boolean;
  materials: Row[];
  colors: Row[];
  accessories: Row[];
}

let rowCounter = 0;
const newRow = (value = ""): Row => ({ key: `new-${++rowCounter}`, id: null, name: "", value });

function toForm(d: DesignDto | undefined): Form {
  return {
    code: d?.code ?? "",
    name: d?.name ?? "",
    categoryId: d?.categoryId ?? "",
    basePrice: d ? String(d.basePrice ?? "") : "",
    dimensions: d?.dimensions ?? "",
    wood: d?.wood ?? "",
    description: d?.description ?? "",
    isActive: d?.isActive ?? true,
    materials: (d?.materials ?? []).map((m) => ({ key: m.id!, id: m.id, name: m.name, value: String(m.surcharge ?? 0) })),
    colors: (d?.colors ?? []).map((c) => ({ key: c.id!, id: c.id, name: c.name, value: c.hex })),
    accessories: (d?.accessories ?? []).map((a) => ({ key: a.id!, id: a.id, name: a.name, value: String(a.price ?? 0) })),
  };
}

/** Money typed in the form; invalid text is sent as -1 so the API reports it next to the field. */
const money = (text: string) => parseAmount(text) ?? -1;

export function DesignEditor({ code }: { code: string | null }) {
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const canEdit = useCan("catalog.edit");
  const design = useApiQuery<DesignDto>(code ? `/api/catalog/designs/${encodeURIComponent(code)}` : null);
  const categories = useApiQuery<CategoryDto[]>("/api/catalog/categories?includeInactive=true");

  if (!canEdit) return <Card className="p-6 text-center text-sm text-zinc-600">{te("notAllowed")}</Card>;
  const failed = design.error ?? categories.error;
  if ((code && !design.data) || !categories.data || failed) {
    return (
      <LoadState
        loading={design.loading || categories.loading}
        error={failed}
        onRetry={() => {
          design.reload();
          categories.reload();
        }}
        loadingText={tc("loading")}
        errorText={te(errorKey(failed))}
        retryText={tc("retry")}
      />
    );
  }
  return (
    <EditorForm
      key={design.data ? `${design.data.id}-${design.data.version}` : "new"}
      design={design.data}
      categories={categories.data}
      onSaved={design.reload}
    />
  );
}

function EditorForm({ design, categories, onSaved }: { design: DesignDto | undefined; categories: CategoryDto[]; onSaved: () => void }) {
  const t = useTranslations("designEditor");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => toForm(design));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const fields = error instanceof ApiError ? error.fields : {};

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };
  const fieldError = (name: string) =>
    fields[name] ? <span className="mt-1 block text-xs text-red-700">{fields[name].map((c) => (te.has(c) ? te(c) : c)).join(" · ")}</span> : null;
  const border = (name: string) => (fields[name] ? "border-red-500" : "border-black/10");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      code: form.code,
      name: form.name,
      categoryId: form.categoryId || "00000000-0000-0000-0000-000000000000",
      basePrice: money(form.basePrice),
      dimensions: form.dimensions,
      wood: form.wood,
      description: form.description,
      materials: form.materials.map((r) => ({ id: r.id, name: r.name, surcharge: money(r.value || "0") })),
      colors: form.colors.map((r) => ({ id: r.id, name: r.name, hex: r.value })),
      accessories: form.accessories.map((r) => ({ id: r.id, name: r.name, price: money(r.value) })),
      isActive: form.isActive,
      version: design?.version ?? 0,
    };
    try {
      const result = design
        ? await api<DesignDto>(`/api/catalog/designs/${design.id}`, { method: "PUT", json: body })
        : await api<DesignDto>("/api/catalog/designs", { method: "POST", json: body });
      setSaved(true);
      if (design) onSaved();
      // A new design opens for editing so photos can be added.
      else router.replace(`/catalog/edit?code=${encodeURIComponent(result.code)}`);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link href="/catalog" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-700">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PageHeader title={design ? t("editTitle", { code: design.code }) : t("newTitle")} />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <form onSubmit={save} className="space-y-5">
          <Card className="grid gap-3 p-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("code")} *</span>
              <input className={`${inputClass} ${border("code")} uppercase`} value={form.code} onChange={(e) => set("code", e.target.value)} required />
              {fieldError("code") ?? <span className="mt-1 block text-xs text-zinc-500">{t("codeHint")}</span>}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("name")} *</span>
              <input className={`${inputClass} ${border("name")}`} value={form.name} onChange={(e) => set("name", e.target.value)} required />
              {fieldError("name")}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("category")} *</span>
              <select className={`${inputClass} ${border("categoryId")}`} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
                <option value="">{t("chooseCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldError("categoryId")}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("basePrice")} *</span>
              <input
                className={`${inputClass} ${border("basePrice")} tabular-nums`}
                inputMode="decimal"
                value={form.basePrice}
                onChange={(e) => set("basePrice", e.target.value)}
                required
              />
              {fieldError("basePrice")}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("dimensions")}</span>
              <input className={`${inputClass} ${border("dimensions")}`} value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("wood")}</span>
              <input className={`${inputClass} ${border("wood")}`} value={form.wood} onChange={(e) => set("wood", e.target.value)} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">{t("description")}</span>
              <textarea
                rows={3}
                className={`w-full rounded-xl border bg-white p-3 text-sm ${border("description")}`}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
            {design && (
              <label className="flex items-start gap-3 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="mt-0.5 size-5 accent-brand-700" />
                <span>
                  <span className="block font-medium">{t("active")}</span>
                  <span className="block text-xs text-zinc-500">{t("activeHint")}</span>
                </span>
              </label>
            )}
          </Card>

          <OptionList
            title={t("materials")}
            listKey="materials"
            rows={form.materials}
            onChange={(rows) => set("materials", rows)}
            nameLabel={t("materialName")}
            valueLabel={t("surcharge")}
            addLabel={t("addMaterial")}
            fields={fields}
            renderValue={(row, update, invalid) => (
              <input className={`${inputClass} ${invalid ? "border-red-500" : "border-black/10"} tabular-nums`} inputMode="decimal" value={row.value} placeholder="0" onChange={(e) => update(e.target.value)} />
            )}
            emptyValue="0"
            valueField="surcharge"
          />
          <OptionList
            title={t("colors")}
            listKey="colors"
            rows={form.colors}
            onChange={(rows) => set("colors", rows)}
            nameLabel={t("colorName")}
            valueLabel={t("colorSwatch")}
            addLabel={t("addColor")}
            fields={fields}
            renderValue={(row, update) => (
              <input type="color" className="h-11 w-full cursor-pointer rounded-xl border border-black/10 bg-white p-1" value={row.value || "#216b44"} onChange={(e) => update(e.target.value)} />
            )}
            emptyValue="#216b44"
            valueField="hex"
          />
          <OptionList
            title={t("accessories")}
            listKey="accessories"
            rows={form.accessories}
            onChange={(rows) => set("accessories", rows)}
            nameLabel={t("accessoryName")}
            valueLabel={t("accessoryPrice")}
            addLabel={t("addAccessory")}
            fields={fields}
            renderValue={(row, update, invalid) => (
              <input className={`${inputClass} ${invalid ? "border-red-500" : "border-black/10"} tabular-nums`} inputMode="decimal" value={row.value} onChange={(e) => update(e.target.value)} />
            )}
            emptyValue=""
            valueField="price"
          />

          {error !== null && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              {te(errorKey(error))}
            </p>
          )}
          {saved && error === null && (
            <p role="status" className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
              {tc("saved")}
            </p>
          )}
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? tc("saving") : t("save")}
          </Button>
        </form>

        <div>{design ? <PhotoPanel design={design} onChanged={onSaved} /> : <Card className="p-4 text-sm text-zinc-500">{t("photosAfterSave")}</Card>}</div>
      </div>
    </>
  );
}

function OptionList({
  title,
  listKey,
  rows,
  onChange,
  nameLabel,
  valueLabel,
  addLabel,
  fields,
  renderValue,
  emptyValue,
  valueField,
}: {
  title: string;
  listKey: string;
  rows: Row[];
  onChange: (rows: Row[]) => void;
  nameLabel: string;
  valueLabel: string;
  addLabel: string;
  fields: Record<string, string[]>;
  renderValue: (row: Row, update: (value: string) => void, invalid: boolean) => ReactNode;
  emptyValue: string;
  valueField: string;
}) {
  const t = useTranslations("designEditor");
  const te = useTranslations("errors");
  const update = (key: string, patch: Partial<Row>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <Card className="p-4">
      <h2 className="mb-3 font-semibold text-brand-900">{title}</h2>
      <ul className="space-y-2">
        {rows.map((row, i) => {
          const nameErr = fields[`${listKey}[${i}].name`];
          const valueErr = fields[`${listKey}[${i}].${valueField}`];
          return (
            <li key={row.key} className="grid grid-cols-[1fr_7rem_auto] items-start gap-2">
              <label className="text-xs">
                <span className="sr-only">{nameLabel}</span>
                <input
                  className={`${inputClass} ${nameErr ? "border-red-500" : "border-black/10"}`}
                  placeholder={nameLabel}
                  aria-label={nameLabel}
                  value={row.name}
                  onChange={(e) => update(row.key, { name: e.target.value })}
                />
              </label>
              <label className="text-xs">
                <span className="sr-only">{valueLabel}</span>
                {renderValue(row, (value) => update(row.key, { value }), !!valueErr)}
              </label>
              <button
                type="button"
                onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                aria-label={t("removeRow", { name: row.name || nameLabel })}
                className="flex size-11 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
              </button>
              {(nameErr || valueErr) && (
                <span className="col-span-3 text-xs text-red-700">{[...(nameErr ?? []), ...(valueErr ?? [])].map((c) => (te.has(c) ? te(c) : c)).join(" · ")}</span>
              )}
            </li>
          );
        })}
      </ul>
      <Button type="button" variant="ghost" className="mt-2 min-h-9" onClick={() => onChange([...rows, newRow(emptyValue)])}>
        <Plus className="size-4" /> {addLabel}
      </Button>
    </Card>
  );
}

/** Shrinks a large photo to at most 1600 px wide/high as JPEG before upload. Falls back to the original. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

function PhotoPanel({ design, onChanged }: { design: DesignDto; onChanged: () => void }) {
  const t = useTranslations("designEditor");
  const te = useTranslations("errors");
  const [photos, setPhotos] = useState<PhotoDto[]>(design.photos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/catalog/designs/${design.id}/photos`;

  const describe = (e: unknown) => {
    const code = e instanceof ApiError ? e.fields.file?.[0] : undefined;
    return code && te.has(code) ? te(code) : te(errorKey(e));
  };

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", await shrink(file), file.name.replace(/\.\w+$/, "") + ".jpg");
        const photo = await api<PhotoDto>(base, { method: "POST", body });
        setPhotos((p) => [...p, photo]);
      }
      onChanged();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  const reorder = async (ids: string[]) => {
    setError(null);
    try {
      setPhotos(await api<PhotoDto[]>(`${base}/order`, { method: "PUT", json: { photoIds: ids } }));
      onChanged();
    } catch (e) {
      setError(describe(e));
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api(`${base}/${id}`, { method: "DELETE" });
      setPhotos((p) => p.filter((x) => x.id !== id));
      onChanged();
    } catch (e) {
      setError(describe(e));
    }
  };

  return (
    <Card className="p-4 lg:sticky lg:top-20">
      <h2 className="font-semibold text-brand-900">{t("photos")}</h2>
      <p className="mb-3 text-xs text-zinc-500">{t("photosHint")}</p>
      <ul className="grid grid-cols-2 gap-2">
        {photos.map((p, i) => (
          <li key={p.id} className="overflow-hidden rounded-xl border border-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={i === 0 ? t("mainPhoto") : ""} className="aspect-[4/3] w-full object-cover" />
            <div className="flex items-center justify-between gap-1 p-1">
              {i === 0 ? (
                <span className="px-1 text-xs font-semibold text-brand-800">{t("mainPhoto")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void reorder([p.id, ...photos.filter((x) => x.id !== p.id).map((x) => x.id)])}
                  aria-label={t("makeMain")}
                  title={t("makeMain")}
                  className="flex size-9 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50"
                >
                  <Star className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void remove(p.id)}
                aria-label={t("removePhoto")}
                title={t("removePhoto")}
                className="flex size-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <label className={`mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand-700/40 text-sm font-semibold text-brand-800 hover:bg-brand-50 ${busy || photos.length >= 10 ? "pointer-events-none opacity-50" : ""}`}>
        <ImagePlus className="size-4" />
        {busy ? t("uploading") : t("addPhoto")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={busy || photos.length >= 10}
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
    </Card>
  );
}
