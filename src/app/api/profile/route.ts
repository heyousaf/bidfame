import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTelegramUser } from "@/lib/telegramAuth";

export async function POST(req: NextRequest) {
  // POST because we need to send initData in the body (can't put it in a GET query safely/easily)
  try {
    const { initData } = await req.json();
    const tgUser = requireTelegramUser(initData);

    const user = await prisma.user.upsert({
  where: { telegramId: String(tgUser.id) },
  update: {
    username: tgUser.username ?? null,
    firstName: tgUser.first_name ?? null,
    lastName: tgUser.last_name ?? null,
  },
  create: {
    telegramId: String(tgUser.id),
    username: tgUser.username ?? null,
    firstName: tgUser.first_name ?? null,
    lastName: tgUser.last_name ?? null,
  },
  include: {
    listings: true,
    bids: {
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      select: { id: true, amountStars: true, previousBid: true, createdAt: true, listingId: true },
    },
  },
});
      include: {
        listings: true,
        bids: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          select: { id: true, amountStars: true, previousBid: true, createdAt: true, listingId: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null, listing: null, bids: [], totalStarsSpent: 0 });
    }

    const listing = user.listings[0] || null;
    let rank: number | null = null;
    if (listing) {
      rank =
        (await prisma.listing.count({
          where: { active: true, currentBid: { gt: listing.currentBid } },
        })) + 1;
    }

    const totalStarsSpent = user.bids.reduce((sum, b) => sum + b.amountStars, 0);

    return NextResponse.json({
      user: { telegramId: user.telegramId, username: user.username, firstName: user.firstName },
      listing,
      rank,
      bids: user.bids,
      totalStarsSpent,
    });
  } catch (err: any) {
    const message = err?.message || "Something went wrong";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
