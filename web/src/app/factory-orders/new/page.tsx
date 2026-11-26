import { Suspense } from "react";
import { NewPurchaseOrder } from "./NewPurchaseOrder";

// The sales order can come from the URL (?so=SO-000145), read inside <Suspense>.
export default function NewPurchaseOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewPurchaseOrder />
    </Suspense>
  );
}
