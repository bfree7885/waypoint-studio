/**
 * RSS 2.0 and Atom feed parsing with malformed-feed tolerance.
 * Does not execute embedded content; returns plain fields only.
 */

import { stripHtml, sanitizeUrl, decodeEntities } from "./sanitize.mjs";

function cdataOrText(raw) {
  if (raw == null) return "";
  const s = String(raw);
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i);
  return decodeEntities(m ? m[1] : s).trim();
}

function firstMatch(chunk, patterns) {
  for (const re of patterns) {
    const m = chunk.match(re);
    if (m && m[1] != null) return cdataOrText(m[1]);
  }
  return "";
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function extractImage(chunk) {
  const enclosure = chunk.match(
    /<enclosure[^>]*url=["']([^"']+)["'][^>]*(?:type=["']image\/[^"']*["'])?/i
  );
  if (enclosure) {
    const url = sanitizeUrl(enclosure[1]);
    if (url) return { url, credit: null };
  }
  const media = chunk.match(/<media:content[^>]*url=["']([^"']+)["']/i);
  if (media) {
    const url = sanitizeUrl(media[1]);
    if (url) return { url, credit: null };
  }
  const mediaThumb = chunk.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  if (mediaThumb) {
    const url = sanitizeUrl(mediaThumb[1]);
    if (url) return { url, credit: null };
  }
  const img = chunk.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (img) {
    const url = sanitizeUrl(img[1]);
    if (url) return { url, credit: null };
  }
  return { url: null, credit: null };
}

function parseRssItems(xml, limit = 40) {
  const items = [];
  const raw = String(xml || "");
  const chunks = raw.split(/<item[\s>]/i).slice(1);
  for (const chunk of chunks) {
    if (items.length >= limit) break;
    const end = chunk.search(/<\/item>/i);
    const body = end >= 0 ? chunk.slice(0, end) : chunk;
    const title = firstMatch(body, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
    if (!title) continue;
    const link = firstMatch(body, [/<link[^>]*>([\s\S]*?)<\/link>/i]);
    const guid = firstMatch(body, [/<guid[^>]*>([\s\S]*?)<\/guid>/i]);
    const pub = firstMatch(body, [
      /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i,
      /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i
    ]);
    const desc = firstMatch(body, [
      /<description[^>]*>([\s\S]*?)<\/description>/i,
      /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i
    ]);
    const author = firstMatch(body, [
      /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i,
      /<author[^>]*>([\s\S]*?)<\/author>/i
    ]);
    const cats = [...body.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) =>
      stripHtml(cdataOrText(m[1]))
    );
    const image = extractImage(body);
    const canonical = sanitizeUrl(link) || sanitizeUrl(guid);
    items.push({
      format: "rss",
      title: stripHtml(title),
      link: canonical,
      guid: stripHtml(guid || link || title),
      publishedAt: parseDate(pub),
      description: desc,
      author: stripHtml(author) || null,
      categories: cats.filter(Boolean),
      imageUrl: image.url,
      imageCredit: image.credit
    });
  }
  return items;
}

function parseAtomEntries(xml, limit = 40) {
  const items = [];
  const raw = String(xml || "");
  const chunks = raw.split(/<entry[\s>]/i).slice(1);
  for (const chunk of chunks) {
    if (items.length >= limit) break;
    const end = chunk.search(/<\/entry>/i);
    const body = end >= 0 ? chunk.slice(0, end) : chunk;
    const title = firstMatch(body, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
    if (!title) continue;
    const linkHref =
      (body.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || [])[1] ||
      (body.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i) || [])[1] ||
      (body.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] ||
      "";
    const id = firstMatch(body, [/<id[^>]*>([\s\S]*?)<\/id>/i]);
    const published = firstMatch(body, [
      /<published[^>]*>([\s\S]*?)<\/published>/i,
      /<updated[^>]*>([\s\S]*?)<\/updated>/i
    ]);
    const summary = firstMatch(body, [
      /<summary[^>]*>([\s\S]*?)<\/summary>/i,
      /<content[^>]*>([\s\S]*?)<\/content>/i
    ]);
    const author = firstMatch(body, [/<name[^>]*>([\s\S]*?)<\/name>/i]);
    const cats = [...body.matchAll(/<category[^>]*term=["']([^"']+)["']/gi)].map((m) => m[1]);
    const image = extractImage(body);
    const canonical = sanitizeUrl(linkHref) || sanitizeUrl(id);
    items.push({
      format: "atom",
      title: stripHtml(title),
      link: canonical,
      guid: stripHtml(id || linkHref || title),
      publishedAt: parseDate(published),
      description: summary,
      author: stripHtml(author) || null,
      categories: cats.filter(Boolean),
      imageUrl: image.url,
      imageCredit: image.credit
    });
  }
  return items;
}

/**
 * Parse RSS or Atom XML into normalized raw items.
 * @returns {{ format: string, items: object[], warnings: string[] }}
 */
export function parseFeed(xml, options = {}) {
  const limit = options.limit || 40;
  const warnings = [];
  const raw = String(xml || "").trim();
  if (!raw) {
    return { format: "unknown", items: [], warnings: ["empty-feed"] };
  }
  if (!/<rss[\s>]|<feed[\s>]|<rdf:RDF[\s>]/i.test(raw) && !/<item[\s>]|<entry[\s>]/i.test(raw)) {
    warnings.push("unrecognized-feed-shape");
  }

  let items = parseRssItems(raw, limit);
  let format = "rss";
  if (!items.length) {
    items = parseAtomEntries(raw, limit);
    format = items.length ? "atom" : "unknown";
  }
  if (!items.length) warnings.push("no-parseable-items");

  // Drop items without a safe http(s) link
  const kept = [];
  for (const it of items) {
    if (!it.link) {
      warnings.push("item-missing-safe-url");
      continue;
    }
    kept.push(it);
  }
  return { format, items: kept, warnings };
}
