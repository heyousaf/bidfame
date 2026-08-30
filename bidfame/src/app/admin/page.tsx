"use client";

import { useEffect, useState, useCallback } from "react";
import { authedFetch, initTelegramApp } from "@/lib/telegramClient";

interface Stats {
  totalUsers: number;
  totalListings: number;
  totalBids: number;
  successfulPayments: number;
  failedPayments: number;
  totalStars: number;
  currentLeader: { name: string; currentBid: number } | null;
  recentPayments: {
    id: string;
    amountStars: number;
    status: string;
    createdAt: string;
    user: { username?: string; firstName?: string };
    listing: { name: string };
  }[];
  leaderboard: { id: string; name: string; currentBid: number; active: boolean }[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await authedFetch("/api/admin/stats");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Access denied.");
      return;
    }
    setStats(await res.json());
  }, []);

  useEffect(() => {
    initTelegramApp();
    load();
  }, [load]);

  async function moderate(id: string, action: "enable" | "disable" | "remove") {
    await authedFetch(`/api/admin/listings/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
    load();
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-white/60">{error}</p>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-white/40">Loading admin dashboard…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-black">BIDFAME Admin</h1>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card label="Users" value={stats.totalUsers} />
        <Card label="Listings" value={stats.totalListings} />
        <Card label="Bids" value={stats.totalBids} />
        <Card label="Paid" value={stats.successfulPayments} />
        <Card label="Failed" value={stats.failedPayments} />
        <Card label="Total ⭐" value={stats.totalStars} />
      </div>

      {stats.currentLeader && (
        <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-sm">
          👑 Current Leader: <strong>{stats.currentLeader.name}</strong> — {stats.currentLeader.currentBid} ⭐
        </p>
      )}

      <h2 className="mt-6 text-sm font-bold uppercase tracking-widest text-white/50">Leaderboard</h2>
      <div className="mt-2 space-y-2">
        {stats.leaderboard.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <span>
              {l.name} — {l.currentBid} ⭐
            </span>
            <div className="flex gap-2">
              <button onClick={() => moderate(l.id, l.active ? "disable" : "enable")} className="text-xs text-violet">
                {l.active ? "Disable" : "Enable"}
              </button>
              <button onClick={() => moderate(l.id, "remove")} className="text-xs text-red-400">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-bold uppercase tracking-widest text-white/50">Recent Payments</h2>
      <div className="mt-2 space-y-2">
        {stats.recentPayments.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-xs">
            <span>
              {p.user.username ?? p.user.firstName ?? "user"} → {p.listing.name}
            </span>
            <span className={p.status === "SUCCESS" ? "text-green-400" : "text-red-400"}>
              {p.amountStars} ⭐ ({p.status})
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface py-3 text-center">
      <p className="text-lg font-black">{value.toLocaleString()}</p>
      <p className="text-[10px] uppercase text-white/40">{label}</p>
    </div>
  );
}
