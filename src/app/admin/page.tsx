"use client";

import { useEffect, useState } from "react";
import { getInitData, getTelegramWebApp } from "@/lib/telegramClient";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTelegramWebApp()?.ready();
    load();
  }, []);

  async function load() {
    setError(null);
    const initData = getInitData();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Access denied");
      return;
    }
    setData(d);
  }

  if (error) return <main className="max-w-[480px] mx-auto px-4 pt-10 text-center text-red-600">{error}</main>;
  if (!data) return <main className="max-w-[480px] mx-auto px-4 pt-10 text-center text-black/40">Loading…</main>;

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-7 pb-16">
      <h1 className="font-display text-2xl font-extrabold mb-6">🛠 Admin</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Users" value={data.totalUsers} />
        <Stat label="Listings" value={data.totalListings} />
        <Stat label="Bids" value={data.totalBids} />
        <Stat label="Successful Payments" value={data.successfulPayments} />
        <Stat label="Failed Payments" value={data.failedPayments} />
        <Stat label="Total Stars" value={data.totalStars} />
      </div>

      {data.currentLeader && (
        <div className="card rounded-2xl p-4 mb-6">
          <div className="text-xs uppercase tracking-wide text-black/50 mb-1">Current #1</div>
          <div className="font-bold">{data.currentLeader.name}</div>
          <div className="text-sm text-golddeep font-semibold">⭐ {data.currentLeader.currentBid}</div>
        </div>
      )}

      <h2 className="font-semibold text-sm uppercase tracking-wide text-black/50 mb-2">Recent Transactions</h2>
      {data.recentPayments.map((p: any) => (
        <div key={p.id} className="flex justify-between text-sm py-2 border-b border-black/5">
          <span>{p.listingName}</span>
          <span className={p.status === "SUCCESS" ? "text-green-600" : "text-red-500"}>
            ⭐{p.amountStars} · {p.status}
          </span>
        </div>
      ))}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card rounded-xl p-3 text-center">
      <div className="text-xl font-extrabold">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wide text-black/50">{label}</div>
    </div>
  );
}
