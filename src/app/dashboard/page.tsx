// src/app/dashboard/page.tsx
"use client";

import React, { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import { useRole, Show, type AppRole } from "@/lib/role";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as PieTooltip,
  Legend as PieLegend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as BarTooltip,
} from "recharts";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useSearchParams } from "next/navigation";
import { DollarSign, PhoneCall, CheckCircle2, TrendingUp, Eye, X as XIcon } from "lucide-react";

/* =========================
   BRAND & EFFECT TOKENS
   ========================= */

/** Brand colors */
const BRAND_PRIMARY = "#2F1B66"; // deep purple
const BRAND_ACCENT = "#FF4F36"; // orange
const CHIP_PURPLE = "rgba(47,27,102,0.10)";
const CHIP_ORANGE = "rgba(255,79,54,0.12)";

/** 🔧 Background glow strength (page chrome) */
const GLOW_PRIMARY_ALPHA_HEX = "14"; // hex alpha for BRAND_PRIMARY glow (00..FF)
const GLOW_ACCENT_ALPHA_HEX = "12";  // hex alpha for BRAND_ACCENT glow

/* =========================
   MODAL (POPUP) KNOBS
   ========================= */
// z-index layers
const MODAL_BACKDROP_Z = 100000;
const MODAL_DIALOG_Z = 100001;

// Backdrop look (matches your sample)
const BACKDROP_CLASS = "fixed inset-0 bg-black/30 backdrop-blur-[2px]"; // darker → bg-black/40, blur → [4px]

// Card width/padding (desktop-only larger)
const CARD_BASE_WIDTH = "max-w-sm";                 // mobile
const CARD_DESKTOP_STEP = "md:max-w-lg lg:max-w-xl"; // grow on desktop; try lg:max-w-2xl if you want wider
const CARD_PADDING = "p-5 md:p-6 lg:p-7";            // a bit roomier on desktop

/* Charts dummy (kept but shown as “Soon”) */
const leadStatusData = [
  { name: "Closed Sales", value: 40 },
  { name: "Booked Calls", value: 30 },
  { name: "Showed Up", value: 20 },
  { name: "No-Shows", value: 10 },
];
const leadColors = ["#3B2F6D", "#F28C38", "#E6E6FA", "#FFE4B5"];
const repPerformanceData = [
  { name: "Sarah", sales: 8 },
  { name: "Mike", sales: 12 },
  { name: "Jennifer", sales: 5 },
  { name: "Alex", sales: 15 },
  { name: "David", sales: 9 },
];

/* ---------- UI Primitives ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const anyVisible = React.Children.toArray(children).some(React.isValidElement);
  if (!anyVisible) return null;
  return (
    <section className="space-y-6">
      <h2 className="font-teko text-3xl sm:text-4xl tracking-tight" style={{ color: BRAND_PRIMARY }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ===== Portal-based MiniModal that covers the whole app ===== */
function MiniModal({
  open,
  onClose,
  title = "How this is calculated",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  // SSR safety
  useEffect(() => setMounted(true), []);

  // Escape to close + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modal = (
    <>
      {/* Backdrop (click-away) */}
      <div className={BACKDROP_CLASS} style={{ zIndex: MODAL_BACKDROP_Z }} onClick={onClose} />

      {/* Centered dialog */}
      <div
        className="fixed inset-0 flex items-center justify-center min-h-screen p-4"
        style={{ zIndex: MODAL_DIALOG_Z }}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`relative w-full ${CARD_BASE_WIDTH} ${CARD_DESKTOP_STEP} rounded-2xl border border-gray-200 bg-white ${CARD_PADDING} shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded p-1 text-gray-500 hover:bg-gray-100"
          >
            <XIcon className="h-4 w-4" />
          </button>
          <h4 className="mb-2 text-base font-semibold text-gray-900">{title}</h4>
          <div className="text-sm text-gray-700">{children}</div>
        </div>
      </div>
    </>
  );

  // Render above everything else, outside <main>/<Sidebar>
  return createPortal(modal, document.body);
}

/* Stat Card with eye icon */
function StatCard({
  title,
  value,
  note,
  icon: Icon,
  accent = BRAND_PRIMARY,
  chipBg = CHIP_PURPLE,
  explain,
  onOpenModal,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent?: string;
  chipBg?: string;
  explain?: React.ReactNode;
  onOpenModal?: (content: React.ReactNode) => void;
}) {
  const handleOpen = () => {
    if (explain && onOpenModal) {
      onOpenModal(explain);
    }
  };

  return (
    <div className="relative flex min-h-[116px] items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_8px_30px_rgba(2,12,27,0.06)]">
      {explain && (
        <button
          type="button"
          aria-label="How this is calculated"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          onClick={handleOpen}
        >
          <Eye className="h-4 w-4" />
        </button>
      )}
      <div className="grid h-12 w-12 place-items-center rounded-full" style={{ backgroundColor: chipBg }}>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm md:text-[15px] font-medium text-gray-700">{title}</h3>
        <p className="truncate text-[30px] md:text-[34px] font-bold leading-tight text-gray-900">{value}</p>
        <p className="text-xs md:text-sm text-gray-500">{note}</p>
      </div>
    </div>
  );
}

/* “Coming Soon” card for disabled sections */
function ComingSoonCard({ label }: { label: string }) {
  return (
    <div className="flex min-h-[116px] items-center justify-between rounded-2xl border border-dashed border-gray-300 bg-white p-6">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">This module will be available soon.</p>
      </div>
      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">Soon</span>
    </div>
  );
}

/* Rotating quote while loading */
function RotatingQuote() {
  const QUOTES = [
    "Every lead is a person — not a number.",
    "Small daily wins create big monthly results.",
    "Measure what matters, then improve it.",
    "Booked calls today are revenue next month.",
    "Consistency beats intensity every time.",
    "What gets tracked gets improved.",
  ];
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % QUOTES.length);
        setFade(true);
      }, 300); // quick crossfade
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className={`mt-2 text-sm text-gray-600 transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
      aria-live="polite"
    >
      {QUOTES[idx]}
    </p>
  );
}

/* ---------- Dashboard Inner ---------- */
function DashboardBody({ role }: { role: AppRole | undefined }) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const search = useSearchParams();

  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [dashClosed, setDashClosed] = useState<string>("0");
  const [dashBooked, setDashBooked] = useState<string>("0");
  const [dashShowed, setDashShowed] = useState<string>("0");
  const [dashClosePct, setDashClosePct] = useState<string>("0%");

  // Loading states for KPI section
  const [kpiReady, setKpiReady] = useState(false); // data fetched and computed
  const [kpiAnim, setKpiAnim] = useState(false); // trigger enter animation
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);

  const fmtInt = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }), []);
  const baseRoles: AppRole[] = ["trainer", "closer", "front-desk", "va", "owner", "coach", "ptsi-intern", "admin"];

  function monthWindow() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { startISO: start.toISOString(), endISO: end.toISOString() }; // UTC ISO
  }

  // Resolve gym (admins via ?gym_id, others via profiles.gym_id)
  useEffect(() => {
    let cancelled = false;
    async function fetchGymId() {
      if (!session?.user?.id) return;
      if (cancelled) return;
      if (role === "admin") {
        const id = search.get("gym_id");
        setActiveGymId(id || null);
      } else if (role) {
        const { data, error } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", session.user.id)
          .single();
        if (cancelled) return;
        if (error) {
          console.error("profiles gym_id error", error);
          setActiveGymId(null);
          return;
        }
        setActiveGymId((data?.gym_id as string) || null);
      } else {
        setActiveGymId(null);
      }
    }
    fetchGymId();
    return () => {
      cancelled = true;
    };
  }, [role, search, session, supabase]);

  // Load + calculate KPI cards
  useEffect(() => {
    let cancelled = false;
    async function fetchKpiData() {
      setKpiReady(false);
      setKpiAnim(false);

      // If role is defined but no gym, fallback to zeros (gym not required)
      if (role && !activeGymId) {
        if (!cancelled) {
          setDashClosed("0");
          setDashBooked("0");
          setDashShowed("0");
          setDashClosePct("0%");
          setTimeout(() => {
            if (!cancelled) {
              setKpiReady(true);
              setTimeout(() => setKpiAnim(true), 30);
            }
          }, 1500); // 1.5s delay for smooth reveal
        }
        return;
      }

      if (!activeGymId) return; // Skip fetch if no gym

      const { startISO, endISO } = monthWindow();
      const { data, error } = await supabase
        .from("raw_entries")
        .select("event_type,submission_date,lead_id,payload")
        .eq("gym_id", activeGymId)
        .gte("submission_date", startISO)
        .lt("submission_date", endISO);

      if (cancelled) return;

      if (error) {
        console.error("dashboard kpi load error", error);
        setDashClosed("0");
        setDashBooked("0");
        setDashShowed("0");
        setDashClosePct("0%");
        setTimeout(() => {
          if (!cancelled) {
            setKpiReady(true);
            setTimeout(() => setKpiAnim(true), 30);
          }
        }, 1500);
        return;
      }

      const rows = (data || []) as Array<{
        event_type: string;
        submission_date: string;
        lead_id: string | null;
        payload: any;
      }>;

      const byType = rows.reduce<Record<string, typeof rows>>((acc, r) => {
        (acc[r.event_type] ||= []).push(r);
        return acc;
      }, {});

      const booked = (byType["BOOKING_CREATED"] || []).length;
      const showed = (byType["SHOW_RECORDED"] || []).filter((r) => {
        const o = (r.payload?.outcome || "").toString().toLowerCase();
        return o.includes("show") && !o.includes("no");
      }).length;
      const closed = (byType["SALE_RECORDED"] || []).length;
      const closePct = showed ? Math.round((closed / showed) * 100) : 0;

      if (!cancelled) {
        setDashClosed(fmtInt.format(closed));
        setDashBooked(fmtInt.format(booked));
        setDashShowed(fmtInt.format(showed));
        setDashClosePct(`${closePct}%`);
        setTimeout(() => {
          if (!cancelled) {
            setKpiReady(true);
            setTimeout(() => setKpiAnim(true), 30);
          }
        }, 1500); // 1.5s delay for smooth reveal
      }
    }
    fetchKpiData();
    return () => {
      cancelled = true;
    };
  }, [activeGymId, supabase, fmtInt, role]);

  const isAdminNoGym = role === "admin" && !activeGymId;

  /* Client-friendly EXPLANATIONS for the eye popups */
  const explains = {
    closed: (
      <div className="space-y-2">
        <p>
          <strong>What this shows</strong>: How many people became paying clients this month.
        </p>
        <p>
          <strong>Time window</strong>: <em>This month to date</em> (from the 1st of the current month up to right now).
        </p>
        <p>
          <strong>How it’s calculated</strong>: We count each completed sale recorded this month. If the same person buys
          twice this month, that counts as 2 sales.
        </p>
      </div>
    ),
    booked: (
      <div className="space-y-2">
        <p>
          <strong>What this shows</strong>: How many new calls/consults were scheduled this month.
        </p>
        <p>
          <strong>Time window</strong>: <em>This month to date</em> (from the 1st of the month up to now).
        </p>
        <p>
          <strong>How it’s calculated</strong>: Every new booking created this month counts as 1. Reschedules still count
          once. Cancellations aren’t subtracted here.
        </p>
      </div>
    ),
    showed: (
      <div className="space-y-2">
        <p>
          <strong>What this shows</strong>: How many people actually attended their scheduled call/appointment this month.
        </p>
        <p>
          <strong>Time window</strong>: <em>This month to date</em>.
        </p>
        <p>
          <strong>How it’s calculated</strong>: We include visits marked as “showed” and exclude any marked “no-show”.
          Each attended appointment counts once.
        </p>
      </div>
    ),
    closePct: (
      <div className="space-y-2">
        <p>
          <strong>What this shows</strong>: Of the people who showed up, what % became paying clients this month.
        </p>
        <p>
          <strong>Time window</strong>: <em>This month to date</em>.
        </p>
        <p>
          <strong>How it’s calculated</strong>:
          <br />
          <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Closed Sales ÷ Showed Up × 100</span>&nbsp;(rounded
          to the nearest whole number; if there were no shows, this shows 0%.)
        </p>
      </div>
    ),
  };

  const handleOpenModal = (content: React.ReactNode) => {
    setModalContent(content);
  };

  return (
    <>
      {/* Modal at root level via portal to blur entire page */}
      {modalContent && (
        <MiniModal open={!!modalContent} onClose={() => setModalContent(null)} title="How this is calculated">
          {modalContent}
        </MiniModal>
      )}

      {/* Header — centered on phones only */}
      <div className="mb-2 text-center md:text-left">
        <h1 className="font-teko text-4xl tracking-tight" style={{ color: BRAND_PRIMARY }}>
          Dashboard
        </h1>
        <p className="text-sm text-gray-500">Key performance at a glance.</p>
      </div>

      {/* Admin hint if no gym selected */}
      {isAdminNoGym && (
        <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-700">
          <strong>Tip:</strong> Select a gym from the sidebar <em>(KPI – Select Gym)</em> to load live metrics.
        </div>
      )}

      {/* 1) KPI Overview */}
      <Section title="KPI Overview">
        {!kpiReady ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200" style={{ borderTopColor: BRAND_PRIMARY }} />
            <h3 className="mt-4 font-teko text-2xl text-gray-800">Loading…</h3>
            <p className="mt-1 text-base text-gray-700">Getting your dashboard ready</p>
            <RotatingQuote />
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 transform transition-all duration-700 ease-out ${
              kpiAnim ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"
            }`}
          >
            <Show allow={["trainer", "closer", "front-desk", "va", "owner", "coach", "ptsi-intern", "admin"]}>
              <StatCard
                title="Closed Sales"
                value={dashClosed}
                note="Sales this month"
                icon={DollarSign}
                accent={BRAND_PRIMARY}
                chipBg={CHIP_PURPLE}
                explain={explains.closed}
                onOpenModal={handleOpenModal}
              />
            </Show>
            <Show allow={["trainer", "closer", "front-desk", "va", "owner", "coach", "ptsi-intern", "admin"]}>
              <StatCard
                title="Booked Calls"
                value={dashBooked}
                note="Calls booked"
                icon={PhoneCall}
                accent={BRAND_ACCENT}
                chipBg={CHIP_ORANGE}
                explain={explains.booked}
                onOpenModal={handleOpenModal}
              />
            </Show>
            <Show allow={["trainer", "closer", "front-desk", "va", "owner", "coach", "ptsi-intern", "admin"]}>
              <StatCard
                title="Showed Up"
                value={dashShowed}
                note="Attended"
                icon={CheckCircle2}
                accent={BRAND_ACCENT}
                chipBg={CHIP_ORANGE}
                explain={explains.showed}
                onOpenModal={handleOpenModal}
              />
            </Show>
            <Show allow={["trainer", "closer", "front-desk", "va", "owner", "coach", "ptsi-intern", "admin"]}>
              <StatCard
                title="Closed Sales %"
                value={dashClosePct}
                note="Conversion"
                icon={TrendingUp}
                accent={BRAND_PRIMARY}
                chipBg={CHIP_PURPLE}
                explain={explains.closePct}
                onOpenModal={handleOpenModal}
              />
            </Show>
          </div>
        )}
      </Section>

      {/* Everything else disabled */}
      <Section title="Retention & LTV">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ComingSoonCard label="Retention & LTV" />
          <ComingSoonCard label="Churn / LTV breakdown" />
          <ComingSoonCard label="Upsell opportunities" />
          <ComingSoonCard label="MRR / Cohorts" />
        </div>
      </Section>

      <Section title="Referrals & Comeback">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ComingSoonCard label="Referrals funnel" />
          <ComingSoonCard label="Comeback wins" />
          <ComingSoonCard label="Payouts" />
          <ComingSoonCard label="Attribution" />
        </div>
      </Section>

      <Section title="Social & Content Stats">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ComingSoonCard label="CTA tracking" />
          <ComingSoonCard label="Consults from content" />
          <ComingSoonCard label="Top content" />
          <ComingSoonCard label="Mix 70/20/10" />
        </div>
      </Section>

      <Section title="Roleplay & Sales QA">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ComingSoonCard label="Roleplays" />
          <ComingSoonCard label="Avg score" />
          <ComingSoonCard label="Pass rate" />
          <ComingSoonCard label="Missed drills" />
        </div>
      </Section>

      <section className="space-y-6">
        <h2 className="font-teko text-3xl sm:text-4xl tracking-tight" style={{ color: BRAND_PRIMARY }}>
          Charts
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <ComingSoonCard label="Lead Status Breakdown" />
          <ComingSoonCard label="Weekly Rep Performance" />
        </div>
      </section>
    </>
  );
}

/* ---------- Parent Shell ---------- */
export default function DashboardPage() {
  const { loading, role /*, badge*/ } = useRole();
  const menuRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Hard refresh if role loading takes >15s
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      if (loading) {
        window.location.reload();
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <div className="relative flex min-h-screen bg-white">
      {/* Subtle background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(900px 400px at 80% -200px, ${BRAND_PRIMARY}${GLOW_PRIMARY_ALPHA_HEX}, transparent 60%),
                      radial-gradient(700px 320px at -110px 78%, ${BRAND_ACCENT}${GLOW_ACCENT_ALPHA_HEX}, transparent 65%)`,
        }}
      />

      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      {/* Hidden debug widget */}
      {false && (
        <div className="fixed right-4 top-4 z-50 rounded border border-gray-100 bg-white p-3 text-sm text-black shadow">
          <strong>useRole ➔</strong>
          <br />
          loading: {loading.toString()}
          <br />
          role: {role}
          <br />
        </div>
      )}

      {/* Responsive margin vs. sidebar */}
      <main
        className="
          font-lato flex-1 overflow-auto
          p-5 sm:p-7 md:p-8 lg:p-9
          ml-0 md:ml-72
          transition-[margin] duration-200
        "
      >
        {loading ? (
          <div className="p-6">Loading dashboard…</div>
        ) : (
          <Suspense fallback={null}>
            <div className="mx-auto max-w-7xl space-y-10">
              <DashboardBody role={role as AppRole | undefined} />
            </div>
          </Suspense>
        )}
      </main>
    </div>
  );
}
