"use client";

import { useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Badge, Money, PageHeader } from "@/components/ui";
import { customers } from "@/data/sample";

export default function CustomersPage() {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle", { count: customers.length })} />
      <ResponsiveTable
        rows={customers}
        rowKey={(c) => c.id}
        columns={[
          { key: "name", label: t("name"), primary: true, render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "phone", label: t("phone"), render: (c) => <a href={`tel:${c.phone}`} className="text-brand-700">{c.phone}</a> },
          { key: "area", label: t("area"), render: (c) => c.area },
          { key: "orders", label: t("orders"), align: "end", render: (c) => c.orders },
          {
            key: "balance",
            label: tc("balance"),
            align: "end",
            render: (c) => (c.balance > 0 ? <Money amount={c.balance} className="font-medium text-amber-800" /> : <Badge tone="green">{t("settled")}</Badge>),
          },
        ]}
      />
    </>
  );
}
