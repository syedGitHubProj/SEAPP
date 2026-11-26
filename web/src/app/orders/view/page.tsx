import { Suspense } from "react";
import { OrderDetail } from "./OrderDetail";

// The order number comes from the URL (?number=SO-000145), read inside <Suspense>.
export default function OrderViewPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetail />
    </Suspense>
  );
}
