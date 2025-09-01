"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

/* brand colours (same as Role-Panel) */
const PRIMARY = "#3B2F6D";
const ACCENT = "#F28C38";

/* DB row types */
type Gym = {
  id: string;
  name: string;
  created_at: string;
  owner: { id: string; display_name: string; email: string; avatar_url: string | null } | null;
};
type Profile = {
  id: string;
  display_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  last_active: string;
};

/* options for new PTSI staff */
const ADMIN_ROLES = [
  { value: "admin", label: "PTSI Admin" },
  { value: "ptsi-intern", label: "PTSI Intern" }
];

/* ───────────────────────────────────────────────────────── */
export default function AdminPage() {
  const sb = useSupabaseClient();
  const router = useRouter();

  /* gyms */
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gLoading, setGLoading] = useState(false);
  const [gModal, setGModal] = useState<"new" | "edit" | "delete" | null>(null);
  const [gRow, setGRow] = useState<Gym | null>(null);
  const [gName, setGName] = useState("");
  const [cName, setCName] = useState(""); // first client
  const [cMail, setCMail] = useState("");
  const [cPwd, setCPwd] = useState("");

  /* users */
  const [users, setUsers] = useState<Profile[]>([]);
  const [uLoading, setULoading] = useState(false);
  const [uModal, setUModal] = useState<"new" | "edit" | "delete" | null>(null);
  const [uRow, setURow] = useState<Profile | null>(null);
  const [uName, setUName] = useState("");
  const [uMail, setUMail] = useState("");
  const [uRole, setURole] = useState(ADMIN_ROLES[0].value);
  const [uPwd, setUPwd] = useState("");
  const [showCreds, setShowCreds] = useState<{ mail: string; pwd: string } | null>(null);

  /* ---------- invite modal state (added) ---------- */
  type InviteConfig = {
    title: string;
    presetRole?: string;
    roleOptions?: { value: string; label: string }[];
    gymId?: string | null;
    requireGymName?: boolean; // ← for "Invite instead" from Create Gym
  };
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteConfig, setInviteConfig] = useState<InviteConfig | null>(null);
  /* ------------------------------------------------ */

  /* fetch gyms */
  const loadGyms = useCallback(async () => {
    console.log("Starting to load gyms...");
    setGLoading(true);
    const { data, error } = await sb
      .from("gyms")
      .select(`id, name, created_at, owner:profiles!gyms_owner_id_fkey(id, display_name, email, avatar_url)`)
      .order("created_at");
    if (error) {
      console.error("Error loading gyms:", error);
    } else {
      console.log("Gyms loaded successfully:", data);
      setGyms(data as unknown as Gym[]);
    }
    setGLoading(false);
    console.log("Finished loading gyms, loading state:", gLoading);
  }, [sb]);

  /* fetch PTSI staff */
  const loadAdmins = useCallback(async () => {
    console.log("Starting to load admins...");
    setULoading(true);
    const { data, error } = await sb
      .from("profiles")
      .select("id, display_name, email, role, avatar_url, last_active")
      .in("role", ["admin", "ptsi-intern"])
      .order("display_name");
    if (error) {
      console.error("Error loading admins:", error);
    } else {
      console.log("Admins loaded successfully:", data);
      setUsers((data as Profile[]) || []);
    }
    setULoading(false);
    console.log("Finished loading admins, loading state:", uLoading);
  }, [sb]);

  useEffect(() => {
    console.log("useEffect triggered, loading gyms and admins...");
    loadGyms();
    loadAdmins();
  }, [loadGyms, loadAdmins]);

  const genPwd = () => {
    console.log("Generating password...");
    const pwd = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
    console.log("Generated password:", pwd);
    return pwd;
  };

  /* ───── Gym handlers ───── */
  async function handleGymCreate(e: React.FormEvent) {
    console.log("Starting gym creation...");
    e.preventDefault();
    if (!gName || !cName || !cMail || !cPwd) {
      console.log("Validation failed, missing fields:", { gName, cName, cMail, cPwd });
      return alert("Please fill all fields");
    }

    // 1️⃣ create gym
    console.log("Creating gym with name:", gName);
    const { data: gymData, error: gymErr } = await sb
      .from("gyms")
      .insert({ name: gName })
      .select("id")
      .single();
    if (gymErr || !gymData) {
      console.error("Error creating gym:", gymErr);
      return alert("Could not create gym");
    }
    const gymId = gymData.id;
    console.log("Gym created successfully, ID:", gymId);

    // 2️⃣ create client *with* gymId so it gets a badge
    console.log("Creating client with details:", { cName, cMail, cPwd, gymId });
    const form = new FormData();
    form.append("display_name", cName);
    form.append("email", cMail);
    form.append("role", "client");
    form.append("password", cPwd);
    form.append("gymId", gymId); // ← pass gymId for badge

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Error creating user:", json);
      return alert("Could not create client");
    }
    const newUserId = json.userId;
    console.log("Client created successfully, User ID:", newUserId);

    // 3️⃣ patch gym.owner_id
    console.log("Updating gym owner ID:", { gymId, newUserId });
    await sb.from("gyms").update({ owner_id: newUserId }).eq("id", gymId);

    // done
    console.log("Gym creation completed, showing credentials:", { mail: cMail, pwd: cPwd });
    setShowCreds({ mail: cMail, pwd: cPwd });
    setGModal(null);
    setGName("");
    setCName("");
    setCMail("");
    setCPwd("");
    loadGyms();
  }

  async function handleGymSave(e: React.FormEvent) {
    console.log("Starting gym save...");
    e.preventDefault();
    if (!gRow) {
      console.log("No gym row selected for save");
      return;
    }

    // — Update gym name
    console.log("Updating gym name:", { id: gRow.id, name: gName });
    const { error: gymErr } = await sb.from("gyms").update({ name: gName }).eq("id", gRow.id);
    if (gymErr) {
      console.error("Error saving gym name:", gymErr.message);
      return alert("Could not save gym name: " + gymErr.message);
    }
    console.log("Gym name updated successfully");

    // — Update the client’s profile
    if (gRow.owner) {
      console.log("Updating client profile:", { id: gRow.owner.id, cName, cMail });
      const { error: profErr } = await sb
        .from("profiles")
        .update({ display_name: cName, email: cMail })
        .eq("id", gRow.owner.id);
      if (profErr) {
        console.error("Error saving client info:", profErr.message);
        return alert("Could not save client info: " + profErr.message);
      }
      console.log("Client profile updated successfully");
    }

    // — Close and refresh
    console.log("Gym save completed, resetting state");
    setGModal(null);
    setGRow(null);
    setGName("");
    setCName("");
    setCMail("");
    loadGyms();
  }

  async function handleGymDelete() {
    console.log("Starting gym deletion...", gRow);
    if (!gRow) {
      console.log("No gym row selected for deletion");
      return;
    }
    console.log("Calling admin_delete_gym_cascade for gym ID:", gRow.id);
    const { error } = await sb.rpc("admin_delete_gym_cascade", { gym_uid: gRow.id });

    if (error) {
      console.error("Delete gym failed:", error);
      alert("Could not delete gym: " + error.message);
      return;
    }

    console.log("Gym deletion RPC called, resetting modal and row");
    setGModal(null);
    setGRow(null);
    console.log("Reloading gyms and admins");
    loadGyms();
    loadAdmins();
  }

  /* ---------- Invite flows (updated) ---------- */
  // Gym → Invite instead: directly open invite popup that asks for Gym name,
  // then creates the gym and returns an invite link (role=client).
  function handleGymInviteFlow() {
    // close the Create Gym modal immediately; no need to type there first
    setGModal(null);
    // open invite modal configured for a NEW GYM
    setInviteConfig({
      title: "Invite client to a new gym",
      presetRole: "client",
      requireGymName: true, // ← show Gym Name input & create gym inside invite modal
    });
    setInviteOpen(true);
  }
  /* ------------------------------------------- */

  /* ───── User handlers (identical logic as Role-Panel) ───── */
  async function handleUserCreate(e: React.FormEvent) {
    console.log("Starting user creation...");
    e.preventDefault();
    if (!uPwd) {
      console.log("Validation failed, no password");
      return;
    }
    console.log("Creating user with details:", { uName, uMail, uRole, uPwd });
    const form = new FormData();
    form.append("display_name", uName);
    form.append("email", uMail);
    form.append("role", uRole);
    form.append("password", uPwd);
    await fetch("/api/admin/create-user", { method: "POST", body: form });
    console.log("User creation API call completed");
    setShowCreds({ mail: uMail, pwd: uPwd });
    setUModal(null);
    setUName("");
    setUMail("");
    setUPwd("");
    console.log("User creation completed, reloading admins");
    loadAdmins();
  }

  async function handleUserSave(e: React.FormEvent) {
    console.log("Starting user save...");
    e.preventDefault();
    if (!uRow) {
      console.log("No user row selected for save");
      return;
    }
    console.log("Saving user with details:", { id: uRow.id, uName, uMail, uRole });
    const body: any = { userId: uRow.id, display_name: uName, role: uRole };
    if (uMail !== uRow.email) body.email = uMail;
    await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("User save API call completed");
    setUModal(null);
    setURow(null);
    console.log("User save completed, reloading admins");
    loadAdmins();
  }

  async function handleResetPwd() {
    console.log("Starting password reset...");
    if (!uRow) {
      console.log("No user row selected for password reset");
      return;
    }
    const pwd = genPwd();
    console.log("Resetting password for user:", uRow.email, "new password:", pwd);
    await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uRow.id, password: pwd })
    });
    console.log("Password reset API call completed");
    setShowCreds({ mail: uRow.email, pwd });
    setUModal(null);
    setURow(null);
  }

  async function handleUserDelete() {
    console.log("Starting user deletion...", uRow);
    if (!uRow) {
      console.log("No user row selected for deletion");
      return;
    }
    console.log("Calling admin_delete_profile for user ID:", uRow.id);
    await sb.rpc("admin_delete_profile", { profile_uid: uRow.id });
    console.log("User deletion RPC called, resetting modal and row");
    setUModal(null);
    setURow(null);
    console.log("Reloading admins");
    loadAdmins();
  }

  /* ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 sm:px-10 font-lato">
      {/* header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm"
        >
          ← Back
        </button>
        <h1 className="font-teko text-4xl" style={{ color: PRIMARY }}>
          Admin Console
        </h1>
      </div>
      {/* ================= Gyms ================= */}
      <SectionHeader title="Gyms" onAdd={() => setGModal("new")} addLabel="Gym" />
      <DataTable
        header={["Name", "Owner", "Created", "Actions"]}
        loading={gLoading}
        rows={gyms.map((g) => [
          g.name,
          g.owner ? (
            <span className="text-gray-600">
              {g.owner.display_name} <em className="text-xs text-gray-500">({g.owner.email})</em>
            </span>
          ) : (
            <span className="italic text-gray-500">not assigned</span>
          ),
          new Date(g.created_at).toLocaleDateString(),
          <ActionLinks
            onEdit={() => {
              console.log("Edit gym clicked, row:", g);
              setGModal("edit");
              setGRow(g);
              setGName(g.name);
              if (g.owner) {
                console.log("Preloading owner data:", g.owner);
                setCName(g.owner.display_name);
                setCMail(g.owner.email);
              }
            }}
            onDelete={() => {
              console.log("Delete gym clicked, row:", g);
              setGModal("delete");
              setGRow(g);
            }}
          />
        ])}
        data={gyms}
        onRowClick={(g) => router.push(`/profile/role-panel?from=admin&gymId=${g.id}`)}
      />

      {/* ================= Admin & Interns ================= */}
      <div className="mt-16" />
      <SectionHeader title="PTSI Admin & Interns" onAdd={() => setUModal("new")} addLabel="User" />
      <DataTable
        header={["Avatar", "Name", "Email", "Role", "Last Active", "Actions"]}
        loading={uLoading}
        rows={users.map((u) => [
          <img src={u.avatar_url ?? "/assets/profile.png"} className="h-8 w-8 rounded-full object-cover" alt="" />,
          <span className="text-gray-600">{u.display_name}</span>,
          <span className="text-gray-600">{u.email}</span>,
          <span className="text-gray-600">{u.role}</span>,
          <span className="text-gray-600">{new Date(u.last_active).toLocaleString()}</span>,
          <ActionLinks
            onEdit={() => {
              console.log("Edit user clicked, row:", u);
              setUModal("edit");
              setURow(u);
              setUName(u.display_name);
              setUMail(u.email);
              setURole(u.role);
            }}
            onDelete={() => {
              console.log("Delete user clicked, row:", u);
              setUModal("delete");
              setURow(u);
            }}
            onResetPwd={() => {
              console.log("Reset password clicked, row:", u);
              setURow(u);
              handleResetPwd();
            }}
          />
        ])}
      />

      {/* modals reuse one component */}
      {gModal === "new" && (
        <GymModal
          title="Create Gym"
          name={gName}
          onName={setGName}
          cName={cName}
          onCName={setCName}
          cMail={cMail}
          onCMail={setCMail}
          pwd={cPwd}
          onPwd={() => setCPwd(genPwd())}
          onClose={() => setGModal(null)}
          onSubmit={handleGymCreate}
          /* added: invite instead — now opens a fresh popup that asks Gym name there */
          onInvite={handleGymInviteFlow}
        />
      )}

      {gModal === "edit" && gRow && (
        <GymModal
          title="Edit Gym"
          name={gName}
          onName={setGName}
          edit
          cName={cName}
          onCName={setCName}
          cMail={cMail}
          onCMail={setCMail}
          onClose={() => {
            console.log("Closing edit gym modal");
            setGModal(null);
            setGRow(null);
          }}
          onSubmit={handleGymSave}
        />
      )}

      {gModal === "delete" && gRow && (
        <ConfirmModal
          title="Delete Gym"
          text={
            <>
              Delete <strong>{gRow.name}</strong> and everything inside it?
            </>
          }
          onCancel={() => {
            console.log("Canceling gym deletion");
            setGModal(null);
            setGRow(null);
          }}
          onConfirm={handleGymDelete}
        />
      )}

      {uModal === "new" && (
        <UserModal
          title="Create User"
          roles={ADMIN_ROLES}
          uName={uName}
          setUName={setUName}
          uMail={uMail}
          setUMail={setUMail}
          uRole={uRole}
          setURole={setURole}
          pwd={uPwd}
          genPwd={() => setUPwd(genPwd())}
          onClose={() => setUModal(null)}
          onSubmit={handleUserCreate}
          /* added: invite instead for PTSI staff */
          onInvite={() => {
            setUModal(null);
            setInviteConfig({
              title: "Invite PTSI staff",
              roleOptions: [
                { value: "admin", label: "PTSI Admin" },
                { value: "ptsi-intern", label: "PTSI Intern" }
              ]
            });
            setInviteOpen(true);
          }}
        />
      )}

      {uModal === "edit" && uRow && (
        <UserModal
          title="Edit User"
          roles={ADMIN_ROLES}
          uName={uName}
          setUName={setUName}
          uMail={uMail}
          setUMail={setUMail}
          uRole={uRole}
          setURole={setURole}
          edit
          onResetPwd={handleResetPwd}
          onClose={() => {
            console.log("Closing edit user modal");
            setUModal(null);
            setURow(null);
          }}
          onSubmit={handleUserSave}
        />
      )}

      {uModal === "delete" && uRow && (
        <ConfirmModal
          title="Delete User"
          text={
            <>
              Delete <strong>{uRow.display_name}</strong> ({uRow.email}) ?
            </>
          }
          onCancel={() => {
            console.log("Canceling user deletion");
            setUModal(null);
            setURow(null);
          }}
          onConfirm={handleUserDelete}
        />
      )}

      {showCreds && <CredsModal mail={showCreds.mail} pwd={showCreds.pwd} onClose={() => setShowCreds(null)} />}

      {/* render invite modal (added) */}
      {inviteOpen && inviteConfig && (
        <InviteModal
          title={inviteConfig.title}
          presetRole={inviteConfig.presetRole}
          roleOptions={inviteConfig.roleOptions}
          gymId={inviteConfig.gymId ?? null}
          requireGymName={inviteConfig.requireGymName}
          onClose={() => {
            setInviteOpen(false);
            setInviteConfig(null);
          }}
        />
      )}
    </div>
  );
}

/* ============= small reusable pieces ============= */
function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  console.log("Rendering SectionHeader:", { title, addLabel });
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="font-teko text-3xl" style={{ color: PRIMARY }}>
        {title}
      </h2>
      <button
        onClick={() => {
          console.log("Add button clicked for:", addLabel);
          onAdd();
        }}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white font-semibold shadow hover:brightness-110 transition"
        style={{ background: ACCENT }}
      >
        + New {addLabel}
      </button>
    </div>
  );
}
function DataTable({
  header,
  rows,
  loading,
  onRowClick,
  data
}: {
  header: string[];
  rows: any[][];
  loading: boolean;
  onRowClick?: (item: any) => void;
  data?: any[];
}) {
  console.log("Rendering DataTable:", { header, loading, rowsLength: rows.length, dataLength: data?.length });
  return (
    <div className="bg-white rounded-2xl shadow overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 text-gray-700 font-semibold">
          <tr>{header.map((h) => <th key={h} className="px-6 py-3 text-center">{h}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={header.length} className="p-6 text-center">
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={header.length} className="p-6 text-center text-gray-500 italic">
                (no records)
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr
                key={i}
                className="border-t hover:bg-gray-50 cursor-pointer"
                style={{ backgroundColor: i % 2 === 0 ? "#f9fafb" : "white" }}
                onClick={() => onRowClick && data && onRowClick(data[i])}
              >
                {cells.map((c, j) => (
                  <td key={j} className="px-6 py-3 text-center text-gray-600">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActionLinks({
  onEdit,
  onDelete,
  onResetPwd
}: {
  onEdit: () => void;
  onDelete: () => void;
  onResetPwd?: () => void;
}) {
  console.log("Rendering ActionLinks");
  return (
    <div className="text-center space-x-2">
      <button
        onClick={(e) => {
          console.log("Edit action triggered");
          e.stopPropagation();
          onEdit();
        }}
        className="text-[color:var(--primary)] hover:underline"
        style={{ "--primary": PRIMARY } as React.CSSProperties}
      >
        Edit
      </button>

      {onResetPwd && (
        <button
          onClick={(e) => {
            console.log("Reset password action triggered");
            e.stopPropagation();
            onResetPwd();
          }}
          className="text-[color:var(--accent)] hover:underline"
          style={{ "--accent": ACCENT } as React.CSSProperties}
        >
          Reset Pwd
        </button>
      )}

      <button
        onClick={(e) => {
          console.log("Delete action triggered");
          e.stopPropagation();
          onDelete();
        }}
        className="text-red-600 hover:underline"
      >
        Delete
      </button>
    </div>
  );
}

/* ─── modals ─── */
import type { ReactNode } from "react";
function ModalFrame({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  console.log("Rendering ModalFrame");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-gray-900 font-lato" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function GymModal({
  title,
  name,
  onName,
  edit = false,
  cName,
  onCName,
  cMail,
  onCMail,
  pwd,
  onPwd,
  onClose,
  onSubmit,
  onInvite // ← added
}: {
  title: string;
  name: string;
  onName: (s: string) => void;
  edit?: boolean;
  cName?: string;
  onCName?: (s: string) => void;
  cMail?: string;
  onCMail?: (s: string) => void;
  pwd?: string;
  onPwd?: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onInvite?: () => void; // ← added
}) {
  console.log("Rendering GymModal:", { title, edit });
  return (
    <ModalFrame onClose={onClose}>
      <h3 className="font-teko text-2xl mb-6" style={{ color: PRIMARY }}>
        {title}
      </h3>
      <form onSubmit={onSubmit} className="space-y-5">
        <Input label="Gym name" value={name} onChange={onName} />

        {/* in both new & edit, we show Client fields; in new also show Password */}
        <Input label="Client name" value={cName!} onChange={onCName!} />
        <Input label="Client email" value={cMail!} onChange={onCMail!} type="email" />
        {!edit && <PasswordField value={pwd!} onGen={onPwd!} />}

        {/*
          {/* Invite instead link now opens a fresh popup that asks Gym Name there 
          {!edit && (
            <div className="text-right text-sm">
              <button type="button" onClick={onInvite} className="underline" style={{ color: ACCENT }}>
                Invite instead
              </button>
            </div>
            
          )}
        */}

        <ModalBtns onCancel={onClose} primary={edit ? "Save" : "Create"} />
      </form>
    </ModalFrame>
  );
}

function UserModal({
  title,
  roles,
  edit = false,
  onResetPwd,
  uName,
  setUName,
  uMail,
  setUMail,
  uRole,
  setURole,
  pwd,
  genPwd,
  onClose,
  onSubmit,
  onInvite // ← added
}: {
  title: string;
  roles: { value: string; label: string }[];
  edit?: boolean;
  onResetPwd?: () => void;
  uName: string;
  setUName: (s: string) => void;
  uMail: string;
  setUMail: (s: string) => void;
  uRole: string;
  setURole: (s: string) => void;
  pwd?: string;
  genPwd?: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onInvite?: () => void; // ← added
}) {
  console.log("Rendering UserModal:", { title, edit });
  return (
    <ModalFrame onClose={onClose}>
      <h3 className="font-teko text-2xl mb-6" style={{ color: PRIMARY }}>
        {title}
      </h3>
      <form onSubmit={onSubmit} className="space-y-5">
        <Input label="Display name" value={uName} onChange={setUName} />
        <Input label="Email" value={uMail} onChange={setUMail} type="email" />
        <Select label="Role" value={uRole} onChange={setURole} opts={roles} />
        {edit ? (
          <div className="text-sm text-right">
            <button
              type="button"
              onClick={onResetPwd}
              className="text-[color:var(--accent)] hover:underline"
              style={{ "--accent": ACCENT } as React.CSSProperties}
            >
              Reset password
            </button>
          </div>
        ) : (
          <PasswordField value={pwd!} onGen={genPwd!} />
        )}

        {/* invite instead for staff 
        {!edit && (
          <div className="text-right text-sm">
            <button type="button" onClick={onInvite} className="underline" style={{ color: ACCENT }}>
              Invite instead
            </button>
          </div>
        )}
*/}
        <ModalBtns onCancel={onClose} primary={edit ? "Save" : "Create"} />
      </form>
    </ModalFrame>
  );
}

function ConfirmModal({
  title,
  text,
  onCancel,
  onConfirm
}: {
  title: string;
  text: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  console.log("Rendering ConfirmModal:", { title });
  return (
    <ModalFrame onClose={onCancel}>
      <h3 className="font-teko text-2xl mb-4" style={{ color: PRIMARY }}>
        {title}
      </h3>
      <p className="mb-6 text-sm">{text}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="btnCancel">
          Cancel
        </button>
        <button onClick={onConfirm} className="btnDelete" style={{ background: "#DC2626" }}>
          Delete
        </button>
      </div>
    </ModalFrame>
  );
}

function CredsModal({ mail, pwd, onClose }: { mail: string; pwd: string; onClose: () => void }) {
  console.log("Rendering CredsModal:", { mail, pwd });
  return (
    <ModalFrame onClose={onClose}>
      <h3 className="font-teko text-2xl mb-4" style={{ color: PRIMARY }}>
        Credentials
      </h3>
      <CredLine label="Email" value={mail} />
      <CredLine label="Password" value={pwd} />
      <div className="flex justify-end pt-6">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg text-white font-semibold hover:brightness-110 transition"
          style={{ background: PRIMARY }}
        >
          Close
        </button>
      </div>
    </ModalFrame>
  );
}

/* tailwind shortcut classes */
const btn = "px-5 py-2 rounded-lg font-semibold transition";
const btnCancel = `${btn} border border-gray-300 hover:bg-gray-100`;
const btnDelete = `${btn} text-white hover:brightness-110`;

/* reuse earlier helpers */
function ModalBtns({ onCancel, primary }: { onCancel: () => void; primary: string }) {
  console.log("Rendering ModalBtns:", { primary });
  return (
    <div className="flex justify-end gap-3 pt-4">
      <button type="button" onClick={onCancel} className="btnCancel">
        Cancel
      </button>
      <button
        type="submit"
        className="px-6 py-2 rounded-lg text-white font-semibold hover:brightness-110 transition"
        style={{ background: PRIMARY }}
      >
        {primary}
      </button>
    </div>
  );
}

function CredLine({ label, value }: { label: string; value: string }) {
  console.log("Rendering CredLine:", { label, value });
  const copy = () => navigator.clipboard.writeText(value);
  return (
    <div className="flex items-center justify-between gap-4 mb-2">
      <span className="font-semibold">{label}:</span>
      <span className="flex-1 truncate select-all">{value}</span>
      <button onClick={copy} className="text-[color:var(--accent)] hover:underline text-sm" style={{ "--accent": ACCENT } as React.CSSProperties}>
        Copy
      </button>
    </div>
  );
}

/* additional components */
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (s: string) => void; type?: string }) {
  console.log("Rendering Input:", { label, value });
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3B2F6D]/30"
        required
      />
    </div>
  );
}

function PasswordField({ value, onGen }: { value: string; onGen: () => void }) {
  console.log("Rendering PasswordField:", { value });
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">Password</label>
      <div className="flex items-center gap-2">
        <input readOnly value={value} placeholder="Auto-generated" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 select-all" />
        <button
          type="button"
          onClick={onGen}
          className="rounded-lg px-4 py-2 text-white font-semibold hover:brightness-110 transition"
          style={{ background: ACCENT }}
        >
          Gen
        </button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  opts
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  opts: { value: string; label: string }[];
}) {
  console.log("Rendering Select:", { label, value, opts });
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------ InviteModal (updated) ------------ */
function InviteModal({
  title,
  presetRole,
  roleOptions,
  gymId,
  requireGymName,
  onClose
}: {
  title: string;
  presetRole?: string;
  roleOptions?: { value: string; label: string }[];
  gymId?: string | null;
  requireGymName?: boolean;
  onClose: () => void;
}) {
  const sb = useSupabaseClient();
  const [role, setRole] = useState(presetRole || roleOptions?.[0]?.value || "client");
  const [name, setName] = useState("");
  const [gymName, setGymName] = useState(""); // ← only used when requireGymName
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createInvite = async () => {
    setErr(null);
    setLoading(true);

    try {
      // If this flow is for a BRAND NEW gym, create it first here.
      let useGymId = gymId ?? null;
      if (requireGymName) {
        if (!gymName.trim()) {
          setErr("Enter gym name");
          setLoading(false);
          return;
        }
        const { data: gymData, error: gymErr } = await sb
          .from("gyms")
          .insert({ name: gymName.trim() })
          .select("id")
          .single();
        if (gymErr || !gymData) {
          throw new Error(gymErr?.message || "Could not create gym");
        }
        useGymId = gymData.id;
      }

      // Create invite (no changes to your backend)
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, gymId: useGymId, name })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create invite");
      setLink(json.link);
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame onClose={onClose}>
      <h3 className="font-teko text-2xl mb-4" style={{ color: PRIMARY }}>
        {title}
      </h3>

      {/* If this is the "Invite from Create Gym", ask gym name right here */}
      {requireGymName && (
        <div className="mb-3">
          <label className="block text-sm font-semibold mb-1">Gym name</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={gymName}
            onChange={(e) => setGymName(e.target.value)}
            placeholder="My Awesome Gym"
          />
        </div>
      )}

      {/* Role selector only when not preset (PTSI staff flow) */}
      {!presetRole && roleOptions && (
        <div className="mb-3">
          <label className="block text-sm font-semibold mb-1">Role</label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {presetRole && <p className="text-sm text-gray-600 mb-2">Role: <b>{presetRole}</b></p>}

      <div className="mb-3">
        <label className="block text-sm font-semibold mb-1">Recipient name (optional)</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
        />
      </div>

      {err && <p className="text-red-600 text-sm mb-2">{err}</p>}

      {!link ? (
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btnCancel">
            Cancel
          </button>
          <button
            onClick={createInvite}
            className="px-6 py-2 rounded-lg text-white font-semibold hover:brightness-110 transition"
            style={{ background: PRIMARY }}
          >
            {loading ? "Creating…" : "Create Invite"}
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-2">
          <p className="text-sm">Share this link:</p>
          <div className="flex items-center gap-2">
            <input readOnly className="flex-1 border rounded-lg px-3 py-2" value={link} />
            <button
              onClick={() => navigator.clipboard.writeText(link)}
              className="px-4 py-2 rounded-lg text-white font-semibold hover:brightness-110 transition"
              style={{ background: ACCENT }}
            >
              Copy
            </button>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={onClose} className="btnCancel">
              Close
            </button>
          </div>
        </div>
      )}
    </ModalFrame>
  );
}
