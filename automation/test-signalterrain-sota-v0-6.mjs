#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.6 — Route to Activation Zone.
 * Run: node automation/test-signalterrain-sota-v0-6.mjs
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

function fileFetch() {
  return async function (url) {
    const href = String(url);
    liveUrls.push(href);
    const rel = href.replace(/^\.\//, "");
    if (rel.startsWith("data/")) {
      const body = fs.readFileSync(path.join(ROOT, "apps/summit-signal", rel), "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(body) };
    }
    throw new Error("unexpected live fetch " + href);
  };
}

function sandboxBase() {
  const sandbox = {
    console,
    fetch: fileFetch(),
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
  [
    "apps/summit-signal/js/ss-geo.js",
    "apps/summit-signal/js/ss-sota-rules.js",
    "apps/summit-signal/js/ss-planning-provider.js",
    "apps/summit-signal/js/ss-access-model.js",
    "apps/summit-signal/js/ss-access-provider.js",
    "apps/summit-signal/js/ss-route-model.js",
    "apps/summit-signal/js/ss-route-provider.js",
    "apps/summit-signal/js/ss-terrain-model.js",
    "apps/summit-signal/js/ss-terrain-provider.js",
    "apps/summit-signal/js/ss-az-model.js",
    "apps/summit-signal/js/ss-az-provider.js",
    "apps/summit-signal/js/ss-az-route-model.js",
    "apps/summit-signal/js/ss-az-route-provider.js"
  ].forEach(function (rel) {
    loadScript(sandbox, rel);
  });
  return sandbox;
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
const slidePark = {
  kind: "parking",
  name: "Slide Mountain Parking Area",
  lat: 42.008684,
  lng: -74.427638,
  osmType: "way",
  osmId: 816358667
};
const hunterPark = {
  kind: "parking",
  name: null,
  lat: 42.18190904,
  lng: -74.19689275,
  osmType: "way",
  osmId: 338567127
};

const sb = sandboxBase();
const Route = sb.SignalTerrainSotaRoute;
const RouteModel = sb.SignalTerrainSotaRouteModel;
const Az = sb.SignalTerrainSotaAz;
const AzModel = sb.SignalTerrainSotaAzModel;
const AzRoute = sb.SignalTerrainSotaAzRoute;
const AzRouteModel = sb.SignalTerrainSotaAzRouteModel;
const Terrain = sb.SignalTerrainSotaTerrain;
const TerrainModel = sb.SignalTerrainSotaTerrainModel;
const Access = sb.SignalTerrainSotaAccess;
const Planning = sb.SignalTerrainSotaPlanning;

assert("AZ-route model loaded", !!(AzRouteModel && AzRouteModel.deriveAzRoute));
assert("candidate method is valhalla intersection", AzRouteModel.CANDIDATE_METHOD === "valhalla-summit-route-az-intersection");
assert("criterion is shortest routed AZ entry", AzRouteModel.SELECTION_CRITERION === "shortest-routed-az-entry");
assert("selection label is not best-activation", AzRouteModel.SELECTION_LABEL === "Shortest routed AZ entry found");

const slideRoute = await Route.loadRoute(slide, slidePark, { live: false });
assert("summit mode preserved — Slide 5.754 km", slideRoute.status === "ok" && Math.abs(slideRoute.distanceKm - 5.754) < 0.001, String(slideRoute.distanceKm));
const slideAz = await Az.loadActivationZone(slide, { live: false });
assert("Slide AZ unchanged 568 cells", slideAz.status === "ok" && slideAz.cellCount === 568 && slideAz.thresholdM === 1252);
const slideRel = AzModel.relateRoute(slideAz, slideRoute);
assert(
  "Slide first AZ entry still 5.551 km",
  slideRel.enters === true && Math.abs(slideRel.distanceToEntryKm - 5.551) < 0.001,
  String(slideRel.distanceToEntryKm)
);

const slideAzr = await AzRoute.loadAzRoute(slide, slidePark, { summitRoute: slideRoute, az: slideAz, live: false });
assert("Slide Route-to-AZ ok", slideAzr.status === "ok", slideAzr.status + " " + slideAzr.reason);
assert("Slide candidate counts 2/2", slideAzr.candidateCountAttempted === 2 && slideAzr.candidateCountValid === 2, JSON.stringify({ a: slideAzr.candidateCountAttempted, v: slideAzr.candidateCountValid }));
assert("Slide AZ distance is first-entry prefix", Math.abs(slideAzr.distanceKm - 5.550883064967031) < 0.001, String(slideAzr.distanceKm));
assert("Slide AZ shorter than summit route", slideAzr.distanceKm < slideRoute.distanceKm);
assert(
  "Slide AZ entry coordinate",
  slideAzr.entry && Math.abs(slideAzr.entry.lat - 42.000411350585935) < 1e-6 && Math.abs(slideAzr.entry.lng - -74.38771091723633) < 1e-6,
  JSON.stringify(slideAzr.entry)
);
assert("Slide AZ route ends at entry", AzModel.pointInAz(slideAz, slideAzr.geometry[slideAzr.geometry.length - 1].lat, slideAzr.geometry[slideAzr.geometry.length - 1].lng));
assert("Slide AZ route enters AZ", AzModel.relateRoute(slideAz, slideAzr.route).enters === true);
assert("Slide no straight-line", slideAzr.straightLineUsed === false && slideAzr.provider === "valhalla");
assert("Slide destination mode az", slideAzr.destinationMode === "activation-zone");
assert("Slide AZ version identity", slideAzr.azCalculationVersion === "signalterrain-sota-az-v0" && slideAzr.azCellCount === 568);
assert("Slide criterion metadata", slideAzr.selectionCriterion === "shortest-routed-az-entry" && /Shortest routed AZ entry/.test(slideAzr.selectionLabel));
assert("Slide duration is estimated fraction", slideAzr.durationSource === "valhalla-pedestrian-distance-fraction" && /^~/.test(slideAzr.durationLabel || ""));

const slideElev = await Terrain.loadElevation(slideRoute, { live: false });
const slideAzElev = TerrainModel.clipProfile(slideElev, slideAzr.distanceKm);
assert("Slide AZ elev ok", slideAzElev.status === "ok" && slideAzElev.gainM > 400 && slideAzElev.clippedToKm != null);
assert("Slide AZ gain recomputed not scaled", Math.abs(slideAzElev.gainM - 513.1341756186001) < 0.01, String(slideAzElev.gainM));
assert("Slide AZ gain less than summit gain", slideAzElev.gainM < slideElev.gainM);

const hunterRoute = await Route.loadRoute(hunter, hunterPark, { live: false });
assert("Hunter Route-to-Summit ok", hunterRoute.status === "ok" && Math.abs(hunterRoute.distanceKm - 9.997) < 0.001, String(hunterRoute.distanceKm));
const hunterAz = await Az.loadActivationZone(hunter, { live: false });
assert("Hunter AZ unchanged 1587 cells", hunterAz.status === "ok" && hunterAz.cellCount === 1587 && hunterAz.thresholdM === 1209 && hunterAz.edgeClipped === false);
const hunterAzr = await AzRoute.loadAzRoute(hunter, hunterPark, { summitRoute: hunterRoute, az: hunterAz, live: false });
assert("Hunter Route-to-AZ ok", hunterAzr.status === "ok", hunterAzr.status + " " + hunterAzr.reason);
assert("Hunter candidate counts 2/2", hunterAzr.candidateCountAttempted === 2 && hunterAzr.candidateCountValid === 2, JSON.stringify({ a: hunterAzr.candidateCountAttempted, v: hunterAzr.candidateCountValid }));
assert("Hunter AZ distance prefix", Math.abs(hunterAzr.distanceKm - 9.768749991060266) < 0.001, String(hunterAzr.distanceKm));
assert("Hunter AZ not longer than summit", hunterAzr.distanceKm <= hunterRoute.distanceKm);
assert(
  "Hunter AZ entry coordinate",
  hunterAzr.entry && Math.abs(hunterAzr.entry.lat - 42.17908215576172) < 1e-6 && Math.abs(hunterAzr.entry.lng - -74.22940345751952) < 1e-6,
  JSON.stringify(hunterAzr.entry)
);
assert("Hunter AZ ends inside AZ", AzModel.pointInAz(hunterAz, hunterAzr.entry.lat, hunterAzr.entry.lng));
assert("Hunter no straight-line", hunterAzr.straightLineUsed === false);

const hunterElev = await Terrain.loadElevation(hunterRoute, { live: false });
const hunterAzElev = TerrainModel.clipProfile(hunterElev, hunterAzr.distanceKm);
assert("Hunter AZ elev available or honest", hunterAzElev.status === "ok" || hunterAzElev.status === "partial" || hunterAzElev.status === "unavailable");
assert("Hunter summit gain present", hunterElev.status === "ok" && hunterElev.gainM > 500);

const hunterAccess = await Access.loadAccess(hunter, { live: false, force: true });
assert("Hunter access fixture loads", hunterAccess.status === "ok" && hunterAccess.parking.some((p) => p.osmId === 338567127), hunterAccess.status);

const noAz = AzRouteModel.deriveAzRoute(slide, slidePark, slideRoute, { status: "unsupported-region" });
assert("AZ unavailable status", noAz.status === "az-unavailable");

const noRoute = AzRouteModel.deriveAzRoute(slide, slidePark, RouteModel.emptyRoute({}, "no-route", "No path"), slideAz);
assert("provider no-route surfaces", noRoute.status === "no-route" || noRoute.status === "unavailable", noRoute.status);

const outsideRoute = {
  status: "ok",
  provider: "valhalla",
  geometry: [
    { lat: 42.02, lng: -74.45 },
    { lat: 42.03, lng: -74.46 }
  ],
  distanceKm: 1.2,
  durationSec: 1000,
  source: { provider: "valhalla" }
};
const none = AzRouteModel.generateCandidates(outsideRoute, slideAz);
assert("no candidates when route misses AZ", none.status === "no-candidate" && none.candidates.length === 0, JSON.stringify(none));

const straight = {
  status: "ok",
  provider: "straight-line",
  straightLine: true,
  geometry: [
    { lat: slidePark.lat, lng: slidePark.lng },
    { lat: slide.lat, lng: slide.lng }
  ],
  distanceKm: 3,
  source: { provider: "straight-line" }
};
const straightGen = AzRouteModel.generateCandidates(straight, slideAz);
assert("straight-line candidate generation rejected", straightGen.status === "generation-failed", straightGen.status);

const malformed = { status: "ok", provider: "valhalla", geometry: [{ lat: 42, lng: -74 }], source: { provider: "valhalla" } };
const malformedGen = AzRouteModel.generateCandidates(malformed, slideAz);
assert("malformed provider route rejected", malformedGen.status === "route-unavailable");

const outsideCand = { id: "outside", lat: 42.02, lng: -74.45, clipToKm: 0.2, distanceKm: 0.2 };
const outsidePrefix = {
  status: "ok",
  provider: "valhalla",
  geometry: [
    { lat: 42.02, lng: -74.45 },
    { lat: 42.021, lng: -74.451 }
  ],
  source: { provider: "valhalla" }
};
const outsideVal = AzRouteModel.validateCandidate(outsideCand, outsidePrefix, slideAz);
assert("route ending outside AZ rejected", outsideVal.ok === false && /outside/i.test(outsideVal.reason || ""));

const shortInvalid = AzRouteModel.validateCandidate(
  { id: "jump", lat: slide.lat, lng: slide.lng, distanceKm: 0.01 },
  { status: "ok", provider: "straight-line", straightLine: true, geometry: [{ lat: slidePark.lat, lng: slidePark.lng }, { lat: slide.lat, lng: slide.lng }] },
  slideAz
);
assert("invalid shorter straight-line ignored", shortInvalid.ok === false);

const validCands = [
  { id: "b", lat: 42.1, lng: -74.2, distanceKm: 4.0 },
  { id: "a", lat: 42.0, lng: -74.3, distanceKm: 3.2 },
  { id: "c", lat: 41.9, lng: -74.1, distanceKm: 3.2 }
];
const picked = AzRouteModel.selectCandidate(validCands);
assert("shortest valid selected", picked && picked.distanceKm === 3.2 && picked.lat === 41.9, JSON.stringify(picked));

const tied = AzRouteModel.selectCandidate([
  { id: "x", lat: 1.2, lng: 0.5, distanceKm: 5 },
  { id: "y", lat: 1.1, lng: 9, distanceKm: 5 }
]);
assert("equal-distance tie uses lower lat", tied && tied.id === "y" && tied.lat === 1.1, JSON.stringify(tied));

const gens = AzRouteModel.generateCandidates(slideRoute, slideAz);
const ids = gens.candidates.map((c) => c.id).sort();
assert("candidate dedupe keeps first-entry and terminus", ids.join(",") === "first-az-entry,route-terminus-inside-az", ids.join(","));
assert("first-entry is shorter than terminus", gens.candidates[0].distanceKm < gens.candidates[1].distanceKm);

const key1 = AzRouteModel.cacheKey(slide, slidePark, slideAz);
const key2 = AzRouteModel.cacheKey(hunter, hunterPark, hunterAz);
assert("cache keys include access/summit/AZ version", /signalterrain-sota-az-route-v0:W2\/GC-001:way\/816358667/.test(key1) && /cells568/.test(key1) && key1 !== key2);
assert("cache includes criterion and method", /shortest-routed-az-entry/.test(key1) && /valhalla-summit-route-az-intersection/.test(key1));

const cached = await AzRoute.loadAzRoute(slide, slidePark, { summitRoute: slideRoute, az: slideAz });
assert("provider returns cached ok result", cached.status === "ok" && cached.distanceKm === slideAzr.distanceKm);

const elevFail = TerrainModel.emptyProfile({}, "unavailable", "Elevation data unavailable. The calculated AZ route is still shown.");
assert("elev failure object keeps route possible", elevFail.status === "unavailable" && slideAzr.status === "ok");

const planningAz = Planning.getPlanning(slide, { status: "ok", parking: [slidePark], trailheads: [], trails: [] }, {
  selectedAccess: slidePark,
  destinationMode: "az",
  azRoute: slideAzr,
  azElevation: slideAzElev,
  route: slideAzr.route,
  elevation: slideAzElev,
  az: slideAz
});
assert("planning AZ destination uses AZ route", planningAz.items.distance.value === slideAzr.route.distanceKm || Math.abs(planningAz.items.distance.value - slideAzr.distanceKm) < 0.001, String(planningAz.items.distance.value));

const planningFail = Planning.getPlanning(slide, { status: "ok", parking: [slidePark], trailheads: [], trails: [] }, {
  selectedAccess: slidePark,
  destinationMode: "az",
  azRoute: { status: "no-candidate", reason: "No valid AZ routing candidate found." },
  route: slideRoute,
  elevation: slideElev,
  az: slideAz
});
assert("AZ failure does not relabel summit route", /unavailable/i.test(planningFail.items.hikingRoute.display) && planningFail.items.distance.display === "Unavailable");

const html = read("apps/summit-signal/index.html");
assert("html loads AZ-route modules", /ss-az-route-model\.js/.test(html) && /ss-az-route-provider\.js/.test(html));
assert("kicker is V0.6", /V0\.6 · SOTA/.test(html));
assert("unpublished", /noindex/i.test(html));
assert("html does not load Sheds or cyber ST", !/shed-hunting|wds-signalterrain|design-system\/signalterrain/.test(html));

const appJs = read("apps/summit-signal/js/ss-map-app.js");
assert("dest mode control", /data-dest-mode/.test(appJs) && /setDestinationMode/.test(appJs));
assert("AZ route rendering class", /ss-hike-line--az/.test(appJs));
assert("AZ ENTRY marker", /AZ ENTRY/.test(appJs));
assert("comparison fields", /ss-route-compare/.test(appJs) && /AZ route saves/.test(appJs));
assert("failure preserves summit language", /The Route-to-Summit result and Activation Zone are unchanged/.test(appJs));
assert("no best activation point", !/best activation point|recommended operating point|valid activation|qualified activation|successful activation/i.test(appJs));
assert("map still independent of Sheds", !/WaypointSheds|sheds-map-app/.test(appJs));
assert("320px hike kv stacks", /max-width: 360px[\s\S]*ss-hike-kv/.test(read("apps/summit-signal/css/summit-signal.css")));

const docs = read("docs/signal-terrain/V0.6.md");
assert("V0.6 docs exist", /Route to Activation Zone/.test(docs) && /unpublished/i.test(docs));
assert(
  "docs required quote",
  /Route to Activation Zone identifies a legitimate routed entry into the calculated Activation Zone/.test(docs)
);
assert("docs candidate method", /valhalla-summit-route-az-intersection/.test(docs));
assert("docs selection criterion", /shortest-routed-az-entry|Shortest routed AZ entry found/.test(docs));
assert("docs Slide acceptance", /W2\/GC-001/.test(docs) && /5\.551/.test(docs));
assert("docs Hunter acceptance", /W2\/GC-002/.test(docs) && /Becker Hollow/.test(docs));
assert("docs no best-activation claim", /does not identify a globally optimal/.test(docs) && !/the best activation point is/i.test(docs));

assert("cyber vision not overwritten", /Understand the world's signals/.test(read("docs/SIGNALTERRAIN-VISION.md")));
assert("robots still disallows summit-signal", /Disallow: \/apps\/summit-signal\//.test(read("robots.txt")));
assert("homepage omits SignalTerrain", !/SignalTerrain/.test(read("index.html")));
assert("cyber redirect intact", /location\.replace/.test(read("apps/signalterrain/index.html")));
assert("Sheds untouched", !/ss-az-route|st-sota-access-w2-gc-002|st-sota-route-w2-gc-002/.test(read("apps/shed-hunting/js/sheds-map-app.js")));

const liveHits = liveUrls.filter((u) => !String(u).startsWith("data/"));
assert("CI used only fixture fetches", liveHits.length === 0, liveHits.join(", "));

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.6 contract tests passed (" + passed + ").");
