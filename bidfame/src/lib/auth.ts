import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { verifyInitData } from "./telegram";

/**
 * Every authenticated API route expects the Mini App to send the raw
 * Telegram `initData` string in this header. We re-verify it server-side
 * on every request — we never persist a session token derived from it.
 */
const INIT_DATA_HEADER = "x-telegram-init-data";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(req: NextRequest) {
  const initData = req.headers.get(INIT_DATA_HEADER);
  const result = verifyInitData(initData ?? "");
  if (!result.ok) {
    throw new AuthError(`unauthorized: ${result.reason}`);
  }

  const tgUser = result.user;
  const telegramId = String(tgUser.id);
  const isAdmin = process.env.ADMIN_ID === telegramId;

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      isAdmin
    },
    create: {
      telegramId,
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      isAdmin
    }
  });

  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireUser(req);
  if (!user.isAdmin) {
    throw new AuthError("forbidden: admin only", 403);
  }
  return user;
}
