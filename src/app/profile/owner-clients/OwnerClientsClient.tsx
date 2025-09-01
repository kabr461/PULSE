"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseClient }         from "@supabase/auth-helpers-react";

/* brand colours */
const PRIMARY = "#3B2F6D";
const ACCENT  = "#F28C38";

type Trainer = {
  id:           string;
  display_name: string;
  email:        string;
  badge_id:     string;
  last_active:  string;
};

export default function OwnerClientsClient() {
  const sb     = useSupabaseClient();
  const router = useRouter();
  const params = useSearchParams();

  const gymId = params.get("gymId");
  const [gymName,  setGymName]  = useState<string>("");
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading,  setLoading]  = useState(false);

  // load gym name
  useEffect(() => {
    if (!gymId) return;
    sb.from("gyms")
      .select("name")
      .eq("id", gymId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setGymName(data.name);
      });
  }, [sb, gymId]);

  // load trainers
  const loadTrainers = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    const { data, error } = await sb
      .from("profiles")
      .select<"id,display_name,email,badge_id,last_active", Trainer>(
        "id,display_name,email,badge_id,last_active"
      )
      .eq("gym_id", gymId)
      .eq("role",   "trainer")
      .order("display_name");
    if (!error) setTrainers(data || []);
    else console.error("loadTrainers:", error);
    setLoading(false);
  }, [sb, gymId]);

  useEffect(() => {
    loadTrainers();
  }, [loadTrainers]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 sm:px-10 font-lato">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/profile/admin-clients")}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm"
        >
          ← Back
        </button>
        <h1 className="font-teko text-4xl" style={{ color: PRIMARY }}>
          Trainers @ {gymName}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800 text-white font-semibold">
            <tr>
              {["Avatar", "Name", "Email", "Badge", "Last Active", ""].map((h) => (
                <th key={h} className="px-6 py-3 text-center">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-700">
                  Loading…
                </td>
              </tr>
            ) : trainers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-700 italic">
                  (no trainers)
                </td>
              </tr>
            ) : (
              trainers.map((t) => (
                <tr
                  key={t.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/profile/clients?from=owner-clients&gymId=${gymId}&trainerId=${t.id}`
                    )
                  }
                >
                  <td className="px-6 py-4 text-center">
                    <img
                      src={`/assets/profile.png`}
                      alt=""
                      className="h-8 w-8 rounded-full mx-auto"
                    />
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">
                    {t.display_name}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">
                    {t.email}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">
                    {t.badge_id}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">
                    {new Date(t.last_active).toLocaleString()}
                  </td>
                  <td
                    className="px-6 py-4 text-center text-2xl"
                    style={{ color: ACCENT }}
                  >
                    →
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
