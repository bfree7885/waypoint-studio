#!/usr/bin/env node
/**
 * Global Signals direct-entry — entry URLs land on the live dashboard;
 * obsolete shells redirect; catalog / home / about point at the board.
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
assert.ok(exists("side-trails/global-signals/about/index.html"));
assert.ok(exists("side-trails/global-signals/global-dashboard/index.html"));

const dash = read("side-trails/global-signals/index.html");
assert.match(dash, /gsh-board|data-gsh-board/);
assert.match(dash, /wds-gs-home\.js/);
assert.match(dash, /What matters today/);
assert.doesNotMatch(dash, /Coming soon/i);
assert.doesNotMatch(dash, /Future modules/i);
assert.doesNotMatch(dash, /gs-hero__/);
assert.match(dash, /\.\/about\//);

const about = read("side-trails/global-signals/about/index.html");
assert.match(about, /Open dashboard/i);
assert.match(about, /href="\.\.\/"/);
assert.match(about, /canonical[^>]+global-signals\/about\//);

const redirect = read("side-trails/global-signals/global-dashboard/index.html");
assert.match(redirect, /http-equiv=["']refresh["']/i);
assert.match(redirect, /url=\.\.\//);
assert.match(redirect, /location\.replace\(\s*["']\.\.\/["']\s*\)/);
assert.doesNotMatch(redirect, /Coming soon/i);
assert.doesNotMatch(redirect, /not implemented/i);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const gs = catalog.projects.find((p) => p.id === "global-signals");
assert.ok(gs);
assert.equal(gs.url, "side-trails/global-signals/");
assert.equal(gs.status, "archived", "Global Signals is archived research, not a standalone active product");
assert.match(gs.ctaLabel, /[Aa]rchive|[Vv]iew/i);
assert.match(gs.description + " " + gs.tagline, /Deck|archived|not a standalone/i);

const navCfg = read("design-system/js/platform/wds-app-nav-config.js");
assert.doesNotMatch(navCfg, /"homeSideTrails":\s*\[[^\]]*global-signals/);
assert.match(navCfg, /"id":\s*"global-signals"/);
assert.match(navCfg, /"href":\s*"side-trails\/global-signals\/"/);

const navReg = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
assert.equal(
  navReg.homeSideTrails.includes("global-signals"),
  false,
  "Global Signals must not be promoted on home Side Trails"
);
assert.ok(
  navReg.homeSideTrails.includes("waypoint-deck") || navReg.homeSideTrails.length === 0,
  "home Side Trails should feature Deck (or empty), not GS"
);
const navApp = navReg.apps.find((a) => a.id === "global-signals");
assert.ok(navApp);
assert.equal(navApp.productLanding.href, "side-trails/global-signals/");
assert.equal(navApp.startHere.href, "side-trails/global-signals/");

const studioHome = read("index.html");
assert.match(studioHome, /side-trails\//);
assert.doesNotMatch(studioHome, /side-trails\/global-signals\//);

const sideTrailsPage = read("side-trails/index.html");
assert.match(sideTrailsPage, /Archive|past experiments/i);
assert.match(sideTrailsPage, /Global Signals/);
assert.match(sideTrailsPage, /Waypoint Deck/);

const studioAbout = read("about.html");
assert.match(studioAbout, /Global Signals/);
assert.match(studioAbout, /archived|not standalone|Deck/i);

// Primary surface must expose the required intelligence destinations.
for (const href of [
  "./articles/",
  "./explain/",
  "./relationships/",
  "./relationship-graph/",
  "./countries/",
  "./industries/",
  "./citizen-impact/"
]) {
  assert.match(dash, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

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

const primary = await get("/side-trails/global-signals/");
assert.equal(primary.status, 200);
assert.match(primary.text, /gsh-board/);
assert.doesNotMatch(primary.text, /Coming soon/i);

const aboutRes = await get("/side-trails/global-signals/about/");
assert.equal(aboutRes.status, 200);
assert.match(aboutRes.text, /Open dashboard/i);

const gd = await get("/side-trails/global-signals/global-dashboard/");
assert.equal(gd.status, 200);
assert.match(gd.text, /url=\.\.\//);
assert.match(gd.text, /location\.replace/);

const catalogPage = await get("/side-trails/");
assert.equal(catalogPage.status, 200);
assert.match(catalogPage.text, /Global Signals/);
assert.match(catalogPage.text, /Waypoint Deck/);
assert.match(catalogPage.text, /Archive|past experiments/i);

const catalogJson = await get("/data/side-trails/catalog.json");
assert.equal(catalogJson.status, 200);
const cat = JSON.parse(catalogJson.text);
assert.equal(cat.projects.find((p) => p.id === "global-signals").url, "side-trails/global-signals/");

server.close();
console.log("Global Signals direct-entry checks passed.");
