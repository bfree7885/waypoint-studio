#!/usr/bin/env node
/**
 * Waypoint Articles RSS pipeline + UI contract tests.
 * Uses fixtures — does not hit live feeds (see automation/check-articles-live-feeds.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { parseFeed } from "../scripts/articles/parse-feed.mjs";
import {
  stripHtml,
  sanitizeUrl,
  sanitizeExcerpt,
  normalizeUrl
} from "../scripts/articles/sanitize.mjs";
import { classifyCategories, classifyGeography, shouldRejectTopic } from "../scripts/articles/classify.mjs";
import { deduplicateArticles, titleSimilarity } from "../scripts/articles/dedupe.mjs";
import { scoreArticle } from "../scripts/articles/score.mjs";
import { buildSummary, buildWaypointTake } from "../scripts/articles/summarize.mjs";
import {
  buildRssFeed,
  filterForLocal,
  filterForPhotography,
  filterForScience
} from "../scripts/articles/rss-export.mjs";
import { relatedProductsFor } from "../scripts/articles/related.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function pass(name) {
  console.log("PASS", name);
}
function fail(name, detail) {
  failures.push(name + ": " + detail);
  console.log("FAIL", name, "—", detail);
}
function assert(name, cond, detail) {
  if (cond) pass(name);
  else fail(name, detail || "assertion failed");
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

// ——— Parse / sanitize ———
const rssXml = read("data/articles/fixtures/sample-rss.xml");
const atomXml = read("data/articles/fixtures/sample-atom.xml");
const badXml = read("data/articles/fixtures/malformed.xml");

const rss = parseFeed(rssXml);
assert("RSS parsing yields items", rss.items.length >= 2, "got " + rss.items.length);
assert("RSS format detected", rss.format === "rss");
assert("RSS item has https link", /^https:/.test(rss.items[0].link || ""));

const atom = parseFeed(atomXml);
assert("Atom parsing yields items", atom.items.length >= 2, "got " + atom.items.length);
assert("Atom format detected", atom.format === "atom");
assert("Atom strips script tags from summary text via sanitize", !/<script/i.test(stripHtml(atom.items[0].description)));

const malformed = parseFeed(badXml);
assert("malformed feed does not throw", Array.isArray(malformed.items));
assert("malformed items without safe URLs dropped", malformed.items.length === 0);

assert("sanitize rejects javascript: URL", sanitizeUrl("javascript:alert(1)") === null);
assert("sanitize rejects data: URL", sanitizeUrl("data:text/html,hi") === null);
assert("sanitize accepts https URL", !!sanitizeUrl("https://example.org/a"));
assert("normalizeUrl drops utm", normalizeUrl("https://www.Example.org/a/?utm_source=x") === "https://example.org/a");
assert("sanitizeExcerpt strips tags", !/</.test(sanitizeExcerpt("<b>Hello</b> world")));

// ——— Classification ———
const warbler = {
  title: "Hudson Valley warblers begin overnight migration pulse",
  cleanedExcerpt: rss.items[0].description,
  categories: rss.items[0].categories
};
const feedBirds = {
  defaultCategories: ["Birds"],
  defaultGeographicScope: "National",
  publisher: "Example"
};
assert("rejects celebrity spam topic", shouldRejectTopic({ title: "Celebrity beach house", cleanedExcerpt: "reality tv smartphone affiliate coupon" }, feedBirds));
const cats = classifyCategories(warbler, feedBirds);
assert("classifies Birds", cats.includes("Birds"), JSON.stringify(cats));
const geo = classifyGeography(warbler, feedBirds);
assert("Hudson Valley geo from article text", geo.geographicScopes.includes("Hudson Valley"), JSON.stringify(geo));

const solarGeo = classifyGeography(
  { title: "Worldwide aurora watch", cleanedExcerpt: "global geomagnetic storm across the planet" },
  { defaultGeographicScope: "Hudson Valley" }
);
assert(
  "global keyword outranks publisher default locale",
  solarGeo.geographicScopes.includes("Global") && !solarGeo.geographicScopes.includes("Hudson Valley"),
  JSON.stringify(solarGeo)
);

const defaultOnly = classifyGeography(
  { title: "Agency posts a routine notice", cleanedExcerpt: "Operators updated internal guidance without naming a place." },
  { defaultGeographicScope: "Hudson Valley" }
);
assert(
  "feed default scope used only when article lacks places",
  defaultOnly.geographicScopes[0] === "Hudson Valley",
  JSON.stringify(defaultOnly)
);

// ——— Dedupe ———
const a1 = {
  id: "1",
  title: "Hudson Valley warblers begin overnight migration pulse",
  canonicalUrl: "https://example.org/outdoor/hudson-valley-warblers-migration",
  cleanedExcerpt: "Field observers along the Hudson",
  publishedAt: "2026-08-03T12:00:00.000Z",
  trustWeight: 0.9
};
const a2 = {
  id: "2",
  title: "Hudson Valley warblers begin overnight migration pulse",
  canonicalUrl: "https://www.example.org/outdoor/hudson-valley-warblers-migration?utm_source=x",
  cleanedExcerpt: "Field observers along the Hudson",
  publishedAt: "2026-08-03T12:00:00.000Z",
  trustWeight: 0.7
};
const deduped = deduplicateArticles([a1, a2]);
assert("duplicate URL collapsed", deduped.articles.length === 1 && deduped.duplicates.length === 1);
assert("title similarity high for near-identical", titleSimilarity(a1.title, a2.title) > 0.9);

// ——— Scoring ———
const scoredLocal = scoreArticle({
  title: "Quiet Catskill trail note",
  geographicScopes: ["Catskills"],
  categories: ["Hiking and Trails", "Seasonal Nature"],
  publishedAt: new Date().toISOString(),
  trustTier: "official",
  relatedProducts: [{ id: "dashboard" }]
});
const scoredGlobalSpam = scoreArticle({
  title: "SHOCKING!!! YOU WONT BELIEVE THIS",
  geographicScopes: ["Global"],
  categories: ["Environmental Science"],
  publishedAt: "2020-01-01T00:00:00.000Z",
  trustTier: "community",
  relatedProducts: []
});
assert("local recent scores higher than spam", scoredLocal.score > scoredGlobalSpam.score, `${scoredLocal.score} vs ${scoredGlobalSpam.score}`);
assert("score exposes reasons", scoredLocal.reasons.length >= 5);

// ——— Summary / Take provenance ———
const sum = buildSummary({
  title: warbler.title,
  cleanedExcerpt: stripHtml(rss.items[0].description)
});
assert("summary provenance feed-description", sum.summaryProvenance === "feed-description");
assert("summary has substance", sum.summary.split(/\s+/).length >= 20);

const limited = buildSummary({ title: "X", cleanedExcerpt: "Too short." });
assert("limited material summary unavailable", limited.summaryProvenance === "unavailable");

const take = buildWaypointTake({
  title: warbler.title,
  cleanedExcerpt: stripHtml(rss.items[0].description),
  categories: ["Birds"],
  geographicScopes: ["Hudson Valley"],
  relatedProducts: [{ id: "fieldry", label: "Fieldry" }]
});
assert("take provenance fallback", take.takeProvenance === "fallback");
assert("take titled section text exists", /observer|Waypoint|Hudson/i.test(take.waypointTake));

const takeNone = buildWaypointTake({ title: "X", cleanedExcerpt: "nope", categories: [], relatedProducts: [] });
assert("take unavailable when sparse", takeNone.takeProvenance === "unavailable");

// ——— Related products / sheds discipline ———
const related = relatedProductsFor(["Nature Photography"], ["National"], { textBlob: "lens technique" });
assert("photography relates to scenes", related.some((p) => p.id === "scenes" || p.id === "photo-coach"));
const shedsRelated = relatedProductsFor(["Wildlife"], ["Catskills"], {
  textBlob: "celebrity hunting contest leaderboard"
});
assert(
  "sheds not forced for generic wildlife without habitat cues",
  !shedsRelated.some((p) => p.id === "sheds") || shedsRelated.some((p) => p.id === "fieldry")
);

// ——— RSS export ———
const sampleArticles = [
  {
    title: "Hudson Valley warblers begin overnight migration pulse",
    canonicalUrl: "https://example.org/outdoor/hudson-valley-warblers-migration",
    sourceName: "Fixture Desk",
    sourceUrl: "https://example.org/outdoor",
    publishedAt: "2026-08-03T12:00:00.000Z",
    summary: "A concise neutral summary of feed metadata.",
    waypointTake: "For an outdoor observer, notice migration pulses.",
    categories: ["Birds"],
    geographicScopes: ["Hudson Valley"]
  }
];
const xml = buildRssFeed(sampleArticles, { updatedAt: "2026-08-05T00:00:00.000Z" });
assert("RSS export is well-formed-ish", xml.includes("<rss") && xml.includes("</rss>"));
assert("RSS identifies Waypoint as curator", /curat/i.test(xml));
assert("RSS keeps original link", xml.includes("https://example.org/outdoor/hudson-valley-warblers-migration"));
assert("RSS includes Waypoint’s Take", /Waypoint/i.test(xml) && /Take/i.test(xml));
assert("local filter keeps HV", filterForLocal(sampleArticles).length === 1);
assert("photography filter empty for birds-only", filterForPhotography(sampleArticles).length === 0);
assert("science filter keeps birds", filterForScience(sampleArticles).length === 1);

// ——— Generated artifacts present ———
assert("articles.json exists", exists("data/articles/articles.json"));
assert("health.json exists", exists("data/articles/health.json"));
assert("feed-registry.json exists", exists("data/articles/feed-registry.json"));
assert("primary RSS exists", exists("feeds/waypoint-articles.xml"));
assert("local RSS exists", exists("feeds/waypoint-local.xml"));
assert("photography RSS exists", exists("feeds/waypoint-photography.xml"));
assert("science RSS exists", exists("feeds/waypoint-science.xml"));

const payload = JSON.parse(read("data/articles/articles.json"));
assert("payload has articles", Array.isArray(payload.articles) && payload.articles.length > 0);
assert("copyright notice present", /not republished|original publishers/i.test(payload.copyright || ""));
assert("summary method documented", !!payload.summaryMethod);
assert("each article has provenance fields", payload.articles.every((a) => a.summaryProvenance && a.takeProvenance && a.canonicalUrl));
assert("external links are https", payload.articles.every((a) => /^https:\/\//i.test(a.canonicalUrl)));
assert("dashboard picks present", Array.isArray(payload.dashboardPicks));

const registry = JSON.parse(read("data/articles/feed-registry.json"));
assert("registry has feeds", registry.feeds.length >= 10);
assert("disabled feeds explain why", registry.feeds.filter((f) => !f.enabled).every((f) => /DISABLE|disabled|404|403/i.test(f.notes || "")));

// ——— UI module contracts ———
assert("articles feed JS exists", exists("design-system/js/platform/wds-articles-feed.js"));
assert("articles feed CSS exists", exists("design-system/css/wds-articles-feed.css"));
const hub = read("articles/index.html");
assert("hub mounts articles feed", /articlesFeed\.mountFeed/.test(hub));
assert("hub links RSS alternate", /waypoint-articles\.xml/.test(hub));
assert("hub does not claim Waypoint published originals", !/Waypoint published these stories/i.test(hub));

const feedJs = read("design-system/js/platform/wds-articles-feed.js");
assert("UI has empty states", /No curated articles|temporarily unavailable|Summary unavailable|Stale data/.test(feedJs));
assert("UI labels Waypoint’s Take exactly", /Waypoint’s Take|Waypoint\\u2019s Take|Waypoint's Take/.test(feedJs) || feedJs.includes("Waypoint’s Take") || feedJs.includes("Waypoint\u2019s Take"));
assert("UI marks original publisher CTA", /Read original article/.test(feedJs));
assert("UI supports views", /forYou/.test(feedJs) && /local/.test(feedJs) && /seasonal/.test(feedJs));

// Render card via vm for empty/stale helpers
global.window = global;
global.localStorage = {
  store: {},
  getItem(k) {
    return this.store[k] || null;
  },
  setItem(k, v) {
    this.store[k] = String(v);
  }
};
vm.runInThisContext(feedJs, { filename: "wds-articles-feed.js" });
assert("articlesFeed API mounted", !!(global.WDS && global.WDS.articlesFeed));
assert("provenance labels distinguish feed summary", /Feed-description/.test(global.WDS.articlesFeed.provenanceLabel("summary", "feed-description")));
assert("provenance labels distinguish unavailable take", /unavailable/i.test(global.WDS.articlesFeed.provenanceLabel("take", "unavailable")));
assert("stale detection works", global.WDS.articlesFeed.isStale({ staleAfter: "2000-01-01T00:00:00.000Z" }) === true);

// Dashboard deepeners
const deepen = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js");
assert("dashboard Field Notes section", /Field Notes/.test(deepen));
assert("dashboard loads curated articles.json", /data\/articles\/articles\.json/.test(deepen));
assert("dashboard links to original publishers", /canonicalUrl/.test(deepen));

// Scenes / Sheds quiet related
assert("scenes related mount", /articlesFeed\.mountRelated/.test(read("apps/scenes/index.html")));
assert("sheds related mount", /articlesFeed\.mountRelated/.test(read("apps/shed-hunting/index.html")));
assert("sheds topics stay habitat-oriented", /habitat|wildlife|deer|conservation/.test(read("apps/shed-hunting/index.html")));

// A11y / mobile layout cues
assert("skip link on articles hub", /wds-skip/.test(hub));
assert("main landmark on articles hub", /id="main"/.test(hub));
assert("mobile card CTA CSS", /max-width:\s*640px/.test(read("design-system/css/wds-articles-feed.css")));

// Docs
[
  "docs/articles/articles-architecture.md",
  "docs/articles/feed-source-register.md",
  "docs/articles/relevance-and-recommendation-model.md",
  "docs/articles/copyright-attribution-and-content-policy.md",
  "docs/articles/articles-owner-review.md"
].forEach((d) => assert("doc " + d, exists(d)));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll articles RSS tests passed.");
