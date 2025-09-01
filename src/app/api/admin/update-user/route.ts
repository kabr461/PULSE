import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BADGE_PREFIX: Record<string,string> = {
  owner:        "MG",
  trainer:      "ST-TR",
  va:           "VA",
  "va-training":"VA-T",
  coach:        "CS",
  client:       "CL",
  "ptsi-intern":"PTSI-INT",
  admin:        "PTSI",
  closer:       "ST-CL",
  front_desk:   "ST-FD",
};

export async function POST(req: Request) {
  const { userId, display_name, email, role, password } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // 1) Auth updates
  if (email || password) {
    const { error: authErr } = await svc.auth.admin.updateUserById(userId, {
      email: email ?? undefined,
      password: password ?? undefined,
    });
    if (authErr) {
      console.error("Auth.updateUser:", authErr);
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }
  }

  // 2) Collect profile changes
  const patch: Record<string,unknown> = {};
  if (display_name) patch.display_name = display_name;
  if (email)        patch.email        = email;
  if (password)     patch.password_length = (password as string).length;

  // 3) If role changed, bump badge
  if (role) {
    patch.role = role;
    const prefix = BADGE_PREFIX[role] || "XX";
    const { data: rows, error: rowsErr } = await svc
      .from("profiles")
      .select("badge_id")
      .ilike("badge_id", `${prefix}-%`);
    if (rowsErr) {
      console.error("Badge lookup:", rowsErr);
      return NextResponse.json({ error: rowsErr.message }, { status: 500 });
    }
    const next = Math.max(0, ...rows.map(r => parseInt(r.badge_id.split("-")[1], 10) || 0)) + 1;
    patch.badge_id = `${prefix}-${next}`;
  }

  // 4) Apply to profiles
  const { data: prof, error: profErr } = await svc
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (profErr) {
    console.error("profiles.update:", profErr);
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  return NextResponse.json({ user: prof }, { status: 200 });
}
