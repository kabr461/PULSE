// src/app/kpi-dashboard/email/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import Macro1Tabs from "../../components/Macro1Tabs";
import { useRole, Show, AppRole } from "@/lib/role";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
// ❌ removed: import { useSearchParams } from "next/navigation";

/* ===== New theme (visual-only) ===== */
const PRIMARY = "#2F1B66"; // deep indigo (matches dashboard)
const ACCENT  = "#FF4F36"; // coral accent

// Roles allowed to view the Email Setting page
const emailRoles: AppRole[] = [
  "front-desk",
  "va",
  "owner",
  "coach",
  "ptsi-intern",
  "admin",
];

// Roles allowed to see financial metrics
const moneyRoles: AppRole[] = [
  "owner",
  "coach",
  "ptsi-intern",
  "admin",
];

/* 1️⃣  Dropdown values (kept for labels only; filtering comes from URL in future) */
const PLATFORMS = [
  "Mailchimp",
  "Klaviyo",
  "ActiveCampaign",
  "ConvertKit",
  "HubSpot",
];

const EMAIL_SOURCES = [
  "Broadcast Campaign",
  "Nurture Sequence",
  "Promo Blast",
  "On-Boarding Drip",
  "Reactivation Blast",
];

/* 2️⃣  Metric titles (unchanged) */
const METRIC_TITLES = [
  "Emails Sent",
  "Open Rate (%)",
  "Click Rate (%)",
  "Unsubscribe Rate (%)",
  "Bounce Rate (%)",
  "Spam Complaints",
  "Conversion Rate (%)",
  "Revenue Generated ($)",
  "New Subscribers",
  "Engagement Score (1-10)",
  "Average Clicks per Email",
  "Average Opens per Email",
  "Average Revenue per Email ($)",
  "ROI (%)",
];

type EmailRow = {
  profile_id: string;
  submission_date: string;
  payload: any;
};

// helper: current month window
function monthWindow() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export default function EmailSettingPage() {
  const { role } = useRole();
  const session = useSession();
  const supabase = useSupabaseClient();
  // ❌ removed: const search = useSearchParams();

  // notes (UI unchanged)
  const [note, setNote] = useState<string>("");

  // active gym (admin via ?gym_id, others via profile)
  const [activeGymId, setActiveGymId] = useState<string | null>(null);

  // raw rows for month
  const [rows, setRows] = useState<EmailRow[]>([]);

  // URL filters (for future universal filter page) — read once on mount
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setSelectedPlatform((sp.get("platform") || "").trim());
    setSelectedSource((sp.get("source") || "").trim());
  }, []);

  // formatters
  const fmtInt = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }), []);
  const fmtCurrency0 = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
    []
  );

  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return;
      if (role === "admin") {
        const id =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("gym_id")
            : null;
        setActiveGymId(id || null);
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", session.user.id)
          .single();
        setActiveGymId((data?.gym_id as string) || null);
      }
    })();
  }, [role, session?.user?.id, supabase]);

  // load raw EMAIL_SUMMARY rows for month+gym
  useEffect(() => {
    (async () => {
      if (!activeGymId) {
        setRows([]);
        return;
      }
      const { startISO, endISO } = monthWindow();
      const { data, error } = await supabase
        .from("raw_entries")
        .select("profile_id,submission_date,payload")
        .eq("gym_id", activeGymId)
        .eq("event_type", "EMAIL_SUMMARY")
        .gte("submission_date", startISO)
        .lt("submission_date", endISO);
      if (error) {
        console.error("EMAIL_SUMMARY query error", error);
        setRows([]);
        return;
      }
      setRows((data || []) as EmailRow[]);
    })();
  }, [activeGymId, supabase]);

  // aggregate metrics
  const cardsData = useMemo(() => {
    // default zeros if no gym selected
    if (!activeGymId) {
      const zeros = [
        { title: "Platform", value: selectedPlatform || "All Platforms" },
        { title: "Source",   value: selectedSource   || "All Sources"   },
      ] as { title: string; value: string }[];

      METRIC_TITLES.forEach((t, i) => {
        zeros.push({ title: t, value: i === 0 ? "0" : "0" });
      });
      return zeros;
    }

    // filter by URL (platform/source) on payload
    let filtered = rows;
    if (selectedPlatform) {
      filtered = filtered.filter(
        (r) => (r.payload?.email_platform || "").toString().trim() === selectedPlatform
      );
    }
    if (selectedSource) {
      filtered = filtered.filter(
        (r) => (r.payload?.email_source || "").toString().trim() === selectedSource
      );
    }

    // sums & weighted avgs by emails_sent
    let totalEmails = 0;

    let sumOpenWeighted = 0;
    let sumClickWeighted = 0;
    let sumUnsubWeighted = 0;
    let sumBounceWeighted = 0;
    let sumConvWeighted = 0;

    let spamComplaints = 0;
    let revenueGenerated = 0;
    let newSubscribers = 0;
    let engagementWeighted = 0;
    let avgClicksWeighted = 0;
    let avgOpensWeighted = 0;
    let avgRevPerEmailWeighted = 0;

    let roiWeighted = 0; // if payload.roi_percent exists

    filtered.forEach((r) => {
      const p = r.payload || {};

      const emailsSent = Number(p.emails_sent || 0);
      const openRate = Number(p.open_rate || 0);
      const clickRate = Number(p.click_rate || 0);
      const unsubRate = Number(p.unsubscribe_rate || 0);
      const bounceRate = Number(p.bounce_rate || 0);
      const convRate = Number(p.conversion_rate || 0);

      const spam = Number(p.spam_complaints || 0);
      const rev  = Number(p.revenue_generated || 0);
      const subs = Number(p.new_subscribers || 0);
      const engage = Number(p.engagement_score || 0);
      const avgClicks = Number(p.average_clicks_per_email || 0);
      const avgOpens  = Number(p.average_opens_per_email || 0);
      const avgRevPE  = Number(p.average_revenue_per_email || 0);
      const roiPct    = Number(p.roi_percent || 0); // optional

      totalEmails += emailsSent;

      sumOpenWeighted   += openRate   * emailsSent;
      sumClickWeighted  += clickRate  * emailsSent;
      sumUnsubWeighted  += unsubRate  * emailsSent;
      sumBounceWeighted += bounceRate * emailsSent;
      sumConvWeighted   += convRate   * emailsSent;

      spamComplaints   += spam;
      revenueGenerated += rev;
      newSubscribers   += subs;

      engagementWeighted        += engage   * (emailsSent || 1);
      avgClicksWeighted         += avgClicks * (emailsSent || 1);
      avgOpensWeighted          += avgOpens  * (emailsSent || 1);
      avgRevPerEmailWeighted    += (avgRevPE || (emailsSent ? rev / emailsSent : 0)) * (emailsSent || 1);

      roiWeighted += roiPct * (emailsSent || 1);
    });

    const denom = totalEmails || 1;

    const openRatePct   = Math.round(sumOpenWeighted   / denom) || 0;
    const clickRatePct  = Math.round(sumClickWeighted  / denom) || 0;
    const unsubRatePct  = Math.round(sumUnsubWeighted  / denom) || 0;
    const bounceRatePct = Math.round(sumBounceWeighted / denom) || 0;
    const convRatePct   = Math.round(sumConvWeighted   / denom) || 0;

    const engagementScore10 = Math.round(engagementWeighted / (totalEmails || filtered.length || 1)) || 0;
    const avgClicksPerEmail = Math.round(avgClicksWeighted / (totalEmails || filtered.length || 1)) || 0;
    const avgOpensPerEmail  = Math.round(avgOpensWeighted  / (totalEmails || filtered.length || 1)) || 0;
    const avgRevenuePerEmail = Math.round(avgRevPerEmailWeighted / (totalEmails || filtered.length || 1)) || 0;

    // ROI: prefer payload.roi_percent (weighted). If not present anywhere, show 0.
    const roiPercent =
      filtered.some(r => Number((r.payload || {}).roi_percent) > 0)
        ? Math.round(roiWeighted / (totalEmails || filtered.length || 1))
        : 0;

    const cards: { title: string; value: string }[] = [
      { title: "Platform", value: selectedPlatform || "All Platforms" },
      { title: "Source",   value: selectedSource   || "All Sources"   },
      { title: "Emails Sent", value: fmtInt.format(totalEmails) },
      { title: "Open Rate (%)", value: `${openRatePct}` },
      { title: "Click Rate (%)", value: `${clickRatePct}` },
      { title: "Unsubscribe Rate (%)", value: `${unsubRatePct}` },
      { title: "Bounce Rate (%)", value: `${bounceRatePct}` },
      { title: "Spam Complaints", value: fmtInt.format(spamComplaints) },
      { title: "Conversion Rate (%)", value: `${convRatePct}` },
      { title: "Revenue Generated ($)", value: fmtCurrency0.format(Math.round(revenueGenerated)) },
      { title: "New Subscribers", value: fmtInt.format(newSubscribers) },
      { title: "Engagement Score (1-10)", value: `${engagementScore10}` },
      { title: "Average Clicks per Email", value: fmtInt.format(avgClicksPerEmail) },
      { title: "Average Opens per Email", value: fmtInt.format(avgOpensPerEmail) },
      { title: "Average Revenue per Email ($)", value: fmtCurrency0.format(avgRevenuePerEmail) },
      { title: "ROI (%)", value: `${roiPercent}` },
    ];

    // keep ordering aligned with UI (title list earlier)
    const orderMap = new Map(cards.map((c, i) => [c.title, i]));
    const ordered: { title: string; value: string }[] = [
      { title: "Platform", value: cards[0].value },
      { title: "Source",   value: cards[1].value },
      ...METRIC_TITLES.map((t) => {
        const idx = orderMap.get(t);
        return idx != null ? { title: t, value: cards[idx].value } : { title: t, value: "0" };
      }),
    ];

    return ordered;
  }, [rows, activeGymId, selectedPlatform, selectedSource, fmtInt, fmtCurrency0]);

  const handleSave = () => {
    alert("Notes saved!");
    setNote("");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-white relative">
      {/* Subtle background glows (purely decorative) */}
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
      <main className="flex-1 ml-64 sm:ml-72 p-6 sm:p-8 lg:p-10 overflow-auto font-lato">
        <div className="mx-auto max-w-7xl space-y-8">
          <Macro1Tabs />

          {/* Only roles in emailRoles see this section */}
          <Show allow={emailRoles}>
            {/* Header */}
            <header className="flex items-center justify-between">
              <div>
                <h2
                  className="font-teko text-3xl sm:text-4xl tracking-tight bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
                >
                  KPI – Email Setting
                </h2>
                <p className="text-sm text-gray-600">Month to date • Platform & Source via URL filters</p>
              </div>
            </header>

            {/* Metric cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {cardsData.map(({ title, value }) => {
                // hide financial metrics for non-money roles
                if (
                  ["Revenue Generated ($)", "Average Revenue per Email ($)", "ROI (%)"].includes(title) &&
                  !moneyRoles.includes(role as AppRole)
                ) {
                  return null;
                }
                return (
                  <Card
                    key={title}
                    title={title}
                    value={value}
                    note=""
                    borderColor={PRIMARY}
                    icon="✉️"
                    iconBg="#EDEBFA"
                  />
                );
              })}
            </section>

            {/* Notes (styled block) */}
            <section className="rounded-2xl border border-gray-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_30px_rgba(2,12,27,0.06)]">
              <label
                htmlFor="email-notes"
                className="block text-gray-900 text-sm font-bold mb-2 font-teko"
              >
                Notes
              </label>
              <textarea
                id="email-notes"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write email-specific notes…"
                className="w-full rounded-xl border border-gray-200 bg-white/80 p-3 sm:p-4 text-gray-900 placeholder:text-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--accent,_#FF4F36)]"
                rows={4}
              />
              <div className="mt-3">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center rounded-xl px-4 py-2 font-teko text-white shadow-sm transition hover:brightness-110"
                  style={{ backgroundImage: `linear-gradient(135deg, ${ACCENT}, ${PRIMARY})` }}
                >
                  Save Notes
                </button>
              </div>
            </section>
          </Show>
        </div>
      </main>
    </div>
  );
}

/* ===== Card (visual refresh only; props/usage unchanged) ===== */
function Card({
  title,
  value,
  note,
  borderColor,
  icon,
  iconBg,
}: {
  title: string;
  value: string;
  note: string;
  borderColor: string;
  icon: string;
  iconBg: string;
}) {
  return (
    <div className="relative group">
      {/* Glow on hover */}
      <div
        aria-hidden
        className="absolute -inset-1 rounded-2xl opacity-0 blur-lg transition duration-300 group-hover:opacity-100"
        style={{
          backgroundImage: `linear-gradient(135deg, ${borderColor}22, ${ACCENT}22)`,
        }}
      />
      {/* Card */}
      <div className="relative flex items-center gap-4 rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-[0_8px_30px_rgba(2,12,27,0.06)] backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5">
        {/* left accent line */}
        <span className="mr-1 h-14 w-[3px] rounded-full" style={{ background: borderColor }} aria-hidden />
        {/* icon */}
        <div className="grid h-12 w-12 place-items-center rounded-full" style={{ backgroundColor: iconBg }}>
          <span className="text-2xl">{icon}</span>
        </div>
        {/* text */}
        <div className="min-w-0">
          <h3 className="text-[13px] md:text-[14px] font-medium text-gray-700">{title}</h3>
          <p className="truncate text-[28px] md:text-[32px] font-bold leading-tight text-gray-900">{value}</p>
          {note && <p className="text-xs md:text-sm text-gray-500">{note}</p>}
        </div>
      </div>
    </div>
  );
}
