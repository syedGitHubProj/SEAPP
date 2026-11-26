"use client";

import { useTranslations } from "next-intl";
import type { DeliveryStatus, FulfilmentStatus, PurchaseOrderStatus } from "@/data/sample";
import type { PaymentStatus } from "@/lib/orders";
import { Badge, type Tone } from "./ui";

const orderTones: Record<FulfilmentStatus, Tone> = {
  draft: "gray",
  confirmed: "blue",
  factoryOrdered: "purple",
  inProduction: "amber",
  received: "blue",
  readyForDelivery: "green",
  delivered: "green",
  closed: "gray",
  cancelled: "red",
};

export function OrderStatusBadge({ status }: { status: FulfilmentStatus }) {
  const t = useTranslations("orderStatus");
  return <Badge tone={orderTones[status]}>{t(status)}</Badge>;
}

const paymentTones: Record<PaymentStatus, Tone> = { unpaid: "red", partial: "amber", paid: "green" };

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const t = useTranslations("paymentStatus");
  return <Badge tone={paymentTones[status]}>{t(status)}</Badge>;
}

const poTones: Record<PurchaseOrderStatus, Tone> = {
  ordered: "blue",
  inProduction: "amber",
  late: "red",
  received: "green",
};

export function PoStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const t = useTranslations("poStatus");
  return <Badge tone={poTones[status]}>{t(status)}</Badge>;
}

const deliveryTones: Record<DeliveryStatus, Tone> = {
  scheduled: "blue",
  outForDelivery: "amber",
  delivered: "green",
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const t = useTranslations("deliveryStatus");
  return <Badge tone={deliveryTones[status]}>{t(status)}</Badge>;
}
