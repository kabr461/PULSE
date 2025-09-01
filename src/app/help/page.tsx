// src/app/help/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

const BRAND_PRIMARY = "#2F1B66"; // deep purple
const BRAND_ACCENT  = "#FF4F36"; // orange

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-white font-lato">
      {/* Subtle background glow (matches dashboard/sidebar) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            `radial-gradient(900px 400px at 80% -200px, ${BRAND_PRIMARY}14, transparent 60%),
             radial-gradient(700px 320px at -110px 78%, ${BRAND_ACCENT}12, transparent 65%)`,
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-5 py-10">
        <div className="relative w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_8px_30px_rgba(2,12,27,0.06)] sm:p-8">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="group absolute left-2 top-2 inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-200 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
            title="Go back"
          >
            <span
              className="grid h-5 w-5 place-items-center rounded-md ring-1 ring-gray-200 transition group-hover:scale-110"
              style={{ color: BRAND_PRIMARY }}
            >
              ←
            </span>
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Header */}
          <div className="mt-6 text-center sm:mt-2 sm:text-left">
            <h1
              className=" mt-4 font-teko text-4xl leading-none tracking-tight sm:text-5xl"
              style={{ color: BRAND_PRIMARY }}
            >
              Help &amp; Support
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              We’re here to help you get the most from Pulse KPI™ OS.
            </p>
          </div>

          {/* Intro */}
          <div className="mt-6 space-y-3 text-gray-800">
            <p>
              Welcome to the&nbsp;<strong>Pulse KPI™ OS Help Center</strong>!<br />
              Whether you&apos;re a gym owner, trainer, VA, or admin — we’ve got you covered.
            </p>
            <p>
              Below you’ll find quick contact info and a summary of what Pulse PTSI OS helps you manage.
            </p>
          </div>

          {/* Contact cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2
                className="mb-2 text-base font-semibold"
                style={{ color: BRAND_PRIMARY }}
              >
                📬 General Support &amp; Inquiries
              </h2>
              <div className="space-y-2 text-sm">
                <a
                  href="mailto:ops@ptsi.ca"
                  className="inline-flex items-center justify-center rounded-lg border px-3 py-2 transition hover:shadow"
                  style={{ borderColor: BRAND_ACCENT, color: BRAND_ACCENT }}
                >
                  ops@ptsi.ca
                </a>
                <br />
                <a
                  href="mailto:ptsystemsinc@gmail.com"
                  className="inline-flex items-center justify-center rounded-lg border px-3 py-2 transition hover:shadow"
                  style={{ borderColor: BRAND_ACCENT, color: BRAND_ACCENT }}
                >
                  ptsystemsinc@gmail.com
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2
                className="mb-2 text-base font-semibold"
                style={{ color: BRAND_PRIMARY }}
              >
                🛠 Feature Requests / Bug Reports / Docs
              </h2>
              <div className="space-y-2 text-sm">
                <a
                  href="mailto:ops@ptsi.ca"
                  className="inline-flex items-center justify-center rounded-lg border px-3 py-2 transition hover:shadow"
                  style={{ borderColor: BRAND_ACCENT, color: BRAND_ACCENT }}
                >
                  ops@ptsi.ca
                </a>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <h2
              className="text-base font-semibold"
              style={{ color: BRAND_PRIMARY }}
            >
              📌 What Pulse PTSI OS Can Do
            </h2>
            <p className="mt-2 text-gray-700">
              Pulse is your all-in-one gym management and performance tracking system. We help you:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700">
              <li>Track workout and nutrition compliance for every client</li>
              <li>Analyze referrals, retention, and LTV metrics</li>
              <li>Monitor social content and performance dashboards</li>
              <li>Run SOPs, QA logs, and manage staff assignments seamlessly</li>
            </ul>
          </div>

          {/* Outro */}
          <div className="mt-6 text-center sm:text-left">
            <p className="text-gray-700">
              Need help navigating? Reach out anytime.
            </p>
          </div>

          {/* Bottom accent line */}
          <div
            className="mt-1 h-1 w-24 rounded-full"
            style={{ backgroundColor: BRAND_ACCENT }}
          />
        </div>
      </div>
    </div>
  );
}
