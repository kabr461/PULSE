"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSupabaseClient }           from "@supabase/auth-helpers-react";
import { useRouter, useSearchParams }  from "next/navigation";
import type { ReactNode }               from "react";

/* ─── brand colours ─── */
const PRIMARY = "#3B2F6D";
const ACCENT  = "#F28C38";

/* DB row type */
type Client = {
  id:           string;
  display_name: string;
  email:        string;
  age:          number | null;
  payload:      Record<string, any>;
  created_at:   string;
};

/* Custom UID generation */
const generateUid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });

export default function ClientsClient() {
  const sb           = useSupabaseClient();
  const router       = useRouter();
  const searchParams = useSearchParams();

  /* viewer info */
  const [viewerRole,  setViewerRole ] = useState<string|null>(null);
  const [viewerGymId, setViewerGymId] = useState<string|null>(null);
  const [viewerId,    setViewerId   ] = useState<string|null>(null);

  /* fetch viewer profile once */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) return;
      const { data, error } = await sb
        .from("profiles").select("id, role, gym_id")
        .eq("id", session.user.id).single();
      if (!error && data) {
        setViewerRole(data.role);
        setViewerGymId(data.gym_id);
        setViewerId(data.id);
      }
    })();
  }, [sb]);

  /* route guard */
  const fromParam     = searchParams.get("from") ?? "";
  const cameFromOwner = fromParam === "owner-clients";
  useEffect(() => {
    if (!viewerRole || cameFromOwner) return;
    if (viewerRole === "admin") {
      router.replace("/profile/admin-clients");
    } else if (viewerRole === "owner" && viewerGymId) {
      router.replace(`/profile/owner-clients?gymId=${viewerGymId}`);
    }
  }, [viewerRole, viewerGymId, cameFromOwner, router]);

  /* clients list */
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  /* modal state */
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [showDetail,     setShowDetail]     = useState(false);
  const [showEdit,       setShowEdit]       = useState(false);
  const [showNew,        setShowNew]        = useState(false);

  /* fetcher */
  const fetchClients = useCallback(async () => {
    const gymIdURL  = searchParams.get("gymId");
    const trainerId = searchParams.get("trainerId");
    const gymToUse  = gymIdURL || viewerGymId;
    if (!gymToUse) { setClients([]); return; }

    setLoading(true);
    if (viewerRole === "trainer" && viewerId) {
      const { data, error } = await sb
        .from("clients").select("*")
        .eq("gym_id", gymToUse)
        .eq("profile_id", viewerId)
        .order("display_name");
      if (!error) setClients(data ?? []);
    }
    else if ((viewerRole === "owner" || viewerRole === "admin") && trainerId) {
      const { data, error } = await sb
        .from("clients").select("*")
        .eq("gym_id", gymToUse)
        .eq("profile_id", trainerId)
        .order("display_name");
      if (!error) setClients(data ?? []);
    }
    else {
      setClients([]);
    }
    setLoading(false);
  }, [sb, viewerRole, viewerGymId, viewerId, searchParams]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  /* create handler */
  const handleCreate = async (newClientData: {
    display_name: string;
    email:        string;
    age:          number|null;
    payload:      Record<string, any>;
  }) => {
    const newClientId    = generateUid();
    const gymIdToUse     = viewerGymId || searchParams.get("gymId");
    const trainerIdToUse = viewerRole === "trainer"
      ? viewerId
      : searchParams.get("trainerId");
    if (!gymIdToUse || !trainerIdToUse) {
      alert("Error: Gym or Trainer ID missing");
      return;
    }

    // duplicate check
    const { data: existingClient, error: checkError } = await sb
      .from("clients").select("id")
      .eq("gym_id", gymIdToUse)
      .eq("profile_id", trainerIdToUse)
      .single();
    if (existingClient) {
      alert("A client with this trainer and gym already exists.");
    }

    const { error } = await sb
      .from("clients").insert({
        id: newClientId,
        profile_id: trainerIdToUse,
        gym_id: gymIdToUse,
        display_name: newClientData.display_name.trim(),
        email: newClientData.email.trim(),
        age: newClientData.age,
        payload: {},
      });
    if (!error) {
      setShowNew(false);
      await fetchClients();
    } else {
      console.error("create error", error);
      alert("Could not create client – see console");
    }
  };

  /* delete handler */
  const handleDelete = async (c: Client) => {
    if (!confirm(`Delete ${c.display_name}?`)) return;
    const { error } = await sb
      .from("clients").delete().eq("id", c.id);
    if (!error) {
      setSelectedClient(null);
      await fetchClients();
    } else {
      console.error("delete error", error);
      alert("Could not delete client – see console");
    }
  };

  /* render */
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 sm:px-10 font-lato">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <button onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm">
          ← Back
        </button>
        <h1 className="font-teko text-4xl" style={{ color: PRIMARY }}>
          Clients
        </h1>
        {(viewerRole === "trainer" || viewerRole === "admin") && (
          <button onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-white font-semibold shadow hover:brightness-110 transition"
            style={{ background: ACCENT }}>
            + New Client
          </button>
        )}
      </div>

      {/* table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800 text-white font-semibold">
            <tr>
              {["Name","Email","Age","Joined","Actions"].map(h => (
                <th key={h} className="px-6 py-4 text-center border-b border-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-700">
                Loading…
              </td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-700 italic">
                (no clients)
              </td></tr>
            ) : clients.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-center text-gray-700">{c.display_name}</td>
                <td className="px-6 py-4 text-center text-gray-700">{c.email}</td>
                <td className="px-6 py-4 text-center text-gray-700">{c.age ?? "—"}</td>
                <td className="px-6 py-4 text-center text-gray-700">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-center space-x-4">
                  <button onClick={() => { setSelectedClient(c); setShowDetail(true);} }
                    className="text-primary-700 hover:underline font-medium"
                    style={{ color: PRIMARY }}>
                    Details
                  </button>
                  {(viewerRole === "trainer" || viewerRole === "admin") && (
                    <>
                      <button onClick={() => { setSelectedClient(c); setShowEdit(true);} }
                        className="text-accent-700 hover:underline font-medium"
                        style={{ color: ACCENT }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(c)}
                        className="text-red-600 hover:underline font-medium">
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* modals */}
      {showDetail && selectedClient && (
        <DetailModal client={selectedClient} onClose={() => setShowDetail(false)} />
      )}
      {showEdit && selectedClient && (
        <EditClientModal
          client={selectedClient}
          onSave={async (upd: ClientUpdateData) => {
            const { error } = await sb
              .from("clients").update(upd).eq("id", selectedClient.id);
            if (!error) {
              setShowEdit(false);
              await fetchClients();
            } else {
              console.error("update error", error);
              alert("Could not save – see console");
            }
          }}
          onCancel={() => setShowEdit(false)}
        />
      )}
      {showNew && (
        <NewClientModal
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
          gymId={viewerGymId || searchParams.get("gymId") || ""}
          trainerId={(viewerRole==="trainer"?viewerId:searchParams.get("trainerId"))||""}
        />
      )}
    </div>
  );
}

/* — DetailModal — */
function DetailModal({ client, onClose }: { client: Client; onClose(): void }) {
  const payload = client.payload ?? {};
  const keys = Object.keys(payload);
  return (
    <ModalFrame onClose={onClose} wide>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full">
        <h3 className="font-teko text-3xl mb-6" style={{ color: PRIMARY }}>
          Client Details
        </h3>
        {/* …rest unchanged… */}
      </div>
    </ModalFrame>
  );
}

/* — EditClientModal & NewClientModal & Input & ModalFrame — */

type ClientUpdateData = {
  display_name: string;
  email:        string;
  age:          number | null;
};

type ClientCreateData = ClientUpdateData & {
  payload: Record<string, any>;
};

/* — EditClientModal — */
function EditClientModal({
  client, onSave, onCancel,
}: {
  client:   Client;
  onSave(update: ClientUpdateData): Promise<void>;
  onCancel(): void;
}) {
  const [name, setName] = useState(client.display_name);
  const [email, setEmail] = useState(client.email);
  const [age, setAge] = useState<string>(client.age?.toString() ?? "");

  const handleSave = () => {
    onSave({
      display_name: name,
      email: email,
      age: age ? parseInt(age, 10) : null,
    });
  };

  return (
    <ModalFrame onClose={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full">
        <h3 className="font-teko text-3xl mb-6" style={{ color: PRIMARY }}>
          Edit Client
        </h3>
        <div className=" text-gray-700 space-y-4">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" />
          <Input label="Age" value={age} onChange={e => setAge(e.target.value)} type="number" />
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white font-semibold" style={{ background: ACCENT }}>
            Save Changes
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

/* — NewClientModal — */
function NewClientModal({
  onSave, onCancel,
}: {
  onSave(data: ClientCreateData): Promise<void>;
  onCancel(): void;
  gymId: string;
  trainerId: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");

  const handleSave = () => {
    onSave({
      display_name: name,
      email: email,
      age: age ? parseInt(age, 10) : null,
      payload: {},
    });
  };

  return (
    <ModalFrame onClose={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full">
        <h3 className="font-teko text-3xl mb-6" style={{ color: PRIMARY }}>
          New Client
        </h3>
        <div className=" text-gray-700 space-y-4">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Client's full name" />
          <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="client@example.com" />
          <Input label="Age" value={age} onChange={e => setAge(e.target.value)} type="number" placeholder="e.g., 25" />
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white font-semibold" style={{ background: ACCENT }}>
            Create Client
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

/* — Input — */
function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        {...rest}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        style={{ "--tw-ring-color": PRIMARY } as React.CSSProperties}
      />
    </div>
  );
}

/* — ModalFrame — */
function ModalFrame({ children, onClose, wide = false }: {
  children: ReactNode;
  onClose(): void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"
      onClick={onClose}>
      <div className={`relative ${wide ? "max-w-3xl" : "max-w-lg"} w-full`}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
