"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useSearchParams, useRouter } from "next/navigation";      // ← add useSearchParams
import Link from "next/link";

const PRIMARY = "#3B2F6D";
const ACCENT  = "#F28C38";

type User = {
  id:           string;
  display_name: string;
  email:        string;
  role:         string;
  avatar_url:   string | null;
  last_active:  string;
  badge_id?:    string;
};

const ROLE_OPTIONS = [
  { value:"owner",        label:"Gym Owner / Manager" },
  { value:"trainer",      label:"Trainer / Coach"     },
  { value:"va",           label:"VA – Active"        },
  { value:"va-training",  label:"VA – Training"      },
  { value:"coach",        label:"CoachStack Coach"   },
  { value:"closer",       label:"Closer"             },
  { value:"front_desk",   label:"Front Desk / Admin" },
];

export default function RolePanelClient() {
  const supabase = useSupabaseClient();
  const router       = useRouter();
  const searchParams = useSearchParams();                          // ← read params
  const fromParam    = searchParams.get("from");
  const cameFromProfile = fromParam === "profile";                // ← flag
  const referrer     = typeof document !== "undefined" ? document.referrer : "";
  const cameFromAdmin = fromParam === "/profile/admin" || (!fromParam && referrer.includes("/profile/admin"));
  const gymId        = searchParams.get("gymId");
  const [gymName, setGymName] = useState<string>("");

  // ─── viewer’s own role + gym ───
  const [viewerRole,  setViewerRole ] = useState<string | null>(null);
  const [viewerGymId, setViewerGymId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("role,gym_id")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error loading viewer profile:", error);
      } else {
        setViewerRole(data.role);
        setViewerGymId(data.gym_id);
      }
    })();
  }, [supabase]);

  // Debug logging setup
  useEffect(() => {
    console.log("Debugging RolePanelPage - Initial Load");
    console.log("searchParams:", Object.fromEntries(searchParams));
    console.log("fromParam:", fromParam);
    console.log("cameFromProfile:", cameFromProfile);
    console.log("referrer:", referrer);
    console.log("cameFromAdmin:", cameFromAdmin);
  }, [searchParams, referrer]);

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      console.log("Starting role check and redirect logic...");
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session data:", session);

      if (!session?.user) {
        console.log("No user session found, skipping redirect.");
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const fromParam = searchParams.get("from");
      console.log("Query param 'from':", fromParam);

      // Only proceed with role check if not coming from admin-related pages
      if (fromParam !== "admin" && !cameFromAdmin) {
        console.log("Not coming from admin context, proceeding with role check.");
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        console.log("Supabase query result:", { data, error });

        if (error) {
          console.error("Error fetching user role:", error);
        } else {
          console.log("User role fetched:", data?.role);
          if (data?.role === "admin") {
            console.log("User is admin, redirecting to /profile/admin");
            router.push("/profile/admin");
          } else {
            console.log("User role is not admin:", data?.role);
          }
        }
      } else {
        console.log("User came from admin context (fromParam or cameFromAdmin), no redirect.");
      }
    };
    checkRoleAndRedirect();
  }, [cameFromAdmin, supabase, router]);

  const [users,   setUsers   ] = useState<User[]>([]);
  const [loading, setLoading ] = useState(false);

  const [showNew,   setShowNew   ] = useState(false);
  const [newName,   setNewName   ] = useState("");
  const [newEmail,  setNewEmail  ] = useState("");
  const [newRole,   setNewRole   ] = useState(ROLE_OPTIONS[0].value);
  const [newAvatar, setNewAvatar ] = useState<File|null>(null);
  const [newPwd,    setNewPwd    ] = useState("");

  const [showEdit,  setShowEdit  ] = useState(false);
  const [editUser,  setEditUser  ] = useState<User|null>(null);
  const [editName,  setEditName  ] = useState("");
  const [editEmail, setEditEmail ] = useState("");
  const [editRole,  setEditRole  ] = useState(ROLE_OPTIONS[0].value);

  const [showReset, setShowReset ] = useState(false);
  const [resetUser, setResetUser ] = useState<User|null>(null);
  const [resetPwd,  setResetPwd  ] = useState("");

  const [showDel,   setShowDel   ] = useState(false);
  const [delUser,   setDelUser   ] = useState<User|null>(null);

  const [showCreds, setShowCreds ] = useState(false);
  const [credEmail, setCredEmail ] = useState("");
  const [credPwd,   setCredPwd   ] = useState("");

  // ─── fetchUsers now respects owner’s gym ───
  const fetchUsers = useCallback(async () => {
    const targetGymId = viewerRole === "owner" ? viewerGymId : gymId;
    if (!targetGymId) {
      console.warn("[RolePanel] no gymId available, skipping fetch");
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,email,role,badge_id,avatar_url,last_active")
      .not("role", "in", '("ptsi-intern","admin","client")')
      .eq("gym_id", targetGymId)
      .order("display_name");

    if (error) {
      console.error("[RolePanel] fetch error:", error);
      setUsers([]);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  }, [supabase, gymId, viewerRole, viewerGymId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // after you get gymId from searchParams…
  useEffect(() => {
    if (!gymId) return;

    supabase
      .from("gyms")
      .select("name")
      .eq("id", gymId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("couldn't load gym name", error);
        else setGymName(data.name);
      });
  }, [supabase, gymId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const genPwd = () =>
    Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

  const revealCreds = (email: string, pwd: string) => {
    setCredEmail(email);
    setCredPwd(pwd);
    setShowCreds(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const gymId = searchParams.get("gymId");
    if (!gymId) {
      return alert("⚠️ No gymId in URL – cannot create user.");
    }
    if (!newPwd) {
      return alert("⚠️ Click ‘Gen’ to generate a password first.");
    }

    const form = new FormData();
    form.append("display_name", newName);
    form.append("email",        newEmail);
    form.append("role",         newRole);
    form.append("password",     newPwd);
    if (newAvatar) {
      form.append("avatar", newAvatar);
    }
    form.append("gymId", gymId);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("❌ create-user response:", json);
        return alert("Create failed: " + (json.error || "Unknown error"));
      }

      revealCreds(newEmail, newPwd);
      setShowNew(false);
      setNewName("");
      setNewEmail("");
      setNewRole(ROLE_OPTIONS[0].value);
      setNewAvatar(null);
      setNewPwd("");
      fetchUsers();
    } catch (err: any) {
      console.error("🔥 network error:", err);
      alert("Network error: " + err.message);
    }
  };

  // =========================
  // Invite flow (ADDED)
  // =========================
  const [showInvite, setShowInvite] = useState(false);

  const [inviteRole, setInviteRole] = useState(ROLE_OPTIONS[0]?.value || "coach");
  const [inviteGymId, setInviteGymId] = useState("");   // prefill from URL on open
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const isAdminInvite = inviteRole === "admin" || inviteRole === "ptsi-intern"; // (won’t be true here; kept for compatibility)

  async function createInvite() {
    setInviteErr(null);
    setInviteLoading(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: inviteRole,
          // require gym for non-admin roles; use page gymId by default
          gymId: isAdminInvite ? null : (inviteGymId.trim() || gymId || ""),
          name: inviteName || null,
          email: inviteEmail || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create invite");
      const absolute = json.link?.startsWith("http")
        ? json.link
        : `${window.location.origin}${json.link}`;
      setInviteLink(absolute);
    } catch (e: any) {
      setInviteErr(e.message || "Failed");
    } finally {
      setInviteLoading(false);
    }
  }

  const openEdit = (u: User) => {
    console.log("Opening edit for user:", u);
    setEditUser(u);
    setEditName(u.display_name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    console.log("Editing user:", { editUserId: editUser.id, editName, editRole, editEmail });
    const body: any = {
      userId:       editUser.id,
      display_name: editName,
      role:         editRole,
    };
    if (editEmail !== editUser.email) body.email = editEmail;

    await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setShowEdit(false);
    setEditUser(null);
    fetchUsers();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (!resetPwd) return alert("Click ‘Gen’ to generate a password first.");
    console.log("Resetting password for user:", resetUser.id);

    await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: resetUser.id, password: resetPwd })
    });
    revealCreds(resetUser.email, resetPwd);

    setShowReset(false);
    setResetUser(null);
    setResetPwd("");
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delUser) return;
    console.log("Deleting user:", delUser.id);

    await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: delUser.id })
    });
    setShowDel(false);
    setDelUser(null);
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 sm:px-10 font-lato">
      {/* header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        {/* ←── back arrow ─────── */}
        <button
          onClick={() => {
            console.debug("RolePanel back clicked, fromParam =", fromParam);
            if (cameFromProfile) {
              router.push("/profile?from=role-panel");
            } else {
              router.push("/profile/admin");
            }
          }}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm cursor-pointer"
        >
          ← Back
        </button>

        <h1 className="flex-1 sm:flex-none font-teko text-4xl" style={{ color: PRIMARY }}>
          Role Manager Panel
        </h1>

        {viewerRole !== "owner" && (
          <button
            onClick={() => { setShowNew(true); setNewPwd(""); }}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2
               text-white font-semibold shadow hover:brightness-110 transition cursor-pointer"
            style={{ background: ACCENT }}
          >
            + New User
          </button>
        )}
      </div>

      {gymName && (
        <div className="mb-6 px-4 py-2 bg-white rounded-lg shadow-sm text-lg font-medium text-gray-800">
          {gymName}
        </div>
      )}

      {/* users table */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              {["Avatar", "Name", "Email", "Badge", "Last Active", "Actions"].map((h) => (
                <th key={h} className="px-6 py-3 whitespace-nowrap text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center">Loading…</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 text-center">
                    <img
                      src={u.avatar_url ?? "/assets/profile.png"} alt="" className="h-9 w-9 rounded-full object-cover mx-auto"
                    />
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-center">{u.display_name}</td>
                  <td className="px-6 py-4 text-gray-600 text-center">{u.email}</td>
                  <td className="px-6 py-4 text-gray-600 text-center">{u.badge_id || "—"}</td>
                  <td className="px-6 py-4 text-gray-600 text-center">
                    {new Date(u.last_active).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 space-x-4 text-center">
                    {viewerRole !== "owner" ? (
                      u.role === "admin" ? (
                        <>
                          <button onClick={() => openEdit(u)} className="text-[color:var(--primary)] hover:underline cursor-pointer" style={{ "--primary": "#3B2F6D" } as React.CSSProperties}>Edit</button>
                          <button onClick={() => { setResetUser(u); setShowReset(true); }} className="text-[color:var(--accent)] hover:underline cursor-pointer" style={{ "--accent": "#F28C38" } as React.CSSProperties}>Reset Pwd</button>
                          <button onClick={() => { setDelUser(u); setShowDel(true); }} className="text-red-600 hover:underline cursor-pointer">Delete</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEdit(u)} className="text-[color:var(--primary)] hover:underline cursor-pointer" style={{ "--primary": "#3B2F6D" } as React.CSSProperties}>Edit</button>
                          <button onClick={() => { setResetUser(u); setShowReset(true); }} className="text-[color:var(--accent)] hover:underline cursor-pointer" style={{ "--accent": "#F28C38" } as React.CSSProperties}>Reset Pwd</button>
                          <button onClick={() => { setDelUser(u); setShowDel(true); }} className="text-red-600 hover:underline cursor-pointer">Delete</button>
                        </>
                      )
                    ) : (
                      <span className="text-gray-500 italic">Read-only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ————————— Modals ————————— */}

      {/* New User Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Create New User</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Display Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-gray-900">
                    {opt.label}
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Avatar (optional)</label>
                <input
                  type="file"
                  onChange={(e) => setNewAvatar(e.target.files ? e.target.files[0] : null)}
                  accept="image/*"
                  className="w-full text-sm text-gray-900 file:mr-3 file:py-2 file:px-4 file:rounded-full
                         file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-800
                         hover:file:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Password"
                  value={newPwd}
                  readOnly
                  className="w-full p-2 border rounded bg-gray-100 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setNewPwd(genPwd())}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                >
                  Gen
                </button>
              </div>

              {/* 👉 Invite instead link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    // open Invite modal directly
                    setShowNew(false);
                    setInviteRole(newRole);                 // prefill role
                    setInviteGymId(gymId || "");            // prefill page gym id
                    setInviteName(newName || "");
                    setInviteEmail(newEmail || "");
                    setInviteErr(null);
                    setInviteLink(null);
                    setShowInvite(true);
                  }}
                  className="text-sm underline text-gray-700 hover:opacity-80 cursor-pointer"
                >
                  Invite instead
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                  style={{ background: ACCENT }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal (ADDED) */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Invite User</h2>

            <div className="space-y-4">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-gray-900">
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Require gym for all these roles on this page */}
              <input
                type="text"
                placeholder="Gym ID (required)"
                value={inviteGymId}
                onChange={(e) => setInviteGymId(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />

              <input
                type="text"
                placeholder="Recipient name (optional)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />

              <input
                type="email"
                placeholder="Recipient email (optional)"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />

              {inviteErr && (
                <p className="text-sm text-red-600">{inviteErr}</p>
              )}

              {!inviteLink ? (
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowInvite(false); setInviteLink(null); }}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={createInvite}
                    disabled={!inviteGymId || inviteLoading}
                    className="px-4 py-2 text-white rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer disabled:opacity-60"
                    style={{ background: ACCENT }}
                  >
                    {inviteLoading ? "Creating…" : "Create Invite"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-gray-700">Share this link:</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="w-full p-2 border rounded text-gray-900 bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="px-4 py-2 text-white rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                      style={{ background: ACCENT }}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowInvite(false); setInviteLink(null); }}
                      className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEdit && editUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Edit User</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <input
                type="text"
                placeholder="Display Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-gray-900">
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  style={{ background: PRIMARY }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showReset && resetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-XL shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Reset Password</h2>
            <p className="mb-4 text-gray-800">
              Resetting password for <span className="font-semibold">{resetUser.display_name}</span>.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New Password"
                  value={resetPwd}
                  readOnly
                  className="w-full p-2 border rounded bg-gray-100 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setResetPwd(genPwd())}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Gen
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  style={{ background: ACCENT }}
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDel && delUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-700">Delete User</h2>
            <p className="text-gray-800">
              Are you sure you want to delete <span className="font-semibold">{delUser.display_name}</span>? This action
              cannot be undone.
            </p>

            <form onSubmit={handleDelete} className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => setShowDel(false)}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCreds && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">User Credentials</h2>
            <p className="mb-4 text-gray-800">Please save these credentials securely. They will not be shown again.</p>

            <div className="space-y-2 bg-gray-50 p-4 rounded border">
              <p className="text-gray-900"><strong>Email:</strong> {credEmail}</p>
              <div className="flex items-center gap-2">
                <p className="text-gray-900"><strong>Password:</strong> {credPwd}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(credPwd)}
                  className="text-sm text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-gray-400 rounded cursor-pointer"
                  type="button"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={() => setShowCreds(false)}
                className="px-4 py-2 text-white rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400"
                style={{ background: PRIMARY }}
                type="button"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
// Presume Field, Input, Select, PasswordField, ModalButtons, CredLine helpers follow unchanged…
