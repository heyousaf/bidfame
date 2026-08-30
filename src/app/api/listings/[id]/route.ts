import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredNextBid } from "@/lib/bidding";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing || !listing.active) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const rank =
    (await prisma.listing.count({
      where: { active: true, currentBid: { gt: listing.currentBid } },
    })) + 1;

  const requiredNextBid = await getRequiredNextBid();

  return NextResponse.json({ listing, rank, requiredNextBid });
}
