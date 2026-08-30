import Link from "next/link";
import { Listing } from "@/lib/types";

export default function LeaderCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listing/${listing.id}`}>
      <div className="card relative rounded-[32px] px-6 py-8 text-center overflow-hidden mb-6 border border-gold/20">
        <div className="text-[13px] font-bold tracking-[2px] uppercase text-golddeep mb-2">
          Currently Featured
        </div>
        <div className="inline-flex items-center gap-2 bg-gold/10 text-golddeep text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full border border-gold/30">
          👑 #1 on BidFame
        </div>

        <div className="relative w-32 h-32 mx-auto mt-6">
          <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-bg bg-surfacealt flex items-center justify-center">
            {listing.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.imageUrl} alt={listing.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-4xl text-gold/30">{listing.name[0]}</span>
            )}
          </div>
        </div>

        <h2 className="font-display text-2xl font-bold mt-4">{listing.name}</h2>
        <p className="text-sm text-black/60 mt-1 line-clamp-2">{listing.description}</p>

        <div className="mt-4 inline-flex items-center gap-2 gold-gradient text-white font-extrabold px-6 py-3 rounded-full text-lg shadow-lg">
          ⭐ {listing.currentBid.toLocaleString()} Stars
        </div>

        {(listing.instagram || listing.website) && (
          <div className="flex justify-center gap-3 mt-4 text-sm">
            {listing.instagram && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(listing.instagram, "_blank", "noopener,noreferrer");
                }}
                className="text-golddeep font-semibold underline-offset-2 hover:underline"
              >
                Instagram
              </button>
            )}
            {listing.website && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(listing.website, "_blank", "noopener,noreferrer");
                }}
                className="text-golddeep font-semibold underline-offset-2 hover:underline"
              >
                Website
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
