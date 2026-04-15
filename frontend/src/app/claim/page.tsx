import { Suspense } from "react";
import ClaimClient from "@/components/ClaimClient";

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ClaimClient />
    </Suspense>
  );
}
