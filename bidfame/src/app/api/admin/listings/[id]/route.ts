import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthError, requireAdmin } from "@/lib/auth";

const patchSchema = z.object({
  action: z.enum(["enable", "disable", "remove"])
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const { action } = patchSchema.parse(await req.json());

    if (action === "remove") {
      // Soft-delete: keep bid/payment history intact for auditing, just
      // drop the listing off the public leaderboard permanently.
      await prisma.listing.update({ where: { id: params.id }, data: { active: false } });
      return NextResponse.json({ ok: true, removed: true });
    }

    const listing = await prisma.listing.update({
      where: { id: params.id },
      data: { active: action === "enable" }
    });

    return NextResponse.json({ listing });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
