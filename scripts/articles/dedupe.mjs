/**
 * Duplicate detection via canonical URL, normalized URL, GUID, title similarity, and content hash.
 */

import { normalizeUrl, contentHash, stripHtml } from "./sanitize.mjs";

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(title) {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((t) => t.length > 2)
  );
}

export function titleSimilarity(a, b) {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

export function articleFingerprint(item) {
  const norm = normalizeUrl(item.canonicalUrl || item.link);
  const excerpt = stripHtml(item.cleanedExcerpt || item.rawDescription || item.description || "").slice(0, 280);
  return {
    normalizedUrl: norm,
    guid: String(item.guid || "").trim().toLowerCase() || null,
    titleKey: normalizeTitle(item.title),
    contentHash: contentHash([normalizeTitle(item.title), excerpt, norm || ""])
  };
}

/**
 * Deduplicate a list of normalized article candidates.
 * Keeps the highest-trust / earliest-discovered canonical record.
 * @returns {{ articles: object[], duplicates: object[] }}
 */
export function deduplicateArticles(articles) {
  const byUrl = new Map();
  const byGuid = new Map();
  const byHash = new Map();
  const kept = [];
  const duplicates = [];

  const sorted = articles.slice().sort((a, b) => {
    const ta = a.trustWeight || 0;
    const tb = b.trustWeight || 0;
    if (tb !== ta) return tb - ta;
    const pa = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const pb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return pb - pa;
  });

  function markDuplicate(item, canonicalId, reason) {
    duplicates.push({
      ...item,
      status: "duplicate",
      duplicateOf: canonicalId,
      duplicateReason: reason
    });
  }

  for (const item of sorted) {
    const fp = articleFingerprint(item);
    item.contentHash = fp.contentHash;
    item.normalizedUrl = fp.normalizedUrl;

    if (fp.normalizedUrl && byUrl.has(fp.normalizedUrl)) {
      markDuplicate(item, byUrl.get(fp.normalizedUrl), "normalized-url");
      continue;
    }
    if (fp.guid && byGuid.has(fp.guid)) {
      markDuplicate(item, byGuid.get(fp.guid), "guid");
      continue;
    }
    if (fp.contentHash && byHash.has(fp.contentHash)) {
      markDuplicate(item, byHash.get(fp.contentHash), "content-hash");
      continue;
    }

    let titleDup = null;
    for (const existing of kept) {
      if (titleSimilarity(existing.title, item.title) >= 0.86) {
        const sameDay =
          existing.publishedAt &&
          item.publishedAt &&
          existing.publishedAt.slice(0, 10) === item.publishedAt.slice(0, 10);
        const nearPub =
          !existing.publishedAt ||
          !item.publishedAt ||
          Math.abs(Date.parse(existing.publishedAt) - Date.parse(item.publishedAt)) < 1000 * 60 * 60 * 72;
        if (sameDay || nearPub) {
          titleDup = existing.id;
          break;
        }
      }
    }
    if (titleDup) {
      markDuplicate(item, titleDup, "title-similarity");
      continue;
    }

    item.status = item.status || "active";
    item.duplicateOf = null;
    kept.push(item);
    if (fp.normalizedUrl) byUrl.set(fp.normalizedUrl, item.id);
    if (fp.guid) byGuid.set(fp.guid, item.id);
    if (fp.contentHash) byHash.set(fp.contentHash, item.id);
  }

  return { articles: kept, duplicates };
}
