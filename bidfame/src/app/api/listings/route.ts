import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthError, requireUser } from "@/lib/auth";

// Public: fetch the leaderboard. #1 = current leader, rest ordered below.
export async function GET() {
  const listings = await prisma.listing.findMany({
    where: { active: true },
    orderBy: { currentBid: "desc" },
    select: {
      id: true,
      name: true,
      instagram: true,
      website: true,
      description: true,
      imageUrl: true,
      currentBid: true,
      bidCount: true
    }
  });

  const ranked = listings.map((listing, index) => ({ ...listing, rank: index + 1 }));

  return NextResponse.json({
    leader: ranked[0] ?? null,
    rest: ranked.slice(1)
  });
}

const createListingSchema = z.object({
  name: z.string().min(1).max(60),
  instagram: z.string().min(1).max(60),
  website: z.string().url().max(200).optional().or(z.literal("")),
  description: z.string().max(200).optional(),
  imageUrl: z.string().url().max(500).optional()
});

// Auth required: create a listing for the calling Telegram user.
// One listing per user — creating again just returns the existing one.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = createListingSchema.parse(await req.json());

    const existing = await prisma.listing.findFirst({ where: { userId: user.id } });
    if (existing) {
      return NextResponse.json({ listing: existing, created: false });
    }

    const listing = await prisma.listing.create({
      data: {
        userId: user.id,
        name: body.name,
        instagram: body.instagram,
        website: body.website || null,
        description: body.description,
        imageUrl: body.imageUrl,
        currentBid: 0,
        bidCount: 0
      }
    });

    return NextResponse.json({ listing, created: true }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid input", details: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
