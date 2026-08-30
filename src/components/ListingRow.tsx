import Link from "next/link";
import { Listing } from "@/lib/types";

export default function ListingRow({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listing/${listing.id}`}>
      <div className="card flex items-center gap-3 rounded-2xl p-3 mb-2 border border-black/5">
        <div className="w-9 text-center font-display font-bold text-black/40">#{listing.rank}</div>
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-surfacealt flex items-center justify-center shrink-0">
          {listing.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.imageUrl} alt={listing.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-lg text-gold/30">{listing.name[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{listing.name}</div>
          <div className="text-xs text-black/50 truncate">{listing.description}</div>
        </div>
        <div className="text-sm font-extrabold text-golddeep whitespace-nowrap">
          ⭐ {listing.currentBid.toLocaleString()}
        </div>
      </div>
    </Link>
  );
}
