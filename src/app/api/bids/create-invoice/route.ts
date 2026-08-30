import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireTelegramUser } from "@/lib/telegramAuth";
import { getRequiredNextBid } from "@/lib/bidding";

/**
 * POST /api/bids/create-invoice
 * body: { initData, listingId }
 *
 * Steps 1-8 of the payment flow (spec §6):
 * 1-2: authenticate user
 * 3-4: retrieve listing + current highest successful bid
 * 5:   calculate required next bid SERVER-SIDE (never trust client amount)
 * 6:   create a PENDING Bid row
 * 7:   create a Telegram Stars invoice link (XTR)
 * 8:   return the invoice link so the client can call Telegram.WebApp.openInvoice()
 */
export async function POST(req: NextRequest) {
  try {
    const { initData, listingId } = await req.json();
    const tgUser = requireTelegramUser(initData);

    const user = await prisma.user.upsert({
      where: { telegramId: String(tgUser.id) },
      update: {},
      create: { telegramId: String(tgUser.id), username: tgUser.username, firstName: tgUser.first_name, lastName: tgUser.last_name },
    });

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || !listing.active) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const requiredBid = await getRequiredNextBid();

    // Unique payload we can verify later in the webhook (also enforces idempotency
    // together with the unique DB constraints on Bid/Payment).
    const invoicePayload = `bid_${listing.id}_${user.id}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    const pendingBid = await prisma.bid.create({
      data: {
        listingId: listing.id,
        userId: user.id,
        amountStars: requiredBid,
        previousBid: listing.currentBid,
        status: "PENDING",
      },
    });

    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `BidFame — Bid for #1`,
        description: `Bid ${requiredBid} Stars to take the #1 spot for "${listing.name}" on BidFame.`,
        payload: invoicePayload,
        currency: "XTR",
        prices: [{ label: `Bid ${requiredBid} Stars`, amount: requiredBid }],
      }),
    });

    const data = await resp.json();
    if (!data.ok) {
      await prisma.bid.update({ where: { id: pendingBid.id }, data: { status: "FAILED" } });
      return NextResponse.json({ error: data.description || "Failed to create invoice" }, { status: 500 });
    }

    // Stash the payload -> bid mapping via a Payment placeholder row so the
    // webhook can find it by invoicePayload once Telegram confirms payment.
    await prisma.payment.create({
      data: {
        userId: user.id,
        listingId: listing.id,
        bidId: pendingBid.id,
        amountStars: requiredBid,
        currency: "XTR",
        telegramPaymentId: `pending_${invoicePayload}`, // placeholder, replaced on confirmation
        invoicePayload,
        status: "PENDING",
      },
    });

    return NextResponse.json({ invoiceLink: data.result, requiredBid, bidId: pendingBid.id });
  } catch (err: any) {
    const message = err?.message || "Something went wrong";
    const status = message.includes("Telegram") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
