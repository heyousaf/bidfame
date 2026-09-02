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
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json();

  try {
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
          text: "BIDFAME — pay-to-lead visibility leaderboard.\n\nBid Telegram Stars to take the #1 spot and get featured.\n\nCommands:\n/leaderboard — view the leaderboard\n/myprofile — view your listing & bid history",
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

    const successfulPayment = update.message?.successful_payment;
    if (successfulPayment) {
      const payload: string = successfulPayment.invoice_payload;
      const telegramPaymentId: string = successfulPayment.telegram_payment_charge_id;
      const providerPaymentId: string | undefined = successfulPayment.provider_payment_charge_id;
      const totalAmount: number = successfulPayment.total_amount;
      const currency: string = successfulPayment.currency;

      let newTopUserId: string | null = null;
      let prevTopUserId: string | null = null;
      let newTopListingId: string | null = null;
      let paidAmount = 0;

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { invoicePayload: payload },
          include: { bid: true, listing: true },
        });

        if (!payment || !payment.bid) return;
        if (payment.status === "SUCCESS") return;

        if (currency !== "XTR" || totalAmount !== payment.amountStars) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
          await tx.bid.update({ where: { id: payment.bid.id }, data: { status: "FAILED" } });
          return;
        }

        // Find current #1 BEFORE update — to notify them they got outbid
        const currentTop = await tx.listing.findFirst({
          where: { active: true },
          orderBy: { currentBid: "desc" },
          include: { user: true },
        });

        if (currentTop && currentTop.currentBid > 0 && currentTop.userId !== payment.listing.userId) {
          prevTopUserId = currentTop.user.telegramId;
        }

        paidAmount = payment.amountStars;

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

        // Find new #1 AFTER update
        const newTop = await tx.listing.findFirst({
          where: { active: true },
          orderBy: { currentBid: "desc" },
          include: { user: true },
        });

        if (newTop) {
          newTopUserId = newTop.user.telegramId;
          newTopListingId = newTop.id;
        }
      });

      // Notify previous #1 — outbid hua
      if (prevTopUserId) {
        await tg("sendMessage", {
          chat_id: prevTopUserId,
          text: `😤 *Someone just outbid you on BIDFAME!*\n\nYou are no longer #1.\n\nPlace a higher bid to take back the top spot! 🔥`,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "🔥 Take Back #1", web_app: { url: WEBAPP_URL } }
            ]],
          },
        });
      }

      // Notify new #1 — congratulations
      if (newTopUserId) {
        await tg("sendMessage", {
          chat_id: newTopUserId,
          text: `👑 *YOU ARE NOW #1 ON BIDFAME!*\n\n⭐ *${paidAmount.toLocaleString()} Stars*\n\nYou hold the top spot!\nDownload your Story Card and flex on Instagram 📸\n\nStay alert — someone might outbid you! 🔥`,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "👑 View My Profile", web_app: { url: `${WEBAPP_URL}/profile` } }
            ]],
          },
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
