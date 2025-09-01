"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

const PRIMARY = "#2F1B66";
const ACCENT  = "#FF4F36";

/** Try multiple logo filenames gracefully */
function BrandLogo({ className = "h-16 w-auto" }: { className?: string }) {
  const CANDIDATES = [
    "/assets/logo.png",
    "/assets/logo-removebg-preview.png",
    "/assets/logo.webp",
    "/assets/logo.svg",
    "/assets/Logo.png",
  ];
  const [idx, setIdx] = useState(0);
  return (
    <Image
      src={CANDIDATES[idx] ?? "/assets/profile.png"}
      alt="Pulse"
      width={160}
      height={64}
      priority
      className={className}
      onError={() => setIdx((i) => (i + 1 < CANDIDATES.length ? i + 1 : i))}
    />
  );
}

/** Base64url JSON → object. If it isn't JSON, return empty. */
function decodeToken(token: string): { role?: string; gymId?: string; name?: string } {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    // In client components, window is defined
    const json = decodeURIComponent(escape(window.atob(b64)));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/** Normalize role so it matches your BADGE_PREFIX keys on the server */
function normalizeRole(raw?: string): string {
  if (!raw) return "client";
  let r = raw.trim().toLowerCase();
  r = r.replace(/\s+/g, "-").replace(/_/g, "-");
  if (r === "front_desk") r = "front-desk";
  if (r === "va-training" || r === "va_training") r = "va-training";
  return r;
}

/** Pretty labels for the heading */
function roleLabel(slug: string): string {
  const map: Record<string, string> = {
    owner:        "Gym Owner / Manager",
    trainer:      "Trainer / Coach",
    "va-training":"VA – Training",
    va:           "VA – Active",
    coach:        "CoachStack Coach",
    client:       "Client",
    "ptsi-intern":"PTSI Intern",
    admin:        "PTSI Admin",
    closer:       "Closer",
    "front-desk": "Front Desk / Admin",
  };
  return map[slug] ?? slug;
}

/** Which roles do NOT need a gymId */
function gymNotRequired(slug: string) {
  return slug === "admin" || slug === "ptsi-intern";
}

export default function InviteAcceptPage() {
  // ✅ useParams instead of receiving { params } props
  const { token } = useParams<{ token: string }>();
  const decoded = useMemo(() => decodeToken(token), [token]);

  const roleSlug  = useMemo(() => normalizeRole(decoded.role || "client"), [decoded.role]);
  const needGym   = useMemo(() => !gymNotRequired(roleSlug), [roleSlug]);

  // prefill name if present in token
  const [display_name, setDisplayName] = useState(decoded.name ?? "");
  const [email,        setEmail]       = useState("");
  const [password,     setPassword]    = useState("");

  // if token didn’t include a gymId but this role needs one, allow manual paste
  const [gymId, setGymId] = useState(decoded.gymId ?? "");

  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [done,    setDone]    = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (needGym && !gymId.trim()) {
      setErr("This invite needs a gym ID, but the link didn’t include one.");
      return;
    }

    setLoading(true);
    try {
      // IMPORTANT: Post exactly what your existing /api/admin/create-user expects
      const form = new FormData();
      form.append("display_name", display_name);
      form.append("email",        email);
      form.append("password",     password);
      form.append("role",         roleSlug);
      if (needGym) form.append("gymId", gymId.trim());

      const res  = await fetch("/api/admin/create-user", { method: "POST", body: form });
      let json: any = {};
      try { json = await res.json(); } catch { /* ignore non-JSON */ }
      if (!res.ok) throw new Error(json?.error || "Failed to create user");

      setDone(true);
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="relative min-h-screen flex items-center justify-center font-lato bg-gray-50 px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              `radial-gradient(900px 400px at 80% -200px, ${PRIMARY}14, transparent 60%),
               radial-gradient(700px 320px at -110px 78%, ${ACCENT}12, transparent 65%)`,
          }}
        />
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_20px_60px_rgba(2,12,27,0.10)] border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <BrandLogo />
            <h1 className="font-teko text-4xl" style={{ color: PRIMARY }}>
              Pulse KPI™
            </h1>
          </div>
          <h2 className="font-teko text-3xl mb-2" style={{ color: PRIMARY }}>
            All set!
          </h2>
          <p className="text-gray-600">Your account is ready. You can now sign in.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-white font-semibold transition hover:brightness-110 cursor-pointer"
            style={{ backgroundColor: PRIMARY }}
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center font-lato bg-gray-50 px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            `radial-gradient(900px 400px at 80% -200px, ${PRIMARY}14, transparent 60%),
             radial-gradient(700px 320px at -110px 78%, ${ACCENT}12, transparent 65%)`,
        }}
      />

      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_20px_60px_rgba(2,12,27,0.10)] border border-gray-100 space-y-5"
      >
        <div className="flex items-center gap-3">
          <BrandLogo />
          <div>
            <h1 className="font-teko text-4xl leading-none" style={{ color: PRIMARY }}>
              Pulse KPI™
            </h1>
            <p className="text-gray-500 text-sm leading-tight">
              You’re invited as <b>{roleLabel(roleSlug)}</b>
            </p>
          </div>
        </div>

        <div className="pt-2 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              placeholder="Your full name"
              value={display_name}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[rgba(47,27,102,0.30)] focus:border-[rgba(47,27,102,0.30)]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[rgba(47,27,102,0.30)] focus:border-[rgba(47,27,102,0.30)]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[rgba(47,27,102,0.30)] focus:border-[rgba(47,27,102,0.30)]"
            />
          </div>

          {/* Only show Gym ID field if this role requires it and the token didn't have one */}
          {needGym && !decoded.gymId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Gym ID</label>
              <input
                type="text"
                placeholder="Paste gym UUID"
                value={gymId}
                onChange={(e) => setGymId(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[rgba(47,27,102,0.30)] focus:border-[rgba(47,27,102,0.30)]"
              />
            </div>
          )}

          {err && (
            <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-white font-semibold transition hover:brightness-110 disabled:opacity-60 cursor-pointer"
            style={{ backgroundColor: PRIMARY }}
          >
            {loading && (
              <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" className="opacity-25" />
                <path d="M21 12a9 9 0 0 1-9 9" />
              </svg>
            )}
            {loading ? "Creating…" : "Create my account"}
          </button>

          {/* <p className="text-[11px] text-gray-500 select-all">Token: {token}</p> */}

          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:underline cursor-pointer" style={{ color: ACCENT }}>
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
