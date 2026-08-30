import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTelegramUser } from "@/lib/telegramAuth";
import { safeInstagramUrl, safeUrl, isValidListingName, isValidMessage } from "@/lib/validate";

const PAGE_SIZE = 20;

// GET /api/listings?cursor=<id>  -> paginated leaderboard, sorted by currentBid desc
export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get("cursor");

  const listings = await prisma.listing.findMany({
    where: { active: true },
    orderBy: [{ currentBid: "desc" }, { createdAt: "asc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      name: true,
      instagram: true,
      website: true,
      description: true,
      imageUrl: true,
      currentBid: true,
      bidCount: true,
      createdAt: true,
    },
  });

  const hasMore = listings.length > PAGE_SIZE;
  const page = hasMore ? listings.slice(0, PAGE_SIZE) : listings;

  // Rank is computed relative to full ordering (offset-free: cursor pagination
  // means we don't know absolute rank cheaply for later pages without a count).
  // We fetch how many listings currently rank above the first item on this page.
  let startRank = 1;
  if (page.length > 0) {
    startRank =
      (await prisma.listing.count({
        where: { active: true, currentBid: { gt: page[0].currentBid } },
      })) + 1;
  }

  const ranked = page.map((l, i) => ({ ...l, rank: startRank + i }));

  return NextResponse.json({
    listings: ranked,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}

// POST /api/listings -> create a listing for the authenticated Telegram user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData, name, instagram, website, description, imageUrl } = body;

    const tgUser = requireTelegramUser(initData);

    if (!isValidListingName(name)) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!isValidMessage(description)) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    const igUrl = safeInstagramUrl(instagram);
    if (!igUrl) {
      return NextResponse.json({ error: "Invalid Instagram username" }, { status: 400 });
    }
    const siteUrl = website ? safeUrl(website) : null;
    if (website && !siteUrl) {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { telegramId: String(tgUser.id) },
      update: {
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
      },
      create: {
        telegramId: String(tgUser.id),
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
      },
    });

    // One listing per user (keep it simple, matches spec: user creates "a listing")
    const existing = await prisma.listing.findFirst({ where: { userId: user.id } });
    if (existing) {
      return NextResponse.json({ error: "You already have a listing", listingId: existing.id }, { status: 409 });
    }

    const listing = await prisma.listing.create({
      data: {
        userId: user.id,
        name: name.trim(),
        instagram: igUrl,
        website: siteUrl,
        description: description.trim(),
        imageUrl: imageUrl || null,
        currentBid: 0,
      },
    });

    return NextResponse.json({ listing });
  } catch (err: any) {
    const message = err?.message || "Something went wrong";
    const status = message.includes("Telegram") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
