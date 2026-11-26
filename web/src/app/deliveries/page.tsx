"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { DeliveryStatusBadge } from "@/components/StatusBadge";
import { Badge, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { deliveries } from "@/data/sample";

export default function DeliveriesPage() {
  const t = useTranslations("deliveries");
  const format = useFormatter();
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ResponsiveTable
        rows={deliveries}
        rowKey={(d) => d.order}
        columns={[
          { key: "date", label: t("date"), render: (d) => format.dateTime(new Date(`${d.date}T00:00:00`), { dateStyle: "medium" }) },
          { key: "customer", label: t("customer"), primary: true, render: (d) => <span className="font-medium">{d.customer}</span> },
          { key: "order", label: t("order"), render: (d) => d.order },
          { key: "address", label: t("address"), render: (d) => d.address },
          { key: "team", label: t("team"), render: (d) => (d.team === "—" ? <Badge tone="amber">{t("notAssigned")}</Badge> : d.team) },
          { key: "collect", label: t("collect"), align: "end", render: (d) => (d.balanceToCollect > 0 ? <Money amount={d.balanceToCollect} /> : "—") },
          { key: "status", label: t("status"), render: (d) => <DeliveryStatusBadge status={d.status} /> },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
