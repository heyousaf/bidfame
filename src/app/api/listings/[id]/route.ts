import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredNextBid } from "@/lib/bidding";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing || !listing.active) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const rank =
    (await prisma.listing.count({
      where: { active: true, currentBid: { gt: listing.currentBid } },
    })) + 1;

  const requiredNextBid = await getRequiredNextBid();

  return NextResponse.json({ listing, rank, requiredNextBid });
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { initData, name, instagram, website, description, imageUrl } = await req.json();
    const { requireTelegramUser } = await import("@/lib/telegramAuth");
    const { safeInstagramUrl, safeUrl } = await import("@/lib/validate");
    
    const tgUser = requireTelegramUser(initData);
    const user = await prisma.user.findUnique({ 
      where: { telegramId: String(tgUser.id) } 
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const listing = await prisma.listing.findUnique({ where: { id: params.id } });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (listing.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.listing.update({
      where: { id: params.id },
      data: {
        name: name?.trim() || listing.name,
        instagram: safeInstagramUrl(instagram) || listing.instagram,
        website: website ? safeUrl(website) : listing.website,
        description: description?.trim() || listing.description,
        imageUrl: imageUrl || listing.imageUrl,
      },
    });

    return NextResponse.json({ listing: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 401 });
  }
}
