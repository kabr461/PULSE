// src/app/kpi-dashboard/phone-setting/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import Macro1Tabs from "../../components/Macro1Tabs";
import { useRole, AppRole } from "@/lib/role";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
// ❌ removed: import { useSearchParams } from "next/navigation";

/* ===== New theme (visual-only) ===== */
const PRIMARY = "#2F1B66"; // deep indigo (matches dashboard)
const ACCENT  = "#FF4F36"; // coral accent

/* Fixed source vocab (must match form options) */
const LEAD_SOURCES = [
  "Facebook Ads (Lead Form)",
  "Instagram DM to Call",
  "Google Ads / SEO",
  "FBM/Kijiji",
  "Referral (Phone-Based)",
  "Walk-Ins (Follow-Up)",
  "QR Code Scan",
  "Inbound Calls (Missed / Callback)",
  "TikTok / YouTube / Other Organic",
  "CRM Reactivation (Old Leads)",
];
const ALL_SETTERS = "All Setters";
const ALL_SOURCES = "All Sources";

/* Card titles (order matters) */
const TITLES = [
  "Total Dials",
  "Call Answered",
  "Booked",
  "Showed Up",
  "Wrong Number",
  "Already Bought",
  "Bad Fit",
  "Hang-up / Hostile",
  "CB Requested",
  "Sales / Closed",
];

type PhoneTotals = {
  total_dials: number;
  call_answered: number;
  booked: number;
  showed_up: number;
  wrong_number: number;
  already_bought: number;
  bad_fit: number;
  hangup_hostile: number;
  cb_requested: number;
  sales_closed: number;
};

type RawRow = {
  profile_id: string;
  payload: any;
  submission_date: string;
};

/* Build card rows (logic intact) */
function buildMetrics(
  role: AppRole,
  setterLabel: string,
  sourceLabel: string,
  totals: PhoneTotals
) {
  const showSetter = (["owner", "ptsi-intern", "admin"] as AppRole[]).includes(role as AppRole);

  return [
    ...(showSetter ? [{ title: "Setter Name", value: setterLabel || ALL_SETTERS }] : []),
    { title: "Source", value: sourceLabel || ALL_SOURCES },
    { title: "Total Dials", value: (totals.total_dials || 0).toLocaleString() },
    { title: "Call Answered", value: (totals.call_answered || 0).toLocaleString() },
    { title: "Booked", value: (totals.booked || 0).toLocaleString() },
    { title: "Showed Up", value: (totals.showed_up || 0).toLocaleString() },
    { title: "Wrong Number", value: String(totals.wrong_number || 0) },
    { title: "Already Bought", value: String(totals.already_bought || 0) },
    { title: "Bad Fit", value: String(totals.bad_fit || 0) },
    { title: "Hang-up / Hostile", value: String(totals.hangup_hostile || 0) },
    { title: "CB Requested", value: String(totals.cb_requested || 0) },
    { title: "Sales / Closed", value: String(totals.sales_closed || 0) },
  ];
}

export default function PhoneSettingPage() {
  const [note, setNote] = useState<string>("");

  const supabase = useSupabaseClient();
  const session = useSession();
  const { role } = useRole();
  // ❌ removed: const search = useSearchParams();

  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [totals, setTotals] = useState<PhoneTotals>({
    total_dials: 0,
    call_answered: 0,
    booked: 0,
    showed_up: 0,
    wrong_number: 0,
    already_bought: 0,
    bad_fit: 0,
    hangup_hostile: 0,
    cb_requested: 0,
    sales_closed: 0,
  });

  // URL filters (read once on mount)
  const [urlSetter, setUrlSetter] = useState<string>("");
  const [urlSource, setUrlSource] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setUrlSetter((sp.get("setter") || "").trim());
    setUrlSource((sp.get("source") || "").trim());
  }, []);

  const selectedSetter = urlSetter || ALL_SETTERS;
  const selectedSource = urlSource || ALL_SOURCES;

  // Resolve active gym (admin via ?gym_id, others via profile)
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

  // Month window (current month)
  function monthWindow() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  // Load PHONE_SUMMARY rows for gym + month
  useEffect(() => {
    (async () => {
      if (!activeGymId) {
        setRows([]);
        setTotals({
          total_dials: 0,
          call_answered: 0,
          booked: 0,
          showed_up: 0,
          wrong_number: 0,
          already_bought: 0,
          bad_fit: 0,
          hangup_hostile: 0,
          cb_requested: 0,
          sales_closed: 0,
        });
        return;
      }

      const { startISO, endISO } = monthWindow();
      const { data, error } = await supabase
        .from("raw_entries")
        .select("profile_id,payload,submission_date")
        .eq("gym_id", activeGymId)
        .eq("event_type", "PHONE_SUMMARY")
        .gte("submission_date", startISO)
        .lt("submission_date", endISO);

      if (error) {
        console.error("PHONE_SUMMARY query error", error);
        setRows([]);
        return;
      }
      setRows((data || []) as RawRow[]);
    })();
  }, [activeGymId, supabase]);

  // Recompute totals with role scoping + universal filters
  useEffect(() => {
    let filtered = rows;

    // Non-privileged users only see their own records
    const privileged = (["owner", "ptsi-intern", "admin"] as AppRole[]).includes(role as AppRole);
    if (!privileged && session?.user?.id) {
      filtered = filtered.filter(r => r.profile_id === session.user.id);
    }

    // Setter filter from URL (privileged only)
    if (privileged && selectedSetter !== ALL_SETTERS) {
      filtered = filtered.filter(
        r => (r.payload?.rep_name || "").toString().trim() === selectedSetter
      );
    }

    // Source filter from URL (everyone)
    if (selectedSource !== ALL_SOURCES) {
      filtered = filtered.filter(
        r => (r.payload?.phone_source || "") === selectedSource
      );
    }

    const sums: PhoneTotals = {
      total_dials: 0,
      call_answered: 0,
      booked: 0,
      showed_up: 0,
      wrong_number: 0,
      already_bought: 0,
      bad_fit: 0,
      hangup_hostile: 0,
      cb_requested: 0,
      sales_closed: 0,
    };

    filtered.forEach((r) => {
      const p = r.payload || {};
      sums.total_dials     += Number(p.total_dials || 0);
      sums.call_answered   += Number(p.call_answered || 0);
      sums.booked          += Number(p.booked || 0);
      sums.showed_up       += Number(p.showed_up || 0);
      sums.wrong_number    += Number(p.wrong_number || 0);
      sums.already_bought  += Number(p.already_bought || 0);
      sums.bad_fit         += Number(p.bad_fit || 0);
      sums.hangup_hostile  += Number(p.hangup_hostile || 0);
      sums.cb_requested    += Number(p.cb_requested || 0);
      sums.sales_closed    += Number(p.sales_closed || 0);
    });

    setTotals(sums);
  }, [rows, role, session?.user?.id, selectedSetter, selectedSource]);

  // Label for “Setter Name” card (privileged roles only)
  const setterLabel = useMemo(() => {
    const privileged = (["owner", "ptsi-intern", "admin"] as AppRole[]).includes(role as AppRole);
    if (!privileged) return "";
    return selectedSetter; // show exact selection or "All Setters"
  }, [role, selectedSetter]);

  const cardsData = useMemo(
    () => buildMetrics(role as AppRole, setterLabel, selectedSource, totals),
    [role, setterLabel, selectedSource, totals]
  );

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

          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h2
                className="font-teko text-3xl sm:text-4xl tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
              >
                KPI – Phone Setting
              </h2>
              <p className="text-sm text-gray-600">Month to date • Source & Setter via URL filters</p>
            </div>
          </header>

          {/* Metric cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {cardsData.map(({ title, value }) => (
              <Card
                key={title}
                title={title}
                value={value}
                note=""
                borderColor={PRIMARY}
                icon="📞"
                iconBg="#EDEBFA"
              />
            ))}
          </section>

          {/* Notes (styled block) */}
          <section className="rounded-2xl border border-gray-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_30px_rgba(2,12,27,0.06)]">
            <label htmlFor="phone-notes" className="block text-gray-900 text-sm font-bold mb-2 font-teko">
              Notes
            </label>
            <textarea
              id="phone-notes"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write phone-setting notes…"
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
