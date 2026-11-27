"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Card, LoadState, PageHeader } from "@/components/ui";
import { api, errorKey, useApiQuery } from "@/lib/api";
import type { AuditDto, UserDto } from "@/lib/api-types";
import { describeChanges } from "@/lib/audit";
import { useCan, useSession } from "@/lib/session";

const PAGE = 50;
const KINDS = ["Customer", "Factory", "Design", "Category", "AppUser", "BusinessSettings"] as const;
const selectClass = "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm";

/** Admin reads who changed what, newest first. Rows are only ever added, never edited. */
export default function AuditLogPage() {
  const t = useTranslations("auditLog");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const canView = useCan("audit.view");
  const { settings } = useSession();
  const [kind, setKind] = useState("");
  const [userName, setUserName] = useState("");
  // Older pages loaded with "Show older", for the filters they were loaded with.
  const [older, setOlder] = useState<{ filters: string; rows: AuditDto[]; finished: boolean }>({ filters: "", rows: [], finished: false });
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<unknown>(null);

  const params = new URLSearchParams({ take: String(PAGE) });
  if (kind) params.set("entityType", kind);
  if (userName) params.set("userName", userName);
  const filters = params.toString();
  const first = useApiQuery<AuditDto[]>(canView ? `/api/admin/audit?${filters}` : null);
  const staff = useApiQuery<UserDto[]>(canView ? "/api/admin/users" : null);

  if (!canView) return <Card className="p-6 text-center text-sm text-zinc-600">{te("notAllowed")}</Card>;

  const extra = older.filters === filters ? older : { rows: [], finished: false };
  const rows = [...(first.data ?? []), ...extra.rows];
  const finished = (first.data !== undefined && first.data.length < PAGE) || extra.finished;

  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: settings?.timeZone ?? "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const kindLabel = (type: string) => (t.has(`types.${type}`) ? t(`types.${type}`) : type);
  const actionLabel = (action: string) => (t.has(`actions.${action}`) ? t(`actions.${action}`) : action);

  const showOlder = async () => {
    const last = rows[rows.length - 1];
    if (!last) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const page = await api<AuditDto[]>(`/api/admin/audit?${filters}&before=${encodeURIComponent(last.at)}`);
      setOlder({ filters, rows: [...extra.rows, ...page], finished: page.length < PAGE });
    } catch (e) {
      setOlderError(e);
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">{t("kind")}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={selectClass}>
            <option value="">{t("allKinds")}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{t("who")}</span>
          <select value={userName} onChange={(e) => setUserName(e.target.value)} className={selectClass}>
            <option value="">{t("everyone")}</option>
            {(staff.data ?? []).map((u) => (
              <option key={u.id} value={u.userName}>
                {u.fullName} ({u.userName})
              </option>
            ))}
          </select>
        </label>
      </div>

      {first.data === undefined ? (
        <LoadState loading={first.loading} error={first.error} onRetry={first.reload} loadingText={tc("loading")} errorText={te(errorKey(first.error))} retryText={tc("retry")} />
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-zinc-600">{t("empty")}</Card>
      ) : (
        <ol className="space-y-2" aria-label={t("title")}>
          {rows.map((r) => {
            const lines = describeChanges(r.changes);
            return (
              <li key={r.id}>
                <Card className="p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-zinc-500">
                    <time dateTime={r.at}>{when.format(new Date(r.at))}</time>
                    <span>{r.userName ?? t("system")}</span>
                  </div>
                  <p className="mt-1">
                    <span className="font-semibold text-brand-900">{actionLabel(r.action)}</span> {kindLabel(r.entityType)}
                    {r.entityType !== "BusinessSettings" && <>: <span className="font-medium">{r.label ?? t("unknownRecord")}</span></>}
                  </p>
                  {lines.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-zinc-700">
                      {lines.map((l, i) => (
                        <li key={i} className="break-words">
                          {l.field && <span className="text-zinc-500">{l.field}: </span>}
                          {l.from !== undefined ? (
                            <>
                              <span className="line-through decoration-zinc-400">{l.from}</span> → {l.to}
                            </>
                          ) : (
                            l.to
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      {olderError !== null && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {te(errorKey(olderError))}
        </p>
      )}
      {first.data !== undefined && rows.length > 0 && (
        <div className="mt-4 text-center">
          {finished ? (
            <p className="text-sm text-zinc-500">{t("end")}</p>
          ) : (
            <Button variant="secondary" disabled={loadingOlder} onClick={() => void showOlder()}>
              {loadingOlder ? tc("loading") : t("older")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
