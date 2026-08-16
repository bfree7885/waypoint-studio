#!/usr/bin/env node
/**
 * Render Deep Forest Dispatch static story pages from JSON.
 * Usage: node scripts/dfd/render-stories.mjs
 *
 * Source of truth: data/deep-forest-dispatch/stories/*.json
 * Output: deep-forest-dispatch/stories/<slug>/index.html
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CATALOG = path.join(ROOT, "data/deep-forest-dispatch/catalog.json");
const OUT_ROOT = path.join(ROOT, "deep-forest-dispatch/stories");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mapEmbed(lat, lon, zoom) {
  const d = 360 / Math.pow(2, zoom || 7);
  const west = lon - d;
  const east = lon + d;
  const south = lat - d * 0.55;
  const north = lat + d * 0.55;
  const bbox = `${west}%2C${south}%2C${east}%2C${north}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&amp;layer=mapnik&amp;marker=${lat}%2C${lon}`;
}

function renderBlock(block) {
  switch (block.type) {
    case "p":
      return `<p>${block.html}</p>`;
    case "aside":
      return `<aside class="dfd-aside">${block.html}</aside>`;
    case "figure":
      return `<figure class="dfd-figure">
  <img src="${esc(block.src)}" alt="${esc(block.alt || "")}" loading="lazy">
  ${block.caption ? `<figcaption>${esc(block.caption)}${block.credit ? ` <span class="dfd-credit">${esc(block.credit)}</span>` : ""}</figcaption>` : block.credit ? `<figcaption class="dfd-credit">${esc(block.credit)}</figcaption>` : ""}
</figure>`;
    case "diagram":
      return `<figure class="dfd-figure dfd-figure--diagram">
  <img src="${esc(block.src)}" alt="${esc(block.alt || "Educational diagram")}" loading="lazy">
</figure>`;
    case "map":
      return `<figure class="dfd-map">
  <iframe title="Map of featured location" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapEmbed(block.lat, block.lon, block.zoom)}"></iframe>
  ${block.caption ? `<figcaption class="dfd-map__caption">${esc(block.caption)}</figcaption>` : ""}
</figure>`;
    case "compare":
      return `<figure class="dfd-compare" data-dfd-compare>
  <div class="dfd-compare__stage">
    <img class="dfd-compare__img" src="${esc(block.before.src)}" alt="${esc(block.before.alt || "")}">
    <div class="dfd-compare__after-wrap">
      <img class="dfd-compare__img" src="${esc(block.after.src)}" alt="${esc(block.after.alt || "")}">
    </div>
    <div class="dfd-compare__handle" aria-hidden="true"></div>
    <input class="dfd-compare__range" type="range" min="0" max="100" value="50" aria-label="Compare seasonal views">
  </div>
  <div class="dfd-compare__labels"><span>${esc(block.labelBefore || "Before")}</span><span>${esc(block.labelAfter || "After")}</span></div>
  ${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}
</figure>`;
    default:
      return "";
  }
}

function videoBlock(story) {
  const id = story.youtubeVideoId && String(story.youtubeVideoId).trim();
  if (id) {
    return `<div class="dfd-video">
  <div class="dfd-video__frame">
    <iframe
      src="https://www.youtube-nocookie.com/embed/${esc(id)}?rel=0"
      title="Deep Forest Dispatch video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      loading="lazy"
      data-dfd-track="DFD_YOUTUBE_CLICK"
      data-dfd-track-detail='{"slug":"${esc(story.slug)}","videoId":"${esc(id)}"}'></iframe>
  </div>
</div>`;
  }
  return `<div class="dfd-video" data-dfd-video-pending="true">
  <div class="dfd-video__pending" role="status">
    <strong>Film companion coming soon</strong>
    <p>The Deep Forest Dispatch video for this story is not public yet. This page stands on its own — when a YouTube ID is added to the story record, the embed appears here automatically.</p>
  </div>
</div>`;
}

function connections(story) {
  const items = story.waypointConnections || [];
  if (!items.length) return "";
  return `<section class="dfd-panel" aria-labelledby="dfd-wp-heading">
  <h2 id="dfd-wp-heading">Continue in Waypoint</h2>
  <ul class="dfd-connections">
    ${items
      .map((c) => {
        const detail = JSON.stringify({ slug: story.slug, tool: c.id }).replace(/'/g, "&#39;");
        return `<li><a href="${esc(c.href)}" data-dfd-track="DFD_WAYPOINT_TOOL_CLICK" data-dfd-track-detail='${detail}'><strong>${esc(c.label)}</strong><span>${esc(c.note || "")}</span></a></li>`;
      })
      .join("\n    ")}
  </ul>
</section>`;
}

function sources(story) {
  const src = story.sources || [];
  const credits = story.credits || [];
  if (!src.length && !credits.length) return "";
  return `<section class="dfd-sources">
  <details>
    <summary>Sources &amp; credits</summary>
    ${
      src.length
        ? `<ul>${src
            .map((s) => `<li><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.label)}</a> <span>(${esc(s.kind || "source")})</span></li>`)
            .join("")}</ul>`
        : ""
    }
    ${
      credits.length
        ? `<ul>${credits
            .map((c) => `<li><strong>${esc(c.asset)}</strong> — ${esc(c.credit)} · ${esc(c.license || "")}</li>`)
            .join("")}</ul>`
        : ""
    }
  </details>
</section>`;
}

function structuredData(story) {
  const base = "https://waypointstudio.org";
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.metaDescription || story.shortDescription,
    datePublished: story.published,
    dateModified: story.published,
    author: { "@type": "Organization", name: "Deep Forest Dispatch · Waypoint Studio" },
    publisher: { "@type": "Organization", name: "Waypoint Studio", url: base },
    mainEntityOfPage: base + story.canonicalPath,
    image: story.ogImage ? [base + story.ogImage] : undefined,
    about: (story.concepts || []).map((c) => ({ "@type": "Thing", name: c }))
  };
  const id = story.youtubeVideoId && String(story.youtubeVideoId).trim();
  const graphs = [data];
  if (id) {
    graphs.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: story.title,
      description: story.metaDescription || story.shortDescription,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      uploadDate: story.published
    });
  }
  return `<script type="application/ld+json">${JSON.stringify(graphs.length === 1 ? graphs[0] : graphs)}</script>`;
}

function renderStory(story) {
  const loc = story.location || {};
  const sections = (story.sections || [])
    .map((sec) => {
      return `<section id="${esc(sec.id)}" aria-labelledby="h-${esc(sec.id)}">
  <h2 id="h-${esc(sec.id)}">${esc(sec.heading)}</h2>
  ${(sec.blocks || []).map(renderBlock).join("\n  ")}
</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" data-product="deep-forest-dispatch" data-dfd-slug="${esc(story.slug)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="description" content="${esc(story.metaDescription || story.shortDescription)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://waypointstudio.org${esc(story.canonicalPath)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Waypoint Studio">
  <meta property="og:title" content="${esc(story.seoTitle || story.title)}">
  <meta property="og:description" content="${esc(story.metaDescription || story.shortDescription)}">
  <meta property="og:url" content="https://waypointstudio.org${esc(story.canonicalPath)}">
  ${story.ogImage ? `<meta property="og:image" content="https://waypointstudio.org${esc(story.ogImage)}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <title>${esc(story.seoTitle || `${story.title} — Deep Forest Dispatch`)}</title>
  <link rel="icon" href="../../../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../../design-system/css/wds.css">
  <link rel="stylesheet" href="../../../design-system/css/wds-contact.css">
  <link rel="stylesheet" href="../../../design-system/css/wds-dfd.css">
  ${structuredData(story)}
</head>
<body>
  <a class="wds-skip" href="#main">Skip to content</a>
  <div class="wds-app was-shell" data-wds-app-shell data-product="deep-forest-dispatch" data-hide-local="true" data-shell-depth="2">
    <div data-wds-app-global data-shell-depth="2"></div>
    <main id="main" class="dfd-page dfd-page--story">
      <header class="dfd-hero">
        <p class="dfd-eyebrow"><a href="../../">Deep Forest Dispatch</a> · Visual story</p>
        <h1>${esc(story.title)}</h1>
        <p class="dfd-hero__deck">${esc(story.deck || story.shortDescription)}</p>
        <p class="dfd-hero__meta">
          <span>${esc(story.subtitle || loc.region || "")}</span>
          ${story.published ? `<time datetime="${esc(story.published)}">${esc(story.published)}</time>` : ""}
        </p>
        <figure class="dfd-hero-media">
          <img src="${esc(story.hero.src)}" alt="${esc(story.hero.alt || "")}" width="1600" height="900">
          <figcaption class="dfd-credit">${esc(story.hero.credit || "")}${story.hero.license ? ` · ${esc(story.hero.license)}` : ""}</figcaption>
        </figure>
      </header>

      ${videoBlock(story)}

      <article class="dfd-article">
        ${sections}
      </article>

      ${connections(story)}

      <section class="dfd-panel" data-dfd-related data-related='${esc(JSON.stringify(story.relatedStories || []))}' aria-labelledby="dfd-related-heading">
        <h2 id="dfd-related-heading">Related stories</h2>
        <ul class="dfd-related" data-dfd-related-list></ul>
      </section>

      ${sources(story)}

      <p class="dfd-back"><a href="../../">← All Deep Forest Dispatch stories</a> · <a href="../../../">Waypoint Home</a></p>
    </main>
    <div data-wds-app-footer data-shell-depth="2"></div>
  </div>
  <script src="../../../design-system/js/platform/wds-app-nav-config.js?v=local" defer></script>
  <script src="../../../design-system/js/platform/wds-app-nav.js?v=local" defer></script>
  <script src="../../../design-system/js/platform/wds-app-shell.js?v=local" defer></script>
  <script src="../../../design-system/js/dfd/wds-dfd-analytics.js?v=local" defer></script>
  <script src="../../../design-system/js/dfd/wds-dfd-story.js?v=local" defer></script>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      if (window.WDS && WDS.dfd && WDS.dfd.story) {
        WDS.dfd.story.boot({ slug: ${JSON.stringify(story.slug)} });
      }
    });
  </script>
</body>
</html>
`;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  for (const entry of catalog.stories || []) {
    const jsonPath = path.join(ROOT, entry.data);
    const story = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const dir = path.join(OUT_ROOT, story.slug);
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, "index.html");
    fs.writeFileSync(out, renderStory(story));
    console.log("rendered", path.relative(ROOT, out));
  }
}

main();
