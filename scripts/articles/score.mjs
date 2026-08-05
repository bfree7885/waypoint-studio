/**
 * Transparent relevance scoring for curated outdoor articles.
 * Does not optimize for outrage, clicks, or sensational headlines.
 */

import { GEO_PRIORITY, TRUST_TIER_WEIGHT } from "./constants.mjs";
import { currentSeason, isSeasonallyRelevant } from "./classify.mjs";

function daysSince(iso, now = Date.now()) {
  if (!iso) return 365;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 365;
  return Math.max(0, (now - t) / (1000 * 60 * 60 * 24));
}

function geoScore(scopes) {
  const primary = (scopes && scopes[0]) || "National";
  const idx = GEO_PRIORITY.indexOf(primary);
  if (idx < 0) return 0.35;
  // Hudson Valley (0) → 1.0; Global (last) → ~0.25
  return Math.max(0.25, 1 - idx * 0.1);
}

function categoryScore(categories) {
  const preferred = new Set([
    "Weather",
    "Wildlife",
    "Birds",
    "Hiking and Trails",
    "Astronomy and Night Sky",
    "Conservation",
    "Seasonal Nature",
    "Nature Photography",
    "Outdoor Safety",
    "Rivers and Water",
    "Forests and Plants"
  ]);
  const cats = categories || [];
  if (!cats.length) return 0.4;
  const hits = cats.filter((c) => preferred.has(c)).length;
  return Math.min(1, 0.45 + hits * 0.18);
}

function recencyScore(publishedAt, now) {
  const d = daysSince(publishedAt, now);
  if (d <= 2) return 1;
  if (d <= 7) return 0.85;
  if (d <= 21) return 0.65;
  if (d <= 45) return 0.45;
  if (d <= 90) return 0.3;
  return 0.15;
}

function sensationalPenalty(title) {
  const t = String(title || "");
  let penalty = 0;
  if (/!{2,}|\bshocking\b|\byou won'?t believe\b|\bapocalypse\b|\bdestroyed\b/i.test(t)) penalty += 0.25;
  if (t === t.toUpperCase() && t.length > 12) penalty += 0.2;
  if (/\bclick\b|\bmust[- ]see\b|\bgone viral\b/i.test(t)) penalty += 0.2;
  return Math.min(0.5, penalty);
}

function productRelationScore(relatedProducts) {
  const n = (relatedProducts || []).length;
  if (!n) return 0.35;
  return Math.min(1, 0.5 + n * 0.15);
}

function conditionsRelationScore(categories) {
  const set = new Set(categories || []);
  if (set.has("Weather") || set.has("Outdoor Safety") || set.has("Astronomy and Night Sky")) return 0.9;
  if (set.has("Seasonal Nature") || set.has("Rivers and Water")) return 0.7;
  return 0.4;
}

/**
 * Score an article. Returns numeric score 0–100 and a human-readable breakdown.
 */
export function scoreArticle(article, options = {}) {
  const now = options.now || Date.now();
  const season = options.season || currentSeason(new Date(now));
  const trust =
    TRUST_TIER_WEIGHT[article.trustTier] != null
      ? TRUST_TIER_WEIGHT[article.trustTier]
      : article.trustWeight || 0.7;

  const parts = {
    geographic: geoScore(article.geographicScopes),
    category: categoryScore(article.categories),
    recency: recencyScore(article.publishedAt, now),
    seasonal: isSeasonallyRelevant(article.categories, season) ? 0.9 : 0.4,
    trust,
    conditions: conditionsRelationScore(article.categories),
    products: productRelationScore(article.relatedProducts),
    sensationalPenalty: sensationalPenalty(article.title)
  };

  const weighted =
    parts.geographic * 0.24 +
    parts.category * 0.16 +
    parts.recency * 0.18 +
    parts.seasonal * 0.1 +
    parts.trust * 0.12 +
    parts.conditions * 0.1 +
    parts.products * 0.1 -
    parts.sensationalPenalty;

  const score = Math.round(Math.max(0, Math.min(1, weighted)) * 100);

  const why = [];
  why.push(`Geographic relevance (${(article.geographicScopes || [])[0] || "unknown"}): ${Math.round(parts.geographic * 100)}`);
  why.push(`Category fit: ${Math.round(parts.category * 100)}`);
  why.push(`Recency: ${Math.round(parts.recency * 100)}`);
  why.push(`Seasonal (${season}): ${Math.round(parts.seasonal * 100)}`);
  why.push(`Source trust (${article.trustTier || "unknown"}): ${Math.round(parts.trust * 100)}`);
  why.push(`Conditions relation: ${Math.round(parts.conditions * 100)}`);
  why.push(`Waypoint product links: ${Math.round(parts.products * 100)}`);
  if (parts.sensationalPenalty > 0) {
    why.push(`Sensational headline penalty: −${Math.round(parts.sensationalPenalty * 100)}`);
  }

  return {
    score,
    breakdown: parts,
    reasons: why,
    season
  };
}
