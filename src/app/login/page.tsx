// app/login/page.tsx
"use client";

import React, { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const BRAND_PRIMARY = "#2F1B66"; // deep purple
const BRAND_ACCENT  = "#FF4F36"; // vibrant orange

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // ✅ If already signed in (persisted session), skip login UI
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        router.replace("/dashboard");
      }
    })();
  }, [supabase, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg("Email or password is incorrect.");
        setIsLoading(false);
        return;
      }
      const userId =
        data.user?.id ||
        data.session?.user?.id ||
        (await supabase.auth.getUser()).data.user?.id;

      if (userId) {
        await supabase
          .from("profiles")
          .update({ last_active: new Date().toISOString() })
          .eq("id", userId);
      }
      router.push("/dashboard");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Subtle background glows */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background: `radial-gradient(900px 400px at 80% -200px, ${BRAND_PRIMARY}20, transparent 60%),
                       radial-gradient(700px 320px at -110px 78%, ${BRAND_ACCENT}18, transparent 65%)`,
        }}
      />

      <div className="relative z-10 grid min-h-screen place-items-center px-4 font-lato">
        <div
          className="
            w-full max-w-lg
            rounded-2xl border border-gray-200 bg-white/90
            p-10
            shadow-[0_8px_30px_rgba(2,12,27,0.06)] backdrop-blur
            text-[16px] md:text-[17px]
            leading-relaxed
            min-h-[680px]
          "
        >
          {/* Brand header */}
          <div className="flex flex-col items-center">
            <Image
              src="/assets/logo-removebg-preview.png"
              alt="Pulse PTSI Logo"
              width={88}
              height={88}
              className="mb-3"
              priority
            />
            <h1
              className="mb-1 font-teko font-bold tracking-tight text-[40px] md:text-[44px]"
              style={{ color: BRAND_PRIMARY }}
            >
              Pulse KPI™
            </h1>
            <p className="text-[1.05rem] text-gray-600">
              Log in to your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1 block text-[1rem] font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  w-full rounded-xl border border-gray-300
                  px-4 py-3
                  text-[1rem] md:text-[1.05rem] text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2F1B66]
                  transition
                "
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-[1rem] font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="
                    w-full rounded-xl border border-gray-300
                    px-4 py-3 pr-12
                    text-[1rem] md:text-[1.05rem] text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2F1B66]
                    transition
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute inset-y-0 right-3 my-auto h-8 rounded-md px-2 text-[0.9rem] text-gray-500 hover:text-gray-700"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p role="alert" className="text-[0.96rem] text-red-600" aria-live="polite">
                {errorMsg}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span />
              <Link
                href="/forgot-password"
                className="font-medium hover:underline"
                style={{ color: BRAND_ACCENT, fontSize: "1rem" }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="
                group relative w-full select-none rounded-xl px-5 py-3
                text-[1rem] md:text-[1.05rem] text-white transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              "
              style={{
                backgroundColor: BRAND_PRIMARY,
                boxShadow: "0 9px 22px rgba(47,27,102,0.25)",
              }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  "Log In"
                )}
              </span>
            </button>
          </form>

          <div className="mt-7 text-center text-[0.98rem] text-gray-600">
            Don’t have an account?{" "}
            {/* Gmail compose with prefilled to/subject/body */}
            <a
              href={
                "https://mail.google.com/mail/?view=cm&fs=1" +
                "&to=ptsystemsinc@gmail.com" +
                "&su=" + encodeURIComponent("Pulse KPI Access Request") +
                "&body=" + encodeURIComponent(
                  "Hi PTSI Team,\n\nI'd like access to Pulse KPI.\n\nName: \nGym: \nEmail to use: \n\nThanks!"
                )
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
              style={{ color: BRAND_ACCENT }}
            >
              Request Access
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
