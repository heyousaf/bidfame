import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { answerPreCheckoutQuery, refundStarPayment, sendMessage } from "@/lib/telegram";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

function extractBidId(payload: string): string | null {
  const match = /^bid:(.+)$/.exec(payload);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  // Telegram signs webhook calls with this header when a secret token is
  // configured via setWebhook. Reject anything that doesn't match.
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (!WEBHOOK_SECRET || secretHeader !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await req.json();

  try {
    if (update.pre_checkout_query) {
      await handlePreCheckoutQuery(update.pre_checkout_query);
    } else if (update.message?.successful_payment) {
      await handleSuccessfulPayment(update.message);
    } else if (update.message?.text) {
      await handleBotCommand(update.message);
    }
  } catch (err) {
    // Telegram will retry on non-200, but we log and still return 200 for
    // update types we intentionally ignore/handled defensively above.
    console.error("webhook handling error:", err);
  }

  // Always acknowledge quickly — Telegram requires a fast response.
  return NextResponse.json({ ok: true });
}

async function handlePreCheckoutQuery(query: {
  id: string;
  invoice_payload: string;
  total_amount: number;
}) {
  const bidId = extractBidId(query.invoice_payload);
  const bid = bidId ? await prisma.bid.findUnique({ where: { id: bidId }, include: { listing: true } }) : null;

  // Reject anything we don't recognize, anything already resolved, or
  // anything where the price no longer matches current state — this is our
  // last safety check before Telegram actually takes the user's Stars.
  const isValid =
    bid &&
    bid.status === "PENDING" &&
    bid.amountStars === query.total_amount &&
    bid.amountStars > bid.previousBid;

  if (!isValid) {
    await answerPreCheckoutQuery(query.id, false, "This bid is no longer available. Please refresh and try again.");
    return;
  }

  await answerPreCheckoutQuery(query.id, true);
}

async function handleSuccessfulPayment(message: {
  chat: { id: number };
  from?: { id: number };
  successful_payment: {
    invoice_payload: string;
    telegram_payment_charge_id: string;
    total_amount: number;
  };
}) {
  const payment = message.successful_payment;
  const bidId = extractBidId(payment.invoice_payload);
  if (!bidId) return;

  // Idempotency: if we've already recorded this exact Telegram charge,
  // do nothing — Telegram may deliver the same update more than once.
  const alreadyProcessed = await prisma.bid.findUnique({
    where: { telegramChargeId: payment.telegram_payment_charge_id }
  });
  if (alreadyProcessed) return;

  const result = await prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({ where: { id: bidId }, include: { user: true } });
    if (!bid) return { outcome: "missing" as const };

    const listing = await tx.listing.findUnique({ where: { id: bid.listingId } });
    if (!listing) return { outcome: "missing" as const };

    // Atomic compare-and-swap: only apply this bid if the listing's
    // currentBid is still strictly less than what was just paid for. If
    // another payment already pushed it higher, this update touches zero
    // rows and we know we lost the race — even though the Stars already
    // left the user's balance.
    const applied = await tx.listing.updateMany({
      where: { id: listing.id, currentBid: { lt: payment.total_amount } },
      data: { currentBid: payment.total_amount, bidCount: { increment: 1 } }
    });

    if (applied.count === 0) {
      await tx.bid.update({
        where: { id: bid.id },
        data: { status: "FAILED", telegramChargeId: payment.telegram_payment_charge_id }
      });
      await tx.payment.create({
        data: {
          userId: bid.userId,
          listingId: bid.listingId,
          bidId: bid.id,
          amountStars: payment.total_amount,
          telegramPaymentId: payment.invoice_payload,
          telegramChargeId: payment.telegram_payment_charge_id,
          status: "FAILED"
        }
      });
      return { outcome: "lost_race" as const, bid };
    }

    await tx.bid.update({
      where: { id: bid.id },
      data: { status: "SUCCESS", telegramChargeId: payment.telegram_payment_charge_id }
    });
    await tx.payment.create({
      data: {
        userId: bid.userId,
        listingId: bid.listingId,
        bidId: bid.id,
        amountStars: payment.total_amount,
        telegramPaymentId: payment.invoice_payload,
        telegramChargeId: payment.telegram_payment_charge_id,
        status: "SUCCESS"
      }
    });
    return { outcome: "success" as const, bid };
  });

  if (result.outcome === "lost_race" && result.bid) {
    // The user was already charged but someone else's payment landed
    // first for the same target amount — refund automatically.
    try {
      await refundStarPayment(result.bid.user.telegramId, payment.telegram_payment_charge_id);
    } catch (err) {
      console.error("refund failed — needs manual admin attention:", err);
    }
    await sendMessage(
      message.chat.id,
      `⚠️ Someone else claimed that bid amount a moment before you. Your ${payment.total_amount} Stars have been refunded — open BIDFAME to try again.`
    );
  } else if (result.outcome === "success") {
    await sendMessage(
      message.chat.id,
      `🔥 Your bid of ${payment.total_amount} ⭐ went through! Open BIDFAME to see your ranking.`
    );
  }
}

async function handleBotCommand(message: { chat: { id: number }; text: string }) {
  const webAppUrl = process.env.TELEGRAM_WEBAPP_URL ?? "";
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    await sendMessage(
      message.chat.id,
      "🔥 <b>BIDFAME</b>\n\nGET SEEN. GET FEATURED.",
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🚀 OPEN BIDFAME", web_app: { url: webAppUrl } }]]
        }
      }
    );
  } else if (text.startsWith("/help")) {
    await sendMessage(
      message.chat.id,
      "BIDFAME is a live leaderboard. Bid Telegram Stars to become the #1 Current Leader. Every new top bid must be exactly 100 ⭐ more than the current highest. Use /leaderboard to see rankings or /myprofile to see your own listing."
    );
  } else if (text.startsWith("/leaderboard") || text.startsWith("/myprofile")) {
    await sendMessage(message.chat.id, "Open the Mini App to see this live.", {
      reply_markup: {
        inline_keyboard: [[{ text: "🚀 OPEN BIDFAME", web_app: { url: webAppUrl } }]]
      }
    });
  }
}
