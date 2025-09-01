"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

/** Parse both #hash and ?query tokens (some apps rewrite the fragment) */
function readAuthParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};

  const hash = window.location.hash?.replace(/^#/, "");
  if (hash) {
    for (const part of hash.split("&")) {
      const [k, v] = part.split("=");
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  }

  const usp = new URLSearchParams(window.location.search);
  for (const [k, v] of usp.entries()) {
    if (!(k in out)) out[k] = v;
  }

  return out;
}

export default function ResetPasswordClient() {
  const sb = useSupabaseClient();
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Fallback resend flow when tokens/session are missing
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // If already signed in (e.g., recovery session), we're good.
        const { data: sessA } = await sb.auth.getSession();
        if (sessA.session) {
          if (!cancelled) setBooting(false);
          return;
        }

        // Try to hydrate from URL tokens
        const params = readAuthParams();
        const at = params["access_token"];
        const rt = params["refresh_token"];

        if (at && rt) {
          const { error } = await sb.auth.setSession({
            access_token: at,
            refresh_token: rt,
          });
          if (error && !cancelled) {
            setErr("This reset link is invalid or expired. Please request a new one.");
          }
        } else {
          if (!cancelled) {
            setErr("Password reset session not found. Please request a new link.");
          }
        }

        // Clean tokens from the URL
        if (typeof window !== "undefined" && (window.location.hash || window.location.search)) {
          const url = new URL(window.location.href);
          url.hash = "";
          url.search = "";
          window.history.replaceState(null, "", url.toString());
        }
      } catch {
        if (!cancelled) setErr("Couldn’t initialize reset session. Please request a new link.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sb]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (newPw !== confirmPw) {
      setErr("Passwords do not match.");
      return;
    }
    if (newPw.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }

    const { error } = await sb.auth.updateUser({ password: newPw });
    if (error) {
      setErr(error.message || "Could not update password. Request a new link and try again.");
      return;
    }

    setOk(true);
    setTimeout(() => router.push("/login"), 1500);
  };

  const resendLink = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL ?? "";

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/reset-password`,
    });
    if (error) {
      setErr(error.message || "Could not send reset email.");
    } else {
      setErr("If that email exists, a new reset link has been sent.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-10 rounded-2xl shadow max-w-sm w-full space-y-6">
        <h1 className="text-4xl font-teko text-[#3b176b]">Set&nbsp;New&nbsp;Password</h1>

        {booting ? (
          <p className="text-sm text-gray-600">Preparing your secure reset session…</p>
        ) : ok ? (
          <p className="text-green-700 bg-green-100 p-4 rounded-lg text-sm">
            Password updated — taking you to sign&nbsp;in…
          </p>
        ) : (
          <>
            {err?.toLowerCase().includes("session") || err?.toLowerCase().includes("invalid") ? (
              <form onSubmit={resendLink} className="space-y-4 font-lato">
                <p className="text-sm text-red-600">{err}</p>
                <label className="text-gray-600 block mb-1 font-semibold">Your Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-gray-600 w-full border rounded-lg px-3 py-2"
                  placeholder="you@example.com"
                />
                <button
                  type="submit"
                  className="w-full bg-[#3b176b] text-white py-2 rounded-lg hover:bg-[#32145c]"
                >
                  Send New Reset Link
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 font-lato">
                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">New Password</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="text-gray-600 w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">Repeat Password</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="text-gray-600 w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                {err && <p className="text-red-600 text-sm">{err}</p>}
                <button
                  type="submit"
                  className="w-full mt-1 bg-[#3b176b] text-white py-2 rounded-lg hover:bg-[#32145c]"
                >
                  Save Password
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
