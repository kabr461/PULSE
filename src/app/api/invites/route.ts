// app/api/invites/route.ts
import { NextResponse } from "next/server";

/** base64url encode */
function b64url(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function POST(req: Request) {
  try {
    const { role, gymId, name } = await req.json();

    if (!role) {
      return NextResponse.json({ error: "role required" }, { status: 400 });
    }
    // only non-PTSI roles need a gymId
    if (!["admin", "ptsi-intern"].includes(role) && !gymId) {
      return NextResponse.json({ error: "gymId required for this role" }, { status: 400 });
    }

    // encode the invite payload into the URL token (no DB rows)
    const payload = { role, gymId: gymId ?? null, name: name ?? null, iat: Date.now() };
    const token = b64url(JSON.stringify(payload));

    const origin = new URL(req.url).origin;
    const link = `${origin}/invite/${token}`;

    return NextResponse.json({ link }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
