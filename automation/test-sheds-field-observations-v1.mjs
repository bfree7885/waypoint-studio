/**
 * Field Observations V1 step 1 — map notes save at GPS or an explicit tap.
 * Hunt observations, radar scores, and the observation schema stay as they were.
 * Run: node automation/test-sheds-field-observations-v1.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fnBody(src, name) {
  const re = new RegExp("function " + name + "\\s*\\([^)]*\\)\\s*\\{");
  const start = src.search(re);
  if (start < 0) return "";
  let i = src.indexOf("{", start);
  let depth = 0;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === "{") depth += 1;
    else if (src[j] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return "";
}

function loadPlace() {
  const sandbox = { console, module: { exports: {} }, exports: {} };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(read("apps/shed-hunting/js/sheds-observation-place.js"), sandbox, {
    filename: "sheds-observation-place.js"
  });
  return sandbox.WaypointShedsObservationPlace;
}

function memoryStorage() {
  const data = {};
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; }
  };
}

function loadStore() {
  const sandbox = {
    console,
    localStorage: memoryStorage(),
    crypto: { randomUUID() { return "test-obs"; } }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("apps/shed-hunting/js/sheds-observation-store.js"), sandbox, {
    filename: "sheds-observation-store.js"
  });
  vm.runInNewContext(read("apps/shed-hunting/js/sheds-hunt-activity-store.js"), sandbox, {
    filename: "sheds-hunt-activity-store.js"
  });
  return sandbox;
}

const Place = loadPlace();
const app = read("apps/shed-hunting/js/sheds-map-app.js");
const html = read("apps/shed-hunting/map/index.html");
const css = read("apps/shed-hunting/css/sheds-map.css");
const huntSrc = read("apps/shed-hunting/js/sheds-hunt-activity-store.js");
const storeSrc = read("apps/shed-hunting/js/sheds-observation-store.js");
const openFlow = fnBody(app, "openAddObservationFlow");
const saveFn = fnBody(app, "saveObservation");
const armFn = fnBody(app, "armObsMapPlacement");
const useGps = fnBody(app, "currentGpsCandidate") + "\n" + app.slice(
  app.indexOf('if ($("btn-obs-use-gps"))'),
  app.indexOf('if ($("btn-obs-use-gps"))') + 1800
);
const clickHandler = app.slice(app.indexOf('map.on("click"'), app.indexOf('map.on("click"') + 1600);
const wash = fnBody(app, "setRadarWashVisible");
const huntSave = fnBody(app, "saveFieldHuntObservation");

const good = Place.gpsCandidate({ lat: 41.32512, lng: -74.80234, accuracyM: 12 });
assert("1 good GPS prepopulates coordinates", good.ok && good.lat === 41.32512 && good.lng === -74.80234 && good.source === "gps");
assert("1 good GPS label", Place.sourceLabel(good) === "Current GPS");

const poor = Place.placeObservation({
  gps: { lat: 41.1, lng: -74.8, accuracyM: 120 },
  mapCenter: { lat: 44, lng: -92.5 },
  searchAreaCenter: { lat: 41.2, lng: -74.7 },
  defaultCoords: { lat: 41.33, lng: -74.81 }
});
assert("2 poor GPS does not succeed", poor.ok === false && poor.reason === "poor");
assert("2 poor GPS does not adopt another coordinate", poor.lat == null && poor.lng == null);

const missing = Place.placeObservation({
  mapCenter: { lat: 41.325, lng: -74.802 },
  searchAreaCenter: { lat: 41.2, lng: -74.7 },
  defaultCoords: { lat: 0, lng: 0 }
});
assert("3 missing GPS requires an explicit selection", missing.ok === false && missing.reason === "missing");
assert("3 open flow does not read the map center", !/getCenter/.test(openFlow) && /currentGpsCandidate/.test(openFlow));
assert("3 choose-on-map control", /id="btn-obs-choose-map">Choose location on map/.test(html));

const tap = Place.selectionFromMapTap(41.11111, -74.22222);
assert("4 map tap keeps the tapped coordinates", tap.ok && tap.lat === 41.11111 && tap.lng === -74.22222 && tap.source === "map");
assert("4 tap wins over a supplied center", Place.placeObservation({
  mapTap: { lat: 41.11111, lng: -74.22222 },
  gps: { lat: 40, lng: -75, accuracyM: 5 },
  mapCenter: { lat: 1, lng: 2 }
}).lat === 41.11111);

const blocked = Place.draftForSave(null);
assert("5 save without a location is blocked", blocked.ok === false && /Location required/.test(blocked.error));
assert("5 save function has no map-center fallback", !/getCenter/.test(saveFn) && /draftForSave/.test(saveFn));

const savedTap = Place.draftForSave(tap);
assert("6 save after a map tap succeeds", savedTap.ok && savedTap.location.lat === 41.11111 && savedTap.location.lng === -74.22222 && savedTap.location.precision === "map-tap");
assert("6 selected-on-map label", Place.sourceLabel(tap) === "Selected on map");

const sb = loadStore();
const Store = sb.WaypointShedsObservations;
const existing = {
  id: "obs_existing",
  type: "deer_sign",
  schemaVersion: 2,
  location: { lat: 41.5, lng: -75.1, precision: "gps", accuracyM: 18, privacy: "private" },
  observedAt: "2026-09-01T15:00:00.000Z",
  note: "Tracks in mud",
  confidence: "probable",
  createdAt: "2026-09-01T15:00:00.000Z",
  updatedAt: "2026-09-01T15:00:00.000Z",
  details: { signDetail: "tracks" }
};
const imported = Store.importList([existing]);
assert("9 import accepts an existing record", imported.ok && imported.added === 1);
const loaded = Store.getById("obs_existing");
assert("9 existing coordinates load unchanged", loaded && loaded.location.lat === 41.5 && loaded.location.lng === -75.1 && loaded.location.precision === "gps" && loaded.note === "Tracks in mud");
assert("7 edit keeps the stored point", (function () {
  const stored = Place.selectionFromStored(loaded.location);
  const decision = Place.draftForSave(stored);
  const updated = Store.update("obs_existing", {
    note: "Tracks in mud, still there",
    location: {
      lat: decision.location.lat,
      lng: decision.location.lng,
      precision: decision.location.precision,
      accuracyM: decision.location.accuracyM
    }
  });
  return updated.ok && updated.observation.note === "Tracks in mud, still there" &&
    updated.observation.location.lat === 41.5 &&
    updated.observation.location.precision === "gps" &&
    updated.observation.location.accuracyM === 18;
})());
assert("7 edit path uses the stored location", /selectionFromStored/.test(fnBody(app, "openViewObservation")) && /Store\.update/.test(saveFn));
assert("8 delete still confirms and removes", /Delete this private observation/.test(fnBody(app, "deleteObservation")) && /Store\.remove/.test(fnBody(app, "deleteObservation")));
assert("8 store delete removes that record", Store.remove("obs_existing").ok && Store.getById("obs_existing") == null);

const created = Store.create({
  type: "shed_found",
  location: { lat: 41.2, lng: -74.9, precision: "map-tap", accuracyM: null },
  note: "Left where found"
});
assert("10 create still validates", created.ok);
const exported = Store.exportJson();
assert("10 export keeps schema 2", exported.schemaVersion === 2 && exported.observations.length === 1);
const sb2 = loadStore();
const round = sb2.WaypointShedsObservations.importList(exported.observations);
const back = sb2.WaypointShedsObservations.list()[0];
assert("10 import round-trip", round.ok && back.location.lat === 41.2 && back.location.lng === -74.9 && back.type === "shed_found");

assert("11 visibility toggle remains", /id="obs-visible"/.test(html) && /state\.prefs\.obsVisible/.test(fnBody(app, "refreshObservations")));
assert("12 search association remains", /searchAreaId:\s*state\.activeSearchAreaId/.test(saveFn) && /Sessions\.attachObservation/.test(saveFn));
assert("12 search area center is not a coordinate", !/searchArea.*center|activeSearchArea.*lat/.test(saveFn));

assert("13 hunt capture unchanged", /HuntActivity\.addObservation/.test(huntSave) && !/getCenter|WaypointShedsObservationPlace|draftForSave/.test(huntSave));
assert("13 hunt store still has seven types", (sb.WaypointShedsHuntActivity.OBSERVATION_TYPES || []).length === 7);
assert("13 hunt add does not require the map-note module", !/observation-place/.test(huntSrc));

const placementFns = [openFlow, saveFn, armFn, fnBody(app, "currentGpsCandidate"), fnBody(app, "applyObsDraft")].join("\n");
assert("14 no extra geolocation watch", !/watchPosition/.test(placementFns) && !/watchPosition/.test(useGps.slice(0, 1600)));
assert("15 no map-center fallback in placement", !/getCenter/.test(placementFns) && !/Saving at map center/.test(html));
assert("15 rejected center helper ignores center", Place.placeObservation({ mapCenter: { lat: 41.325, lng: -74.8 } }).ok === false);

assert("16 radar toggle does not place observations", !/obsDraft|draftForSave|openAddObservationFlow/.test(wash));
assert("16 placement module does not touch radar", !/radar|heatVisible|displayIntensity|setHeatVisible/i.test(read("apps/shed-hunting/js/sheds-observation-place.js")));

assert("17 sheet scrolls and stacks at 390", /@media \(max-width:\s*390px\)[\s\S]*#sheet-obs \.sheds-actions--compact/.test(css));
assert("17 placement hud fits 320", /@media \(max-width:\s*320px\)[\s\S]*sheds-obs-place-hud/.test(css));
assert("17 location source is in the sheet", /id="obs-location-source">Location required/.test(html));

assert("18 normal taps do not save an observation", /if \(!state\.searchPlaceArmed\) return;/.test(clickHandler) && /if \(state\.obsPlaceArmed\)/.test(clickHandler) && !/Store\.create/.test(clickHandler));
assert("18 armed tap selects and returns", /selectionFromMapTap/.test(clickHandler) && /openSheet\(els\.sheetObs\)/.test(clickHandler));

assert("schema stays version 2", /SCHEMA_VERSION = 2/.test(storeSrc) && Store.SCHEMA_VERSION === 2);
assert("fifteen map-note types remain", Store.OBSERVATION_TYPES.length === 15);
assert("cap remains 500", /MAX_OBS = 500/.test(storeSrc));
assert("accuracy gate remains 80 m", Store.OBS_GPS_ACCURACY_MAX_M === 80 && Place.DEFAULT_MAX_ACCURACY_M === 80);
assert("more still leads with add observation", /id="btn-add-obs">Add Observation/.test(html));
assert("place module loads before the map", html.indexOf("sheds-observation-place.js") < html.indexOf("sheds-map-app.js") && html.indexOf("sheds-observation-place.js") > html.indexOf("sheds-nav-course.js"));
assert("host prepare lists the place module", /sheds-observation-place\.js/.test(read("scripts/prepare-shed-hunting-host.mjs")));
assert("exact 80 m GPS is usable", Place.gpsCandidate({ lat: 41, lng: -74, accuracyM: 80 }).ok === true);
assert("null accuracy is not usable", Place.gpsCandidate({ lat: 41, lng: -74, accuracyM: null }).reason === "poor");
assert("accepted GPS save keeps that fix", Place.draftForSave(good).location.accuracyM === 12);

console.log(passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
