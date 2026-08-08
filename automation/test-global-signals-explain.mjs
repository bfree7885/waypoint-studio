#!/usr/bin/env node
/**
 * Global Signals Explain This — structured matching + traversal tests.
 * No AI. No invented edges.
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

const htmlPath = "side-trails/global-signals/explain/index.html";
const cssPath = "design-system/css/wds-global-signals-explain.css";
const jsPath = "design-system/js/global-signals/wds-gs-explain.js";
const seedsPath = "data/global-signals/explain/question-seeds.json";
const relPath = "data/global-signals/relationships/relationships.json";
const industriesPath = "data/global-signals/industries/industries.json";
const countriesPath = "data/global-signals/countries/countries.json";
const citizenPath = "data/global-signals/citizen-impact/citizen-impact.json";
const articlesPath = "data/global-signals/articles/articles.json";

assert.ok(exists(htmlPath), "explain route missing");
assert.ok(exists(cssPath), "explain CSS missing");
assert.ok(exists(jsPath), "explain JS missing");
assert.ok(exists(seedsPath), "question seeds missing");
assert.ok(exists(relPath), "relationships data missing");
assert.ok(exists(industriesPath), "industries data missing");
assert.ok(exists(countriesPath), "countries data missing");
assert.ok(exists(citizenPath), "citizen-impact data missing");
assert.ok(exists(articlesPath), "articles data missing");

const html = read(htmlPath);
assert.match(html, /<title>Explain This — Global Signals<\/title>/);
assert.match(html, /id="gse-app"/);
assert.match(html, /data-gse-app/);
assert.match(html, /wds-gs-explain\.js/);
assert.match(html, /question-seeds\.json/);
assert.match(html, /No AI invention/);
assert.match(html, /href="\.\.\/"/);
assert.match(html, /Back to Global Signals/);
assert.match(html, /relationships\//);
assert.match(html, /articles\//);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /openai|anthropic|ChatGPT|language model/i);

const css = read(cssPath);
assert.match(css, /\.gse-app/);
assert.match(css, /\.gse-chain/);
assert.match(css, /@media \(max-width:\s*40rem\)/);
assert.match(css, /prefers-reduced-motion/);

const seeds = JSON.parse(read(seedsPath));
assert.equal(seeds.mode, "sample-demo");
assert.ok(seeds.honesty && seeds.honesty.banner);
assert.ok(Array.isArray(seeds.examplePrompts));
assert.equal(seeds.examplePrompts.length, 4);
assert.ok(seeds.examplePrompts.includes("Why are food prices increasing?"));
assert.ok(seeds.examplePrompts.includes("Why does Taiwan matter?"));
assert.ok(seeds.examplePrompts.includes("Why are airlines affected?"));
assert.ok(seeds.examplePrompts.includes("What does this tariff change?"));
assert.ok(Array.isArray(seeds.questions));
assert.ok(seeds.questions.length >= 4);

const graphData = JSON.parse(read(relPath));
assert.equal(graphData.mode, "sample-demo");
const entityIds = new Set(graphData.entities.map((e) => e.id));
const relIds = new Set(graphData.relationships.map((r) => r.id));
assert.ok(entityIds.has("gsn_travel"), "airline literacy entity gsn_travel required");
assert.ok(relIds.has("gsr_transport_travel"), "transport→travel edge required");
assert.ok(
  graphData.cascades.some((c) => c.id === "gsc_airlines"),
  "airlines cascade required"
);
const travelEdge = graphData.relationships.find((r) => r.id === "gsr_transport_travel");
assert.equal(travelEdge.provenance, "explain-this-seed-extension");
assert.notEqual(travelEdge.confidence, "Observed");

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

for (const q of seeds.questions) {
  for (const id of q.seedEntityIds || []) {
    assert.ok(entityIds.has(id), "seed entity missing " + id);
  }
  if (q.preferredCascadeId) {
    assert.ok(
      graphData.cascades.some((c) => c.id === q.preferredCascadeId),
      "cascade missing " + q.preferredCascadeId
    );
  }
  for (const id of q.linkedIndustryIds || []) {
    assert.ok(industryIds.has(id), "linked industry missing " + id);
  }
  for (const id of q.linkedCountryIds || []) {
    assert.ok(countryIds.has(id), "linked country missing " + id);
  }
  for (const id of q.linkedArticleIds || []) {
    assert.ok(articleIds.has(id), "linked article missing " + id);
  }
}

await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.explain;
assert.ok(api);

assert.equal(api.normalizeConfidence(null), "Unknown");
assert.equal(api.normalizeConfidence("moderate"), "Medium");
assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeTimeHorizon("weeks"), "Weeks");
assert.equal(api.normalizeTimeHorizon("bogus"), "Unknown");
assert.equal(api.normalizeQuery("  Why Does Taiwan Matter? "), "why does taiwan matter");

const graph = api.normalizeGraph(graphData);
const seedBundle = api.normalizeSeeds(seeds);
const linked = api.indexLinked({
  industries,
  countries,
  citizenImpact: JSON.parse(read(citizenPath)),
  articles
});
const store = { graph, seeds: seedBundle, linked, industries, countries, articles };

function run(q) {
  return api.explain(q, store);
}

// Example questions
const food = run("Why are food prices increasing?");
assert.equal(food.status, "explained");
assert.equal(food.invented, false);
assert.ok(food.pathFound);
assert.equal(food.match.questionId, "gsq_food_prices");
assert.ok(food.relationshipChain.some((s) => s.entity.id === "gsn_drought"));
assert.ok(food.relationshipChain.some((s) => s.entity.id === "gsn_household_food"));
assert.ok(food.industries.some((i) => i.id === "gsi_food"));
assert.ok(food.citizenImpacts.length >= 1);
assert.ok(food.summary);
assert.notEqual(food.confidence, "Observed");
for (const step of food.relationshipChain) {
  if (step.relationship) {
    assert.notEqual(step.relationship.confidence, "Observed");
    assert.ok(relIds.has(step.relationship.id), "invented edge " + step.relationship.id);
  }
}

const taiwan = run("Why does Taiwan matter?");
assert.equal(taiwan.status, "explained");
assert.equal(taiwan.match.questionId, "gsq_taiwan");
assert.ok(taiwan.relationshipChain.some((s) => s.entity.id === "gsn_taiwan"));
assert.ok(taiwan.relationshipChain.some((s) => s.entity.id === "gsn_semiconductors"));
assert.ok(taiwan.countries.some((c) => c.id === "gsc_taiwan"));
assert.ok(taiwan.waypointsTake, "Taiwan path should surface industry Waypoint Take when present");
assert.ok(taiwan.waypointsTake.whyItMatters || taiwan.waypointsTake.analysis);

const airlines = run("Why are airlines affected?");
assert.equal(airlines.status, "explained");
assert.equal(airlines.match.questionId, "gsq_airlines");
assert.ok(airlines.relationshipChain.some((s) => s.entity.id === "gsn_travel"));
assert.ok(airlines.relationshipChain.some((s) => s.entity.id === "gsn_crude_oil"));
assert.ok(airlines.citizenImpacts.some((c) => c.sectionId === "travel" || /travel/i.test(c.sectionLabel)));

const tariff = run("What does this tariff change?");
assert.equal(tariff.status, "explained");
assert.equal(tariff.match.questionId, "gsq_tariff");
assert.ok(tariff.relationshipChain.some((s) => s.entity.id === "gsn_steel_tariff"));
assert.ok(tariff.relationshipChain.some((s) => s.entity.id === "gsn_steel"));
assert.ok(tariff.industries.some((i) => i.id === "gsi_construction" || i.id === "gsi_automotive"));
assert.ok(tariff.articles.some((a) => a.id === "gsa_demo-steel-tariff"));

// No-match
const nomatch = run("Why do purple unicorns control the weather?");
assert.equal(nomatch.status, "no-match");
assert.equal(nomatch.pathFound, false);
assert.equal(nomatch.invented, false);
assert.match(nomatch.summary, /No structured match/i);
assert.equal(nomatch.relationshipChain.length, 0);

const empty = run("   ");
assert.equal(empty.status, "empty-query");

// Alias match without curated prompt
const alias = run("Tell me about Rotterdam");
assert.equal(alias.status, "explained");
assert.equal(alias.match.matchKind, "alias");
assert.ok(alias.relationshipChain.some((s) => s.entity.id === "gsn_rotterdam"));

// Confidence rules on assembly
assert.equal(
  api.weakestConfidence([
    { confidence: "High" },
    { confidence: "Low" },
    { confidence: "Medium" }
  ]),
  "Low"
);
assert.equal(api.furthestHorizon([{ timeHorizon: "Days" }, { timeHorizon: "Months" }]), "Months");

// No invented edges: every explained chain edge must exist in seed JSON
for (const sample of [food, taiwan, airlines, tariff, alias]) {
  assert.equal(sample.invented, false);
  for (const step of sample.relationshipChain) {
    if (!step.relationship) continue;
    assert.ok(relIds.has(step.relationship.id));
    assert.ok(entityIds.has(step.relationship.from));
    assert.ok(entityIds.has(step.relationship.to));
  }
}

// Observed coercion on normalize
const bad = api.normalizeRelationship({
  id: "gsr_bad",
  from: "gsn_taiwan",
  to: "gsn_semiconductors",
  why: "x",
  confidence: "Observed",
  timeHorizon: "days",
  evidence: { kind: "sample-demo", label: "demo" }
});
assert.equal(bad.confidence, "Unknown");

// Render contains required sections for explained result
const rendered = api.renderExplanation(taiwan);
assert.match(rendered, /Summary/);
assert.match(rendered, /Waypoint/);
assert.match(rendered, /Relationship chain/);
assert.match(rendered, /Industries/);
assert.match(rendered, /Countries/);
assert.match(rendered, /Citizen impacts/);
assert.match(rendered, /Evidence/);
assert.match(rendered, /Confidence/);

const noMatchHtml = api.renderExplanation(nomatch);
assert.match(noMatchHtml, /No structured match/);
assert.doesNotMatch(noMatchHtml, /gse-chain__step/);

// Landing integration
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /\.\/explain\//);
assert.match(landing, /Explain This/);

// Articles no regression
assert.doesNotMatch(read("side-trails/global-signals/articles/index.html"), /Coming soon/i);
assert.match(read(articlesPath), /"mode": "sample-demo"/);
assert.equal(articles.articles.length, 5);

// HTTP smoke
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
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

async function get(pathname) {
  const res = await fetch(`${base}${pathname}`);
  return { status: res.status, text: await res.text() };
}

const page = await get("/side-trails/global-signals/explain/");
assert.equal(page.status, 200);
assert.match(page.text, /wds-gs-explain\.js/);

const withQ = await get("/side-trails/global-signals/explain/?q=" + encodeURIComponent("Why does Taiwan matter?"));
assert.equal(withQ.status, 200);

const seedsRes = await get("/data/global-signals/explain/question-seeds.json");
assert.equal(seedsRes.status, 200);

const jsRes = await get("/design-system/js/global-signals/wds-gs-explain.js");
assert.equal(jsRes.status, 200);
const cssRes = await get("/design-system/css/wds-global-signals-explain.css");
assert.equal(cssRes.status, 200);

const articlesPage = await get("/side-trails/global-signals/articles/");
assert.equal(articlesPage.status, 200);
assert.doesNotMatch(articlesPage.text, /Coming soon/i);

server.close();
console.log("Global Signals Explain This checks passed.");
