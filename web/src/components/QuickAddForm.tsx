"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Card } from "./ui";

export interface QuickField {
  name: string;
  label: string;
  required?: boolean;
  inputMode?: "text" | "tel";
  placeholder?: string;
}

/** A small "add a record" form used by the prototype's list pages. */
export function QuickAddForm({
  title,
  fields,
  onSave,
  onCancel,
}: {
  title: string;
  fields: QuickField[];
  onSave: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("common");
  const [values, setValues] = useState<Record<string, string>>({});
  const valid = fields.every((f) => !f.required || (values[f.name] ?? "").trim() !== "");

  return (
    <Card className="mb-5 p-4">
      <h2 className="mb-3 font-semibold text-brand-900">{title}</h2>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSave(Object.fromEntries(fields.map((f) => [f.name, (values[f.name] ?? "").trim()])));
        }}
      >
        {fields.map((f) => (
          <label key={f.name} className="text-sm">
            <span className="mb-1 block font-medium">
              {f.label}
              {f.required && " *"}
            </span>
            <input
              className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
              inputMode={f.inputMode}
              placeholder={f.placeholder}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          </label>
        ))}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={!valid}>
            {t("save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
