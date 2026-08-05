/**
 * RSS export for Waypoint-curated article recommendations.
 * Clearly identifies Waypoint as curator/commentator — not the original publisher.
 */

import { stripHtml } from "./sanitize.mjs";

function xmlEscape(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso) {
  if (!iso) return new Date().toUTCString();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function itemXml(article) {
  const source = article.sourceName || "Unknown source";
  const summary = stripHtml(article.summary || "");
  const take = stripHtml(article.waypointTake || "");
  const cats = (article.categories || []).map((c) => `    <category>${xmlEscape(c)}</category>`).join("\n");
  const geos = (article.geographicScopes || [])
    .map((g) => `    <category domain="geographic">${xmlEscape(g)}</category>`)
    .join("\n");
  const description = [
    `Waypoint is curating and commenting on third-party reporting. Original publisher: ${source}.`,
    "",
    `Summary: ${summary}`,
    "",
    `Waypoint’s Take: ${take}`,
    "",
    `Read the original article at the publisher: ${article.canonicalUrl}`
  ].join("\n");

  return [
    "  <item>",
    `    <title>${xmlEscape(article.title)}</title>`,
    `    <link>${xmlEscape(article.canonicalUrl)}</link>`,
    `    <guid isPermaLink="true">${xmlEscape(article.canonicalUrl)}</guid>`,
    `    <pubDate>${rfc822(article.publishedAt || article.discoveredAt)}</pubDate>`,
    `    <source url="${xmlEscape(article.sourceUrl || article.canonicalUrl)}">${xmlEscape(source)}</source>`,
    `    <description>${xmlEscape(description)}</description>`,
    cats,
    geos,
    `    <author>${xmlEscape(source)}</author>`,
    "  </item>"
  ].join("\n");
}

export function buildRssFeed(articles, meta = {}) {
  const title = meta.title || "Waypoint Studio — Curated Articles";
  const link = meta.link || "https://waypointstudio.org/articles/";
  const description =
    meta.description ||
    "Waypoint Studio curates and comments on third-party outdoor, environmental, and scientific reporting. Original publishers remain the destination. Waypoint does not republish full articles.";
  const selfUrl = meta.selfUrl || "https://waypointstudio.org/feeds/waypoint-articles.xml";
  const lastBuild = rfc822(meta.updatedAt || new Date().toISOString());

  const items = (articles || []).map(itemXml).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${xmlEscape(link)}</link>
    <description>${xmlEscape(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>Waypoint Studio Articles Engine</generator>
    <atom:link href="${xmlEscape(selfUrl)}" rel="self" type="application/rss+xml"/>
    <copyright>Waypoint curates links and commentary only. Article text remains copyright of original publishers.</copyright>
${items}
  </channel>
</rss>
`;
}

export function filterForLocal(articles) {
  const local = new Set([
    "Hudson Valley",
    "Catskills",
    "Poconos",
    "Northern New Jersey",
    "Tri-State",
    "Adirondacks",
    "Northeast"
  ]);
  return (articles || []).filter((a) => (a.geographicScopes || []).some((g) => local.has(g)));
}

export function filterForPhotography(articles) {
  return (articles || []).filter((a) =>
    (a.categories || []).some((c) => /Photography|Hidden Landscapes|Astronomy/i.test(c))
  );
}

export function filterForScience(articles) {
  return (articles || []).filter((a) =>
    (a.categories || []).some((c) =>
      /Science|Climate|Geology|Conservation|Wildlife|Birds|Forests|Fungi|Rivers|Astronomy/i.test(c)
    )
  );
}
