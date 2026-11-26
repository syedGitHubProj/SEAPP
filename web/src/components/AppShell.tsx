"use client";

import {
  BarChart3,
  Bell,
  ClipboardList,
  Factory,
  Home,
  LayoutGrid,
  Menu,
  PackageCheck,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Sofa,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import type { Role } from "@/data/sample";
import { setRole, useRole } from "@/lib/prototype-store";

interface NavItem {
  href: string;
  key: string;
  icon: typeof Home;
  roles: Role[];
}

const ALL: Role[] = ["salesman", "manager", "admin"];
const MGMT: Role[] = ["manager", "admin"];

export const navItems: NavItem[] = [
  { href: "/", key: "home", icon: Home, roles: ALL },
  { href: "/catalog", key: "catalog", icon: LayoutGrid, roles: ALL },
  { href: "/orders/new", key: "newSale", icon: Plus, roles: ["salesman", "manager"] },
  { href: "/orders", key: "orders", icon: ClipboardList, roles: ALL },
  { href: "/customers", key: "customers", icon: Users, roles: ALL },
  { href: "/factory-orders", key: "factoryOrders", icon: Factory, roles: MGMT },
  { href: "/receiving", key: "receiving", icon: PackageCheck, roles: MGMT },
  { href: "/deliveries", key: "deliveries", icon: Truck, roles: MGMT },
  { href: "/expenses", key: "expenses", icon: Receipt, roles: MGMT },
  { href: "/finance/cash-book", key: "cashBook", icon: Wallet, roles: MGMT },
  { href: "/reports/profit-loss", key: "reports", icon: BarChart3, roles: MGMT },
  { href: "/admin/users", key: "users", icon: ShieldCheck, roles: ["admin"] },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/orders") return pathname === "/orders";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("shell");
  const tr = useTranslations("roles");
  const role = useRole();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className={compact ? "sr-only" : "text-zinc-600"}>{t("viewingAs")}</span>
      <select
        aria-label={t("viewingAs")}
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="min-h-10 rounded-lg border border-black/10 bg-white px-2 font-medium text-brand-900"
      >
        {ALL.map((r) => (
          <option key={r} value={r}>
            {tr(r)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  const t = useTranslations("app");
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className={`flex size-9 items-center justify-center rounded-xl ${light ? "bg-white/15" : "bg-brand-700"}`}>
        <Sofa className="size-5 text-white" />
      </span>
      <span className="leading-tight">
        <span className={`block text-lg font-semibold ${light ? "text-white" : "text-brand-900"}`}>{t("name")}</span>
        <span className={`block text-xs ${light ? "text-white/70" : "text-zinc-500"}`}>{t("business")}</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("nav");
  const ts = useTranslations("shell");
  const pathname = usePathname();
  const role = useRole();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = navItems.filter((i) => i.roles.includes(role));

  const tabKeys = ["home", "catalog", "newSale", "orders"];
  const tabs = items.filter((i) => tabKeys.includes(i.key));

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-brand-800 p-4 lg:flex">
        <div className="mb-6 px-2 pt-1">
          <Brand light />
        </div>
        <nav aria-label={ts("mainNav")} className="flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                  active ? "bg-brand-600 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="size-5" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/80">{ts("prototypeBanner")}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/5 bg-white/90 px-4 py-2.5 backdrop-blur">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder={ts("searchPlaceholder")}
              aria-label={ts("searchPlaceholder")}
              className="min-h-10 w-full rounded-xl border border-black/10 bg-sand-50 ps-9 pe-3 text-sm"
            />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <RoleSwitcher compact />
            <button
              type="button"
              aria-label={ts("notifications")}
              className="relative flex size-10 items-center justify-center rounded-xl text-brand-800 hover:bg-brand-50"
            >
              <Bell className="size-5" />
              <span className="absolute end-2 top-2 size-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pb-10">{children}</main>
      </div>

      {/* Phone bottom tabs */}
      <nav
        aria-label={ts("mainNav")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around">
          {tabs.map((item) => {
            const active = isActive(pathname, item.href);
            const isNew = item.key === "newSale";
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                    active ? "text-brand-700" : "text-zinc-500"
                  }`}
                >
                  {isNew ? (
                    <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg">
                      <item.icon className="size-6" />
                    </span>
                  ) : (
                    <item.icon className="size-5" />
                  )}
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-zinc-500"
            >
              <Menu className="size-5" />
              {t("more")}
            </button>
          </li>
        </ul>
      </nav>

      {/* Phone "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("more")}>
          <button
            type="button"
            aria-label={ts("close")}
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <RoleSwitcher />
              <button
                type="button"
                aria-label={ts("close")}
                onClick={() => setMoreOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl hover:bg-zinc-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl bg-sand-50 p-2 text-center text-xs font-medium text-brand-900"
                  >
                    <item.icon className="size-6 text-brand-700" />
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-xs text-zinc-500">{ts("prototypeBanner")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
