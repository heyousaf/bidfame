import crypto from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

export interface VerifiedTelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Verifies Telegram Mini App `initData` per the official algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * NEVER trust a client-supplied Telegram user id. This is the only
 * legitimate way to know who is calling the API from inside the Mini App.
 */
export function verifyInitData(
  initData: string,
  maxAgeSeconds = 24 * 60 * 60
): { ok: true; user: VerifiedTelegramUser } | { ok: false; reason: string } {
  if (!BOT_TOKEN) return { ok: false, reason: "server misconfigured: missing bot token" };
  if (!initData) return { ok: false, reason: "missing initData" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "missing hash" };
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) {
    return { ok: false, reason: "invalid signature" };
  }

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    return { ok: false, reason: "initData expired" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, reason: "missing user" };

  try {
    const user = JSON.parse(userRaw) as VerifiedTelegramUser;
    if (!user.id) return { ok: false, reason: "malformed user" };
    return { ok: true, user };
  } catch {
    return { ok: false, reason: "malformed user json" };
  }
}

async function callTelegramApi<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T> {
  if (!API_BASE) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Telegram API ${method} failed: ${json.description ?? "unknown error"}`);
  }
  return json.result as T;
}

/**
 * Creates a Telegram Stars invoice link for a bid. Digital goods/services
 * must use currency XTR and an empty provider_token.
 * https://core.telegram.org/bots/payments-stars
 */
export function createStarsInvoiceLink(params: {
  title: string;
  description: string;
  payload: string; // opaque string we control — e.g. `bid:<bidId>`
  amountStars: number;
}) {
  return callTelegramApi<string>("createInvoiceLink", {
    title: params.title,
    description: params.description,
    payload: params.payload,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: params.title, amount: params.amountStars }]
  });
}

export function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
  return callTelegramApi("answerPreCheckoutQuery", {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(errorMessage ? { error_message: errorMessage } : {})
  });
}

export function sendMessage(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  return callTelegramApi("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

export function setWebhook(url: string, secretToken: string) {
  return callTelegramApi("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "pre_checkout_query"]
  });
}

/**
 * Used when a payment succeeds but we can no longer honor the bid (someone
 * else's payment landed first for the same target amount). Telegram Stars
 * payments can be refunded to the paying user via this method.
 */
export function refundStarPayment(telegramUserId: string | number, telegramChargeId: string) {
  return callTelegramApi("refundStarPayment", {
    user_id: telegramUserId,
    telegram_payment_charge_id: telegramChargeId
  });
}

export function setMyCommands() {
  return callTelegramApi("setMyCommands", {
    commands: [
      { command: "start", description: "Open BIDFAME" },
      { command: "help", description: "How BIDFAME works" },
      { command: "leaderboard", description: "See the current rankings" },
      { command: "myprofile", description: "View your listing & bid history" }
    ]
  });
}
