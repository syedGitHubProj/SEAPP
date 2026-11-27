import { Suspense } from "react";
import { CustomiseDesign } from "./CustomiseDesign";

async function Design({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <CustomiseDesign code={decodeURIComponent(code)} />;
}

export default function DesignPage({ params }: PageProps<"/catalog/[code]">) {
  // Reading the URL inside <Suspense> keeps navigation instant (Next.js 16 cache components).
  return (
    <Suspense fallback={null}>
      <Design params={params} />
    </Suspense>
  );
}
