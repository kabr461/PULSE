// app/profile/page.tsx
export const dynamic = "force-dynamic";

import React, { Suspense } from "react";
import ProfilePage from "./ProfileClient";

const BRAND_PRIMARY = "#2F1B66";

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center">
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full border-4 border-gray-200 animate-spin"
            style={{ borderTopColor: BRAND_PRIMARY }}
          />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400 animate-ping" />
        </div>
        <h3 className="mt-4 font-teko text-2xl text-gray-800">Loading…</h3>
        <p className="mt-1 text-gray-600">Getting your profile ready</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<FullscreenLoader />}>
      <ProfilePage />
    </Suspense>
  );
}
