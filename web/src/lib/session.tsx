"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/data/sample";
import { api, setSignedOutHandler } from "./api";
import type { Me } from "./api-types";

export const SIGN_IN_PATH = "/sign-in";

interface Session {
  /** undefined while checking; null when nobody is signed in. */
  user: Me | null | undefined;
  signIn: (userName: string, password: string) => Promise<Me>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api<Me>("/api/auth/me").then(setUser, () => setUser(null));
  }, []);

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

  return <SessionContext.Provider value={{ user, signIn, signOut }}>{children}</SessionContext.Provider>;
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
