import { notFound } from "next/navigation";
import { Suspense } from "react";
import { designs, findDesign } from "@/data/sample";
import { CustomiseDesign } from "./CustomiseDesign";

export function generateStaticParams() {
  return designs.map((d) => ({ code: d.code }));
}

async function Design({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!findDesign(code)) notFound();
  return <CustomiseDesign code={code} />;
}

export default function DesignPage({ params }: PageProps<"/catalog/[code]">) {
  // Reading the URL inside <Suspense> keeps navigation instant (Next.js 16 cache components).
  return (
    <Suspense fallback={null}>
      <Design params={params} />
    </Suspense>
  );
}
