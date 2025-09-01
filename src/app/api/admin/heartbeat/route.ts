// app/api/admin/heartbeat/route.ts
import { NextResponse } from "next/server";
import { createClient }  from "@supabase/supabase-js";

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // calls the SQL function to full‐rebuild your counters
    const { error } = await svc.rpc("rebuild_role_counters_full");
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("🔥 heartbeat error:", err);
    return NextResponse.json(
      { error: err.message || "Heartbeat failed" },
      { status: 500 }
    );
  }
}
