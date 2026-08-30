import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTelegramUser } from "@/lib/telegramAuth";

function assertAdmin(telegramId: string) {
  const adminId = process.env.ADMIN_ID;
  if (!adminId || telegramId !== adminId) {
    throw new Error("Forbidden: admin only");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();
    const tgUser = requireTelegramUser(initData);
    assertAdmin(String(tgUser.id));

    const [totalUsers, totalListings, totalBids, successfulPayments, failedPayments, starsAgg, top, recentPayments] =
      await Promise.all([
        prisma.user.count(),
        prisma.listing.count(),
        prisma.bid.count(),
        prisma.payment.count({ where: { status: "SUCCESS" } }),
        prisma.payment.count({ where: { status: "FAILED" } }),
        prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amountStars: true } }),
        prisma.listing.findFirst({ where: { active: true }, orderBy: { currentBid: "desc" } }),
        prisma.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { telegramId: true, username: true } }, listing: { select: { name: true } } },
        }),
      ]);

    return NextResponse.json({
      totalUsers,
      totalListings,
      totalBids,
      successfulPayments,
      failedPayments,
      totalStars: starsAgg._sum.amountStars || 0,
      currentLeader: top,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amountStars: p.amountStars,
        status: p.status,
        createdAt: p.createdAt,
        listingName: p.listing?.name,
        username: p.user?.username,
        telegramId: p.user?.telegramId,
      })),
    });
  } catch (err: any) {
    const status = err?.message?.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: err?.message }, { status });
  }
}

// PATCH: enable/disable/remove a listing
export async function PATCH(req: NextRequest) {
  try {
    const { initData, listingId, action } = await req.json();
    const tgUser = requireTelegramUser(initData);
    assertAdmin(String(tgUser.id));

    if (!["enable", "disable", "remove"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const active = action === "enable";
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: { active: action === "remove" ? false : active },
    });

    return NextResponse.json({ listing });
  } catch (err: any) {
    const status = err?.message?.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: err?.message }, { status });
  }
}
