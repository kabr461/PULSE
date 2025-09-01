// src/app/components/Sidebar.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import { useRouter, usePathname } from "next/navigation";
import { useRole } from "@/lib/role";
import {
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Link2,
  Clapperboard,
  Users,
  Settings,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Check,
} from "lucide-react";

/* Brand */
const BRAND_PRIMARY = "#2F1B66";
const BRAND_ACCENT  = "#FF4F36";

type SavedSession = {
  userId:        string;
  email:         string;
  display_name:  string;
  avatar_url:    string | null;
  access_token:  string;
  refresh_token: string;
};

const LOCAL_STORAGE_KEY = "pulse_saved_sessions";
const SELECTED_GYM_KEY  = "pulse_selected_gym_id";
const INTRO_SEEN_KEY    = "pulse_sidebar_intro_seen";

/* Nav + icons */
type NavLink = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  match?: (pathname: string) => boolean;
};

const NAV_LINKS: NavLink[] = [
  { label: "Dashboard",       icon: LayoutDashboard, href: "/dashboard" },
  { label: "KPI Performance", icon: BarChart3,       href: "/kpi-dashboard" },
  { label: "Retention & LTV", icon: TrendingUp,      href: "/retention-ltv" },
  { label: "Referrals",       icon: Link2,           href: "/referrals" },
  { label: "Social & Content",icon: Clapperboard,    href: "/social-content" },
  { label: "Roleplay QA",     icon: Users,           href: "/roleplay-qa" },
  { label: "Admin / SOP",     icon: Settings,        href: "/admin-sop" },
  { label: "6WC Tracker",     icon: CheckCircle2,    href: "/6WC/dashboard", match: p => p.startsWith("/6WC") },
];

/* Access */
const ALLOWED_PAGES: Record<string, string[]> = {
  client: [""],
  trainer: ["Dashboard","KPI Performance","Retention & LTV","Referrals","Social & Content","Roleplay QA","6WC Tracker"],
  closer:  ["Dashboard","KPI Performance","Retention & LTV","Referrals","Social & Content","Roleplay QA","6WC Tracker"],
  "front-desk": ["Dashboard","KPI Performance","Retention & LTV","Referrals","Social & Content","Roleplay QA","6WC Tracker"],
  va: ["Dashboard","KPI Performance","Retention & LTV","Referrals","Social & Content","Roleplay QA","6WC Tracker"],
  "va-training": [""],
  coach: ["Dashboard","KPI Performance","Retention & LTV","Referrals","Social & Content","6WC Tracker"],
  owner: ["Dashboard","KPI Performance","Retention & LTV","Referrals","Social & Content","Roleplay QA","Admin / SOP","6WC Tracker"],
  "ptsi-intern": ["Dashboard","KPI Performance","Retention & LTV","Referrals","Social & Content","Roleplay QA","Admin / SOP","6WC Tracker"],
  admin: ["Dashboard","KPI Performance","Retention & LTV","Referrals","Social & Content","Roleplay QA","Admin / SOP","6WC Tracker"],
};

/* Only these two are “active”; others show “Soon” */
const ACTIVE_LABELS = new Set(["Dashboard", "KPI Performance"]);

type GymRow = { id: string } & Record<string, any>;
const GYM_LABEL_FIELDS = ["name","title","display_name"];
const labelGym = (g: GymRow) => {
  for (const f of GYM_LABEL_FIELDS) if (g[f]) return String(g[f]);
  return g.id;
};

export default function Sidebar() {
  const { role } = useRole();
  const router   = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") setSearch(new URLSearchParams(window.location.search));
  }, []);

  useEffect(() => { if (role === "va-training") router.replace("/admin-sop/va-progress"); }, [role, router]);
  if (role === "va-training") return null;

  const allowed  = ALLOWED_PAGES[role] || [];
  const supabase = useSupabaseClient();
  const session  = useSession();

  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [profile, setProfile] = useState<{ display_name: string; email: string; avatar_url: string | null; } | null>(null);

  // gyms
  const [gyms, setGyms] = useState<GymRow[]>([]);
  const [gymsLoading, setGymsLoading] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string>("");

  // Load gyms
  useEffect(() => {
    if (role !== "admin" && role !== "ptsi-intern") return;
    let cancelled = false;
    (async () => {
      setGymsLoading(true);
      const { data, error } = await supabase.from("gyms").select("*");
      if (!cancelled) {
        if (error) console.error("sidebar gyms list error", error);
        setGyms((data as GymRow[]) || []);
        setGymsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [role, supabase]);

  // sticky gym
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(SELECTED_GYM_KEY) || "";
    setSelectedGymId(stored);
  }, []);

  // sync ?gym_id
  useEffect(() => {
    if (!(role === "admin" || role === "ptsi-intern")) return;
    if (!selectedGymId || !search) return;
    const current = search.get("gym_id") || "";
    if (current === selectedGymId) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(search.toString());
      params.set("gym_id", selectedGymId);
      router.push(`${pathname}?${params.toString()}`);
    }, 250);
    return () => clearTimeout(timer);
  }, [role, selectedGymId, pathname, search, router]);

  // sessions
  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) setSavedSessions(JSON.parse(raw));
  }, []);

  // profile
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("profiles").select("display_name,email,avatar_url").eq("id", session.user.id).single()
      .then(({ data }) => data && setProfile(data));
  }, [session, supabase]);

  // prepend current
  useEffect(() => {
    if (!session?.user || !profile) return;
    const entry: SavedSession = {
      userId: session.user.id,
      email: session.user.email!,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      access_token: session.access_token!,
      refresh_token: session.refresh_token!,
    };
    setSavedSessions(prev => {
      const filtered = prev.filter(x => x.userId !== entry.userId);
      const updated  = [entry, ...filtered].slice(0, 10);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [session, profile]);

  const clearSelectedGym = () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(SELECTED_GYM_KEY);
    setSelectedGymId("");
  };

  const handleSwitch = async (entry: SavedSession) => {
    setSwitchError(null);
    setSwitching(true);
    clearSelectedGym();
    const { error } = await supabase.auth.setSession({
      access_token:  entry.access_token,
      refresh_token: entry.refresh_token,
    });
    if (error) {
      setSwitchError("Switch failed. Try again.");
      setSwitching(false);
      return;
    }
    setOpen(false);
    setMobileOpen(false);
    router.refresh();
    setSwitching(false);
  };

  const handleSignOut = async () => {
    clearSelectedGym();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // click-outside account menu
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const switchList = savedSessions.filter(x => x.userId !== session?.user?.id);

  // Keep gym_id in links
  const withGymParam = (href: string) => {
    if (!selectedGymId) return href;
    const hasQuery = href.includes("?");
    return `${href}${hasQuery ? "&" : "?"}gym_id=${encodeURIComponent(selectedGymId)}`;
  };

  // active
  const isActive = (link: NavLink) => {
    if (link.match) return link.match(pathname);
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  /* CSS-only intro animation (first visit per session) */
  const [intro, setIntro] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem(INTRO_SEEN_KEY);
    if (!seen) {
      setIntro(true);
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      const t = setTimeout(() => setIntro(false), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  /* --- Custom Dropdown state --- */
  const [gymOpen, setGymOpen] = useState(false);
  const gymBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (gymBoxRef.current && !gymBoxRef.current.contains(e.target as Node)) setGymOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const handleSelectGym = (val: string) => {
    sessionStorage.setItem(SELECTED_GYM_KEY, val);
    setSelectedGymId(val);
    setGymOpen(false);
    setMobileOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (val) params.set("gym_id", val);
    else params.delete("gym_id");
    const next = params.toString();
    router.push(`${window.location.pathname}${next ? `?${next}` : ""}`);
  };

  const selectedGymLabel =
    selectedGymId && gyms.find((g) => g.id === selectedGymId)
      ? labelGym(gyms.find((g) => g.id === selectedGymId)!)
      : "Choose a gym…";

  return (
    <>
      {/* Mobile burger */}
      <button
        aria-label="Open menu"
        className="md:hidden fixed top-4 left-4 z-[100] grid h-10 w-10 place-items-center rounded-lg text-white shadow"
        style={{ backgroundColor: BRAND_PRIMARY }}
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay (fade) */}
      <div
        className={`md:hidden fixed inset-0 z-[90] bg-black/50 transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Switcher loader */}
      <div className={`fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/60 transition-opacity duration-300 ${switching ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
        <h1 className="mb-1 font-teko text-4xl" style={{ color: BRAND_ACCENT }}>Pulse PTSI</h1>
        <p className="text-white tracking-wide">Loading…</p>
      </div>

      {/* Sidebar */}
      <nav
        className={`
          sidebar-scroll
          fixed top-0 left-0 z-[110] h-full w-64 sm:w-72 max-w-[100vw]
          text-white
          overflow-y-auto overflow-x-hidden overscroll-contain
          [backface-visibility:hidden] will-change-transform
          shadow-[0_10px_40px_rgba(2,12,27,0.25)]
          transform transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${intro ? "-translate-x-4 opacity-0" : "opacity-100"}
        `}
        style={{
          background: `linear-gradient(180deg, ${BRAND_PRIMARY} 0%, #20154A 100%)`,
          contain: "paint layout", // prevents tiny transform-induced overflow
        }}
      >
        {/* subtle top shimmer strip */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-10 opacity-70"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02), rgba(255,255,255,0.12))",
            maskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        />

        {/* inner */}
        <div className="relative px-5 pb-8 pt-12">
          {/* Close (mobile) */}
          <button
            aria-label="Close menu"
            className="md:hidden absolute right-4 top-4 grid h-9 w-9 place-items-center rounded bg-white/10 hover:bg-white/20 transition"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Account avatar + menu */}
          <div ref={menuRef} className="absolute left-5 top-4">
            <button
              onClick={() => setOpen(o => !o)}
              className="h-10 w-10 overflow-hidden rounded-full border-2 border-white transition hover:scale-105"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/assets/profile.png" alt="Default" className="h-full w-full object-cover" />
              )}
            </button>

            {/* Account menu */}
            <div
              className={`
              ${open ? "pointer-events-auto opacity-100 translate-y-0 scale-100" : "pointer-events-none opacity-0 translate-y-1 scale-[0.98]"}
              transition-all duration-200 origin-top-left
              absolute mt-2 w-60 overflow-hidden rounded-lg bg-white text-black shadow-xl z-[200]
              `}
            >
              <div className="border-b px-4 py-3">
                <p className="font-semibold">{profile?.display_name}</p>
                <p className="truncate text-sm text-gray-600">{profile?.email}</p>
              </div>
              <div className="border-b px-2 py-2">
                <button onClick={handleSignOut} className="block w-full rounded px-2 py-1.5 text-left text-sm text-red-600 hover:bg-gray-100">
                  Sign out
                </button>
                <Link href="/profile" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100">
                  Manage account
                </Link>
                <Link href="/help" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100">
                  Help / Contact
                </Link>
              </div>

              {switchList.length > 0 && (
                <div className="px-3 py-2">
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">{switching ? "Switching…" : "Switch accounts"}</p>
                  {switchError && <p className="mb-2 text-sm text-red-600">{switchError}</p>}
                  {switchList.map(acc => (
                    <div key={acc.userId} className="flex items-center gap-2 py-1">
                      <button
                        onClick={() => handleSwitch(acc)}
                        disabled={switching}
                        className="flex flex-1 items-center gap-2 rounded px-2 py-1 hover:bg-gray-100"
                      >
                        <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {acc.avatar_url ? <img src={acc.avatar_url} alt={acc.display_name} className="h-full w-full object-cover" /> : <img src="/assets/profile.png" alt="Default" className="h-full w-full object-cover" />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm">{acc.display_name}</p>
                          <p className="truncate text-xs text-gray-500">{acc.email}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          const filtered = savedSessions.filter(s => s.userId !== acc.userId);
                          setSavedSessions(filtered);
                          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
                        }}
                        disabled={switching}
                        className="px-1 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Logo + title (h-16, w-auto) */}
          <div className="mb-6 -mt-6 flex flex-col items-center" style={{ marginTop: "4px" }}>
            <div className="relative">
              <span
                aria-hidden
                className="absolute -inset-3 rounded-full blur-2xl opacity-60"
                style={{ background: "radial-gradient(40% 40% at 50% 50%, rgba(255,79,54,0.35), transparent 60%)" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-removebg-preview.png" alt="Pulse Logo" className="relative h-16 w-auto -mt-1 object-contain" />
            </div>
            <p className="font-teko text-4xl tracking-wide" style={{ color: BRAND_ACCENT }}>
              Pulse KPI™
            </p>
          </div>

          {/* Nav */}
          <ul className="space-y-2">
            {NAV_LINKS
              .filter(l => allowed.includes(l.label))
              .map(({ label, icon: Icon, href, match }) => {
                const active  = isActive({ label, icon: Icon, href, match });
                const enabled = ACTIVE_LABELS.has(label);
                return (
                  <li key={label}>
                    <Link
                      href={enabled ? withGymParam(href) : "#"}
                      onClick={() => enabled && setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`
                        group relative flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium
                        transition
                        ${enabled
                          ? (active ? "bg-white text-gray-900 shadow" : "text-white/90 hover:bg-white/10")
                          : "text-white/60 cursor-not-allowed"}
                      `}
                      tabIndex={enabled ? 0 : -1}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-sm"
                          style={{ width: 4, height: 24, backgroundColor: BRAND_ACCENT }}
                        />
                      )}

                      <Icon
                        className={`h-6 w-6 flex-none transition ${active ? "" : "group-hover:scale-105"}`}
                        style={{ color: active ? BRAND_PRIMARY : "currentColor" }}
                      />
                      <span className="text-[18px] font-sans">{label}</span>

                      {!enabled && (
                        <span className="ml-auto rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] tracking-wide text-white/80">
                          Soon
                        </span>
                      )}

                      {enabled && (
                        <span
                          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          style={{ background: "linear-gradient(120deg, transparent, rgba(255,255,255,0.12), transparent)" }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>

          {/* KPI – Select Gym (admins & interns only) */}
          {(role === "admin" || role === "ptsi-intern") && (
            <div className="mx-1 mt-5 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/80">KPI – Select Gym</p>

              {/* Custom styled dropdown */}
              <div ref={gymBoxRef} className="relative">
                <button
                  type="button"
                  onClick={() => !gymsLoading && gyms.length > 0 && setGymOpen(o => !o)}
                  className={`
                    w-full rounded-lg bg-white/95 px-3 py-2 text-left text-gray-900 outline-none
                    ring-1 ring-transparent transition
                    ${gymOpen ? "ring-[rgba(47,27,102,0.35)]" : "hover:ring-[rgba(47,27,102,0.18)]"}
                    disabled:opacity-60
                  `}
                  disabled={gymsLoading || gyms.length === 0}
                  aria-haspopup="listbox"
                  aria-expanded={gymOpen}
                >
                  <span className="flex items-center justify-between">
                    <span className="truncate">{gymsLoading ? "Loading gyms…" : selectedGymLabel}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${gymOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>

                {/* Expanded menu */}
                <div
                  className={`
                    absolute left-0 right-0 z-20 mt-1 origin-top rounded-xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5
                    transition-all duration-150
                    ${gymOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}
                  `}
                  role="listbox"
                >
                  <div className="max-h-60 overflow-auto py-1">
                    <div
                      role="option"
                      aria-selected={!selectedGymId}
                      onClick={() => handleSelectGym("")}
                      className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="truncate text-gray-700">Choose a gym…</span>
                      {!selectedGymId && <Check className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />}
                    </div>
                    {gyms.map((g) => {
                      const active = selectedGymId === g.id;
                      return (
                        <div
                          key={g.id}
                          role="option"
                          aria-selected={active}
                          onClick={() => handleSelectGym(g.id)}
                          className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${active ? "bg-gray-50" : ""}`}
                        >
                          <span className="truncate text-gray-800">{labelGym(g)}</span>
                          {active && <Check className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sessionStorage.removeItem(SELECTED_GYM_KEY);
                  setSelectedGymId("");
                  setMobileOpen(false);
                  const params = new URLSearchParams(window.location.search);
                  params.delete("gym_id");
                  const next = params.toString();
                  router.push(`${window.location.pathname}${next ? `?${next}` : ""}`);
                }}
                className="mt-2 block text-xs text-white/80 underline underline-offset-2 hover:text-white"
              >
                View KPI (no gym selected)
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-[11px] text-white/60">
            © {new Date().getFullYear()} Pulse PTSI
          </div>
        </div>
      </nav>

      {/* Scoped scrollbar styling (only the sidebar) */}
      <style jsx global>{`
        .sidebar-scroll {
          /* kill any accidental horizontal scroll from transforms */
          overflow-x: hidden;
          scrollbar-width: thin;                   /* Firefox */
          scrollbar-color: rgba(255,255,255,.35) transparent;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 10px;                             /* WebKit */
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0.08),
            rgba(255,255,255,0.03)
          );
          border-radius: 10px;
          margin: 8px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.28));
          border-radius: 10px;
          border: 2px solid #20154A;              /* match sidebar bg to create inset look */
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.7);
        }
      `}</style>
    </>
  );
}
