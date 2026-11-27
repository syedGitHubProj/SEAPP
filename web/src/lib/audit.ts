/** Turns an audit row's JSON into short readable lines for the audit log screen. */

export interface ChangeLine {
  /** e.g. "Base price" (from BasePrice). */
  field: string;
  /** For a change: the old value. Undefined for an added record or a named action. */
  from?: string;
  to: string;
}

/** Hidden: internal links and housekeeping that mean nothing to the reader. */
const HIDDEN = new Set([
  "Id", "CreatedAt", "StorageKey", "UserName", "Email",
  "EmailConfirmed", "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled",
]);

/** "BasePrice" -> "Base price", "role" -> "Role". */
export function fieldLabel(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isChange(value: unknown): value is { from: unknown; to: unknown } {
  return typeof value === "object" && value !== null && "from" in value && "to" in value;
}

export function describeChanges(changes: string | null): ChangeLine[] {
  if (!changes) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(changes);
  } catch {
    return [{ field: "", to: changes }];
  }
  if (typeof parsed !== "object" || parsed === null) return [{ field: "", to: show(parsed) }];
  // A named action such as RoleChanged stores just { from, to }.
  if (isChange(parsed) && Object.keys(parsed).length === 2) return [{ field: "", from: show(parsed.from), to: show(parsed.to) }];
  return Object.entries(parsed)
    .filter(([key]) => !HIDDEN.has(key) && !/Id$/.test(key))
    .map(([key, value]) =>
      isChange(value) ? { field: fieldLabel(key), from: show(value.from), to: show(value.to) } : { field: fieldLabel(key), to: show(value) },
    );
}
