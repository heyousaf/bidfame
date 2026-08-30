import { NextRequest, NextResponse } from "next/server";
import { requireTelegramUser } from "@/lib/telegramAuth";
import { uploadListingImage, validateImageFile } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const initData = formData.get("initData") as string | null;
    const file = formData.get("file") as File | null;

    const tgUser = requireTelegramUser(initData);
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    validateImageFile({ type: file.type, size: file.size });

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadListingImage(String(tgUser.id), buffer, ext, file.type);

    return NextResponse.json({ url });
  } catch (err: any) {
    const message = err?.message || "Upload failed";
    const status = message.includes("Telegram") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
