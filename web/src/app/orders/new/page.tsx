"use client";

import { Plus, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DraftItemRow, OrderSteps } from "@/components/OrderFlow";
import { Button, Card, LinkButton, Money, PageHeader } from "@/components/ui";
import { draftTotal, updateDraft, useCustomers, useDraft } from "@/lib/prototype-store";

const inputClass = "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm";

export default function NewOrderPage() {
  const t = useTranslations("newOrder");
  const router = useRouter();
  const draft = useDraft();
  const customers = useCustomers();
  const total = draftTotal(draft);
  const isNewCustomer = draft.newCustomer !== null;

  const customerReady = isNewCustomer
    ? draft.newCustomer!.name.trim() !== "" && draft.newCustomer!.phone.trim() !== ""
    : draft.customerId !== null;
  const canContinue = draft.items.length > 0 && customerReady && draft.deliveryDate !== "";

  if (draft.items.length === 0) {
    return (
      <>
        <OrderSteps current={1} />
        <PageHeader title={t("title")} subtitle={t("emptySubtitle")} />
        <Card className="p-6 text-center">
          <p className="mb-4 text-sm text-zinc-600">{t("empty")}</p>
          <LinkButton href="/catalog">
            <Plus className="size-4" /> {t("browseCatalog")}
          </LinkButton>
        </Card>
      </>
    );
  }

  return (
    <>
      <OrderSteps current={3} />
      <PageHeader title={t("title")} />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-brand-900">{t("customer")}</h2>
              <button
                type="button"
                onClick={() =>
                  updateDraft(
                    isNewCustomer
                      ? { newCustomer: null }
                      : { newCustomer: { name: "", phone: "", address: "" }, customerId: null },
                  )
                }
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                {isNewCustomer ? <Users className="size-4" /> : <UserPlus className="size-4" />}
                {isNewCustomer ? t("pickExisting") : t("addNewCustomer")}
              </button>
            </div>

            {isNewCustomer ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">{t("customerName")} *</span>
                  <input
                    className={inputClass}
                    value={draft.newCustomer!.name}
                    onChange={(e) => updateDraft({ newCustomer: { ...draft.newCustomer!, name: e.target.value } })}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">{t("phone")} *</span>
                  <input
                    className={inputClass}
                    inputMode="tel"
                    placeholder="03xx-xxxxxxx"
                    value={draft.newCustomer!.phone}
                    onChange={(e) => updateDraft({ newCustomer: { ...draft.newCustomer!, phone: e.target.value } })}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">{t("address")}</span>
                  <input
                    className={inputClass}
                    value={draft.newCustomer!.address}
                    onChange={(e) => updateDraft({ newCustomer: { ...draft.newCustomer!, address: e.target.value } })}
                  />
                </label>
              </div>
            ) : (
              <label className="block text-sm">
                <span className="mb-1 block font-medium">{t("chooseCustomer")} *</span>
                <select
                  className={inputClass}
                  value={draft.customerId ?? ""}
                  onChange={(e) => updateDraft({ customerId: e.target.value || null })}
                >
                  <option value="">{t("chooseCustomerPlaceholder")}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.phone}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-brand-900">{t("orderItems", { count: draft.items.length })}</h2>
              <LinkButton href="/catalog" variant="secondary" className="min-h-9">
                <Plus className="size-4" /> {t("addMoreDesigns")}
              </LinkButton>
            </div>
            <div className="divide-y divide-black/5">
              {draft.items.map((i) => (
                <DraftItemRow key={i.id} item={i} />
              ))}
            </div>
          </Card>
        </div>

        <Card className="h-fit p-4 lg:sticky lg:top-20">
          <h2 className="mb-3 font-semibold text-brand-900">{t("summaryTitle")}</h2>
          <label className="mb-4 block text-sm">
            <span className="mb-1 block font-medium">{t("expectedDelivery")} *</span>
            <input
              type="date"
              className={inputClass}
              value={draft.deliveryDate}
              onChange={(e) => updateDraft({ deliveryDate: e.target.value })}
            />
          </label>
          <div className="flex justify-between border-t border-black/5 pt-3 text-lg font-semibold">
            <span>{t("total")}</span>
            <Money amount={total} />
          </div>
          {!canContinue && <p className="mt-3 text-xs text-zinc-500">{t("fillRequired")}</p>}
          <Button className="mt-4 w-full" disabled={!canContinue} onClick={() => router.push("/orders/new/advance")}>
            {t("saveAndReceive")}
          </Button>
        </Card>
      </div>
    </>
  );
}
