#!/usr/bin/env node
/**
 * Sheds — Today's Search scoring + honesty regressions.
 * Run: node automation/test-sheds-todays-search.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "failed"));
    console.log("FAIL", name, "—", detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const sandbox = { console, Math, isFinite, Number, String, Array, Object, Date };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(read("apps/shed-hunting/js/sheds-todays-search.js"), sandbox, {
  filename: "sheds-todays-search.js"
});

const TS = sandbox.WaypointShedsTodaysSearch;
assert("module exports build", !!(TS && typeof TS.build === "function"));

const loading = TS.build({
  weatherStatus: "loading",
  locationStatus: "loading"
});
assert("loading status", loading.status === "loading");
assert("loading has no fabricated windows", loading.timeWindows.length === 0);

const denied = TS.build({
  weather: null,
  weatherStatus: "unavailable",
  locationStatus: "denied",
  season: { phaseId: "peak_shed", phase: "Peak shed", supportLine: "lat heuristic" },
  now: new Date("2026-02-15T14:00:00")
});
assert("location denied status", denied.status === "location_denied");
assert("denied discloses uncertainty", /denied|unavailable|uncertain/i.test(JSON.stringify(denied)));
assert("denied does not claim high certainty", denied.confidence !== "High");

const richWx = {
  tempC: 1,
  windSpeedMs: 7,
  snowMm: 12,
  precipMm24h: 3,
  pressureTrend: "falling",
  sunriseHour: 7.1,
  sunsetHour: 17.6,
  sunriseLocal: "7:06 AM",
  sunsetLocal: "5:36 PM",
  source: "open-meteo"
};
const ready = TS.build({
  weather: richWx,
  weatherStatus: "ready",
  locationStatus: "ready",
  season: { phaseId: "peak_shed", phase: "Peak shed", supportLine: "lat heuristic" },
  patterns: {
    sufficient: false,
    insufficiencyReason: "Need more private observations."
  },
  now: new Date("2026-02-15T16:30:00")
});
assert("ready status", ready.status === "ready" || ready.status === "partial");
assert("three time windows", ready.timeWindows.length === 3);
assert("headline explains opportunity", /opportunity|workable|window|uncertain|limited|search|Favorable|conditions/i.test(ready.headline));
assert("confidence labeled", ["High", "Medium", "Moderate", "Low"].includes(ready.confidence));
assert("summary includes confidence", /Confidence:|Evidence support/i.test(ready.summaryLine));
assert("signals include weather fact", ready.signals.some((s) => s.kind === "fact" && /temp|wind|weather|daylight/i.test(s.label + s.text)));
assert("obs insufficiency honest", ready.signals.some((s) => /not enough|need/i.test(s.text)));
assert("disclaimer present", /not a prediction|not whether deer are more likely|find probability/i.test(ready.disclaimer));
assert("no moon certainty claims", !/moon.?phase predicts|guaranteed deer/i.test(JSON.stringify(ready).toLowerCase()));

const withPatterns = TS.build({
  weather: richWx,
  weatherStatus: "ready",
  locationStatus: "ready",
  season: { phaseId: "late_shed", phase: "Late shed", supportLine: "lat heuristic" },
  patterns: {
    sufficient: true,
    summary: "Pattern derived from 8 private observations — most notes in morning.",
    topHabitats: [{ id: "edge", label: "Edge / transition", count: 4 }]
  },
  plan: {
    ok: true,
    recommendation: { bearingLabel: "NE", distanceM: 180, band: "higher", suggestedRadiusM: 90 }
  },
  now: new Date("2026-02-15T07:30:00")
});
assert("pattern area included", withPatterns.areas.some((a) => a.kind === "observation"));
assert("planner area estimated", withPatterns.areas.some((a) => a.kind === "planner" && (a.epistemic === "estimated" || a.epistemic === "guidance")));
assert("best window morning-ish", withPatterns.bestWindowId === "morning" || withPatterns.timeWindows[0].score >= withPatterns.timeWindows[1].score);

// Static HTML contract
const html = read("apps/shed-hunting/map/index.html");
assert("Today’s Search eyebrow in map", /Field briefing|Today’s Search|Today.?s conditions/i.test(html));
assert("todays-search script included", /sheds-todays-search\.js/.test(html));
assert("today windows container", /id="today-windows"/.test(html));
assert(
  "no hard-coded sighting coordinates in map html",
  !/"lat"\s*:\s*\d|seedObservations|DEMO_SIGHTINGS/i.test(html)
);

const app = read("apps/shed-hunting/js/sheds-map-app.js");
const weatherSrc = read("apps/shed-hunting/js/sheds-weather.js");
assert("map uses TodaysSearch.build", /TodaysSearch\.build|refreshTodaysSearch/.test(app));
assert("open-meteo richer fetch", /surface_pressure/.test(weatherSrc) && /sunrise/.test(weatherSrc));
assert("map uses shared weather helper", /Weather\.fetchForecast/.test(app));
assert(
  "ensureWeatherForView exists for map-center weather",
  /function ensureWeatherForView/.test(app)
);
assert(
  "low-zoom path still fetches weather",
  /getZoom\(\) < 9[\s\S]{0,800}ensureWeatherForView/.test(app)
);
assert(
  "GPS deny path fetches map-center weather",
  /Permission denied[\s\S]{0,1200}ensureWeatherForView/i.test(app)
);
assert(
  "remembered GPS deny boot fetches weather",
  /wasGpsDenied\(\)[\s\S]{0,1200}probeGeolocationPermission[\s\S]{0,1200}ensureWeatherForView/.test(app) ||
    /Location was blocked earlier[\s\S]{0,400}ensureWeatherForView/.test(app)
);
assert(
  "glance softens Best window without weather",
  /Live conditions unavailable|weather_unavailable|NO_WEATHER|Seasonal window guess/.test(app)
);

const deniedWithWx = TS.build({
  weather: richWx,
  weatherStatus: "ready",
  locationStatus: "denied",
  season: { phaseId: "peak_shed", phase: "Peak shed", supportLine: "lat heuristic" },
  now: new Date("2026-02-15T14:00:00")
});
assert("denied+weather stays location_denied status", deniedWithWx.status === "location_denied");
assert("denied+weather discloses map-center", /map-center|map center/i.test(deniedWithWx.headline + JSON.stringify(deniedWithWx.uncertainties)));
assert("denied+weather not High solely from seasonal", deniedWithWx.confidence !== "High" || /weather|daylight/i.test(JSON.stringify(deniedWithWx.signals)));
assert("brief exposes weatherStatus", deniedWithWx.weatherStatus === "ready");

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Today's Search checks passed.");
