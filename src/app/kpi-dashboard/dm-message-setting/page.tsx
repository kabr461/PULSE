// src/app/kpi-dashboard/dm-message-setting/page.tsx
"use client";

import Sidebar from "../../components/Sidebar";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Macro1Tabs from "../../components/Macro1Tabs";
import { useRole, AppRole } from "@/lib/role";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import { useSearchParams } from "next/navigation";

/* ========= Theme (visual only) ========= */
const PRIMARY = "#2F1B66"; // deep indigo
const ACCENT  = "#FF4F36"; // coral

/* DM sources (must match the form’s options) */
const DM_SOURCES = [
  "Instagram Inbound",
  "Facebook Inbound",
  "TikTok / YouTube Inbound",
  "Email → DM CTA",
  "Typeform / Quiz Opt-In",
  "Cold IG or Facebook DM",
  "Follower Outreach",
  "Friend Add + Message",
  "LinkedIn Outreach",
  "Cold TikTok DMs",
  "CRM Re-Activation",
  "Past Client Check-In",
  "Ghosted Consult Follow-Up",
];

const METRIC_TITLES = [
  // Inbound
  "Instagram Inbound",
  "Facebook Inbound",
  "TikTok / YouTube Inbound",
  "Email → DM CTA",
  "Typeform / Quiz Opt-In",
  // Outbound
  "Cold IG or Facebook DM",
  "Follower Outreach",
  "Friend Add + Message",
  "LinkedIn Outreach",
  "Cold TikTok DMs",
  // Re-Engagement
  "CRM Re-Activation",
  "Past Client Check-In",
  "Ghosted Consult Follow-Up",
  // Result metrics
  "Texts Sent",
  "Replies Received",
  "Booked",
  "Showed Up",
  "Opt-Out / DND",
  "QNR",
  "Dead Lead",
  "Sales / Closed",
];

const ALL_SETTERS = "All Setters";

type RawRow = {
  profile_id: string;
  payload: any;
  submission_date: string;
};

function keyForSourceLabel(label: string) {
  return label.replace(/\W/g, "_").toLowerCase();
}

// Inner page content moved to a separate component so it can be wrapped in Suspense
function DMMessageSettingContent() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const { role } = useRole();
  const search = useSearchParams();

  const [note, setNote] = useState("");

  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [rows, setRows] = useState<RawRow[]>([]);

  const selectedSetter = (search.get("setter") || "").trim() || ALL_SETTERS;

  // who can see a “Setter Name” card / filter by setter
  const privileged = (["owner", "ptsi-intern", "admin"] as AppRole[]).includes(role as AppRole);

  // resolve active gym (admin via ?gym_id, others via profile)
  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return;
      if (role === "admin") {
        const id = search.get("gym_id");
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
  }, [role, search, session?.user?.id, supabase]);

  function monthWindow() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  // pull DM_SUMMARY rows for gym + current month
  useEffect(() => {
    (async () => {
      if (!activeGymId) {
        setRows([]);
        return;
      }
      const { startISO, endISO } = monthWindow();
      const { data, error } = await supabase
        .from("raw_entries")
        .select("profile_id,payload,submission_date")
        .eq("gym_id", activeGymId)
        .eq("event_type", "DM_SUMMARY")
        .gte("submission_date", startISO)
        .lt("submission_date", endISO);

      if (error) {
        console.error("DM_SUMMARY query error", error);
        setRows([]);
        return;
      }
      setRows((data || []) as RawRow[]);
    })();
  }, [activeGymId, supabase]);

  // compute totals from raw payloads with role scoping + setter filter
  const totals = useMemo(() => {
    // zeros
    const base: Record<string, number> = {};
    DM_SOURCES.forEach((s) => (base[keyForSourceLabel(s)] = 0));
    base.texts_sent = 0;
    base.replies_received = 0;
    base.booked = 0;
    base.showed_up = 0;
    base.opt_out = 0;
    base.qnr = 0;
    base.dead_lead = 0;
    base.sales_closed = 0;

    if (!activeGymId) return base;

    let filtered = rows;

    // non-privileged → only their own rows
    if (!privileged && session?.user?.id) {
      filtered = filtered.filter((r) => r.profile_id === session.user.id);
    }

    // setter filter (privileged only)
    if (privileged && selectedSetter !== ALL_SETTERS) {
      filtered = filtered.filter(
        (r) => (r.payload?.dm_setter_name || "").toString().trim() === selectedSetter
      );
    }

    // aggregate all DM source fields and result metrics
    filtered.forEach((r) => {
      const p = r.payload || {};
      DM_SOURCES.forEach((label) => {
        const k = keyForSourceLabel(label);
        base[k] += Number(p[k] || 0);
      });
      base.texts_sent       += Number(p.texts_sent || 0);
      base.replies_received += Number(p.replies_received || 0);
      base.booked           += Number(p.booked || 0);
      base.showed_up        += Number(p.showed_up || 0);
      base.opt_out          += Number(p.opt_out || 0);
      base.qnr              += Number(p.qnr || 0);
      base.dead_lead        += Number(p.dead_lead || 0);
      base.sales_closed     += Number(p.sales_closed || 0);
    });

    return base;
  }, [rows, privileged, selectedSetter, activeGymId, session?.user?.id]);

  // build cards (UI only)
  const showSetterCard = privileged;
  const dmMetrics = useMemo(() => {
    const cards: { title: string; value: string }[] = [];
    if (showSetterCard) {
      cards.push({ title: "Setter Name", value: selectedSetter });
    }

    METRIC_TITLES.forEach((title) => {
      let valueNum = 0;

      // first 13 are DM source buckets
      if (DM_SOURCES.includes(title)) {
        valueNum = totals[keyForSourceLabel(title)] || 0;
      } else {
        // result metrics map
        switch (title) {
          case "Texts Sent":          valueNum = totals.texts_sent || 0; break;
          case "Replies Received":    valueNum = totals.replies_received || 0; break;
          case "Booked":              valueNum = totals.booked || 0; break;
          case "Showed Up":           valueNum = totals.showed_up || 0; break;
          case "Opt-Out / DND":       valueNum = totals.opt_out || 0; break;
          case "QNR":                 valueNum = totals.qnr || 0; break;
          case "Dead Lead":           valueNum = totals.dead_lead || 0; break;
          case "Sales / Closed":      valueNum = totals.sales_closed || 0; break;
        }
      }

      cards.push({
        title,
        value: DM_SOURCES.includes(title)
          ? valueNum.toString()
          : valueNum.toLocaleString(),
      });
    });

    return cards;
  }, [showSetterCard, selectedSetter, totals]);

  const handleSave = () => {
    alert("Notes saved!");
    setNote("");
  };

  return (
    <>
      <Macro1Tabs />

      <header className="flex items-start justify-between">
        <div>
          <h2
            className="font-teko text-3xl sm:text-4xl tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
          >
            KPI – DM / Message Setting
          </h2>
          <p className="text-sm text-gray-600 mt-1">This month to date</p>
        </div>
      </header>

      {/* metrics grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dmMetrics.map(({ title, value }) => (
          <Card
            key={title}
            title={title}
            value={value}
            note=""
            borderColor={PRIMARY}
            icon="💬"
            iconBg="#FFF1E8"
          />
        ))}
      </section>

      {/* notes */}
      <div className="mt-6">
        <label
          htmlFor="dm-notes"
          className="block text-gray-900 text-sm font-bold mb-2 font-teko"
        >
          Notes
        </label>
        <textarea
          id="dm-notes"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write DM-specific notes…"
          className="w-full rounded-xl border border-gray-200 bg-white/90 p-3 text-gray-900 shadow-inner outline-none focus:ring-2 focus:ring-[color:var(--accent,_#FF4F36)]"
          rows={4}
        />
        <button
          onClick={handleSave}
          className="mt-3 rounded-xl bg-[color:var(--accent,_#FF4F36)] px-4 py-2 font-teko text-white shadow-sm transition hover:brightness-110"
        >
          Save Notes
        </button>
      </div>
    </>
  );
}

export default function DMMessageSettingPage() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-white relative">
      {/* Subtle background glows for theme parity */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            `radial-gradient(900px 400px at 80% -200px, ${PRIMARY}14, transparent 60%),
             radial-gradient(700px 320px at -110px 78%, ${ACCENT}12, transparent 65%)`,
        }}
      />
      <Sidebar />
      <main className="flex-1 ml-64 sm:ml-72 p-6 sm:p-8 lg:p-10 space-y-10 overflow-auto font-lato">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              Loading…
            </div>
          }>
            <DMMessageSettingContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

/* Card component (visual refresh only) */
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
    <div className="relative group flex min-h-[116px] items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_8px_30px_rgba(2,12,27,0.06)]">
      {/* left accent line */}
      <span className="mr-1 h-14 w-[3px] rounded-full" style={{ background: borderColor }} aria-hidden />
      <div className="grid h-12 w-12 place-items-center rounded-full" style={{ backgroundColor: iconBg || "#F6F7FB" }}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="min-w-0">
        <h3 className="text-[13px] md:text-[14px] font-medium text-gray-700">{title}</h3>
        <p className="truncate text-[28px] md:text-[32px] font-bold leading-tight text-gray-900">{value}</p>
        {note && <p className="text-xs md:text-sm text-gray-500">{note}</p>}
      </div>
    </div>
  );
}
