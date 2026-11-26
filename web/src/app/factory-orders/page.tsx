"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { PoStatusBadge } from "@/components/StatusBadge";
import { Card, LinkButton, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { usePurchaseOrders } from "@/lib/prototype-store";
import { linkedSalesOrders, purchaseOrderTotal } from "@/lib/purchasing";

export default function FactoryOrdersPage() {
  const t = useTranslations("factoryOrders");
  const format = useFormatter();
  const purchaseOrders = usePurchaseOrders();
  const owed = purchaseOrders.reduce((s, p) => s + purchaseOrderTotal(p.lines) - p.paid, 0);
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <LinkButton href="/factory-orders/new">
            <Plus className="size-4" /> {t("new")}
          </LinkButton>
        }
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
          {
            key: "forOrder",
            label: t("forOrder"),
            render: (p) => (
              <span className="inline-flex flex-wrap justify-end gap-x-2 md:justify-start">
                {linkedSalesOrders(p.lines).map((n) => (
                  <Link key={n} href={`/orders/view?number=${n}`} className="font-medium text-brand-700 underline-offset-2 hover:underline">
                    {n}
                  </Link>
                ))}
              </span>
            ),
          },
          { key: "items", label: t("items"), render: (p) => <span className="text-zinc-600">{p.lines.map((l) => l.description.split(" — ")[0]).join(", ")}</span> },
          { key: "expected", label: t("expected"), render: (p) => format.dateTime(new Date(`${p.expected}T00:00:00`), { dateStyle: "medium" }) },
          { key: "cost", label: t("cost"), align: "end", render: (p) => <Money amount={purchaseOrderTotal(p.lines)} /> },
          { key: "owed", label: t("owed"), align: "end", render: (p) => <Money amount={purchaseOrderTotal(p.lines) - p.paid} /> },
          { key: "status", label: t("status"), render: (p) => <PoStatusBadge status={p.status} /> },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
