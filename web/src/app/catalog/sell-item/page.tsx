import { Suspense } from "react";
import { SellOtherItem } from "./SellOtherItem";

// The item comes from the URL (?id=…), read inside <Suspense>.
export default function SellItemPage() {
  return (
    <Suspense fallback={null}>
      <SellOtherItem />
    </Suspense>
  );
}
