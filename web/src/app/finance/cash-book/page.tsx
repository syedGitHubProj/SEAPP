"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { cashBook } from "@/data/sample";
import { closingCash } from "@/lib/finance";

export default function CashBookPage() {
  const t = useTranslations("cashBook");
  const format = useFormatter();
  const closing = closingCash(cashBook.opening, cashBook.lines);
  const totalIn = cashBook.lines.filter((l) => l.direction === "in").reduce((s, l) => s + l.amount, 0);
  const totalOut = cashBook.lines.filter((l) => l.direction === "out").reduce((s, l) => s + l.amount, 0);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={format.dateTime(new Date(`${cashBook.date}T00:00:00`), { dateStyle: "full" })}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><div className="text-sm text-zinc-600">{t("opening")}</div><Money amount={cashBook.opening} className="text-lg font-semibold" /></Card>
        <Card className="p-4"><div className="text-sm text-zinc-600">{t("cashIn")}</div><Money amount={totalIn} className="text-lg font-semibold text-brand-700" /></Card>
        <Card className="p-4"><div className="text-sm text-zinc-600">{t("cashOut")}</div><Money amount={totalOut} className="text-lg font-semibold text-red-700" /></Card>
        <Card className="p-4"><div className="text-sm text-zinc-600">{t("closing")}</div><Money amount={closing} className="text-lg font-semibold" /></Card>
      </div>

      <Card className="mx-auto max-w-2xl divide-y divide-black/5">
        <div className="flex justify-between p-4 font-medium">
          <span>{t("opening")}</span>
          <Money amount={cashBook.opening} />
        </div>
        {cashBook.lines.map((l) => (
          <div key={l.key} className="flex items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-2">
              {l.direction === "in" ? (
                <ArrowDownLeft className="size-4 text-brand-700" aria-label={t("in")} />
              ) : (
                <ArrowUpRight className="size-4 text-red-700" aria-label={t("out")} />
              )}
              {t(`lines.${l.key}`)}
            </span>
            <span className={l.direction === "in" ? "text-brand-700" : "text-red-700"}>
              {l.direction === "in" ? "+" : "−"}
              <Money amount={l.amount} />
            </span>
          </div>
        ))}
        <div className="flex justify-between bg-brand-50 p-4 text-lg font-semibold" data-testid="closing-cash">
          <span>{t("closing")}</span>
          <Money amount={closing} />
        </div>
      </Card>
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
