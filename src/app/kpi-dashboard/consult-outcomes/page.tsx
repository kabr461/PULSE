// src/app/kpi-dashboard/consult-outcomes/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import Macro1Tabs from "../../components/Macro1Tabs";
import { useRole, Show, AppRole } from "@/lib/role";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
// ⬇️ removed useSearchParams import
// import { useSearchParams } from "next/navigation";

/* ========= Theme (visual only) ========= */
const PRIMARY = "#2F1B66"; // deep indigo
const ACCENT  = "#FF4F36"; // coral

const moneyRoles: AppRole[] = ["owner","coach","ptsi-intern","admin"];

/* ───────────────────────── constants / vocab ───────────────────────── */
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
  "Not Listed / Other",
];

// map consult-page objection → booking-page objection bucket
const OBJECTION_TO_BOOKING: Record<string, "Price"|"Timing"|"Need More Info"|"Other"> = {
  "Too Expensive / No Budget": "Price",
  "Not the Right Time": "Timing",
  "Need to Think About It": "Need More Info",
  "Not Interested / Just Looking": "Other",
  "Need to Talk to Spouse": "Other",
  "Lack of Self-Belief": "Other",
  "Tried Everything Before": "Other",
  "Already Working with Someone": "Other",
  "Wants to Do It On Their Own": "Other",
  "Schedule / Availability Conflict": "Other",
  "Not Listed / Other": "Other",
};

// treat these as paid
const PAID_SOURCES = new Set<string>([
  "Facebook Ads (Lead Form)",
  "Google Ads / SEO",
]);

// sub-category mapping keyed by the dropdown label (lower-cased)
const SUBCAT_TO_SOURCES: Record<string, string[]> = {
  "meta ads": ["Facebook Ads (Lead Form)"],
  "google ads": ["Google Ads / SEO"],
  "tiktok ads": ["TikTok / YouTube / Other Organic"],
};

/* ───────────────────────── helpers ───────────────────────── */
function monthWindow() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

type RawRow = {
  id: string;
  gym_id: string;
  profile_id: string;
  event_type: string;
  submission_date: string;
  lead_id: string | null;
  payload: any;
};
type ClientRow = { id: string; display_name: string | null; payload: any };

/* ───────────────────────── Page ───────────────────────── */
export default function ConsultOutcomesPage() {
  const { role } = useRole();
  const session = useSession();
  const supabase = useSupabaseClient();

  // ⬇️ client-only replacement for useSearchParams()
  const [search, setSearch] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSearch(new URLSearchParams(window.location.search));
    }
  }, []);

  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [clientsMap, setClientsMap] = useState<Map<string, ClientRow>>(new Map());

  // URL filters (from universal filters page)
  const filterObjection = ((search?.get("objection") || "").trim());               // e.g. "Too Expensive / No Budget"
  const filterSourceRaw = ((search?.get("consult_source") || "").trim().toLowerCase()); // e.g. "Paid Ads" or "paid"
  const filterSource    = filterSourceRaw === "paid ads" ? "paid" : filterSourceRaw;
  const filterSubcat    = ((search?.get("consult_subcat") || "").trim().toLowerCase()); // e.g. "Meta Ads"

  const hasAnyFilter = !!(filterObjection || filterSource || filterSubcat);

  // formatters
  const fmtInt = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }), []);
  const fmtCurrency0 = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
    []
  );

  /* resolve gym */
  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return;
      if (role === "admin") {
        const id = search?.get("gym_id") || null;
        setActiveGymId(id);
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

  /* pull raw entries + clients */
  useEffect(() => {
    (async () => {
      if (!activeGymId) {
        setRows([]);
        setClientsMap(new Map());
        return;
      }
      const { startISO, endISO } = monthWindow();

      const { data, error } = await supabase
        .from("raw_entries")
        .select("id,gym_id,profile_id,event_type,submission_date,lead_id,payload")
        .eq("gym_id", activeGymId)
        .gte("submission_date", startISO)
        .lt("submission_date", endISO);
      if (error) {
        console.error("raw_entries error", error);
        setRows([]);
        setClientsMap(new Map());
        return;
      }
      const re = (data || []) as RawRow[];
      setRows(re);

      const leadIds = Array.from(new Set(re.map(r => r.lead_id).filter(Boolean))) as string[];
      if (!leadIds.length) {
        setClientsMap(new Map());
        return;
      }
      const { data: clientRows, error: cErr } = await supabase
        .from("clients")
        .select("id,display_name,payload")
        .in("id", leadIds);
      if (cErr) {
        console.error("clients error", cErr);
        setClientsMap(new Map());
        return;
      }
      const map = new Map<string, ClientRow>();
      (clientRows || []).forEach((c: any) => map.set(c.id, c as ClientRow));
      setClientsMap(map);
    })();
  }, [activeGymId, supabase]);

  /* group by event type */
  const byType = useMemo(() => {
    const acc: Record<string, RawRow[]> = {};
    rows.forEach(r => {
      (acc[r.event_type] ||= []).push(r);
    });
    return acc;
  }, [rows]);

  /* derive metrics for general (unfiltered) view */
  const metrics = useMemo(() => {
    if (!activeGymId) {
      return [
        { title: "Call Volume",            value: "0" },
        { title: "Consults Held (CH)",     value: "0" },
        { title: "Show Rate (%)",          value: "0%" },
        { title: "No-Shows (NS)",          value: "0" },
        { title: "No-Show Rate (%)",       value: "0%" },
        { title: "Qualified Leads (QL)",   value: "0" },
        { title: "Qualification Rate (%)", value: "0%" },
        { title: "Unqualified Leads (UQL)",value: "0" },
        { title: "Unqualified Rate (%)",   value: "0%" },
        { title: "Sales Closed (SC)",      value: "0" },
        { title: "Close Rate (%)",         value: "0%" },
        { title: "Total Revenue (TR)",     value: "$0" },
        { title: "Avg Order Value (AOV)",  value: "$0" },
        { title: "Follow-Ups Set (FU)",    value: "0" },
        { title: "Follow-Up Rate (%)",     value: "0%" },
        { title: "QL / Not Pitched UQL",   value: "0%" },
      ];
    }

    // Booked
    const booked = (byType["BOOKING_CREATED"] || []).length;

    // Shows / No-shows (from SHOW_RECORDED.outcome)
    const showRows = (byType["SHOW_RECORDED"] || []);
    const shows = showRows.filter(r => {
      const o = (r.payload?.outcome || "").toString().toLowerCase();
      return o.includes("show");
    }).length;
    const noShows = showRows.filter(r => {
      const o = (r.payload?.outcome || "").toString().toLowerCase();
      return o.includes("no") && o.includes("show");
    }).length;

    // Phone call volume
    const callVolume = (byType["PHONE_SUMMARY"] || [])
      .reduce((s, r) => s + Number(r.payload?.total_dials || 0), 0);

    // Qualified / Unqualified from CONSULT_SUMMARY (if captured)
    const consultAgg = (byType["CONSULT_SUMMARY"] || []);
    const sumField = (k: string) =>
      consultAgg.reduce((s, r) => s + Number(r.payload?.[k] || 0), 0);

    const ql  = sumField("qualified_leads");
    const uql = sumField("unqualified_leads");
    const qualRate = (ql + uql) ? Math.round((ql / (ql + uql)) * 100) : 0;
    const unqualRate = (ql + uql) ? Math.round((uql / (ql + uql)) * 100) : 0;

    // Closes & revenue
    const sales = (byType["SALE_RECORDED"] || []);
    const closes = sales.length;
    const totalRevenue = sales.reduce((s, r) => s + Number(r.payload?.total_paid || 0), 0);
    const aov = closes ? Math.round(totalRevenue / closes) : 0;

    // Rates
    const showRate = booked ? Math.round((shows / booked) * 100) : 0;
    const noShowRate = booked ? Math.round((noShows / booked) * 100) : 0;
    const closeRate = shows ? Math.round((closes / shows) * 100) : 0;

    // Follow-ups
    const fu = (byType["FOLLOW_UP_SET"] || []).length;
    const fuRate = shows ? Math.round((fu / shows) * 100) : 0;

    // QL / Not Pitched UQL (avg from summaries if present)
    const qlNotPitched = (() => {
      const vals = consultAgg.map(r => Number(r.payload?.ql_not_pitched_uql || 0)).filter(Number.isFinite);
      if (!vals.length) return 0;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    })();

    return [
      { title: "Call Volume",            value: fmtInt.format(callVolume) },
      { title: "Consults Held (CH)",     value: fmtInt.format(shows) },
      { title: "Show Rate (%)",          value: `${showRate}%` },
      { title: "No-Shows (NS)",          value: fmtInt.format(noShows) },
      { title: "No-Show Rate (%)",       value: `${noShowRate}%` },
      { title: "Qualified Leads (QL)",   value: fmtInt.format(ql) },
      { title: "Qualification Rate (%)", value: `${qualRate}%` },
      { title: "Unqualified Leads (UQL)",value: fmtInt.format(uql) },
      { title: "Unqualified Rate (%)",   value: `${unqualRate}%` },
      { title: "Sales Closed (SC)",      value: fmtInt.format(closes) },
      { title: "Close Rate (%)",         value: `${closeRate}%` },
      { title: "Total Revenue (TR)",     value: fmtCurrency0.format(Math.round(totalRevenue)) },
      { title: "Avg Order Value (AOV)",  value: fmtCurrency0.format(aov) },
      { title: "Follow-Ups Set (FU)",    value: fmtInt.format(fu) },
      { title: "Follow-Up Rate (%)",     value: `${fuRate}%` },
      { title: "QL / Not Pitched UQL",   value: `${qlNotPitched}%` },
    ];
  }, [activeGymId, byType, fmtCurrency0, fmtInt]);

  /* Payment mix from SALE_RECORDED */
  const paymentMethods = useMemo(() => {
    if (!activeGymId) {
      return [
        { method: "Paid In Full (PIF)", pct: "0%" },
        { method: "Payment Plan (PP)",  pct: "0%" },
        { method: "Down Payment (DP)",  pct: "0%" },
      ];
    }
    const sales = (byType["SALE_RECORDED"] || []);
    const total = sales.length || 1;
    const count = { PIF: 0, PP: 0, DP: 0 } as Record<string, number>;
    sales.forEach(r => {
      const t = (r.payload?.payment_type || "").toUpperCase();
      if (count[t] != null) count[t] += 1;
    });
    const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
    return [
      { method: "Paid In Full (PIF)", pct: pct(count.PIF) },
      { method: "Payment Plan (PP)",  pct: pct(count.PP)  },
      { method: "Down Payment (DP)",  pct: pct(count.DP)  },
    ];
  }, [activeGymId, byType]);

  /* Objection trends from CONSULT_SUMMARY */
  const objectionCounts = useMemo(() => {
    const totals: Record<string, number> = {};
    OBJECTIONS.forEach(o => { totals[o] = 0; });
    if (!activeGymId) return totals;

    const sumRows = (byType["CONSULT_SUMMARY"] || []);
    sumRows.forEach(r => {
      OBJECTIONS.forEach(o => {
        const key = o.replace(/\W/g, "_").toLowerCase(); // matches form keys
        const v = Number(r.payload?.[key] || 0);
        totals[o] += Number.isFinite(v) ? v : 0;
      });
    });
    return totals;
  }, [activeGymId, byType]);

  /* Matching clients when filters are present (AND logic) */
  const matchingClients = useMemo(() => {
    if (!activeGymId || !hasAnyFilter) return [];

    // start with all lead_ids seen this month
    let leadSet = new Set<string>(
      rows.map(r => r.lead_id).filter(Boolean) as string[]
    );

    // consult_source filter (accept "paid" or "Paid Ads")
    if (filterSource) {
      const keepPaid = filterSource.includes("paid");
      leadSet = new Set(
        Array.from(leadSet).filter(lid => {
          const c = clientsMap.get(lid);
          const src = (c?.payload?.lead_source || "") as string;
          const isPaid = PAID_SOURCES.has(src);
          return keepPaid ? isPaid : !isPaid;
        })
      );
    }

    // sub_category filter ("Meta Ads" / "Google Ads" / "TikTok Ads")
    if (filterSubcat && SUBCAT_TO_SOURCES[filterSubcat]) {
      const allowed = new Set(SUBCAT_TO_SOURCES[filterSubcat]);
      leadSet = new Set(
        Array.from(leadSet).filter(lid => {
          const c = clientsMap.get(lid);
          const src = (c?.payload?.lead_source || "") as string;
          return allowed.has(src);
        })
      );
    }

    // objection filter — map to booking objection buckets
    if (filterObjection) {
      const bucket = OBJECTION_TO_BOOKING[filterObjection] || null;
      if (bucket) {
        const hadBucket = new Set(
          (byType["BOOKING_CREATED"] || [])
            .filter(r => {
              if (!r.lead_id) return false;
              const arr = (r.payload?.objections || []) as string[];
              return Array.isArray(arr) && arr.includes(bucket);
            })
            .map(r => r.lead_id!) // defined by filter above
        );
        leadSet = new Set(Array.from(leadSet).filter(lid => hadBucket.has(lid)));
      } else {
        leadSet = new Set();
      }
    }

    // map to client display names (dedup)
    const out = Array.from(leadSet).map(lid => {
      const c = clientsMap.get(lid);
      return (c?.display_name || `Client ${lid.slice(0, 6)}`) as string;
    });
    out.sort((a, b) => a.localeCompare(b));
    return out;
  }, [activeGymId, hasAnyFilter, rows, clientsMap, filterSource, filterSubcat, filterObjection, byType]);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-white relative">
      {/* Themed background glow */}
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
          <Macro1Tabs />

          <header className="flex items-start justify-between">
            <div>
              <h2
                className="font-teko text-3xl sm:text-4xl tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
              >
                KPI – Consult Outcomes
              </h2>
              <p className="text-sm text-gray-600 mt-1">This month to date</p>
            </div>
          </header>

          {/* ───────── Filtered mode: only show matching clients ───────── */}
          {hasAnyFilter ? (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card
                  title="Clients Matching"
                  value={fmtInt.format(matchingClients.length)}
                  borderColor={PRIMARY}
                  icon="👥"
                  iconBg="#EDEBFA"
                />
              </section>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_8px_30px_rgba(2,12,27,0.06)]">
                <div className="text-sm text-gray-700">
                  {matchingClients.length
                    ? matchingClients.join(", ")
                    : "No clients match the selected filters."}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ───────── General Overview (no filters) ───────── */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map(({ title, value }) => {
                  if (
                    (title === "Total Revenue (TR)" || title === "Avg Order Value (AOV)") &&
                    !(moneyRoles as AppRole[]).includes(role as AppRole)
                  ) {
                    return null;
                  }
                  return (
                    <Card
                      key={title}
                      title={title}
                      value={value}
                      borderColor={PRIMARY}
                      icon="📈"
                      iconBg="#EDEBFA"
                    />
                  );
                })}
              </section>

              {/* Objection trends */}
              <h3 className="font-teko text-2xl mt-8" style={{ color: PRIMARY }}>
                Objection Trends
              </h3>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {OBJECTIONS.map(obj => (
                  <Card
                    key={obj}
                    title={obj}
                    value={`${objectionCounts[obj] || 0}`}
                    borderColor={ACCENT}
                    icon="❌"
                    iconBg="#FFF1E8"
                  />
                ))}
              </section>

              {/* Payment mix */}
              <Show allow={moneyRoles}>
                <h3 className="font-teko text-2xl mt-8" style={{ color: PRIMARY }}>
                  Payment Type Distribution
                </h3>
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {paymentMethods.map(pm => (
                    <Card
                      key={pm.method}
                      title={pm.method}
                      value={pm.pct}
                      borderColor={ACCENT}
                      icon="💰"
                      iconBg="#FFF1E8"
                    />
                  ))}
                </section>
              </Show>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ───────────────────────── Card component (visual refresh only) ───────────────────────── */
function Card({
  title,
  value,
  borderColor,
  icon,
  iconBg,
}: {
  title: string;
  value: string;
  borderColor: string;
  icon: string;
  iconBg: string;
}) {
  return (
    <div className="relative group flex min-h-[112px] items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_8px_30px_rgba(2,12,27,0.06)]">
      {/* left accent line */}
      <span className="mr-1 h-14 w-[3px] rounded-full" style={{ background: borderColor }} aria-hidden />
      <div className="grid h-12 w-12 place-items-center rounded-full" style={{ backgroundColor: iconBg }}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="min-w-0">
        <h3 className="text-[13px] md:text-[14px] font-medium text-gray-700">{title}</h3>
        <p className="truncate text-[28px] md:text-[32px] font-bold leading-tight text-gray-900">{value}</p>
      </div>
    </div>
  );
}
