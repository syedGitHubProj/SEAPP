"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Badge, Button, Money, PageHeader, PrototypeNote } from "@/components/ui";
import { addCustomer, useCustomers } from "@/lib/prototype-store";

export default function CustomersPage() {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const customers = useCustomers();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { count: customers.length })}
        actions={
          !adding && (
            <Button onClick={() => setAdding(true)}>
              <UserPlus className="size-4" /> {t("add")}
            </Button>
          )
        }
      />
      {adding && (
        <QuickAddForm
          title={t("addTitle")}
          fields={[
            { name: "name", label: t("name"), required: true },
            { name: "phone", label: t("phone"), required: true, inputMode: "tel", placeholder: "03xx-xxxxxxx" },
            { name: "area", label: t("address") },
          ]}
          onSave={(v) => {
            addCustomer({ name: v.name, phone: v.phone, area: v.area });
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      <ResponsiveTable
        rows={customers}
        rowKey={(c) => c.id}
        columns={[
          { key: "name", label: t("name"), primary: true, render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "phone", label: t("phone"), render: (c) => <a href={`tel:${c.phone}`} className="text-brand-700">{c.phone}</a> },
          { key: "area", label: t("area"), render: (c) => c.area || "—" },
          { key: "orders", label: t("orders"), align: "end", render: (c) => c.orders },
          {
            key: "balance",
            label: tc("balance"),
            align: "end",
            render: (c) => (c.balance > 0 ? <Money amount={c.balance} className="font-medium text-amber-800" /> : <Badge tone="green">{t("settled")}</Badge>),
          },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
