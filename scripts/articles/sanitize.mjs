/**
 * Sanitize feed-provided HTML. Never execute scripts or load remote HTML into the app.
 * Keeps plain text excerpts only; strips tags, event handlers, and unsafe URL schemes.
 */

const UNSAFE_SCHEME = /^(?:javascript|data|vbscript|file|about):/i;

export function decodeEntities(input) {
  return String(input || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

export function stripHtml(input) {
  return decodeEntities(String(input || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(parsed.protocol)) return null;
  if (UNSAFE_SCHEME.test(raw)) return null;
  parsed.hash = "";
  return parsed.toString();
}

/** Normalize URL for duplicate detection (drop tracking params, trailing slash, www). */
export function normalizeUrl(url) {
  const safe = sanitizeUrl(url);
  if (!safe) return null;
  const u = new URL(safe);
  u.hostname = u.hostname.replace(/^www\./i, "").toLowerCase();
  u.protocol = u.protocol.toLowerCase();
  const drop = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid"
  ]);
  [...u.searchParams.keys()].forEach((k) => {
    if (drop.has(k.toLowerCase()) || k.toLowerCase().startsWith("utm_")) {
      u.searchParams.delete(k);
    }
  });
  let path = u.pathname.replace(/\/+$/, "") || "/";
  u.pathname = path;
  u.hash = "";
  return u.toString();
}

export function truncateWords(text, maxWords) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ") + "…";
}

export function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function contentHash(parts) {
  const raw = parts.map((p) => String(p || "").toLowerCase().trim()).join("|");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

export function sanitizeExcerpt(htmlOrText, maxChars = 600) {
  const text = stripHtml(htmlOrText);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + "…";
}
