"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Button, Card, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { addFactory, useFactories, usePurchaseOrders, useRole } from "@/lib/prototype-store";
import { purchaseOrderTotal } from "@/lib/purchasing";

export default function FactoriesPage() {
  const t = useTranslations("factories");
  const role = useRole();
  const factories = useFactories();
  const purchaseOrders = usePurchaseOrders();
  const [adding, setAdding] = useState(false);
  const canEdit = role === "manager" || role === "admin";

  if (!canEdit) {
    return <Card className="p-6 text-center text-sm text-zinc-600">{t("noAccess")}</Card>;
  }

  const openOrders = (name: string) => purchaseOrders.filter((p) => p.factory === name && p.status !== "received").length;
  const owed = (name: string) =>
    purchaseOrders.filter((p) => p.factory === name).reduce((s, p) => s + purchaseOrderTotal(p.lines) - p.paid, 0);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          !adding && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" /> {t("add")}
            </Button>
          )
        }
      />
      {adding && (
        <QuickAddForm
          title={t("addTitle")}
          fields={[
            { name: "name", label: t("name"), required: true },
            { name: "contact", label: t("contact") },
            { name: "phone", label: t("phone"), required: true, inputMode: "tel", placeholder: "03xx-xxxxxxx" },
            { name: "city", label: t("city"), required: true },
            { name: "speciality", label: t("speciality") },
          ]}
          onSave={(v) => {
            addFactory({ name: v.name, contact: v.contact, phone: v.phone, city: v.city, speciality: v.speciality });
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      <ResponsiveTable
        rows={factories}
        rowKey={(f) => f.id}
        columns={[
          { key: "name", label: t("name"), primary: true, render: (f) => <span className="font-medium">{f.name}</span> },
          { key: "contact", label: t("contact"), render: (f) => f.contact || "—" },
          { key: "phone", label: t("phone"), render: (f) => <a href={`tel:${f.phone}`} className="text-brand-700">{f.phone}</a> },
          { key: "city", label: t("city"), render: (f) => f.city },
          { key: "speciality", label: t("speciality"), render: (f) => <span className="text-zinc-600">{f.speciality || "—"}</span> },
          { key: "open", label: t("openOrders"), align: "end", render: (f) => openOrders(f.name) },
          { key: "owed", label: t("owed"), align: "end", render: (f) => <Money amount={owed(f.name)} /> },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
