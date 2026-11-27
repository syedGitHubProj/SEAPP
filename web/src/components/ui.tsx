import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { formatMoney } from "@/lib/money";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-2xl border border-black/5 bg-white shadow-sm", className)}
      {...props}
    />
  );
}

type Variant = "primary" | "secondary" | "ghost";

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "border border-brand-700/30 bg-white text-brand-800 hover:bg-brand-50",
  ghost: "text-brand-800 hover:bg-brand-50",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(buttonBase, variants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(buttonBase, variants[variant], className)} {...props} />;
}

export type Tone = "green" | "blue" | "amber" | "red" | "gray" | "purple";
const tones: Record<Tone, string> = {
  green: "bg-brand-100 text-brand-800",
  blue: "bg-sky-100 text-sky-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-zinc-100 text-zinc-700",
  purple: "bg-violet-100 text-violet-800",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  icon,
  value,
  label,
  tone = "green",
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone?: Tone;
}) {
  return (
    <Card className="p-4">
      <div className={cx("mb-3 inline-flex size-10 items-center justify-center rounded-xl", tones[tone])}>
        {icon}
      </div>
      <div className="text-xl font-semibold text-zinc-900 tabular-nums">{value}</div>
      <div className="text-sm text-zinc-600">{label}</div>
    </Card>
  );
}

export function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={cx("tabular-nums whitespace-nowrap", className)}>{formatMoney(amount)}</span>;
}

export function PrototypeNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </p>
  );
}

/** Shown while a list loads, or when it couldn't load (with a retry button). */
export function LoadState({
  loading,
  error,
  onRetry,
  loadingText,
  errorText,
  retryText,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  loadingText: string;
  errorText: string;
  retryText: string;
}) {
  if (error) {
    return (
      <Card className="p-6 text-center text-sm" role="alert">
        <p className="mb-3 text-red-800">{errorText}</p>
        <Button variant="secondary" onClick={onRetry}>
          {retryText}
        </Button>
      </Card>
    );
  }
  if (loading) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-500" role="status">
        {loadingText}
      </Card>
    );
  }
  return null;
}
