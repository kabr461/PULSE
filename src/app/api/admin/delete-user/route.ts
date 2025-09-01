// app/api/admin/delete-user/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  console.log("===== delete-user handler start =====");
  let profile: { gym_id: string; role: string } | null = null;

  try {
    const { userId } = await req.json();
    console.log("Received delete-user for userId:", userId);
    if (!userId) {
      console.warn("⚠️ userId missing");
      return NextResponse.json({ error: "userId missing" }, { status: 400 });
    }

    // 1️⃣ Fetch gym_id & role (so we know what to rebuild)
    const { data: profData, error: profErr } = await svc
      .from("profiles")
      .select("gym_id, role")
      .eq("id", userId)
      .single();
    if (profErr) {
      console.warn("[delete-user] could not fetch profile:", profErr);
    } else {
      profile = profData;
      console.log("[delete-user] profile data:", profile);
    }

    // 2️⃣ Delete from Auth
    const { error: authErr } = await svc.auth.admin.deleteUser(userId);
    if (authErr) {
      console.error("[delete-user] auth error:", authErr);
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }
    console.log("[delete-user] auth record deleted");

    // 3️⃣ Delete profile row
    const { data: delData, error: delErr } = await svc
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (delErr) {
      console.error("[delete-user] db error:", delErr);
    } else {
      console.log("[delete-user] profile row deleted:", delData);
    }

    // 4️⃣ Rebuild all per-gym counters so nothing drifts
    const { error: rpcErr } = await svc.rpc("rebuild_role_counters");
    if (rpcErr) {
      console.error("[delete-user] rebuild_role_counters RPC error:", rpcErr);
    } else {
      console.log("[delete-user] rebuild_role_counters succeeded");
    }

    console.log("===== delete-user handler complete =====");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[delete-user] unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
