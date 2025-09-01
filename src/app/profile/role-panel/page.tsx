import React, { Suspense } from "react";
import RolePanelClient from "./RolePanelClient";

// Skip static prerender so Next.js never bails on client‐only hooks
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading role panel…</div>}>
      <RolePanelClient />
    </Suspense>
  );
}
