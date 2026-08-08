#!/usr/bin/env node
/**
 * Homepage Global Signals teaser — live-only gate + unavailable honesty.
 * Proves sample-demo / fixture content is never selected for Home.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const loaderPath = "design-system/js/global-signals/wds-gs-loader.js";
const teaserPath = "design-system/js/global-signals/wds-gs-home-teaser.js";
const deepenPath = "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js";
const cssPath = "design-system/css/wds-dashboard-rebuild.css";
const wdsPath = "design-system/js/wds.js";
const homePath = "index.html";

assert.ok(exists(loaderPath), "loader missing");
assert.ok(exists(teaserPath), "home teaser missing");
assert.ok(exists(deepenPath), "deepeners missing");

const wdsJs = read(wdsPath);
assert.match(wdsJs, /global-signals\/wds-gs-loader\.js/);
assert.match(wdsJs, /global-signals\/wds-gs-home-teaser\.js/);
assert.ok(
  wdsJs.indexOf("global-signals/wds-gs-loader.js") <
    wdsJs.indexOf("dashboard/rebuild/wds-dashboard-rebuild-deepeners.js"),
  "loader must load before deepeners"
);

const homeHtml = read(homePath);
assert.match(homeHtml, /gs-home-teaser-1/);

const css = read(cssPath);
assert.match(css, /\.wdb-r-gs-teaser/);
assert.match(css, /\.wdb-r-deepen__section--gs-teaser/);

const deepenSrc = read(deepenPath);
assert.match(deepenSrc, /global-signals-teaser/);
assert.match(deepenSrc, /bindGlobalSignalsTeaser/);
assert.match(deepenSrc, /Explore Global Signals/);
assert.doesNotMatch(deepenSrc, /sample-demo/);
assert.doesNotMatch(deepenSrc, /Canal drought|OFAC sample|fixture headline/i);

await import(pathToFileURL(path.join(root, loaderPath)).href);
await import(pathToFileURL(path.join(root, teaserPath)).href);
await import(pathToFileURL(path.join(root, deepenPath)).href);

const loader = globalThis.WDS.globalSignals.loader;
const teaser = globalThis.WDS.globalSignals.homeTeaser;
const Deepen = globalThis.WDS.dashboardRebuildDeepeners;

assert.equal(loader.isProductionMode("live"), true);
assert.equal(loader.isProductionMode("live-empty"), true);
assert.equal(loader.isProductionMode("sample-demo"), false);
assert.equal(loader.isFixtureMode("sample-demo"), true);

const sampleEvents = {
  mode: "sample-demo",
  updatedAt: "2026-08-08T00:00:00Z",
  events: [
    {
      id: "gse_sample_canal",
      title: "SAMPLE Canal drought notice (demo)",
      summary: "Fixture only — must never render on homepage.",
      eventType: "trade",
      source: "fixture",
      sourceUrl: "https://example.invalid/sample",
      retrievedAt: "2026-08-08T00:00:00Z",
      status: "active"
    }
  ]
};

const sampleImpacts = {
  mode: "sample-demo",
  updatedAt: "2026-08-08T00:00:00Z",
  industries: [
    {
      originEvent: "gse_sample_canal",
      affectedEntityLabel: "SAMPLE Shipping",
      affectedEntityType: "Industry",
      order: 1
    }
  ],
  citizen: [
    {
      originEvent: "gse_sample_canal",
      affectedEntityLabel: "SAMPLE Grocery prices",
      affectedEntityType: "Citizen Impact",
      order: 2
    }
  ]
};

assert.equal(loader.gateDataset(sampleEvents).ok, false);

const refused = teaser.pickTeaser(sampleEvents, sampleImpacts, null);
assert.equal(refused.state, "unavailable");
assert.equal(refused.reason, "non_production_mode");
assert.notEqual(refused.state, "live");

const emptyLive = teaser.pickTeaser(
  { mode: "live-empty", updatedAt: "2026-08-08T12:00:00Z", events: [] },
  { mode: "live-empty", updatedAt: "2026-08-08T12:00:00Z", industries: [], citizen: [], impacts: [] },
  { mode: "live", updatedAt: "2026-08-08T12:00:00Z", lastSuccessfulIngestion: "2026-08-08T12:00:00Z" }
);
assert.equal(emptyLive.state, "empty");

const liveEvents = {
  mode: "live",
  updatedAt: "2026-08-08T18:00:00Z",
  events: [
    {
      id: "gse_live_ofac",
      title: "OFAC publishes sanctions-related Federal Register notice",
      summary: "Official government notice.",
      eventType: "sanctions",
      source: "federal-register",
      sourceUrl: "https://www.federalregister.gov/example",
      publishedAt: "2026-08-08T17:00:00Z",
      retrievedAt: "2026-08-08T18:00:00Z",
      status: "active"
    },
    {
      id: "gse_live_quake",
      title: "USGS reports significant earthquake",
      summary: "Observed seismic event.",
      eventType: "earthquake",
      source: "usgs",
      sourceUrl: "https://earthquake.usgs.gov/example",
      publishedAt: "2026-08-08T16:00:00Z",
      retrievedAt: "2026-08-08T18:00:00Z",
      status: "active"
    }
  ]
};

const liveImpacts = {
  mode: "live",
  updatedAt: "2026-08-08T18:05:00Z",
  honesty: {
    banner: "Impacts are calculated exposure paths — not Observed facts."
  },
  industries: [
    {
      originEvent: "gse_live_ofac",
      affectedEntityLabel: "Semiconductors",
      affectedEntityType: "Industry",
      order: 1
    }
  ],
  citizen: [
    {
      originEvent: "gse_live_ofac",
      affectedEntityLabel: "Consumer electronics availability",
      affectedEntityType: "Citizen Impact",
      order: 2
    }
  ],
  impacts: []
};

const livePick = teaser.pickTeaser(liveEvents, liveImpacts, {
  mode: "live",
  lastSuccessfulIngestion: "2026-08-08T18:00:00Z"
});
assert.equal(livePick.state, "live");
assert.equal(livePick.event.id, "gse_live_ofac");
assert.equal(livePick.industry.affectedEntityLabel, "Semiconductors");
assert.equal(livePick.citizen.affectedEntityLabel, "Consumer electronics availability");
assert.match(String(livePick.event.title), /OFAC/);
assert.doesNotMatch(String(livePick.event.title), /SAMPLE|demo|fixture/i);

// Incomplete ripples → empty, not invented
const incomplete = teaser.pickTeaser(
  liveEvents,
  {
    mode: "live",
    updatedAt: "2026-08-08T18:05:00Z",
    industries: liveImpacts.industries,
    citizen: [],
    impacts: []
  },
  null
);
assert.equal(incomplete.state, "empty");
assert.equal(incomplete.reason, "no_complete_ripple");

const deepenHtml = Deepen.render();
assert.match(deepenHtml, /data-deepen="global-signals-teaser"/);
assert.match(deepenHtml, /What.s changing/);
assert.match(deepenHtml, /Explore Global Signals/);
assert.match(deepenHtml, /side-trails\/global-signals\//);
assert.doesNotMatch(deepenHtml, /SAMPLE Canal drought|sample-demo/i);

// Render helpers must not embed sample strings when unavailable
const fakeEl = {
  innerHTML: "",
  removeAttribute: function () {}
};
teaser.renderUnavailable(fakeEl, { state: "unavailable" });
assert.match(fakeEl.innerHTML, /unavailable/i);
assert.doesNotMatch(fakeEl.innerHTML, /SAMPLE|Canal drought|sample-demo/i);
assert.match(fakeEl.innerHTML, /data-gs-teaser-state="unavailable"/);

teaser.renderLive(fakeEl, livePick);
assert.match(fakeEl.innerHTML, /data-gs-teaser-state="live"/);
assert.match(fakeEl.innerHTML, /Semiconductors/);
assert.match(fakeEl.innerHTML, /Consumer electronics availability/);
assert.doesNotMatch(fakeEl.innerHTML, /SAMPLE|sample-demo/i);

// Production artifact paths: if present, must be live*
for (const rel of [
  "data/global-signals/production/events/events.json",
  "data/global-signals/events/events.json",
  "data/global-signals/production/impacts/impacts.json",
  "data/global-signals/impacts/impacts.json"
]) {
  if (!exists(rel)) continue;
  const doc = JSON.parse(read(rel));
  assert.ok(doc.mode === "live" || doc.mode === "live-empty", rel + " must be live*");
  assert.notEqual(doc.mode, "sample-demo", rel + " must not be sample-demo");
}

console.log("test-homepage-global-signals-teaser: ok");
