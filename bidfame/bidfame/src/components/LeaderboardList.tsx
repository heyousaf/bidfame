"use client";

interface Entry {
  id: string;
  rank: number;
  name: string;
  instagram: string;
  website?: string | null;
  imageUrl?: string | null;
  currentBid: number;
}

export function LeaderboardList({
  entries,
  onBid,
  highlightId
}: {
  entries: Entry[];
  onBid: (listingId: string) => void;
  highlightId?: string | null;
}) {
  if (entries.length === 0) {
    return <p className="mt-6 text-center text-sm text-white/40">No other listings yet.</p>;
  }

  return (
    <div className="mt-6 space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3 ${
            entry.id === highlightId ? "border-gold shadow-goldGlow" : "border-border"
          }`}
        >
          <span className="w-6 text-center text-sm font-bold text-white/40">#{entry.rank}</span>
          {entry.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.imageUrl} alt={entry.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surfaceAlt text-lg">🏢</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{entry.name}</p>
            <p className="truncate text-xs text-white/40">@{entry.instagram.replace("@", "")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-violet">{entry.currentBid.toLocaleString()} ⭐</p>
            <button
              onClick={() => onBid(entry.id)}
              className="mt-1 text-xs font-semibold text-gold hover:underline"
            >
              Bid to lead
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
