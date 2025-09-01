// src/app/profile/admin-clients/page.tsx (or your current path)
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

/* brand colours */
const PRIMARY = "#3B2F6D";
const ACCENT  = "#F28C38";

type Gym = {
  id: string;
  name: string;
  created_at: string;
  owner: {
    id: string;
    display_name: string;
    email: string;
  } | null;
};

type GymRow = {
  id: string;
  name: string;
  created_at: string;
  owner_id: string | null;
  // Supabase nested result can be a single object or an array depending on relationship inference
  owner?: any;
};

export default function AdminClientsPage() {
  const sb     = useSupabaseClient();
  const router = useRouter();

  const [gyms,    setGyms]    = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGyms = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Pull gyms with owner_id + nested owner (via FK)
      const { data, error } = await sb
        .from("gyms")
        .select(`
          id,
          name,
          created_at,
          owner_id,
          owner:profiles!gyms_owner_id_fkey (
            id,
            display_name,
            email
          )
        `)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("loadGyms error:", error);
        setGyms([]);
        setLoading(false);
        return;
      }

      const rows = (data || []) as GymRow[];
      console.debug("[loadGyms] raw rows:", rows);

      // 2) Normalize the nested owner shape (object or array)
      const normalizeOwner = (o: any) => {
        if (!o) return null;
        return Array.isArray(o) ? (o[0] ?? null) : o;
      };

      let formatted: (Gym & { owner_id?: string | null })[] = rows.map((g) => ({
        id: g.id,
        name: g.name,
        created_at: g.created_at,
        owner_id: g.owner_id ?? null,
        owner: normalizeOwner(g.owner),
      }));

      // 3) Fallback: if owner is null but owner_id exists, fetch from profiles
      const missingOwnerIds = formatted
        .filter((g) => !g.owner && g.owner_id)
        .map((g) => g.owner_id!) as string[];

      if (missingOwnerIds.length) {
        console.debug("[loadGyms] missing owners for ids:", missingOwnerIds);
        const { data: owners, error: ownersErr } = await sb
          .from("profiles")
          .select("id, display_name, email")
          .in("id", missingOwnerIds);

        if (ownersErr) {
          console.error("fallback owners fetch error:", ownersErr);
        } else {
          const byId = new Map(owners!.map((o) => [o.id, o]));
          formatted = formatted.map((g) =>
            g.owner || !g.owner_id
              ? g
              : { ...g, owner: byId.get(g.owner_id) ?? null }
          );
        }
      }

      // 4) Strip helper owner_id and set final state
      const finalGyms: Gym[] = formatted.map(({ owner_id: _omit, ...g }) => g);
      console.debug("[loadGyms] final gyms:", finalGyms);

      setGyms(finalGyms);
    } catch (e) {
      console.error("loadGyms unexpected error:", e);
      setGyms([]);
    } finally {
      setLoading(false);
    }
  }, [sb]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadGyms();
      if (!alive) return;
    })();
    return () => { alive = false; };
  }, [loadGyms]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 sm:px-10 font-lato">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm"
        >
          ← Back
        </button>
        <h1 className="font-teko text-4xl" style={{ color: PRIMARY }}>
          Gym List
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800 text-white font-semibold">
            <tr>
              {["Name", "Owner", "Created", ""].map((h, i) => (
                <th key={h || `empty-${i}`} className="px-6 py-3 text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-700">
                  Loading…
                </td>
              </tr>
            ) : gyms.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-700 italic">
                  (no gyms)
                </td>
              </tr>
            ) : (
              gyms.map((g) => (
                <tr
                  key={g.id}
                  className="border-t hover:bg-gray-50 cursor-pointer transition-opacity duration-200"
                  onClick={() => router.push(`/profile/owner-clients?gymId=${g.id}`)}
                >
                  <td className="px-6 py-4 text-center text-gray-700">{g.name}</td>
                  <td className="px-6 py-4 text-center text-gray-700">
                    {g.owner
                      ? `${g.owner.display_name} (${g.owner.email})`
                      : <span className="italic text-gray-700">unassigned</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">
                    {new Date(g.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center text-2xl" style={{ color: ACCENT }}>→</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
