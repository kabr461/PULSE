// app/components/Macro1Tabs.tsx
"use client";

import React, { useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole, type AppRole } from "@/lib/role";

const PRIMARY = "#3B2F6D";

const tabAccess: { label: string; href: string; allow: AppRole[] }[] = [
  { label: "Overview",        href: "/kpi-dashboard",                 allow: ["trainer","closer","front-desk","va","owner","coach","ptsi-intern","admin"] },
  { label: "Dropdowns",       href: "/kpi-dashboard/dropdowns",       allow: ["owner","ptsi-intern","admin"] },
  { label: "Phone Setting",   href: "/kpi-dashboard/phone-setting",   allow: ["trainer","closer","front-desk","va","owner","coach","ptsi-intern","admin"] },
  { label: "DM Setting",      href: "/kpi-dashboard/dm-message-setting", allow: ["trainer","closer","front-desk","va","owner","coach","ptsi-intern","admin"] },
  { label: "Email",           href: "/kpi-dashboard/email",           allow: ["front-desk","va","owner","coach","ptsi-intern","admin"] },
  { label: "Consults",        href: "/kpi-dashboard/consult-outcomes",allow: ["trainer","closer","front-desk","va","owner","coach","ptsi-intern","admin"] },
];

export default function Macro1Tabs() {
  const { role } = useRole();
  const pathname = usePathname();

  const tabs = useMemo(
    () => tabAccess.filter(t => (role ? t.allow.includes(role as AppRole) : false)),
    [role]
  );

  // Longest-path match so /kpi-dashboard/email beats /kpi-dashboard
  const activeIndex = useMemo(() => {
    let best = -1, bestLen = -1;
    tabs.forEach((t, i) => {
      const exact  = pathname === t.href;
      const prefix = pathname.startsWith(t.href + "/");
      if (exact || prefix) {
        const score = t.href.length + (exact ? 1 : 0);
        if (score > bestLen) { best = i; bestLen = score; }
      }
    });
    return best === -1 ? 0 : best;
  }, [pathname, tabs]);

  // keep active in view on narrow screens
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIndex]);

  if (!tabs.length) return null;

  return (
    <div className="w-full">
      {/* Sticky header on phones; compact card on desktop */}
      <div className="sticky top-0 z-40 bg-white md:static md:z-auto md:bg-transparent">
        <div
          role="tablist"
          aria-label="KPI sub-navigation"
          className={[
            "relative flex items-center gap-1",
            "h-10 md:h-12",
            "overflow-x-auto no-scrollbar",
            "px-2 md:px-3",
            "border-b border-gray-200 bg-white",
            "md:w-fit md:rounded-2xl md:border md:bg-white/85 md:backdrop-blur",
            "md:shadow-[0_8px_30px_rgba(2,12,27,0.06)]",
          ].join(" ")}
        >
          {tabs.map((t, i) => {
            const active = i === activeIndex;
            return (
              <Link
                key={t.label}
                href={t.href}
                ref={el => {
                  itemRefs.current[i] = el;
                }}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative whitespace-nowrap rounded-xl",
                  "px-3 md:px-4 py-1.5 md:py-2",
                  "font-teko tracking-wide",
                  "text-[15px] md:text-[17px]",
                  "transition-colors focus:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-offset-2",
                  active
                    ? "bg-[rgba(47,27,102,0.10)] ring-1 ring-[rgba(47,27,102,0.22)] text-[color:var(--brand)]"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                style={{ ["--brand" as any]: PRIMARY }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* subtle divider */}
      <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      {/* Hide scrollbars without styled-jsx (prevents parse errors) */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            ".no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}",
        }}
      />
    </div>
  );
}
