#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.3 — routing + elevation models, honesty, isolation.
 * Run: node automation/test-signalterrain-sota-v0-3.mjs
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
    Date
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  loadScript(sandbox, "apps/summit-signal/js/ss-geo.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-access-model.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-planning-provider.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-route-model.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-terrain-model.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-route-provider.js");
  loadScript(sandbox, "apps/summit-signal/js/ss-terrain-provider.js");
  return sandbox;
}

function fileFetch(root) {
  return async function (url, opts) {
    const rel = String(url).replace(/^\.\//, "");
    if (rel.startsWith("data/")) {
      const body = fs.readFileSync(path.join(root, "apps/summit-signal", rel), "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(body) };
    }
    if (opts && opts.signal && opts.signal.aborted) {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }
    throw new Error("unexpected live fetch " + url);
  };
}

const slide = { id: "W2/GC-001", name: "Slide Mountain", reference: "W2/GC-001", lat: 41.9991, lng: -74.3862 };
const parking = {
  kind: "parking",
  name: "Slide Mountain Parking Area",
  lat: 42.008684,
  lng: -74.427638,
  osmType: "way",
  osmId: 816358667
};
const giant = {
  kind: "trailhead",
  name: "Giant Ledge Trailhead",
  lat: 42.026693,
  lng: -74.403941,
  osmType: "way",
  osmId: 816358666
};

const sb = sandboxBase(fileFetch(ROOT));
const RouteModel = sb.SignalTerrainSotaRouteModel;
const TerrainModel = sb.SignalTerrainSotaTerrainModel;
const Route = sb.SignalTerrainSotaRoute;
const Terrain = sb.SignalTerrainSotaTerrain;
const Planning = sb.SignalTerrainSotaPlanning;
const Geo = sb.SignalTerrainSotaGeo;

assert("route model loads", !!RouteModel && RouteModel.PROFILE === "pedestrian");
assert("terrain model loads", !!TerrainModel && TerrainModel.NOISE_M === 3);
assert("no SummitSignal global", sb.SummitSignal == null);
assert("collision-safe route id", /signalterrain-sota-route-v0:W2\/GC-001:way\/816358667:pedestrian/.test(RouteModel.routeId(slide, parking)));

const decoded = RouteModel.decodePolyline6("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
assert("polyline decoder returns pairs", Array.isArray(decoded) && decoded.length >= 2 && decoded.every((p) => typeof p.lat === "number"));

const malformed = RouteModel.normalizeValhalla(null, {});
assert("malformed is malformed", malformed.status === "malformed");

const noPath = RouteModel.normalizeValhalla(JSON.parse(read("apps/summit-signal/data/st-sota-route-no-path.json")), {
  start: RouteModel.startFromAccess(parking),
  destination: RouteModel.destinationForSummit(slide)
});
assert("no-route status", noPath.status === "no-route");
assert("no-route has no geometry", !noPath.geometry || noPath.geometry.length === 0);

const timeout = RouteModel.emptyRoute({}, "timeout", "Routing request timed out.");
assert("timeout distinct", timeout.status === "timeout");

const fixture = JSON.parse(read("apps/summit-signal/data/st-sota-route-w2-gc-001-slide-parking.json"));
assert("route fixture labeled", fixture.source.developmentFixture === true && fixture.source.provider === "valhalla");
assert("route fixture is Slide parking", fixture.source.accessOsmId === 816358667);

const route = RouteModel.normalizeValhalla(fixture, {
  start: RouteModel.startFromAccess(parking),
  destination: RouteModel.destinationForSummit(slide),
  access: RouteModel.startFromAccess(parking)
});
assert("valid route", route.status === "ok");
assert("route geometry", route.geometry.length >= 20);
assert("route distance is not straight-line", route.distanceKm > 4 && route.distanceKm < 8);
assert("route distance labeled", /mi/.test(route.distanceLabel) && /km/.test(route.distanceLabel));
assert("route attribution", /OpenStreetMap/.test(route.attribution) && /Valhalla/.test(route.attribution));
assert("duration formatter exists", typeof Geo.formatDurationEstimate === "function" && /^~/.test(Geo.formatDurationEstimate(7066)));
assert("duration from router", route.durationSource === "valhalla-pedestrian" && /~/.test(route.durationLabel));
assert("destination is summit vicinity", /summit vicinity/i.test(route.destination.label));
assert("does not claim best parking", !/best parking|recommended trail|official trailhead/i.test(JSON.stringify(route)));

const savedDurationFn = Geo.formatDurationEstimate;
delete Geo.formatDurationEstimate;
const unlabeled = RouteModel.normalizeValhalla(fixture, {
  start: RouteModel.startFromAccess(parking),
  destination: RouteModel.destinationForSummit(slide),
  access: RouteModel.startFromAccess(parking)
});
Geo.formatDurationEstimate = savedDurationFn;
assert("missing duration formatter keeps route", unlabeled.status === "ok" && unlabeled.geometry.length >= 20 && unlabeled.distanceKm > 4);
assert("missing duration formatter still has distance", /km/.test(unlabeled.distanceLabel || ""));

const haversine = Geo.haversineKm(parking.lat, parking.lng, slide.lat, slide.lng);
assert("route longer than haversine", route.distanceKm > haversine);

const elevFix = JSON.parse(read("apps/summit-signal/data/st-sota-elev-w2-gc-001-slide-parking.json"));
assert("elev fixture labeled", elevFix.source.developmentFixture === true && elevFix.source.provider === "usgs-3dep");
const elev = TerrainModel.normalizeSamples(elevFix, route, { routeId: "test" });
assert("elevation ok", elev.status === "ok");
assert("profile points", elev.points.length >= 20);
assert("ascent not summit-minus-parking", elev.gainM > 400);
const simple = (elev.endM - elev.startM);
assert("cumulative gain >= net rise", elev.gainM + 1 >= simple);
assert("descent calculated", elev.lossM >= 0);
assert("gain labeled feet and meters", /ft/.test(elev.gainLabel) && /m/.test(elev.gainLabel));
assert("methodology documented", /moving average/.test(elev.methodology) && /not summit elevation minus parking/i.test(elev.methodology));

const noisy = TerrainModel.accumulate(TerrainModel.movingAverage([100, 101, 100.5, 102, 101.8, 200], 5));
assert("smoothing helper runs", noisy.gainM >= 0 && noisy.lossM >= 0);

const missingElev = TerrainModel.normalizeSamples({ samples: [{ locationId: 0, value: "NoData", location: { x: 1, y: 2 } }] }, route, {});
assert("too few samples unavailable", missingElev.status === "unavailable");

const partial = TerrainModel.normalizeSamples(
  {
    samples: elevFix.samples.map((s, i) => (i === 3 ? { ...s, value: "NoData" } : s))
  },
  route,
  {}
);
assert("partial elevation still has gain", (partial.status === "partial" || partial.status === "ok") && partial.gainM > 0);

const elevFail = TerrainModel.emptyProfile({}, "unavailable", "Elevation data unavailable. The calculated route is still shown.");
assert("elevation failure object", elevFail.status === "unavailable");
assert("AZ capability reserved", TerrainModel.describeActivationZoneCapability().available === false);

const planNone = Planning.getPlanning(slide);
assert("planning without access not-integrated", planNone.status === "not-integrated");
assert("AZ still not-integrated", planNone.items.activationZone.status === "not-integrated");

const planHike = Planning.getPlanning(slide, { status: "ok", trails: [], trailheads: [], parking: [parking] }, {
  selectedAccess: parking,
  route,
  elevation: elev
});
assert("planning hike ok", planHike.items.distance.status === "ok" && /mi/.test(planHike.items.distance.display));
assert("planning gain ok", planHike.items.elevationGain.status === "ok");
assert("planning time ok", planHike.items.estimatedHikingTime.status === "ok" && /^~/.test(planHike.items.estimatedHikingTime.display));

const planRouteOnly = Planning.getPlanning(slide, { status: "ok", trails: [], trailheads: [], parking: [parking] }, {
  selectedAccess: parking,
  route,
  elevation: elevFail
});
assert("elevation fail keeps route distance", planRouteOnly.items.distance.status === "ok" && planRouteOnly.items.elevationGain.status === "unavailable");

const planNoRoute = Planning.getPlanning(slide, { status: "ok", trails: [], trailheads: [], parking: [parking] }, {
  selectedAccess: parking,
  route: noPath,
  elevation: null
});
assert("no-route does not use haversine", planNoRoute.items.distance.display === "Unavailable");

Route.clearCache();
const loaded = await Route.loadRoute(slide, parking, { live: false });
assert("provider loads Slide fixture", loaded.status === "ok" && loaded.distanceKm > 4);
const cached = await Route.loadRoute(slide, parking, { live: false });
assert("route cache hits", cached.distanceKm === loaded.distanceKm);

const other = await Route.loadRoute(slide, { kind: "parking", name: null, lat: 42.002391, lng: -74.439349, osmType: "node", osmId: 2442957521 }, { live: false });
assert("other parking without fixture is unavailable", other.status === "unavailable");
assert("other parking reason honest", /fixture|Live Valhalla was not requested/i.test(other.reason || ""));

Terrain.clearCache();
const elevLoaded = await Terrain.loadElevation(loaded, { live: false });
assert("terrain provider fixture", elevLoaded.status === "ok" && elevLoaded.gainM > 400);

const giantRoute = await Route.loadRoute(slide, giant, { live: false });
assert("giant ledge fixture distinct", giantRoute.status === "ok" && Math.abs(giantRoute.distanceKm - loaded.distanceKm) > 0.2);

const html = read("apps/summit-signal/index.html");
assert("html loads route modules", /ss-route-model\.js/.test(html) && /ss-terrain-provider\.js/.test(html));
assert("html hike layer", /data-layer="hike"/.test(html));
assert("html plan the hike", /Plan the hike/.test(html));
assert("kicker is V0.3", /V0\.3 · SOTA/.test(html));
assert("unpublished", /noindex/i.test(html));
assert("html does not load Sheds or cyber ST", !/shed-hunting|wds-signalterrain|design-system\/signalterrain/.test(html));
assert("Valhalla and 3DEP attribution", /Valhalla/.test(html) && /3DEP/.test(html));

const appJs = read("apps/summit-signal/js/ss-map-app.js");
assert("start hike function", /function startHikeFromAccess/.test(appJs));
assert("does not draw straight fallback", !/L\.polyline\(\[\[start|haversine.*polyline/i.test(appJs));
assert("map still independent of Sheds", !/WaypointSheds|sheds-map-app/.test(appJs));

const docs = read("docs/signal-terrain/V0.3.md");
assert("docs exist", /V0\.3/.test(docs) && /Valhalla/.test(docs) && /3DEP/.test(docs));
assert("docs distinguish distances", /Straight-line distance/.test(docs) && /Route distance/.test(docs) && /Cumulative elevation gain/.test(docs));
assert("docs FOSSGIS limit", /development/i.test(docs) && /self-host/i.test(docs));
assert("cyber vision not overwritten", /Understand the world's signals/.test(read("docs/SIGNALTERRAIN-VISION.md")));
assert("robots still disallows summit-signal", /Disallow: \/apps\/summit-signal\//.test(read("robots.txt")));
assert("homepage omits SignalTerrain", !/SignalTerrain/.test(read("index.html")));
assert("cyber redirect intact", /location\.replace/.test(read("apps/signalterrain/index.html")));
assert("Sheds untouched by route globals", !/SignalTerrainSotaRoute/.test(read("apps/shed-hunting/js/sheds-map-app.js")));

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.3 contract tests passed (" + passed + ").");
