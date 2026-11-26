"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Badge, Button, PageHeader, PrototypeNote } from "@/components/ui";
import { staffUsers } from "@/data/sample";

export default function UsersPage() {
  const t = useTranslations("users");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<Button disabled title={tc("comingLater")}><Plus className="size-4" /> {t("add")}</Button>}
      />
      <ResponsiveTable
        rows={staffUsers}
        rowKey={(u) => u.username}
        columns={[
          { key: "name", label: t("name"), primary: true, render: (u) => <span className="font-medium">{u.name}</span> },
          { key: "username", label: t("username"), render: (u) => u.username },
          { key: "role", label: t("role"), render: (u) => tr(u.role) },
          { key: "status", label: t("status"), render: (u) => <Badge tone={u.active ? "green" : "gray"}>{u.active ? t("active") : t("inactive")}</Badge> },
        ]}
      />
      <PrototypeNote>{t("note")}</PrototypeNote>
    </>
  );
}
