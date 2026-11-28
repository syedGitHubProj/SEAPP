"use client";

import { ArrowLeft, Minus, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Card, LinkButton, LoadState, Money } from "@/components/ui";
import { errorKey, useApiQuery } from "@/lib/api";
import type { OtherItemDto } from "@/lib/api-types";
import { addDraftItem } from "@/lib/prototype-store";

/** Adds an "other item" (mirror, lights, mattress…) to the Sale Order, with a quantity and agreed price. */
export function SellOtherItem() {
  const t = useTranslations("sellItem");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const id = useSearchParams().get("id") ?? "";
  const { data, error, loading, reload } = useApiQuery<OtherItemDto[]>("/api/catalog/other-items");

  if (!data) {
    return <LoadState loading={loading} error={error} onRetry={reload} loadingText={tc("loading")} errorText={te(errorKey(error))} retryText={tc("retry")} />;
  }
  const item = data.find((i) => i.id === id);
  if (!item) {
    return (
      <Card className="p-6 text-center text-sm">
        <p className="mb-4 text-zinc-600">{t("notFound")}</p>
        <LinkButton href="/catalog">{t("back")}</LinkButton>
      </Card>
    );
  }
  return <SellForm key={item.id} item={item} />;
}

function SellForm({ item }: { item: OtherItemDto }) {
  const t = useTranslations("sellItem");
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  // null = follow the catalogue price; a string = the agreed price typed in. A Salesman sees no price.
  const [agreedText, setAgreedText] = useState<string | null>(null);
  const typed = agreedText === null ? null : Number(agreedText.replace(/[^\d]/g, "")) || 0;
  const agreed = typed ?? item.price ?? 0;

  const add = () => {
    addDraftItem({
      designId: item.id,
      designCode: "",
      designName: item.name,
      art: "living",
      photoUrl: null,
      materialName: null,
      colorName: null,
      colorHex: null,
      items: [],
      quantity,
      listUnitPrice: item.price,
      agreedUnitPrice: agreed,
    });
    router.push("/orders/new");
  };

  return (
    <>
      <Link href="/catalog" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-700">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <Card className="mx-auto max-w-lg p-4">
        <div className="mb-4 flex items-center gap-3">
          <Package className="size-8 text-brand-700" />
          <h1 className="text-xl font-semibold text-brand-900">{item.name}</h1>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t("quantity")}</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t("less")} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex size-10 items-center justify-center rounded-xl border border-black/10">
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
            <button type="button" aria-label={t("more")} onClick={() => setQuantity((q) => q + 1)} className="flex size-10 items-center justify-center rounded-xl border border-black/10">
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-black/5 pt-4">
          {item.price !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">{t("price")}</span>
              <Money amount={item.price} />
            </div>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">{t("agreedPrice")}{item.price === null && " *"}</span>
            <input
              inputMode="numeric"
              value={agreedText ?? (item.price === null ? "" : String(item.price))}
              onChange={(e) => setAgreedText(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-black/10 px-3 font-semibold tabular-nums"
            />
            <span className="mt-1 block text-xs text-zinc-500">{t(item.price === null ? "agreedPriceTypeHint" : "agreedPriceHint")}</span>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/5 pt-4">
          <div>
            <div className="text-xs text-zinc-500">{t("total")}</div>
            <Money amount={agreed * quantity} className="text-lg font-semibold text-brand-900" />
          </div>
          <Button onClick={add} disabled={agreed <= 0}>{t("add")}</Button>
        </div>
      </Card>
    </>
  );
}
