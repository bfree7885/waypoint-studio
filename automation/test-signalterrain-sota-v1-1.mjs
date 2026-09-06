#!/usr/bin/env node
/**
 * SignalTerrain SOTA V1.1 — geographic summit coverage.
 * Deterministic. No live SOTA / network catalogue calls.
 * Run: node automation/test-signalterrain-sota-v1-1.mjs
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

function packPayload(id, regionCode, regionName, summits, extraSource) {
  return {
    source: Object.assign(
      {
        provider: "test-pack",
        url: "memory:" + id,
        retrievedAt: "2026-09-06T00:00:00Z",
        developmentFixture: true,
        packId: id,
        label: regionName + " (" + id + ")"
      },
      extraSource || {}
    ),
    region: {
      associationCode: "W2",
      associationName: "USA - NJ / NY",
      regionCode: regionCode,
      regionName: regionName
    },
    summits: summits
  };
}

function summitRecord(code, name, lat, lng, extras) {
  return Object.assign(
    {
      summitCode: code,
      name: name,
      associationCode: "W2",
      associationName: "USA - NJ / NY",
      regionCode: code.split("/")[1].split("-")[0],
      regionName: "Test",
      latitude: lat,
      longitude: lng,
      points: 4,
      altM: 500,
      altFt: 1640,
      retrievedFrom: "memory-test",
      retrievedAt: "2026-09-06T00:00:00Z"
    },
    extras || {}
  );
}

const sandbox = { console, fetch: null, sessionStorage: null, location: { search: "" } };
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
loadScript(sandbox, "apps/summit-signal/js/ss-maidenhead.js");
loadScript(sandbox, "apps/summit-signal/js/ss-summit-model.js");
loadScript(sandbox, "apps/summit-signal/js/ss-sota-provider.js");

const Model = sandbox.SignalTerrainSotaModel;
const Sota = sandbox.SignalTerrainSotaProvider;
const fixture = JSON.parse(read("apps/summit-signal/data/ss-summits-w2-gc.json"));
const manifest = JSON.parse(read("apps/summit-signal/data/ss-summit-catalogue.json"));
const w2gcCheck = Model.validatePack(fixture);
const catalog = Model.normalizeCatalog(fixture);

assert("model exports merge/validate/coverage", !!(Model.mergeCatalogs && Model.validatePack && Model.viewportCoverageState));
assert("W2/GC pack validates", w2gcCheck.ok === true, JSON.stringify(w2gcCheck.errors));
assert("manifest lists W2/GC only", Array.isArray(manifest.packs) && manifest.packs.length === 1 && manifest.packs[0].id === "W2-GC");
assert("manifest forbids live catalogue expansion", /Do not call the SOTA API/i.test(manifest.permissionNote || ""));
assert("manifest coverage honesty", /Visible map area and loaded summit catalogue are not assumed to be the same thing/.test(manifest.coverageNote || ""));

const slide = Model.findById(catalog.summits, "W2/GC-001");
const hunter = Model.findById(catalog.summits, "W2/GC-002");
assert("Slide regression identity", !!(slide && slide.name === "Slide Mountain" && slide.reference === "W2/GC-001"));
assert("Slide regression coords/elev/points", slide.lat === 41.9991 && slide.lng === -74.3862 && slide.elevationM === 1277 && slide.points === 10);
assert("Hunter regression identity", !!(hunter && hunter.name === "Hunter Mountain" && hunter.reference === "W2/GC-002"));
assert("Hunter regression coords", hunter.lat === 42.1776 && hunter.lng === -74.2307);
assert("Slide provenance retained", !!(slide.provenance && slide.provenance.packId && slide.provenance.retrievedAt && slide.provenance.regionCode === "GC"));

const highPointB = Model.findById(catalog.summits, "W2/GC-015");
assert("High Point B remains Catskills record", !!(highPointB && highPointB.name === "High Point B" && highPointB.lat === 41.9246));

const HIGH_POINT_SP = { lat: 41.3209, lng: -74.6616, note: "High Point State Park / High Point Monument NJ — geographic park location only, not a SOTA record" };
const MILFORD = { lat: 41.3226, lng: -74.8024, note: "Milford PA approximate — geographic planning location only" };

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const nearHp = catalog.summits
  .map((s) => ({ s, km: haversineKm(HIGH_POINT_SP, s) }))
  .filter((row) => row.km < 5);
assert(
  "High Point NJ SOTA record is not in the permissible catalogue",
  nearHp.length === 0,
  JSON.stringify(nearHp.map((row) => ({ ref: row.s.reference, name: row.s.name, km: row.km })))
);
const hpNameHits = Model.searchSummits(catalog.summits, "High Point State Park", null);
assert("High Point State Park search miss in loaded catalogue", hpNameHits.length === 0);
assert("search miss copy constant", Model.SEARCH_MISS === "Not found in current summit catalogue");

const hull = Model.convexHull(catalog.summits);
assert("coverage hull is not the axis-aligned envelope", hull.length >= 3);
assert("Slide is inside loaded coverage hull", Model.pointInConvexHull(slide.lat, slide.lng, hull));
assert("Hunter is inside loaded coverage hull", Model.pointInConvexHull(hunter.lat, hunter.lng, hull));
assert("High Point SP is outside loaded coverage hull", Model.pointInConvexHull(HIGH_POINT_SP.lat, HIGH_POINT_SP.lng, hull) === false);
assert("Milford PA is outside loaded coverage hull", Model.pointInConvexHull(MILFORD.lat, MILFORD.lng, hull) === false);

const hpBounds = {
  minLat: HIGH_POINT_SP.lat - 0.04,
  maxLat: HIGH_POINT_SP.lat + 0.04,
  minLng: HIGH_POINT_SP.lng - 0.04,
  maxLng: HIGH_POINT_SP.lng + 0.04
};
const milfordBounds = {
  minLat: MILFORD.lat - 0.04,
  maxLat: MILFORD.lat + 0.04,
  minLng: MILFORD.lng - 0.04,
  maxLng: MILFORD.lng + 0.04
};
const slideBounds = {
  minLat: slide.lat - 0.08,
  maxLat: slide.lat + 0.08,
  minLng: slide.lng - 0.08,
  maxLng: slide.lng + 0.08
};
const worldish = { minLat: 38, maxLat: 45, minLng: -80, maxLng: -70 };

const hpState = Model.viewportCoverageState(hpBounds, catalog.summits, hull);
const milfordState = Model.viewportCoverageState(milfordBounds, catalog.summits, hull);
const slideState = Model.viewportCoverageState(slideBounds, catalog.summits, hull);
const wideState = Model.viewportCoverageState(worldish, catalog.summits, hull);

assert("High Point viewport is outside coverage", hpState.state === "outside" && /not loaded for this area/i.test(hpState.message || ""));
assert("Milford viewport is outside coverage", milfordState.state === "outside");
assert("Milford visible summit count is 0", milfordState.visibleCount === 0);
assert("Slide viewport has visible summits", slideState.visibleCount >= 1 && slideState.state !== "outside");
assert("wide viewport reports incomplete coverage", wideState.state === "partial" && /outside the loaded summit catalogue/i.test(wideState.message || ""));
assert(
  "viewport filter returns Slide in Slide bounds",
  Model.summitsInBounds(catalog.summits, slideBounds).some((s) => s.reference === "W2/GC-001")
);
assert("viewport filter empty at High Point SP", Model.summitsInBounds(catalog.summits, hpBounds).length === 0);

const described = Model.describeCatalogue(catalog);
assert("coverage status names the loaded pack", /Greater Catskills/.test(described) && /W2\/GC/.test(described));
assert("coverage status uses loaded count", /118 summits loaded/.test(described));
assert("coverage status does not claim all SOTA", !/all SOTA/i.test(described));
assert(
  "old single-region status line is not the catalogue description",
  described.indexOf("118 summits · Development fixture") === -1
);

const second = packPayload("W2-XX", "XX", "Test Neighbor", [
  summitRecord("W2/XX-001", "Ridge Test", 41.4, -74.5, { regionCode: "XX", regionName: "Test Neighbor" }),
  summitRecord("W2/XX-002", "Lake Test", 41.45, -74.55, { regionCode: "XX", regionName: "Test Neighbor" })
]);
const merged = Model.mergeCatalogs([fixture, second], {
  id: "test-multi",
  version: "1.1",
  label: "test",
  coverageNote: "Visible map area and loaded summit catalogue are not assumed to be the same thing."
});
assert("multi-pack merge count", merged.summits.length === 120, String(merged.summits.length));
assert("multi-pack retains Slide", !!Model.findById(merged.summits, "W2/GC-001"));
assert("multi-pack retains Hunter", !!Model.findById(merged.summits, "W2/GC-002"));
assert("multi-pack includes neighbor", !!Model.findById(merged.summits, "W2/XX-001"));
assert("multi-pack provenance kept", merged.packs.length === 2 && merged.summits.every((s) => s.provenance && s.provenance.packId));
assert("multi-pack search by name across packs", Model.searchSummits(merged.summits, "Ridge Test", null).some((s) => s.reference === "W2/XX-001"));
assert("multi-pack search by ref across packs", Model.searchSummits(merged.summits, "w2/xx-002", null).length === 1);
assert("multi-pack search by region", Model.searchSummits(merged.summits, "Greater Catskills", null).some((s) => s.reference === "W2/GC-001"));
assert("multi-pack search still finds Slide", Model.searchSummits(merged.summits, "slide", null).some((s) => s.reference === "W2/GC-001"));
assert("describe multi-pack", /2 regional packs/.test(Model.describeCatalogue(merged)));

const overlap = packPayload("W2-YY", "YY", "Overlap", [
  summitRecord("W2/GC-001", "Slide Mountain", 41.9991, -74.3862, { regionCode: "GC", regionName: "Greater Catskills" })
]);
const deduped = Model.mergeCatalogs([fixture, overlap], { id: "dedupe-test" });
assert("dedupe by SOTA reference", deduped.summits.length === 118 && deduped.deduped === 1);
assert("deduped Slide identity unchanged", Model.findById(deduped.summits, "W2/GC-001").name === "Slide Mountain");

const conflict = packPayload("W2-ZZ", "ZZ", "Conflict", [
  summitRecord("W2/GC-001", "Slide Mountain", 40.0, -74.0, { regionCode: "ZZ", regionName: "Conflict" })
]);
let conflictErr = null;
try {
  Model.mergeCatalogs([fixture, conflict], { id: "conflict-test" });
} catch (e) {
  conflictErr = e;
}
assert("conflicting duplicate SOTA ref is rejected", !!(conflictErr && /Conflicting duplicate SOTA reference W2\/GC-001/.test(String(conflictErr.message))));

const dupWithin = JSON.parse(JSON.stringify(second));
dupWithin.summits.push(summitRecord("W2/XX-001", "Ridge Test Copy", 41.41, -74.51, { regionCode: "XX", regionName: "Test Neighbor" }));
const dupCheck = Model.validatePack(dupWithin);
assert("duplicate SOTA reference within pack is rejected", dupCheck.ok === false && dupCheck.errors.some((e) => /Duplicate SOTA reference W2\/XX-001/.test(e)));

const badCoords = packPayload("W2-BAD", "BAD", "Bad", [
  summitRecord("W2/BAD-001", "Nowhere", 999, 0, { regionCode: "BAD", regionName: "Bad" })
]);
assert("malformed coordinates rejected", Model.validatePack(badCoords).ok === false);

const noProvenance = packPayload("W2-NP", "NP", "No Provenance", [
  summitRecord("W2/NP-001", "Peak", 41.5, -74.5, { regionCode: "NP", regionName: "No Provenance" })
]);
delete noProvenance.source.retrievedAt;
delete noProvenance.source.provider;
delete noProvenance.source.url;
assert("missing provenance rejected", Model.validatePack(noProvenance).ok === false);

const noAssoc = packPayload("W2-NA", "NA", "No Assoc", [
  summitRecord("W2/NA-001", "Peak", 41.5, -74.5, { regionCode: "NA", regionName: "No Assoc", associationCode: "" })
]);
noAssoc.region.associationCode = "";
noAssoc.summits[0].associationCode = "";
assert("missing association rejected", Model.validatePack(noAssoc).ok === false);

let mergeBad = null;
try {
  Model.mergeCatalogs([badCoords], { id: "bad-merge" });
} catch (e) {
  mergeBad = e;
}
assert("merge rejects malformed pack", !!(mergeBad && mergeBad.validationErrors && mergeBad.validationErrors.length));

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
let fetched = [];
sandbox.fetch = async (url) => {
  fetched.push(String(url));
  if (String(url).indexOf("api2.sota.org.uk") !== -1) {
    throw new Error("CI must not call live SOTA");
  }
  if (String(url).indexOf("ss-summit-catalogue.json") !== -1) {
    return { ok: true, json: async () => manifest };
  }
  if (String(url).indexOf("ss-summits-w2-gc.json") !== -1) {
    return { ok: true, json: async () => fixture };
  }
  throw new Error("unexpected fetch " + url);
};
Sota.clearCache();
const loaded = await Sota.loadCatalog({ live: false, force: true });
assert("provider loads catalogue manifest", loaded.summits.length === 118 && loaded.packs.length === 1, JSON.stringify({ n: loaded.summits.length, packs: loaded.packs && loaded.packs.map((p) => p.id) }));
assert("provider mode is fixture", loaded.meta.mode === "fixture" && loaded.meta.liveAttempted === false);
assert("provider did not call SOTA API", fetched.every((u) => u.indexOf("api2.sota.org.uk") === -1), fetched.join(","));
assert("provider cache key v1.1", Object.keys(session).some((k) => k.indexOf("signalterrain-sota-catalog-v1-1") === 0));

const appJs = read("apps/summit-signal/js/ss-map-app.js");
const html = read("apps/summit-signal/index.html");
const providerJs = read("apps/summit-signal/js/ss-sota-provider.js");
assert("UI has coverage badge", /id="ss-coverage"/.test(html) && /id="ss-coverage-label"/.test(html));
assert("search miss uses honest copy", /Not found in current summit catalogue/.test(appJs));
assert("map plots coverage hull", /plotCoverage/.test(appJs) && /ss-coverage-poly/.test(appJs));
assert("outside-coverage copy present", /Summit catalogue not loaded for this area/.test(appJs));
assert("partial coverage copy present", /Visible map includes area outside the loaded summit catalogue/.test(appJs));
assert("map does not add live SOTA region URLs", !/api\/regions\/W2\/(?!GC)/.test(providerJs));
assert("live remains W2/GC only", /api\/regions\/W2\/GC/.test(providerJs) && providerJs.indexOf("api/regions/W2/NJ") === -1);
assert("provider has no scrape", !/scrape/i.test(providerJs));
assert("kicker is V1.1", /V1\.1 · unlisted field-test/.test(html));
assert("docs V1.1 exist", fs.existsSync(path.join(ROOT, "docs/signal-terrain/V1.1.md")));

const docs = read("docs/signal-terrain/V1.1.md");
assert("docs state map ≠ catalogue", /Visible map area and loaded summit catalogue are not assumed to be the same thing/.test(docs));
assert("docs record High Point absence", /does not contain/i.test(docs) && /High Point/i.test(docs));
assert("docs no live SOTA in CI", /must not/i.test(docs) && /SOTA API/i.test(docs));
assert("cyber SignalTerrain untouched path still redirects", /location\.replace/.test(read("apps/signalterrain/index.html")));
assert("Sheds map untouched", !/ss-coverage-label|SignalTerrainSotaMapApp/.test(read("apps/shed-hunting/js/sheds-map-app.js")));
assert("Studio homepage omits SignalTerrain", !/SignalTerrain/.test(read("index.html")));

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V1.1 tests passed (" + passed + ").");
