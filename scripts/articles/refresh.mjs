/**
 * Waypoint Articles refresh pipeline.
 * Fetch → parse → normalize → dedupe → classify → score → summarize → write static data + RSS.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENGINE_VERSION, USER_AGENT, TRUST_TIER_WEIGHT } from "./constants.mjs";
import { parseFeed } from "./parse-feed.mjs";
import {
  sanitizeExcerpt,
  sanitizeUrl,
  normalizeUrl,
  contentHash,
  stripHtml
} from "./sanitize.mjs";
import {
  classifyCategories,
  classifyGeography,
  shouldRejectTopic,
  currentSeason
} from "./classify.mjs";
import { deduplicateArticles } from "./dedupe.mjs";
import { scoreArticle } from "./score.mjs";
import { buildSummary, buildWaypointTake } from "./summarize.mjs";
import { relatedProductsFor, scrubRelatedProducts } from "./related.mjs";
import {
  buildRssFeed,
  filterForLocal,
  filterForPhotography,
  filterForScience
} from "./rss-export.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const DEFAULTS = {
  registryPath: path.join(ROOT, "data/articles/feed-registry.json"),
  articlesOut: path.join(ROOT, "data/articles/articles.json"),
  healthOut: path.join(ROOT, "data/articles/health.json"),
  feedsDir: path.join(ROOT, "feeds"),
  timeoutMs: Number(process.env.ARTICLES_TIMEOUT_MS || 15000),
  maxPerFeed: Number(process.env.ARTICLES_MAX_PER_FEED || 25),
  maxArticles: Number(process.env.ARTICLES_MAX || 120)
};

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

function writeText(file, text) {
  ensureDir(path.dirname(file));
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, file);
}

async function fetchFeed(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "User-Agent": USER_AGENT
      }
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      text,
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified")
    };
  } finally {
    clearTimeout(t);
  }
}

function makeId(feedId, guid, url, title) {
  const basis = contentHash([feedId, guid || "", url || "", title || ""]);
  return `wa_${basis}`;
}

function normalizeItem(raw, feed, discoveredAt) {
  const canonicalUrl = sanitizeUrl(raw.link);
  if (!canonicalUrl) return null;

  const cleanedExcerpt = sanitizeExcerpt(raw.description || "", 600);
  const item = {
    id: makeId(feed.id, raw.guid, canonicalUrl, raw.title),
    canonicalUrl,
    normalizedUrl: normalizeUrl(canonicalUrl),
    title: stripHtml(raw.title).slice(0, 300),
    sourceName: feed.publisher || feed.name,
    sourceUrl: feed.homepageUrl || feed.feedUrl,
    author: raw.author || null,
    publishedAt: raw.publishedAt,
    discoveredAt,
    feedId: feed.id,
    guid: raw.guid || null,
    rawDescription: String(raw.description || "").slice(0, 4000),
    cleanedExcerpt,
    categories: [],
    geographicScopes: [],
    placeReferences: [],
    relatedProducts: [],
    imageUrl: raw.imageUrl || null,
    imageCredit: raw.imageCredit || null,
    status: "active",
    duplicateOf: null,
    trustTier: feed.trustTier,
    trustWeight: TRUST_TIER_WEIGHT[feed.trustTier] || 0.7,
    generation: {
      engineVersion: ENGINE_VERSION,
      summaryMethod: "deterministic-feed-description",
      takeMethod: "deterministic-fallback",
      generatedAt: discoveredAt
    }
  };

  if (shouldRejectTopic(item, feed)) {
    item.status = "rejected";
    item.rejectReason = "unsupported-topic";
    return item;
  }

  item.categories = classifyCategories(item, feed);
  const geo = classifyGeography(item, feed);
  item.geographicScopes = geo.geographicScopes;
  item.placeReferences = geo.placeReferences;

  const textBlob = `${item.title} ${item.cleanedExcerpt}`;
  item.relatedProducts = relatedProductsFor(item.categories, item.geographicScopes, {
    textBlob
  });

  const summary = buildSummary(item);
  item.summary = summary.summary;
  item.summaryProvenance = summary.summaryProvenance;
  item.summaryNote = summary.summaryNote;

  const take = buildWaypointTake(item);
  item.waypointTake = take.waypointTake;
  item.takeProvenance = take.takeProvenance;
  item.takeNote = take.takeNote;

  const scored = scoreArticle(item, { season: currentSeason() });
  item.relevanceScore = scored.score;
  item.relevanceReasons = scored.reasons;
  item.relevanceBreakdown = scored.breakdown;
  item.contentHash = contentHash([
    item.title,
    item.cleanedExcerpt.slice(0, 280),
    item.normalizedUrl || ""
  ]);

  return item;
}

async function processFeed(feed, options) {
  const started = Date.now();
  const result = {
    id: feed.id,
    name: feed.name,
    ok: false,
    itemCount: 0,
    error: null,
    warnings: [],
    ms: 0,
    articles: []
  };

  if (!feed.enabled) {
    result.error = "disabled";
    result.ms = Date.now() - started;
    return result;
  }

  try {
    const res = await fetchFeed(feed.feedUrl, options.timeoutMs);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const parsed = parseFeed(res.text, { limit: options.maxPerFeed });
    result.warnings = parsed.warnings || [];
    if (!parsed.items.length) {
      throw new Error("no parseable items");
    }
    const discoveredAt = nowIso();
    const articles = [];
    for (const raw of parsed.items) {
      const norm = normalizeItem(raw, feed, discoveredAt);
      if (norm) articles.push(norm);
    }
    result.articles = articles.filter((a) => a.status !== "rejected");
    result.itemCount = result.articles.length;
    result.ok = true;
    feed.lastSuccessfulFetch = discoveredAt;
    feed.lastFailure = null;
    feed.failureCount = 0;
  } catch (err) {
    result.error = err && err.name === "AbortError" ? "timeout" : String(err.message || err);
    feed.lastFailure = {
      at: nowIso(),
      error: result.error
    };
    feed.failureCount = Number(feed.failureCount || 0) + 1;
  }
  result.ms = Date.now() - started;
  return result;
}

function selectViews(articles) {
  const byScore = articles.slice().sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  const localScopes = new Set([
    "Hudson Valley",
    "Catskills",
    "Poconos",
    "Northern New Jersey",
    "Tri-State",
    "Adirondacks",
    "Northeast"
  ]);
  const latest = articles
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
  const seasonal = byScore.filter((a) => (a.categories || []).includes("Seasonal Nature") || (a.relevanceBreakdown && a.relevanceBreakdown.seasonal >= 0.85));
  const photography = filterForPhotography(byScore);
  const science = filterForScience(byScore);
  const local = byScore.filter((a) => (a.geographicScopes || []).some((g) => localScopes.has(g)));

  return {
    forYou: byScore.slice(0, 40).map((a) => a.id),
    local: local.slice(0, 40).map((a) => a.id),
    latest: latest.slice(0, 40).map((a) => a.id),
    seasonal: seasonal.slice(0, 40).map((a) => a.id),
    photography: photography.slice(0, 40).map((a) => a.id),
    science: science.slice(0, 40).map((a) => a.id)
  };
}

function dashboardPicks(articles) {
  const localScopes = new Set([
    "Hudson Valley",
    "Catskills",
    "Poconos",
    "Northern New Jersey",
    "Tri-State"
  ]);
  const ranked = articles.slice().sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  const local = ranked.find((a) => (a.geographicScopes || []).some((g) => localScopes.has(g)));
  const seasonal = ranked.find(
    (a) => a !== local && ((a.categories || []).includes("Seasonal Nature") || (a.relevanceBreakdown && a.relevanceBreakdown.seasonal >= 0.85))
  );
  const conditions = ranked.find(
    (a) =>
      a !== local &&
      a !== seasonal &&
      (a.categories || []).some((c) => /Weather|Outdoor Safety|Astronomy|Rivers/i.test(c))
  );
  return [local, seasonal, conditions].filter(Boolean).map((a) => a.id);
}

/**
 * Run a full refresh. Continues when individual feeds fail.
 */
export async function refreshArticles(userOptions = {}) {
  const options = { ...DEFAULTS, ...userOptions };
  const registry = readJson(options.registryPath);
  const feeds = registry.feeds || [];
  const discoveredAt = nowIso();
  const feedResults = [];
  const collected = [];

  for (const feed of feeds) {
    const result = await processFeed(feed, options);
    feedResults.push({
      id: result.id,
      name: result.name,
      ok: result.ok,
      itemCount: result.itemCount,
      error: result.error,
      warnings: result.warnings,
      ms: result.ms,
      enabled: !!feed.enabled
    });
    if (result.ok) collected.push(...result.articles);
  }

  const { articles: deduped, duplicates } = deduplicateArticles(collected);
  const active = deduped
    .filter((a) => a.status === "active")
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, options.maxArticles);

  const staleHours = 12;
  const previous = (() => {
    try {
      return readJson(options.articlesOut);
    } catch {
      return null;
    }
  })();

  // Preserve last-known-good article set when every enabled feed fails.
  let retainedPrevious = false;
  let activeOut = active;
  let duplicatesOut = duplicates;
  if (!active.length && previous && Array.isArray(previous.articles) && previous.articles.length) {
    activeOut = previous.articles;
    duplicatesOut = previous.duplicates || [];
    retainedPrevious = true;
  }

  activeOut = activeOut.map((article) => ({
    ...article,
    relatedProducts: scrubRelatedProducts(article.relatedProducts)
  }));

  const views = selectViews(activeOut);
  const picks = dashboardPicks(activeOut);

  const payload = {
    version: ENGINE_VERSION,
    generatedAt: retainedPrevious ? previous.generatedAt || discoveredAt : discoveredAt,
    refreshedAt: discoveredAt,
    retainedPrevious,
    staleAfter: new Date(
      Date.parse(retainedPrevious ? previous.generatedAt || discoveredAt : discoveredAt) +
        staleHours * 3600 * 1000
    ).toISOString(),
    summaryMethod: "deterministic-feed-description",
    takeMethod: "deterministic-fallback",
    copyright:
      "Waypoint curates third-party links with short excerpts from feed metadata. Full article text is not republished. Original publishers remain the destination.",
    counts: {
      feedsConfigured: feeds.length,
      feedsEnabled: feeds.filter((f) => f.enabled).length,
      feedsOk: feedResults.filter((r) => r.ok).length,
      feedsFailed: feedResults.filter((r) => r.enabled && !r.ok && r.error !== "disabled").length,
      articles: activeOut.length,
      duplicates: Array.isArray(duplicatesOut) ? duplicatesOut.length : duplicates.length,
      localRegional: activeOut.filter((a) =>
        (a.geographicScopes || []).some((g) =>
          ["Hudson Valley", "Catskills", "Poconos", "Northern New Jersey", "Tri-State", "Adirondacks", "Northeast"].includes(g)
        )
      ).length
    },
    views,
    dashboardPicks: picks,
    articles: activeOut,
    duplicates: retainedPrevious
      ? duplicatesOut
      : duplicates.map((d) => ({
          id: d.id,
          title: d.title,
          duplicateOf: d.duplicateOf,
          duplicateReason: d.duplicateReason,
          feedId: d.feedId,
          canonicalUrl: d.canonicalUrl
        }))
  };

  const health = {
    version: ENGINE_VERSION,
    checkedAt: discoveredAt,
    status: feedResults.some((r) => r.ok)
      ? feedResults.every((r) => !r.enabled || r.ok || r.error === "disabled")
        ? "ok"
        : "partial"
      : retainedPrevious
        ? "stale"
        : "unavailable",
    retainedPrevious,
    feeds: feedResults,
    articleCount: activeOut.length,
    staleAfter: payload.staleAfter
  };

  // Atomic writes: temp + rename already used by writeJson/writeText.
  writeJson(options.articlesOut, payload);
  writeJson(options.healthOut, health);
  writeJson(options.registryPath, registry);

  // RSS outputs — keep previous RSS files if we retained previous empty refresh.
  ensureDir(options.feedsDir);
  const rssSource = activeOut;
  writeText(
    path.join(options.feedsDir, "waypoint-articles.xml"),
    buildRssFeed(rssSource.slice(0, 50), {
      title: "Waypoint Studio — Curated Articles",
      selfUrl: "https://waypointstudio.org/feeds/waypoint-articles.xml",
      updatedAt: payload.generatedAt
    })
  );
  writeText(
    path.join(options.feedsDir, "waypoint-local.xml"),
    buildRssFeed(filterForLocal(rssSource).slice(0, 40), {
      title: "Waypoint Studio — Local & Regional Articles",
      selfUrl: "https://waypointstudio.org/feeds/waypoint-local.xml",
      description:
        "Waypoint-curated regional outdoor and environmental reporting for the Hudson Valley, Catskills, Poconos, and Northeast. Original publishers remain the destination.",
      updatedAt: payload.generatedAt
    })
  );
  writeText(
    path.join(options.feedsDir, "waypoint-photography.xml"),
    buildRssFeed(filterForPhotography(rssSource).slice(0, 40), {
      title: "Waypoint Studio — Photography & Visual Nature",
      selfUrl: "https://waypointstudio.org/feeds/waypoint-photography.xml",
      updatedAt: payload.generatedAt
    })
  );
  writeText(
    path.join(options.feedsDir, "waypoint-science.xml"),
    buildRssFeed(filterForScience(rssSource).slice(0, 40), {
      title: "Waypoint Studio — Science & Conservation",
      selfUrl: "https://waypointstudio.org/feeds/waypoint-science.xml",
      updatedAt: payload.generatedAt
    })
  );

  return { payload, health, feedResults };
}

export { normalizeItem, processFeed, ROOT };
