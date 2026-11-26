"use client";

import { Camera, PackageCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { PoStatusBadge } from "@/components/StatusBadge";
import { Badge, Button, Card, PageHeader, PrototypeNote } from "@/components/ui";
import { goodsReceipts, purchaseOrders } from "@/data/sample";

export default function ReceivingPage() {
  const t = useTranslations("receiving");
  const tc = useTranslations("common");
  const format = useFormatter();
  const awaiting = purchaseOrders.filter((p) => p.status !== "received");
  const date = (d: string) => format.dateTime(new Date(`${d}T00:00:00`), { dateStyle: "medium" });

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <h2 className="mb-3 font-semibold text-brand-900">{t("awaiting")}</h2>
      <ul className="mb-8 grid gap-3 md:grid-cols-2">
        {awaiting.map((p) => (
          <li key={p.number}>
            <Card className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-medium">{p.items}</div>
                <div className="text-sm text-zinc-500">{p.number} · {p.factory}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  {t("expected")}: {date(p.expected)} <PoStatusBadge status={p.status} />
                </div>
              </div>
              <Button variant="secondary" disabled title={tc("comingLater")} className="shrink-0">
                <PackageCheck className="size-4" /> {t("receive")}
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 font-semibold text-brand-900">{t("received")}</h2>
      <ResponsiveTable
        rows={goodsReceipts}
        rowKey={(g) => g.number}
        columns={[
          { key: "number", label: t("number"), render: (g) => <span className="font-medium">{g.number}</span> },
          { key: "factory", label: t("factory"), primary: true, render: (g) => g.factory },
          { key: "po", label: t("po"), render: (g) => g.purchaseOrder },
          { key: "date", label: t("date"), render: (g) => date(g.date) },
          { key: "invoice", label: t("invoice"), render: (g) => <span className="inline-flex items-center gap-1"><Camera className="size-4 text-zinc-400" />{g.invoiceNo}</span> },
          { key: "condition", label: t("condition"), render: (g) => <Badge tone={g.condition === "good" ? "green" : "amber"}>{t(`conditions.${g.condition}`)}</Badge> },
          { key: "by", label: t("receivedBy"), render: (g) => g.receivedBy },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
