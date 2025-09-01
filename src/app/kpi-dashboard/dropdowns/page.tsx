// src/app/kpi-performance/dropdowns/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Macro1Tabs from "../../components/Macro1Tabs";
// ⬇️ removed useSearchParams import
// import { useSearchParams } from "next/navigation";

/* ───── Brand tokens (visual only) ─────────────────────────── */
const PRIMARY = "#2F1B66"; // deep indigo to match dashboard
const ACCENT  = "#FF4F36"; // coral accent

/* ───── Sub-nav links ──────────────────────────────────────── */
const kpiNav = [
  { label: "Overview",      href: "/kpi-dashboard" },
  { label: "Dropdowns",     href: "/kpi-dashboard/dropdowns" }, // keeps your original path label
  { label: "Phone Setting", href: "/kpi-dashboard/phone-setting" },
  { label: "DM Setting",    href: "/kpi-dashboard/dm-message-setting" },
  { label: "Email",         href: "/kpi-dashboard/email" },
  { label: "Consults",      href: "/kpi-dashboard/consult-outcomes" },
];

/* ───── Dropdown option lists ─────────────────────────────── */
const DATES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = ["2024","2025","2026","2027","2028","2029","2030","2031","2032","2033","2034","2035","2036","2037","2038","2039","2040"];

const PHONES_SOURCE = [
  "Facebook Ads (Lead Form)",
  "Instagram DM to Call",
  "Google Ads / SEO",
  "FBM/Kijiji",
  "Referral (Phone-Based)",
  "Walk-Ins (Follow-Up)",
  "QR Code Scan",
  "Inbound Calls (Missed / Callback)",
  "TikTok / YouTube / Other Organic",
  "CRM Reactivation (Old Leads)"
];

const SETTERS = Array.from({ length: 10 }, (_, i) => `Setter #${i + 1}`);

const EMAILS_PLATFORM = ["ConvertKit","Mailchimp","GoHighLevel (PowerPipeline™?)","Klaviyo","ActiveCampaign"];
const EMAILS_SOURCES  = ["Nurture Sequence","Broadcast Campaign","Reactivation Campaign","Lead Magnet Delivery"];

const OBJECTIONS = [
  "Too Expensive / No Budget",
  "Need to Think About It",
  "Need to Talk to Spouse",
  "Not the Right Time",
  "Lack of Self-Belief",
  "Tried Everything Before",
  "Already Working with Someone",
  "Wants to Do It On Their Own",
  "Schedule / Availability Conflict",
  "Not Interested / Just Looking",
  "Not Listed / Other"
];

const CONSULT_SOURCE_1 = [
  "Paid Ads",
  "Organic Digital",
  "Email / Text / QR",
  "In-Person / Offline",
  "Booking & Lead Forms"
];

const CONSULT_SUB_CATEGORY = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "Retargeting Ads",
  "Google My Business",
  "SEO",
  "Instagram",
  "Facebook",
  "YouTube",
  "LinkedIn",
  "Podcast Features / Guest Appearances",
  "Email Campaigns",
  "SMS/Text Campaigns",
  "QR Code",
  "Walk-ins",
  "Referral from Member or Staff",
  "Event Booth / Table",
  "Partner Business Referral",
  "Community Posters / Lead Boxes",
  "Website Booking Form / Opt-in Page",
  "GHL Funnel Submission",
  "Free Trial / 7-Day Pass Signup",
  "Facebook Lead Form / Messenger",
  "Calendly / GHL Booking Link",
  "ClassPass / Groupon"
];

/* ───── Label + Eye-tooltip wrapper (styled) ──────────────── */
function LabelWithTooltip({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="font-teko text-lg flex items-center text-gray-800">
        <span>{label}</span>
        <span className="relative ml-1 inline-block group">
          <Eye className="w-4 h-4 text-gray-400 cursor-help" />
          <span
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 rounded-md bg-gray-900/90 px-2 py-1 text-[11px] text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
          >
            {tooltip}
          </span>
        </span>
      </label>
      {children}
    </div>
  );
}

/* ───── Generic dropdown component (visual refresh only) ──── */
type DropProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
};
function LabeledSelect({ label, value, onChange, options }: DropProps) {
  return (
    <LabelWithTooltip label={label} tooltip={`Select ${label}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2.5 text-[15px] text-gray-900 shadow-inner backdrop-blur-sm outline-none focus:ring-2 focus:ring-[color:var(--accent,_#FF4F36)]"
      >
        <option value="">—</option>
        {options.map(o => (
          <option key={o} value={o} className="text-black">
            {o}
          </option>
        ))}
      </select>
    </LabelWithTooltip>
  );
}

/* ───── helpers for query building (unchanged) ────────────── */
function tokenForConsultSource(v: string): string {
  const s = v.toLowerCase();
  if (s.includes("paid")) return "paid";
  if (s.includes("organic")) return "organic";
  return ""; // others map to overview (no filter)
}
function tokenForSubCategory(v: string): string {
  const s = v.toLowerCase();
  if (s.includes("meta")) return "meta";
  if (s.includes("google")) return "google";
  if (s.includes("tiktok")) return "tiktok";
  return ""; // unsupported subs show overview
}

/* ───── KPI Performance – Dropdowns Page ───────────────────── */
export default function KpiPerformanceDropdownsPage() {
  // ⬇️ replace useSearchParams; read once on mount from window.location
  const [currentGymId, setCurrentGymId] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setCurrentGymId(sp.get("gym_id") || "");
    }
  }, []);

  const [date, setDate]               = useState("");
  const [year, setYear]               = useState("");
  const [phoneSource, setPhoneSource] = useState("");
  const [setter, setSetter]           = useState("");
  const [emailsPlatform, setEmailsPlatform] = useState("");
  const [emailsSource, setEmailsSource]     = useState("");
  const [objection, setObjection]     = useState("");
  const [consult1, setConsult1]       = useState("");
  const [subCategory, setSubCategory] = useState("");

  // Build a route-specific query string so each page receives the fields it expects.
  const buildHref = useMemo(() => {
    return (baseHref: string) => {
      const params = new URLSearchParams();

      // always preserve gym_id if present (admin context)
      if (currentGymId) params.set("gym_id", currentGymId);

      // (optional) forward period selections for future use
      if (date) params.set("month", date);
      if (year) params.set("year", year);

      // route-specific params
      if (baseHref.endsWith("/phone-setting")) {
        if (setter) params.set("setter", setter);
        if (phoneSource) params.set("source", phoneSource);
      } else if (baseHref.endsWith("/dm-message-setting")) {
        if (setter) params.set("setter", setter);
      } else if (baseHref.endsWith("/email")) {
        if (emailsPlatform) params.set("platform", emailsPlatform);
        if (emailsSource)  params.set("source", emailsSource);
      } else if (baseHref.endsWith("/consult-outcomes")) {
        if (objection) params.set("objection", objection);
        const cs = tokenForConsultSource(consult1);
        if (cs) params.set("consult_source", cs);
        const sub = tokenForSubCategory(subCategory);
        if (sub) params.set("sub_category", sub);
      } else {
        // overview / dropdowns → just pass gym_id (and period for future)
      }

      const qs = params.toString();
      return qs ? `${baseHref}?${qs}` : baseHref;
    };
  }, [currentGymId, date, year, phoneSource, setter, emailsPlatform, emailsSource, objection, consult1, subCategory]);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-white relative font-lato">
      {/* Decorative background glows (theme only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            `radial-gradient(900px 400px at 80% -200px, ${PRIMARY}14, transparent 60%),
             radial-gradient(700px 320px at -110px 78%, ${ACCENT}12, transparent 65%)`,
        }}
      />

      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <main className="flex-1 ml-64 sm:ml-72 p-6 sm:p-8 lg:p-10 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-8">
          <Macro1Tabs />

          {/* Header (visual only) */}
          <header className="flex items-center justify-between">
            <div>
              <h2
                className="font-teko text-3xl sm:text-4xl tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
              >
                KPI – Performance Filters
              </h2>
              <p className="text-sm text-gray-600">Choose filters below. Links on the right open pages with your query params.</p>
            </div>

            {/* Quick links (design only; same destinations) */}
            <nav className="hidden md:flex flex-wrap gap-2">
              {kpiNav.map((n) => (
                <Link
                  key={n.href}
                  href={buildHref(n.href)}
                  className="rounded-xl border border-gray-200 bg-white/80 px-3 py-1.5 text-sm text-gray-700 shadow-sm transition hover:brightness-105"
                  style={{ outlineColor: PRIMARY as any }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </header>

          {/* Filters Card */}
          <section className="rounded-2xl border border-gray-200 bg-white/80 p-5 sm:p-6 shadow-[0_8px_30px_rgba(2,12,27,0.06)] backdrop-blur-md space-y-8">
            <h3 className="font-teko text-2xl" style={{ color: PRIMARY }}>
              Select Filters
            </h3>

            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 sm:gap-6">
              <LabeledSelect label="Dates"           value={date}           onChange={setDate}           options={DATES} />
              <LabeledSelect label="Years"           value={year}           onChange={setYear}           options={YEARS} />
              <LabeledSelect label="Phones Source"   value={phoneSource}    onChange={setPhoneSource}    options={PHONES_SOURCE} />
              <LabeledSelect label="Setter"          value={setter}         onChange={setSetter}         options={SETTERS} />
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 sm:gap-6">
              <LabeledSelect label="Emails Platform" value={emailsPlatform} onChange={setEmailsPlatform} options={EMAILS_PLATFORM} />
              <LabeledSelect label="Emails Sources"  value={emailsSource}   onChange={setEmailsSource}   options={EMAILS_SOURCES} />
              <LabeledSelect label="Objection Faced" value={objection}      onChange={setObjection}      options={OBJECTIONS} />
              <LabeledSelect label="Consult Lead Source" value={consult1}   onChange={setConsult1}      options={CONSULT_SOURCE_1} />
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 sm:gap-6">
              <LabeledSelect label="Consult Sub-Category" value={subCategory} onChange={setSubCategory} options={CONSULT_SUB_CATEGORY} />
            </div>

            {/* Destination chips (same buildHref logic; purely visual) */}
            <div className="pt-2 flex flex-wrap gap-2">
              {kpiNav.map((n) => (
                <Link
                  key={`chip-${n.href}`}
                  href={buildHref(n.href)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: ACCENT }} />
                  {n.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
