"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Listing } from "@/lib/types";
import { getInitData, getTelegramWebApp, openInvoice } from "@/lib/telegramClient";

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [requiredNextBid, setRequiredNextBid] = useState<number>(100);
  const [bidding, setBidding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const tg = getTelegramWebApp();
    tg?.ready();
    load();

    // Show Telegram's native back button (top-left chevron) while this page is open.
    tg?.BackButton?.show();
    const handleBack = () => router.push("/");
    tg?.BackButton?.onClick(handleBack);

    return () => {
      tg?.BackButton?.offClick(handleBack);
      tg?.BackButton?.hide();
    };
  }, [id]);

  async function load() {
    const res = await fetch(`/api/listings/${id}`);
    const data = await res.json();
    if (res.ok) {
      setListing(data.listing);
      setRank(data.rank);
      setRequiredNextBid(data.requiredNextBid);
    }
  }

  async function handleBid() {
    setMessage(null);
    setBidding(true);
    try {
      const initData = getInitData();
      const res = await fetch("/api/bids/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, listingId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const status = await openInvoice(data.invoiceLink);

      if (status === "paid") {
        getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
        setMessage(`🎉 Bid of ${data.requiredBid} Stars successful! Refreshing your new position…`);
        // Give the webhook a moment to process, then refresh.
        setTimeout(load, 1500);
      } else if (status === "cancelled") {
        setMessage("Payment cancelled.");
      } else {
        setMessage("Payment could not be completed. Please try again.");
      }
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setBidding(false);
    }
  }

  if (!listing) {
    return <main className="max-w-[480px] mx-auto px-4 pt-10 text-center text-black/40">Loading…</main>;
  }

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-7 pb-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-semibold text-black/50 mb-4"
      >
        ← Back
      </Link>

      <div className="card rounded-3xl p-6 text-center mb-6">
        <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden bg-surfacealt flex items-center justify-center mb-4">
          {listing.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.imageUrl} className="w-full h-full object-cover" alt={listing.name} />
          ) : (
            <span className="font-display text-4xl text-gold/30">{listing.name[0]}</span>
          )}
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-golddeep mb-1">Rank #{rank}</div>
        <h1 className="font-display text-2xl font-extrabold">{listing.name}</h1>
        <p className="text-sm text-black/60 mt-2">{listing.description}</p>

        <div className="flex justify-center gap-3 mt-4 text-sm">
          <a href={listing.instagram} target="_blank" rel="noreferrer" className="text-golddeep font-semibold">
            Instagram
          </a>
          {listing.website && (
            <a href={listing.website} target="_blank" rel="noreferrer" className="text-golddeep font-semibold">
              Website
            </a>
          )}
        </div>
      </div>

      <div className="card rounded-2xl p-5 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-black/50">Current Bid</span>
          <span className="font-bold">⭐ {listing.currentBid.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-black/50">Minimum Next Bid</span>
          <span className="font-bold text-golddeep">⭐ {requiredNextBid.toLocaleString()}</span>
        </div>
      </div>

      {message && <p className="text-center text-sm mb-4">{message}</p>}

      <button
        onClick={handleBid}
        disabled={bidding}
        className="w-full gold-gradient text-white font-bold py-4 rounded-full shadow-lg text-lg disabled:opacity-50"
      >
        {bidding ? "Processing…" : `🔥 BID ${requiredNextBid.toLocaleString()} ⭐`}
      </button>
    </main>
  );
}
