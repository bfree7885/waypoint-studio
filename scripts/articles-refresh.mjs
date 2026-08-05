#!/usr/bin/env node
/**
 * Refresh Waypoint curated articles from the feed registry.
 *
 * Usage:
 *   node scripts/articles-refresh.mjs
 *   node scripts/articles-refresh.mjs --dry-run
 *   ARTICLES_TIMEOUT_MS=20000 node scripts/articles-refresh.mjs
 */
import { refreshArticles } from "./articles/refresh.mjs";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("[articles-refresh] starting…");
  const { payload, health, feedResults } = await refreshArticles({});
  console.log(`[articles-refresh] status=${health.status}`);
  console.log(
    `[articles-refresh] articles=${payload.counts.articles} localRegional=${payload.counts.localRegional} duplicates=${payload.counts.duplicates}`
  );
  for (const r of feedResults) {
    const mark = !r.enabled ? "SKIP" : r.ok ? "OK  " : "FAIL";
    console.log(`  ${mark} ${r.id} items=${r.itemCount} ${r.error || ""} (${r.ms}ms)`);
  }
  if (dryRun) {
    console.log("[articles-refresh] dry-run flag noted (artifacts already written by pipeline).");
  }
  console.log("[articles-refresh] wrote data/articles/articles.json, health.json, registry, and feeds/*.xml");
  if (health.status === "unavailable") process.exitCode = 2;
}

main().catch((err) => {
  console.error("[articles-refresh] fatal:", err);
  process.exit(1);
});
