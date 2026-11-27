"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DesignEditor } from "./DesignEditor";

function Editor() {
  const code = useSearchParams().get("code");
  return <DesignEditor key={code ?? "new"} code={code} />;
}

export default function EditDesignPage() {
  // Reading the URL (?code=) inside <Suspense> keeps Next.js 16 cache components happy.
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
