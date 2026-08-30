"use client";

interface Leader {
  id: string;
  name: string;
  instagram: string;
  website?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  currentBid: number;
}

export function CurrentLeaderCard({ leader, nextBid }: { leader: Leader | null; nextBid: number }) {
  if (!leader) {
    return (
      <div className="relative rounded-3xl border border-border bg-leader-gradient p-8 text-center shadow-glow">
        <div className="text-5xl mb-3">👑</div>
        <h2 className="text-xl font-semibold text-white/90">The throne is empty</h2>
        <p className="mt-2 text-sm text-white/50">
          Be the first to bid {nextBid} ⭐ and claim the #1 spot.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-gold/30 bg-leader-gradient p-6 shadow-glow overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet/30 blur-3xl animate-pulse-slow"
      />
      <div className="relative flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold">
          👑 Current Leader
        </span>

        <div className="relative mt-5 animate-float">
          <div className="absolute inset-0 rounded-full bg-gold/40 blur-xl" />
          {leader.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={leader.imageUrl}
              alt={leader.name}
              className="relative h-28 w-28 rounded-full border-4 border-gold object-cover shadow-goldGlow"
            />
          ) : (
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-gold bg-surfaceAlt text-4xl shadow-goldGlow">
              🏆
            </div>
          )}
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-xs font-black text-bg">
            #1
          </span>
        </div>

        <h2 className="mt-6 text-2xl font-extrabold tracking-tight">{leader.name}</h2>
        {leader.description && <p className="mt-1 max-w-xs text-sm text-white/60">{leader.description}</p>}

        <div className="mt-5 text-4xl font-black text-gold">
          {leader.currentBid.toLocaleString()} <span className="text-2xl">⭐</span>
        </div>

        <div className="mt-5 flex gap-3">
          <a
            href={`https://instagram.com/${leader.instagram.replace("@", "")}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Follow on Instagram
          </a>
          {leader.website && (
            <a
              href={leader.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Visit Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
