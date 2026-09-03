#!/usr/bin/env node
/**
 * Sheds V1.9 — Condition Snapshots (facts first, no heat map).
 * Run: node automation/test-sheds-v1-9-condition-snapshots.mjs
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

function memoryStorage() {
  const data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; },
    _data: data
  };
}

const FILES = [
  "apps/shed-hunting/js/sheds-biological-model.js",
  "apps/shed-hunting/js/sheds-timing.js",
  "apps/shed-hunting/js/sheds-weather.js",
  "apps/shed-hunting/js/sheds-condition-snapshot.js",
  "apps/shed-hunting/js/sheds-condition-service.js",
  "apps/shed-hunting/js/sheds-today-hunt.js",
  "apps/shed-hunting/js/sheds-search-priority.js",
  "apps/shed-hunting/js/sheds-scout-spot-store.js",
  "apps/shed-hunting/js/sheds-hunt-plan-store.js",
  "apps/shed-hunting/js/sheds-hunt-session-store.js",
  "apps/shed-hunting/js/sheds-hunt-activity-store.js",
  "apps/shed-hunting/js/sheds-hunt-record-store.js",
  "apps/shed-hunting/js/sheds-observation-store.js",
  "apps/shed-hunting/js/sheds-session-store.js",
  "apps/shed-hunting/js/sheds-search-area-store.js",
  "apps/shed-hunting/js/sheds-validation-store.js",
  "apps/shed-hunting/js/sheds-models.js",
  "apps/shed-hunting/js/sheds-import-json.js"
];

function forecastJson(overrides) {
  const base = {
    current: {
      temperature_2m: -2.1,
      wind_speed_10m: 3.2,
      surface_pressure: 1014,
      precipitation: 0.1,
      snow_depth: 0.03
    },
    daily: {
      time: ["2026-09-02", "2026-09-03"],
      snowfall_sum: [0.2, 0.4],
      precipitation_sum: [0.5, 1.0],
      sunrise: ["2026-09-02T06:40", "2026-09-03T06:41"],
      sunset: ["2026-09-02T19:20", "2026-09-03T19:18"],
      temperature_2m_min: [-8.4, -7.0],
      temperature_2m_max: [1.2, 2.0]
    },
    hourly: { time: [], temperature_2m: [], precipitation: [], wind_speed_10m: [], snow_depth: [] },
    utc_offset_seconds: 0
  };
  return Object.assign(base, overrides || {});
}

function load(opts) {
  opts = opts || {};
  const storage = opts.storage || memoryStorage();
  let fetchCount = 0;
  const fetchImpl = opts.fetch || function (url) {
    fetchCount += 1;
    lastUrl = String(url);
    if (opts.fetchError) return Promise.reject(new Error(opts.fetchError));
    if (opts.malformedJson) {
      return Promise.resolve({
        ok: true,
        json: function () { return Promise.resolve(opts.malformedJson); }
      });
    }
    if (opts.httpNotOk) {
      return Promise.resolve({ ok: false, status: 503, json: function () { return Promise.resolve({}); } });
    }
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve(opts.forecast || forecastJson()); }
    });
  };
  let lastUrl = "";
  const sandbox = {
    console,
    localStorage: storage,
    crypto: { randomUUID: function () { return "test-" + Math.random().toString(16).slice(2); } },
    fetch: function (url) {
      lastUrl = String(url);
      return fetchImpl(url);
    },
    navigator: { onLine: opts.offline ? false : true },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    JSON: JSON,
    Math: Math,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    Promise: Promise,
    isFinite: isFinite,
    parseInt: parseInt
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  FILES.forEach(function (rel) {
    vm.runInNewContext(read(rel), sandbox, { filename: rel });
  });
  sandbox.storage = storage;
  sandbox.fetchCount = function () { return fetchCount; };
  sandbox.lastUrl = function () { return lastUrl; };
  sandbox._fetchCountRef = function () { return fetchCount; };
  Object.defineProperty(sandbox, "fetchCountValue", {
    get: function () { return fetchCount; }
  });
  sandbox.incFetch = function () { fetchCount += 1; };
  sandbox.setFetchCount = function (n) { fetchCount = n; };
  const origFetch = sandbox.fetch;
  sandbox.fetch = function (url) {
    fetchCount += 1;
    lastUrl = String(url);
    if (opts.nativeFetchCount === false) return origFetch(url);
    return origFetch(url);
  };
  /* The wrapper double-counts if origFetch also increments. Use a single counter: */
  fetchCount = 0;
  sandbox.fetch = function (url) {
    fetchCount += 1;
    lastUrl = String(url);
    if (opts.fetchHang) return new Promise(function () { /* never */ });
    if (opts.fetchError) return Promise.reject(new Error(opts.fetchError));
    if (opts.malformedJson !== undefined) {
      return Promise.resolve({
        ok: true,
        json: function () {
          if (opts.jsonThrow) return Promise.reject(new Error("JSON"));
          return Promise.resolve(opts.malformedJson);
        }
      });
    }
    if (opts.httpNotOk) {
      return Promise.resolve({ ok: false, status: 503, json: function () { return Promise.resolve({}); } });
    }
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve(opts.forecast || forecastJson()); }
    });
  };
  sandbox.getFetchCount = function () { return fetchCount; };
  sandbox.getLastUrl = function () { return lastUrl; };
  return sandbox;
}

function sampleRecord(overrides) {
  return Object.assign({
    schemaVersion: 1,
    kind: "hunt-record",
    huntRecordId: "hrec_a",
    huntPlanId: "plan_ridge",
    huntPlanNameSnapshot: "Ridge North",
    startedAt: "2026-09-01T10:00:00.000Z",
    finishedAt: "2026-09-01T12:00:00.000Z",
    trackPoints: [
      { lat: 41.325, lng: -74.802, t: 1 },
      { lat: 41.326, lng: -74.802, t: 20000 }
    ],
    trackDistanceM: 111,
    trackDistanceAvailable: true,
    observations: [{
      id: "hobs_shed",
      type: "shed_found",
      createdAt: "2026-09-01T11:00:00.000Z",
      lat: 41.326,
      lng: -74.802,
      note: "Left side"
    }],
    scoutSpotIds: ["spot_keep"],
    privacy: "private-local"
  }, overrides || {});
}

function sampleWx() {
  return {
    ready: true,
    tempC: -2.1,
    dailyMinC: -8.4,
    dailyMaxC: 1.2,
    precipMm24h: 1.5,
    precipNowMm: 0.1,
    snowfallSumCm: 0.4,
    snowMm: 0.4,
    snowDepthKnown: true,
    snowDepthM: 0.03,
    windSpeedMs: 3.2,
    fetchedAt: "2026-09-03T12:00:00.000Z",
    tempTrend: { status: "warming", deltaC: 2.4, lookbackHours: 48 },
    freezeThaw: {
      status: "freeze_thaw",
      nightMinC: -8.4,
      dayMaxC: 1.2,
      deadbandC: 1,
      source: "daily"
    },
    snowCover: { status: "light", depthM: 0.03 }
  };
}

const html = read("apps/shed-hunting/map/index.html");
const css = read("apps/shed-hunting/css/sheds-map.css");
const app = read("apps/shed-hunting/js/sheds-map-app.js");
const snapSrc = read("apps/shed-hunting/js/sheds-condition-snapshot.js");
const svcSrc = read("apps/shed-hunting/js/sheds-condition-service.js");
const recordSrc = read("apps/shed-hunting/js/sheds-hunt-record-store.js");
const activitySrc = read("apps/shed-hunting/js/sheds-hunt-activity-store.js");
const wxSrc = read("apps/shed-hunting/js/sheds-weather.js");
const spSrc = read("apps/shed-hunting/js/sheds-search-priority.js");

assert("Condition Snapshot module on map", /sheds-condition-snapshot\.js/.test(html));
assert("Condition Service module on map", /sheds-condition-service\.js/.test(html));
assert("scripts load after weather",
  html.indexOf("sheds-weather.js") < html.indexOf("sheds-condition-snapshot.js") &&
  html.indexOf("sheds-condition-snapshot.js") < html.indexOf("sheds-condition-service.js") &&
  html.indexOf("sheds-condition-service.js") < html.indexOf("sheds-map-app.js"));
assert("Hunt Detail conditions section", /id="hunt-detail-conditions"/.test(html));
assert("conditions heading", /Conditions at hunt time/.test(html));
assert("compact conditions CSS", /sheds-history-conditions/.test(css));
assert("docs present", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-V1-9-CONDITION-SNAPSHOTS.md")));
assert("provenance registry present", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-DATA-PROVENANCE.md")));
assert("no heat score on snapshot schema", !/heatScore|searchPriorityScore|findProbability/.test(snapSrc));
assert("IndexedDB not introduced", !/indexedDB|IDBFactory/.test(snapSrc + svcSrc + recordSrc + activitySrc + app));
assert("history cards omit conditions", !/conditionSnapshot/.test(app.slice(app.indexOf("function historySummaryLine"), app.indexOf("function renderHuntHistoryLists"))));
assert("capture around hunt start", /scheduleHuntConditionSnapshot\(\{ reason: "hunt-start" \}\)/.test(app));
assert("first GPS retry", /reason: "first-gps"/.test(app));
assert("no map-center substitute", /not invented from the map center/.test(app));
assert("privacy: no hunt ids in service payload", !/huntRecordId|scoutSpot|shedFound/.test(svcSrc));
assert("reuse Today’s Hunt weather when nearby", /weatherPackage: reuse/.test(app));
assert("Finish Hunt not gated on weather", /Weather not yet recorded\. Hunt can continue/.test(app));
assert("late weather snapshot binds hunt identity", /boundSessionId/.test(app) && /isSameHuntActivity/.test(app));
assert("applyUserPosition stores GPS altitude", /function rememberGpsAltitude/.test(app) && /state\.userPosition\.altitude/.test(app));
assert("huntConditionGps exposes altitude", /out\.alt/.test(app.slice(app.indexOf("function huntConditionGps"), app.indexOf("function huntConditionTerrain"))));
assert("legacy snowMm is snowfall cm", /snowMm is recent snowfall_sum/.test(wxSrc));
assert("Search Areas grid excludes Today from cell priority", /MUST NOT change cell priority/.test(spSrc));
assert("ethics mentions Condition Snapshots stay on-device", /Condition Snapshots/.test(html));
assert("no publish script invoked in V1.9 docs", /Do \*\*not\*\* run `scripts\/publish-shed-hunting-host\.mjs`/.test(read("docs/sheds/SHEDS-V1-9-CONDITION-SNAPSHOTS.md")));

const ctx = load();
const Snap = ctx.WaypointShedsConditionSnapshot;
const Svc = ctx.WaypointShedsConditionService;
const Rec = ctx.WaypointShedsHuntRecords;
const Act = ctx.WaypointShedsHuntActivity;
const Imp = ctx.WaypointShedsImport;
const Wx = ctx.WaypointShedsWeather;

assert("snapshot API", !!(Snap && Svc && Snap.normalize && Svc.getConditionSnapshot));

const created = Snap.fromWeatherPackage({
  lat: 41.32512,
  lng: -74.80245,
  captureContext: "hunt-start",
  weather: sampleWx(),
  terrain: { elevationM: 412 }
});
assert("Condition Snapshot creation", created && created.kind === "condition-snapshot" && created.schemaVersion === 1);
assert("valid coordinates stored", created.location && Math.abs(created.location.lat - 41.32512) < 1e-9);
assert("facts air temperature", created.facts.airTemperatureC === -2.1);
assert("terrain GPS altitude preserved", created.terrain.elevationM === 412 && created.terrain.elevationStatus === "recorded");
assert("no search-priority field", created.searchPriority == null && created.heatScore == null);
assert("freeze/thaw derived separately", created.derived.freezeThaw.freezeThawOccurred === true &&
  created.derived.freezeThaw.nightMinC === -8.4 && created.derived.freezeThaw.ruleId.indexOf("deadband") >= 0);
assert("snow depth measured", created.facts.snowDepthKnown === true && created.facts.snowDepthM === 0.03);
assert("snowfall not used as depth", created.facts.snowfallSumCm === 0.4);

const badCoord = Snap.fromWeatherPackage({ lat: 99, lng: -74.8, weather: sampleWx() });
assert("invalid coordinate rejected", badCoord.acquisition.status === "no-location" || badCoord.acquisition.status === "invalid-coordinate" || !badCoord.location);
const svcBad = await Svc.getConditionSnapshot({ lat: 99, lng: -200 });
assert("service invalid coordinate", svcBad.acquisition.status === "invalid-coordinate" && !svcBad.location);
assert("invalid coords are not repaired", svcBad.location == null);

const missingDepthWx = Object.assign({}, sampleWx(), { snowDepthKnown: false, snowDepthM: null, snowCover: { status: "unavailable" }, snowfallSumCm: 8, snowMm: 8 });
const noDepth = Snap.fromWeatherPackage({ lat: 41.3, lng: -74.8, weather: missingDepthWx });
assert("snow-depth unavailable state", noDepth.facts.snowDepthKnown === false && noDepth.facts.snowDepthM == null);
assert("snowfall still recorded when depth missing", noDepth.facts.snowfallSumCm === 8);
assert("depth UI is Unavailable", Snap.formatSnowDepth(noDepth) === "Unavailable");
assert("does not fake depth from snowfall", noDepth.derived.snowCover.status === "unavailable");

const parsedMissing = Wx.parseForecast({
  current: { temperature_2m: 1, wind_speed_10m: 2, surface_pressure: 1010, precipitation: 0 },
  daily: { time: ["2026-09-03"], snowfall_sum: [5], precipitation_sum: [2], temperature_2m_min: [-1], temperature_2m_max: [4] }
}, new Date("2026-09-03T15:00:00Z"));
assert("weather normalization omits unknown depth", parsedMissing.snowDepthKnown === false && parsedMissing.snowDepthM == null);
const fromParsed = Snap.fromWeatherPackage({ lat: 41.3, lng: -74.8, weather: parsedMissing });
assert("normalized snapshot keeps snowfall distinct", fromParsed.facts.snowfallSumCm != null && fromParsed.facts.snowDepthKnown === false);

const noDailySnow = Wx.parseForecast({
  current: { temperature_2m: 2, wind_speed_10m: 1, surface_pressure: 1012, precipitation: 0 }
}, new Date("2026-09-03T15:00:00Z"));
assert("parseForecast marks missing snowfall unknown", noDailySnow.snowfallKnown === false && noDailySnow.snowfallSumCm == null);
const noSnowSnap = Snap.fromWeatherPackage({ lat: 41.3, lng: -74.8, weather: noDailySnow });
assert("missing snowfall stays unavailable not zero", noSnowSnap.facts.snowfallSumCm == null);

const knownZeroSnow = Wx.parseForecast({
  current: { temperature_2m: 1, wind_speed_10m: 2, surface_pressure: 1010, precipitation: 0 },
  daily: { time: ["2026-09-03"], snowfall_sum: [0], precipitation_sum: [0], temperature_2m_min: [1], temperature_2m_max: [4] }
}, new Date("2026-09-03T15:00:00Z"));
assert("known zero snowfall remains zero", knownZeroSnow.snowfallKnown === true && knownZeroSnow.snowfallSumCm === 0);
const knownZeroSnap = Snap.fromWeatherPackage({ lat: 41.3, lng: -74.8, weather: knownZeroSnow });
assert("known zero snowfall is stored as 0", knownZeroSnap.facts.snowfallSumCm === 0);

const legacyOnlySnow = Snap.fromWeatherPackage({
  lat: 41.3,
  lng: -74.8,
  weather: { ready: true, tempC: 0, snowMm: 3.2 }
});
assert("legacy snowMm still records snowfall", legacyOnlySnow.facts.snowfallSumCm === 3.2);

const emptyWx = Snap.fromWeatherPackage({ lat: 41.3, lng: -74.8, weather: { ready: true, freezeThaw: { status: "insufficient" } } });
assert("empty weather package is unavailable not recorded magic", Snap.presence({ conditionSnapshot: emptyWx }) === "unavailable");

assert("freeze/thaw evidence stored", created.derived.freezeThaw.dayMaxC === 1.2 && created.derived.freezeThaw.classification === "freeze_thaw");

const recOk = Rec.persist(sampleRecord({
  huntRecordId: "hrec_v19_ok",
  conditionSnapshot: created
}));
assert("Hunt Record snapshot persistence", recOk.ok && Rec.getById("hrec_v19_ok").conditionSnapshot.facts.airTemperatureC === -2.1);

const offlineHunt = load({ offline: true });
offlineHunt.WaypointShedsConditionService._resetCache();
const offSnap = await offlineHunt.WaypointShedsConditionService.getConditionSnapshot({
  lat: 41.32, lng: -74.80, captureContext: "hunt-start"
});
assert("offline snapshot status", offSnap.acquisition.status === "offline");
const sess = offlineHunt.WaypointShedsHuntSession.start({ huntPlanId: "plan_x" });
offlineHunt.WaypointShedsHuntActivity.start({
  sessionId: sess.ok ? sess.session.sessionId : "hsess_off",
  huntPlanId: "plan_x",
  huntPlanName: "Offline walk",
  startedAt: "2026-09-03T10:00:00.000Z"
});
offlineHunt.WaypointShedsHuntActivity.setConditionSnapshot(offSnap);
offlineHunt.WaypointShedsHuntActivity.addObservation({ type: "deer_sign", note: "Tracks" });
const offRec = offlineHunt.WaypointShedsHuntActivity.toRecord({ finishedAt: "2026-09-03T11:00:00.000Z" });
const offSaved = offlineHunt.WaypointShedsHuntRecords.persist(offRec);
assert("offline Hunt Record creation", offSaved.ok && offSaved.record.conditionSnapshot.acquisition.status === "offline");
assert("offline hunt still records observations", offSaved.record.observations.length === 1);

const legacy = Rec.persist(sampleRecord({ huntRecordId: "hrec_legacy" }));
assert("legacy Hunt Record omits snapshot", legacy.ok && Rec.getById("hrec_legacy").conditionSnapshot == null);
const legacyRows = Snap.detailRows(Rec.getById("hrec_legacy"));
assert("legacy Hunt Detail copy", legacyRows.kind === "legacy" && /Conditions not recorded/.test(legacyRows.note));
assert("legacy has no invented weather rows", legacyRows.rows.length === 0);

const unavailRec = Rec.persist(sampleRecord({
  huntRecordId: "hrec_unavail",
  conditionSnapshot: Snap.unavailable({ lat: 41.3, lng: -74.8, status: "timeout", reason: "timed out" })
}));
const unavailRows = Snap.detailRows(Rec.getById("hrec_unavail"));
assert("Hunt Detail unavailable copy", unavailRows.kind === "unavailable" && /unavailable during this hunt/i.test(unavailRows.note));
assert("Hunt Detail shows Unavailable fields", unavailRows.rows.some(function (r) { return r.dt === "Temperature" && r.dd === "Unavailable"; }));

const recRows = Snap.detailRows(Rec.getById("hrec_v19_ok"));
assert("Hunt Detail recorded facts", recRows.kind === "recorded" && /°C/.test(recRows.rows[0].dd));
assert("Hunt Detail snow depth measured label", /measured/.test(recRows.rows.find(function (r) { return r.dt === "Snow depth"; }).dd));

const roundPayload = {
  format: "waypoint-sheds-field-private-v1",
  huntRecords: Rec.exportJson()
};
const parsedExp = Imp.parseExport(JSON.stringify(roundPayload));
assert("V1.9 export parses", parsedExp.ok);
const dest = load();
const imported = dest.WaypointShedsImport.importPayload(parsedExp);
assert("V1.9 import roundtrip", imported.ok && dest.WaypointShedsHuntRecords.getById("hrec_v19_ok").conditionSnapshot.facts.airTemperatureC === -2.1);
assert("condition facts survive roundtrip", dest.WaypointShedsHuntRecords.getById("hrec_v19_ok").conditionSnapshot.derived.freezeThaw.freezeThawOccurred === true);
assert("IDs remain stable", dest.WaypointShedsHuntRecords.getById("hrec_v19_ok").huntRecordId === "hrec_v19_ok");
const again = dest.WaypointShedsImport.importPayload(parsedExp);
assert("no duplicate Hunt Records", again.ok && again.counts.huntRecords.added === 0 && dest.WaypointShedsHuntRecords.list().filter(function (r) { return r.huntRecordId === "hrec_v19_ok"; }).length === 1);

const v17 = Imp.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntRecords: { schemaVersion: 1, kind: "hunt-records", huntRecords: [sampleRecord({ huntRecordId: "hrec_v17" })] }
}));
const dest2 = load();
const v17imp = dest2.WaypointShedsImport.importPayload(v17);
assert("V1.7 export still imports", v17imp.ok && dest2.WaypointShedsHuntRecords.getById("hrec_v17").conditionSnapshot == null);

const v18 = Imp.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntRecords: { huntRecords: [sampleRecord({ huntRecordId: "hrec_v18", observations: [] })] }
}));
const v18imp = dest2.WaypointShedsImport.importPayload(v18);
assert("V1.8 export still imports", v18imp.ok && dest2.WaypointShedsHuntRecords.getById("hrec_v18").conditionSnapshot == null);

const live = load();
const liveScout = live.WaypointShedsScoutSpots.create({ location: { lat: 41.32, lng: -74.80 }, name: "Live" });
const livePlan = live.WaypointShedsHuntPlans.create({ scoutSpotIds: [liveScout.spot.id], name: "Live plan" });
const liveSess = live.WaypointShedsHuntSession.start({ huntPlanId: livePlan.plan.id });
live.WaypointShedsHuntActivity.start({
  sessionId: liveSess.ok ? liveSess.session.sessionId : "hsess_live",
  huntPlanId: livePlan.plan.id,
  huntPlanName: "Live plan",
  startedAt: "2026-09-03T10:00:00.000Z"
});
const exportedLive = JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntRecords: live.WaypointShedsHuntRecords.exportJson()
});
assert("transient Hunt Session excluded", !/"huntSession"/.test(exportedLive));
assert("transient Hunt Activity excluded", !/"huntActivity"/.test(exportedLive) && !/waypoint-sheds-hunt-activity/.test(exportedLive));

const malCtx = load({ malformedJson: { nope: true } });
malCtx.WaypointShedsConditionService._resetCache();
const malSnap = await malCtx.WaypointShedsConditionService.getConditionSnapshot({ lat: 41.3, lng: -74.8, skipCache: true });
assert("malformed provider response", malSnap.acquisition.status === "unavailable" || malSnap.acquisition.status === "malformed", malSnap.acquisition.status);

const jsonThrowCtx = load({ malformedJson: {}, jsonThrow: true });
jsonThrowCtx.WaypointShedsConditionService._resetCache();
const jsonThrowSnap = await jsonThrowCtx.WaypointShedsConditionService.getConditionSnapshot({ lat: 41.3, lng: -74.8, skipCache: true });
assert("JSON throw is not a hunt blocker", jsonThrowSnap.kind === "condition-snapshot" && jsonThrowSnap.acquisition.status !== "ok");

const timeoutCtx = load({ fetchHang: true });
timeoutCtx.WaypointShedsConditionService._resetCache();
const tSnap = await timeoutCtx.WaypointShedsConditionService.getConditionSnapshot({
  lat: 41.3, lng: -74.8, timeoutMs: 40, skipCache: true
});
assert("timeout snapshot", tSnap.acquisition.status === "timeout", tSnap.acquisition.status);

const priv = Svc.requestPayload(41.32519, -74.80245);
assert("privacy request payload only lat/lng", Object.keys(priv).sort().join(",") === "latitude,longitude");
assert("privacy rounding 4 decimals", priv.latitude === 41.3252 && priv.longitude === -74.8024);
const url = Svc.forecastUrl(41.32519, -74.80245);
assert("forecast URL has no hunt identifiers", !/hrec_|scout|shed_found|huntPlan|note=/.test(url));
assert("forecast URL is Open-Meteo", /api\.open-meteo\.com\/v1\/forecast/.test(url));

const dedupe = load();
dedupe.WaypointShedsConditionService._resetCache();
const a1 = await dedupe.WaypointShedsConditionService.getConditionSnapshot({ lat: 41.32511, lng: -74.80241, captureContext: "hunt-start" });
const a2 = await dedupe.WaypointShedsConditionService.getConditionSnapshot({ lat: 41.32512, lng: -74.80242, captureContext: "hunt-start" });
assert("no duplicate network requests within de-dupe window", dedupe.getFetchCount() === 1, String(dedupe.getFetchCount()));
assert("cached snapshot still ok", a1.acquisition.status === "ok" && a2.acquisition.status === "ok");
assert("cached clones do not share ids", a1.id !== a2.id);

const reusePkg = await Svc.getConditionSnapshot({
  lat: 41.4, lng: -74.9, weatherPackage: sampleWx(), captureContext: "hunt-start"
});
assert("weatherPackage skips network", reusePkg.acquisition.status === "ok");

const skipOk = Act.start({
  sessionId: "hsess_skip",
  huntPlanId: "plan_skip",
  huntPlanName: "Skip",
  startedAt: "2026-09-03T10:00:00.000Z"
});
assert("activity start works", skipOk.ok);
const firstSet = Act.setConditionSnapshot(created);
const secondSet = Act.setConditionSnapshot(Snap.unavailable({ lat: 41.3, lng: -74.8, status: "timeout" }));
assert("ok snapshot is not overwritten", firstSet.ok && secondSet.skipped && Act.get().conditionSnapshot.acquisition.status === "ok");

const quotaStore = memoryStorage();
const origSet = quotaStore.setItem;
quotaStore.setItem = function (k, v) {
  if (String(k).indexOf("hunt-records") >= 0 && String(v).length > 80) {
    const err = new Error("quota");
    err.name = "QuotaExceededError";
    throw err;
  }
  return origSet.call(quotaStore, k, v);
};
const quotaCtx = load({ storage: quotaStore });
const q = quotaCtx.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_quota",
  conditionSnapshot: created
}));
assert("localStorage quota pressure refuses write", q.ok === false && /storage/i.test(q.error || ""));
assert("quota failure does not invent a record", quotaCtx.WaypointShedsHuntRecords.list().length === 0);

const sizes = Snap.typicalHuntRecordBytes({ trackPoints: 1800, observations: 80 });
assert("snapshot is compact vs track", sizes.snapshotBytes < 4000 && sizes.snapshotBytes > 200, String(sizes.snapshotBytes));
assert("24 max records stay under typical 5MB quota", sizes.worstCaseBytes < sizes.typicalQuotaBytes, String(sizes.worstCaseBytes));

const heat = Rec.persist(sampleRecord({
  huntRecordId: "hrec_heat",
  conditionSnapshot: Object.assign({}, created, { heatScore: 9, findProbability: 0.9 })
}));
const storedHeat = Rec.getById("hrec_heat").conditionSnapshot;
assert("heat scores are not kept on snapshots", storedHeat.heatScore == null && storedHeat.findProbability == null);

assert("no-location does not invent coordinates", Snap.unavailable({ status: "no-location" }).location == null);

const partial = Snap.fromWeatherPackage({
  lat: 41.3,
  lng: -74.8,
  weather: { ready: true, tempC: -1, snowDepthKnown: false }
});
assert("partial response keeps known temp", partial.facts.airTemperatureC === -1 && partial.acquisition.status === "ok");
assert("partial missing depth is unavailable", partial.facts.snowDepthKnown === false);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\n" + passed + " passed.");
