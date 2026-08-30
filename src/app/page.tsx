"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LeaderCard from "@/components/LeaderCard";
import ListingRow from "@/components/ListingRow";
import { Listing } from "@/lib/types";
import { getTelegramWebApp } from "@/lib/telegramClient";

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTelegramWebApp()?.ready();
    getTelegramWebApp()?.expand();
    loadPage(null, true);
  }, []);

  async function loadPage(cur: string | null, replace: boolean) {
    setLoading(true);
    const res = await fetch(`/api/listings${cur ? `?cursor=${cur}` : ""}`);
    const data = await res.json();
    setListings((prev) => (replace ? data.listings : [...prev, ...data.listings]));
    setCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }

  const leader = listings[0];
  const rest = listings.slice(1);

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-7 pb-28">
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-extrabold">
          Bid<span className="text-gold">Fame</span>
        </h1>
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase text-red-600">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live
        </div>
      </header>

      <p className="text-center text-sm text-black/50 mb-6">GET SEEN. GET FEATURED.</p>

      {loading && listings.length === 0 && (
        <div className="text-center text-black/40 py-10">Loading leaderboard…</div>
      )}

      {leader && <LeaderCard listing={leader} />}

      {rest.map((l) => (
        <ListingRow key={l.id} listing={l} />
      ))}

      {hasMore && (
        <button
          onClick={() => loadPage(cursor, false)}
          disabled={loading}
          className="w-full mt-4 py-3 rounded-full border border-gold/30 text-golddeep font-semibold text-sm disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load More"}
        </button>
      )}

      {!loading && listings.length === 0 && (
        <div className="text-center text-black/40 py-10">No listings yet. Be the first!</div>
      )}

      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto p-4">
        <div className="flex gap-2">
          <Link
            href="/create"
            className="flex-1 gold-gradient text-white font-bold text-center py-3.5 rounded-full shadow-lg"
          >
            🚀 Join BidFame
          </Link>
          <Link
            href="/profile"
            className="px-5 py-3.5 rounded-full border border-black/10 bg-white font-semibold text-sm flex items-center"
          >
            👤
          </Link>
        </div>
      </div>
    </main>
  );
}
