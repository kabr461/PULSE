// src/lib/heartbeat.ts
export async function heartbeat(): Promise<void> {
  const res = await fetch("/api/admin/heartbeat", { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Heartbeat sync failed:", err);
    throw new Error(err.error || res.statusText);
  }
}
