/* ------------------------------------------------------------------
   Owners / Admins / Interns / CoachStack reset page
   ------------------------------------------------------------------ */
"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const ALLOWED_ROLES = ["owner", "admin", "ptsi-intern", "coach"]; // ↖ tweak here

export default function ForgotPasswordPage() {
  const sb = useSupabaseClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  /* ───────── submit ───────── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);
    setSending(true);

    /* 1️⃣ find the role for that e-mail */
    const { data, error } = await sb
      .from("profiles")
      .select("role")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error || !data || !ALLOWED_ROLES.includes(data.role)) {
      setErr(
        "Email not recognised for an owner / admin account. " +
          "Please contact your gym owner if you need help."
      );
      setSending(false);
      return;
    }

    /* 2️⃣ fire Supabase reset e-mail  */
    const { error: resetErr } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`, // ↙ goes to page #2
    });

    setSending(false);

    if (resetErr) {
      setErr(resetErr.message);
    } else {
      setOkMsg("Success! If that e-mail exists, a reset link is on its way.");
    }
  };

  /* ───────── UI (design-only changes) ───────── */
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 font-lato">
      {/* Subtle brand glows (GPU-friendly) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            `radial-gradient(900px 400px at 80% -200px, #3b176b22, transparent 60%),
             radial-gradient(720px 320px at -110px 78%, #f14e2320, transparent 65%)`,
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white/95 p-8 shadow-[0_8px_30px_rgba(2,12,27,0.06)] backdrop-blur sm:p-10 md:max-w-xl md:p-12">
        <h1 className="mb-4 font-teko text-4xl text-[#3b176b] sm:text-5xl">
          Forgot&nbsp;Password?
        </h1>
        <p className="mb-6 text-base text-gray-600 sm:text-lg">
          Owners&nbsp;/ Admins only – enter the e-mail to reset.
        </p>

        {/* ❶ success banner  */}
        {okMsg && (
          <p
            role="status"
            aria-live="polite"
            className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {okMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 sm:text-base">
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full rounded-xl border border-gray-300
                px-4 py-3 text-[15px] text-gray-800 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#3b176b]
                transition
                sm:text-base
              "
            />
          </div>

          {err && (
            <p role="alert" className="text-sm text-red-600">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="
              w-full select-none rounded-xl bg-[#3b176b] px-4 py-3
              text-[15px] text-white transition hover:bg-[#32145c]
              disabled:opacity-60 sm:text-base
              shadow-[0_10px_24px_rgba(59,23,107,0.25)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            "
          >
            {sending ? "Sending…" : "Sent the Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-[15px] sm:text-base">
          <Link
            href="/login"
            className="group relative font-medium text-[#f14e23] hover:underline"
          >
            Back to Sign&nbsp;In
            <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-[#f14e23] transition-all duration-300 group-hover:w-full" />
          </Link>
        </p>
      </div>
    </div>
  );
}
