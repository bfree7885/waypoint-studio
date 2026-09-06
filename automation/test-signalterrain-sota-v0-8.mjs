#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.8 — start inspection, coordinates, Maps handoff, state-preserving sheet.
 * Run: node automation/test-signalterrain-sota-v0-8.mjs
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

const slide = {
  id: "W2/GC-001",
  name: "Slide Mountain",
  reference: "W2/GC-001",
  lat: 41.9991,
  lng: -74.3862,
  elevationM: 1277,
  elevationFt: 4190,
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

const sb = sandboxBase();
const Access = sb.SignalTerrainSotaAccessModel;
const Plan = sb.SignalTerrainSotaPlan;
const Route = sb.SignalTerrainSotaRoute;
const Az = sb.SignalTerrainSotaAz;
const AzModel = sb.SignalTerrainSotaAzModel;
const AzRoute = sb.SignalTerrainSotaAzRoute;
const Terrain = sb.SignalTerrainSotaTerrain;

const slideFixture = JSON.parse(read("apps/summit-signal/data/st-sota-access-w2-gc-001.json"));
const hunterFixture = JSON.parse(read("apps/summit-signal/data/st-sota-access-w2-gc-002.json"));
const slideCatalog = Access.normalizeFixture(slideFixture, slide);
const hunterCatalog = Access.normalizeFixture(hunterFixture, hunter);
const slidePark = slideCatalog.parking.find(function (p) {
  return p.osmId === 816358667;
});
const hunterPark = hunterCatalog.parking.find(function (p) {
  return p.osmId === 338567127;
});

assert("Slide parking fixture present", !!(slidePark && slidePark.name === "Slide Mountain Parking Area"));
assert("Hunter Becker parking unnamed", !!(hunterPark && hunterPark.name == null));

const slideView = Access.startInspection(slidePark);
assert("Slide mapped name", slideView.displayName === "Slide Mountain Parking Area" && slideView.unnamed === false);
assert("Slide type", slideView.typeLabel === "Mapped parking");
assert("Slide coordinates 5 decimals", slideView.coordsLabel === "42.00868, -74.42764");
assert("Slide access=yes factual", slideView.accessLabel === "Mapped access tag: yes");
assert("Slide fee=no factual", slideView.feeLabel === "Mapped fee tag: no");
assert("Slide not legal parking", !/legal parking|official|recommended|best/i.test(JSON.stringify(slideView)));

const hunterView = Access.startInspection(hunterPark);
assert("Hunter unnamed mapped parking", hunterView.displayName === "Unnamed mapped parking" && hunterView.unnamed === true);
assert("Hunter does not invent a name", hunterPark.name == null);
assert("Hunter coordinates", hunterView.coordsLabel === "42.18191, -74.19689");
assert("Hunter access=yes", hunterView.accessLabel === "Mapped access tag: yes");
assert("Hunter fee=no", hunterView.feeLabel === "Mapped fee tag: no");

assert("unnamed trailhead label", Access.startDisplayName({ kind: "trailhead" }) === "Unnamed mapped trailhead");
assert("unnamed parking label", Access.startDisplayName({ kind: "parking" }) === "Unnamed mapped parking");

const tagCases = [
  [{ access: "yes" }, "Mapped access tag: yes"],
  [{ access: "private" }, "Mapped access tag: private"],
  [{ access: "customers" }, "Mapped access tag: customers"],
  [{ tags: { access: "private" } }, "Mapped access tag: private"]
];
tagCases.forEach(function (pair) {
  assert("access tag " + pair[1], Access.accessTagLabel(pair[0]) === pair[1]);
});
assert("missing access", Access.accessTagLabel({ kind: "parking" }) === null);
assert("missing access display", Access.startInspection({ kind: "parking", lat: 1, lng: 2 }).accessDisplay === "Unavailable");

const feeCases = [
  [{ fee: "no" }, "Mapped fee tag: no"],
  [{ fee: "yes" }, "Mapped fee tag: yes"],
  [{ fee: "seasonal" }, "Mapped fee tag: seasonal"],
  [{ tags: { fee: "seasonal" } }, "Mapped fee tag: seasonal"]
];
feeCases.forEach(function (pair) {
  assert("fee tag " + pair[1], Access.feeTagLabel(pair[0]) === pair[1]);
});
assert("missing fee", Access.feeTagLabel({ kind: "parking" }) === null);
assert("missing fee display", Access.startInspection({ kind: "parking", lat: 1, lng: 2 }).feeDisplay === "Unavailable");

assert("missing coordinates", Access.formatStartCoordinates({ kind: "parking", name: "Lot" }) === null);
assert("missing coords inspection", Access.startInspection({ kind: "parking", name: "Lot" }).hasCoordinates === false);
assert("maps unavailable without coords", Access.mapsHandoffUrl({ kind: "parking", name: "Lot" }) === null);

const genericUrl = Access.mapsHandoffUrl(slidePark, { platform: "generic" });
const iosUrl = Access.mapsHandoffUrl(slidePark, { platform: "ios" });
const androidUrl = Access.mapsHandoffUrl(slidePark, { platform: "android" });
assert("generic maps uses start coords", genericUrl === "https://www.google.com/maps/search/?api=1&query=42.00868,-74.42764");
assert("generic maps never summit", genericUrl.indexOf("41.9991") === -1 && genericUrl.indexOf("-74.3862") === -1);
assert("ios maps uses start ll", /ll=42\.00868,-74\.42764/.test(iosUrl) && /maps\.apple\.com/.test(iosUrl));
assert("ios maps labels name only", /q=Slide%20Mountain%20Parking%20Area/.test(iosUrl));
assert("android geo uses start", androidUrl.indexOf("geo:42.00868,-74.42764") === 0);
assert("android never summit", androidUrl.indexOf("41.9991") === -1);
assert("ios never summit", iosUrl.indexOf("41.9991") === -1 && iosUrl.indexOf("-74.3862") === -1);

const hunterMaps = Access.mapsHandoffUrl(hunterPark, { platform: "generic" });
assert("Hunter maps Becker coords", hunterMaps.indexOf("42.18191,-74.19689") !== -1);
assert("Hunter maps not summit", hunterMaps.indexOf("42.1776") === -1);

const azFake = { lat: 42.0, lng: -74.4, kind: "parking", name: "AZ stand-in" };
const azUrl = Access.mapsHandoffUrl(slidePark, { platform: "generic" });
assert("handoff ignores unrelated AZ point", azUrl.indexOf("42.00000") === -1 || azUrl.indexOf("42.00868") !== -1);

assert("detect ios", Access.detectMapsPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)") === "ios");
assert("detect android", Access.detectMapsPlatform("Mozilla/5.0 (Linux; Android 14)") === "android");
assert("detect generic", Access.detectMapsPlatform("Mozilla/5.0 (X11; Linux x86_64) Chrome") === "generic");

assert(
  "straight-line wording",
  slideCatalog.parking.every(function (p) {
    return p.distanceLabel && /straight-line to summit/.test(p.distanceLabel);
  })
);

const mapSrc = read("apps/summit-signal/js/ss-map-app.js");
assert("parking marker inspects", /inspectAccess\(pk\)/.test(mapSrc));
assert("trailhead marker inspects", /inspectAccess\(th\)/.test(mapSrc));
assert("parking marker does not auto-start", !/startHikeFromAccess\(pk\)/.test(mapSrc));
assert("explicit start hike remains", /function startHikeFromAccess\(feature\)/.test(mapSrc));
assert("inspectedAccess state", /inspectedAccess/.test(mapSrc) && /sheetOpen/.test(mapSrc));
assert("close hides sheet", /ss-sheet-close[\s\S]{0,220}hideSheet\(\)/.test(mapSrc));
assert("close does not clearSelection", !/ss-sheet-close[\s\S]{0,280}clearSelection\(\)/.test(mapSrc));
assert("escape hides not clears", /sheetOpen !== false\) \{\s*hideSheet\(\)/.test(mapSrc));
assert("inspect does not assign selectedAccess", /function inspectAccess\(feature\) \{[\s\S]{0,400}state\.inspectedAccess = feature/.test(mapSrc));
assert("inspect does not start route", !/function inspectAccess\(feature\) \{[\s\S]{0,800}startHikeFromAccess/.test(mapSrc));
assert("no in-app driving router", !/driving|turn-by-turn|travel time from home|traffic/i.test(mapSrc));
assert("no parking recommendation", !/best parking|recommended parking|preferred parking|legal parking/i.test(mapSrc));
assert("no offline maps", !/serviceWorker|offline map|offline routing/i.test(mapSrc));

const inspectState = { selectedAccess: slidePark, inspectedAccess: null, route: { status: "ok", id: "keep" } };
const afterInspect = {
  inspectedAccess: hunterPark,
  selectedAccess: inspectState.selectedAccess,
  route: inspectState.route
};
assert("inspect keeps committed start", afterInspect.selectedAccess.osmId === 816358667);
assert("inspect keeps route object", afterInspect.route.id === "keep");
assert("inspect records candidate", afterInspect.inspectedAccess.osmId === 338567127);

const slideRoute = await Route.loadRoute(slide, slidePark, { live: false });
const slideAz = await Az.loadActivationZone(slide, { live: false });
const slideRel = AzModel.relateRoute(slideAz, slideRoute);
const slideElev = await Terrain.loadElevation(slideRoute, { live: false });
const slideAzr = await AzRoute.loadAzRoute(slide, slidePark, { summitRoute: slideRoute, az: slideAz, live: false });
const slidePlan = Plan.buildPlan({
  summit: slide,
  accessCatalog: slideCatalog,
  hike: {
    selectedAccess: slidePark,
    destinationMode: "summit",
    route: slideRoute,
    elevation: slideElev,
    az: slideAz,
    routeAz: slideRel,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage()
});
assert("Slide copy has start name", /Start: Slide Mountain Parking Area/.test(slidePlan.copyText));
assert("Slide copy has start coordinates", /Coordinates: 42\.00868, -74\.42764/.test(slidePlan.copyText));
assert("Slide copy no legal parking", !/legal parking|official parking|recommended/i.test(slidePlan.copyText));
assert("Slide AZ unchanged 568 / 1252", slideAz.cellCount === 568 && slideAz.thresholdM === 1252);
assert("Slide route unchanged", Math.abs(slideRoute.distanceKm - 5.754) < 0.01);
assert("Slide AZ entry unchanged", slideRel.enters === true && Math.abs(slideRel.distanceToEntryKm - 5.551) < 0.001);
assert("Slide AZ route unchanged", Math.abs(slideAzr.distanceKm - 5.550883064967031) < 0.001);
assert("25 m AZ rule", slidePlan.activationZone.verticalDistanceM === 25);

const hunterRoute = await Route.loadRoute(hunter, hunterPark, { live: false });
const hunterAz = await Az.loadActivationZone(hunter, { live: false });
const hunterPlan = Plan.buildPlan({
  summit: hunter,
  accessCatalog: hunterCatalog,
  hike: {
    selectedAccess: hunterPark,
    destinationMode: "summit",
    route: hunterRoute,
    az: hunterAz,
    geoAz: { status: "location-unavailable", label: "Location unavailable", inside: null }
  },
  storage: memStorage()
});
assert("Hunter copy unnamed", /Start: Unnamed mapped parking/.test(hunterPlan.copyText));
assert("Hunter copy coordinates", /Coordinates: 42\.18191, -74\.19689/.test(hunterPlan.copyText));
assert("Hunter copy no candidate suffix", !/Unnamed mapped parking candidate/.test(hunterPlan.copyText));
assert("Hunter AZ unchanged", hunterAz.cellCount === 1587 && hunterAz.thresholdM === 1209);
assert("Hunter route unchanged", Math.abs(hunterRoute.distanceKm - 9.997) < 0.01);

const noStart = Plan.buildPlan({
  summit: slide,
  accessCatalog: slideCatalog,
  hike: {},
  storage: memStorage()
});
assert("copy coordinates unavailable without start", /Coordinates: Unavailable/.test(noStart.copyText));

const html = read("apps/summit-signal/index.html");
assert("kicker is V0.8+", /V(?:0\.[89]|1\.\d) · /.test(html));
assert("html Start section", /id="ss-start-section"/.test(html) && /id="ss-start-body"/.test(html));
assert("html Show plan", /id="ss-show-plan"/.test(html));
assert("unpublished", /noindex/i.test(html));
assert("html does not load Sheds or cyber ST", !/shed-hunting|wds-signalterrain|design-system\/signalterrain/.test(html));
assert("no weather API", !/open-meteo|weatherapi|api\.weather/i.test(html));
assert("no driving copy", !/turn-by-turn|drive time|traffic/i.test(html));

const css = read("apps/summit-signal/css/summit-signal.css");
assert("inspect pin style", /ss-access-pin\.is-inspect/.test(css));
assert("320px start actions stack", /max-width: 360px[\s\S]*ss-start-actions/.test(css));
assert("show plan control", /\.ss-show-plan/.test(css));

const docs = read("docs/signal-terrain/V0.8.md");
assert("V0.8 docs exist", /field-test/i.test(docs) && /unpublished/i.test(docs));
assert(
  "docs maps caveat",
  /Open in Maps hands the selected mapped access coordinate to an external navigation application\. SignalTerrain does not verify that parking or access is currently legal, open, safe, or available\./.test(
    docs
  )
);
assert("docs Slide acceptance", /W2\/GC-001/.test(docs) && /Slide Mountain Parking Area/.test(docs));
assert("docs Hunter acceptance", /W2\/GC-002/.test(docs) && /Unnamed mapped parking/.test(docs));
assert("docs no in-app driving", /does not calculate a driving route/i.test(docs));

const liveish = liveUrls.filter(function (u) {
  return !u.startsWith("data/");
});
assert("no live network in V0.8 tests", liveish.length === 0, JSON.stringify(liveish));
assert("Sheds untouched", !/SignalTerrainSotaAccessModel|ss-start-open-maps/.test(read("apps/shed-hunting/js/sheds-map-app.js")));
assert("cyber ST untouched", /location\.replace/.test(read("apps/signalterrain/index.html")));
assert("robots still disallows summit-signal", /Disallow: \/apps\/summit-signal\//.test(read("robots.txt")));

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.8 contract tests passed (" + passed + ").");
