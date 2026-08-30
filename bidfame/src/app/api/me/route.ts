import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const listing = await prisma.listing.findFirst({ where: { userId: user.id } });

    let rank: number | null = null;
    if (listing && listing.active) {
      const above = await prisma.listing.count({
        where: { active: true, currentBid: { gt: listing.currentBid } }
      });
      rank = above + 1;
    }

    const bids = await prisma.bid.findMany({
      where: { userId: user.id, status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      select: { amountStars: true, createdAt: true, listingId: true }
    });

    const totalStarsSpent = bids.reduce((sum, b) => sum + b.amountStars, 0);

    return NextResponse.json({
      user: {
        telegramName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Anonymous",
        username: user.username
      },
      listing: listing
        ? { ...listing, rank }
        : null,
      bidCount: bids.length,
      totalStarsSpent,
      bidHistory: bids
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
