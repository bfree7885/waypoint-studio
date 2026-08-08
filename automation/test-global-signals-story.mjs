#!/usr/bin/env node
/**
 * Global Signals Story Mode — structured briefing assembly tests.
 * No AI. No invented claims / edges.
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

const htmlPath = "side-trails/global-signals/story/index.html";
const cssPath = "design-system/css/wds-global-signals-story.css";
const jsPath = "design-system/js/global-signals/wds-gs-story.js";
const seedsPath = "data/global-signals/story/story-seeds.json";
const relPath = "data/global-signals/relationships/relationships.json";
const industriesPath = "data/global-signals/industries/industries.json";
const countriesPath = "data/global-signals/countries/countries.json";
const citizenPath = "data/global-signals/citizen-impact/citizen-impact.json";
const articlesPath = "data/global-signals/articles/articles.json";
const aliasPath = "story/index.html";

assert.ok(exists(htmlPath), "story route missing");
assert.ok(exists(cssPath), "story CSS missing");
assert.ok(exists(jsPath), "story JS missing");
assert.ok(exists(seedsPath), "story seeds missing");
assert.ok(exists(relPath), "relationships data missing");
assert.ok(exists(industriesPath), "industries data missing");
assert.ok(exists(countriesPath), "countries data missing");
assert.ok(exists(citizenPath), "citizen-impact data missing");
assert.ok(exists(articlesPath), "articles data missing");
assert.ok(exists(aliasPath), "short /story/ alias missing");

const html = read(htmlPath);
assert.match(html, /<title>Story Mode — Global Signals<\/title>/);
assert.match(html, /id="gsm-app"/);
assert.match(html, /data-gsm-app/);
assert.match(html, /wds-gs-story\.js/);
assert.match(html, /story-seeds\.json/);
assert.match(html, /No AI invention/);
assert.match(html, /href="\.\.\//);
assert.match(html, /Back to Global Signals/);
assert.match(html, /relationships\//);
assert.match(html, /articles\//);
assert.match(html, /explain\//);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /openai|anthropic|ChatGPT|language model/i);

const alias = read(aliasPath);
assert.match(alias, /side-trails\/global-signals\/story\//);

const css = read(cssPath);
assert.match(css, /\.gsm-app/);
assert.match(css, /\.gsm-briefing/);
assert.match(css, /\.gsm-toc/);
assert.match(css, /@media \(max-width:\s*40rem\)/);
assert.match(css, /prefers-reduced-motion/);

const seeds = JSON.parse(read(seedsPath));
assert.equal(seeds.mode, "sample-demo");
assert.ok(seeds.honesty && seeds.honesty.banner);
assert.ok(Array.isArray(seeds.stories));
assert.ok(seeds.stories.length >= 4, "expected at least 4 curated stories");
assert.equal(seeds.defaultStoryId, "gss_china_export");
assert.ok(seeds.stories.some((s) => s.id === "gss_china_export"));
assert.ok(seeds.stories.some((s) => s.id === "gss_taiwan_chips"));
assert.ok(seeds.stories.some((s) => s.id === "gss_drought_food"));
assert.ok(seeds.stories.some((s) => s.id === "gss_steel_tariff"));

const graphData = JSON.parse(read(relPath));
assert.equal(graphData.mode, "sample-demo");
const entityIds = new Set(graphData.entities.map((e) => e.id));
const relIds = new Set(graphData.relationships.map((r) => r.id));
assert.ok(entityIds.has("gsn_china"), "china entity required for demo story");
assert.ok(relIds.has("gsr_china_export_controls"), "china→export-controls edge required");
assert.ok(
  graphData.cascades.some((c) => c.id === "gsc_china_export"),
  "china export cascade required"
);
const chinaEdge = graphData.relationships.find((r) => r.id === "gsr_china_export_controls");
assert.equal(chinaEdge.provenance, "story-mode-seed-extension");
assert.notEqual(chinaEdge.confidence, "Observed");
assert.ok(graphData.extensions && graphData.extensions.storyMode);

for (const r of graphData.relationships) {
  assert.ok(entityIds.has(r.from), "from missing " + r.from);
  assert.ok(entityIds.has(r.to), "to missing " + r.to);
  assert.notEqual(r.confidence, "Observed", "no Observed on hops: " + r.id);
}

const industries = JSON.parse(read(industriesPath));
const industryIds = new Set(industries.industries.map((i) => i.id));
const countries = JSON.parse(read(countriesPath));
const countryIds = new Set(countries.countries.map((c) => c.id));
const articles = JSON.parse(read(articlesPath));
const articleIds = new Set(articles.articles.map((a) => a.id));
assert.equal(articles.articles.length, 6);
assert.ok(articleIds.has("gsa_demo-china-export"));
const chinaArticle = articles.articles.find((a) => a.id === "gsa_demo-china-export");
assert.equal(chinaArticle.storyId, "gss_china_export");
assert.equal(chinaArticle.provenance, "story-mode-seed-extension");

for (const s of seeds.stories) {
  for (const id of s.seedEntityIds || []) {
    assert.ok(entityIds.has(id), "seed entity missing " + id);
  }
  if (s.preferredCascadeId) {
    assert.ok(
      graphData.cascades.some((c) => c.id === s.preferredCascadeId),
      "cascade missing " + s.preferredCascadeId
    );
  }
  for (const id of s.linkedIndustryIds || []) {
    assert.ok(industryIds.has(id), "linked industry missing " + id);
  }
  for (const id of s.linkedCountryIds || []) {
    assert.ok(countryIds.has(id), "linked country missing " + id);
  }
  for (const id of s.linkedArticleIds || []) {
    assert.ok(articleIds.has(id), "linked article missing " + id);
  }
  const requiredSections = [
    "whatHappened",
    "whyItMatters",
    "industries",
    "countries",
    "citizenImpacts",
    "articles",
    "relationshipGraph",
    "confidence",
    "evidence"
  ];
  for (const sec of requiredSections) {
    assert.ok(s.sectionOrder.includes(sec), s.id + " missing section " + sec);
  }
}

await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.story;
assert.ok(api);

assert.equal(api.normalizeConfidence(null), "Unknown");
assert.equal(api.normalizeConfidence("moderate"), "Medium");
assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeTimeHorizon("months"), "Months");
assert.equal(api.normalizeQuery("  China Export Restrictions "), "china export restrictions");

const graph = api.normalizeGraph(graphData);
const seedBundle = api.normalizeSeeds(seeds);
const linked = api.indexLinked({
  industries,
  countries,
  citizenImpact: JSON.parse(read(citizenPath)),
  articles
});
const store = { graph, seeds: seedBundle, linked, industries, countries, articles };

function run(key) {
  return api.assemble(key, store);
}

// Primary China export story — full briefing sections
const china = run("gss_china_export");
assert.equal(china.status, "assembled");
assert.equal(china.invented, false);
assert.equal(china.pathFound, true);
assert.equal(china.cascadeId, "gsc_china_export");
assert.equal(china.traversalMethod, "preferred-cascade");
assert.ok(china.sectionMap.whatHappened.status === "present");
assert.ok(china.sectionMap.whyItMatters.status === "present");
assert.ok(china.sectionMap.industries.status === "present");
assert.ok(china.sectionMap.countries.status === "present");
assert.ok(china.sectionMap.citizenImpacts.status === "present");
assert.ok(china.sectionMap.articles.status === "present");
assert.ok(china.sectionMap.relationshipGraph.status === "present");
assert.ok(china.sectionMap.confidence.status === "present");
assert.ok(china.sectionMap.evidence.status === "present");
assert.ok(china.industries.some((i) => i.id === "gsi_semiconductors"));
assert.ok(china.countries.some((c) => c.id === "gsc_china"));
assert.ok(china.articles.some((a) => a.id === "gsa_demo-china-export"));
assert.ok(china.citizenImpacts.length >= 1);
assert.ok(china.deepLinks.some((l) => /relationships\/\?entity=gsn_china/.test(l.href)));
assert.ok(china.deepLinks.some((l) => /relationship-graph/.test(l.href)));
assert.ok(china.deepLinks.some((l) => /articles\/\?id=gsa_demo-china-export/.test(l.href)));
assert.ok(china.deepLinks.some((l) => /citizen-impact\/#technology/.test(l.href)));
assert.notEqual(china.confidence, "Observed");
assert.equal(
  china.relationshipChain.filter((s) => s.kind === "edge").length,
  4,
  "china cascade should have 4 hops"
);

// Slug + article-map + entry label resolution
assert.equal(run("china-export-restrictions").story.id, "gss_china_export");
assert.equal(run("gsa_demo-china-export").story.id, "gss_china_export");
assert.equal(run("China announces export restrictions").story.id, "gss_china_export");

// Additional curated stories assemble without invention
for (const id of ["gss_taiwan_chips", "gss_drought_food", "gss_steel_tariff"]) {
  const r = run(id);
  assert.equal(r.status, "assembled", id);
  assert.equal(r.invented, false, id);
  assert.equal(r.pathFound, true, id);
  assert.ok(r.sections.length >= 9, id + " section count");
}

// Taiwan story may honestly lack linked articles
const taiwan = run("gss_taiwan_chips");
assert.equal(taiwan.sectionMap.articles.status, "missing");
assert.ok(taiwan.honestyGaps.some((g) => /No linked articles/i.test(g)));
assert.ok(taiwan.sectionMap.industries.status === "present");
assert.ok(taiwan.sectionMap.whyItMatters.status === "present");

// Missing / unknown story — no invented claims
const missing = run("gss_does_not_exist");
assert.equal(missing.status, "no-match");
assert.equal(missing.invented, false);
assert.ok(missing.honestyGaps.length >= 1);
assert.equal(missing.sections.length, 0);

// Default empty key → default story
const def = run("");
assert.equal(def.status, "assembled");
assert.equal(def.story.id, "gss_china_export");

// No invented edges: every chain edge must exist in graph
function assertChainReal(result) {
  for (const step of result.relationshipChain) {
    if (step.kind !== "edge") continue;
    assert.ok(relIds.has(step.relationship.id), "invented edge " + step.relationship.id);
    assert.ok(entityIds.has(step.relationship.from));
    assert.ok(entityIds.has(step.relationship.to));
  }
}
assertChainReal(china);
assertChainReal(taiwan);
assertChainReal(run("gss_drought_food"));
assertChainReal(run("gss_steel_tariff"));

// Module link presence in rendered briefing HTML
const briefingHtml = api.renderBriefing(china);
assert.match(briefingHtml, /What happened/);
assert.match(briefingHtml, /Why it matters/);
assert.match(briefingHtml, /Industries affected/);
assert.match(briefingHtml, /Countries affected/);
assert.match(briefingHtml, /Citizen impacts/);
assert.match(briefingHtml, /Related articles/);
assert.match(briefingHtml, /Relationship graph/);
assert.match(briefingHtml, /Confidence/);
assert.match(briefingHtml, /Evidence/);
assert.match(briefingHtml, /Open in Relationship Explorer/);
assert.match(briefingHtml, /gsm-toc/);
assert.doesNotMatch(briefingHtml, /openai|anthropic|ChatGPT|language model/i);

// Landing + articles entry points
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /\.\/story\//);
assert.match(landing, /Story Mode/);
assert.match(landing, /href="\.\/story\/"/);
assert.doesNotMatch(
  landing.match(/<ul class="gs-modules">[\s\S]*?<\/ul>/)[0],
  /Coming soon/i
);

const articlesPage = read("side-trails/global-signals/articles/index.html");
assert.doesNotMatch(articlesPage, /Coming soon/i);
assert.match(articlesPage, /story\//);
assert.match(read("design-system/js/global-signals/wds-gs-articles.js"), /Open Story Mode briefing/);
assert.match(read("design-system/js/global-signals/wds-gs-articles.js"), /storyId/);

// HTTP smoke: story page + JSON reachable
await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const filePath = path.join(root, urlPath.replace(/^\//, ""));
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(fs.readFileSync(filePath));
  });
  server.listen(0, "127.0.0.1", async () => {
    try {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}/`;
      const pageRes = await fetch(base + htmlPath);
      assert.equal(pageRes.status, 200);
      const seedsRes = await fetch(base + seedsPath);
      assert.equal(seedsRes.status, 200);
      const seedsJson = await seedsRes.json();
      assert.equal(seedsJson.defaultStoryId, "gss_china_export");
      server.close();
      resolve();
    } catch (err) {
      server.close();
      reject(err);
    }
  });
});

console.log("test-global-signals-story: ok");
