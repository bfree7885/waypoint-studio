#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.4 — Activation Zone engine, rules, route relationship.
 * Run: node automation/test-signalterrain-sota-v0-4.mjs
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
    const rel = String(url).replace(/^\.\//, "");
    if (rel.startsWith("data/")) {
      const body = fs.readFileSync(path.join(root, "apps/summit-signal", rel), "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(body) };
    }
    throw new Error("unexpected live fetch " + url);
  };
}

const slide = { id: "W2/GC-001", name: "Slide Mountain", reference: "W2/GC-001", lat: 41.9991, lng: -74.3862, elevationM: 1277, points: 10 };
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
const Geo = sb.SignalTerrainSotaGeo;
const Planning = sb.SignalTerrainSotaPlanning;
const RouteModel = sb.SignalTerrainSotaRouteModel;

assert("rules load", !!Rules && Rules.GENERAL_RULES.version === "1.21");
assert("default VD is 25 m", Rules.GENERAL_RULES.defaultVerticalDistanceM === 25);
assert("rule is not a radius", /closed contour/i.test(Rules.GENERAL_RULES.definition) && !/radius/.test(Rules.GENERAL_RULES.definition));
assert("W2 uses 25 m", Rules.ruleForSummit(slide).verticalDistanceM === 25 && Rules.ruleForSummit(slide).status === "ok");
assert("threshold conversion", Rules.thresholdM(1277, Rules.ruleForSummit(slide)) === 1252);
assert("missing elevation threshold null", Rules.thresholdM(null, Rules.ruleForSummit(slide)) == null);
assert("association from reference", Rules.associationCodeOf({ id: "W6/CT-001" }) === "W6");
assert("missing rule object", Rules.ruleForSummit(slide).source.id === "sota-gr-1.21");
assert("W1 does not inherit a 100 ft hike rule", Rules.ruleForSummit({ id: "W1/NL-001", elevationM: 500 }).verticalDistanceM === 25);
Rules.ASSOCIATION_OVERRIDES.W8 = { verticalDistanceM: 50, reason: "unit-test override" };
assert("association override applies", Rules.ruleForSummit({ id: "W8/OH-001" }).verticalDistanceM === 50);
delete Rules.ASSOCIATION_OVERRIDES.W8;
assert("override removal restores 25 m", Rules.ruleForSummit({ id: "W8/OH-001" }).verticalDistanceM === 25);

function coneFn(peak, slope) {
  return function (r, c, lat, lng, grid) {
    const dr = r - (grid.rows - 1) / 2;
    const dc = c - (grid.cols - 1) / 2;
    const distM = Math.sqrt(dr * dr + dc * dc) * grid.cellSizeM;
    return peak - slope * distM;
  };
}

const origin = { lat: 42, lng: -74 };
const coneSummit = { id: "TEST-CONE", lat: 42, lng: -74, elevationM: 1000, reference: "W2/GC-900" };
const cone = AzModel.makeSyntheticGrid({ rows: 21, cols: 21, cellSizeM: 10, origin, fn: coneFn(1000, 0.5) });
const coneAz = AzModel.computeAz(coneSummit, cone);
assert("cone valid AZ", coneAz.status === "ok" && coneAz.latlngs && coneAz.latlngs.length >= 4, JSON.stringify({ status: coneAz.status, n: coneAz.latlngs && coneAz.latlngs.length, reason: coneAz.reason }));
assert("cone is not a radius flag", coneAz.notARadius === true);
assert("cone cells connected", coneAz.cellCount > 8 && coneAz.cellCount < 120, String(coneAz.cellCount));
assert("cone summit inside", AzModel.pointInAz(coneAz, 42, -74) === true);
assert("cone far point outside", AzModel.pointInAz(coneAz, 42.02, -74) === false);

const plateau = AzModel.makeSyntheticGrid({
  rows: 21,
  cols: 21,
  cellSizeM: 10,
  origin,
  fn: function (r, c, lat, lng, grid) {
    const dr = r - 10;
    const dc = c - 10;
    const dist = Math.sqrt(dr * dr + dc * dc);
    return dist <= 6 ? 1000 : 900;
  }
});
const platAz = AzModel.computeAz(coneSummit, plateau);
assert("plateau valid", platAz.status === "ok" && platAz.cellCount > coneAz.cellCount);

const ridge = AzModel.makeSyntheticGrid({
  rows: 21,
  cols: 21,
  cellSizeM: 10,
  origin,
  fn: function (r, c) {
    return Math.abs(r - 10) <= 1 ? 1000 : 900;
  }
});
const ridgeAz = AzModel.computeAz(coneSummit, ridge);
assert("ridge valid", ridgeAz.status === "ok");
assert("ridge elongated", ridgeAz.cellCount > 15);

const neighbor = AzModel.makeSyntheticGrid({
  rows: 31,
  cols: 31,
  cellSizeM: 10,
  origin,
  fn: function (r, c) {
    const d1 = Math.sqrt((r - 15) * (r - 15) + (c - 10) * (c - 10));
    const d2 = Math.sqrt((r - 15) * (r - 15) + (c - 22) * (c - 22));
    return 1000 - 0.8 * Math.min(d1, d2) * 10;
  }
});
const neighborSummit = {
  id: "TEST-N",
  lat: AzModel.cellLat(neighbor.grid, 15),
  lng: AzModel.cellLng(neighbor.grid, 10),
  elevationM: 1000,
  reference: "W2/GC-901"
};
const nAz = AzModel.computeAz(neighborSummit, neighbor);
assert("nearby separate summit excludes other peak", nAz.status === "ok" && nAz.excludedHighCells > 0, JSON.stringify({ status: nAz.status, excluded: nAz.excludedHighCells, cells: nAz.cellCount, reason: nAz.reason }));

const saddleBelow = AzModel.makeSyntheticGrid({
  rows: 31,
  cols: 31,
  cellSizeM: 10,
  origin,
  fn: function (r, c) {
    const d1 = Math.sqrt((r - 15) * (r - 15) + (c - 8) * (c - 8));
    const d2 = Math.sqrt((r - 15) * (r - 15) + (c - 22) * (c - 22));
    const peak = 1000 - 0.4 * Math.min(d1, d2) * 10;
    if (c > 12 && c < 18) return Math.min(peak, 960);
    return peak;
  }
});
const saddleBelowSummit = {
  id: "TEST-SADDLE-B",
  lat: AzModel.cellLat(saddleBelow.grid, 15),
  lng: AzModel.cellLng(saddleBelow.grid, 8),
  elevationM: 1000,
  reference: "W2/GC-904"
};
const sbAz = AzModel.computeAz(saddleBelowSummit, saddleBelow);
assert("saddle below threshold splits peaks", sbAz.status === "ok" && sbAz.excludedHighCells > 0, JSON.stringify({ cells: sbAz.cellCount, excluded: sbAz.excludedHighCells, reason: sbAz.reason }));

const saddleAbove = AzModel.makeSyntheticGrid({
  rows: 21,
  cols: 31,
  cellSizeM: 10,
  origin,
  fn: function (r, c) {
    const d1 = Math.sqrt((r - 10) * (r - 10) + (c - 8) * (c - 8));
    const d2 = Math.sqrt((r - 10) * (r - 10) + (c - 22) * (c - 22));
    return 1000 - 0.15 * Math.min(d1, d2) * 10;
  }
});
const saddleAboveSummit = {
  id: "TEST-SADDLE-A",
  lat: AzModel.cellLat(saddleAbove.grid, 10),
  lng: AzModel.cellLng(saddleAbove.grid, 8),
  elevationM: 1000,
  reference: "W2/GC-905"
};
const saAz = AzModel.computeAz(saddleAboveSummit, saddleAbove);
assert("saddle above threshold stays connected", saAz.status === "ok" && saAz.excludedHighCells === 0, JSON.stringify({ cells: saAz.cellCount, excluded: saAz.excludedHighCells, reason: saAz.reason }));

const nodata = AzModel.makeSyntheticGrid({
  rows: 11,
  cols: 11,
  cellSizeM: 10,
  origin,
  fn: function (r, c) {
    if (c > 8) return null;
    return coneFn(1000, 0.5)(r, c, 42, -74, { rows: 11, cols: 11, cellSizeM: 10 });
  }
});
const ndAz = AzModel.computeAz(coneSummit, nodata);
assert("partial no-data still computes or flags", ndAz.status === "ok" || ndAz.status === "insufficient-dem", ndAz.status);

const emptyDem = AzModel.computeAz(coneSummit, null);
assert("DEM unavailable", emptyDem.status === "dem-unavailable");

const noRuleSummit = { id: "X", lat: 42, lng: -74, elevationM: 1000 };
const forced = AzModel.computeAz(noRuleSummit, cone, { rule: { status: "unavailable", verticalDistanceM: null } });
assert("missing rule", forced.status === "rule-unavailable");

const between = AzModel.makeSyntheticGrid({ rows: 8, cols: 8, cellSizeM: 10, origin, fn: coneFn(1000, 0.4) });
const offCell = { id: "T", lat: origin.lat + 0.00003, lng: origin.lng + 0.00004, elevationM: 1000, reference: "W2/GC-902" };
const offAz = AzModel.computeAz(offCell, between);
assert("summit between cells still computes", offAz.status === "ok", offAz.status + " " + offAz.reason);

const exact = AzModel.makeSyntheticGrid({
  rows: 11,
  cols: 11,
  cellSizeM: 10,
  origin,
  fn: function (r, c) {
    if (r === 5 && c === 5) return 1000;
    if (Math.abs(r - 5) + Math.abs(c - 5) === 1) return 975;
    return 900;
  }
});
const exAz = AzModel.computeAz(coneSummit, exact);
assert("threshold exactly on cells", exAz.status === "ok" && exAz.cellCount === 5, String(exAz.cellCount));

const conflictDem = AzModel.makeSyntheticGrid({
  rows: 11,
  cols: 11,
  cellSizeM: 10,
  origin,
  fn: function () {
    return 800;
  }
});
const highSota = { id: "C", lat: 42, lng: -74, elevationM: 1000, reference: "W2/GC-903" };
const conf = AzModel.computeAz(highSota, conflictDem);
assert("elevation conflict when DEM far below threshold", conf.status === "elevation-conflict" || conf.status === "calculation-failed", conf.status);

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
  "below-threshold pin snaps to neighbouring qualifying cell",
  offThAz.status === "ok" && offThAz.cellCount >= 1 && offThAz.seed && offThAz.seed.r === 5 && Math.abs(offThAz.seed.c - 5) <= 1,
  JSON.stringify({ status: offThAz.status, reason: offThAz.reason, cells: offThAz.cellCount, seed: offThAz.seed })
);

const routeInside = {
  status: "ok",
  geometry: [
    { lat: 42, lng: -74 },
    { lat: 42.001, lng: -74 }
  ]
};
const relIn = AzModel.relateRoute(coneAz, routeInside);
assert("route starts inside AZ", relIn.enters === true && relIn.distanceToEntryKm === 0);

const routeMiss = {
  status: "ok",
  geometry: [
    { lat: 41.9, lng: -74.2 },
    { lat: 41.91, lng: -74.21 }
  ]
};
const relMiss = AzModel.relateRoute(coneAz, routeMiss);
assert("route does not enter AZ", relMiss.enters === false && relMiss.status === "does-not-enter");

const routeEnter = {
  status: "ok",
  geometry: [
    { lat: 41.99, lng: -74.01 },
    { lat: 42, lng: -74 }
  ]
};
const relEnter = AzModel.relateRoute(coneAz, routeEnter);
assert("first AZ entry identified", relEnter.enters === true && relEnter.entry && relEnter.distanceToEntryKm > 0, JSON.stringify(relEnter));
AzModel.attachEntryElevation(relEnter, {
  points: [
    { distanceKm: 0, elevM: 400 },
    { distanceKm: relEnter.distanceToEntryKm, elevM: 975 }
  ]
});
assert("AZ entry elevation from profile", relEnter.entry.elevationM === 975);

const routeZig = {
  status: "ok",
  geometry: [
    { lat: 41.99, lng: -74.01 },
    { lat: 42, lng: -74 },
    { lat: 42.02, lng: -74 },
    { lat: 42, lng: -74 }
  ]
};
const relZig = AzModel.relateRoute(coneAz, routeZig);
assert(
  "multiple crossings keep first entry",
  relZig.enters === true && relZig.crossings >= 2 && relZig.distanceToEntryKm === relEnter.distanceToEntryKm,
  JSON.stringify({ crossings: relZig.crossings, d: relZig.distanceToEntryKm, first: relEnter.distanceToEntryKm })
);

const relNoRoute = AzModel.relateRoute(coneAz, { status: "unavailable" });
assert("route unavailable vs AZ", relNoRoute.status === "route-unavailable");

const locIn = AzModel.locationStatus(coneAz, { status: "granted", lat: 42, lng: -74 });
assert("GPS inside AZ", locIn.status === "inside" && /Inside mapped/.test(locIn.label) && !/activated/i.test(locIn.label));
const locOut = AzModel.locationStatus(coneAz, { status: "granted", lat: 40, lng: -70 });
assert("GPS outside AZ", locOut.status === "outside");
assert("GPS unavailable", AzModel.locationStatus(coneAz, { status: "denied" }).status === "location-unavailable");
assert("AZ unavailable vs GPS", AzModel.locationStatus(emptyDem, { status: "granted", lat: 42, lng: -74 }).status === "az-unavailable");

const demFix = JSON.parse(read("apps/summit-signal/data/st-sota-az-dem-w2-gc-001.json"));
assert("slide DEM labeled", demFix.source.developmentFixture === true && demFix.source.provider === "usgs-3dep");
assert("slide DEM 1 m lidar", demFix.resolutionM === 1);
const slideAz = AzModel.computeAz(slide, demFix);
assert("slide AZ ok", slideAz.status === "ok", slideAz.status + " " + slideAz.reason);
assert("slide threshold 1252", slideAz.thresholdM === 1252);
assert("slide uses SOTA elevation", slideAz.summitElevationUsedM === 1277 && slideAz.summitElevationSource === "sota-catalogue");
assert("slide not a circle of 25 m", slideAz.cellCount > 100, String(slideAz.cellCount));
assert("slide no radius geometry", slideAz.geometry && slideAz.geometry.type === "Polygon");
assert("slide does not claim activation", /planning aid/i.test(slideAz.caveat) && /not a valid SOTA activation/i.test(slideAz.claimForbidden));

const routeFix = JSON.parse(read("apps/summit-signal/data/st-sota-route-w2-gc-001-slide-parking.json"));
const route = RouteModel.normalizeValhalla(routeFix, {
  start: RouteModel.startFromAccess(parking),
  destination: RouteModel.destinationForSummit(slide),
  access: RouteModel.startFromAccess(parking)
});
const slideRel = AzModel.relateRoute(slideAz, route);
assert("slide route enters AZ", slideRel.enters === true && slideRel.distanceToEntryKm > 4, JSON.stringify({ enters: slideRel.enters, d: slideRel.distanceToEntryKm, crossings: slideRel.crossings }));
assert("slide route not rewritten", route.geometry.length === RouteModel.normalizeValhalla(routeFix, { start: RouteModel.startFromAccess(parking), destination: RouteModel.destinationForSummit(slide) }).geometry.length);

Az.clearCache();
const loaded = await Az.loadActivationZone(slide, { live: false });
assert("provider loads slide fixture", loaded.status === "ok" && loaded.cellCount === slideAz.cellCount);
const cached = await Az.loadActivationZone(slide, { live: false });
assert("AZ cache hits", cached.cellCount === loaded.cellCount);
assert("cache key versions", /signalterrain-sota-az-v0:W2\/GC-001/.test(Az.cacheKey(slide, Rules.ruleForSummit(slide), false)));

const other = await Az.loadActivationZone({ id: "W2/GC-003", lat: 42.2701, lng: -74.1235, elevationM: 1216, reference: "W2/GC-003" }, { live: false });
assert("other summit without fixture unsupported", other.status === "unsupported-region" || other.status === "dem-unavailable", other.status);

const plan = Planning.getPlanning(slide, { status: "ok", trails: [], trailheads: [], parking: [parking] }, {
  selectedAccess: parking,
  route,
  az: loaded,
  routeAz: slideRel,
  geoAz: locOut
});
assert("planning AZ ok when provided", plan.items.activationZone.status === "ok");
const ready = Planning.getReadiness(slide, { status: "ok", parking: [parking], trails: [], trailheads: [] }, {
  selectedAccess: parking,
  route,
  az: loaded,
  routeAz: slideRel,
  geoAz: locOut
});
assert("readiness exists", ready && ready.groups.length >= 4);
assert("readiness not a score", !/87%|recommended today|good activation/i.test(JSON.stringify(ready)));
assert("readiness no valid-activation claim", !/activation valid|you activated/i.test(JSON.stringify(ready)));

const html = read("apps/summit-signal/index.html");
assert("html loads AZ modules", /ss-az-model\.js/.test(html) && /ss-sota-rules\.js/.test(html));
assert("html AZ layer", /data-layer="az"/.test(html));
assert("html readiness", /Activation readiness/.test(html));
assert("kicker is V0.4+", /V0\.[4-7] · SOTA/.test(html));
assert("unpublished", /noindex/i.test(html));
assert("html does not load Sheds or cyber ST", !/shed-hunting|wds-signalterrain|design-system\/signalterrain/.test(html));
assert("GR attribution", /General Rules v1\.21/.test(html));

const appJs = read("apps/summit-signal/js/ss-map-app.js");
assert("AZ plot is polygon", /L\.polygon/.test(appJs));
assert("no radius circle AZ", !/L\.circle\(|setRadius/.test(appJs));
assert("no activation-valid copy", !/Activation valid|Qualified activation|You activated/i.test(appJs));
assert("map still independent of Sheds", !/WaypointSheds|sheds-map-app/.test(appJs));

const docs = read("docs/signal-terrain/V0.4.md");
assert("docs exist", /V0\.4/.test(docs) && /General Rules/.test(docs) && /closed contour/.test(docs));
assert("docs no radius", /not a radius/i.test(docs) && /25 metres|25 m/.test(docs));
assert("cyber vision not overwritten", /Understand the world's signals/.test(read("docs/SIGNALTERRAIN-VISION.md")));
assert("robots still disallows summit-signal", /Disallow: \/apps\/summit-signal\//.test(read("robots.txt")));
assert("homepage omits SignalTerrain", !/SignalTerrain/.test(read("index.html")));
assert("cyber redirect intact", /location\.replace/.test(read("apps/signalterrain/index.html")));
assert("Sheds untouched by AZ globals", !/SignalTerrainSotaAz/.test(read("apps/shed-hunting/js/sheds-map-app.js")));

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.4 contract tests passed (" + passed + ").");
