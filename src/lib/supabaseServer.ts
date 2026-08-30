import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Uses the service-role key. Never import this file
// into any client component or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const LISTING_IMAGES_BUCKET = "listing-images";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file: { type: string; size: number }) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG or WEBP images are allowed");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Image must be smaller than 5MB");
  }
}

export async function uploadListingImage(
  telegramId: string,
  fileBuffer: Buffer,
  fileExt: string,
  contentType: string
) {
  const path = `${telegramId}/${Date.now()}.${fileExt}`;
  const { error } = await supabaseServer.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(path, fileBuffer, { contentType, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabaseServer.storage
    .from(LISTING_IMAGES_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
