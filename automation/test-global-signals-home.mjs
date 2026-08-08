#!/usr/bin/env node
/**
 * Global Signals application home dashboard.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

assert.ok(exists("side-trails/global-signals/index.html"));
assert.ok(exists("design-system/css/wds-global-signals-home.css"));
assert.ok(exists("design-system/js/global-signals/wds-gs-home.js"));
assert.ok(exists("data/global-signals/home/home.json"));

const html = read("side-trails/global-signals/index.html");
assert.match(html, /What matters today/);
assert.match(html, /id="gsh-board"/);
assert.match(html, /data-gsh-board/);
assert.match(html, /wds-gs-home\.js/);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /Future modules/i);
assert.doesNotMatch(html, /gs-modules/);
assert.doesNotMatch(html, /gs-hero__/);

const css = read("design-system/css/wds-global-signals-home.css");
assert.match(css, /\.gsh-board/);
assert.match(css, /\.gsh-panel/);
assert.match(css, /\.gsh-search/);
assert.match(css, /@media \(max-width:\s*900px\)/);

const js = read("design-system/js/global-signals/wds-gs-home.js");
for (const section of [
  "Current Events",
  "Featured Waypoint",
  "Featured Relationship",
  "Most Affected Countries",
  "Industries Under Pressure",
  "Citizen Impact Summary",
  "Latest Articles",
  "Relationship Explorer search"
]) {
  assert.match(js, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(js, /relationships\/\?entity=/);
assert.match(js, /relationship-graph\/\?focus=/);
assert.match(js, /articles\/\?id=/);
assert.match(js, /countries\//);
assert.match(js, /industries\//);
assert.match(js, /citizen-impact\/#section-/);
assert.match(js, /explain\/\?q=/);

const home = JSON.parse(read("data/global-signals/home/home.json"));
const articles = JSON.parse(read("data/global-signals/articles/articles.json"));
const countries = JSON.parse(read("data/global-signals/countries/countries.json"));
const industries = JSON.parse(read("data/global-signals/industries/industries.json"));
const citizen = JSON.parse(read("data/global-signals/citizen-impact/citizen-impact.json"));
const rel = JSON.parse(read("data/global-signals/relationships/relationships.json"));

const artIds = new Set(articles.articles.map((a) => a.id));
const countrySlugs = new Set(countries.countries.map((c) => c.slug));
const industrySlugs = new Set(industries.industries.map((i) => i.slug));
const sectionIds = new Set(citizen.sections.map((s) => s.id));
const entityIds = new Set(rel.entities.map((e) => e.id));
const cascadeIds = new Set(rel.cascades.map((c) => c.id));

assert.ok(artIds.has(home.featuredTake.articleId));
assert.ok(industrySlugs.has(home.featuredTake.industrySlug));
assert.ok(cascadeIds.has(home.featuredRelationship.cascadeId));
assert.ok(entityIds.has(home.featuredRelationship.rootEntityId));
home.featuredArticleIds.forEach((id) => assert.ok(artIds.has(id), id));
home.mostAffectedCountrySlugs.forEach((s) => assert.ok(countrySlugs.has(s), s));
home.industriesUnderPressureSlugs.forEach((s) => assert.ok(industrySlugs.has(s), s));
home.citizenImpactSectionIds.forEach((s) => assert.ok(sectionIds.has(s), s));

for (const relPath of [
  "side-trails/global-signals/articles/index.html",
  "side-trails/global-signals/relationships/index.html",
  "side-trails/global-signals/relationship-graph/index.html",
  "side-trails/global-signals/countries/index.html",
  "side-trails/global-signals/industries/index.html",
  "side-trails/global-signals/citizen-impact/index.html",
  "side-trails/global-signals/explain/index.html"
]) {
  assert.ok(exists(relPath), relPath);
  assert.doesNotMatch(read(relPath), /Coming soon/i);
}

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const gs = catalog.projects.find((p) => p.id === "global-signals");
assert.equal(gs.url, "side-trails/global-signals/");
assert.match(read("side-trails/index.html"), /wds-side-trails/);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};
const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let relp = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  if (relp.endsWith("/")) relp += "index.html";
  const file = path.join(root, relp);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

function get(pathname) {
  return new Promise((resolve, reject) => {
    http
      .get(base + pathname, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, text: data }));
      })
      .on("error", reject);
  });
}

const dash = await get("/side-trails/global-signals/");
assert.equal(dash.status, 200);
assert.match(dash.text, /gsh-board/);
assert.doesNotMatch(dash.text, /Coming soon/i);

for (const route of [
  "/side-trails/global-signals/articles/",
  "/side-trails/global-signals/relationships/",
  "/side-trails/global-signals/relationship-graph/",
  "/side-trails/global-signals/countries/",
  "/side-trails/global-signals/industries/",
  "/side-trails/global-signals/citizen-impact/",
  "/side-trails/global-signals/explain/"
]) {
  const page = await get(route);
  assert.equal(page.status, 200, route);
  assert.doesNotMatch(page.text, /Coming soon/i);
}

for (const dataPath of [
  "/data/global-signals/home/home.json",
  "/data/global-signals/articles/articles.json",
  "/data/global-signals/countries/countries.json",
  "/data/global-signals/industries/industries.json",
  "/data/global-signals/citizen-impact/citizen-impact.json",
  "/data/global-signals/relationships/relationships.json"
]) {
  const res = await get(dataPath);
  assert.equal(res.status, 200, dataPath);
  JSON.parse(res.text);
}

server.close();
console.log("Global Signals home dashboard checks passed.");
