#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.1 — identity, isolation, model, provider, unpublished posture.
 * Runtime remains /apps/summit-signal/. Filename keeps that route.
 * Run: node automation/test-summit-signal-v0-1.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function isSilentRedirect(html) {
  return /noindex/i.test(html) && /location\.replace/.test(html) && /http-equiv="refresh"/i.test(html);
}

function loadScript(sandbox, rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

const sandbox = { console, fetch: null, sessionStorage: null, location: { search: "" } };
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
loadScript(sandbox, "apps/summit-signal/js/ss-maidenhead.js");
loadScript(sandbox, "apps/summit-signal/js/ss-geo.js");
loadScript(sandbox, "apps/summit-signal/js/ss-summit-model.js");
loadScript(sandbox, "apps/summit-signal/js/ss-planning-provider.js");
loadScript(sandbox, "apps/summit-signal/js/ss-sota-provider.js");

const Model = sandbox.SignalTerrainSotaModel;
const Geo = sandbox.SignalTerrainSotaGeo;
const Maidenhead = sandbox.SignalTerrainSotaMaidenhead;
const Planning = sandbox.SignalTerrainSotaPlanning;
const Sota = sandbox.SignalTerrainSotaProvider;

assert("model module loads", !!Model && typeof Model.normalizeSummit === "function");
assert("geo module loads", !!Geo && typeof Geo.haversineKm === "function");
assert("maidenhead module loads", !!Maidenhead && typeof Maidenhead.fromLatLng === "function");
assert("planning module loads", !!Planning && typeof Planning.getPlanning === "function");
assert("sota provider loads", !!Sota && typeof Sota.loadCatalog === "function");
assert("namespace is SignalTerrainSota", !!sandbox.SignalTerrainSota && sandbox.SignalTerrainSota.Model === Model);
assert("retired SummitSignal global is gone", sandbox.SummitSignal == null && sandbox.SummitSignalModel == null);

const fixture = JSON.parse(read("apps/summit-signal/data/ss-summits-w2-gc.json"));
assert("fixture labeled developmentFixture", fixture.source && fixture.source.developmentFixture === true);
assert("fixture source is SOTA API", /api2\.sota\.org\.uk\/api\/regions\/W2\/GC/.test(fixture.source.url));
assert("fixture has 118 summits", Array.isArray(fixture.summits) && fixture.summits.length === 118, String(fixture.summits.length));
assert("fixture region is W2/GC", fixture.region.associationCode === "W2" && fixture.region.regionCode === "GC");
assert("fixture region has bbox", fixture.region.minLat != null && fixture.region.maxLng != null);
assert("fixture identity is SignalTerrain", /SignalTerrain/.test(fixture.source.userAgent) && /SignalTerrain/.test(fixture.source.licenseNote));
assert("fixture does not say Summit Signal", !/Summit Signal/.test(JSON.stringify(fixture.source)));

const catalog = Model.normalizeCatalog(fixture);
assert("normalized all 118", catalog.summits.length === 118 && catalog.droppedInvalid === 0, JSON.stringify({ n: catalog.summits.length, dropped: catalog.droppedInvalid }));

const slide = Model.findById(catalog.summits, "W2/GC-001");
assert("Slide Mountain present", !!slide && slide.name === "Slide Mountain");
assert("Slide reference", slide.reference === "W2/GC-001");
assert("Slide points retrieved", slide.points === 10);
assert("Slide elevation retrieved", slide.elevationM === 1277 && slide.elevationFt === 4190);
assert("Slide coords retrieved", slide.lat === 41.9991 && slide.lng === -74.3862);
assert("Slide maidenhead from SOTA", slide.maidenhead === "FN21tx" && slide.maidenheadSource === "sota");
assert("Slide activation count is known 86", slide.activationCount === 86);
assert("Slide last activation retrieved", !!slide.lastActivationDate && slide.lastActivationCall === "KN4OK");
assert("Slide seasonal bonus unavailable (not invented)", slide.seasonalBonus.status === "unavailable" && slide.seasonalBonus.points == null);
assert("Slide visual encodings unset", slide.visual.hikeDifficulty == null && slide.visual.recommendationScore == null);

const mh = Maidenhead.fromLatLng(41.9991, -74.3862, 6);
assert("derived maidenhead matches FN21tx", mh === "FN21tx", String(mh));

const missing = Model.normalizeSummit({
  summitCode: "W2/GC-TEST",
  latitude: 42.1,
  longitude: -74.2
});
assert("missing name stays null", missing && missing.name == null);
assert("missing points stay null", missing.points == null);
assert("missing activations stay null not zero", missing.activationCount == null);
assert("missing locator derives maidenhead", missing.maidenheadSource === "derived" && typeof missing.maidenhead === "string");

const dropped = Model.normalizeSummit({ summitCode: "W2/GC-BAD", name: "Nowhere", latitude: 999, longitude: 0 });
assert("invalid coords dropped", dropped == null);

const mixed = Model.normalizeCatalog({
  summits: [
    { summitCode: "OK-1", name: "Ok", latitude: 42, longitude: -74, points: 4 },
    { summitCode: "BAD", name: "Bad", latitude: null, longitude: -74 },
    { name: "Also bad", latitude: 42, longitude: 200 }
  ]
});
assert("catalog drops invalid only", mixed.summits.length === 1 && mixed.droppedInvalid === 2, JSON.stringify(mixed));

const searchName = Model.searchSummits(catalog.summits, "slide", null);
assert("search by name", searchName.length >= 1 && searchName.some((s) => s.reference === "W2/GC-001"));
const searchRef = Model.searchSummits(catalog.summits, "w2/gc-001", null);
assert("search by reference", searchRef.length === 1 && searchRef[0].name === "Slide Mountain");
const searchPts = Model.searchSummits(catalog.summits, "", 10);
assert("min points 10", searchPts.length >= 1 && searchPts.every((s) => s.points >= 10));
const searchNone = Model.searchSummits(catalog.summits, "zzzz-not-a-summit", null);
assert("search miss is empty", searchNone.length === 0);

const hunter = Model.findById(catalog.summits, "W2/GC-002");
const nearby = Geo.nearbySummits(slide, catalog.summits, { limit: 8 });
assert("nearby excludes selected", nearby.every((row) => row.summit.id !== "W2/GC-001"));
assert("nearby has distance", nearby.length >= 1 && nearby[0].distanceKm > 0 && !!nearby[0].distanceLabel);
assert("Hunter is among loaded summits", !!hunter);

const plan = Planning.getPlanning(slide);
assert("planning status not-integrated", plan.status === "not-integrated");
const planIds = ["trailhead", "parking", "hikingRoute", "distance", "elevationGain", "estimatedHikingTime", "activationZone"];
assert(
  "planning fields honest",
  planIds.every((id) => plan.items[id] && plan.items[id].status === "not-integrated" && plan.items[id].value == null)
);
assert("planning does not invent a trailhead name", plan.items.trailhead.display === "Not yet integrated");
assert("activation zone explains DEM need", /25 m/.test(plan.items.activationZone.reason));
assert("planning provider id is collision-safe", plan.provider === "signalterrain-sota-planning-v0");

const session = {};
sandbox.sessionStorage = {
  getItem: (k) => (k in session ? session[k] : null),
  setItem: (k, v) => {
    session[k] = String(v);
  },
  removeItem: (k) => {
    delete session[k];
  }
};
sandbox.fetch = async (url) => {
  if (String(url).indexOf("ss-summits-w2-gc.json") !== -1) {
    return {
      ok: true,
      json: async () => fixture
    };
  }
  throw new Error("unexpected fetch " + url);
};
Sota.clearCache();
const loaded = await Sota.loadCatalog({ live: false, fixtureUrl: "data/ss-summits-w2-gc.json" });
assert("provider loads fixture", loaded.summits.length === 118 && loaded.meta.mode === "fixture");
assert("provider meta not live", loaded.meta.liveAttempted === false);
assert("session cache uses signalterrain-sota key", Object.keys(session).includes("signalterrain-sota-catalog-v0"));
assert("legacy summit-signal cache key unused", !Object.keys(session).includes("summit-signal-catalog-v0"));

sandbox.fetch = async (url) => {
  if (String(url).indexOf("api2.sota.org.uk") !== -1) throw new Error("CORS blocked");
  if (String(url).indexOf("ss-summits-w2-gc.json") !== -1) {
    return {
      ok: true,
      json: async () => fixture
    };
  }
  throw new Error("unexpected fetch " + url);
};
Sota.clearCache();
const fallback = await Sota.loadCatalog({ live: true, fixtureUrl: "data/ss-summits-w2-gc.json", force: true });
assert(
  "live failure falls back to fixture",
  fallback.meta.liveAttempted === true && /CORS/.test(fallback.meta.liveError || "") && fallback.summits.length === 118,
  JSON.stringify(fallback.meta)
);

const html = read("apps/summit-signal/index.html");
assert("app is noindex", /noindex/i.test(html));
assert("visible identity is SignalTerrain", /<p class="ss-product">SignalTerrain<\/p>/.test(html) && /<title>SignalTerrain/.test(html));
assert("visible Summit Signal identity removed", !/Summit Signal/.test(html));
assert("data-product is collision-safe", /data-product="signalterrain-sota"/.test(html));
assert("disclaimer in HTML", /not affiliated with or endorsed by Summits on the Air/.test(html));
assert("planning section in HTML", /id="ss-sec-planning"/.test(html));
assert("search and locate controls", /id="ss-search-open"/.test(html) && /id="ss-locate"/.test(html));
assert("does not load Sheds JS", !/shed-hunting|sheds-map-app|WaypointSheds/.test(html));
assert("does not load SignalTerrain Cyber modules", !/wds-signalterrain|design-system\/signalterrain/.test(html));
assert("uses local leaflet", /vendor\/leaflet\/leaflet\.js/.test(html));
assert("route file still lives under summit-signal", fs.existsSync(path.join(ROOT, "apps/summit-signal/index.html")));

const appJs = read("apps/summit-signal/js/ss-map-app.js");
assert("activation zone layer hook", /activationZoneLayer/.test(appJs));
assert("map does not import Sheds", !/shed-hunting|WaypointSheds|BASEMAP_STORAGE_KEY/.test(appJs));
assert("map does not import cyber ST", !/wds-signalterrain|design-system\/signalterrain/.test(appJs));
assert("geolocation is opt-in", /ss-locate/.test(appJs) && /getCurrentPosition/.test(appJs));
assert("map app global is SignalTerrainSotaMapApp", /SignalTerrainSotaMapApp/.test(appJs) && !/SummitSignalMapApp/.test(appJs));

const css = read("apps/summit-signal/css/summit-signal.css");
assert("mobile-first hidden override", /\[hidden\]/.test(css) && /display:\s*none\s*!important/.test(css));
assert("selected marker style", /ss-marker\.is-selected/.test(css));
assert("css does not import Sheds tokens", !/--wp-brand/.test(css) && !/shed-hunting/.test(css));

const docs = read("docs/signal-terrain/V0.1.md");
assert("docs disclaimer", /not affiliated with or endorsed by Summits on the Air/.test(docs));
assert("docs name SOTA API", /api2\.sota\.org\.uk/.test(docs));
assert("docs forbid AllTrails scrape", /Do not scrape AllTrails/i.test(docs));
assert("docs free/paid principle", /should remain useful for free|should remain useful without payment/.test(docs));
assert("docs activation zone accuracy", /25 m/.test(docs) && /does not approximate/.test(docs));
assert("docs collision statement", /is a new product definition and is not the retired SignalTerrain Cyber product/.test(docs));
assert("docs licensing gate", /commercial use of the API is not assumed permitted/i.test(docs));
assert("docs keep V0.1 route", /\/apps\/summit-signal\//.test(docs) && /Do(?: \*\*)?not(?:\*\*)? occupy/.test(docs));
assert("historical summit-signal doc is a pointer", /SignalTerrain/.test(read("docs/summit-signal/V0.1.md")) && /not the retired SignalTerrain Cyber/.test(read("docs/summit-signal/V0.1.md")));
assert("cyber vision corpus not overwritten", /Understand the world's signals/.test(read("docs/SIGNALTERRAIN-VISION.md")));

const direction = read("docs/PRODUCT-DIRECTION.md");
assert(
  "product direction lists SignalTerrain SOTA as unpublished",
  /SignalTerrain/.test(direction) && /not a public peer/.test(direction) && /not the retired SignalTerrain Cyber/.test(direction)
);
assert("product direction keeps V0.1 route", /\/apps\/summit-signal\//.test(direction));

const robots = read("robots.txt");
assert("robots disallows summit-signal", /Disallow: \/apps\/summit-signal\//.test(robots));
assert("robots still disallows cyber ST", /Disallow: \/apps\/signalterrain\//.test(robots));
assert("sitemap omits summit-signal", !/summit-signal/.test(read("sitemap.xml")));
assert("sitemap omits signalterrain", !/signalterrain/.test(read("sitemap.xml")));

const nav = read("design-system/js/platform/wds-app-nav-config.js");
assert("primary nav omits SignalTerrain", !/SignalTerrain/.test(nav) && !/Summit Signal/.test(nav));
assert("index homepage omits SignalTerrain and Summit Signal", !/SignalTerrain/.test(read("index.html")) && !/Summit Signal/.test(read("index.html")));
assert("about omits SignalTerrain SOTA promo", !/Summit Signal/.test(read("about.html")));
assert("support omits Summit Signal", !/Summit Signal/.test(read("support.html")));

const cyberApp = read("apps/signalterrain/index.html");
const cyberLanding = read("side-trails/signalterrain/index.html");
assert("cyber app route still silent-redirects", isSilentRedirect(cyberApp));
assert("cyber landing still silent-redirects", isSilentRedirect(cyberLanding));
assert("cyber app HTML has no new SOTA identity", !/signalterrain-sota|Summit Signal/.test(cyberApp));
assert("cyber landing HTML still omits product name", !/SignalTerrain/.test(cyberLanding));
assert("cyber models file still exists", fs.existsSync(path.join(ROOT, "apps/signalterrain/js/signalterrain-models.js")));
assert("cyber wds runtime still exists", fs.existsSync(path.join(ROOT, "design-system/js/signalterrain/wds-signalterrain-cyber.js")));
assert("cyber package still exists", fs.existsSync(path.join(ROOT, "design-system/signalterrain/index.json")));

const shedsIndex = read("apps/shed-hunting/index.html");
assert("Sheds overview file still exists (untouched check: readable)", /noindex/i.test(shedsIndex));
assert(
  "summit-signal tree does not live under sheds",
  fs.existsSync(path.join(ROOT, "apps/summit-signal/index.html")) &&
    !fs.existsSync(path.join(ROOT, "apps/shed-hunting/summit-signal/index.html"))
);
const shedsMap = read("apps/shed-hunting/js/sheds-map-app.js");
assert("Sheds map app still present and not rewritten as SignalTerrain", /locateUser/.test(shedsMap) && !/SignalTerrainSota/.test(shedsMap));

["ss-maidenhead.js", "ss-geo.js", "ss-summit-model.js", "ss-planning-provider.js", "ss-sota-provider.js", "ss-map-app.js"].forEach(
  (file) => {
    const src = read("apps/summit-signal/js/" + file);
    assert(file + " is not empty", src.length > 200);
    assert(file + " does not load cyber ST", !/wds-signalterrain|design-system\/signalterrain/.test(src));
  }
);

if (failures.length) {
  console.error("\nSignalTerrain SOTA V0.1 tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.1 contract tests passed (" + passed + ").");
