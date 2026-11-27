"use client";

import { useMoney } from "@/lib/session";

/** An amount in the business's currency, e.g. "Rs. 228,000". */
export function Money({ amount, className }: { amount: number; className?: string }) {
  const money = useMoney();
  return <span className={["tabular-nums whitespace-nowrap", className].filter(Boolean).join(" ")}>{money(amount)}</span>;
}
