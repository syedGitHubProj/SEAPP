"use client";

import { ArrowLeft, Factory } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { OrderStatusBadge, PaymentStatusBadge, PoStatusBadge } from "@/components/StatusBadge";
import { Badge, Card, LinkButton, Money, PageHeader } from "@/components/ui";
import { balanceDue, paymentStatus } from "@/lib/orders";
import { usePurchaseOrders, useSalesOrders } from "@/lib/prototype-store";
import {
  discountGiven,
  factoryCostForSalesOrder,
  findPoLine,
  linesAwaitingPurchase,
  salesOrderTotal,
  soLineTotal,
} from "@/lib/purchasing";
import { useCan } from "@/lib/session";

export function OrderDetail() {
  const t = useTranslations("orderDetail");
  const tc = useTranslations("common");
  const format = useFormatter();
  const number = useSearchParams().get("number") ?? "";
  const salesOrders = useSalesOrders();
  const purchaseOrders = usePurchaseOrders();
  const so = salesOrders.find((o) => o.number === number);
  // A Salesman sees only the agreed selling prices: no catalogue prices, factory costs or margin.
  const seesPrices = useCan("catalog.prices");

  if (!so) {
    return (
      <Card className="p-6 text-center">
        <p className="mb-4 text-sm text-zinc-600">{t("notFound", { number })}</p>
        <LinkButton href="/orders">{t("backToOrders")}</LinkButton>
      </Card>
    );
  }

  const total = salesOrderTotal(so.lines);
  const discount = discountGiven(so.lines);
  const factoryCost = factoryCostForSalesOrder(so.number, purchaseOrders);
  const awaiting = linesAwaitingPurchase(so.number, so.lines, purchaseOrders);
  const date = (d: string) => format.dateTime(new Date(`${d}T00:00:00`), { dateStyle: "medium" });

  return (
    <>
      <Link href="/orders" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-700">
        <ArrowLeft className="size-4" /> {t("backToOrders")}
      </Link>
      <PageHeader
        title={t("title", { number: so.number })}
        subtitle={t("subtitle", { customer: so.customer, date: date(so.date), salesman: so.salesman })}
        actions={
          awaiting.length > 0 && (
            <LinkButton href={`/factory-orders/new?so=${so.number}`}>
              <Factory className="size-4" /> {t("createPo")}
            </LinkButton>
          )
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm text-zinc-600">{t("status")}</div>
          <div className="mt-1"><OrderStatusBadge status={so.status} /></div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-zinc-600">{t("payment")}</div>
          <div className="mt-1"><PaymentStatusBadge status={paymentStatus(total, so.paid)} /></div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-zinc-600">{t("delivery")}</div>
          <div className="font-semibold">{date(so.deliveryDate)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-zinc-600">{tc("balance")}</div>
          <Money amount={balanceDue(total, so.paid)} className="font-semibold" />
        </Card>
      </div>

      <h2 className="mb-3 font-semibold text-brand-900">{t("lines")}</h2>
      <ResponsiveTable
        rows={so.lines}
        rowKey={(l) => l.id}
        columns={[
          { key: "item", label: t("item"), primary: true, render: (l) => <span className="font-medium">{l.description}</span> },
          { key: "qty", label: t("qty"), align: "end", render: (l) => l.quantity },
          {
            key: "price",
            label: t("agreedPrice"),
            align: "end",
            render: (l) => (
              <span className="inline-flex flex-col items-end">
                <Money amount={l.agreedUnitPrice} />
                {seesPrices && l.listUnitPrice !== null && l.agreedUnitPrice < l.listUnitPrice && (
                  <s className="text-xs text-zinc-400"><Money amount={l.listUnitPrice} /></s>
                )}
              </span>
            ),
          },
          { key: "total", label: tc("total"), align: "end", render: (l) => <Money amount={soLineTotal(l)} /> },
          {
            key: "po",
            label: t("factoryOrder"),
            render: (l) => {
              const hit = findPoLine(so.number, l.id, purchaseOrders);
              return hit ? (
                <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1 md:justify-start">
                  <Link href="/factory-orders" className="font-medium whitespace-nowrap text-brand-700">{hit.po.number}</Link>
                  <PoStatusBadge status={hit.po.status} />
                </span>
              ) : (
                <Badge tone="amber">{t("notOrdered")}</Badge>
              );
            },
          },
          ...(seesPrices
            ? [
                {
                  key: "cost",
                  label: t("factoryCost"),
                  align: "end" as const,
                  render: (l: (typeof so.lines)[number]) => {
                    const hit = findPoLine(so.number, l.id, purchaseOrders);
                    return hit ? <Money amount={hit.line.unitCost * hit.line.quantity} /> : "—";
                  },
                },
              ]
            : []),
        ]}
      />

      <Card className="mt-5 ms-auto max-w-sm p-4">
        <dl className="space-y-1.5 text-sm">
          {seesPrices && discount > 0 && (
            <div className="flex justify-between"><dt className="text-zinc-600">{t("discount")}</dt><dd><Money amount={discount} /></dd></div>
          )}
          <div className="flex justify-between font-semibold"><dt>{t("orderTotal")}</dt><dd><Money amount={total} /></dd></div>
          <div className="flex justify-between"><dt className="text-zinc-600">{t("received")}</dt><dd><Money amount={so.paid} /></dd></div>
          {seesPrices && (
            <>
              <div className="flex justify-between"><dt className="text-zinc-600">{t("factoryCostTotal")}</dt><dd><Money amount={factoryCost} /></dd></div>
              <div className="flex justify-between border-t border-black/5 pt-2 font-semibold">
                <dt>{t("grossMargin")}</dt>
                <dd>{awaiting.length > 0 ? <span className="text-xs font-normal text-zinc-500">{t("marginPending")}</span> : <Money amount={total - factoryCost} />}</dd>
              </div>
            </>
          )}
        </dl>
      </Card>
    </>
  );
}
