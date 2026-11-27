"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/data/sample";
import { api, setSignedOutHandler } from "./api";
import type { Me, SettingsDto } from "./api-types";
import { formatMoney } from "./money";

export const SIGN_IN_PATH = "/sign-in";

interface Session {
  /** undefined while checking; null when nobody is signed in. */
  user: Me | null | undefined;
  signIn: (userName: string, password: string) => Promise<Me>;
  signOut: () => Promise<void>;
  /** Business name and currency; null until loaded after sign-in. */
  settings: SettingsDto | null;
  /** Called after the settings page saves, so the whole app shows the new values at once. */
  setSettings: (settings: SettingsDto) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null | undefined>(undefined);
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api<Me>("/api/auth/me").then(setUser, () => setUser(null));
  }, []);

  // Business name and currency, once someone is signed in.
  const signedInId = user?.id;
  useEffect(() => {
    if (!signedInId) return;
    api<SettingsDto>("/api/settings").then(setSettings, () => undefined);
  }, [signedInId]);

  // Any API call that finds the session gone sends the person back to sign-in.
  useEffect(() => {
    setSignedOutHandler(() => setUser(null));
    return () => setSignedOutHandler(null);
  }, []);

  useEffect(() => {
    if (user === null && pathname !== SIGN_IN_PATH) {
      router.replace(`${SIGN_IN_PATH}?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, pathname, router]);

  const signIn = useCallback(async (userName: string, password: string) => {
    const me = await api<Me>("/api/auth/sign-in", { method: "POST", json: { userName, password } });
    setUser(me);
    return me;
  }, []);

  const signOut = useCallback(async () => {
    await api("/api/auth/sign-out", { method: "POST" }).catch(() => undefined);
    setUser(null);
  }, []);

  return <SessionContext.Provider value={{ user, signIn, signOut, settings, setSettings }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>.");
  return session;
}

/** The signed-in person's role in the screens' wording ("salesman", "manager", "admin"). */
export function useRole(): Role {
  const { user } = useSession();
  return (user?.role.toLowerCase() as Role | undefined) ?? "salesman";
}

/** Whether the signed-in person may do something, e.g. useCan("catalog.edit"). */
export function useCan(permission: string): boolean {
  const { user } = useSession();
  return user?.permissions.includes(permission) ?? false;
}

/** Formats money with the business's currency symbol, e.g. money(228000) -> "Rs. 228,000". */
export function useMoney(): (amount: number) => string {
  const { settings } = useSession();
  const symbol = settings?.currencySymbol;
  return (amount: number) => formatMoney(amount, symbol);
}
