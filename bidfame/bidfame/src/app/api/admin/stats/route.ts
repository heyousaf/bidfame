import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const [totalUsers, totalListings, totalBids, successfulPayments, failedPayments, starsAgg, leader, recentPayments, leaderboard] =
      await Promise.all([
        prisma.user.count(),
        prisma.listing.count({ where: { active: true } }),
        prisma.bid.count(),
        prisma.payment.count({ where: { status: "SUCCESS" } }),
        prisma.payment.count({ where: { status: "FAILED" } }),
        prisma.payment.aggregate({ _sum: { amountStars: true }, where: { status: "SUCCESS" } }),
        prisma.listing.findFirst({ where: { active: true }, orderBy: { currentBid: "desc" } }),
        prisma.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: true, listing: true }
        }),
        prisma.listing.findMany({ where: { active: true }, orderBy: { currentBid: "desc" }, take: 50 })
      ]);

    return NextResponse.json({
      totalUsers,
      totalListings,
      totalBids,
      successfulPayments,
      failedPayments,
      totalStars: starsAgg._sum.amountStars ?? 0,
      currentLeader: leader,
      recentPayments,
      leaderboard
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
