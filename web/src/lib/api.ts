"use client";

/**
 * Talking to the SellEase API. The browser calls /api/... on the website's own address:
 * in development Next.js forwards those calls to the API (see next.config.ts); on the server Caddy does.
 * The sign-in session is an HttpOnly cookie, so no tokens are handled here.
 */
import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    /** Short code from the API, e.g. "invalidCredentials", "duplicate", "changedByOthers". */
    public readonly code: string | null,
    /** Field errors from a 400 answer: field → codes. */
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(code ?? `HTTP ${status}`);
  }
}

/** Called when the API says the session has ended (set by the session provider). */
let onSignedOut: (() => void) | null = null;
export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler;
}

async function readError(response: Response): Promise<ApiError> {
  let body: { error?: string; errors?: Record<string, string[]> } = {};
  try {
    body = await response.json();
  } catch {
    // Not JSON (e.g. an empty 403).
  }
  return new ApiError(response.status, body.error ?? null, body.errors ?? {});
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const response = await fetch(path, {
    credentials: "same-origin",
    ...rest,
    headers: json === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: json === undefined ? rest.body : JSON.stringify(json),
  });
  if (response.status === 401 && !path.startsWith("/api/auth/")) onSignedOut?.();
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Loads a GET endpoint. Pass null to skip loading. Call reload() after a change. */
export function useApiQuery<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  // The last answer, and which request it answered. While a newer request is on its way the
  // previous data stays on screen (so a search box doesn't flicker).
  const [result, setResult] = useState<{ key: string; data?: T; error: ApiError | null } | null>(null);
  const key = path === null ? null : `${path}#${version}`;

  useEffect(() => {
    if (key === null || path === null) return;
    let cancelled = false;
    api<T>(path).then(
      (data) => !cancelled && setResult({ key, data, error: null }),
      (e: unknown) => !cancelled && setResult((r) => ({ key, data: r?.data, error: e instanceof ApiError ? e : new ApiError(0, "network") })),
    );
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return {
    data: result?.data,
    error: result?.key === key ? result.error : null,
    loading: key !== null && result?.key !== key,
    reload,
  };
}

/**
 * The message key (in the "errors" section of messages/en.json) for an API error.
 * Field errors are shown by the form; this is the one-line summary.
 */
export function errorKey(e: unknown): string {
  if (!(e instanceof ApiError)) return "network";
  if (e.code === "duplicate" || e.code === "changedByOthers") return e.code;
  if (e.status === 400) return "checkFields";
  if (e.status === 403) return "notAllowed";
  if (e.status === 404) return "notFound";
  if (e.status === 0) return "network";
  return "unexpected";
}
