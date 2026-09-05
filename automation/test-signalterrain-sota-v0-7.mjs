#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.7 — Activation Plan + Field Readiness.
 * Run: node automation/test-signalterrain-sota-v0-7.mjs
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

function memStorage() {
  const m = {};
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null;
    },
    setItem: function (k, v) {
      m[k] = String(v);
    },
    removeItem: function (k) {
      delete m[k];
    }
  };
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
    localStorage: memStorage(),
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
    "apps/summit-signal/js/ss-maidenhead.js",
    "apps/summit-signal/js/ss-sota-rules.js",
    "apps/summit-signal/js/ss-planning-provider.js",
    "apps/summit-signal/js/ss-plan-model.js",
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

function readiness(plan, id) {
  return (plan.fieldReadiness || []).find(function (r) {
    return r.id === id;
  });
}

function unresolvedIds(plan) {
  return (plan.unresolved || []).map(function (i) {
    return i.id;
  });
}

const slide = {
  id: "W2/GC-001",
  name: "Slide Mountain",
  reference: "W2/GC-001",
  lat: 41.9991,
  lng: -74.3862,
  elevationM: 1277,
  elevationFt: 4190,
  points: 10,
  maidenhead: "FN21tx",
  maidenheadSource: "sota"
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
  osmId: 816358667,
  distanceKm: 3.4,
  provenanceUrl: "https://www.openstreetmap.org/way/816358667",
  source: "openstreetmap"
};
const hunterPark = {
  kind: "parking",
  name: null,
  lat: 42.18190904,
  lng: -74.19689275,
  osmType: "way",
  osmId: 338567127,
  source: "openstreetmap"
};

const sb = sandboxBase();
const Plan = sb.SignalTerrainSotaPlan;
const Route = sb.SignalTerrainSotaRoute;
const Az = sb.SignalTerrainSotaAz;
const AzModel = sb.SignalTerrainSotaAzModel;
const AzRoute = sb.SignalTerrainSotaAzRoute;
const Terrain = sb.SignalTerrainSotaTerrain;

assert("plan model loaded", !!(Plan && Plan.buildPlan));
assert("plan version", Plan.PLAN_VERSION === "signalterrain-sota-plan-v0");
assert("no numeric score API", !("score" in Plan) && !("readinessPercent" in Plan));

const slideRoute = await Route.loadRoute(slide, slidePark, { live: false });
const slideAz = await Az.loadActivationZone(slide, { live: false });
const slideRel = AzModel.relateRoute(slideAz, slideRoute);
const slideElev = await Terrain.loadElevation(slideRoute, { live: false });
const slideAzr = await AzRoute.loadAzRoute(slide, slidePark, { summitRoute: slideRoute, az: slideAz, live: false });
const slideAzElev = await Terrain.loadElevation(slideAzr.route, { live: false });
const catalogOk = { status: "ok", parking: [slidePark], trailheads: [], trails: [] };

const complete = Plan.buildPlan({
  summit: slide,
  accessCatalog: catalogOk,
  hike: {
    selectedAccess: slidePark,
    destinationMode: "summit",
    route: slideRoute,
    elevation: slideElev,
    az: slideAz,
    routeAz: slideRel,
    summitRouteAz: slideRel,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage(),
  now: "2026-09-05T12:00:00.000Z"
});

assert("complete plan version", complete.version === "signalterrain-sota-plan-v0");
assert("complete generatedAt", complete.generatedAt === "2026-09-05T12:00:00.000Z");
assert("Slide summit known", readiness(complete, "summit").state === "KNOWN" && complete.summit.reference === "W2/GC-001");
assert("Slide access verify", readiness(complete, "access").state === "VERIFY");
assert("Slide route known", readiness(complete, "route").state === "KNOWN");
assert("Slide AZ known", readiness(complete, "activationZone").state === "KNOWN");
assert("weather not integrated", readiness(complete, "weather").state === "NOT_INTEGRATED");
assert("radio not integrated", readiness(complete, "radio").state === "NOT_INTEGRATED");
assert("mapped parking candidate wording", complete.access.selected.typeLabel === "Mapped parking candidate");
assert("no parking confirmed", !/parking confirmed|legal parking|official trailhead/i.test(JSON.stringify(complete)));
assert("OSM caveat preserved", /OpenStreetMap data may be incomplete\. Verify access before travel\./.test(complete.access.caveat));
assert("destination is Summit", complete.hike.destinationLabel === "Summit");
assert("route distance present", /mi/.test(complete.hike.distanceLabel) && complete.hike.distanceKm > 5);
assert("AZ 25 m threshold", complete.activationZone.verticalDistanceM === 25 && complete.activationZone.thresholdM === 1252);
assert("route enters AZ", complete.activationZone.routeEnters === true);
assert("AZ entry distance", /from start/.test(complete.activationZone.distanceToEntryLabel));
assert("GPS unavailable label", complete.location.label === "Location unavailable");
assert("verify parking legality", unresolvedIds(complete).indexOf("verify-access-legality") !== -1);
assert("verify trail conditions", unresolvedIds(complete).indexOf("verify-trail-conditions") !== -1);
assert("weather unresolved", unresolvedIds(complete).indexOf("weather-not-checked") !== -1);
assert("radio unresolved", unresolvedIds(complete).indexOf("radio-not-checked") !== -1);
assert("offline unresolved", unresolvedIds(complete).indexOf("offline-not-confirmed") !== -1);
assert("snapshot headline", /SLIDE MOUNTAIN/.test(complete.snapshot.headline) && /W2\/GC-001/.test(complete.snapshot.headline));
assert("planner aid", /planning aid/.test(complete.plannerAid));
assert(
  "field readiness note",
  /not a safety score, recommendation, or statement that a SOTA activation will be valid/i.test(complete.fieldReadinessNote)
);
assert("checklist default unchecked", complete.checklist.items.every(function (i) { return i.checked === false; }));
assert("checklist not SOTA required", /Not official SOTA required equipment/.test(complete.checklist.note));
assert("copy has summit and start", /Slide Mountain — W2\/GC-001/.test(complete.copyText) && /mapped parking candidate/i.test(complete.copyText));
assert("copy no unsupported claims", !/valid activation|ready to activate|best operating|92%|excellent activation/i.test(complete.copyText));

const azPlan = Plan.buildPlan({
  summit: slide,
  accessCatalog: catalogOk,
  hike: {
    selectedAccess: slidePark,
    destinationMode: "az",
    route: slideRoute,
    elevation: slideElev,
    azRoute: slideAzr,
    azElevation: slideAzElev,
    az: slideAz,
    routeAz: slideRel,
    summitRouteAz: slideRel,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage()
});
assert("AZ dest mode labeled Activation Zone", azPlan.hike.destinationLabel === "Activation Zone");
assert("AZ dest is not best operating point", !/best operating point/i.test(JSON.stringify(azPlan)));
assert("AZ dest route known", azPlan.hike.status === "KNOWN" && azPlan.hike.distanceKm < slideRoute.distanceKm);

const missingAccess = Plan.buildPlan({
  summit: slide,
  accessCatalog: catalogOk,
  hike: {
    destinationMode: "summit",
    az: slideAz,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage()
});
assert("missing access = UNKNOWN", readiness(missingAccess, "access").state === "UNKNOWN");
assert("missing route = UNKNOWN", readiness(missingAccess, "route").state === "UNKNOWN");
assert("AZ still known without access", readiness(missingAccess, "activationZone").state === "KNOWN");
assert("select-start unresolved", unresolvedIds(missingAccess).indexOf("select-start") !== -1);
assert("copy start not selected", /Start: Not selected/.test(missingAccess.copyText));
assert("copy route unavailable honest", /Route: Unavailable/.test(missingAccess.copyText));

const missingRoute = Plan.buildPlan({
  summit: slide,
  accessCatalog: catalogOk,
  hike: {
    selectedAccess: slidePark,
    destinationMode: "summit",
    route: { status: "unavailable", reason: "Routing service unavailable" },
    az: slideAz,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage()
});
assert("failed route = UNAVAILABLE", readiness(missingRoute, "route").state === "UNAVAILABLE");
assert("access still verify when route fails", readiness(missingRoute, "access").state === "VERIFY");
assert("AZ still known when route fails", readiness(missingRoute, "activationZone").state === "KNOWN");
assert("route-unavailable unresolved", unresolvedIds(missingRoute).indexOf("route-unavailable") !== -1);

const missingAz = Plan.buildPlan({
  summit: slide,
  accessCatalog: catalogOk,
  hike: {
    selectedAccess: slidePark,
    destinationMode: "summit",
    route: slideRoute,
    elevation: slideElev,
    az: { status: "dem-unavailable", reason: "DEM data is unavailable for this summit." },
    geoAz: { status: "az-unavailable", label: "AZ unavailable", inside: null }
  },
  storage: memStorage()
});
assert("failed AZ = UNAVAILABLE", readiness(missingAz, "activationZone").state === "UNAVAILABLE");
assert("route still known when AZ fails", readiness(missingAz, "route").state === "KNOWN");
assert("az-unavailable unresolved", unresolvedIds(missingAz).indexOf("az-unavailable") !== -1);

const accessFail = Plan.buildPlan({
  summit: slide,
  accessCatalog: { status: "unavailable", reason: "Overpass unavailable" },
  hike: {
    destinationMode: "summit",
    az: slideAz,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage()
});
assert("access provider fail = UNAVAILABLE", readiness(accessFail, "access").state === "UNAVAILABLE");
assert("summit remains when access fails", readiness(accessFail, "summit").state === "KNOWN");
assert("AZ remains when access fails", readiness(accessFail, "activationZone").state === "KNOWN");
assert("no claim that access does not exist", !/access does not exist|no access exists/i.test(JSON.stringify(accessFail)));

const gpsInside = Plan.buildPlan({
  summit: slide,
  accessCatalog: catalogOk,
  hike: {
    selectedAccess: slidePark,
    destinationMode: "summit",
    route: slideRoute,
    elevation: slideElev,
    az: slideAz,
    routeAz: slideRel,
    geoAz: { status: "inside", label: "Inside mapped Activation Zone", inside: true }
  },
  storage: memStorage()
});
assert("GPS inside geographic language", gpsInside.location.label === "Inside mapped Activation Zone");
assert("GPS inside is not valid-activation", !/ready to activate|activation valid|successful activation/i.test(JSON.stringify(gpsInside)));

const gpsOutside = Plan.buildPlan({
  summit: slide,
  accessCatalog: catalogOk,
  hike: {
    selectedAccess: slidePark,
    az: slideAz,
    geoAz: { status: "outside", label: "Outside mapped Activation Zone", inside: false }
  },
  storage: memStorage()
});
assert("GPS outside wording", gpsOutside.location.label === "Outside Activation Zone");

const hunterRoute = await Route.loadRoute(hunter, hunterPark, { live: false });
const hunterAz = await Az.loadActivationZone(hunter, { live: false });
const hunterRel = AzModel.relateRoute(hunterAz, hunterRoute);
const hunterElev = await Terrain.loadElevation(hunterRoute, { live: false });
const hunterAzr = await AzRoute.loadAzRoute(hunter, hunterPark, { summitRoute: hunterRoute, az: hunterAz, live: false });
const hunterPlan = Plan.buildPlan({
  summit: hunter,
  accessCatalog: { status: "ok", parking: [hunterPark], trailheads: [], trails: [] },
  hike: {
    selectedAccess: hunterPark,
    destinationMode: "summit",
    route: hunterRoute,
    elevation: hunterElev,
    az: hunterAz,
    routeAz: hunterRel,
    summitRouteAz: hunterRel,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage()
});
assert("Hunter unnamed parking candidate", hunterPlan.access.selected.typeLabel === "Mapped parking candidate");
assert("Hunter unnamed name", hunterPlan.access.selected.name === "Unnamed mapped parking candidate");
assert("Hunter AZ unchanged 1587 / 1209", hunterAz.cellCount === 1587 && hunterAz.thresholdM === 1209);
assert("Hunter plan AZ known", readiness(hunterPlan, "activationZone").state === "KNOWN" && hunterPlan.activationZone.thresholdM === 1209);
assert("Hunter route known", hunterPlan.hike.status === "KNOWN" && Math.abs(hunterPlan.hike.distanceKm - 9.997) < 0.01);
assert("Hunter copy unnamed start", /Unnamed mapped parking candidate/.test(hunterPlan.copyText));

const hunterAzPlan = Plan.buildPlan({
  summit: hunter,
  accessCatalog: { status: "ok", parking: [hunterPark], trailheads: [], trails: [] },
  hike: {
    selectedAccess: hunterPark,
    destinationMode: "az",
    route: hunterRoute,
    azRoute: hunterAzr,
    az: hunterAz,
    routeAz: hunterRel,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage()
});
assert("Hunter Route-to-AZ destination", hunterAzPlan.hike.destinationLabel === "Activation Zone");
assert("Hunter AZ route shorter", hunterAzPlan.hike.distanceKm < hunterRoute.distanceKm);

const store = memStorage();
let checked = Plan.setChecked("W2/GC-001", "radio", true, store);
assert("checklist check radio", checked.items.find(function (i) { return i.id === "radio"; }).checked === true);
assert("checklist other remain unchecked", checked.items.find(function (i) { return i.id === "water"; }).checked === false);
const reloaded = Plan.loadChecklist("W2/GC-001", store);
assert("checklist persists for summit", reloaded.items.find(function (i) { return i.id === "radio"; }).checked === true);
const otherSummit = Plan.loadChecklist("W2/GC-002", store);
assert("checklist scoped per summit", otherSummit.items.find(function (i) { return i.id === "radio"; }).checked === false);
const reset = Plan.resetChecklist("W2/GC-001", store);
assert("checklist reset", reset.items.every(function (i) { return i.checked === false; }));
assert("reset clears storage", Plan.loadChecklist("W2/GC-001", store).items.every(function (i) { return i.checked === false; }));

assert("Slide AZ fixture still 568 cells", slideAz.cellCount === 568 && slideAz.thresholdM === 1252);
assert("Slide first AZ entry still 5.551 km", slideRel.enters === true && Math.abs(slideRel.distanceToEntryKm - 5.551) < 0.001);
assert("V0.6 AZ route prefix unchanged", Math.abs(slideAzr.distanceKm - 5.550883064967031) < 0.001);

const html = read("apps/summit-signal/index.html");
assert("html loads plan model", /ss-plan-model\.js/.test(html));
assert("html Activation Plan", /Activation Plan/.test(html) && /id="ss-plan-body"/.test(html));
assert("html readiness heading kept", /Activation readiness/.test(html) && /id="ss-sec-ready"/.test(html));
assert("html Verify / checklist hooks via renderer", /ss-plan-copy/.test(read("apps/summit-signal/js/ss-map-app.js")));
assert("kicker is V0.7", /V0\.7 · SOTA/.test(html));
assert("unpublished", /noindex/i.test(html));
assert("html does not load Sheds or cyber ST", !/shed-hunting|wds-signalterrain|design-system\/signalterrain/.test(html));
assert("no weather API in html", !/open-meteo|weatherapi|api\.weather/i.test(html));

const appJs = read("apps/summit-signal/js/ss-map-app.js");
assert("plan renderer present", /renderActivationPlan/.test(appJs) && /Copy Plan/.test(appJs));
assert("checklist local persistence", /setChecked/.test(appJs) && /Reset checklist/.test(appJs));
assert("no best activation / valid activation claims", !/best activation point|recommended operating point|Activation valid|You activated|Ready to activate/i.test(appJs));
assert("map still independent of Sheds", !/WaypointSheds|sheds-map-app/.test(appJs));
assert("AZ engine not rewritten in plan", !/floodFill4/.test(read("apps/summit-signal/js/ss-plan-model.js")));

const css = read("apps/summit-signal/css/summit-signal.css");
assert("320px plan stacks", /max-width: 360px[\s\S]*ss-ready-state/.test(css));
assert("checklist tap target", /ss-check[\s\S]*min-height:\s*44px/.test(css));

const docs = read("docs/signal-terrain/V0.7.md");
assert("V0.7 docs exist", /Activation Plan/.test(docs) && /unpublished/i.test(docs));
assert(
  "docs required field-readiness quote",
  /Field Readiness represents the completeness of information available to SignalTerrain/.test(docs)
);
assert("docs Slide acceptance", /W2\/GC-001/.test(docs) && /Slide Mountain/.test(docs));
assert("docs Hunter acceptance", /W2\/GC-002/.test(docs) && /Hunter Mountain/.test(docs));
assert("docs no weather integration", /Weather is not integrated/.test(docs) && /NOT INTEGRATED/.test(docs));

assert("cyber vision not overwritten", /Understand the world's signals/.test(read("docs/SIGNALTERRAIN-VISION.md")));
assert("robots still disallows summit-signal", /Disallow: \/apps\/summit-signal\//.test(read("robots.txt")));
assert("homepage omits SignalTerrain", !/SignalTerrain/.test(read("index.html")));
assert("cyber redirect intact", /location\.replace/.test(read("apps/signalterrain/index.html")));
assert(
  "Sheds untouched",
  !/ss-plan-model|Activation Plan|st-sota-access-w2-gc-002/.test(read("apps/shed-hunting/js/sheds-map-app.js"))
);

const liveHits = liveUrls.filter((u) => !String(u).startsWith("data/"));
assert("CI used only fixture fetches", liveHits.length === 0, liveHits.join(", "));

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.7 contract tests passed (" + passed + ").");
