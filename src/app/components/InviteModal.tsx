"use client";
import { useState } from "react";

export default function InviteModal({
  title,
  presetRole,                      // e.g. "client" for gym invites; otherwise let user pick
  roleOptions,                     // for admin flow: [{value:'admin',label:'PTSI Admin'},{value:'ptsi-intern',label:'PTSI Intern'}]
  gymId,                           // required for client/owner/trainer invites
  onClose,
}: {
  title: string;
  presetRole?: string;
  roleOptions?: {value:string,label:string}[];
  gymId?: string | null;
  onClose: () => void;
}) {
  const [role, setRole] = useState(presetRole || roleOptions?.[0]?.value || "client");
  const [name, setName] = useState("");
  const [link, setLink] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setErr(null); setLoading(true);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, gymId: gymId ?? null, name })
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(json.error || "Failed"); return; }
    setLink(json.link);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <h3 className="text-xl font-semibold mb-4">{title}</h3>

        {!presetRole && roleOptions && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Role</label>
            <select className="w-full border rounded p-2" value={role} onChange={e=>setRole(e.target.value)}>
              {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        {presetRole && <p className="text-sm text-gray-600 mb-2">Role: <b>{presetRole}</b></p>}

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Recipient name (optional)</label>
          <input className="w-full border rounded p-2" value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" />
        </div>

        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}

        {!link ? (
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button onClick={send} className="px-4 py-2 rounded text-white" style={{background:'#3B2F6D'}}>
              {loading ? "Creating…" : "Create Invite"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">Share this link:</p>
            <div className="flex items-center gap-2">
              <input readOnly className="flex-1 border rounded p-2" value={link} />
              <button onClick={() => navigator.clipboard.writeText(link)} className="px-3 py-2 rounded text-white" style={{background:'#F28C38'}}>Copy</button>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={onClose} className="px-4 py-2 border rounded">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
