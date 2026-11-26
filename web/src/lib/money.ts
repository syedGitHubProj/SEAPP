/**
 * Formats an amount for display, e.g. 228000 -> "Rs. 228,000".
 * Currency comes from settings later; PKR is the default.
 */
export function formatMoney(amount: number, currency = "PKR"): string {
  const sign = amount < 0 ? "-" : "";
  const whole = Math.round(Math.abs(amount)).toLocaleString("en-US");
  const prefix = currency === "PKR" ? "Rs." : currency;
  return `${sign}${prefix} ${whole}`;
}
