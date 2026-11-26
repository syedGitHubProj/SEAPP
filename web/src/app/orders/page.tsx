"use client";

import { Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { LinkButton, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { salesOrders, type SalesOrderSummary } from "@/data/sample";
import { balanceDue, paymentStatus } from "@/lib/orders";
import { usePlacedOrders, useRole } from "@/lib/prototype-store";

export default function OrdersPage() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const format = useFormatter();
  const role = useRole();
  const placed = usePlacedOrders();

  const fromDemo: SalesOrderSummary[] = placed.map((p) => ({
    number: p.number,
    customer: p.customerName,
    date: p.createdAt.slice(0, 10),
    items: p.items,
    total: p.total,
    paid: p.advance,
    status: "confirmed",
    deliveryDate: p.deliveryDate,
    salesman: "Ali",
  }));
  const all = [...fromDemo, ...salesOrders];
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
          { key: "number", label: t("number"), render: (o) => <span className="font-medium">{o.number}</span> },
          { key: "customer", label: t("customer"), primary: true, render: (o) => o.customer },
          { key: "items", label: t("items"), render: (o) => <span className="text-zinc-600">{o.items}</span> },
          { key: "delivery", label: t("delivery"), render: (o) => date(o.deliveryDate) },
          { key: "total", label: tc("total"), align: "end", render: (o) => <Money amount={o.total} /> },
          { key: "balance", label: tc("balance"), align: "end", render: (o) => <Money amount={balanceDue(o.total, o.paid)} /> },
          { key: "payment", label: t("payment"), render: (o) => <PaymentStatusBadge status={paymentStatus(o.total, o.paid)} /> },
          { key: "status", label: t("status"), render: (o) => <OrderStatusBadge status={o.status} /> },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
