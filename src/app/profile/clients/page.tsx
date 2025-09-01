// Server Component — wraps the real client UI in Suspense
import React, { Suspense } from "react";
import ClientsClient from "./ClientsClient";

// Skip static prerender so we don’t hit useSearchParams on build
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading clients…</div>}>
      <ClientsClient />
    </Suspense>
  );
}
