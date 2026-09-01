"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getInitData, getTelegramWebApp } from "@/lib/telegramClient";

export default function ProfilePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTelegramWebApp()?.ready();
    (async () => {
      const initData = getInitData();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      const d = await res.json();
      setData(d);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <main className="max-w-[480px] mx-auto px-4 pt-10 text-center text-black/40">
      Loading…
    </main>
  );

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-7 pb-16">
      <h1 className="font-display text-2xl font-extrabold mb-1">
        👤 {data?.user?.firstName || data?.user?.username || "My Profile"}
      </h1>

      {/* ADMIN BUTTON — sirf admin ko dikhega */}
      {data?.user?.isAdmin && (
        <Link
          href="/admin"
          className="block text-center bg-black text-white font-bold py-3 rounded-full mb-4 mt-2"
        >
          ⚙️ Admin Dashboard
        </Link>
      )}

      {!data?.listing ? (
        <div className="mt-8 text-center">
          <p className="text-black/50 mb-4">You don't have a listing yet.</p>
          <Link href="/create" className="gold-gradient text-white font-bold px-6 py-3 rounded-full inline-block">
            🚀 Join BidFame
          </Link>
        </div>
      ) : (
        <>
          <div className="card rounded-2xl p-5 mt-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-black/50">Your Rank</span>
              <span className="font-bold">#{data.rank}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-black/50">Current Bid</span>
              <span className="font-bold">⭐ {data.listing.currentBid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-black/50">Successful Bids</span>
              <span className="font-bold">{data.bids.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-black/50">Total Stars Spent</span>
              <span className="font-bold">⭐ {data.totalStarsSpent.toLocaleString()}</span>
            </div>
          </div>

          <Link
            href={`/listing/${data.listing.id}`}
            className="block text-center gold-gradient text-white font-bold py-3.5 rounded-full shadow-lg mb-6"
          >
            🔥 Increase Bid
          </Link>

          <h2 className="font-semibold text-sm uppercase tracking-wide text-black/50 mb-2">
            Bid History
          </h2>
          {data.bids.length === 0 && (
            <p className="text-sm text-black/40">No bids yet.</p>
          )}
          {data.bids.map((b: any) => (
            <div key={b.id} className="flex justify-between text-sm py-2 border-b border-black/5">
              <span className="text-black/50">
                {new Date(b.createdAt).toLocaleDateString()}
              </span>
              <span className="font-semibold">
                {b.previousBid} → {b.amountStars} ⭐
              </span>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
