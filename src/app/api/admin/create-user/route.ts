import { NextResponse } from "next/server";
import { createClient }    from "@supabase/supabase-js";

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
  let uid: string | null = null;

  try {
    // 1️⃣ parse incoming FormData
    const form         = await req.formData();
    const display_name = form.get("display_name") as string;
    const email        = form.get("email")        as string;
    const role         = form.get("role")         as string;
    const password     = form.get("password")     as string;
    const gym_id       = form.get("gymId")        as string | null;
    const avatarFile   = form.get("avatar")       as File | null;

    // 2️⃣ validate — gymId is required for every role except PTSI-staff
    const needGym = !["admin","ptsi-intern"].includes(role);
    if (!display_name || !email || !role || !password || (needGym && !gym_id)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 3️⃣ create the Auth user (service‐role, auto-confirmed)
    const { data: authData, error: authErr } = await svc.auth.admin.createUser({
      email,
      password,
      user_metadata: { display_name, role },
      email_confirm:  true,
    });
    if (authErr || !authData) throw authErr ?? new Error("Auth.createUser failed");
    uid = authData.user.id;

    // 4️⃣ bump the per-gym badge counter via RPC (use default for admin/ptsi-intern)
   const badge_id = BADGE_PREFIX[role] || "XX";


    // 5️⃣ optional avatar upload
    let avatar_url: string | null = null;
    if (avatarFile) {
      const path = `avatars/${uid}/${avatarFile.name}`;
      const { error: upErr } = await svc.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (!upErr) {
        avatar_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${uid}/${encodeURIComponent(avatarFile.name)}`;
      }
    }

    // 6️⃣ insert into profiles
    const { error: profErr } = await svc
      .from("profiles")
      .insert({
        id:              uid,
        display_name,
        email,
        role,
        badge_id,
        gym_id,
        password_length: password.length,
        avatar_url,
      });
    if (profErr) throw profErr;

    // 7️⃣ return the new user’s ID
    return NextResponse.json({ userId: uid }, { status: 201 });
  }
  catch (err: any) {
    console.error("🔥 create-user error:", err);
    // roll back the Auth user if created
    if (uid) {
      try { await svc.auth.admin.deleteUser(uid); }
      catch (_){/* ignore */}  
    }
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
