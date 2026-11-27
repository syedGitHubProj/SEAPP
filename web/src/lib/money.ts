/**
 * Formats an amount for display, e.g. 228000 -> "Rs. 228,000".
 * The symbol comes from the business settings (useMoney in session.tsx); "Rs." is the default.
 */
export function formatMoney(amount: number, symbol = "Rs."): string {
  const sign = amount < 0 ? "-" : "";
  const whole = Math.round(Math.abs(amount)).toLocaleString("en-US");
  return `${sign}${symbol} ${whole}`;
}
