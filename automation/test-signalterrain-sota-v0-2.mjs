#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.2 — OSM access model, provider, honesty, isolation.
 * Run: node automation/test-signalterrain-sota-v0-2.mjs
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

function loadScript(sandbox, rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

function sandboxBase() {
  const sandbox = { console, fetch: null, sessionStorage: null, location: { search: "" } };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  loadScript(sandbox, "apps/summit-signal/js/ss-geo.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-access-model.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-planning-provider.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-access-provider.js");
  return sandbox;
}

const slide = { id: "W2/GC-001", name: "Slide Mountain", reference: "W2/GC-001", lat: 41.9991, lng: -74.3862 };
const hunter = { id: "W2/GC-002", name: "Hunter Mountain", reference: "W2/GC-002", lat: 42.1778, lng: -74.2306 };

const sb = sandboxBase();
const Model = sb.SignalTerrainSotaAccessModel;
const Access = sb.SignalTerrainSotaAccess;
const Planning = sb.SignalTerrainSotaPlanning;

assert("access model loads", !!Model && typeof Model.normalizeFixture === "function");
assert("access provider loads", !!Access && typeof Access.loadAccess === "function");
assert("radius is 5000 m", Model.DEFAULT_RADIUS_M === 5000);
assert("query version collision-safe", Model.QUERY_VERSION === "signalterrain-sota-access-v0");
assert("no SummitSignal global", sb.SummitSignal == null);
assert("no WDS signalterrain", !(sb.WDS && sb.WDS.signalterrain));

const fixture = JSON.parse(read("apps/summit-signal/data/st-sota-access-w2-gc-001.json"));
assert("fixture labeled developmentFixture", fixture.source && fixture.source.developmentFixture === true);
assert("fixture is OSM Overpass", /overpass/.test(fixture.source.provider) && fixture.source.license === "ODbL 1.0");
assert("fixture is Slide", fixture.source.summitId === "W2/GC-001");
assert("fixture radius 5000", fixture.source.radiusM === 5000);
assert("fixture has real trails", fixture.elements.trails.length >= 20);
assert("fixture has parking", fixture.elements.parking.length >= 1);
assert("Slide Parking Area present", fixture.elements.parking.some((p) => p.name === "Slide Mountain Parking Area"));
assert("Wittenberg trail present", fixture.elements.trails.some((t) => t.name === "Wittenberg - Cornell - Slide Trail"));
assert("no invented AllTrails names", !JSON.stringify(fixture).includes("AllTrails"));

const catalog = Model.normalizeFixture(fixture, slide);
assert("normalize ok", catalog.status === "ok");
assert("trails parsed", catalog.trails.length >= 20 && catalog.trails.every((t) => t.geometry && t.geometry.length >= 2));
assert("trail provenance", catalog.trails.every((t) => t.source === "openstreetmap" && t.provenanceUrl && /openstreetmap.org/.test(t.provenanceUrl)));
assert("trails omit fragment distances", catalog.trails.every((t) => t.distanceLabel == null));
assert("parking parsed", catalog.parking.length >= 1);
assert("parking distances labeled straight-line", catalog.parking.every((p) => p.distanceLabel && /straight-line/.test(p.distanceLabel)));
assert("unnamed parking keeps null name", catalog.parking.some((p) => p.name == null));
assert("trailhead from parking name", catalog.trailheads.some((t) => t.name === "Giant Ledge Trailhead"));
assert("named hiking routes tags-only", catalog.namedHikingRoutes.some((r) => r.name === "Wittenberg - Cornell - Slide Trail" && r.geometry == null));
assert("does not connect routes", catalog.trails.every((t) => t.kind === "trail"));

const missingName = Model.normalizeOverpass(
  {
    elements: [
      {
        type: "way",
        id: 1,
        tags: { highway: "path" },
        geometry: [
          { lat: 42, lon: -74.4 },
          { lat: 42.001, lon: -74.401 }
        ]
      }
    ]
  },
  slide,
  { radiusM: 5000, lat: slide.lat, lng: slide.lng, summitId: slide.id }
);
assert("missing trail name stays null", missingName.trails.length === 1 && missingName.trails[0].name == null);

const empty = Model.normalizeOverpass({ elements: [] }, slide, { radiusM: 5000, summitId: slide.id });
assert("empty successful retrieval", empty.status === "empty");
assert("empty is not unavailable", empty.status !== "unavailable");
assert("empty reason does not claim no trail exists", !/no trail exists/i.test(empty.reason || ""));

const bad = Model.normalizeOverpass(null, slide, { summitId: slide.id });
assert("malformed is unavailable", bad.status === "unavailable");
const bad2 = Model.normalizeOverpass({ not: "elements" }, slide, { summitId: slide.id });
assert("missing elements array is unavailable", bad2.status === "unavailable");

const dropBadGeom = Model.normalizeOverpass(
  {
    elements: [
      { type: "way", id: 9, tags: { highway: "path" }, geometry: [{ lat: 1, lon: 2 }] },
      { type: "node", id: 8, tags: { amenity: "parking" } },
      {
        type: "way",
        id: 7,
        tags: { highway: "footway", name: "Good Path" },
        geometry: [
          { lat: 41.99, lon: -74.38 },
          { lat: 42.0, lon: -74.39 }
        ]
      }
    ]
  },
  slide,
  { radiusM: 5000, summitId: slide.id }
);
assert("malformed members dropped not fatal", dropBadGeom.status === "ok" && dropBadGeom.trails.length === 1 && dropBadGeom.trails[0].name === "Good Path");

const planNone = Planning.getPlanning(slide);
assert("planning without access stays not-integrated", planNone.status === "not-integrated");
assert("route still not-integrated", planNone.items.hikingRoute.status === "not-integrated");

const planOk = Planning.getPlanning(slide, catalog);
assert("planning with access is ok", planOk.status === "ok");
assert("trailheads ok", planOk.trailheads.status === "ok");
assert("parking ok", planOk.parking.status === "ok");
assert(
  "does not claim a recommended trail",
  !/Best parking|Official trailhead|Shortest route/.test(planOk.access.display + planOk.parking.display + planOk.trailheads.display)
);
assert("later fields remain not-integrated", planOk.items.distance.status === "not-integrated" && planOk.items.activationZone.status === "not-integrated");
assert("straight-line on parking items", planOk.parking.features.some((f) => /straight-line/.test(f.distanceLabel)));

const planEmpty = Planning.getPlanning(slide, empty);
assert("planning empty distinct", planEmpty.status === "empty" && /No mapped/.test(planEmpty.parking.display));

const planFail = Planning.getPlanning(slide, Model.emptyCatalog({ summitId: slide.id }, "unavailable", "OpenStreetMap data unavailable"));
assert("planning unavailable distinct", planFail.status === "unavailable" && /unavailable/i.test(planFail.parking.display));

const session = {};
sb.sessionStorage = {
  getItem: (k) => (k in session ? session[k] : null),
  setItem: (k, v) => {
    session[k] = String(v);
  },
  removeItem: (k) => {
    delete session[k];
  }
};

let fetchUrls = [];
sb.fetch = async (url) => {
  fetchUrls.push(String(url));
  if (String(url).indexOf("st-sota-access-w2-gc-001.json") !== -1) {
    return { ok: true, json: async () => fixture };
  }
  throw new Error("unexpected fetch " + url);
};
Access.clearCache();
const loaded = await Access.loadAccess(slide, { live: false, fixtureUrl: "data/st-sota-access-w2-gc-001.json" });
assert("provider loads Slide fixture", loaded.status === "ok" && loaded.parking.some((p) => p.name === "Slide Mountain Parking Area"));
assert("provider meta fixture", loaded.meta.mode === "fixture" && loaded.meta.liveAttempted === false);

fetchUrls = [];
const cached = await Access.loadAccess(slide, { live: false, fixtureUrl: "data/st-sota-access-w2-gc-001.json" });
assert("memory cache avoids refetch", fetchUrls.length === 0 && cached.parking.length === loaded.parking.length);

Access.clearCache();
const hunterLoaded = await Access.loadAccess(hunter, { live: false, fixtureUrl: "data/st-sota-access-w2-gc-001.json" });
assert("other summit without live is unavailable not empty", hunterLoaded.status === "unavailable");
assert("other summit reason is honest", /no labeled/i.test(hunterLoaded.reason || ""));

sb.fetch = async (url) => {
  if (String(url).indexOf("overpass") !== -1) throw new Error("Overpass timeout");
  if (String(url).indexOf("st-sota-access-w2-gc-001.json") !== -1) {
    return { ok: true, json: async () => fixture };
  }
  throw new Error("unexpected fetch " + url);
};
Access.clearCache();
const fallback = await Access.loadAccess(slide, { live: true, fixtureUrl: "data/st-sota-access-w2-gc-001.json", force: true });
assert("live failure falls back to Slide fixture", fallback.status === "ok" && fallback.meta.liveAttempted === true && /Overpass/.test(fallback.meta.liveError || ""));

sb.fetch = async () => {
  throw new Error("network down");
};
Access.clearCache();
const failHunter = await Access.loadAccess(hunter, { live: true, fixtureUrl: "data/st-sota-access-w2-gc-001.json", force: true });
assert("live+fixture miss is unavailable", failHunter.status === "unavailable");

const html = read("apps/summit-signal/index.html");
assert("html loads access modules", /ss-access-model\.js/.test(html) && /ss-access-provider\.js/.test(html));
assert("html does not load Sheds or cyber ST", !/shed-hunting|wds-signalterrain|design-system\/signalterrain/.test(html));
assert("layer toggles present", /data-layer="summits"/.test(html) && /data-layer="trails"/.test(html) && /data-layer="parking"/.test(html));
assert("OSM attribution in html", /OpenStreetMap/.test(html) && /ODbL/.test(html));
assert("kicker is V0.2+", /V0\.[2-7] · SOTA/.test(html));
assert("unpublished", /noindex/i.test(html));

const appJs = read("apps/summit-signal/js/ss-map-app.js");
assert("select triggers access load", /function loadAccessForSummit/.test(appJs) && /selectSummit/.test(appJs));
assert("access failure does not throw SOTA UI", /catch/.test(appJs) && /renderDetail/.test(appJs));
assert("layers independent", /setLayerVisible/.test(appJs));
assert("desktop layers stay left of the sheet", !/@media \(min-width: 720px\)[\s\S]*\.ss-layers[\s\S]*right:\s*12px/.test(read("apps/summit-signal/css/summit-signal.css")));
assert("map still independent of Sheds", !/WaypointSheds|sheds-map-app/.test(appJs));

const docs = read("docs/signal-terrain/V0.2.md");
assert("docs exist", /V0\.2/.test(docs) && /OpenStreetMap/.test(docs));
assert("docs candidate statement", /candidate access information derived from OpenStreetMap/.test(docs));
assert("docs ODbL", /ODbL/.test(docs));
assert("docs radius", /5000/.test(docs));
assert("docs Slide acceptance", /W2\/GC-001/.test(docs));
assert("cyber vision not overwritten", /Understand the world's signals/.test(read("docs/SIGNALTERRAIN-VISION.md")));
assert("robots still disallows summit-signal", /Disallow: \/apps\/summit-signal\//.test(read("robots.txt")));
assert("homepage omits SignalTerrain", !/SignalTerrain/.test(read("index.html")));
assert("cyber redirect intact", /location\.replace/.test(read("apps/signalterrain/index.html")));
assert("Sheds map untouched by access globals", !/SignalTerrainSotaAccess/.test(read("apps/shed-hunting/js/sheds-map-app.js")));

if (failures.length) {
  console.error("\nSignalTerrain SOTA V0.2 tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.2 contract tests passed (" + passed + ").");
