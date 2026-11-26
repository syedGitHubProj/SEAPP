"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { LinkButton, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { balanceDue, paymentStatus } from "@/lib/orders";
import { useRole, useSalesOrders } from "@/lib/prototype-store";
import { salesOrderTotal } from "@/lib/purchasing";

export default function OrdersPage() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const format = useFormatter();
  const role = useRole();
  const all = useSalesOrders();
  const rows = role === "salesman" ? all.filter((o) => o.salesman === "Ali") : all;
  const date = (d: string) => format.dateTime(new Date(`${d}T00:00:00`), { dateStyle: "medium" });

  return (
    <>
      <PageHeader
        title={role === "salesman" ? t("myTitle") : t("title")}
        subtitle={t("subtitle")}
        actions={
          role !== "admin" && (
            <LinkButton href="/catalog">
              <Plus className="size-4" /> {t("newOrder")}
            </LinkButton>
          )
        }
      />
      <ResponsiveTable
        rows={rows}
        rowKey={(o) => o.number}
        columns={[
          {
            key: "number",
            label: t("number"),
            render: (o) => (
              <Link href={`/orders/view?number=${o.number}`} className="font-medium text-brand-700 underline-offset-2 hover:underline">
                {o.number}
              </Link>
            ),
          },
          { key: "customer", label: t("customer"), primary: true, render: (o) => o.customer },
          {
            key: "items",
            label: t("items"),
            render: (o) => <span className="text-zinc-600">{o.lines.map((l) => l.description.split(" — ")[0]).join(", ")}</span>,
          },
          { key: "delivery", label: t("delivery"), render: (o) => date(o.deliveryDate) },
          { key: "total", label: tc("total"), align: "end", render: (o) => <Money amount={salesOrderTotal(o.lines)} /> },
          { key: "balance", label: tc("balance"), align: "end", render: (o) => <Money amount={balanceDue(salesOrderTotal(o.lines), o.paid)} /> },
          { key: "payment", label: t("payment"), render: (o) => <PaymentStatusBadge status={paymentStatus(salesOrderTotal(o.lines), o.paid)} /> },
          { key: "status", label: t("status"), render: (o) => <OrderStatusBadge status={o.status} /> },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
