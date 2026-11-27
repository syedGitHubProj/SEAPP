"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { Card, LoadState, PageHeader } from "@/components/ui";
import { api, errorKey, useApiQuery } from "@/lib/api";
import type { SettingsDto } from "@/lib/api-types";
import { formatMoney } from "@/lib/money";
import { useCan, useSession } from "@/lib/session";

/** Admin changes the business name and currency. The time zone stays Asia/Karachi. */
export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const canManage = useCan("settings.manage");
  const { setSettings } = useSession();
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const { data, error, loading, reload } = useApiQuery<SettingsDto>(canManage ? "/api/settings" : null);

  if (!canManage) return <Card className="p-6 text-center text-sm text-zinc-600">{te("notAllowed")}</Card>;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {data === undefined ? (
        <LoadState loading={loading} error={error} onRetry={reload} loadingText={tc("loading")} errorText={te(errorKey(error))} retryText={tc("retry")} />
      ) : (
        <div className="max-w-2xl">
          {saved && (
            <p role="status" className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
              {t("saved", { example: formatMoney(228000, data.currencySymbol) })}
            </p>
          )}
          <QuickAddForm
            // Starts afresh after Cancel, and again when the saved values come back from the server.
            key={`${formKey}|${data.businessName}|${data.currencyCode}|${data.currencySymbol}`}
            title={t("formTitle")}
            initial={{ businessName: data.businessName, currencyCode: data.currencyCode, currencySymbol: data.currencySymbol }}
            fields={[
              { name: "businessName", label: t("businessName"), required: true, hint: t("businessNameHint") },
              { name: "currencyCode", label: t("currencyCode"), required: true, hint: t("currencyCodeHint"), autoComplete: "off" },
              { name: "currencySymbol", label: t("currencySymbol"), required: true, hint: t("currencySymbolHint"), autoComplete: "off" },
            ]}
            onSave={async (v) => {
              setSaved(false);
              const updated = await api<SettingsDto>("/api/settings", {
                method: "PUT",
                json: { ...data, ...v, currencyCode: v.currencyCode.toUpperCase() },
              });
              setSettings(updated);
              setSaved(true);
              reload();
            }}
            onCancel={() => {
              setSaved(false);
              setFormKey((k) => k + 1);
            }}
          />
          <Card className="p-4 text-sm">
            <dl className="grid gap-1">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-600">{t("timeZone")}</dt>
                <dd className="font-medium">{data.timeZone}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-zinc-500">{t("timeZoneNote")}</p>
          </Card>
        </div>
      )}
    </>
  );
}
