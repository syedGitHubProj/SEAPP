"use client";

import { CalendarDays, CheckCircle2, FileText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { OrderSteps } from "@/components/OrderFlow";
import { Button, Card, LinkButton, Money } from "@/components/ui";
import { balanceDue } from "@/lib/orders";
import { usePlacedOrders } from "@/lib/prototype-store";

export default function OrderDonePage() {
  const t = useTranslations("done");
  const format = useFormatter();
  const order = usePlacedOrders()[0];

  if (!order) {
    return (
      <Card className="p-6 text-center">
        <p className="mb-4 text-sm text-zinc-600">{t("none")}</p>
        <LinkButton href="/catalog">{t("createAnother")}</LinkButton>
      </Card>
    );
  }

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
          <div className="flex justify-between"><dt className="text-zinc-600">{t("customer")}</dt><dd>{order.customerName}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-zinc-600">{t("items")}</dt><dd className="text-end">{order.items}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-600">{t("total")}</dt><dd><Money amount={order.total} /></dd></div>
          <div className="flex justify-between"><dt className="text-zinc-600">{t("advance")}</dt><dd><Money amount={order.advance} /></dd></div>
          <div className="flex justify-between font-semibold"><dt>{t("balance")}</dt><dd><Money amount={balanceDue(order.total, order.advance)} /></dd></div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">{t("delivery")}</dt>
            <dd className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-zinc-500" />
              {format.dateTime(new Date(`${order.deliveryDate}T00:00:00`), { dateStyle: "medium" })}
            </dd>
          </div>
        </dl>
        <div className="space-y-2 p-4 pt-0">
          <Button className="w-full" disabled title={t("invoiceLater")}>
            <FileText className="size-4" /> {t("viewInvoice")}
          </Button>
          <p className="text-center text-xs text-zinc-500">{t("invoiceLater")}</p>
          <LinkButton href="/catalog" variant="secondary" className="w-full">
            {t("createAnother")}
          </LinkButton>
          <LinkButton href="/orders" variant="ghost" className="w-full">
            {t("goToOrders")}
          </LinkButton>
        </div>
      </Card>
    </>
  );
}
