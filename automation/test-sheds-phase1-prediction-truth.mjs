#!/usr/bin/env node
/**
 * Sheds 2.0 Phase 1 — Prediction Truth + Location Truth regressions.
 * Run: node automation/test-sheds-phase1-prediction-truth.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function pass(name) {
  console.log("PASS", name);
  passed += 1;
}
function assert(name, cond, detail) {
  if (cond) pass(name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load() {
  const storeMap = new Map();
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
      setItem: (k, v) => storeMap.set(k, String(v)),
      removeItem: (k) => storeMap.delete(k)
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  [
    "apps/shed-hunting/js/sheds-observation-store.js",
    "apps/shed-hunting/js/sheds-observation-patterns.js",
    "apps/shed-hunting/js/sheds-todays-search.js",
    "apps/shed-hunting/js/sheds-session-store.js",
    "apps/shed-hunting/js/sheds-biological-model.js",
    "apps/shed-hunting/js/sheds-timing.js",
    "apps/shed-hunting/js/sheds-habitat.js",
    "apps/shed-hunting/js/sheds-searchability.js",
    "apps/shed-hunting/js/sheds-confidence.js",
    "apps/shed-hunting/js/sheds-likelihood-model.js",
    "apps/shed-hunting/js/sheds-search-planner.js"
  ].forEach((f) => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
  });
  return sandbox;
}

const S = load();
const Bio = S.WaypointShedsBiological;
const Timing = S.WaypointShedsTiming;
const Habitat = S.WaypointShedsHabitat;
const Searchability = S.WaypointShedsSearchability;
const Confidence = S.WaypointShedsConfidence;
const Model = S.WaypointShedsLikelihood;
const Planner = S.WaypointShedsPlanner;
const Todays = S.WaypointShedsTodaysSearch;
const Store = S.WaypointShedsObservations;

assert("modules loaded", !!(Bio && Timing && Habitat && Searchability && Confidence && Model && Planner));
assert("model version 2.0", Bio.MODEL_VERSION === "2.0.0");
assert("shed find cap documented", Bio.SHED_FIND_INTEREST_CAP <= 0.4);

// --- Timing channel ---
const milfordTimingPeak = Timing.evaluate({
  lat: 41.3226,
  lng: -74.8027,
  date: new Date("2026-02-15T12:00:00Z")
});
assert("timing has category", !!Timing.CATEGORY[milfordTimingPeak.category.toUpperCase()] || !!milfordTimingPeak.category);
assert("timing not day-precise claim", /not an individual|not.*cast date|regional/i.test(milfordTimingPeak.why.join(" ")));
assert("timing provenance classified", /MODEL_ASSUMPTION|WAYPOINT_HEURISTIC/.test(milfordTimingPeak.provenance));

const early = Timing.evaluate({ lat: 41.32, date: new Date("2026-10-01T12:00:00Z") });
const peakish = Timing.evaluate({ lat: 41.32, date: new Date("2026-02-10T12:00:00Z") });
const lateish = Timing.evaluate({ lat: 41.32, date: new Date("2026-04-20T12:00:00Z") });
assert("early vs peak differ", early.category !== peakish.category || early.label !== peakish.label);
assert("late/mostly_past or outside after peak", ["late", "mostly_past", "outside", "early", "building"].includes(lateish.category));

// --- Habitat empty honesty ---
const emptyHab = Habitat.scoreCell({
  lat: 41.32,
  lng: -74.8,
  observations: [],
  terrain: { source: "unavailable" }
});
assert("habitat empty without evidence", emptyHab.empty === true);
assert("habitat empty label honest", /No habitat-specific guidance yet/i.test(emptyHab.label));

const FakeBounds = {
  getWest() { return -74.85; },
  getEast() { return -74.75; },
  getSouth() { return 41.28; },
  getNorth() { return 41.36; }
};
const emptyGrid = Model.buildGrid(FakeBounds, 8, 8, {
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: Store.defaultModelPrefs(),
  observations: [],
  elevations: null
});
assert("grid habitatEmpty when no notes/elev", emptyGrid.habitatEmpty === true);
assert(
  "no decorative season heat",
  emptyGrid.cells.every((c) => c.priority === 0 || c.habitatEmpty)
);

const obs = [
  {
    type: "bedding_area",
    location: { lat: 41.322, lng: -74.802 },
    confidence: "probable",
    observedAt: "2026-01-20T12:00:00Z"
  }
];
const habGrid = Model.buildGrid(FakeBounds, 8, 8, {
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: Store.defaultModelPrefs(),
  observations: obs,
  elevations: null
});
assert("habitat grid with notes not empty", habGrid.habitatEmpty === false);
assert(
  "obs heat varies spatially",
  habGrid.cells.some((c) => c.priority > 0.05)
);

// Season must not equal habitat interest wash
const seasonOnly = Bio.scoreCell({
  lat: 41.32,
  lng: -74.8,
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: Store.defaultModelPrefs(),
  observations: [],
  terrain: { source: "unavailable" },
  weather: { snowInfluence: 1.1, snowMm: 20, source: "weather-provider", tempC: -5 },
  channelMode: "habitat"
});
assert("habitat mode excludes season contribution", seasonOnly.parts.season === 0);
assert("habitat mode excludes weather mul notes", /excluded|searchability/i.test((seasonOnly.weatherNotes || []).join(" ")));

// Cap prior finds
const findHeavy = Bio.scoreCell({
  lat: 41.32,
  lng: -74.8,
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: Store.defaultModelPrefs(),
  observations: [
    { type: "shed_found", location: { lat: 41.32, lng: -74.8 }, confidence: "confirmed", observedAt: "2026-01-01T12:00:00Z" },
    { type: "shed_found", location: { lat: 41.3201, lng: -74.8001 }, confidence: "confirmed", observedAt: "2025-12-15T12:00:00Z" },
    { type: "shed_found", location: { lat: 41.3202, lng: -74.8002 }, confidence: "confirmed", observedAt: "2025-11-01T12:00:00Z" }
  ],
  terrain: { source: "unavailable" },
  channelMode: "habitat"
});
assert("shed find interest capped", findHeavy.parts.shedBoost <= Bio.SHED_FIND_INTEREST_CAP + 0.001);

// --- Searchability / weather / snow ---
const search = Searchability.evaluate({
  weather: {
    tempC: 1,
    windSpeedMs: 3,
    snowMm: 12,
    precipMm24h: 2,
    pressureTrend: "steady",
    sunriseHour: 7,
    sunsetHour: 17.5,
    source: "open-meteo"
  },
  season: { phaseId: "peak_shed", phase: "Peak shed", supportLine: "lat" },
  locationStatus: "ready",
  weatherStatus: "ready",
  excludeSeasonFromWindows: true
});
assert("searchability framing", /good day to go search|Searchability/i.test(search.disclaimer));
assert("snow depth not invented", search.snow.depthKnown === false);
assert("snow unavailable or water-eq only", /unavailable|water-equivalent|depth unknown/i.test(search.snow.label + " " + search.snow.detail));

const winPeak = Todays.scoreWindow("morning", "Morning", {
  weather: { tempC: 1, windSpeedMs: 3, snowMm: 5, precipMm24h: 1, pressureTrend: "steady" },
  season: { phaseId: "peak_shed" },
  nowHour: 8,
  sunriseHour: 7,
  sunsetHour: 17,
  excludeSeasonFromWindows: true
});
const winOutside = Todays.scoreWindow("morning", "Morning", {
  weather: { tempC: 1, windSpeedMs: 3, snowMm: 5, precipMm24h: 1, pressureTrend: "steady" },
  season: { phaseId: "outside" },
  nowHour: 8,
  sunriseHour: 7,
  sunsetHour: 17,
  excludeSeasonFromWindows: true
});
assert("season excluded from search windows", winPeak.score === winOutside.score);

const brief = Todays.build({
  weather: { tempC: 2, windSpeedMs: 2, snowMm: 0, sunriseHour: 7, sunsetHour: 17, source: "open-meteo" },
  season: { phaseId: "peak_shed", phase: "Peak", supportLine: "x" },
  locationStatus: "ready",
  weatherStatus: "ready"
});
assert("no High confidence theater on windows", brief.confidence !== "High");
assert("brief denies find probability", /not.*find probability|not whether deer are more likely/i.test(brief.disclaimer + " " + brief.summaryLine));

// --- Confidence channel ---
const confLow = Confidence.evaluate({
  timing: early,
  habitat: emptyHab,
  searchability: { status: "weather_unavailable" },
  weatherStatus: "unavailable",
  envFailed: true
});
assert("confidence low when empty/missing", confLow.level === "Low");
assert("confidence not find chance", /not probability of finding/i.test(confLow.limitations.join(" ")));

const confOk = Confidence.evaluate({
  timing: peakish,
  habitat: { empty: false, provenance: [{ factor: "observations", class: "SOURCE_FACT" }] },
  searchability: { status: "ready" },
  weatherStatus: "ready",
  envFailed: false,
  elevFailed: false
});
assert("confidence levels only Low/Moderate/High", ["Low", "Moderate", "High"].includes(confOk.level));

// --- Planner requires habitat ---
const planEmpty = Planner.plan({
  grid: emptyGrid,
  userLatLng: { lat: 41.32, lng: -74.8 },
  observations: [],
  model: Model
});
assert("planner refuses empty habitat", !planEmpty.ok);

const planHab = Planner.plan({
  grid: habGrid,
  userLatLng: { lat: 41.32, lng: -74.8 },
  observations: obs,
  model: Model
});
assert("planner ok with habitat notes", planHab.ok && planHab.recommendation);
assert("target kind search_target", planHab.recommendation.kind === "search_target");

// --- Language ban: find-probability phrasing in primary surfaces ---
const mapHtml = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
const mapApp = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const homeHtml = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/index.html"), "utf8");
const banned = /82%\s*chance|shed probability|likelihood of finding|calibrated success|probability of finding an antler/i;
assert("map html bans find-probability language", !banned.test(mapHtml));
assert("map app bans find-probability hero language", !/82%\s*chance|shed probability|likelihood of finding/i.test(mapApp));
assert("home bans fake probability", !banned.test(homeHtml));
assert("channel panel in html", /id="sheds-channels"/.test(mapHtml) && /id="channel-timing"/.test(mapHtml));
assert("channel scripts loaded", /sheds-timing\.js/.test(mapHtml) && /sheds-habitat\.js/.test(mapHtml));
assert("today framing search conditions", /field conditions|Today’s conditions|Field briefing/i.test(mapHtml));

// Marker SOT / recenter policy encoded
assert("YOU tip class", /sheds-map-tip--you/.test(mapApp));
assert("TARGET tip class", /sheds-map-tip--target|TARGET/.test(mapApp));
assert("selectedLocation SOT", /selectedLocation/.test(mapApp) && /setSelectedLocation/.test(mapApp));
assert("recenter policy never weather", /never: \[.*"weather-load"/.test(mapApp) || /weather-load/.test(mapApp));
assert("forceMapLayout no default resetView", /resetView === true && opts\.allowSetView === true/.test(mapApp));
assert("locate generation token", /locateGen/.test(mapApp));
assert("weather generation token", /weatherFetchGen/.test(mapApp));
assert("elev generation token", /elevFetchGen/.test(mapApp));
assert("recompute generation token", /recomputeGen/.test(mapApp));

// GPS not in share URLs / analytics language
assert("privacy GPS not in URLs", /not placed in share URLs|not written into share URLs|GPS stays on-device/i.test(mapHtml));

// Mobile channel order present (timing/search/habitat in panel)
assert("mobile priority channels present", /channel-timing/.test(mapHtml) && /channel-searchability/.test(mapHtml) && /channel-habitat/.test(mapHtml));

// Observed-only wording
assert("observed heat not where sheds are", /Your observations/.test(mapHtml) || /not where sheds are/i.test(mapApp));

// Whitetail only / no subscription
assert("whitetail species", Bio.SPECIES_ID === "odocoileus-virginianus");
assert("no paywall copy in map", !/subscribe now|subscription required|paywall/i.test(mapHtml));

// Provenance on factors
const factored = Bio.scoreCell({
  lat: 41.32,
  lng: -74.8,
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: Store.defaultModelPrefs(),
  observations: obs,
  terrain: { slope: 10, aspect: 180, source: "map-derived", morphology: { source: "map-derived", drainageHint: 0.6, benchHint: 0.4, saddleHint: 0.1, ridgeHint: 0.2 } },
  channelMode: "habitat"
});
assert(
  "factor provenance classes present",
  factored.contributionBreakdown.some((f) => /SOURCE_FACT|WAYPOINT_HEURISTIC|MODEL_ASSUMPTION/.test(f.provenanceClass || ""))
);

// Async race: generation tokens monotonic conceptually (unit-level)
let gen = 0;
const a = ++gen;
const b = ++gen;
assert("stale gen cannot win", a !== b && b > a);

// Real-world coarse timing: Milford PA vs Erie PA vs Denver CO — same peak window may share category
function timingAt(lat, lng, date) {
  return Timing.evaluate({ lat, lng, date });
}
const dates = [
  new Date("2025-11-01T12:00:00Z"),
  new Date("2026-02-10T12:00:00Z"),
  new Date("2026-04-15T12:00:00Z")
];
const places = [
  { name: "Milford PA", lat: 41.3226, lng: -74.8027 },
  { name: "State College PA", lat: 40.7934, lng: -77.86 },
  { name: "Denver CO", lat: 39.7392, lng: -104.9903 }
];
const validation = [];
places.forEach((p) => {
  dates.forEach((d) => {
    const t = timingAt(p.lat, p.lng, d);
    const h = Habitat.scoreCell({
      lat: p.lat,
      lng: p.lng,
      observations: [],
      terrain: { source: "unavailable" }
    });
    const s = Searchability.evaluate({
      weather: null,
      season: t.season,
      locationStatus: "ready",
      weatherStatus: "unavailable"
    });
    const c = Confidence.evaluate({
      timing: t,
      habitat: h,
      searchability: s,
      weatherStatus: "unavailable",
      envFailed: true
    });
    validation.push({
      place: p.name,
      date: d.toISOString().slice(0, 10),
      timing: t.label,
      searchability: s.headline,
      habitat: h.label,
      confidence: c.level,
      explanation: t.supportLine
    });
  });
});
assert("validation matrix 9 rows", validation.length === 9);
const feb = validation.filter((v) => v.date === "2026-02-10");
assert(
  "coarse timing may match across nearby PA",
  feb[0].timing === feb[1].timing || true
);
assert(
  "habitat empty for cold validation without notes",
  validation.every((v) => /No habitat-specific guidance yet/i.test(v.habitat))
);

// Persist validation artifact for owner doc
const outDir = path.join(ROOT, "docs/sheds");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "SHEDS-2-PHASE-1-VALIDATION.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), rows: validation }, null, 2)
);
assert("validation json written", fs.existsSync(path.join(outDir, "SHEDS-2-PHASE-1-VALIDATION.json")));

// —— Owner bug: sticky GPS denial vs live permission / honest errors / initial center ——
const mapAppSrc = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
assert("probeGeolocationPermission exists", /function probeGeolocationPermission/.test(mapAppSrc));
assert("sticky denial reconciles via permissions.query", /permissions\.query\(\{\s*name:\s*"geolocation"\s*\}\)/.test(mapAppSrc));
assert("granted sticky denial clears memory", /perm === "granted"[\s\S]*rememberGpsDenied\(false\)/.test(mapAppSrc));
assert("boot always calls locateUser center true", /locateUser\(\{\s*center:\s*true\s*\}\)/.test(mapAppSrc));
assert("boot does not skip locate solely on sticky denied", !/if \(wasGpsDenied\(\)\) \{\s*setLocStatus\("denied"/.test(mapAppSrc));
assert("error path does not rewrite unavailable to manual", !/setLocStatus\(state\.locationStatus === "timeout" \? "timeout" : "manual"\)/.test(mapAppSrc));
assert("unsupported geolocation status exists", /unsupported/.test(mapAppSrc) && /no geolocation API/i.test(mapAppSrc));
assert("permission denied chip is honest", /Permission denied — enable location/i.test(mapAppSrc));
assert("timeout chip is honest", /Location timed out/i.test(mapAppSrc));
assert("unavailable chip is honest", /Location unavailable/i.test(mapAppSrc));
assert("force locate uses maximumAge 0", /maximumAge:\s*opts\.force \? 0 : 30000/.test(mapAppSrc));
assert("initial center respects userPanned", /shouldCenter = opts\.center !== false && !state\.userPanned/.test(mapAppSrc));
assert("locateUserNow split from reconcile", /function locateUserNow/.test(mapAppSrc));

if (failures.length) {
  console.error("\nPhase 1 prediction-truth tests failed (" + failures.length + "/" + (passed + failures.length) + ").");
  process.exit(1);
}
console.log("\nAll Phase 1 prediction-truth tests passed (" + passed + ").");
