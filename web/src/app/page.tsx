"use client";

import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Factory,
  HandCoins,
  PackageCheck,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DesignImage } from "@/components/DesignArt";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { Card, Money, PageHeader, StatCard } from "@/components/ui";
import {
  auditEvents,
  cashBook,
  customers,
  monthlyPnl,
  staffUsers,
  weekKpis,
} from "@/data/sample";
import { closingCash, profitAndLoss } from "@/lib/finance";
import { useApiQuery } from "@/lib/api";
import type { CategoryDto, DesignDto } from "@/lib/api-types";
import { artFor } from "@/lib/catalog";
import { usePurchaseOrders, useSalesOrders } from "@/lib/prototype-store";
import { useMoney, useRole, useSession } from "@/lib/session";
import { linkedSalesOrders, purchaseOrderTotal, salesOrderTotal } from "@/lib/purchasing";

function ActionTile({ href, icon, title, hint, tone }: { href: string; icon: ReactNode; title: string; hint?: string; tone: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white p-3 text-center shadow-sm transition hover:border-brand-300 hover:shadow"
    >
      <span className={`flex size-12 items-center justify-center rounded-2xl ${tone}`}>{icon}</span>
      <span className="text-sm font-semibold text-zinc-900">{title}</span>
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </Link>
  );
}

function SalesmanHome() {
  const t = useTranslations("dashboard");
  const { user } = useSession();
  const featured = (useApiQuery<DesignDto[]>("/api/catalog/designs").data ?? []).slice(0, 6);
  const categoryName = new Map((useApiQuery<CategoryDto[]>("/api/catalog/categories").data ?? []).map((c) => [c.id, c.name]));
  // Sale Orders are still sample data until Phase 3, so show the most recent ones.
  const myOrders = useSalesOrders().slice(0, 3);
  const firstName = (user?.fullName ?? "").split(" ")[0];
  return (
    <>
      <PageHeader title={t("salesman.greeting", { name: firstName })} subtitle={t("salesman.subtitle")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionTile href="/orders/new" icon={<ShoppingCart className="size-6" />} title={t("salesman.newSale")} tone="bg-brand-700 text-white" />
        <ActionTile href="/customers" icon={<Users className="size-6" />} title={t("salesman.customers")} tone="bg-violet-100 text-violet-700" />
        <ActionTile href="/orders" icon={<ClipboardList className="size-6" />} title={t("salesman.myOrders")} tone="bg-sky-100 text-sky-700" />
        <ActionTile href="/orders" icon={<HandCoins className="size-6" />} title={t("salesman.receivePayment")} tone="bg-orange-100 text-orange-700" />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-900">{t("salesman.browseDesigns")}</h2>
          <Link href="/catalog" className="text-sm font-medium text-brand-700">{t("viewAll")}</Link>
        </div>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {featured.map((d) => (
            <li key={d.id}>
              <Link href={`/catalog/${d.code}`} className="block overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
                <DesignImage photoUrl={d.photos[0]?.url} category={artFor(categoryName.get(d.categoryId))} alt={d.name} className="aspect-square w-full" />
                <span className="block truncate px-2 py-1.5 text-xs font-medium">{d.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold text-brand-900">{t("salesman.recentOrders")}</h2>
        <Card className="divide-y divide-black/5">
          {myOrders.map((o) => (
            <div key={o.number} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-medium">{o.customer}</div>
                <div className="truncate text-sm text-zinc-500">{o.number} · {o.lines.map((l) => l.description.split(" — ")[0]).join(", ")}</div>
              </div>
              <div className="text-end">
                <OrderStatusBadge status={o.status} />
                <div className="mt-1 text-xs text-zinc-500">{t("balance")}: <Money amount={salesOrderTotal(o.lines) - o.paid} /></div>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </>
  );
}

function ManagerDashboard() {
  const t = useTranslations("dashboard");
  const money = useMoney();
  const late = usePurchaseOrders().filter((p) => p.status === "late");
  return (
    <>
      <PageHeader title={t("manager.title")} subtitle={t("manager.subtitle")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<ShoppingCart className="size-5" />} value={money(weekKpis.sales)} label={t("manager.salesWeek")} />
        <StatCard icon={<Wallet className="size-5" />} value={money(weekKpis.collections)} label={t("manager.collections")} tone="blue" />
        <StatCard icon={<Factory className="size-5" />} value={String(weekKpis.openFactoryOrders)} label={t("manager.factoryOrders")} tone="amber" />
        <StatCard icon={<Truck className="size-5" />} value={String(weekKpis.pendingDeliveries)} label={t("manager.pendingDeliveries")} tone="purple" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionTile href="/orders" icon={<CheckCircle2 className="size-6" />} title={t("manager.approveOrders")} hint={t("manager.approveOrdersHint")} tone="bg-brand-100 text-brand-700" />
        <ActionTile href="/factory-orders" icon={<Factory className="size-6" />} title={t("manager.factoryOrdersTile")} hint={t("manager.factoryOrdersHint")} tone="bg-orange-100 text-orange-700" />
        <ActionTile href="/receiving" icon={<PackageCheck className="size-6" />} title={t("manager.receiveStock")} hint={t("manager.receiveStockHint")} tone="bg-red-100 text-red-700" />
        <ActionTile href="/deliveries" icon={<Truck className="size-6" />} title={t("manager.deliver")} hint={t("manager.deliverHint")} tone="bg-brand-100 text-brand-700" />
        <ActionTile href="/expenses" icon={<Receipt className="size-6" />} title={t("manager.expenses")} hint={t("manager.expensesHint")} tone="bg-orange-100 text-orange-700" />
        <ActionTile href="/finance/cash-book" icon={<Wallet className="size-6" />} title={t("manager.cashInOut")} hint={t("manager.cashInOutHint")} tone="bg-brand-100 text-brand-700" />
        <ActionTile href="/reports/profit-loss" icon={<BarChart3 className="size-6" />} title={t("manager.reports")} hint={t("manager.reportsHint")} tone="bg-violet-100 text-violet-700" />
        <ActionTile href="/finance/cash-book" icon={<CalendarCheck className="size-6" />} title={t("manager.todaySummary")} hint={t("manager.todaySummaryHint")} tone="bg-brand-100 text-brand-700" />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold text-brand-900">{t("alerts")}</h2>
        <Card className="divide-y divide-black/5">
          {late.map((p) => (
            <div key={p.number} className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
              <p className="text-sm">{t("manager.lateFactory", { po: p.number, factory: p.factory, order: linkedSalesOrders(p.lines).join(", ") })}</p>
            </div>
          ))}
          <div className="flex items-start gap-3 p-4">
            <Truck className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p className="text-sm">{t("manager.deliveryNoTeam", { order: "SO-000142" })}</p>
          </div>
          <div className="flex items-start gap-3 p-4">
            <Receipt className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p className="text-sm">{t("manager.expenseWaiting")}</p>
          </div>
        </Card>
      </section>
    </>
  );
}

function AdminDashboard() {
  const t = useTranslations("dashboard");
  const money = useMoney();
  const ta = useTranslations("audit");
  const pnl = profitAndLoss(monthlyPnl);
  const receivables = customers.reduce((s, c) => s + c.balance, 0);
  const payables = usePurchaseOrders().reduce((s, p) => s + purchaseOrderTotal(p.lines) - p.paid, 0);
  const cash = closingCash(cashBook.opening, cashBook.lines);
  return (
    <>
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<BarChart3 className="size-5" />} value={money(pnl.netOperatingProfit)} label={t("admin.netProfitMonth")} />
        <StatCard icon={<HandCoins className="size-5" />} value={money(receivables)} label={t("admin.receivables")} tone="amber" />
        <StatCard icon={<Factory className="size-5" />} value={money(payables)} label={t("admin.payables")} tone="red" />
        <StatCard icon={<Wallet className="size-5" />} value={money(cash)} label={t("admin.cashToday")} tone="blue" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-900">{t("admin.margins")}</h2>
            <Link href="/reports/profit-loss" className="text-sm font-medium text-brand-700">{t("viewAll")}</Link>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-brand-50 p-3"><dt className="text-zinc-600">{t("admin.grossMargin")}</dt><dd className="text-xl font-semibold">{pnl.grossMarginPct}%</dd></div>
            <div className="rounded-xl bg-brand-50 p-3"><dt className="text-zinc-600">{t("admin.operatingMargin")}</dt><dd className="text-xl font-semibold">{pnl.operatingMarginPct}%</dd></div>
          </dl>
          <Link href="/admin/users" className="mt-4 flex items-center gap-3 rounded-xl border border-black/5 p-3 text-sm hover:bg-sand-50">
            <ShieldCheck className="size-5 text-brand-700" />
            {t("admin.activeUsers", { count: staffUsers.filter((u) => u.active).length })}
          </Link>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold text-brand-900">{t("admin.recentActivity")}</h2>
          <ul className="space-y-3 text-sm">
            {auditEvents.map((e) => (
              <li key={e.when + e.ref} className="flex justify-between gap-3">
                <span>{ta(e.action, { who: e.who, ref: e.ref })}</span>
                <span className="shrink-0 text-xs text-zinc-500">{e.when}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionTile href="/orders" icon={<ClipboardList className="size-6" />} title={t("admin.allOrders")} tone="bg-sky-100 text-sky-700" />
        <ActionTile href="/finance/cash-book" icon={<Wallet className="size-6" />} title={t("manager.cashInOut")} tone="bg-brand-100 text-brand-700" />
        <ActionTile href="/reports/profit-loss" icon={<BarChart3 className="size-6" />} title={t("manager.reports")} tone="bg-violet-100 text-violet-700" />
        <ActionTile href="/admin/users" icon={<Plus className="size-6" />} title={t("admin.manageUsers")} tone="bg-orange-100 text-orange-700" />
      </div>
    </>
  );
}

export default function HomePage() {
  const role = useRole();
  if (role === "manager") return <ManagerDashboard />;
  if (role === "admin") return <AdminDashboard />;
  return <SalesmanHome />;
}
