"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Card, Money, PageHeader } from "@/components/ui";
import { nextPurchaseOrderSequence } from "@/data/sample";
import { useApiQuery } from "@/lib/api";
import type { FactoryDto } from "@/lib/api-types";
import { formatOrderNumber } from "@/lib/orders";
import {
  createPurchaseOrder,
  useCreatedPurchaseOrders,
  usePurchaseOrders,
  useSalesOrders,
} from "@/lib/prototype-store";
import { linesAwaitingPurchase, soLineTotal } from "@/lib/purchasing";

const inputClass = "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm";

export function NewPurchaseOrder() {
  const t = useTranslations("newPo");
  const router = useRouter();
  const salesOrders = useSalesOrders();
  const purchaseOrders = usePurchaseOrders();
  const created = useCreatedPurchaseOrders();
  const params = useSearchParams();
  const factories = useApiQuery<FactoryDto[]>("/api/factories").data ?? [];

  // Only sales orders that still have lines waiting for a factory can be chosen.
  const candidates = salesOrders.filter(
    (so) => so.status !== "cancelled" && linesAwaitingPurchase(so.number, so.lines, purchaseOrders).length > 0,
  );

  const [soNumber, setSoNumber] = useState(params.get("so") ?? "");
  const [factory, setFactory] = useState("");
  const [expected, setExpected] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});

  const so = candidates.find((o) => o.number === soNumber);
  const openLines = so ? linesAwaitingPurchase(so.number, so.lines, purchaseOrders) : [];
  const isSelected = (id: string) => selected[id] ?? true; // all open lines ticked by default
  const costOf = (id: string) => Number((costs[id] ?? "").replace(/[^\d]/g, "")) || 0;

  const chosen = openLines.filter((l) => isSelected(l.id));
  const totalCost = chosen.reduce((s, l) => s + costOf(l.id) * l.quantity, 0);
  const valid = so && factory && expected && chosen.length > 0 && chosen.every((l) => costOf(l.id) > 0);
  const poNumber = formatOrderNumber(nextPurchaseOrderSequence + created.length, "PO");

  const create = () => {
    if (!so) return;
    createPurchaseOrder({
      number: poNumber,
      factory,
      date: new Date().toISOString().slice(0, 10),
      expected,
      paid: 0,
      status: "ordered",
      lines: chosen.map((l) => ({
        soNumber: so.number,
        soLineId: l.id,
        description: l.description,
        quantity: l.quantity,
        unitCost: costOf(l.id),
      })),
    });
    router.push(`/orders/view?number=${so.number}`);
  };

  return (
    <>
      <Link href="/factory-orders" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-700">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PageHeader title={t("title")} subtitle={t("subtitle", { number: poNumber })} />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card className="p-4">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">{t("salesOrder")} *</span>
              <select
                className={inputClass}
                value={so ? soNumber : ""}
                onChange={(e) => {
                  setSoNumber(e.target.value);
                  setSelected({});
                  setCosts({});
                }}
              >
                <option value="">{t("chooseSalesOrder")}</option>
                {candidates.map((o) => (
                  <option key={o.number} value={o.number}>
                    {o.number} — {o.customer}
                  </option>
                ))}
              </select>
            </label>
            {candidates.length === 0 && <p className="mt-2 text-sm text-zinc-500">{t("nothingToOrder")}</p>}
            {soNumber && !so && candidates.length > 0 && (
              <p className="mt-2 text-sm text-zinc-500">{t("alreadyOrdered", { number: soNumber })}</p>
            )}
          </Card>

          {so && (
            <Card className="p-4">
              <h2 className="mb-1 font-semibold text-brand-900">{t("linesTitle")}</h2>
              <p className="mb-3 text-xs text-zinc-500">{t("linesHint")}</p>
              <ul className="divide-y divide-black/5">
                {openLines.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                    <label className="flex min-w-0 flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected(l.id)}
                        onChange={(e) => setSelected((s) => ({ ...s, [l.id]: e.target.checked }))}
                        className="size-5 shrink-0 accent-brand-700"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{l.description}</span>
                        <span className="block text-xs text-zinc-500">
                          {t("qtyAndSale", { qty: l.quantity })} <Money amount={soLineTotal(l)} />
                        </span>
                      </span>
                    </label>
                    <label className="w-full text-sm sm:w-44">
                      <span className="mb-1 block text-xs font-medium text-zinc-600">{t("unitCost")}</span>
                      <input
                        inputMode="numeric"
                        aria-label={t("unitCostFor", { item: l.description })}
                        disabled={!isSelected(l.id)}
                        value={costs[l.id] ?? ""}
                        onChange={(e) => setCosts((c) => ({ ...c, [l.id]: e.target.value }))}
                        className={`${inputClass} tabular-nums disabled:bg-zinc-100`}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card className="h-fit p-4 lg:sticky lg:top-20">
          <label className="mb-4 block text-sm">
            <span className="mb-1 block font-semibold">{t("factory")} *</span>
            <select className={inputClass} value={factory} onChange={(e) => setFactory(e.target.value)}>
              <option value="">{t("chooseFactory")}</option>
              {factories.map((f) => (
                <option key={f.id} value={f.name}>{f.name} — {f.city}</option>
              ))}
            </select>
          </label>
          <label className="mb-4 block text-sm">
            <span className="mb-1 block font-semibold">{t("expected")} *</span>
            <input type="date" className={inputClass} value={expected} onChange={(e) => setExpected(e.target.value)} />
          </label>
          <dl className="space-y-1.5 border-t border-black/5 pt-3 text-sm">
            <div className="flex justify-between font-semibold"><dt>{t("totalCost")}</dt><dd><Money amount={totalCost} /></dd></div>
            {so && totalCost > 0 && (
              <div className="flex justify-between text-zinc-600">
                <dt>{t("marginOnLines")}</dt>
                <dd><Money amount={chosen.reduce((s, l) => s + soLineTotal(l), 0) - totalCost} /></dd>
              </div>
            )}
          </dl>
          {!valid && <p className="mt-3 text-xs text-zinc-500">{t("fillRequired")}</p>}
          <Button className="mt-4 w-full" disabled={!valid} onClick={create}>
            {t("create")}
          </Button>
        </Card>
      </div>
    </>
  );
}
