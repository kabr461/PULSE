// src/app/kpi-dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import Macro1Tabs from "../components/Macro1Tabs";
import { Show, AppRole, useRole } from "@/lib/role";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Eye, X as XIcon } from "lucide-react";

/* ========= Brand ========= */
const PRIMARY = "#2F1B66";
const ACCENT  = "#FF4F36";

/* ========= Role gates ========= */
const overviewRoles: AppRole[] = [
  "trainer","closer","front-desk","va","owner","coach","ptsi-intern","admin",
];
const moneyRoles: AppRole[] = ["owner","coach","ptsi-intern","admin"];

/* ========= Charts palette ========= */
const funnelColors = ["#D9D9E8", "#FFE4B5", "#F28C38", "#2F1B66"];

/* ========= Sources ========= */
const PHONE_LEAD_SOURCES = [
  "Facebook Ads (Lead Form)","Instagram DM to Call","Google Ads / SEO","FBM/Kijiji",
  "Referral (Phone-Based)","Walk-Ins (Follow-Up)","QR Code Scan","Inbound Calls (Missed / Callback)",
  "TikTok / YouTube / Other Organic","CRM Reactivation (Old Leads)",
];

const DM_SOURCES = [
  "Instagram Inbound","Facebook Inbound","TikTok / YouTube Inbound","Email → DM CTA","Typeform / Quiz Opt-In",
  "Cold IG or Facebook DM","Follower Outreach","Friend Add + Message","LinkedIn Outreach","Cold TikTok DMs",
  "CRM Re-Activation","Past Client Check-In","Ghosted Consult Follow-Up",
];

const PAID_SOURCES = new Set<string>(["Facebook Ads (Lead Form)","Google Ads / SEO"]);

const SOURCE_TO_PLATFORM: Record<string, "Facebook" | "Google" | "TikTok" | "Other"> = {
  "Facebook Ads (Lead Form)": "Facebook",
  "Google Ads / SEO": "Google",
  "TikTok / YouTube / Other Organic": "TikTok",
  "Instagram DM to Call": "Other",
  "FBM/Kijiji": "Other",
  "Referral (Phone-Based)": "Other",
  "Walk-Ins (Follow-Up)": "Other",
  "QR Code Scan": "Other",
  "Inbound Calls (Missed / Callback)": "Other",
  "CRM Reactivation (Old Leads)": "Other",
};

/* ========= Reusable UI bits (modal + loader) ========= */

function MiniModal({
  open,
  onClose,
  title = "How this metric works",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const node = (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" style={{ zIndex: 100000 }} onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100001 }} onClick={onClose}>
        <div
          className="relative w-full max-w-sm md:max-w-lg lg:max-w-xl rounded-2xl border border-gray-200 bg-white p-5 md:p-6 lg:p-7 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
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

  return createPortal(node, document.body);
}

function RotatingQuote() {
  const QUOTES = [
    "Every lead is a person — not a number.",
    "Small daily wins create big monthly results.",
    "Measure what matters, then improve it.",
    "Booked calls today are revenue next month.",
    "Consistency beats intensity every time.",
    "What gets tracked gets improved.",
  ];
  const [i, setI] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setI((p) => (p + 1) % QUOTES.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className={`mt-2 text-sm text-gray-600 transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`} aria-live="polite">
      {QUOTES[i]}
    </p>
  );
}

/* ========= The Page ========= */

export default function KPIDashboard() {
  const { loading: roleLoading, role } = useRole();

  // --- DEBUG helpers (enabled with ?debug=1 or localStorage.kpiDebug="1")
  const DEBUG = useMemo(
    () =>
      (typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).has("debug") ||
          (window.localStorage && window.localStorage.getItem("kpiDebug") === "1"))) ||
      false,
    []
  );
  const d = {
    group: (label: string) => DEBUG && console.groupCollapsed(`🛠️ ${label}`),
    end: () => DEBUG && console.groupEnd(),
    log: (...args: any[]) => DEBUG && console.log(...args),
    table: (obj: any) => DEBUG && console.table(obj),
    warn: (...args: any[]) => DEBUG && console.warn(...args),
    error: (...args: any[]) => DEBUG && console.error(...args),
    dir: (obj: any) => DEBUG && console.dir(obj),
  };

  // Hard refresh if role stays unknown > 15s (covers null/undefined role only, not “no gym”)
  useEffect(() => {
    if (!roleLoading) return;
    const t = setTimeout(() => {
      if (roleLoading) window.location.reload();
    }, 15000);
    return () => clearTimeout(t);
  }, [roleLoading]);

  const [eventsHref, setEventsHref] = useState("/events");
  useEffect(() => {
    if (typeof window !== "undefined") setEventsHref(`/events${window.location.search || ""}`);
  }, []);

  // Eye-icon modal content
  const [modal, setModal] = useState<React.ReactNode | null>(null);
  const openExplain = (content: React.ReactNode) => setModal(content);

  /* ========= Live data ========= */
  const supabase = useSupabaseClient();
  const session  = useSession();

  const [activeGymId, setActiveGymId] = useState<string | null>(null);

  // KPI cards
  const [kpiTotalLeads, setKpiTotalLeads]       = useState<string>("0");
  const [kpiBookedPct, setKpiBookedPct]         = useState<string>("0%");
  const [kpiLeadToShowPct, setKpiLeadToShowPct] = useState<string>("0%");
  const [kpiLeadToSalePct, setKpiLeadToSalePct] = useState<string>("0%");

  // charts / tables
  const [funnelData, setFunnelData] = useState(
    [{ name: "Total Leads", value: 0 },{ name: "Booked", value: 0 },{ name: "Showed", value: 0 },{ name: "Closed", value: 0 }]
  );
  const [leadsBySourcePhone, setLeadsBySourcePhone] = useState(
    PHONE_LEAD_SOURCES.map((s) => ({ source: s, value: 0 }))
  );
  const [leadsBySourceMessages, setLeadsBySourceMessages] = useState(
    DM_SOURCES.map((s) => ({ source: s, value: 0 }))
  );
  const [bookingsByChannel, setBookingsByChannel] = useState([
    { channel: "Phone", sent: 0, booked: 0 },
    { channel: "DM",    sent: 0, booked: 0 },
    { channel: "Email", sent: 0, booked: 0 },
  ]);
  const [repOverTime, setRepOverTime] = useState([
    { week: "W1", sales: 0 },{ week: "W2", sales: 0 },{ week: "W3", sales: 0 },{ week: "W4", sales: 0 },
  ]);
  const [sourceROI, setSourceROI] = useState([
    { source: "FB Ads", roas: 0 },{ source: "Google", roas: 0 },{ source: "TikTok", roas: 0 },
  ]);

  // money cards
  const [cardROAS, setCardROAS]             = useState<string>("0.0×");
  const [cardCAC, setCardCAC]               = useState<string>("$0");
  const [cardCPB, setCardCPB]               = useState<string>("$0");
  const [cardCPL, setCardCPL]               = useState<string>("$0");
  const [cardCPS, setCardCPS]               = useState<string>("$0");
  const [cardRevenueTotal, setCardRevenueTotal] = useState<string>("$0");
  const [cardAOV, setCardAOV]               = useState<string>("$0");
  const [cardRevPerLead, setCardRevPerLead] = useState<string>("$0");
  const [cardRevPerRep, setCardRevPerRep]   = useState<string>("$0");
  const [cardRefundRate, setCardRefundRate] = useState<string>("0%");
  const [cardFailedPayRate, setCardFailedPayRate] = useState<string>("0%");
  const [cardDepositOnly, setCardDepositOnly] = useState<string>("0%");
  const [cardTrialToHT, setCardTrialToHT]   = useState<string>("0%");
  const [cardMRR, setCardMRR]               = useState<string>("$0");
  const [cardNetRevenue, setCardNetRevenue] = useState<string>("$0");
  const [cardSalesCycle, setCardSalesCycle] = useState<string>("0 days");
  const [cardTimeToBook, setCardTimeToBook] = useState<string>("0 days");
  const [cardFollowUpConv, setCardFollowUpConv] = useState<string>("0%");
  const [cardLTVtoCAC, setCardLTVtoCAC]     = useState<string>("0.0×"); // NEW: LTV:CAC (MTD proxy)

  const [topReps, setTopReps] = useState([{ name: "—", held: 0, closed: 0, showRate: 0, closeRate: 0, revenue: 0 }]);

  // page loading / reveal
  const [pageReady, setPageReady] = useState(false);
  const [pageAnim, setPageAnim]   = useState(false);

  // 🔽 collapsible toggles (default collapsed)
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);

  const fmtInt       = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }), []);
  const fmtCurrency0 = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }), []);

  // active gym (admin via ?gym_id, others via profile)
  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return;
      if (role === "admin") {
        const id = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("gym_id") : null;
        setActiveGymId(id || null);
      } else if (role) {
        const { data } = await supabase.from("profiles").select("gym_id, role").eq("id", session.user.id).single();
        setActiveGymId((data?.gym_id as string) || null);
      }
    })();
  }, [session?.user?.id, role, supabase]);

  function monthWindow() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  function zeroAll() {
    setKpiTotalLeads("0"); setKpiBookedPct("0%"); setKpiLeadToShowPct("0%"); setKpiLeadToSalePct("0%");
    setFunnelData([{ name: "Total Leads", value: 0 },{ name: "Booked", value: 0 },{ name: "Showed", value: 0 },{ name: "Closed", value: 0 }]);
    setLeadsBySourcePhone(PHONE_LEAD_SOURCES.map((s) => ({ source: s, value: 0 })));
    setLeadsBySourceMessages(DM_SOURCES.map((s) => ({ source: s, value: 0 })));
    setBookingsByChannel([{ channel: "Phone", sent: 0, booked: 0 },{ channel: "DM", sent: 0, booked: 0 },{ channel: "Email", sent: 0, booked: 0 }]);
    setRepOverTime([{ week: "W1", sales: 0 },{ week: "W2", sales: 0 },{ week: "W3", sales: 0 },{ week: "W4", sales: 0 }]);
    setSourceROI([{ source: "FB Ads", roas: 0 },{ source: "Google", roas: 0 },{ source: "TikTok", roas: 0 }]);
    setCardROAS("0.0×"); setCardCAC("$0"); setCardCPB("$0"); setCardCPL("$0"); setCardCPS("$0");
    setCardRevenueTotal("$0"); setCardAOV("$0"); setCardRevPerLead("$0"); setCardRevPerRep("$0");
    setCardRefundRate("0%"); setCardFailedPayRate("0%"); setCardDepositOnly("0%");
    setCardTrialToHT("0%"); setCardMRR("$0"); setCardNetRevenue("$0");
    setCardSalesCycle("0 days"); setCardTimeToBook("0 days"); setCardFollowUpConv("0%");
    setCardLTVtoCAC("0.0×");
    setTopReps([{ name: "—", held: 0, closed: 0, showRate: 0, closeRate: 0, revenue: 0 }]);
  }

  // MAIN LOAD with smooth reveal (cards render hidden → reveal all-at-once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPageReady(false);
      setPageAnim(false);

      if (!role) return; // wait for role to exist (admin passes even if no gym)
      const { startISO, endISO } = monthWindow();

      // --- DEBUG: context
      d.group("Context");
      d.log({ role, roleLoading, sessionUserId: session?.user?.id || null, activeGymId, period: { startISO, endISO } });
      d.end();

      // If non-admin and no gym → show zeros (still reveal nicely)
      if (role !== "admin" && !activeGymId) {
        d.warn("No activeGymId for non-admin; rendering zeros");
        zeroAll();
        setTimeout(() => {
          if (!cancelled) {
            setPageReady(true);
            setTimeout(() => setPageAnim(true), 30);
          }
        }, 1200);
        return;
      }

      // Admin: allow no gym → zeros
      if (role === "admin" && !activeGymId) {
        d.warn("Admin with no gym_id in query; rendering zeros");
        zeroAll();
        setTimeout(() => {
          if (!cancelled) {
            setPageReady(true);
            setTimeout(() => setPageAnim(true), 30);
          }
        }, 1200);
        return;
      }

      // Pull raw
      d.group("Fetch: raw_entries");
      const { data: rows, error } = await supabase
        .from("raw_entries")
        .select("id,gym_id,profile_id,event_type,submission_date,lead_id,payload")
        .eq("gym_id", activeGymId)
        .gte("submission_date", startISO)
        .lt("submission_date", endISO);

      if (error) d.error("raw_entries error:", error);
      d.log("rows length:", rows?.length ?? 0);
      if (rows && rows.length) d.dir(rows[0]);
      d.end();

      if (cancelled) return;

      if (error) {
        console.error(error);
        zeroAll();
        setTimeout(() => {
          if (!cancelled) {
            setPageReady(true);
            setTimeout(() => setPageAnim(true), 30);
          }
        }, 1200);
        return;
      }

      const re = (rows || []) as any[];
      const byType = re.reduce<Record<string, any[]>>((acc, r) => {
        (acc[r.event_type] ||= []).push(r);
        return acc;
      }, {});

      // --- DEBUG: byType counts
      d.group("By Event Type counts");
      const byTypeCounts = Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length]));
      d.table(byTypeCounts);
      d.end();

      // clients meta to map lead -> source/trainer
      const leadIds = Array.from(new Set(re.map(r => r.lead_id).filter(Boolean))) as string[];
      const leadMeta = new Map<string, { source?: string; trainer_id?: string }>();
      if (leadIds.length) {
        d.group("Fetch: clients (for lead→source/trainer)");
        const { data: clients, error: clientsErr } = await supabase
          .from("clients")
          .select("id, profile_id, payload")
          .in("id", leadIds);
        if (clientsErr) d.error("clients error:", clientsErr);
        (clients || []).forEach((c: any) => {
          leadMeta.set(c.id, { source: c.payload?.lead_source, trainer_id: c.profile_id || undefined });
        });
        const trainerLinkCount = (clients || []).filter((c: any) => !!c.profile_id).length;
        d.log("clients fetched:", clients?.length ?? 0, "with trainer link:", trainerLinkCount);
        if (clients && clients.length) d.dir(clients[0]);
        d.end();
      } else {
        d.warn("No leadIds found in raw_entries");
      }

      // Funnel
      const leads    = (byType["LEAD_CREATED"] || []).length;
      const bookings = (byType["BOOKING_CREATED"] || []).length;
      const shows    = (byType["SHOW_RECORDED"] || []).filter(r => {
        const o = (r.payload?.outcome || "").toString().toLowerCase();
        return o.includes("show") && !o.includes("no");
      }).length;
      const closes   = (byType["SALE_RECORDED"] || []).length;

      d.group("Funnel totals");
      d.log({ leads, bookings, shows, closes });
      d.end();

      setKpiTotalLeads(fmtInt.format(leads));
      setKpiBookedPct(`${leads ? Math.round((bookings / leads) * 100) : 0}%`);
      setKpiLeadToShowPct(`${bookings ? Math.round((shows / bookings) * 100) : 0}%`);
      setKpiLeadToSalePct(`${leads ? Math.round((closes / leads) * 100) : 0}%`);
      setFunnelData([
        { name: "Total Leads", value: leads },
        { name: "Booked",      value: bookings },
        { name: "Showed",      value: shows },
        { name: "Closed",      value: closes },
      ]);

      // Leads by source (phone)
      const leadBySource = new Map<string, number>();
      (byType["LEAD_CREATED"] || []).forEach(r => {
        const src = r.payload?.lead_source || "Unknown";
        leadBySource.set(src, (leadBySource.get(src) || 0) + 1);
      });
      setLeadsBySourcePhone(PHONE_LEAD_SOURCES.map(s => ({ source: s, value: leadBySource.get(s) || 0 })));

      // Leads by source (messages)
      const msgTotals: Record<string, number> = {};
      (byType["DM_SUMMARY"] || []).forEach(r => {
        DM_SOURCES.forEach(src => {
          const key = src.replace(/\W/g, "_").toLowerCase();
          const v = Number(r.payload?.[key] ?? 0);
          msgTotals[src] = (msgTotals[src] || 0) + (isFinite(v) ? v : 0);
        });
      });
      setLeadsBySourceMessages(DM_SOURCES.map(src => ({ source: src, value: msgTotals[src] || 0 })));

      // Bookings by channel
      const bookedByChannel = { PHONE: 0, DM: 0, EMAIL: 0, WEB: 0 };
      (byType["BOOKING_CREATED"] || []).forEach(r => {
        const ch = (r.payload?.channel || "OTHER") as keyof typeof bookedByChannel;
        if (bookedByChannel[ch] != null) bookedByChannel[ch] += 1;
      });
      const sentPhone = (byType["PHONE_SUMMARY"] || []).reduce((s, r) => s + Number(r.payload?.total_dials || 0), 0);
      const sentDM    = (byType["DM_SUMMARY"] || []).reduce((s, r) => s + Number(r.payload?.texts_sent || 0), 0);
      const sentEmail = (byType["EMAIL_SUMMARY"] || []).reduce((s, r) => s + Number(r.payload?.emails_sent || 0), 0);
      setBookingsByChannel([
        { channel: "Phone", sent: sentPhone, booked: bookedByChannel.PHONE },
        { channel: "DM",    sent: sentDM,    booked: bookedByChannel.DM },
        { channel: "Email", sent: sentEmail, booked: bookedByChannel.EMAIL },
      ]);

      d.group("Bookings/Outbound");
      d.log({ bookedByChannel, sentPhone, sentDM, sentEmail });
      d.end();

      // Revenue / Risk
      const sales        = (byType["SALE_RECORDED"] || []);
      const totalRevenue = sales.reduce((s, r) => s + Number(r.payload?.total_paid || 0), 0);
      const aov          = sales.length ? totalRevenue / sales.length : 0;

      const refunds     = (byType["REFUND_ISSUED"] || []);
      const refundCount = refunds.length;
      const refundAmt   = refunds.reduce((s, r) => s + Number(r.payload?.amount || 0), 0);

      const failedPays  = (byType["PAYMENT_FAILED"] || []).length;
      const ppSales     = sales.filter(r => (r.payload?.payment_type || "").toUpperCase() === "PP").length;
      const depositOnly = (byType["DEPOSIT_ONLY"] || []).length;

      const netRevenue  = totalRevenue - refundAmt;

      d.group("Revenue/Risk");
      d.log({ totalRevenue, aov, refundCount, refundAmt, failedPays, ppSales, depositOnly, netRevenue });
      d.end();

      setCardRevenueTotal(fmtCurrency0.format(Math.round(totalRevenue)));
      setCardAOV(fmtCurrency0.format(Math.round(aov)));
      setCardRevPerLead(fmtCurrency0.format(leads ? Math.round(totalRevenue / leads) : 0));
      setCardRefundRate(`${closes ? Math.round((refundCount / closes) * 100) : 0}%`);
      setCardFailedPayRate(`${ppSales ? Math.round((failedPays / ppSales) * 100) : 0}%`);
      setCardDepositOnly(`${closes ? Math.round((depositOnly / closes) * 100) : 0}%`);
      setCardNetRevenue(fmtCurrency0.format(Math.round(netRevenue)));

      // Recurring & Trials
      const mrr             = (byType["RECURRING_PAYMENT"] || []).reduce((s, r) => s + Number(r.payload?.recurring_amount || 0), 0);
      const trialsStarted   = (byType["TRIAL_STARTED"] || []).length;
      const trialsConverted = (byType["TRIAL_CONVERTED"] || []).length;
      setCardMRR(fmtCurrency0.format(Math.round(mrr)));
      setCardTrialToHT(`${trialsStarted ? Math.round((trialsConverted / trialsStarted) * 100) : 0}%`);

      d.group("Recurring/Trials");
      d.log({ mrr, trialsStarted, trialsConverted });
      d.end();

      // Time metrics
      const firstByLead = new Map<string, Partial<Record<"lead"|"book"|"sale", number>>>();
      (byType["LEAD_CREATED"] || []).forEach(r => {
        if (!r.lead_id) return;
        const t = new Date(r.submission_date).getTime();
        const rec = (firstByLead.get(r.lead_id) || {});
        if (!rec.lead || t < rec.lead) rec.lead = t;
        firstByLead.set(r.lead_id, rec);
      });
      (byType["BOOKING_CREATED"] || []).forEach(r => {
        if (!r.lead_id) return;
        const t = new Date(r.submission_date).getTime();
        const rec = (firstByLead.get(r.lead_id) || {});
        if (!rec.book || t < rec.book) rec.book = t;
        firstByLead.set(r.lead_id, rec);
      });
      (byType["SALE_RECORDED"] || []).forEach(r => {
        if (!r.lead_id) return;
        const t = r.payload?.close_date ? new Date(r.payload.close_date).getTime() : new Date(r.submission_date).getTime();
        const rec = (firstByLead.get(r.lead_id) || {});
        if (!rec.sale || t < rec.sale) rec.sale = t;
        firstByLead.set(r.lead_id, rec);
      });
      const salesCycleDays: number[] = [];
      const timeToBookDays: number[] = [];
      firstByLead.forEach(rec => {
        if (rec.lead && rec.sale) salesCycleDays.push((rec.sale - rec.lead) / (1000 * 60 * 60 * 24));
        if (rec.lead && rec.book) timeToBookDays.push((rec.book - rec.lead) / (1000 * 60 * 60 * 24));
      });
      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
      setCardSalesCycle(`${Math.round(avg(salesCycleDays))} days`);
      setCardTimeToBook(`${Math.round(avg(timeToBookDays))} days`);

      d.group("Timing");
      d.log({ avgSalesCycleDays: Math.round(avg(salesCycleDays)), avgTimeToBookDays: Math.round(avg(timeToBookDays)) });
      d.end();

      // Follow-Up Conversion
      const leadsWithFU = new Set((byType["FOLLOW_UP_SET"] || []).map(r => r.lead_id).filter(Boolean));
      const leadsWithFUSale = new Set(
        (byType["SALE_RECORDED"] || [])
          .filter(r => r.lead_id && leadsWithFU.has(r.lead_id))
          .map(r => r.lead_id as string)
      );
      setCardFollowUpConv(`${leadsWithFU.size ? Math.round((leadsWithFUSale.size / leadsWithFU.size) * 100) : 0}%`);

      d.group("Follow-Up");
      d.log({ leadsWithFU: leadsWithFU.size, leadsWithFUSale: leadsWithFUSale.size });
      d.end();

      // Paid efficiency & CAC
      const adSpend = (byType["AD_SPEND"] || []).reduce((s, r) => s + Number(r.payload?.amount || 0), 0);
      const paidLeadIds = new Set(
        (byType["LEAD_CREATED"] || [])
          .filter(r => r.lead_id && PAID_SOURCES.has((r.payload?.lead_source || "")))
          .map(r => r.lead_id as string)
      );
      const paidBookings = (byType["BOOKING_CREATED"] || []).filter(r => r.lead_id && paidLeadIds.has(r.lead_id)).length;
      const paidShows = (byType["SHOW_RECORDED"] || []).filter(r => r.lead_id && paidLeadIds.has(r.lead_id) && (r.payload?.outcome || "").toString().toLowerCase().includes("show")).length;
      const paidSales = (byType["SALE_RECORDED"] || []).filter(r => r.lead_id && paidLeadIds.has(r.lead_id));
      const paidCloses = paidSales.length;
      const paidRevenue = paidSales.reduce((s, r) => s + Number(r.payload?.total_paid || 0), 0);

      setCardROAS(`${adSpend ? (paidRevenue / adSpend).toFixed(1) : "0.0"}×`);
      setCardCPL(fmtCurrency0.format(leads ? Math.round(adSpend / (paidLeadIds.size || 1)) : 0));
      setCardCPB(fmtCurrency0.format(paidBookings ? Math.round(adSpend / paidBookings) : 0));
      setCardCPS(fmtCurrency0.format(paidShows ? Math.round(adSpend / paidShows) : 0));
      setCardCAC(fmtCurrency0.format(paidCloses ? Math.round(adSpend / paidCloses) : 0));

      d.group("Paid (Efficiency & CAC)");
      d.log({ adSpend, paidLeadCount: paidLeadIds.size, paidBookings, paidShows, paidCloses, paidRevenue });
      d.end();

      // LTV:CAC (MTD proxy)
      const ltvProxy = closes ? netRevenue / closes : 0;
      const cacNum   = paidCloses ? adSpend / paidCloses : 0;
      const ratio    = cacNum ? (ltvProxy / cacNum).toFixed(1) : "0.0";
      setCardLTVtoCAC(`${ratio}×`);
      d.group("LTV:CAC");
      d.log({ ltvProxy, cacNum, ratio });
      d.end();

      // Source ROI (ROAS) per platform
      const spendByPlatform = new Map<string, number>();
      (byType["AD_SPEND"] || []).forEach(r => {
        const p = (r.payload?.ad_platform || "Other") as string;
        spendByPlatform.set(p, (spendByPlatform.get(p) || 0) + Number(r.payload?.amount || 0));
      });
      const revByPlatform = new Map<string, number>();
      (byType["SALE_RECORDED"] || []).forEach(r => {
        const lid = r.lead_id as string | null;
        if (!lid) return;
        const src  = leadMeta.get(lid || "")?.source;
        const plat = SOURCE_TO_PLATFORM[src || ""] || "Other";
        if (plat === "Other") return;
        revByPlatform.set(plat, (revByPlatform.get(plat) || 0) + Number(r.payload?.total_paid || 0));
      });
      const roasRow = (plat: string, label: string) => {
        const spend = spendByPlatform.get(plat) || 0;
        const rev   = revByPlatform.get(label as any) || 0;
        return { label, value: spend ? Number((rev / spend).toFixed(1)) : 0 };
      };
      const fb = { source: "FB Ads", roas: roasRow("Facebook","Facebook").value };
      const gg = { source: "Google", roas: roasRow("Google","Google").value };
      const tk = { source: "TikTok", roas: roasRow("TikTok","TikTok").value };
      setSourceROI([fb, gg, tk]);

      d.group("Platform ROAS");
      d.log("Spend by platform:", Object.fromEntries(spendByPlatform.entries()));
      d.log("Revenue by platform:", Object.fromEntries(revByPlatform.entries()));
      d.table([fb, gg, tk]);
      d.end();

      // Top reps
      d.group("Fetch: profiles (trainers)");
      const trainers = await supabase
        .from("profiles")
        .select("id,display_name,role,gym_id")
        .eq("gym_id", activeGymId)
        .eq("role", "trainer");
      if (trainers.error) d.error("profiles error:", trainers.error);
      d.log("trainers found:", trainers.data?.length ?? 0);
      if (!trainers.data || trainers.data.length === 0) {
        d.warn("No 'trainer' rows for this gym. Check role values in 'profiles' table.");
      } else {
        d.table(trainers.data?.map(t => ({ id: t.id, name: (t as any).display_name, role: (t as any).role })));
      }
      d.end();

      const trainerIds = new Set((trainers.data || []).map(t => t.id));
      const nameOf = (id: string) => (trainers.data || []).find(t => t.id === id)?.display_name || id;

      type Agg = { shows: number; bookings: number; closes: number; revenue: number };
      const agg: Record<string, Agg> = {};
      const trainerForLead = (lid?: string | null) => (lid ? (leadMeta.get(lid)?.trainer_id || null) : null);

      let bookingWithTrainer = 0, showWithTrainer = 0, saleWithTrainer = 0;

      (byType["BOOKING_CREATED"] || []).forEach(r => {
        const tid = trainerForLead(r.lead_id);
        if (!tid || !trainerIds.has(tid)) return;
        bookingWithTrainer++;
        (agg[tid] ||= { shows: 0, bookings: 0, closes: 0, revenue: 0 }).bookings += 1;
      });
      (byType["SHOW_RECORDED"] || []).forEach(r => {
        const outcome = (r.payload?.outcome || "").toString().toLowerCase();
        if (!outcome.includes("show")) return;
        const tid = trainerForLead(r.lead_id);
        if (!tid || !trainerIds.has(tid)) return;
        showWithTrainer++;
        (agg[tid] ||= { shows: 0, bookings: 0, closes: 0, revenue: 0 }).shows += 1;
      });
      (byType["SALE_RECORDED"] || []).forEach(r => {
        const tid = trainerForLead(r.lead_id);
        if (!tid || !trainerIds.has(tid)) return;
        saleWithTrainer++;
        const a = (agg[tid] ||= { shows: 0, bookings: 0, closes: 0, revenue: 0 });
        a.closes += 1;
        a.revenue += Number(r.payload?.total_paid || 0);
      });

      d.group("Top Reps aggregation");
      d.log({ trainerCount: trainerIds.size, leadIdsTotal: leadIds.length });
      const leadsWithTrainer = Array.from(leadMeta.values()).filter(v => !!v.trainer_id).length;
      d.log({ leadsWithTrainer, bookingWithTrainer, showWithTrainer, saleWithTrainer });
      d.table(Object.entries(agg).map(([k,v]) => ({ trainerId: k, ...v })));
      d.end();

      let table = Object.keys(agg).map((tid) => {
        const a = agg[tid];
        const showRate  = a.bookings ? Math.round((a.shows  / a.bookings) * 100) : 0;
        const closeRate = a.shows    ? Math.round((a.closes / a.shows)    * 100) : 0;
        return { name: nameOf(tid), held: a.shows, closed: a.closes, showRate, closeRate, revenue: Math.round(a.revenue), pid: tid };
      });

      if (role === "trainer" && session?.user?.id) table = table.filter(r => r.pid === session.user.id);
      table.sort((a, b) => b.revenue - a.revenue || b.closed - a.closed);

      if (!table.length) {
        d.warn("Top Reps table is empty — likely no leads map to a trainer_id via clients.profile_id or no trainers matched gym/role filter.");
        setTopReps([{ name: role === "trainer" ? "You" : "—", held: 0, closed: 0, showRate: 0, closeRate: 0, revenue: 0 }]);
      } else {
        setTopReps(table.map(({ pid, ...rest }) => rest));
      }

      const closers = table.filter(r => r.closed > 0).length || 1;
      const totalRevForReps = table.reduce((s, r) => s + r.revenue, 0);
      setCardRevPerRep(fmtCurrency0.format(Math.round(totalRevForReps / closers)));

      d.group("Top Reps final");
      d.table(table);
      d.end();

      // Expose snapshot on window for quick inspection
      if (DEBUG && typeof window !== "undefined") {
        (window as any).__kpiDebug = {
          context: { role, activeGymId, period: { startISO, endISO } },
          byTypeCounts,
          leads,
          bookings,
          shows,
          closes,
          ad: { adSpend, paidLeadCount: paidLeadIds.size },
          trainers: trainers.data,
          leadMetaSample: Array.from(leadMeta.entries()).slice(0, 10),
          agg,
          table,
        };
      }

      // Smooth reveal
      setTimeout(() => {
        if (!cancelled) {
          setPageReady(true);
          setTimeout(() => setPageAnim(true), 30);
        }
      }, 1200);
    })();

    return () => { cancelled = true; };
  }, [activeGymId, role, session?.user?.id, supabase, fmtInt, fmtCurrency0, DEBUG]);

  /* ========= Client-facing explains for EVERY card ========= */
  const MonthToDate = <em>This month to date</em>;
  const explains = {
    // KPI Overview
    totalLeads: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: All new leads captured across sources.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>How it’s calculated</strong>: Count of <code>LEAD_CREATED</code> events this month.</p>
      </div>
    ),
    bookedPct: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: % of leads that turned into a scheduled consult.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Booked ÷ Leads × 100</span></p>
      </div>
    ),
    leadToShow: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: % of booked consults that actually showed up.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Showed ÷ Booked × 100</span></p>
      </div>
    ),
    leadToSale: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: % of leads that became paying clients.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Closed ÷ Leads × 100</span></p>
      </div>
    ),

    // Ad Efficiency & CAC
    roas: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Return on ad spend for paid leads only.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Revenue from Paid Leads ÷ Ad Spend</span></p>
      </div>
    ),
    cac: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Cost to acquire one paying client from ads.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Ad Spend ÷ Paid Closes</span></p>
      </div>
    ),
    cpb: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Cost per consult booked (paid sources).</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Ad Spend ÷ Paid Bookings</span></p>
      </div>
    ),
    cpl: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Cost per paid lead captured.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Ad Spend ÷ # Paid Leads</span></p>
      </div>
    ),
    cps: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Cost per show (paid sources).</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Ad Spend ÷ Paid Shows</span></p>
      </div>
    ),

    // Revenue Metrics
    revenueTotal: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Total collected revenue from sales recorded this month.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>How it’s calculated</strong>: Sum of <code>total_paid</code> on all sales events.</p>
      </div>
    ),
    aov: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Average amount collected per sale.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Total Revenue ÷ # Sales</span></p>
      </div>
    ),
    revPerLead: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Revenue generated per lead.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Total Revenue ÷ # Leads</span></p>
      </div>
    ),
    revPerRep: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Average revenue per rep who closed at least one sale.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Total Revenue from Reps ÷ # Reps with ≥1 Close</span></p>
      </div>
    ),

    // Risk
    refundRate: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: % of sales that were refunded.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5"># Refunds ÷ # Sales × 100</span></p>
      </div>
    ),
    failedRate: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: % of active PP clients with a failed payment this month.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5"># Failed Payments ÷ # PP Clients × 100</span></p>
      </div>
    ),
    depositOnly: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: % of closed deals that only paid a deposit so far.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5"># Deposit-Only ÷ # Closes × 100</span></p>
      </div>
    ),

    // LTV & efficiency (subset)
    trialHT: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: % of trial clients who converted to the High-Ticket program.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Trials Converted ÷ Trials Started × 100</span></p>
      </div>
    ),
    mrr: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Sum of recurring payments recorded this month.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>How it’s calculated</strong>: Sum of <code>recurring_amount</code> on recurring payment events.</p>
      </div>
    ),
    netRevenue: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Revenue after refunds.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Total Revenue − Refund Amount</span></p>
      </div>
    ),
    ltvCac: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Lifetime value to acquisition cost ratio (MTD proxy).</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">(Net Revenue ÷ # Sales) ÷ (Ad Spend ÷ Paid Closes)</span></p>
        <p className="text-xs text-gray-500">Uses this month’s net revenue per close as a simple LTV proxy. You can refine later with true retention.</p>
      </div>
    ),

    // Time-based
    salesCycle: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Average days from first lead to sale.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>How it’s calculated</strong>: For each client, <em>close date − first lead date</em>; we average all.</p>
      </div>
    ),
    timeToBook: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: Average days from lead to first booking.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>How it’s calculated</strong>: For each lead, <em>first booking date − lead date</em>; we average all.</p>
      </div>
    ),
    fuConv: (
      <div className="space-y-2">
        <p><strong>What this shows</strong>: % of leads that converted after a follow-up was set.</p>
        <p><strong>Time window</strong>: {MonthToDate}.</p>
        <p><strong>Formula</strong>: <span className="inline-block rounded bg-gray-100 px-2 py-0.5">Sales with Follow-Up ÷ Leads with Follow-Up × 100</span></p>
      </div>
    ),
  };

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Subtle background glow */}
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

      {/* Eye modal */}
      <MiniModal open={!!modal} onClose={() => setModal(null)} title="How this metric works">
        {modal}
      </MiniModal>

      <main className="font-lato flex-1 overflow-auto p-5 sm:p-7 md:p-8 lg:p-9 ml-0 md:ml-72 transition-[margin] duration-200">
        {/* Top bar */}
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Macro1Tabs />
          <Link
            href={eventsHref}
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent,_#FF4F36)] px-4 py-2 text-white transition hover:brightness-110"
          >
            🗓 Data Entry Form
          </Link>
        </div>

        {/* Big loader (shows until all cards are computed) */}
        {!pageReady && (
          <div className="mx-auto mt-8 max-w-7xl">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200" style={{ borderTopColor: PRIMARY }} />
              <h3 className="mt-4 font-teko text-2xl text-gray-800">Loading…</h3>
              <p className="mt-1 text-base text-gray-700">Getting your dashboard ready</p>
              <RotatingQuote />
            </div>
          </div>
        )}

        {/* Content (renders while hidden so it’s instant when revealed) */}
        <div
          className={`mx-auto mt-8 max-w-7xl space-y-10 transform transition-all duration-700 ease-out ${
            pageReady && pageAnim ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-[0.98]"
          }`}
          aria-hidden={!pageReady}
        >
          {/* 1. KPI Overview */}
          <Show allow={overviewRoles}>
            <Section title="KPI Overview">
              <Card title="Total Leads" value={kpiTotalLeads} note="All Sources" borderColor={PRIMARY} iconBg="#EDEBFA" icon="📊" explain={explains.totalLeads} onExplain={openExplain} />
              <Card title="Booked consults" value={kpiBookedPct} note="Booked / Leads" borderColor={ACCENT} iconBg="#FFF1E8" icon="👥" explain={explains.bookedPct} onExplain={openExplain} />
              <Card title="Lead → Show" value={kpiLeadToShowPct} note="Showed / Booked" borderColor={ACCENT} iconBg="#FFF1E8" icon="⏰" explain={explains.leadToShow} onExplain={openExplain} />
              <Card title="Lead → Sale" value={kpiLeadToSalePct} note="Closed / Leads" borderColor={PRIMARY} iconBg="#EDEBFA" icon="💾" explain={explains.leadToSale} onExplain={openExplain} />
            </Section>
          </Show>

          {/* 2. Funnel Performance */}
          <Show allow={overviewRoles}>
            <Block title="Funnel Performance">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnelData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF2F7" />
                  <XAxis dataKey="name" tick={{ fill: "#1F2937", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#1F2937", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="value" fill={PRIMARY} barSize={36} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Block>
          </Show>

          {/* 3. Leads by Source (Phone) — collapsible */}
          <Show allow={overviewRoles}>
            <Block
              title="Leads By Source (Phone)"
              action={
                <ToggleButton
                  open={phoneOpen}
                  onClick={() => setPhoneOpen(v => !v)}
                  controlsId="phone-panel"
                />
              }
            >
              <div
                id="phone-panel"
                role="region"
                aria-hidden={!phoneOpen}
                className={`overflow-hidden transition-[max-height,margin] duration-500 ease-in-out ${
                  phoneOpen ? "max-h-[900px] mt-4" : "max-h-0 mt-0"
                }`}
              >
                <TableSimple rows={leadsBySourcePhone.map(r => [r.source, r.value])} />
                <div className="mt-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={leadsBySourcePhone} dataKey="value" nameKey="source" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ value }) => value}>
                        {leadsBySourcePhone.map((_, i) => (<Cell key={i} fill={funnelColors[i % funnelColors.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12 }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: "#111827" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Block>
          </Show>

          {/* 4. Leads by Source (Messages) — collapsible */}
          <Show allow={overviewRoles}>
            <Block
              title="Leads By Source (Messages)"
              action={
                <ToggleButton
                  open={msgOpen}
                  onClick={() => setMsgOpen(v => !v)}
                  controlsId="msg-panel"
                />
              }
            >
              <div
                id="msg-panel"
                role="region"
                aria-hidden={!msgOpen}
                className={`overflow-hidden transition-[max-height,margin] duration-500 ease-in-out ${
                  msgOpen ? "max-h-[900px] mt-4" : "max-h-0 mt-0"
                }`}
              >
                <TableSimple rows={leadsBySourceMessages.map(r => [r.source, r.value])} />
                <div className="mt-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={leadsBySourceMessages} dataKey="value" nameKey="source" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ value }) => value}>
                        {leadsBySourceMessages.map((_, i) => (<Cell key={i} fill={funnelColors[i % funnelColors.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12 }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: "#111827" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Block>
          </Show>

          {/* 5. Ad Efficiency & CAC */}
          <Show allow={moneyRoles}>
            <Section title="Ad Efficiency & CAC">
              <Card title="ROAS" value={cardROAS} note="Paid Only" borderColor={PRIMARY} iconBg="#EDEBFA" icon="💸" explain={explains.roas} onExplain={openExplain} />
              <Card title="CAC" value={cardCAC} note="Cost / Acquisition" borderColor={ACCENT} iconBg="#FFF1E8" icon="💰" explain={explains.cac} onExplain={openExplain} />
              <Card title="CPB" value={cardCPB} note="Cost / Booking" borderColor={PRIMARY} iconBg="#EDEBFA" icon="📞" explain={explains.cpb} onExplain={openExplain} />
              <Card title="CPL" value={cardCPL} note="Cost / Lead" borderColor={ACCENT} iconBg="#FFF1E8" icon="💵" explain={explains.cpl} onExplain={openExplain} />
              <Card title="CPS" value={cardCPS} note="Cost / Show" borderColor={PRIMARY} iconBg="#EDEBFA" icon="👤" explain={explains.cps} onExplain={openExplain} />
            </Section>
          </Show>

          {/* 6. Revenue Metrics/Ads */}
          <Show allow={moneyRoles}>
            <Section title="Revenue Metrics / Ads">
              <Card title="Total Revenue" value={cardRevenueTotal} note="All Payment Types" borderColor={PRIMARY} iconBg="#EDEBFA" icon="🤑" explain={explains.revenueTotal} onExplain={openExplain} />
              <Card title="AOV" value={cardAOV} note="Average Order Value" borderColor={ACCENT} iconBg="#FFF1E8" icon="📈" explain={explains.aov} onExplain={openExplain} />
              <Card title="Revenue / Lead" value={cardRevPerLead} note="Per Lead" borderColor={PRIMARY} iconBg="#EDEBFA" icon="🔗" explain={explains.revPerLead} onExplain={openExplain} />
              <Card title="Revenue / Rep" value={cardRevPerRep} note="By Closer" borderColor={ACCENT} iconBg="#FFF1E8" icon="👔" explain={explains.revPerRep} onExplain={openExplain} />
            </Section>
          </Show>

          {/* 8. Payment Reliability / Client Risk / Ads */}
          <Show allow={moneyRoles}>
            <Section title="Payment Reliability / Client Risk / Ads">
              <Card title="Refund Rate" value={cardRefundRate} note="Count-Based" borderColor={PRIMARY} iconBg="#EDEBFA" icon="🔙" explain={explains.refundRate} onExplain={openExplain} />
              <Card title="Failed Payment Rate" value={cardFailedPayRate} note="Active PP Clients" borderColor={ACCENT} iconBg="#FFF1E8" icon="❌" explain={explains.failedRate} onExplain={openExplain} />
              <Card title="Deposit-Only %" value={cardDepositOnly} note="Deposit Only" borderColor={PRIMARY} iconBg="#EDEBFA" icon="💸" explain={explains.depositOnly} onExplain={openExplain} />
            </Section>
          </Show>

          {/* 10. LTV & Efficiency (subset) */}
          <Show allow={moneyRoles}>
            <Section title="LTV & Efficiency">
              <Card title="Trial → HT" value={cardTrialToHT} note="Trial Conversion" borderColor={ACCENT} iconBg="#FFF1E8" icon="🕒" explain={explains.trialHT} onExplain={openExplain} />
              <Card title="MRR" value={cardMRR} note="Monthly Recurring" borderColor={PRIMARY} iconBg="#EDEBFA" icon="🔄" explain={explains.mrr} onExplain={openExplain} />
              <Card title="Net Revenue" value={cardNetRevenue} note="After Refunds" borderColor={ACCENT} iconBg="#FFF1E8" icon="✅" explain={explains.netRevenue} onExplain={openExplain} />
              {/* NEW: LTV:CAC */}
              <Card title="LTV:CAC" value={cardLTVtoCAC} note="MTD proxy" borderColor={PRIMARY} iconBg="#EDEBFA" icon="📊" explain={explains.ltvCac} onExplain={openExplain} />
            </Section>
          </Show>

          {/* 11. Time-Based Metrics */}
          <Show allow={overviewRoles}>
            <Section title="Time-Based Metrics">
              <Card title="Sales Cycle" value={cardSalesCycle} note="Avg to Close" borderColor={PRIMARY} iconBg="#EDEBFA" icon="⏳" explain={explains.salesCycle} onExplain={openExplain} />
              <Card title="Time to Book" value={cardTimeToBook} note="Lead → Booking" borderColor={ACCENT} iconBg="#FFF1E8" icon="📆" explain={explains.timeToBook} onExplain={openExplain} />
              <Card title="Follow-Up Conv" value={cardFollowUpConv} note="Follow-Up → Sale" borderColor={PRIMARY} iconBg="#EDEBFA" icon="↪️" explain={explains.fuConv} onExplain={openExplain} />
            </Section>
          </Show>

          {/* 12. Bookings by Channel */}
          <Show allow={overviewRoles}>
            <Block title="Bookings by Channel">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bookingsByChannel}>
                  <CartesianGrid stroke="#EEF2F7" />
                  <XAxis dataKey="channel" tick={{ fill: "#1F2937", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#1F2937", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#111827" }} />
                  <Bar dataKey="sent"   name="Sent"   fill={PRIMARY} barSize={30} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="booked" name="Booked" fill={ACCENT}  barSize={30} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Block>
          </Show>

          {/* 15. Sales Rep Performance */}
          <Show allow={overviewRoles}>
            <Block title="Sales Rep Performance (Weekly)">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={repOverTime}>
                  <CartesianGrid stroke="#EEF2F7" />
                  <XAxis dataKey="week" tick={{ fill: "#1F2937", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#1F2937", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#111827" }} />
                  <Line type="monotone" dataKey="sales" stroke={ACCENT} strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </Block>
          </Show>

          {/* 16. Source ROI */}
          <Show allow={moneyRoles}>
            <Block title="Source ROI (ROAS)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sourceROI}>
                  <CartesianGrid stroke="#EEF2F7" />
                  <XAxis dataKey="source" tick={{ fill: "#1F2937", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#1F2937", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="roas" name="ROAS" fill={PRIMARY} barSize={36} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Block>
          </Show>

          {/* 17. Top Performing Reps */}
          {(() => {
            const { role } = useRole();
            return (
              <Show allow={overviewRoles}>
                <Block title={role === "trainer" ? "Performance" : "Top Performing Reps"}>
                  <div className="overflow-auto rounded-xl border border-gray-200">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-left text-sm text-gray-700">
                          {role !== "trainer" && <th className="px-4 py-3">Rep</th>}
                          <th className="px-4 py-3 text-center">Held</th>
                          <th className="px-4 py-3 text-center">Closed</th>
                          <th className="px-4 py-3 text-center">Show %</th>
                          <th className="px-4 py-3 text-center">Close %</th>
                          <th className="px-4 py-3 text-center">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topReps.map((rep, i) => (
                          <tr key={rep.name + i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                            {role !== "trainer" && (
                              <td className="px-4 py-3">
                                <a href="#" onClick={(e) => e.preventDefault()} className="font-medium text-[color:var(--accent,_#FF4F36)] hover:underline">
                                  {rep.name}
                                </a>
                              </td>
                            )}
                            <td className=" text-gray-600 px-4 py-3 text-center">{rep.held}</td>
                            <td className=" text-gray-600 px-4 py-3 text-center">{rep.closed}</td>
                            <td className=" text-gray-600 px-4 py-3 text-center">{rep.showRate}%</td>
                            <td className=" text-gray-600 px-4 py-3 text-center">{rep.closeRate}%</td>
                            <td className=" text-gray-600 px-4 py-3 text-center">${rep.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Block>
              </Show>
            );
          })()}
        </div>
      </main>
    </div>
  );
}

/* ===== Presentational primitives ===== */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-teko text-3xl sm:text-4xl tracking-tight mb-6" style={{ color: PRIMARY }}>
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

// NEW: tiny action button for block headers (for perfect symmetry)
function ToggleButton({
  open,
  onClick,
  controlsId,
}: {
  open: boolean;
  onClick: () => void;
  controlsId: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onClick}
      className="inline-grid h-9 w-40 place-items-center rounded-lg border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{ outlineColor: PRIMARY as any }}
    >
      <span className="sr-only">{open ? "Collapse" : "Expand"}</span>
      <span aria-hidden className="text-xl leading-none">{open ? "−" : "+"}</span>
    </button>
  );
}

function Block({ title, children, action }: React.PropsWithChildren<{ title: string; action?: React.ReactNode }>) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_8px_30px_rgba(2,12,27,0.06)]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-teko text-2xl sm:text-3xl" style={{ color: PRIMARY }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Card({
  title, value, note, borderColor, iconBg, icon, explain, onExplain,
}: {
  title: string;
  value: string;
  note: string;
  borderColor: string;
  iconBg?: string;
  icon: React.ReactNode;
  explain?: React.ReactNode;
  onExplain?: (content: React.ReactNode) => void;
}) {
  return (
    <div className="relative group flex min-h-[116px] items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_8px_30px_rgba(2,12,27,0.06)]">
      {/* left accent line */}
      <span className="mr-1 h-14 w-[3px] rounded-full" style={{ background: borderColor }} aria-hidden />

      {/* Eye icon (client-friendly explain) */}
      {explain && onExplain && (
        <button
          type="button"
          aria-label="How this is calculated"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          onClick={() => onExplain(explain)}
        >
          <Eye className="h-4 w-4" />
        </button>
      )}

      <div className="grid h-12 w-12 place-items-center rounded-full" style={{ backgroundColor: iconBg || "#F6F7FB" }}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="min-w-0">
        <h3 className="text-[13px] md:text-[14px] font-medium text-gray-700">{title}</h3>
        <p className="truncate text-[28px] md:text-[32px] font-bold leading-tight text-gray-900">{value}</p>
        <p className="text-xs md:text-sm text-gray-500">{note}</p>
      </div>
    </div>
  );
}

function TableSimple({ rows }: { rows: Array<[string, number]> }) {
  return (
    <table className="w-full table-auto text-sm">
      <tbody>
        {rows.map(([label, val]) => (
          <tr key={label} className="border-t last:border-b">
            <td className="px-3 py-2 text-gray-700">{label}</td>
            <td className="px-3 py-2 text-right font-medium text-gray-900">{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
