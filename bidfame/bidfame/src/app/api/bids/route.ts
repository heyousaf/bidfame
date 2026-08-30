import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthError, requireUser } from "@/lib/auth";
import { createStarsInvoiceLink } from "@/lib/telegram";

const BID_INCREMENT = 100;
const STARTING_BID = 100;

const createBidSchema = z.object({
  listingId: z.string().min(1)
});

// Auth required. The frontend only tells us WHICH listing wants to bid —
// the amount is always derived from server-side state, never from the client.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { listingId } = createBidSchema.parse(await req.json());

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || !listing.active) {
      return NextResponse.json({ error: "listing not found" }, { status: 404 });
    }

    const currentHighest = await prisma.listing.aggregate({
      _max: { currentBid: true },
      where: { active: true }
    });
    const topBid = currentHighest._max.currentBid ?? 0;

    // The next valid bid is always 100 Stars above whoever is #1 right now —
    // even if you're bidding on a listing that isn't currently #1.
    const requiredAmount = topBid === 0 ? STARTING_BID : topBid + BID_INCREMENT;

    const bid = await prisma.bid.create({
      data: {
        listingId: listing.id,
        userId: user.id,
        amountStars: requiredAmount,
        previousBid: listing.currentBid,
        status: "PENDING"
      }
    });

    const payload = `bid:${bid.id}`;

    const invoiceLink = await createStarsInvoiceLink({
      title: `BIDFAME — Take the #1 spot`,
      description: `Bid ${requiredAmount} Stars to become the Current Leader on BIDFAME.`,
      payload,
      amountStars: requiredAmount
    });

    await prisma.bid.update({
      where: { id: bid.id },
      data: { telegramPaymentId: payload }
    });

    return NextResponse.json({ bidId: bid.id, amountStars: requiredAmount, invoiceLink });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
