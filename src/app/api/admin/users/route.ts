// src/app/api/admin/update-user/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✨ Initialize the *Service* client – this one can call auth.admin.*
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // ← must be your service role key
);

export async function POST(req: Request) {
  const { userId, display_name, email, role } = await req.json();

  // 1) Update the user in the Auth schema
  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: { display_name, role },
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // 2) Update your profiles table
  const { error: dbError } = await supabaseAdmin
    .from("profiles")
    .update({ display_name, email, role })
    .eq("id", userId);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
