#!/usr/bin/env node
/**
 * Deep Forest Dispatch library + story contracts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}
function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

const required = [
  "deep-forest-dispatch/index.html",
  "deep-forest-dispatch/stories/mount-hood-rain-shadow/index.html",
  "deep-forest-dispatch/stories/lencois-maranhenses/index.html",
  "deep-forest-dispatch/stories/great-salt-lake-two-colors/index.html",
  "deep-forest-dispatch/stories/valley-fog-at-dawn/index.html",
  "deep-forest-dispatch/stories/lenticular-clouds-explained/index.html",
  "data/deep-forest-dispatch/catalog.json",
  "data/deep-forest-dispatch/stories/mount-hood-rain-shadow.json",
  "data/deep-forest-dispatch/stories/lencois-maranhenses.json",
  "data/deep-forest-dispatch/stories/great-salt-lake-two-colors.json",
  "data/deep-forest-dispatch/stories/valley-fog-at-dawn.json",
  "data/deep-forest-dispatch/stories/lenticular-clouds-explained.json",
  "design-system/css/wds-dfd.css",
  "design-system/js/dfd/wds-dfd-analytics.js",
  "design-system/js/dfd/wds-dfd-library.js",
  "design-system/js/dfd/wds-dfd-story.js",
  "scripts/dfd/render-stories.mjs",
  "docs/deep-forest-dispatch/DFD-CONTENT-WORKFLOW.md",
  "assets/images/deep-forest-dispatch/diagrams/rain-shadow.png",
  "assets/images/deep-forest-dispatch/diagrams/lencois-water-table.png",
  "assets/images/deep-forest-dispatch/diagrams/gsl-causeway-salinity.png",
  "assets/images/deep-forest-dispatch/diagrams/valley-fog-drainage.png",
  "assets/images/deep-forest-dispatch/diagrams/lenticular-standing-wave.png"
];

for (const p of required) {
  assert.ok(exists(p), "missing " + p);
}

const catalog = JSON.parse(read("data/deep-forest-dispatch/catalog.json"));
assert.equal(catalog.id, "deep-forest-dispatch");
assert.ok(Array.isArray(catalog.stories) && catalog.stories.length >= 5);

for (const entry of catalog.stories) {
  assert.ok(entry.slug && entry.path && entry.data, "catalog entry incomplete");
  assert.ok(exists(entry.data), "missing story data " + entry.data);
  const story = JSON.parse(read(entry.data));
  assert.equal(story.slug, entry.slug);
  assert.ok(story.title && story.sections && story.sections.length >= 4, "thin story " + entry.slug);
  assert.ok("youtubeVideoId" in story, "youtubeVideoId field required");
  // Must not invent fake video ids in committed content unless explicitly set
  if (story.youtubeVideoId != null) {
    assert.ok(typeof story.youtubeVideoId === "string" && story.youtubeVideoId.length >= 6);
  }
  assert.ok(Array.isArray(story.sources) && story.sources.length >= 1);
  assert.ok(Array.isArray(story.waypointConnections));
  for (const c of story.waypointConnections) {
    assert.ok(c.href && c.href.startsWith("/"), "connection href must be site-root absolute: " + c.href);
    const local = c.href.replace(/^\//, "").replace(/\/$/, "") + "/index.html";
    const localAlt = c.href.replace(/^\//, "");
    assert.ok(
      exists(local) || exists(localAlt) || exists(localAlt.replace(/\/$/, "") + ".html") || exists(path.join(localAlt, "index.html")),
      "waypoint connection target missing for " + c.href
    );
  }
  const htmlPath = "deep-forest-dispatch/" + entry.path + "index.html";
  assert.ok(exists(htmlPath), "rendered html missing " + htmlPath);
  const html = read(htmlPath);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /og:title/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, new RegExp(story.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  if (!story.youtubeVideoId) {
    assert.match(html, /Film companion coming soon/);
    assert.doesNotMatch(html, /youtube\.com\/embed\/null/);
    assert.doesNotMatch(html, /VideoObject/);
  } else {
    assert.match(html, /youtube-nocookie\.com\/embed\//);
    assert.match(html, /VideoObject/);
  }
  assert.match(html, /Sources/);
  assert.match(html, /dfd-connections|Continue in Waypoint/);
}

const library = read("deep-forest-dispatch/index.html");
assert.match(library, /Deep Forest Dispatch/);
assert.match(library, /mount-hood-rain-shadow/);
assert.match(library, /lencois-maranhenses/);
assert.match(library, /great-salt-lake-two-colors/);
assert.match(library, /valley-fog-at-dawn/);
assert.match(library, /lenticular-clouds-explained/);
assert.match(library, /wds-dfd-analytics/);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /\/deep-forest-dispatch\//);
assert.match(sitemap, /mount-hood-rain-shadow/);
assert.match(sitemap, /lencois-maranhenses/);
assert.match(sitemap, /great-salt-lake-two-colors/);
assert.match(sitemap, /valley-fog-at-dawn/);
assert.match(sitemap, /lenticular-clouds-explained/);

const tokens = read("design-system/css/wds-tokens.css");
assert.match(tokens, /data-product="deep-forest-dispatch"/);

const articles = read("articles/index.html");
assert.match(articles, /deep-forest-dispatch/);

// Scientific caution retained on Lençóis story
const lencois = read("data/deep-forest-dispatch/stories/lencois-maranhenses.json");
assert.match(lencois, /Scientific caution/i);
assert.match(lencois, /desert label|actually a desert|isn.t a desert/i);

console.log("DFD tests passed.");
