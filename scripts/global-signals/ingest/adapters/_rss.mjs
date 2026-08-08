/** Minimal RSS/Atom item extraction for approved public feeds. */
import { contentHash } from "../../lib/io.mjs";

function decodeEntities(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : "";
}

function attr(block, name, attrName) {
  const re = new RegExp(`<${name}[^>]*${attrName}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

export function parseRssItems(xml, { max = 25 } = {}) {
  const items = [];
  const chunks = String(xml || "").split(/<item[\s>]/i).slice(1);
  const entryChunks = !chunks.length
    ? String(xml || "").split(/<entry[\s>]/i).slice(1)
    : [];
  const parts = chunks.length ? chunks : entryChunks;
  for (const part of parts) {
    const block = part.split(/<\/item>|<\/entry>/i)[0] || "";
    const title = tag(block, "title");
    const link =
      tag(block, "link") ||
      attr(block, "link", "href") ||
      tag(block, "guid") ||
      tag(block, "id");
    const summary =
      tag(block, "description") ||
      tag(block, "summary") ||
      tag(block, "content") ||
      title;
    const publishedAt =
      tag(block, "pubDate") ||
      tag(block, "published") ||
      tag(block, "updated") ||
      tag(block, "dc:date") ||
      null;
    if (!title || !link) continue;
    let iso = null;
    if (publishedAt) {
      const d = new Date(publishedAt);
      if (!Number.isNaN(d.getTime())) iso = d.toISOString();
    }
    items.push({
      title,
      link: link.startsWith("http") ? link : "",
      summary: summary.slice(0, 800),
      publishedAt: iso,
      guid: tag(block, "guid") || tag(block, "id") || link
    });
    if (items.length >= max) break;
  }
  return items;
}

export function makeEventId(adapterId, guid, title) {
  return `gse_${adapterId}_${contentHash([adapterId, guid || "", title || ""])}`;
}
