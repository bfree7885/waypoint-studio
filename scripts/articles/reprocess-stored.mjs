/**
 * Re-sanitize stored articles.json text fields without refetching feeds.
 * Use after sanitize.mjs improvements; prefer a live refresh when network is available.
 *
 *   node scripts/articles/reprocess-stored.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeExcerpt, stripHtml, looksLikeMarkupLeak } from "./sanitize.mjs";
import { buildSummary, buildWaypointTake } from "./summarize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTICLES = path.join(ROOT, "data/articles/articles.json");

function writeJson(file, obj) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

const data = JSON.parse(fs.readFileSync(ARTICLES, "utf8"));
let fixed = 0;
let unavailable = 0;

for (const article of data.articles || []) {
  const sourceHtml = article.rawDescription || article.cleanedExcerpt || "";
  let cleaned = sanitizeExcerpt(sourceHtml, 600);
  // If stored raw is truncated mid-tag and yields empty/useless text, try re-cleaning
  // the previously shown excerpt (may still contain attribute crumbs).
  if (!cleaned || looksLikeMarkupLeak(cleaned)) {
    cleaned = sanitizeExcerpt(article.cleanedExcerpt || "", 600);
  }
  if (looksLikeMarkupLeak(cleaned)) {
    cleaned = stripHtml(cleaned);
  }

  const before = {
    excerpt: article.cleanedExcerpt,
    summary: article.summary,
    take: article.waypointTake
  };

  article.cleanedExcerpt = cleaned;

  const summary = buildSummary(article);
  article.summary = summary.summary;
  article.summaryProvenance = summary.summaryProvenance;
  article.summaryNote = summary.summaryNote;

  const take = buildWaypointTake(article);
  article.waypointTake = take.waypointTake;
  article.takeProvenance = take.takeProvenance;
  article.takeNote = take.takeNote;

  if (
    looksLikeMarkupLeak(article.summary) ||
    looksLikeMarkupLeak(article.cleanedExcerpt) ||
    looksLikeMarkupLeak(article.waypointTake)
  ) {
    article.summary =
      "Available feed details still contain formatting we cannot trust as plain text. Open the original article for the publisher’s reporting.";
    article.summaryProvenance = "unavailable";
    article.summaryNote = "markup-leak-unrecoverable";
    article.cleanedExcerpt = "";
    article.waypointTake = "";
    article.takeProvenance = "unavailable";
    article.takeNote = "markup-leak-unrecoverable";
    unavailable += 1;
  }

  if (
    before.excerpt !== article.cleanedExcerpt ||
    before.summary !== article.summary ||
    before.take !== article.waypointTake
  ) {
    fixed += 1;
  }
}

data.reprocessedAt = new Date().toISOString();
writeJson(ARTICLES, data);
console.log(
  `[articles-reprocess] fixed=${fixed} forcedUnavailable=${unavailable} total=${(data.articles || []).length}`
);
