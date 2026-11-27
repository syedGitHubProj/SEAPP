"use client";

import { Sofa } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

const inputClass = "min-h-12 w-full rounded-xl border border-black/10 bg-white px-3 text-base";

/** Only allow going back to a page on this site after signing in. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/sign-in") ? next : "/";
}

function SignInForm() {
  const t = useTranslations("signIn");
  const ta = useTranslations("app");
  const te = useTranslations("errors");
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { user, signIn } = useSession();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // Already signed in (for example after pressing Back): go straight in.
  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorking(true);
    setError(null);
    try {
      await signIn(userName, password);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null;
      setError(code === "invalidCredentials" || code === "lockedOut" ? t(code) : te("network"));
      setPassword("");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="w-full max-w-sm p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-700">
          <Sofa className="size-6 text-white" />
        </span>
        <span className="leading-tight">
          <span className="block text-xl font-semibold text-brand-900">{ta("name")}</span>
          <span className="block text-sm text-zinc-500">{ta("business")}</span>
        </span>
      </div>
      <h1 className="text-lg font-semibold text-brand-900">{t("title")}</h1>
      <p className="mb-5 text-sm text-zinc-600">{t("subtitle")}</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t("userName")}</span>
          <input
            className={inputClass}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t("password")}</span>
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={working || userName.trim() === "" || password === ""}>
          {working ? t("working") : t("submit")}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500">{t("forgot")}</p>
    </Card>
  );
}

export default function SignInPage() {
  // Reading the URL (?next=) inside <Suspense> keeps Next.js 16 cache components happy.
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
