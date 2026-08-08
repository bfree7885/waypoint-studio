#!/usr/bin/env node
/**
 * Global Signals — Universal Intelligence Search tests.
 * Covers query types, empty/no-match, ranking/groups, deep links, no Articles regression.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const htmlPath = "side-trails/global-signals/search/index.html";
const cssPath = "design-system/css/wds-global-signals-search.css";
const jsPath = "design-system/js/global-signals/wds-gs-search.js";
const indexPath = "data/global-signals/search/search-index.json";
const builderPath = "scripts/build-global-signals-search-index.mjs";
const reviewPath = "docs/global-signals/universal-search-owner-review.md";

assert.ok(exists(htmlPath), "search route missing");
assert.ok(exists(cssPath), "search CSS missing");
assert.ok(exists(jsPath), "search JS missing");
assert.ok(exists(indexPath), "search index missing");
assert.ok(exists(builderPath), "index builder missing");
assert.ok(exists(reviewPath), "owner review doc missing");

const html = read(htmlPath);
assert.match(html, /<title>Search — Global Signals<\/title>/);
assert.match(html, /id="gss-app"/);
assert.match(html, /data-gss-app/);
assert.match(html, /wds-gs-search\.js/);
assert.match(html, /search-index\.json/);
assert.match(html, /Back to Global Signals/);
assert.match(html, /Side Trails/);
assert.match(html, /Articles/);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /\bAI\b.*generat|ChatGPT|OpenAI|LLM/i);
assert.match(html, /No AI model involved|Not AI/i);

const css = read(cssPath);
assert.match(css, /\.gss-input/);
assert.match(css, /\.gss-result/);
assert.match(css, /\.gss-chip/);
assert.match(css, /@media \(max-width:\s*40rem\)/);
assert.match(css, /prefers-reduced-motion/);

const index = JSON.parse(read(indexPath));
assert.equal(index.mode, "sample-demo");
assert.ok(index.modeLabel);
assert.ok(index.honesty && index.honesty.banner);
assert.match(index.honesty.banner, /not.*AI|No AI|not call an AI/i);
assert.ok(Array.isArray(index.entries));
assert.ok(index.entries.length >= 50, "expected a broad structured index");
assert.ok(index.stats && index.stats.byType);

const requiredTypes = [
  "country",
  "commodity",
  "industry",
  "company",
  "port",
  "conflict",
  "tariff",
  "policy",
  "article",
  "citizen-impact"
];
for (const t of requiredTypes) {
  assert.ok(
    index.entries.some((e) => e.type === t),
    "missing type in index: " + t
  );
}

for (const e of index.entries) {
  assert.ok(e.id, "entry id");
  assert.ok(e.type, "entry type");
  assert.ok(e.label, "entry label");
  assert.ok(e.href, "entry href");
  assert.ok(e.provenance, "entry provenance");
  assert.ok(e.searchText, "entry searchText");
  assert.ok(Array.isArray(e.tokens));
  assert.ok(Array.isArray(e.hints));
}

// Deep-link conventions
assert.ok(
  index.entries.some(
    (e) => e.type === "article" && e.href.includes("/articles/?id=")
  )
);
assert.ok(
  index.entries.some(
    (e) => e.type === "country" && /\/countries\/[^/]+\/$/.test(e.href)
  )
);
assert.ok(
  index.entries.some(
    (e) => e.type === "industry" && /\/industries\/[^/]+\/$/.test(e.href)
  )
);
assert.ok(
  index.entries.some(
    (e) => e.href.includes("/relationships/?entity=")
  )
);
assert.ok(
  index.entries.some(
    (e) => e.type === "citizen-impact" && e.href.includes("#section-")
  )
);

// Source JSON present (integrated from module branches)
for (const rel of [
  "data/global-signals/articles/articles.json",
  "data/global-signals/countries/countries.json",
  "data/global-signals/industries/industries.json",
  "data/global-signals/relationships/relationships.json",
  "data/global-signals/citizen-impact/citizen-impact.json"
]) {
  assert.ok(exists(rel), "missing source " + rel);
}

await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.search;
assert.ok(api.search);
assert.ok(api.scoreEntry);
assert.ok(api.renderGroups);

// Idle / empty
const idle = api.search(index, "");
assert.equal(idle.total, 0);
assert.equal(idle.emptyReason, "idle");
const idleHtml = api.renderGroups(idle);
assert.match(idleHtml, /Type a country|structured sample\/demo/i);

const none = api.search(index, "zzzxqyfoobarqqq");
assert.equal(none.total, 0);
assert.equal(none.emptyReason, "no-match");
const noneHtml = api.renderGroups(none);
assert.match(noneHtml, /No matches/);
assert.match(noneHtml, /Empty is honest/i);

// Query types + ranking/groups
const taiwan = api.search(index, "Taiwan");
assert.ok(taiwan.total >= 1);
assert.ok(taiwan.results.some((r) => /taiwan/i.test(r.label)));
assert.ok(taiwan.groups.length >= 1);
assert.ok(
  taiwan.results.some((r) => r.href.includes("/countries/taiwan/") || r.href.includes("entity=gsn_taiwan"))
);
// Relationship-aware hints present for Taiwan-ish hits
const withHints = taiwan.results.find((r) => (r.hints || []).length);
assert.ok(withHints, "expected relationship hints on Taiwan results");

const semi = api.search(index, "semiconductor");
assert.ok(semi.total >= 1);
assert.ok(
  semi.results.some((r) => r.type === "industry" || r.type === "commodity")
);

const tariff = api.search(index, "steel tariff");
assert.ok(tariff.total >= 1);
assert.ok(tariff.results.some((r) => r.type === "tariff" || /tariff/i.test(r.label)));

const articleQ = api.search(index, "canal");
assert.ok(articleQ.total >= 1);
assert.ok(articleQ.results.some((r) => r.type === "article" || r.type === "port"));

const food = api.search(index, "food");
assert.ok(food.results.some((r) => r.type === "citizen-impact" || r.type === "industry"));

// Type filter
const onlyCountry = api.search(index, "taiwan", { types: ["country"] });
assert.ok(onlyCountry.total >= 1);
assert.ok(onlyCountry.results.every((r) => r.type === "country"));

const filteredOut = api.search(index, "taiwan", { types: ["tariff"] });
assert.equal(filteredOut.total, 0);

// Ranking: exact-ish country label should beat weak port substring noise when querying Taiwan
assert.ok(taiwan.results[0].score >= taiwan.results[taiwan.results.length - 1].score);
const topLabels = taiwan.results.slice(0, 3).map((r) => r.label.toLowerCase());
assert.ok(topLabels.some((l) => l.includes("taiwan")), "Taiwan should rank near top");

// Groups render
const groupedHtml = api.renderGroups(taiwan);
assert.match(groupedHtml, /gss-group/);
assert.match(groupedHtml, /gss-result/);
assert.match(groupedHtml, /Taiwan/i);
assert.match(groupedHtml, /provenance|sample-demo/i);

// Soft-link from landing (do not claim dashboard ownership)
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /\.\/search\//);
assert.match(landing, /Universal Search|Search/);

// Articles regression
assert.ok(exists("side-trails/global-signals/articles/index.html"));
assert.ok(exists("design-system/js/global-signals/wds-gs-articles.js"));
assert.ok(exists("data/global-signals/articles/articles.json"));
const articlesHtml = read("side-trails/global-signals/articles/index.html");
assert.match(articlesHtml, /id="gsa-feed"/);
assert.doesNotMatch(articlesHtml, /Coming soon/i);
const articlesData = JSON.parse(read("data/global-signals/articles/articles.json"));
assert.equal(articlesData.articles.length, 6);

// No AI claims in JS
const js = read(jsPath);
assert.match(js, /No AI|structured/i);
assert.doesNotMatch(js, /openai|anthropic|embeddings/i);
assert.doesNotMatch(js, /\bLLM\b/);

// A11y surface in mount markup (via render pieces + page)
assert.match(html, /Skip to content/);
assert.match(js, /role="search"/);
assert.match(js, /label.*for="gss-input"|gss-label/);
assert.match(js, /aria-live/);

// HTTP smoke
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function get(urlPath) {
  const res = await fetch(base + urlPath);
  const text = await res.text();
  return { status: res.status, text, type: res.headers.get("content-type") };
}

const pageRes = await get("/side-trails/global-signals/search/");
assert.equal(pageRes.status, 200);
assert.match(pageRes.text, /gss-app/);

const indexRes = await get("/data/global-signals/search/search-index.json");
assert.equal(indexRes.status, 200);
assert.match(indexRes.type, /json/);

const jsRes = await get("/design-system/js/global-signals/wds-gs-search.js");
assert.equal(jsRes.status, 200);

const cssRes = await get("/design-system/css/wds-global-signals-search.css");
assert.equal(cssRes.status, 200);

const articlesRes = await get("/side-trails/global-signals/articles/");
assert.equal(articlesRes.status, 200);

server.close();

console.log("Global Signals universal search checks passed.");
