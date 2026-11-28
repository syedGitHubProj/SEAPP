"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CustomerPicker } from "@/components/CustomerPicker";
import { DraftItemRow, OrderSteps } from "@/components/OrderFlow";
import { Button, Card, LinkButton, Money, PageHeader } from "@/components/ui";
import { draftTotal, updateDraft, useDraft } from "@/lib/prototype-store";

const inputClass = "min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm";

export default function NewOrderPage() {
  const t = useTranslations("newOrder");
  const router = useRouter();
  const draft = useDraft();
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

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-brand-900">{t("customer")}</h2>
              {isNewCustomer && (
                <button
                  type="button"
                  onClick={() => updateDraft({ newCustomer: null })}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <Search className="size-4" /> {t("pickExisting")}
                </button>
              )}
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
              <CustomerPicker
                selectedName={draft.customerId ? draft.customerName : null}
                onSelect={(c) => updateDraft({ customerId: c?.id ?? null, customerName: c?.name ?? null })}
                onNew={(phone) => updateDraft({ newCustomer: { name: "", phone, address: "" }, customerId: null, customerName: null })}
              />
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
