// app/components/SupabaseProvider.tsx
"use client";

import { useState, ReactNode } from "react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";

export default function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState(() =>
    createBrowserSupabaseClient({
      // reads NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY automatically
      // the following auth defaults are already true in the browser;
      // setting them here just makes it explicit.
      options: {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== "undefined" ? window.localStorage : undefined,
        },
      },
    } as any) // (types for `options` can be strict depending on helper version)
  );

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
}
