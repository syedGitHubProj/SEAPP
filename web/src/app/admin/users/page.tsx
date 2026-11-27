"use client";

import { KeyRound, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { QuickAddForm } from "@/components/QuickAddForm";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Badge, Button, Card, LoadState, PageHeader } from "@/components/ui";
import { api, errorKey, useApiQuery } from "@/lib/api";
import type { ApiRole, UserDto } from "@/lib/api-types";
import { useCan, useSession } from "@/lib/session";

const ROLES: ApiRole[] = ["Salesman", "Manager", "Admin"];

type Panel = { mode: "add" } | { mode: "password"; user: UserDto } | null;

export default function UsersPage() {
  const t = useTranslations("users");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const canManage = useCan("users.manage");
  const { user: me } = useSession();
  const [panel, setPanel] = useState<Panel>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const { data, error, loading, reload } = useApiQuery<UserDto[]>(canManage ? "/api/admin/users" : null);

  if (!canManage) return <Card className="p-6 text-center text-sm text-zinc-600">{te("notAllowed")}</Card>;

  const roleOptions = ROLES.map((r) => ({ value: r, label: tr(r.toLowerCase()) }));

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setMessage(null);
    try {
      await action();
      if (success) setMessage({ tone: "ok", text: success });
      reload();
    } catch (e) {
      setMessage({ tone: "error", text: te(errorKey(e)) });
    }
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          panel === null && (
            <Button onClick={() => setPanel({ mode: "add" })}>
              <Plus className="size-4" /> {t("add")}
            </Button>
          )
        }
      />

      {panel?.mode === "add" && (
        <QuickAddForm
          title={t("addTitle")}
          initial={{ role: "Salesman" }}
          fields={[
            { name: "fullName", label: t("name"), required: true },
            { name: "userName", label: t("username"), required: true, autoComplete: "off" },
            { name: "role", label: t("role"), required: true, options: roleOptions },
            { name: "password", label: t("password"), required: true, type: "password", hint: t("passwordHint"), autoComplete: "new-password" },
          ]}
          onSave={async (v) => {
            await api("/api/admin/users", { method: "POST", json: v });
            setPanel(null);
            reload();
          }}
          onCancel={() => setPanel(null)}
        />
      )}

      {panel?.mode === "password" && (
        <QuickAddForm
          key={panel.user.id}
          title={`${t("resetPassword")}: ${panel.user.fullName}`}
          fields={[{ name: "password", label: t("newPassword"), required: true, type: "password", hint: t("passwordHint"), autoComplete: "new-password" }]}
          onSave={async (v) => {
            await api(`/api/admin/users/${panel.user.id}/password`, { method: "POST", json: { password: v.password } });
            setMessage({ tone: "ok", text: t("passwordReset", { name: panel.user.fullName }) });
            setPanel(null);
          }}
          onCancel={() => setPanel(null)}
        />
      )}

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`mb-4 rounded-xl px-3 py-2 text-sm ${message.tone === "error" ? "bg-red-50 text-red-800" : "bg-brand-50 text-brand-800"}`}>
          {message.text}
        </p>
      )}

      {data === undefined ? (
        <LoadState loading={loading} error={error} onRetry={reload} loadingText={tc("loading")} errorText={te(errorKey(error))} retryText={tc("retry")} />
      ) : (
        <ResponsiveTable
          rows={data}
          rowKey={(u) => u.id}
          columns={[
            {
              key: "name",
              label: t("name"),
              primary: true,
              render: (u) => (
                <span className="font-medium">
                  {u.fullName} {u.id === me?.id && <Badge tone="blue">{t("you")}</Badge>}
                </span>
              ),
            },
            { key: "username", label: t("username"), render: (u) => u.userName },
            {
              key: "role",
              label: t("role"),
              render: (u) =>
                u.id === me?.id ? (
                  tr(u.role.toLowerCase())
                ) : (
                  <select
                    aria-label={`${t("changeRole")}: ${u.fullName}`}
                    value={u.role}
                    onChange={(e) => void run(() => api(`/api/admin/users/${u.id}/role`, { method: "PUT", json: { role: e.target.value } }))}
                    className="min-h-9 rounded-lg border border-black/10 bg-white px-2 text-sm"
                  >
                    {roleOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ),
            },
            {
              key: "status",
              label: t("status"),
              render: (u) => <Badge tone={u.isActive ? "green" : "gray"}>{u.isActive ? t("active") : t("inactive")}</Badge>,
            },
            {
              key: "actions",
              label: "",
              align: "end",
              render: (u) =>
                u.id === me?.id ? null : (
                  <span className="inline-flex flex-wrap justify-end gap-1">
                    <Button variant="ghost" className="min-h-9 px-2" onClick={() => setPanel({ mode: "password", user: u })} aria-label={`${t("resetPassword")}: ${u.fullName}`}>
                      <KeyRound className="size-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-9 px-3"
                      onClick={() => {
                        if (u.isActive && !window.confirm(t("switchOffConfirm", { name: u.fullName }))) return;
                        void run(() => api(`/api/admin/users/${u.id}/active`, { method: "PUT", json: { isActive: !u.isActive } }));
                      }}
                    >
                      {u.isActive ? t("switchOff") : t("switchOn")}
                    </Button>
                  </span>
                ),
            },
          ]}
        />
      )}
    </>
  );
}
