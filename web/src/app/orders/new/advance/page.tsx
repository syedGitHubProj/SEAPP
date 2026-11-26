"use client";

import { Banknote, Building2, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { OrderSteps } from "@/components/OrderFlow";
import { Button, Card, LinkButton, Money, PageHeader } from "@/components/ui";
import { customers, findDesign, nextOrderSequence } from "@/data/sample";
import { balanceDue, formatOrderNumber } from "@/lib/orders";
import {
  draftTotal,
  placeOrder,
  useDraft,
  usePlacedOrders,
  type PaymentMethod,
} from "@/lib/prototype-store";

const methods: { id: PaymentMethod; icon: typeof Banknote }[] = [
  { id: "cash", icon: Banknote },
  { id: "bank", icon: Building2 },
  { id: "other", icon: CreditCard },
];

export default function ReceiveAdvancePage() {
  const t = useTranslations("advance");
  const router = useRouter();
  const draft = useDraft();
  const placed = usePlacedOrders();
  const total = draftTotal(draft);

  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");

  const orderNumber = formatOrderNumber(nextOrderSequence + placed.length);
  const amount = Number(amountText.replace(/[^\d]/g, "")) || 0;
  const valid = amount > 0 && amount <= total;

  if (draft.items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="mb-4 text-sm text-zinc-600">{t("noOrder")}</p>
        <LinkButton href="/catalog">{t("startOrder")}</LinkButton>
      </Card>
    );
  }

  const record = () => {
    const customerName = draft.newCustomer?.name ?? customers.find((c) => c.id === draft.customerId)?.name ?? "";
    placeOrder({
      number: orderNumber,
      customerName,
      items: draft.items.map((i) => findDesign(i.designCode)?.name ?? i.designCode).join(", "),
      total,
      advance: amount,
      method,
      deliveryDate: draft.deliveryDate,
      createdAt: new Date().toISOString(),
    });
    router.push("/orders/new/done");
  };

  return (
    <>
      <OrderSteps current={3} />
      <PageHeader title={t("title")} subtitle={t("orderLabel", { number: orderNumber })} />
      <Card className="mx-auto max-w-lg p-4">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600">{t("orderTotal")}</span>
          <Money amount={total} className="font-semibold" />
        </div>

        <label className="mt-5 block text-sm">
          <span className="mb-1 block font-semibold">{t("advanceAmount")} *</span>
          <input
            inputMode="numeric"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="80,000"
            className="min-h-12 w-full rounded-xl border border-black/10 px-3 text-lg font-semibold tabular-nums"
          />
        </label>
        {amount > total && <p className="mt-1 text-xs text-red-700">{t("tooMuch")}</p>}

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold">{t("paymentMethod")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={method === m.id}
                onClick={() => setMethod(m.id)}
                className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-sm font-medium ${
                  method === m.id ? "border-brand-700 bg-brand-50 text-brand-800 ring-1 ring-brand-700" : "border-black/10"
                }`}
              >
                <m.icon className="size-5" />
                {t(`methods.${m.id}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 block text-sm">
          <span className="mb-1 block font-semibold">{t("notes")}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-black/10 p-3"
          />
        </label>

        <dl className="mt-5 space-y-1 border-t border-black/5 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-600">{t("advanceReceived")}</dt><dd><Money amount={amount} /></dd></div>
          <div className="flex justify-between font-semibold"><dt>{t("balance")}</dt><dd><Money amount={balanceDue(total, amount)} /></dd></div>
        </dl>

        <Button className="mt-5 w-full" disabled={!valid} onClick={record}>
          {t("recordPayment")}
        </Button>
      </Card>
    </>
  );
}
