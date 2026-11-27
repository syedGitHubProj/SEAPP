"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, errorKey } from "@/lib/api";
import { Button, Card } from "./ui";

export interface QuickField {
  /** Also the API's field name, so its field errors show next to the right box. */
  name: string;
  label: string;
  required?: boolean;
  inputMode?: "text" | "tel" | "numeric";
  type?: "text" | "password";
  placeholder?: string;
  hint?: string;
  /** Makes the field a drop-down list. */
  options?: { value: string; label: string }[];
  autoComplete?: string;
}

/** A small add/edit form used by the list pages. Shows the API's field errors in plain words. */
export function QuickAddForm({
  title,
  fields,
  initial = {},
  onSave,
  onCancel,
}: {
  title: string;
  fields: QuickField[];
  initial?: Record<string, string>;
  /** Saves the values; throw (e.g. an ApiError) to keep the form open and show the problem. */
  onSave: (values: Record<string, string>) => Promise<void> | void;
  onCancel: () => void;
}) {
  const t = useTranslations("common");
  const te = useTranslations("errors");
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = fields.every((f) => !f.required || (values[f.name] ?? "").trim() !== "");
  const fieldErrors = error instanceof ApiError ? error.fields : {};

  const message = (code: string) => (te.has(code) ? te(code) : te("checkFields"));

  return (
    <Card className="mb-5 p-4">
      <h2 className="mb-3 font-semibold text-brand-900">{title}</h2>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid || saving) return;
          setSaving(true);
          setError(null);
          try {
            await onSave(Object.fromEntries(fields.map((f) => [f.name, f.type === "password" ? values[f.name] ?? "" : (values[f.name] ?? "").trim()])));
          } catch (err) {
            setError(err);
          } finally {
            setSaving(false);
          }
        }}
      >
        {fields.map((f) => {
          const problems = fieldErrors[f.name];
          const common = {
            id: `field-${f.name}`,
            className: `min-h-11 w-full rounded-xl border bg-white px-3 text-sm ${problems ? "border-red-500" : "border-black/10"}`,
            value: values[f.name] ?? "",
            "aria-invalid": problems ? true : undefined,
          };
          const onChange = (value: string) => setValues((v) => ({ ...v, [f.name]: value }));
          return (
            <label key={f.name} className="text-sm">
              <span className="mb-1 block font-medium">
                {f.label}
                {f.required && " *"}
              </span>
              {f.options ? (
                <select {...common} onChange={(e) => onChange(e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...common}
                  type={f.type ?? "text"}
                  inputMode={f.inputMode}
                  placeholder={f.placeholder}
                  autoComplete={f.autoComplete}
                  onChange={(e) => onChange(e.target.value)}
                />
              )}
              {problems && <span className="mt-1 block text-xs text-red-700">{problems.map(message).join(" · ")}</span>}
              {f.hint && !problems && <span className="mt-1 block text-xs text-zinc-500">{f.hint}</span>}
            </label>
          );
        })}
        {error !== null && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2">
            {te(errorKey(error))}
          </p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={!valid || saving}>
            {saving ? t("saving") : t("save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
