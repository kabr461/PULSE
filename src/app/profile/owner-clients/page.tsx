import React, { Suspense } from "react";
import OwnerClientsClient from "./OwnerClientsClient";

// Skip static prerender so Next.js never tries to prerender useSearchParams
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading owner clients…</div>}>
      <OwnerClientsClient />
    </Suspense>
  );
}
