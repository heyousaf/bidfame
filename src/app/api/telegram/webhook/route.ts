import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBAPP_URL = process.env.TELEGRAM_WEBAPP_URL!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tg(method: string, body: Record<string, unknown>) {
  return fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function POST(req: NextRequest) {
  // Verify this request actually came from Telegram.
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json();

  try {
    // ── /start, /help, /leaderboard, /myprofile ──────────────────────
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text: string = update.message.text.trim();

      if (text.startsWith("/start")) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "*BIDFAME*\n\nGET SEEN. GET FEATURED.",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🚀 OPEN BIDFAME", web_app: { url: WEBAPP_URL } }]],
          },
        });
      } else if (text.startsWith("/help")) {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "BIDFAME — pay-to-lead visibility leaderboard.\n\n" +
            "Bid Telegram Stars to take the #1 spot and get featured.\n\n" +
            "Commands:\n/leaderboard — view the leaderboard\n/myprofile — view your listing & bid history",
        });
      } else if (text.startsWith("/leaderboard")) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Open the live leaderboard 👇",
          reply_markup: {
            inline_keyboard: [[{ text: "🏆 Leaderboard", web_app: { url: WEBAPP_URL } }]],
          },
        });
      } else if (text.startsWith("/myprofile")) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Open your profile 👇",
          reply_markup: {
            inline_keyboard: [[{ text: "👤 My Profile", web_app: { url: `${WEBAPP_URL}/profile` } }]],
          },
        });
      }
      return NextResponse.json({ ok: true });
    }

    // ── pre_checkout_query: must answer within 10s. Re-validate everything. ──
    if (update.pre_checkout_query) {
      const pcq = update.pre_checkout_query;
      const payload: string = pcq.invoice_payload;

      const payment = await prisma.payment.findUnique({
        where: { invoicePayload: payload },
        include: { bid: true, listing: true },
      });

      let ok = true;
      let errorMessage: string | undefined;

      if (!payment || payment.status !== "PENDING" || !payment.bid) {
        ok = false;
        errorMessage = "This bid is no longer valid. Please try again.";
      } else if (pcq.currency !== "XTR") {
        ok = false;
        errorMessage = "Invalid currency.";
      } else if (pcq.total_amount !== payment.amountStars) {
        ok = false;
        errorMessage = "Bid amount has changed. Please try again.";
      } else {
        // Re-check the bid is still the current valid required amount
        // (protects against stale invoices after someone else already outbid).
        const highest = await prisma.listing.aggregate({
          where: { active: true },
          _max: { currentBid: true },
        });
        const currentHighest = highest._max.currentBid ?? 0;
        const stillValid = payment.amountStars === currentHighest + 100 || payment.bid.previousBid >= currentHighest;
        if (!stillValid) {
          ok = false;
          errorMessage = "Someone else already outbid this amount. Please refresh and try again.";
        }
      }

      await tg("answerPreCheckoutQuery", {
        pre_checkout_query_id: pcq.id,
        ok,
        ...(errorMessage ? { error_message: errorMessage } : {}),
      });
      return NextResponse.json({ ok: true });
    }

    // ── successful_payment: the ONLY place a bid becomes real ──────────
    const successfulPayment = update.message?.successful_payment;
    if (successfulPayment) {
      const payload: string = successfulPayment.invoice_payload;
      const telegramPaymentId: string = successfulPayment.telegram_payment_charge_id;
      const providerPaymentId: string | undefined = successfulPayment.provider_payment_charge_id;
      const totalAmount: number = successfulPayment.total_amount;
      const currency: string = successfulPayment.currency;

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { invoicePayload: payload },
          include: { bid: true, listing: true },
        });

        if (!payment || !payment.bid) return; // unknown payload — ignore safely

        // IDEMPOTENCY: if this payment was already finalized, do nothing.
        // The unique constraint on Payment.telegramPaymentId also guarantees
        // this at the DB level even under concurrent webhook deliveries.
        if (payment.status === "SUCCESS") return;

        if (currency !== "XTR" || totalAmount !== payment.amountStars) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
          await tx.bid.update({ where: { id: payment.bid.id }, data: { status: "FAILED" } });
          return;
        }

        // Re-verify against the CURRENT highest bid inside the transaction to
        // guard against race conditions (two users paying near-simultaneously).
        const currentTop = await tx.listing.findFirst({
          where: { active: true },
          orderBy: { currentBid: "desc" },
          select: { currentBid: true },
        });
        const currentHighest = currentTop?.currentBid ?? 0;

        if (payment.amountStars <= currentHighest) {
          // This payment is now stale (someone else already took a higher spot
          // while this payment was in flight). We still honor the Stars already
          // paid — mark bid SUCCESS and update the listing's bid — Stars were
          // real money and must not be silently discarded — but it will simply
          // not be #1 if it's below the new highest. Ranking is always purely
          // by currentBid, so this resolves itself automatically.
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            telegramPaymentId,
            telegramChargeId: providerPaymentId || null,
          },
        });

        await tx.bid.update({
          where: { id: payment.bid.id },
          data: {
            status: "SUCCESS",
            telegramPaymentId,
            telegramChargeId: providerPaymentId || null,
          },
        });

        await tx.listing.update({
          where: { id: payment.listingId },
          data: {
            currentBid: payment.amountStars,
            bidCount: { increment: 1 },
          },
        });
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    // Still 200 so Telegram doesn't hammer retries for a bug on our side while we fix it —
    // but log loudly. (If you'd rather Telegram retry, return 500 instead.)
    return NextResponse.json({ ok: true });
  }
}
