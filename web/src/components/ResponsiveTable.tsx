import type { ReactNode } from "react";
import { Card } from "./ui";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  align?: "start" | "end";
  /** Show this column as the card title on phones. */
  primary?: boolean;
}

/** A table on wide screens and a stack of cards on phones (no sideways scrolling). */
export function ResponsiveTable<T>({
  rows,
  columns,
  rowKey,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  empty?: string;
}) {
  if (rows.length === 0) {
    return <Card className="p-6 text-center text-sm text-zinc-500">{empty}</Card>;
  }
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-start text-xs uppercase tracking-wide text-brand-800">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 font-semibold ${c.align === "end" ? "text-end" : "text-start"}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-sand-50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.align === "end" ? "text-end" : "text-start"}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <Card className="p-4">
              <div className="mb-2 font-semibold text-zinc-900">{primary.render(row)}</div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {rest.map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="text-zinc-500">{c.label}</dt>
                    <dd className="text-end text-zinc-900">{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
