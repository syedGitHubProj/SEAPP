"use client";

import { Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Badge, Button, Card, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { expenses } from "@/data/sample";

export default function ExpensesPage() {
  const t = useTranslations("expenses");
  const tcat = useTranslations("expenseCategories");
  const tc = useTranslations("common");
  const format = useFormatter();
  const today = expenses.filter((e) => e.date === "2026-11-25").reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter((e) => !e.approved).length;

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<Button disabled title={tc("comingLater")}><Plus className="size-4" /> {t("add")}</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-sm text-zinc-600">{t("today")}</div>
          <Money amount={today} className="text-lg font-semibold" />
        </Card>
        <Card className="p-4">
          <div className="text-sm text-zinc-600">{t("awaitingApproval")}</div>
          <div className="text-lg font-semibold">{pending}</div>
        </Card>
      </div>
      <ResponsiveTable
        rows={expenses}
        rowKey={(e) => e.date + e.description}
        columns={[
          { key: "date", label: t("date"), render: (e) => format.dateTime(new Date(`${e.date}T00:00:00`), { dateStyle: "medium" }) },
          { key: "description", label: t("description"), primary: true, render: (e) => e.description },
          { key: "category", label: t("category"), render: (e) => tcat(e.category) },
          { key: "by", label: t("enteredBy"), render: (e) => e.enteredBy },
          { key: "amount", label: tc("amount"), align: "end", render: (e) => <Money amount={e.amount} /> },
          { key: "approved", label: t("approval"), render: (e) => <Badge tone={e.approved ? "green" : "amber"}>{e.approved ? t("approved") : t("pending")}</Badge> },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
