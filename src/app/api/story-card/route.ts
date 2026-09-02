import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { name: true, currentBid: true },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1920px;
    background: linear-gradient(160deg, #1a0a3c 0%, #3b1f7a 40%, #7c3aed 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: -apple-system, sans-serif;
    color: white; text-align: center; padding: 80px;
  }
  .badge { background: rgba(245,158,11,0.2); border: 2px solid rgba(245,158,11,0.5); border-radius: 50px; padding: 12px 32px; margin-bottom: 48px; }
  .badge span { color: #FCD34D; font-size: 28px; font-weight: 800; letter-spacing: 4px; }
  .crown { font-size: 160px; margin-bottom: 16px; }
  .rank { color: #F59E0B; font-size: 180px; font-weight: 900; line-height: 1; margin-bottom: 16px; }
  .name { font-size: 72px; font-weight: 800; margin-bottom: 24px; }
  .stars { background: rgba(245,158,11,0.2); border-radius: 50px; padding: 20px 48px; margin-bottom: 48px; }
  .stars span { color: #FCD34D; font-size: 48px; font-weight: 700; }
  .tagline { color: rgba(255,255,255,0.6); font-size: 36px; line-height: 1.5; margin-bottom: 48px; }
  .cta { background: #F59E0B; border-radius: 50px; padding: 24px 56px; }
  .cta span { color: #000; font-size: 32px; font-weight: 800; }
  .bottom { position: absolute; bottom: 48px; color: rgba(255,255,255,0.3); font-size: 28px; }
</style>
</head>
<body>
  <div class="badge"><span>BIDFAME</span></div>
  <div class="crown">👑</div>
  <div class="rank">#1</div>
  <div class="name">${listing.name}</div>
  <div class="stars"><span>⭐ ${listing.currentBid.toLocaleString()} Stars</span></div>
  <div class="tagline">I hold the #1 spot on<br>the BIDFAME leaderboard</div>
  <div class="cta"><span>Challenge me → @BIDFAME_bot</span></div>
  <div class="bottom">bidfame.vercel.app</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
