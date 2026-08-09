/**
 * Sanitize feed-provided HTML. Never execute scripts or load remote HTML into the app.
 * Keeps plain text excerpts only; strips tags, event handlers, and unsafe URL schemes.
 *
 * Critical: naive /<[^>]+>/g breaks on `>` inside quoted attributes (e.g. CSS
 * sizes="(max-width: 1024px) …"), which leaks img attribute fragments into UI text.
 */

const UNSAFE_SCHEME = /^(?:javascript|data|vbscript|file|about):/i;

/** Match a single HTML/XML tag while respecting single/double-quoted attribute values. */
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*?(?:"[^"]*"|'[^']*'|[^>"'])*>/g;

/** WordPress / Jetpack “The post … appeared first on …” feed footers. */
const WP_FOOTER_RE =
  /\s*The post\s+.+?\s+appeared first on\s+.+?\.?$/i;

/** Dangling attribute fragments after a broken strip (defense in depth). */
const ATTR_LEAK_RE =
  /(?:^|\s)(?:"\s*)?(?:data-[a-z0-9-]+|srcset|sizes|src|href|class|width|height|alt|decoding|loading|srcset)=(?:"[^"]*"|'[^']*'|[^\s>]+)\s*\/?>?/gi;

export function decodeEntities(input) {
  return String(input || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const n = parseInt(h, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = Number(d);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    });
}

function stripBrokenTagRemnants(text) {
  return String(text || "")
    // Unclosed tags left after truncation / malformed feeds
    .replace(/<\/?[a-zA-Z][^>]*/g, " ")
    // Attribute leaks: `" data-large-file="https://…" />`
    .replace(ATTR_LEAK_RE, " ")
    // Orphan quote + attribute crumbs
    .replace(/\s+"\s+(?=[A-Za-z])/g, " ")
    .replace(/\s*\/?>\s*/g, " ");
}

function stripFeedBoilerplate(text) {
  return String(text || "")
    .replace(WP_FOOTER_RE, "")
    .replace(/\s*\[?\s*Continue reading\s*…?\s*\]?/gi, " ")
    .replace(/\s*Read more\s*…?\s*$/gi, " ");
}

export function stripHtml(input) {
  let text = decodeEntities(String(input || ""));
  text = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(HTML_TAG_RE, " ");
  // Second pass: catch any tag the quote-aware matcher missed (malformed markup).
  text = text.replace(/<[^>]+>/g, " ");
  text = stripBrokenTagRemnants(text);
  text = stripFeedBoilerplate(text);
  return text.replace(/\s+/g, " ").trim();
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

/** True when visible text still looks like leaked markup / feed chrome. */
export function looksLikeMarkupLeak(text) {
  const s = String(text || "");
  if (!s) return false;
  if (/<\/?[a-zA-Z]/.test(s)) return true;
  if (/\bdata-[a-z0-9-]+\s*=/i.test(s)) return true;
  if (/\b(?:srcset|sizes)\s*=/i.test(s)) return true;
  if (/wp-content\/uploads/i.test(s) && /https?:\/\//i.test(s)) return true;
  if (/The post\s+.+\s+appeared first on/i.test(s)) return true;
  return false;
}
