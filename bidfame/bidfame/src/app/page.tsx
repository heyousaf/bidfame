"use client";

import { useEffect, useState, useCallback } from "react";
import { CurrentLeaderCard } from "@/components/CurrentLeaderCard";
import { LeaderboardList } from "@/components/LeaderboardList";
import { authedFetch, getWebApp, initTelegramApp, openInvoice } from "@/lib/telegramClient";

const BID_INCREMENT = 100;
const STARTING_BID = 100;

interface Listing {
  id: string;
  name: string;
  instagram: string;
  website?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  currentBid: number;
  bidCount: number;
  rank: number;
}

interface Me {
  user: { telegramName: string; username?: string };
  listing: (Listing & { active: boolean }) | null;
}

export default function HomePage() {
  const [leader, setLeader] = useState<Listing | null>(null);
  const [rest, setRest] = useState<Listing[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ name: "", instagram: "", website: "", description: "" });

  const loadLeaderboard = useCallback(async () => {
    const res = await fetch("/api/listings");
    const data = await res.json();
    setLeader(data.leader);
    setRest(data.rest);
  }, []);

  const loadMe = useCallback(async () => {
    const res = await authedFetch("/api/me");
    if (res.ok) setMe(await res.json());
  }, []);

  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const app = initTelegramApp();
    // Deep-link support: Instagram reels can link to `t.me/BIDFAME_bot/app?startapp=listing_<id>`
    // which Telegram exposes here as `start_param`.
    const startParam = app?.initDataUnsafe?.start_param;
    if (startParam?.startsWith("listing_")) {
      setHighlightId(startParam.replace("listing_", ""));
    }
    Promise.all([loadLeaderboard(), loadMe()]).finally(() => setLoading(false));
  }, [loadLeaderboard, loadMe]);

  const nextBid = leader ? leader.currentBid + BID_INCREMENT : STARTING_BID;

  async function handleBid(listingId: string) {
    if (!me?.listing) {
      setShowCreateForm(true);
      setStatus("Create your listing first — then you can bid.");
      return;
    }
    setBidding(true);
    setStatus(null);
    try {
      const res = await authedFetch("/api/bids", {
        method: "POST",
        body: JSON.stringify({ listingId })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Could not start bid.");
        return;
      }
      const result = await openInvoice(data.invoiceLink);
      if (result === "paid") {
        setStatus("🔥 Bid successful! Refreshing leaderboard...");
        await Promise.all([loadLeaderboard(), loadMe()]);
      } else if (result === "cancelled") {
        setStatus("Bid cancelled.");
      } else {
        setStatus("Payment did not complete. Try again.");
      }
    } finally {
      setBidding(false);
    }
  }

  async function handleCreateListing(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await authedFetch("/api/listings", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        instagram: form.instagram,
        website: form.website || undefined,
        description: form.description || undefined
      })
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Could not create listing.");
      return;
    }
    setShowCreateForm(false);
    await loadMe();
    setStatus("Listing created! Bid to enter the leaderboard.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-white/40">Loading BIDFAME…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-violet">Live Bidding</p>
          <h1 className="text-lg font-black">🔥 BIDFAME</h1>
        </div>
        {me && <p className="text-xs text-white/40">Hi, {me.user.telegramName.split(" ")[0]}</p>}
      </header>

      <CurrentLeaderCard leader={leader} nextBid={nextBid} />

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Bidders" value={rest.length + (leader ? 1 : 0)} />
        <Stat label="Top Bid" value={leader ? leader.currentBid : 0} suffix="⭐" />
        <Stat label="To Lead" value={nextBid} suffix="⭐" />
      </div>

      {status && (
        <p className="mt-4 rounded-xl border border-violet/30 bg-violet/10 px-4 py-2 text-center text-sm">
          {status}
        </p>
      )}

      {!me?.listing && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 w-full rounded-2xl border border-dashed border-white/20 py-3 text-sm font-semibold text-white/70 hover:bg-white/5"
        >
          + Create your listing to join the leaderboard
        </button>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateListing} className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4">
          <Input label="Brand / Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input
            label="Instagram username"
            value={form.instagram}
            onChange={(v) => setForm({ ...form, instagram: v })}
            required
          />
          <Input label="Website (optional)" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Input
            label="Short message (optional)"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-violet py-3 text-sm font-bold hover:bg-violetDeep"
          >
            Create Listing
          </button>
        </form>
      )}

      {me?.listing && (
        <button
          onClick={() => handleBid(me.listing!.id)}
          disabled={bidding}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-violet to-magenta py-4 text-base font-black shadow-glow transition active:scale-[0.98] disabled:opacity-50"
        >
          {bidding ? "Waiting for payment…" : `🔥 BID ${nextBid.toLocaleString()} ⭐`}
        </button>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">🏆 Live Rankings</h2>
        <LeaderboardList entries={rest} onBid={handleBid} highlightId={highlightId} />
      </section>
    </main>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface py-3">
      <p className="text-lg font-black">
        {value.toLocaleString()}
        {suffix && <span className="text-sm"> {suffix}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      <input
        className="mt-1 w-full rounded-xl border border-border bg-surfaceAlt px-3 py-2 text-sm text-white outline-none focus:border-violet"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
