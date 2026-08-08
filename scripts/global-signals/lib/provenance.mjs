/** Provenance + confidence helpers. Never invent Observed for derived claims. */

export const CONFIDENCE = ["Observed", "High", "Medium", "Low", "Unknown"];
export const PRODUCTION_MODES = new Set(["live", "live-empty"]);
export const FIXTURE_MODES = new Set(["sample-demo", "fixture", "curated-baseline", "demo"]);

export function normalizeConfidence(value, { predicted = false } = {}) {
  if (value == null || value === "") return "Unknown";
  const lower = String(value).trim().toLowerCase();
  const mapped = {
    observed: "Observed",
    high: "High",
    medium: "Medium",
    moderate: "Medium",
    low: "Low",
    speculative: "Low",
    unknown: "Unknown"
  };
  let out = mapped[lower] || "Unknown";
  if (predicted && out === "Observed") out = "Unknown";
  return out;
}

export function decayConfidence(base, order) {
  const start = normalizeConfidence(base);
  // Order 0 = the activated entity itself (may remain Observed if source-backed).
  if (order <= 0) return start;
  // Derived impacts never remain Observed.
  const ladder = ["High", "Medium", "Low", "Unknown"];
  let idx = ladder.indexOf(start === "Observed" ? "High" : start);
  if (idx < 0) idx = ladder.length - 1;
  idx = Math.min(ladder.length - 1, idx + (order - 1));
  return ladder[idx];
}

export function makeProvenance({
  source,
  sourceUrl,
  publisher,
  publishedAt,
  retrievedAt,
  lastVerifiedAt
} = {}) {
  const now = new Date().toISOString();
  return {
    source: String(source || "").trim() || "unknown",
    sourceUrl: sourceUrl || null,
    publisher: String(publisher || source || "").trim() || "unknown",
    publishedAt: publishedAt || null,
    retrievedAt: retrievedAt || now,
    lastVerifiedAt: lastVerifiedAt || retrievedAt || now
  };
}

export function assertProductionMode(mode, label = "dataset") {
  if (!PRODUCTION_MODES.has(mode)) {
    throw new Error(
      `${label} mode "${mode}" is not production-safe. Allowed: live, live-empty. Fixtures belong under data/global-signals/fixtures/.`
    );
  }
}

export function isFixtureMode(mode) {
  return FIXTURE_MODES.has(String(mode || ""));
}
