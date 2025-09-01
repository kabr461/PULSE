"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import { getCroppedImg } from "./utils/cropImage";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRole, Show, AppRole } from "@/lib/role";

/* Brand tokens */
const BRAND_PRIMARY = "#2F1B66"; // deep purple
const BRAND_ACCENT  = "#FF4F36"; // orange

// detect if we came from role-panel (safe on client)
const cameFromRolePanel =
  typeof document !== "undefined" && document.referrer.includes("/profile/role-panel");

type Profile = {
  display_name:    string;
  email:           string;
  role:            string;
  avatar_url:      string | null;
  password_length: number;
};

// — Customer Management: operational roles
const customerMgmtRoles: AppRole[] = [
  "trainer", "closer", "front-desk", "va", "owner", "coach", "ptsi-intern", "admin",
];

// — Role Manager: owner + admin
const roleManagerRoles: AppRole[] = ["owner", "admin"];

export default function ProfilePage() {
  const { role } = useRole();
  const canViewRoleManager = roleManagerRoles.includes(role as AppRole);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const fromRolePanel = searchParams.get("from") === "role-panel";

  const session  = useSession();
  const supabase = useSupabaseClient();

  // ─── fetch profile row ──────────────────────────────────────────────
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarVer, setAvatarVer] = useState(Date.now()); // bust cache on avatar update

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("display_name,email,role,avatar_url,password_length")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("load profile:", error);
        else setProfile(data as Profile);
      });
  }, [session, supabase]);

  // ─── password change modal ───────────────────────────────────────────
  const [showPW, setShowPW]       = useState(false);
  const [oldPw,  setOldPw]        = useState("");
  const [newPw,  setNewPw]        = useState("");
  const [pwError,   setPwError]   = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (!oldPw || !newPw) return setPwError("Please fill both fields.");

    // 1) verify old password
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email:    profile!.email,
      password: oldPw,
    });
    if (signErr) return setPwError("Old password is incorrect.");

    // 2) update to new password
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
    if (updErr) return setPwError(updErr.message);

    // 3) write new length back to profiles
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ password_length: newPw.length })
      .eq("id", session!.user!.id);
    if (dbErr) return setPwError(dbErr.message);

    setPwSuccess("Password changed!");
    setProfile(p => p && { ...p, password_length: newPw.length });
    setShowPW(false);
  };

  // ─── avatar‐crop modal ───────────────────────────────────────────────
  const [showPic, setShowPic]             = useState(false);
  const [srcFile,  setSrcFile]            = useState<string>();
  const [crop,     setCrop]               = useState({ x: 0, y: 0 });
  const [zoom,     setZoom]               = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [cropped,  setCropped]            = useState<string>();
  const [filter,   setFilter]             = useState("none");
  const [avatarError,   setAvatarError]   = useState<string|null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string|null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSrcFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    if (!srcFile || !croppedAreaPixels) return;
    (async () => {
      try {
        const blobUrl = await getCroppedImg(srcFile, croppedAreaPixels);
        setCropped(blobUrl);
      } catch (err) {
        console.error("Crop failed:", err);
      }
    })();
  }, [srcFile, croppedAreaPixels]);

  const handleSaveAvatar = async () => {
    if (!session?.user?.id || !cropped) return;
    const path = `${session.user.id}/avatar.png`;

    try {
      // 1) fetch the blob from the data-URL
      const res  = await fetch(cropped);
      const blob = await res.blob();

      // 2) upload to avatars bucket under "userId/avatar.png"
      const { error: upErr } = await supabase
        .storage
        .from("avatars")
        .upload(path, blob, { upsert: true });
      if (upErr) throw upErr;

      // 3) get the public URL
      const { data: urlData } = supabase
        .storage
        .from("avatars")
        .getPublicUrl(path);
      if (!urlData.publicUrl) throw new Error("no public URL");

      // 4) update your profiles table
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", session.user.id);
      if (dbErr) throw dbErr;

      // 5) reflect back in state
      setProfile(p => p && ({ ...p, avatar_url: urlData.publicUrl }));
      setAvatarSuccess("Avatar updated!");
      setAvatarVer(Date.now());
      setTimeout(() => setShowPic(false), 1200);
    } catch (err: any) {
      console.error("avatar save:", err);
      setAvatarError(err.message || "Upload failed");
    }
  };

  if (!profile) {
  const BRAND_PRIMARY = "#2F1B66";
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center">
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full border-4 border-gray-200 animate-spin"
            style={{ borderTopColor: BRAND_PRIMARY }}
          />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400 animate-ping" />
        </div>
        <h3 className="mt-4 font-teko text-2xl text-gray-800">Loading…</h3>
        <p className="mt-1 text-gray-600">Getting your profile ready</p>
      </div>
    </div>
  );
}

  return (
    <div className="relative min-h-screen bg-white font-lato">
      {/* Subtle background glow (matches the rest of the app) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            `radial-gradient(900px 400px at 80% -200px, ${BRAND_PRIMARY}14, transparent 60%),
             radial-gradient(700px 320px at -110px 78%, ${BRAND_ACCENT}12, transparent 65%)`,
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-5 py-10">
        {/* PROFILE CARD */}
        <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_8px_30px_rgba(2,12,27,0.06)] sm:p-10">
          {/* Back button */}
          <button
            onClick={() => {
              if (fromRolePanel || cameFromRolePanel) {
                router.push("/dashboard");
              } else if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard");
              }
            }}
            title="Back"
            className="group absolute -left-4 -top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-xl text-gray-700 ring-1 ring-gray-200 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
            style={{ color: BRAND_PRIMARY }}
          >
            ←
          </button>

          {/* Header / Avatar */}
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${(profile.avatar_url || "/assets/profile.png")}?v=${avatarVer}`}
              alt="Profile avatar"
              className="h-32 w-32 rounded-full object-cover ring-4 ring-gray-100"
              style={{ filter }}
            />
            <button
              type="button"
              onClick={() => setShowPic(true)}
              className="mt-3 text-sm font-semibold hover:underline"
              style={{ color: BRAND_ACCENT }}
            >
              Change photo
            </button>
          </div>

          {/* Fields */}
          <div className="mt-8 space-y-6 text-gray-900">
            <Field label="Display Name" value={profile.display_name} />
            <Field label="Email"        value={profile.email}        />
            <Field label="Role"         value={profile.role}         />

            {/* Password mask */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Password
              </label>
              <div className="flex items-center">
                <div className="flex-1 select-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 tracking-widest">
                  {"•".repeat(profile.password_length)}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPW(true)}
                  className="ml-3 text-sm font-semibold hover:underline"
                  style={{ color: BRAND_ACCENT }}
                >
                  Change password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Client Management FAB */}
        <Show allow={customerMgmtRoles}>
          <Link
            href="/profile/clients?from=profile"
            className={`fixed ${canViewRoleManager ? "bottom-32" : "bottom-8"} right-6 flex items-center space-x-3 rounded-full bg-[color:var(--accent)] px-6 py-4 text-white shadow-lg transition hover:brightness-110`}
            style={{ ["--accent" as any]: BRAND_ACCENT }}
            title="Client Management"
          >
            <span className="text-2xl">👥</span>
            <span className="font-teko text-lg uppercase tracking-wide">Client Management</span>
          </Link>
        </Show>

        {/* Role Manager FAB */}
        <Show allow={roleManagerRoles}>
          <Link
            href="/profile/role-panel?from=profile"
            className="fixed bottom-8 right-6 flex items-center space-x-3 rounded-full bg-[color:var(--accent)] px-6 py-4 text-white shadow-lg transition hover:brightness-110"
            style={{ ["--accent" as any]: BRAND_ACCENT }}
            title="Role Manager Panel"
          >
            <span className="text-2xl">⚙️</span>
            <span className="font-teko text-lg uppercase tracking-wide">Role Manager Panel</span>
          </Link>
        </Show>
      </div>

      {/* PASSWORD MODAL */}
      {showPW && (
        <Modal onClose={() => setShowPW(false)}>
          <h2 className="mb-6 font-teko text-2xl" style={{ color: BRAND_PRIMARY }}>
            Update Password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <Input label="Old Password" type="password" value={oldPw} onChange={setOldPw} />
            <Input label="New Password" type="password" value={newPw} onChange={setNewPw} />
            {pwError   && <p className="text-sm text-red-600">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-green-600">{pwSuccess}</p>}
            <ModalActions onClose={() => setShowPW(false)} />
          </form>
        </Modal>
      )}

      {/* AVATAR-CROP MODAL */}
      {showPic && (
        <Modal onClose={() => setShowPic(false)}>
          <h2 className="mb-4 font-teko text-2xl" style={{ color: BRAND_PRIMARY }}>
            Update Avatar
          </h2>

          {!srcFile ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-800">Choose file</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="text-gray-800 file:mr-4 file:rounded file:border file:bg-[color:var(--accent)] file:px-3 file:py-1 file:text-white hover:file:brightness-110"
                style={{ ["--accent" as any]: BRAND_ACCENT }}
              />
            </div>
          ) : (
            <>
              <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-200">
                <Cropper
                  image={srcFile}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(_, z) => setZoom(z as number)}
                className="mt-4"
              />
              {cropped && (
                <div className="mt-6 space-y-4">
                  <label className="block text-sm font-semibold text-gray-800">Preview / Filter</label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cropped}
                    alt="Cropped preview"
                    className="h-24 w-24 rounded-full border object-cover"
                    style={{ filter }}
                  />
                  <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-1 text-gray-800"
                  >
                    <option value="none">None</option>
                    <option value="grayscale(1)">Grayscale</option>
                    <option value="sepia(0.8)">Sepia</option>
                    <option value="saturate(1.5)">Vibrant</option>
                  </select>
                </div>
              )}
            </>
          )}

          {avatarError   && <p className="mt-2 text-sm text-red-600">{avatarError}</p>}
          {avatarSuccess && <p className="mt-2 text-sm text-green-600">{avatarSuccess}</p>}

          <ModalActions onClose={() => setShowPic(false)} saveLabel="Save" onSave={handleSaveAvatar} />
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">{label}</label>
      <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">{value}</div>
    </div>
  );
}

function Input({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F1B66]/30 focus:border-[#2F1B66]"
        required
      />
    </div>
  );
}

function Modal({ children, onClose }: React.PropsWithChildren<{ onClose: () => void }>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-gray-900 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  saveLabel = "Save",
  onSave,
}: {
  onClose: () => void;
  saveLabel?: string;
  onSave?: () => void;
}) {
  return (
    <div className="flex justify-end space-x-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-100"
      >
        Cancel
      </button>
      <button
        type={onSave ? "button" : "submit"}
        onClick={onSave}
        className="rounded-lg px-6 py-2 font-teko text-white transition hover:brightness-110"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        {saveLabel}
      </button>
    </div>
  );
}
