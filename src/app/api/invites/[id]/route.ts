import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_: Request, { params }: any) {
  try {
    const { data, error } = await svc
      .from("invites")
      .select("id, role, gym_id, name, email, status")
      .eq("id", params.id)       // ← lookup by PK; no “more than one row”
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Not found" }, { status: 404 });
  }
}
