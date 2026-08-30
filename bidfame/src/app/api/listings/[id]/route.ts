import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      bids: {
        where: { status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          amountStars: true,
          createdAt: true,
          user: { select: { username: true, firstName: true } }
        }
      }
    }
  });

  if (!listing || !listing.active) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rankAbove = await prisma.listing.count({
    where: { active: true, currentBid: { gt: listing.currentBid } }
  });

  return NextResponse.json({ listing, rank: rankAbove + 1 });
}
