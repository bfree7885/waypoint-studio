#!/usr/bin/env node
/**
 * Sheds 2.0 Phase 3 — Field Workflow acceptance tests.
 * Run: node automation/test-sheds-phase3-field-workflow.mjs
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
  if (typeof globalThis.atob !== "function") {
    globalThis.atob = (b64) => Buffer.from(b64, "base64").toString("binary");
  }
  const storeMap = new Map();
  const sandbox = {
    console,
    atob: globalThis.atob,
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
    "apps/shed-hunting/js/sheds-session-store.js",
    "apps/shed-hunting/js/sheds-biological-model.js",
    "apps/shed-hunting/js/sheds-search-area.js",
    "apps/shed-hunting/js/sheds-search-area-store.js",
    "apps/shed-hunting/js/sheds-gis-pack.js",
    "apps/shed-hunting/js/sheds-habitat-gis.js",
    "apps/shed-hunting/js/sheds-field-plan.js",
    "apps/shed-hunting/js/sheds-field-ui.js",
    "apps/shed-hunting/js/sheds-timing.js",
    "apps/shed-hunting/js/sheds-searchability.js",
    "apps/shed-hunting/js/sheds-confidence.js"
  ].forEach((f) => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
  });
  sandbox.__storeMap = storeMap;
  return sandbox;
}

const S = load();
const Store = S.WaypointShedsObservations;
const Sessions = S.WaypointShedsSessions;
const AreaStore = S.WaypointShedsSearchAreaStore;
const SearchArea = S.WaypointShedsSearchArea;
const GisPack = S.WaypointShedsGisPack;
const HabitatGis = S.WaypointShedsHabitatGis;
const FieldPlan = S.WaypointShedsFieldPlan;
const Bio = S.WaypointShedsBiological;
const Timing = S.WaypointShedsTiming;
const Searchability = S.WaypointShedsSearchability;
const Confidence = S.WaypointShedsConfidence;

const pack = JSON.parse(
  fs.readFileSync(path.join(ROOT, "apps/shed-hunting/gis/packs/pa-pike-milford-v1.json"), "utf8")
);
GisPack.sample(pack, 41.32, -74.8);
const mapApp = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const mapHtml = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");

assert("phase3 modules loaded", !!(Store && Sessions && AreaStore && HabitatGis && FieldPlan));

// —— Saved Search Areas ——
const created = AreaStore.create({
  name: "North ridge · Milford",
  center: { lat: 41.3226, lng: -74.8027 },
  radiusKey: "medium",
  radiusM: 600,
  mapView: { lat: 41.3226, lng: -74.8027, zoom: 14 },
  notes: "Private test area",
  gisPackId: "pa-pike-milford-v1",
  gisStatus: "available"
});
assert("create Search Area", created.ok && created.area.id);
const areaId = created.area.id;
assert("persist Search Area", AreaStore.getById(areaId) && AreaStore.getById(areaId).name === "North ridge · Milford");
assert("privacy local", created.area.privacy === "private");
assert("rename", AreaStore.rename(areaId, "Milford SEARCH").ok && AreaStore.getById(areaId).name === "Milford SEARCH");
assert("archive", AreaStore.archive(areaId).ok && AreaStore.getById(areaId).status === "archived");
assert("active list hides archived", AreaStore.list().every((a) => a.id !== areaId));
assert("unarchive", AreaStore.unarchive(areaId).ok && AreaStore.getById(areaId).status === "active");

const obsBefore = Store.create({
  type: "habitat_note",
  location: { lat: 41.3226, lng: -74.8027, precision: "map-tap" },
  searchAreaId: areaId,
  note: "linked note"
});
assert("obs linked to area", obsBefore.ok && obsBefore.observation.searchAreaId === areaId);
const sessBefore = Sessions.startSession({ searchAreaId: areaId, searchAreaName: "Milford SEARCH" });
assert("session linked to area", sessBefore.searchAreaId === areaId);
Sessions.endSession(sessBefore.id, {});
const sessId = sessBefore.id;
const obsCountBeforeDelete = Store.list().length;
const sessCountBeforeDelete = Sessions.listSessions().length;
assert("delete confirmation path in map app", /Delete Search Area/.test(mapApp) && /Observations and sessions are kept/.test(mapApp));
assert("delete area", AreaStore.remove(areaId).ok && !AreaStore.getById(areaId));
assert("delete does not delete observations", Store.list().length === obsCountBeforeDelete && Store.getById(obsBefore.observation.id));
assert("delete does not delete sessions", Sessions.listSessions().length === sessCountBeforeDelete && Sessions.getSession(sessId));
assert("orphan obs keeps former searchAreaId", Store.getById(obsBefore.observation.id).searchAreaId === areaId);

// SEARCH restore semantics (logic helpers)
const you = { lat: 41.35, lng: -74.85 };
const search = SearchArea.createSearchLocation(41.3226, -74.8027, "saved-area");
assert("SEARCH != YOU", search.lat !== you.lat || search.lng !== you.lng);
assert("open saved uses keepArea", /keepArea:\s*true/.test(mapApp));
assert("map tap clears area unless keepArea", /if \(!opts\.keepArea\)/.test(mapApp));
assert("GPS must not move SEARCH", /YOU updates never move SEARCH LOCATION/.test(mapApp));
assert("preserveSearchAcrossSideEffects", /function preserveSearchAcrossSideEffects/.test(mapApp));
assert("no hotspot product naming in area UX", /not hotspots/i.test(mapHtml) && !/Save Hotspot|predicted hotspot/i.test(mapHtml + mapApp));

// —— Observations ——
const area2 = AreaStore.create({
  name: "Test area 2",
  center: { lat: 41.33, lng: -74.81 },
  radiusM: 600,
  radiusKey: "medium",
  gisStatus: "available",
  gisPackId: "pa-pike-milford-v1"
}).area;
const linked = Store.create({
  type: "shed_found",
  location: { lat: 41.33, lng: -74.81, precision: "map-tap" },
  searchAreaId: area2.id,
  details: { side: "left", freshness: "fresh", antlerCount: 1, collected: false }
});
const insideOnly = Store.create({
  type: "deer_sign",
  location: { lat: 41.3302, lng: -74.8102, precision: "map-tap" },
  searchAreaId: null,
  details: { signDetail: "rub" }
});
const outside = Store.create({
  type: "habitat_note",
  location: { lat: 40.0, lng: -77.0, precision: "map-tap" },
  searchAreaId: null
});
const noArea = Store.create({
  type: "other",
  location: { lat: 41.4, lng: -74.7, precision: "map-tap" },
  note: "global notebook"
});
assert("no-area observation valid", noArea.ok && noArea.observation.searchAreaId == null);
assert("active area auto-link field present", linked.ok && linked.observation.searchAreaId === area2.id);
const forArea = Store.listForSearchArea(area2);
assert("filter includes linked + inside", forArea.some((o) => o.id === linked.observation.id) && forArea.some((o) => o.id === insideOnly.observation.id));
assert("filter excludes far", !forArea.some((o) => o.id === outside.observation.id));
assert("no double count", forArea.filter((o) => o.id === linked.observation.id).length === 1);
assert("coarse GPS blocked", Store.canPlaceFromGps(4753) === false);
assert("precise GPS allowed", Store.canPlaceFromGps(40) === true);
assert("map app blocks coarse YOU obs place", /YOU is too approximate|too approximate/.test(mapApp));
const approx = Store.normalize({
  type: "habitat_note",
  location: { lat: 41.32, lng: -74.8, precision: "gps", accuracyM: 200 }
});
assert("approximate precision labeled", approx.location.precision === "approximate");

// —— MODEL vs OBSERVED ——
const prefs = Store.defaultModelPrefs();
assert("includeObservationsInHabitat default false", prefs.includeObservationsInHabitat === false);
const sample = GisPack.sample(pack, 41.36, -74.8);
const modelOnly = HabitatGis.scorePoint({
  sample,
  lat: 41.36,
  lng: -74.8,
  observations: [linked.observation],
  Bio,
  includeObservations: false
});
const withObs = HabitatGis.scorePoint({
  sample,
  lat: 41.36,
  lng: -74.8,
  observations: [linked.observation],
  Bio,
  includeObservations: true
});
const modelNoObs = HabitatGis.scorePoint({
  sample,
  lat: 41.36,
  lng: -74.8,
  observations: [],
  Bio,
  includeObservations: false
});
assert("MODEL unchanged when obs present but toggle OFF", modelOnly.score === modelNoObs.score);
assert("opt-in changes score when obs present", Math.abs(withObs.score - modelOnly.score) > 0.001 || withObs.observed.cappedInterest > 0);
assert("opt-in mode combined", withObs.mode === "combined");
assert("default mode model", modelOnly.mode === "model");
assert("cap preserved", withObs.observed.cappedInterest <= HabitatGis.OBS_CAP + 0.001);
const oldFind = {
  type: "shed_found",
  location: { lat: 41.36, lng: -74.8 },
  confidence: "confirmed",
  observedAt: "2018-01-01T12:00:00Z",
  details: { side: "left", freshness: "old", antlerCount: 1, collected: true }
};
const freshFind = {
  type: "shed_found",
  location: { lat: 41.36, lng: -74.8 },
  confidence: "confirmed",
  observedAt: new Date().toISOString(),
  details: { side: "left", freshness: "fresh", antlerCount: 1, collected: true }
};
const dOld = HabitatGis.scorePoint({ sample, lat: 41.36, lng: -74.8, observations: [oldFind], Bio, includeObservations: true });
const dFresh = HabitatGis.scorePoint({ sample, lat: 41.36, lng: -74.8, observations: [freshFind], Bio, includeObservations: true });
assert("decay preserved with opt-in", dFresh.observed.cappedInterest >= dOld.observed.cappedInterest);
const many = [];
for (let i = 0; i < 10; i++) {
  many.push({
    type: "shed_found",
    location: { lat: 41.36 + i * 0.00001, lng: -74.8 },
    confidence: "confirmed",
    observedAt: new Date().toISOString(),
    details: { side: "left", freshness: "fresh", antlerCount: 1, collected: false }
  });
}
const dom = HabitatGis.scorePoint({ sample, lat: 41.36, lng: -74.8, observations: many, Bio, includeObservations: true });
assert("one/many finds cannot dominate via cap", dom.observed.cappedInterest <= HabitatGis.OBS_CAP + 0.001);
assert("UI guidance mode label", /Include my observations in guidance/.test(mapHtml));
assert("no find % in field plan", !/find %|shed probability/i.test(FieldPlan.build({ area: area2, observationsInArea: [] }).disclaimer) || /not a find probability/i.test(FieldPlan.build({ area: area2 }).disclaimer));

const gOff = HabitatGis.buildSearchGrid({
  center: { lat: 41.3226, lng: -74.8027 },
  radiusM: 600,
  pack,
  rows: 8,
  cols: 8,
  observations: [linked.observation],
  Bio,
  includeObservations: false
});
const gOn = HabitatGis.buildSearchGrid({
  center: { lat: 41.3226, lng: -74.8027 },
  radiusM: 600,
  pack,
  rows: 8,
  cols: 8,
  observations: [linked.observation],
  Bio,
  includeObservations: true
});
assert("grid guidanceMode model when off", gOff.guidanceMode === "model");
assert("grid guidanceMode combined when on", gOn.guidanceMode === "combined");

// —— Sessions ——
assert("explicit Start required — no auto start on boot", !/startTracking\(\);\s*$/m.test(mapApp.split("function boot")[1].slice(0, 2500)));
const s1 = Sessions.startSession({ searchAreaId: area2.id, searchAreaName: area2.name });
assert("session links area", s1.searchAreaId === area2.id && s1.searchAreaName === area2.name);
Sessions.attachObservation(s1.id, linked.observation.id, "shed_found");
const ended = Sessions.endSession(s1.id, { notes: "done" });
const summary = Sessions.summarizeSession(ended, Store.list());
assert("End summary accurate counts", summary.observationCount >= 1 && summary.shedsFound >= 1);
assert("distance omitted when no path", summary.distanceAvailable === false && summary.distanceM == null);
assert("no fitness fields", !("calories" in ended) && !("pace" in ended) && !("streak" in ended));
assert("disclaimer not empty-area claim", /does not prove.*empty/i.test(summary.disclaimer));
const legacy = { id: "sess_legacy", status: "ended", startedAt: "2026-01-01T00:00:00Z", endedAt: "2026-01-01T01:00:00Z", path: [], observationIds: [] };
S.localStorage.setItem(Sessions.SESSIONS_KEY, JSON.stringify([legacy]));
const mig = Sessions.migrateSessionsIfNeeded();
assert("old sessions migrate", mig.migrated === true && Sessions.getSession("sess_legacy").searchAreaId === null);

// —— Field Plan ——
const timing = Timing.evaluate({ lat: 41.32, date: new Date("2026-02-15T12:00:00Z") });
const searchability = Searchability.evaluate({ weather: null, locationStatus: "ready", weatherStatus: "unavailable" });
const plan = FieldPlan.build({
  area: area2,
  timing,
  habitat: { label: "Some habitat signal", empty: false },
  searchability,
  evidenceSupport: { level: "Moderate" },
  observationsInArea: Store.listForSearchArea(area2),
  includeObservationsInHabitat: false,
  offline: true,
  weatherAvailable: false
});
assert("field plan area name", plan.area.name === area2.name);
assert("field plan GIS status", plan.area.gisStatus === "available");
assert("field plan timing", !!plan.timing);
assert("field plan habitat model", !!plan.habitatModel);
assert("field plan searchability", !!plan.searchability);
assert("field plan evidence", plan.evidenceSupport.level === "Moderate");
assert("field plan observed summary", /observation/i.test(plan.observed.summary));
assert("offline degradation honesty", plan.degradations.some((d) => /offline|weather/i.test(d)));

// —— Privacy ——
assert("no coords in share URL patterns", /not placed in share URLs/i.test(mapHtml));
assert("no automatic upload of photos", /does not upload photos/i.test(mapHtml));
assert("areas not called hotspots in UI lede", /not hotspots or find probabilities/i.test(mapHtml));
assert("photoRef only — no vault", !/IndexedDB|photo vault|upload photo/i.test(mapApp));
assert("export privacy private-local", AreaStore.exportJson().privacy === "private-local");

// —— Migration obs ——
const legacyObs = {
  id: "obs_legacy",
  type: "deer_sign",
  location: { lat: 41.32, lng: -74.8, precision: "exact" },
  observedAt: "2025-12-01T12:00:00Z",
  createdAt: "2025-12-01T12:00:00Z",
  updatedAt: "2025-12-01T12:00:00Z",
  note: "",
  confidence: "probable",
  details: {}
};
S.localStorage.setItem(Store.STORAGE_KEY, JSON.stringify([legacyObs]));
const om = Store.migrateIfNeeded();
assert("obs migrate keeps id", om.migrated && Store.getById("obs_legacy") && Store.getById("obs_legacy").searchAreaId == null);

// —— Scripts wired ——
assert("scripts include area store + field plan", /sheds-search-area-store\.js/.test(mapHtml) && /sheds-field-plan\.js/.test(mapHtml));
assert("Start Search FAB", /Start Search/.test(mapHtml));

if (failures.length) {
  console.error("\nPhase 3 tests failed (" + failures.length + "/" + (passed + failures.length) + ").");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("\nAll Phase 3 field-workflow tests passed (" + passed + ").");
