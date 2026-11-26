"use client";

import { CalendarDays, CheckCircle2, Factory, FileText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { OrderSteps } from "@/components/OrderFlow";
import { Button, Card, LinkButton, Money } from "@/components/ui";
import { balanceDue } from "@/lib/orders";
import { usePlacedSalesOrders } from "@/lib/prototype-store";
import { salesOrderTotal } from "@/lib/purchasing";

export default function OrderDonePage() {
  const t = useTranslations("done");
  const format = useFormatter();
  const order = usePlacedSalesOrders()[0];

  if (!order) {
    return (
      <Card className="p-6 text-center">
        <p className="mb-4 text-sm text-zinc-600">{t("none")}</p>
        <LinkButton href="/catalog">{t("createAnother")}</LinkButton>
      </Card>
    );
  }

  const total = salesOrderTotal(order.lines);

  return (
    <>
      <OrderSteps current={4} />
      <Card className="mx-auto max-w-lg overflow-hidden">
        <div className="bg-brand-700 px-4 py-8 text-center text-white">
          <CheckCircle2 className="mx-auto mb-3 size-14" />
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
        </div>
        <dl className="space-y-2 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-600">{t("orderNo")}</dt><dd className="font-semibold">{order.number}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-600">{t("customer")}</dt><dd>{order.customer}</dd></div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">{t("items")}</dt>
            <dd className="text-end">{order.lines.map((l) => l.description.split(" — ")[0]).join(", ")}</dd>
          </div>
          <div className="flex justify-between"><dt className="text-zinc-600">{t("total")}</dt><dd><Money amount={total} /></dd></div>
          <div className="flex justify-between"><dt className="text-zinc-600">{t("advance")}</dt><dd><Money amount={order.paid} /></dd></div>
          <div className="flex justify-between font-semibold"><dt>{t("balance")}</dt><dd><Money amount={balanceDue(total, order.paid)} /></dd></div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">{t("delivery")}</dt>
            <dd className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-zinc-500" />
              {format.dateTime(new Date(`${order.deliveryDate}T00:00:00`), { dateStyle: "medium" })}
            </dd>
          </div>
        </dl>
        <div className="space-y-2 p-4 pt-0">
          <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">{t("nextStepPo")}</p>
          <LinkButton href={`/factory-orders/new?so=${order.number}`} className="w-full">
            <Factory className="size-4" /> {t("createPo")}
          </LinkButton>
          <LinkButton href={`/orders/view?number=${order.number}`} variant="secondary" className="w-full">
            {t("viewOrder")}
          </LinkButton>
          <Button variant="ghost" className="w-full" disabled title={t("invoiceLater")}>
            <FileText className="size-4" /> {t("viewInvoice")}
          </Button>
          <LinkButton href="/catalog" variant="ghost" className="w-full">
            {t("createAnother")}
          </LinkButton>
        </div>
      </Card>
    </>
  );
}
