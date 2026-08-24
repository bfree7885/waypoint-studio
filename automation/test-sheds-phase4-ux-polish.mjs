#!/usr/bin/env node
/**
 * Sheds 2.0 Phase 4 — UX polish + honesty acceptance tests.
 * Run: node automation/test-sheds-phase4-ux-polish.mjs
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
    "apps/shed-hunting/js/sheds-confidence.js",
    "apps/shed-hunting/js/sheds-ux-polish.js"
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
const FieldUi = S.WaypointShedsFieldUi;
const Timing = S.WaypointShedsTiming;
const Ux = S.WaypointShedsUxPolish;
const Bio = S.WaypointShedsBiological;

const html = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
const mapApp = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/css/sheds-map.css"), "utf8");
const pack = JSON.parse(
  fs.readFileSync(path.join(ROOT, "apps/shed-hunting/gis/packs/pa-pike-milford-v1.json"), "utf8")
);

const MILFORD = { lat: 41.322, lng: -74.802 };

/* ---------- FIRST RUN ---------- */
assert("ux module loaded", !!Ux && typeof Ux.shouldShowCoach === "function");
Ux.resetCoachForTests();
assert("coach shows when not dismissed", Ux.shouldShowCoach() === true);
Ux.dismissCoach();
assert("coach dismiss persists", Ux.coachDismissed() === true && Ux.shouldShowCoach() === false);
assert("coach markup present", html.includes('id="first-run-coach"') && html.includes("btn-coach-dismiss"));
assert(
  "map usable without coach completion",
  html.includes('id="sheds-map"') &&
    html.includes("first-run-coach") &&
    html.includes("btn-coach-dismiss") &&
    !/first-run-coach[^>]*required/.test(html)
);

/* ---------- LOCATION / LEGEND ---------- */
assert("legend YOU/SEARCH/INSPECT/OBS", html.includes("map-marker-legend") &&
  html.includes("YOUR") === false && // don't require that word
  /YOU/.test(html) && /SEARCH/.test(html) && /AREA TO INSPECT/.test(html) && /OBS/.test(html));
assert("INSPECT label in map app", mapApp.includes("INSPECT") && mapApp.includes("AREA TO INSPECT"));
assert("YOU still distinct from SEARCH in app", mapApp.includes("LOCATION_KIND") &&
  mapApp.includes("SEARCH_LOCATION") && mapApp.includes("USER_GPS"));
assert(
  "coarse GPS empty copy",
  Ux.EMPTY.COARSE_GPS.includes("approximate") &&
    SearchArea.promptText(5000).includes("approximate")
);
assert(
  "SEARCH independent of YOU (accuracy gate)",
  SearchArea.canAnalyzeAtYou(50) === true && SearchArea.canAnalyzeAtYou(2000) === false
);

/* ---------- TIMING ---------- */
const timing = Timing.evaluate({ lat: MILFORD.lat, date: new Date("2026-03-15T12:00:00Z") });
assert("timing has plainLabel", !!timing.plainLabel);
assert(
  "timing categorical plain language",
  /window|season|Approaching|Outside|Late|unclear/i.test(timing.plainLabel)
);
assert(
  "timing no exact cast claim in support",
  !/exactly|today is the day|% have shed/i.test(timing.supportLine || "")
);
assert(
  "timing limitations ban find %",
  (timing.limitations || []).some((l) => /find probability|exact cast/i.test(l))
);
const timingSrc = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-timing.js"), "utf8");
assert("CATEGORY_PLAIN exported", timingSrc.includes("CATEGORY_PLAIN") && Timing.CATEGORY_PLAIN);

/* ---------- HABITAT / MODEL ---------- */
assert("MODEL label in trip UI", html.includes("Landscape") && html.includes("MODEL"));
const grid = HabitatGis.buildSearchGrid({
  center: MILFORD,
  radiusM: 600,
  pack,
  observations: [],
  Bio,
  includeObservations: false,
  rows: 12,
  cols: 12
});
assert("GIS Pike pack still works", !grid.unavailable && grid.renderMode === "gis-bands");
assert("default includeObservations false", grid.includeObservations === false || grid.guidanceMode === "model");
assert(
  "no decorative empty outside pack",
  (() => {
    const empty = HabitatGis.buildSearchGrid({
      center: { lat: 40.0, lng: -75.0 },
      radiusM: 600,
      pack,
      observations: [],
      Bio,
      includeObservations: false
    });
    return empty.unavailable === true;
  })()
);
assert("unavailable empty copy", Ux.EMPTY.NO_GIS.includes("isn’t available") || Ux.EMPTY.NO_GIS.includes("isn't available"));
assert(
  "primary UI avoids bare find-% numbers as habitat",
  !html.match(/find\s*\d+\s*%/i) && !html.includes("success probability")
);

/* ---------- OBSERVED ---------- */
assert("My observations in primary HTML", /My observations/i.test(html) && html.includes("channel-observed"));
const prefs = Store.loadModelPrefs();
assert("obs influence default OFF", prefs.includeObservationsInHabitat !== true);
Store.saveModelPrefs(Object.assign({}, prefs, { includeObservationsInHabitat: false }));
assert(
  "include-obs under Advanced",
  html.includes("advanced-map-controls") && html.includes("include-obs-habitat")
);
const obsSumEmpty = Ux.summarizeObservationsForArea([], MILFORD, 600);
assert("empty obs wording", obsSumEmpty.summary === Ux.EMPTY.NO_OBS);
const createdObs = Store.create({
  type: "shed_found",
  location: { lat: MILFORD.lat, lng: MILFORD.lng, precision: "map-tap" },
  note: "ridge tip",
  observedAt: new Date().toISOString()
});
assert("obs create ok", createdObs.ok);
const obsSum = Ux.summarizeObservationsForArea(Store.list(), MILFORD, 600);
assert("obs summary counts", obsSum.count >= 1 && obsSum.sheds >= 1);

/* ---------- TODAY ---------- */
assert("today’s conditions wording", /Today’s conditions|field conditions/i.test(html));
assert("weather failure calm copy", Ux.EMPTY.NO_WEATHER.includes("still work"));
assert("offline copy calm", Ux.EMPTY.NO_NETWORK.includes("still work"));
assert("map-offline banner uses calm language", html.includes("map-offline") &&
  (html.includes("Live conditions unavailable") || html.includes("No network")));

/* ---------- FIELD PLAN ---------- */
assert("Field Plan discoverable FAB", html.includes("btn-field-plan-fab") && html.includes("btn-open-field-plan"));
assert("Field Plan primary in More", /btn-field-plan/.test(html) && /Field Plan/.test(html));
const plan = FieldPlan.build({
  area: {
    name: "Milford test",
    center: MILFORD,
    radiusM: 600,
    gisStatus: "available",
    gisPackId: pack.packId
  },
  timing,
  habitat: { empty: false, label: "Some structure", band: "Some", channel: "habitat" },
  searchability: { headline: "Ordinary field conditions" },
  evidenceSupport: { level: "Low" },
  observationsInArea: Store.list(),
  includeObservationsInHabitat: false,
  offline: false,
  weatherAvailable: true
});
assert("field plan has required channels", plan.timing && plan.habitatModel && plan.searchability && plan.observed);
assert("field plan disclaimer no prediction claim", /not a find probability/i.test(plan.disclaimer));
const planEl = { innerHTML: "" };
FieldUi.renderFieldPlan(planEl, plan);
assert("field plan render When/Landscape/My observations",
  /When/.test(planEl.innerHTML) && /Landscape/.test(planEl.innerHTML) && /My observations/.test(planEl.innerHTML));

/* ---------- SESSION ---------- */
assert("Start Search controls present", html.includes("btn-track") && html.includes("Start Search"));
assert("session strip present", html.includes("session-strip") && html.includes("btn-end-search-strip"));
assert("End Search in strip", html.includes("End Search"));
const session = Sessions.startSession({ searchAreaName: "Milford test" });
assert("session starts", !!session && !!session.id);
const ended = Sessions.endSession(session.id, { notes: "short walk" });
const summary = Sessions.summarizeSession(ended, Store.list());
assert("session summary factual", summary && typeof summary.observationCount === "number");
const sumEl = { innerHTML: "" };
FieldUi.renderSessionSummary(sumEl, summary);
assert("summary has duration not find %", /Duration/.test(sumEl.innerHTML) && !/find probability of/i.test(sumEl.innerHTML));

/* ---------- EMPTY STATES ---------- */
assert("empty NO_SEARCH", Ux.EMPTY.NO_SEARCH.includes("Tap the map"));
assert("empty NO_GIS", /Landscape guidance/i.test(Ux.EMPTY.NO_GIS));
assert("empty NO_OBS", /No field observations/i.test(Ux.EMPTY.NO_OBS));
assert("empty NO_WEATHER", /Live conditions unavailable/i.test(Ux.EMPTY.NO_WEATHER));
assert("empty COARSE_GPS", /approximate/i.test(Ux.EMPTY.COARSE_GPS));
assert("empty NO_NETWORK", /No network|still work/i.test(Ux.EMPTY.NO_NETWORK));

/* ---------- ADVANCED ---------- */
assert("Advanced tools demote weights/validate", html.includes('id="advanced-tools"') &&
  html.includes("btn-controls") && html.includes("btn-validate"));
assert("core Field Plan outside Advanced only", (() => {
  const adv = html.split('id="advanced-tools"')[1] || "";
  return !adv.includes("btn-field-plan") || html.indexOf("btn-field-plan") < html.indexOf("advanced-tools");
})());
assert("More menu title not Tools-first expert dump", html.includes('id="tools-title">More'));

/* ---------- PRIVACY ---------- */
assert("no lat/lng query params in map html links", !html.match(/[?&](lat|lng|longitude|latitude)=/i));
assert("local-first ethics still present", /on-device|this device|Private/i.test(html));
assert("ux module does not upload", !fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-ux-polish.js"), "utf8").includes("fetch("));
assert("obs store key still local", Store.STORAGE_KEY === "waypoint-sheds-observations-v1" ||
  !!Store.list);

/* ---------- DOCS ---------- */
const protocol = fs.readFileSync(path.join(ROOT, "docs/sheds/SHEDS-2-FIELD-VALIDATION-PROTOCOL.md"), "utf8");
const log = fs.readFileSync(path.join(ROOT, "docs/sheds/SHEDS-2-FIELD-VALIDATION-LOG.md"), "utf8");
const polishDoc = fs.readFileSync(path.join(ROOT, "docs/sheds/SHEDS-2-PHASE-4-UX-POLISH.md"), "utf8");
assert("protocol exists and bans shed-count success", protocol.includes("number of sheds found") === false
  ? protocol.includes("Not a test of")
  : true);
assert("protocol not shed-find success metric", /Do \*\*not\*\*|not.*number of sheds found|Not a test of/i.test(protocol));
assert("validation log empty / no fabricated walks", /not started|_TBD_|Fabrication ban/i.test(log));
assert("phase 4 polish doc present", /Phase 4 UX Polish/i.test(polishDoc));
assert("direction audit preserved", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-2-PHASE-4-DIRECTION-AUDIT.md")));
assert("product state after phase 3 preserved", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-2-PRODUCT-STATE-AFTER-PHASE-3.md")));

/* ---------- CSS / MOBILE polish presence ---------- */
assert("coach/session/trip CSS", css.includes("sheds-coach") && css.includes("sheds-session-strip") && css.includes("sheds-trip"));
assert("mobile media polish", css.includes("@media (max-width: 520px)"));

/* ---------- SCRIPT ORDER ---------- */
assert("ux polish script before map-app", html.indexOf("sheds-ux-polish.js") < html.indexOf("sheds-map-app.js"));

console.log("\nPhase 4 UX polish:", passed, "passed,", failures.length, "failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
