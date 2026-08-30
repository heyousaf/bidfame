const ALLOWED_PROTOCOLS = ["http:", "https:"];

/** Returns a safe absolute URL string, or null if invalid/dangerous. */
export function safeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let candidate = input.trim();
  if (!candidate) return null;

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Normalizes an Instagram handle/URL into a safe profile URL. */
export function safeInstagramUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let handle = input.trim();
  if (!handle) return null;

  // Already a full URL — validate it normally and require instagram.com
  if (/^https?:\/\//i.test(handle)) {
    const url = safeUrl(handle);
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.replace(/^www\./, "").endsWith("instagram.com")) return null;
      return url;
    } catch {
      return null;
    }
  }

  handle = handle.replace(/^@/, "");
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return null;
  return `https://instagram.com/${handle}`;
}

export function isValidListingName(name: string) {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 60;
}

export function isValidMessage(msg: string) {
  return typeof msg === "string" && msg.trim().length >= 1 && msg.trim().length <= 200;
}
