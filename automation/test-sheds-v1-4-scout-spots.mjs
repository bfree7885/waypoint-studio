#!/usr/bin/env node
/**
 * Sheds V1.4 — Scout Spots store, honesty, import/export, hunt snapshot.
 * Run: node automation/test-sheds-v1-4-scout-spots.mjs
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

function load(opts) {
  opts = opts || {};
  const storage = opts.storage || memoryStorage();
  const sandbox = {
    console,
    localStorage: storage,
    crypto: { randomUUID: function () { return "test-" + Math.random().toString(16).slice(2); } }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const files = opts.files || [
    "apps/shed-hunting/js/sheds-today-hunt.js",
    "apps/shed-hunting/js/sheds-search-priority.js",
    "apps/shed-hunting/js/sheds-scout-spot-store.js",
    "apps/shed-hunting/js/sheds-observation-store.js",
    "apps/shed-hunting/js/sheds-session-store.js",
    "apps/shed-hunting/js/sheds-search-area-store.js",
    "apps/shed-hunting/js/sheds-validation-store.js",
    "apps/shed-hunting/js/sheds-models.js",
    "apps/shed-hunting/js/sheds-import-json.js"
  ];
  files.forEach(function (rel) {
    vm.runInNewContext(read(rel), sandbox, { filename: rel });
  });
  sandbox.storage = storage;
  return sandbox;
}

const html = read("apps/shed-hunting/map/index.html");
const css = read("apps/shed-hunting/css/sheds-map.css");
const app = read("apps/shed-hunting/js/sheds-map-app.js");

assert("map loads scout store", /sheds-scout-spot-store\.js/.test(html));
assert("Inspect has Save Scout Spot", /id="btn-save-scout-spot"/.test(html) && /Save Scout Spot/.test(html));
assert("Scout HUD exists", /id="scout-hud"/.test(html));
assert("status Plan Checked Revisit in HUD", /data-scout-status="Plan"/.test(html) && /data-scout-status="Checked"/.test(html) && /data-scout-status="Revisit"/.test(html));
assert("Scout Spots list in More", /id="btn-scout-spots"/.test(html) && /id="sheet-scout-spots"/.test(html));
assert("legend names SCOUT", /SCOUT/.test(html));
assert("field note preserved in HUD", /Use the terrain as a search guide, not evidence that sheds are present/.test(html));
assert("map-app wires save from Inspect", /saveScoutSpotFromInspect/.test(app));
assert("export includes scoutSpots", /scoutSpots:\s*ScoutStore/.test(app));
assert("import refreshes scout markers", /refreshScoutSpots/.test(app));
assert("CSS overflow-x hidden on scout HUD", /\.sheds-scout-hud\s*\{[\s\S]{0,1200}?overflow-x:\s*hidden/.test(css));
assert("status buttons are 44px", /sheds-scout-status__btn[\s\S]{0,80}min-height:\s*2\.75rem/.test(css));
assert("no certainty copy in scout store", !/sheds are likely|find probability|deer are here/.test(read("apps/shed-hunting/js/sheds-scout-spot-store.js")));
assert("scout layer always on map", /scoutLayer = L\.layerGroup\(\)\.addTo\(map\)/.test(app));
assert("search-areas toggle does not gate scout layer", !/searchAreasVisible[^\n]{0,80}scoutLayer/.test(app));
assert("map does not hard-redirect to the dedicated host", !/location\.replace\([^)]*shedhunting\.org/.test(html + app));
assert("docs file present", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-V1-4-SCOUT-SPOTS.md")));
assert("prepare host copies the scout store", /apps\/shed-hunting/.test(read("scripts/prepare-shed-hunting-host.mjs")));

const sb = load();
const S = sb.WaypointShedsScoutSpots;
const SP = sb.WaypointShedsSearchPriority;
const Hunt = sb.WaypointShedsTodayHunt;

assert("store present", !!S && S.SCHEMA_VERSION === 1);
assert("empty list", S.list().length === 0);

const missingLoc = S.create({ name: "Nope" });
assert("create without location fails honestly", !missingLoc.ok && /location/i.test(missingLoc.error));

const failedPri = SP.evaluatePoint({
  zoom: 13,
  elevStatus: "failed",
  terrainStatus: "failed",
  raw: {}
});
const noTerrain = S.create({
  location: { lat: 39.64, lng: -105.82 },
  terrain: S.terrainFromPriority(failedPri),
  savedToday: S.snapshotFromHunt(null)
});
assert("save without terrain ok", noTerrain.ok, noTerrain.error);
assert("missing terrain is not Moderate", noTerrain.spot.terrain.searchPriority == null && noTerrain.spot.terrain.available === false);
assert("missing today snapshot unavailable", noTerrain.spot.savedToday.available === false);
assert("default status Plan", noTerrain.spot.status === "Plan");
assert("persists across list()", S.list().length === 1 && S.list()[0].id === noTerrain.spot.id);
const stored = JSON.parse(sb.storage.getItem(S.STORAGE_KEY));
assert("persist wraps schemaVersion", stored && stored.schemaVersion === 1 && Array.isArray(stored.scoutSpots));

const steep = SP.evaluatePoint({
  zoom: 13,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: { elevM: 2800, slopeDeg: 28, aspectDeg: 90, northM: 2860, southM: 2740, eastM: 2800, westM: 2800, stepM: 60 }
});
const wxGood = {
  ready: true,
  tempC: 8,
  windSpeedMs: 2,
  sunriseHour: 6.5,
  sunsetHour: 18.2,
  snowMm: 0,
  snowDepthKnown: true,
  snowDepthM: 0,
  snowCover: { status: "none", label: "No snow on the ground (measured)." },
  tempTrend: { status: "warming", label: "warming" },
  freezeThaw: { status: "freeze_thaw", label: "freeze then thaw" }
};
const hunt = Hunt.compose({
  now: new Date("2026-08-31T16:00:00-06:00"),
  location: { lat: 39.64, lng: -105.82, source: "saved-view" },
  weather: wxGood,
  weatherStatus: "ready"
});
const saved = S.create({
  location: { lat: 39.641, lng: -105.817 },
  terrain: S.terrainFromPriority(steep),
  savedToday: S.snapshotFromHunt(hunt),
  note: "Walk the bench above the creek."
});
assert("save from inspect-like payload", saved.ok, saved.error);
assert("priority Lower stored", saved.spot.terrain.searchPriority === "Lower");
assert("feature stored", !!saved.spot.terrain.featureKind);
assert("why stored", saved.spot.terrain.why.length > 0);
assert("today snapshot historical", saved.spot.savedToday.available === true && saved.spot.savedToday.band === hunt.band);
assert("createdAt present", !!saved.spot.createdAt);

const beforePri = steep.priority;
const afterPri = SP.evaluatePoint({
  zoom: 13,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: { elevM: 2800, slopeDeg: 28, aspectDeg: 90, northM: 2860, southM: 2740, eastM: 2800, westM: 2800, stepM: 60 }
});
assert("spot state does not change terrain priority", afterPri.priority === beforePri && afterPri.priority === "Lower");

const renamed = S.rename(saved.spot.id, "Geneva Creek bench");
assert("rename", renamed.ok && renamed.spot.name === "Geneva Creek bench");
const emptyName = S.rename(saved.spot.id, "   ");
assert("empty rename rejected", !emptyName.ok);

const noted = S.setNote(saved.spot.id, "Re-check after melt.");
assert("note editing", noted.ok && /melt/.test(noted.spot.note));

const checked = S.setStatus(saved.spot.id, "Checked");
assert("status Checked", checked.ok && checked.spot.status === "Checked");
const revisit = S.setStatus(saved.spot.id, "Revisit");
assert("status Revisit", revisit.ok && revisit.spot.status === "Revisit");
const bogusStatus = S.setStatus(saved.spot.id, "Hotspot");
assert("unknown status rejected", !bogusStatus.ok);
assert("status remains Revisit", S.getById(saved.spot.id).status === "Revisit");

const savedCtx = S.formatSavedContext(saved.spot.savedToday);
assert("saved context labeled historical", /when the spot was saved|historical/i.test(savedCtx.disclaimer));
const live = S.formatLiveToday(hunt);
assert("live today stays separate", /separate from the saved snapshot/i.test(live.disclaimer));
assert("live today does not rewrite stored band", S.getById(saved.spot.id).savedToday.band === hunt.band);

const exp = S.exportJson();
assert("export has scoutSpots array", Array.isArray(exp.scoutSpots) && exp.scoutSpots.length === 2);

const parsedScoutOnly = sb.WaypointShedsImport.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  scoutSpots: { scoutSpots: exp.scoutSpots }
}));
assert("scout-only export parses", parsedScoutOnly.ok && parsedScoutOnly.scoutSpots.length === 2);

const malformed = S.importList([
  { id: "spot_bad" },
  { id: "spot_ok", location: { lat: 40.1, lng: -105.1 }, name: "Imported", status: "Plan" },
  null,
  "nope"
]);
assert("malformed import skipped", malformed.ok && malformed.skipped >= 2 && malformed.added === 1);
assert("existing spots not destroyed", S.getById(saved.spot.id) && S.getById(saved.spot.id).name === "Geneva Creek bench");

const legacy = load();
legacy.storage.setItem(legacy.WaypointShedsScoutSpots.STORAGE_KEY, JSON.stringify({ not: "an array" }));
assert("legacy non-array storage yields empty list", legacy.WaypointShedsScoutSpots.list().length === 0);
legacy.storage.setItem(legacy.WaypointShedsScoutSpots.STORAGE_KEY, "not-json");
assert("corrupt JSON yields empty list", legacy.WaypointShedsScoutSpots.list().length === 0);
legacy.storage.setItem(legacy.WaypointShedsScoutSpots.STORAGE_KEY, JSON.stringify([
  { id: "spot_legacy", lat: 39.2, lng: -105.4, name: "Pre-wrap pin" }
]));
const legacyList = legacy.WaypointShedsScoutSpots.list();
assert("legacy array still loads", legacyList.length === 1 && legacyList[0].name === "Pre-wrap pin");
assert("legacy missing terrain unavailable", legacyList[0].terrain.available === false && legacyList[0].terrain.searchPriority == null);
assert("legacy missing today unavailable", legacyList[0].savedToday.available === false);
assert("legacy missing status is Plan", legacyList[0].status === "Plan");

const quota = memoryStorage();
const origSet = quota.setItem;
quota.setItem = function () { throw new Error("QuotaExceededError"); };
const fullSb = load({ storage: quota });
const fullSave = fullSb.WaypointShedsScoutSpots.create({ location: { lat: 1, lng: 2 } });
assert("storage full is honest", !fullSave.ok && /storage|full|unavailable/i.test(fullSave.error));
quota.setItem = origSet;

const del = S.remove(saved.spot.id);
assert("delete", del.ok && !S.getById(saved.spot.id));

const need = Hunt.compose({ location: null, weather: null });
const needSnap = S.snapshotFromHunt(need);
assert("Need location is not stored as current hunt", needSnap.available === false);

const laterHunt = Hunt.compose({
  now: new Date("2026-12-15T16:00:00-07:00"),
  location: { lat: 39.64, lng: -105.82, source: "saved-view" },
  weather: wxGood,
  weatherStatus: "ready"
});
assert(
  "saved context remains historical",
  S.getById(noTerrain.spot.id).savedToday.available === false &&
    saved.spot.savedToday.band === hunt.band &&
    laterHunt.band !== undefined
);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s):\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nSheds V1.4 Scout Spots tests passed (" + passed + ").");
