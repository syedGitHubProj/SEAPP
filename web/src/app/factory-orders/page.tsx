"use client";

import { Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { PoStatusBadge } from "@/components/StatusBadge";
import { Button, Card, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { purchaseOrders } from "@/data/sample";

export default function FactoryOrdersPage() {
  const t = useTranslations("factoryOrders");
  const tc = useTranslations("common");
  const format = useFormatter();
  const owed = purchaseOrders.reduce((s, p) => s + p.cost - p.paid, 0);
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<Button disabled title={tc("comingLater")}><Plus className="size-4" /> {t("new")}</Button>}
      />
      <Card className="mb-4 flex items-center justify-between p-4 text-sm">
        <span className="text-zinc-600">{t("owedToFactories")}</span>
        <Money amount={owed} className="text-lg font-semibold text-red-700" />
      </Card>
      <ResponsiveTable
        rows={purchaseOrders}
        rowKey={(p) => p.number}
        columns={[
          { key: "number", label: t("number"), render: (p) => <span className="font-medium">{p.number}</span> },
          { key: "factory", label: t("factory"), primary: true, render: (p) => p.factory },
          { key: "forOrder", label: t("forOrder"), render: (p) => p.forOrder },
          { key: "items", label: t("items"), render: (p) => <span className="text-zinc-600">{p.items}</span> },
          { key: "expected", label: t("expected"), render: (p) => format.dateTime(new Date(`${p.expected}T00:00:00`), { dateStyle: "medium" }) },
          { key: "cost", label: t("cost"), align: "end", render: (p) => <Money amount={p.cost} /> },
          { key: "owed", label: t("owed"), align: "end", render: (p) => <Money amount={p.cost - p.paid} /> },
          { key: "status", label: t("status"), render: (p) => <PoStatusBadge status={p.status} /> },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
