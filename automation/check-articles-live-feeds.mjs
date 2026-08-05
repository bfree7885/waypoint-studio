#!/usr/bin/env node
/**
 * Optional live feed health check — not part of the default CI suite.
 * Writes to automation/artifacts/ only; does not mutate production registry.
 * Usage: node automation/check-articles-live-feeds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refreshArticles } from "../scripts/articles/refresh.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
  const tmpDir = path.join(ROOT, "automation/artifacts/articles-live");
  fs.mkdirSync(tmpDir, { recursive: true });
  const registrySrc = path.join(ROOT, "data/articles/feed-registry.json");
  const registryTmp = path.join(tmpDir, "feed-registry.json");
  fs.copyFileSync(registrySrc, registryTmp);

  const { health, payload } = await refreshArticles({
    registryPath: registryTmp,
    articlesOut: path.join(tmpDir, "articles.json"),
    healthOut: path.join(tmpDir, "health.json"),
    feedsDir: path.join(tmpDir, "feeds")
  });
  console.log(JSON.stringify({ status: health.status, counts: payload.counts, feeds: health.feeds }, null, 2));
  if (health.status === "unavailable") process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
