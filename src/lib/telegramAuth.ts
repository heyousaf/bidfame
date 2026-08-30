import crypto from "crypto";

/**
 * Verifies Telegram Mini App `initData` on the server.
 * Official algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * NEVER trust `initDataUnsafe` from the client. Always send the raw
 * `initData` string to the server and verify it here.
 */

export interface TelegramUserData {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface VerifiedInitData {
  user: TelegramUserData;
  authDate: number;
  startParam?: string;
}

const MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — reject stale initData

export function verifyTelegramInitData(
  initData: string,
  botToken: string
): VerifiedInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");

  const dataCheckArr: string[] = [];
  params.forEach((value, key) => {
    dataCheckArr.push(`${key}=${value}`);
  });
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  // secret_key = HMAC_SHA256(bot_token, "WebAppData")
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Constant-time compare
  const validSig =
    computedHash.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));

  if (!validSig) return null;

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - authDate > MAX_AGE_SECONDS) return null; // stale, reject

  const userRaw = params.get("user");
  if (!userRaw) return null;

  let user: TelegramUserData;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null;
  }

  if (!user?.id) return null;

  return {
    user,
    authDate,
    startParam: params.get("start_param") || undefined,
  };
}

/**
 * Helper used by every API route: pulls `initData` out of the request
 * body/header, verifies it, and returns the authenticated Telegram user.
 * Throws if invalid — callers should catch and return 401.
 */
export function requireTelegramUser(initData: string | null): TelegramUserData {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("Server misconfigured: missing bot token");
  if (!initData) throw new Error("Missing Telegram initData");

  const verified = verifyTelegramInitData(initData, botToken);
  if (!verified) throw new Error("Invalid or expired Telegram initData");

  return verified.user;
}
