"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Card, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { monthlyPnl } from "@/data/sample";
import { profitAndLoss } from "@/lib/finance";

const periods = ["week", "month", "year", "custom"] as const;

function Row({ label, amount, strong, negative }: { label: string; amount: number; strong?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 px-4 py-3 ${strong ? "bg-brand-50 font-semibold" : ""}`}>
      <span className={strong ? "" : "text-zinc-700"}>{label}</span>
      <span className={negative ? "text-red-700" : ""}>
        {negative ? "(" : ""}
        <Money amount={amount} />
        {negative ? ")" : ""}
      </span>
    </div>
  );
}

export default function ProfitLossPage() {
  const t = useTranslations("pnl");
  const format = useFormatter();
  const [period, setPeriod] = useState<(typeof periods)[number]>("month");
  const r = profitAndLoss(monthlyPnl);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={format.dateTime(new Date(`${monthlyPnl.month}-01T00:00:00`), { month: "long", year: "numeric" })}
      />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("period")}>
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => setPeriod(p)}
            className={`min-h-9 rounded-full px-4 text-sm font-medium ${period === p ? "bg-brand-700 text-white" : "border border-black/10 bg-white"}`}
          >
            {t(`periods.${p}`)}
          </button>
        ))}
      </div>

      <Card className="mx-auto max-w-2xl divide-y divide-black/5 overflow-hidden">
        <Row label={t("netSales")} amount={monthlyPnl.netSales} />
        <Row label={t("cogs")} amount={monthlyPnl.costOfGoodsSold} negative />
        <Row label={t("grossProfit")} amount={r.grossProfit} strong />
        {monthlyPnl.operatingExpenses.map((e) => (
          <Row key={e.key} label={t(`expenses.${e.key}`)} amount={e.amount} negative />
        ))}
        <div data-testid="net-profit">
          <Row label={t("netOperatingProfit")} amount={r.netOperatingProfit} strong />
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 text-sm">
          <div><div className="text-zinc-600">{t("grossMargin")}</div><div className="text-lg font-semibold">{r.grossMarginPct}%</div></div>
          <div><div className="text-zinc-600">{t("operatingMargin")}</div><div className="text-lg font-semibold">{r.operatingMarginPct}%</div></div>
        </div>
      </Card>
      <PrototypeNote>{period === "month" ? t("note") : t("periodNote")}</PrototypeNote>
    </>
  );
}
