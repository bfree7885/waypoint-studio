#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.5 — second W2/GC Activation Zone fixture (Hunter),
 * Slide regression, neighbour-snap-before-conflict, honest unsupported states.
 * Run: node automation/test-signalterrain-sota-v0-5.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const liveUrls = [];

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

function sandboxBase(fetchImpl) {
  const sandbox = {
    console,
    fetch: fetchImpl || null,
    sessionStorage: null,
    location: { search: "" },
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    Uint8Array
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  loadScript(sandbox, "apps/summit-signal/js/ss-geo.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-sota-rules.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-planning-provider.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-route-model.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-az-model.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-az-provider.js");
  return sandbox;
}

function fileFetch(root) {
  return async function (url) {
    const href = String(url);
    liveUrls.push(href);
    const rel = href.replace(/^\.\//, "");
    if (rel.startsWith("data/")) {
      const body = fs.readFileSync(path.join(root, "apps/summit-signal", rel), "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(body) };
    }
    throw new Error("unexpected live fetch " + href);
  };
}

const slide = {
  id: "W2/GC-001",
  name: "Slide Mountain",
  reference: "W2/GC-001",
  lat: 41.9991,
  lng: -74.3862,
  elevationM: 1277,
  points: 10
};
const hunter = {
  id: "W2/GC-002",
  name: "Hunter Mountain",
  reference: "W2/GC-002",
  lat: 42.1776,
  lng: -74.2307,
  elevationM: 1234,
  points: 10
};
const blackDome = {
  id: "W2/GC-003",
  name: "Black Dome",
  reference: "W2/GC-003",
  lat: 42.2701,
  lng: -74.1235,
  elevationM: 1216,
  points: 10
};
const parking = {
  kind: "parking",
  name: "Slide Mountain Parking Area",
  lat: 42.008684,
  lng: -74.427638,
  osmType: "way",
  osmId: 816358667
};

const sb = sandboxBase(fileFetch(ROOT));
const Rules = sb.SignalTerrainSotaRules;
const AzModel = sb.SignalTerrainSotaAzModel;
const Az = sb.SignalTerrainSotaAz;
const RouteModel = sb.SignalTerrainSotaRouteModel;

assert("rules still 25 m default", Rules.GENERAL_RULES.defaultVerticalDistanceM === 25);
assert("Hunter W2 uses 25 m", Rules.ruleForSummit(hunter).verticalDistanceM === 25);
assert("Hunter threshold is SOTA minus 25", Rules.thresholdM(1234, Rules.ruleForSummit(hunter)) === 1209);

const slideDem = JSON.parse(read("apps/summit-signal/data/st-sota-az-dem-w2-gc-001.json"));
const hunterDem = JSON.parse(read("apps/summit-signal/data/st-sota-az-dem-w2-gc-002.json"));

assert(
  "Slide fixture not regenerated",
  slideDem.source.summitId === "W2/GC-001" &&
    slideDem.summit.altM === 1277 &&
    slideDem.grid.rows === 51 &&
    slideDem.grid.cols === 51 &&
    slideDem.source.retrievedAt === "2026-09-04T22:24:35.604Z"
);
assert(
  "Hunter fixture labeled 3DEP",
  hunterDem.source.developmentFixture === true &&
    hunterDem.source.provider === "usgs-3dep" &&
    hunterDem.source.interpolation === "bilinear" &&
    hunterDem.source.summitId === "W2/GC-002" &&
    hunterDem.resolutionM === 1
);
assert(
  "Hunter fixture uses catalogue coordinate and elevation",
  hunterDem.summit.id === "W2/GC-002" &&
    hunterDem.summit.lat === 42.1776 &&
    hunterDem.summit.lng === -74.2307 &&
    hunterDem.summit.altM === 1234
);
assert(
  "Hunter grid is 10 m analysis over an 1800 m box",
  hunterDem.grid.rows === 181 &&
    hunterDem.grid.cols === 181 &&
    hunterDem.grid.cellSizeM === 10 &&
    hunterDem.grid.halfExtentM === 900 &&
    hunterDem.elevations.length === 181 * 181 &&
    hunterDem.stats.missing === 0
);

const slideAz = AzModel.computeAz(slide, slideDem);
assert("Slide AZ still ok", slideAz.status === "ok", slideAz.status + " " + slideAz.reason);
assert("Slide threshold still 1252", slideAz.thresholdM === 1252);
assert("Slide still uses SOTA 1277 m", slideAz.summitElevationUsedM === 1277 && slideAz.summitElevationSource === "sota-catalogue");
assert("Slide still 568 connected cells", slideAz.cellCount === 568, String(slideAz.cellCount));
assert("Slide still not edge-clipped", slideAz.edgeClipped === false);
assert("Slide still not a radius", slideAz.notARadius === true && slideAz.geometry && slideAz.geometry.type === "Polygon");

const routeFix = JSON.parse(read("apps/summit-signal/data/st-sota-route-w2-gc-001-slide-parking.json"));
const route = RouteModel.normalizeValhalla(routeFix, {
  start: RouteModel.startFromAccess(parking),
  destination: RouteModel.destinationForSummit(slide),
  access: RouteModel.startFromAccess(parking)
});
assert("Slide route distance still 5.754 km", Math.abs(route.distanceKm - 5.754) < 0.001, String(route.distanceKm));
const slideRel = AzModel.relateRoute(slideAz, route);
assert("Slide route still enters AZ", slideRel.enters === true);
assert(
  "Slide first AZ entry still 5.551 km",
  slideRel.distanceToEntryKm != null && Math.abs(slideRel.distanceToEntryKm - 5.551) < 0.001,
  String(slideRel.distanceToEntryKm)
);

const hunterAz = AzModel.computeAz(hunter, hunterDem);
assert("Hunter AZ ok from existing engine", hunterAz.status === "ok", hunterAz.status + " " + hunterAz.reason);
assert("Hunter threshold 1209", hunterAz.thresholdM === 1209);
assert("Hunter uses SOTA catalogue elevation", hunterAz.summitElevationUsedM === 1234 && hunterAz.summitElevationSource === "sota-catalogue");
assert("Hunter AZ is a polygon not a circle", hunterAz.geometry && hunterAz.geometry.type === "Polygon" && hunterAz.notARadius === true);
assert("Hunter AZ connected to seed", hunterAz.cellCount === 1587 && hunterAz.seed && hunterAz.seed.r === 90 && hunterAz.seed.c === 90, JSON.stringify({ cells: hunterAz.cellCount, seed: hunterAz.seed }));
assert("Hunter AZ not edge-clipped", hunterAz.edgeClipped === false);
assert("Hunter summit inside AZ", AzModel.pointInAz(hunterAz, hunter.lat, hunter.lng) === true);
assert("Hunter far point outside AZ", AzModel.pointInAz(hunterAz, 42.16, -74.25) === false);
assert(
  "Hunter AZ is elongated terrain not a 25 m radius",
  hunterAz.cellCount > 400 && hunterAz.latlngs && hunterAz.latlngs.length > 50,
  String(hunterAz.cellCount) + " verts " + (hunterAz.latlngs && hunterAz.latlngs.length)
);
assert(
  "Hunter DEM discrepancy does not rewrite SOTA",
  hunterAz.elevationDiscrepancyM != null &&
    Math.abs(hunterAz.elevationDiscrepancyM) > 5 &&
    hunterAz.summitElevationUsedM === 1234 &&
    /SOTA record is not altered/i.test(hunterAz.reason || "")
);
const hunterNear = AzModel.nearestCell(hunterDem.grid, hunter.lat, hunter.lng);
assert(
  "Hunter did not need neighbour snap",
  hunterNear.r === hunterAz.seed.r && hunterNear.c === hunterAz.seed.c,
  JSON.stringify({ nearest: hunterNear, seed: hunterAz.seed })
);
assert("Hunter DEM max is below SOTA catalogue", hunterDem.stats.maxM < 1234 && hunterDem.stats.maxM > 1209);

const origin = { lat: 42, lng: -74 };
const offThreshold = AzModel.makeSyntheticGrid({
  rows: 11,
  cols: 11,
  cellSizeM: 10,
  origin,
  fn: function (r, c) {
    if (r === 5 && c === 5) return 1000;
    if (Math.abs(r - 5) <= 1 && Math.abs(c - 5) <= 1) return 980;
    return 970;
  }
});
const offThresholdSummit = {
  id: "T-OFF",
  lat: AzModel.cellLat(offThreshold.grid, 5),
  lng: AzModel.cellLng(offThreshold.grid, 7),
  elevationM: 1000,
  reference: "W2/GC-906"
};
const offThAz = AzModel.computeAz(offThresholdSummit, offThreshold);
assert(
  "neighbour-snap-before-conflict still functional",
  offThAz.status === "ok" && offThAz.cellCount >= 1 && offThAz.seed && offThAz.seed.r === 5 && Math.abs(offThAz.seed.c - 5) <= 1,
  JSON.stringify({ status: offThAz.status, reason: offThAz.reason, cells: offThAz.cellCount, seed: offThAz.seed })
);

const conflictDem = AzModel.makeSyntheticGrid({
  rows: 11,
  cols: 11,
  cellSizeM: 10,
  origin,
  fn: function () {
    return 800;
  }
});
const conf = AzModel.computeAz({ id: "C", lat: 42, lng: -74, elevationM: 1000, reference: "W2/GC-903" }, conflictDem);
assert("elevation-conflict still after neighbour search", conf.status === "elevation-conflict" || conf.status === "calculation-failed", conf.status);

Az.clearCache();
liveUrls.length = 0;
const loadedSlide = await Az.loadActivationZone(slide, { live: false });
assert("provider still loads Slide fixture", loadedSlide.status === "ok" && loadedSlide.cellCount === 568);
const loadedHunter = await Az.loadActivationZone(hunter, { live: false });
assert("provider loads Hunter fixture", loadedHunter.status === "ok" && loadedHunter.cellCount === 1587 && loadedHunter.thresholdM === 1209);
assert(
  "provider fixture fetches stay local",
  liveUrls.every((u) => u.startsWith("data/")),
  liveUrls.join(",")
);

const other = await Az.loadActivationZone(blackDome, { live: false });
assert("W2 without fixture is unsupported-region", other.status === "unsupported-region", other.status);
assert("unsupported is not a radius", other.geometry == null && other.cellCount === 0);

const nonW2 = await Az.loadActivationZone({ id: "W6/CT-001", lat: 34.1, lng: -118.1, elevationM: 1500, reference: "W6/CT-001" }, { live: false });
assert("non-W2 without fixture remains unsupported-region", nonW2.status === "unsupported-region", nonW2.status);

const liveBlocked = await Az.loadActivationZone(blackDome, { live: true });
assert("live 3DEP path is attempted not fabricated", liveBlocked.status === "dem-unavailable", liveBlocked.status);
assert(
  "live attempt used 3DEP samples URL",
  liveUrls.some((u) => /elevation\.nationalmap\.gov/.test(u)),
  liveUrls.filter((u) => !u.startsWith("data/")).join(",")
);

const html = read("apps/summit-signal/index.html");
assert("kicker is V0.5+", /V0\.[56] · SOTA/.test(html));
assert("unpublished", /noindex/i.test(html));
assert("html does not load Sheds or cyber ST", !/shed-hunting|wds-signalterrain|design-system\/signalterrain/.test(html));
assert("Hunter fixture is wired", /st-sota-az-dem-w2-gc-002\.json/.test(read("apps/summit-signal/js/ss-az-provider.js")));
assert("no radius circle AZ in map app", !/L\.circle\(|setRadius/.test(read("apps/summit-signal/js/ss-map-app.js")));

const docs = read("docs/signal-terrain/V0.5.md");
assert("V0.5 docs exist", /Hunter Mountain/.test(docs) && /1209/.test(docs) && /unpublished/i.test(docs));
assert("V0.5 docs not a radius", /not a radius/i.test(docs));
assert("cyber vision not overwritten", /Understand the world's signals/.test(read("docs/SIGNALTERRAIN-VISION.md")));
assert("homepage omits SignalTerrain", !/SignalTerrain/.test(read("index.html")));
assert("Sheds untouched by V0.5 fixture", !/st-sota-az-dem-w2-gc-002/.test(read("apps/shed-hunting/js/sheds-map-app.js")));

assert(
  "CI recorded no unexpected live hosts besides the blocked live-opt-in probe",
  liveUrls.filter((u) => !u.startsWith("data/") && !/elevation\.nationalmap\.gov/.test(u)).length === 0,
  liveUrls.join("\n")
);

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.5 contract tests passed (" + passed + ").");
