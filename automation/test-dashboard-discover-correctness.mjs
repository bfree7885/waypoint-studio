#!/usr/bin/env node
/**
 * Dashboard Discover correctness — season guardrails, natural events, quiet-day.
 * Acceptance: Westfall Township PA, 2026-08-25 lunar eclipse horizon.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
let failed = 0;

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failed++;
    console.log("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function loadModules(files) {
  const sandbox = {
    console,
    location: { pathname: "/apps/dashboard/", hash: "" },
    localStorage: {
      _d: {},
      getItem(k) {
        return this._d[k] == null ? null : this._d[k];
      },
      setItem(k, v) {
        this._d[k] = String(v);
      },
      removeItem(k) {
        delete this._d[k];
      }
    },
    matchMedia() {
      return { matches: false };
    },
    requestAnimationFrame(fn) {
      fn();
    },
    fetch() {
      return Promise.reject(new Error("network disabled in unit test"));
    },
    document: {
      querySelector() {
        return null;
      }
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.WDS = {};
  for (const f of files) {
    vm.runInNewContext(read(f), sandbox, { filename: f });
  }
  return sandbox;
}

const catalog = JSON.parse(read("design-system/js/dashboard/natural-events/events.json"));
const pike = JSON.parse(read("design-system/content-engine/regions/pike-county-pa.json"));
const WESTFALL = {
  lat: 41.3312,
  lng: -75.038,
  timezone: "America/New_York",
  placeLabel: "Westfall Township, PA"
};
const AUG25 = new Date("2026-08-25T16:00:00-04:00");
const AUG27_AFTERNOON = new Date("2026-08-27T16:00:00-04:00");
const AUG27_NIGHT = new Date("2026-08-28T03:00:00.000Z"); /* 11:00 PM EDT 27th — in progress */
const AUG28_MORNING = new Date("2026-08-28T12:00:00.000Z"); /* 8:00 AM EDT — ended */
const JAN15 = new Date("2026-01-15T12:00:00-05:00");
const TOKYO = { lat: 35.68, lng: 139.69, timezone: "Asia/Tokyo", placeLabel: "Tokyo" };

const sb = loadModules([
  "design-system/js/weather/wds-daylight-utils.js",
  "design-system/js/dashboard/wds-dashboard-season.js",
  "design-system/js/dashboard/natural-events/wds-natural-events.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/platform/wds-publishing-match.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-events.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-happening.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
]);

const Season = sb.WDS.dashboardSeason;
const NE = sb.WDS.naturalEvents;
const Events = sb.WDS.dashboardRebuildEvents;
const Today = sb.WDS.dashboardRebuildToday;
const Shell = sb.WDS.dashboardRebuild;
const Deepen = sb.WDS.dashboardRebuildDeepeners;
const Gfx = sb.WDS.dashboardRebuildGraphics;
const Daylight = sb.WDS.daylightUtils;
const Data = sb.WDS.dashboardRebuildData;

assert("season module loaded", !!(Season && Season.calendarSeason));
assert("natural events module loaded", !!(NE && NE.evaluateEvent));
assert("catalog has lunar eclipse", catalog.events.some((e) => e.id === "lunar-eclipse-2026-08-28"));
assert("pike bundle carries freshness", pike.weekOf === "2026-05-30" && !!pike.editorialValidUntil);

NE.setCatalog(catalog);

/* ——— Season guardrails ——— */
const paAug = Season.calendarSeason({ now: AUG25, lat: WESTFALL.lat, timeZone: WESTFALL.timezone });
assert("PA Aug 25 is late summer", paAug.label === "late summer" && paAug.hemisphere === "north", JSON.stringify(paAug));

const chileAug = Season.calendarSeason({ now: AUG25, lat: -33.45, timeZone: "America/Santiago" });
assert("southern Aug is late winter", chileAug.label === "late winter" && chileAug.hemisphere === "south", JSON.stringify(chileAug));

assert(
  "spring phenology forbidden in PA August",
  Season.phenologyForbidden(pike.regionalIntelligenceProfile.phenologyStage, paAug)
);
assert(
  "editorial May week is stale on Aug 25",
  !Season.isEditorialFresh({ now: AUG25, weekOf: "2026-05-30", validUntil: pike.editorialValidUntil })
);
assert(
  "editorial May week is fresh on June 1",
  Season.isEditorialFresh({ now: new Date("2026-06-01T12:00:00Z"), weekOf: "2026-05-30", validUntil: pike.editorialValidUntil })
);
assert(
  "undated editorial is not fresh",
  !Season.isEditorialFresh({ now: AUG25 })
);

const guarded = Season.guardPackage(
  {
    location: { latitude: WESTFALL.lat, longitude: WESTFALL.lng },
    timezone: WESTFALL.timezone,
    calendar: {
      season: "late spring",
      weekOf: "2026-05-30",
      editorialValidUntil: pike.editorialValidUntil
    },
    phenology: {
      status: "editorial",
      stage: pike.regionalIntelligenceProfile.phenologyStage
    },
    daylight: { status: "editorial", source: "editorial", sunrise: "05:42", sunset: "20:18" }
  },
  { now: AUG25, lat: WESTFALL.lat, timeZone: WESTFALL.timezone }
);
assert("guard replaces calendar with late summer", guarded.calendar.season === "late summer");
assert("guard keeps editorialSeason for provenance", guarded.calendar.editorialSeason === "late spring");
assert("guard omits stale phenology", guarded.phenology.status === "omitted" && !guarded.phenology.stage);
assert("guard strips clock-only editorial daylight", guarded.daylight.sunrise == null && guarded.daylight.sunset == null);

const display = Season.displayLine(
  {
    location: { latitude: WESTFALL.lat },
    calendar: { season: "late spring", weekOf: "2026-05-30", editorialValidUntil: pike.editorialValidUntil },
    phenology: { stage: pike.regionalIntelligenceProfile.phenologyStage }
  },
  { now: AUG25, lat: WESTFALL.lat, timeZone: WESTFALL.timezone }
);
assert("display line is computed calendar", display && /Calendar: late summer/.test(display.text), JSON.stringify(display));
assert(
  "impossible copy detector",
  Season.containsImpossibleSeasonCopy("late spring — morels may be ending", {
    now: AUG25,
    lat: WESTFALL.lat,
    timeZone: WESTFALL.timezone
  })
);

const todayStale = Today.render({
  placeLabel: WESTFALL.placeLabel,
  trust: "live",
  now: AUG25,
  location: WESTFALL,
  platform: {
    weatherRef: { meta: { isPlaceholder: false, provider: "open-meteo" }, current: { temperature: 78 } },
    calendar: { season: "late spring", weekOf: "2026-05-30" },
    phenology: { stage: pike.regionalIntelligenceProfile.phenologyStage }
  }
});
assert("A: no late spring on Aug 25", !/late spring/i.test(todayStale));
assert("A: no morel copy", !/morel/i.test(todayStale));
assert("A: no mountain laurel opening", !/mountain laurel/i.test(todayStale));
assert("A: no ephemeral fading", !/ephemeral/i.test(todayStale));

/* ——— Natural events: eclipse acceptance ——— */
const eclipse = catalog.events[0];
const upcoming = NE.evaluateEvent(eclipse, {
  now: AUG25,
  lat: WESTFALL.lat,
  lng: WESTFALL.lng,
  timeZone: WESTFALL.timezone
});
assert("A: eclipse upcoming on Aug 25 PA", upcoming.state === "upcoming", upcoming.state);
assert("A: kicker coming soon not right now", /COMING SOON/i.test(upcoming.kicker) && !/HAPPENING NOW|RIGHT NOW/.test(upcoming.kicker));
assert("A: Thursday night label", /THU NIGHT/i.test(upcoming.kicker), upcoming.kicker);
assert("A: local maximum not UTC", /12:1[23]\s*AM/i.test(upcoming.local.greatest) && !/04:12/.test(upcoming.local.greatest), upcoming.local.greatest);
assert("A: partial starts Thursday evening local", /10:33\s*PM/i.test(upcoming.local.partialStart), upcoming.local.partialStart);
assert("A: provenance sources present", upcoming.sources.some((s) => /EclipseWise|NASA/i.test(s.name)));

const tonight = NE.evaluateEvent(eclipse, {
  now: AUG27_AFTERNOON,
  lat: WESTFALL.lat,
  lng: WESTFALL.lng,
  timeZone: WESTFALL.timezone
});
assert("B: afternoon of eclipse is tonight", tonight.state === "tonight", tonight.state);

const happening = NE.evaluateEvent(eclipse, {
  now: AUG27_NIGHT,
  lat: WESTFALL.lat,
  lng: WESTFALL.lng,
  timeZone: WESTFALL.timezone
});
assert("B: during window is happening", happening.state === "happening", happening.state);
assert("B: happening kicker", /HAPPENING NOW/i.test(happening.kicker));

const ended = NE.evaluateEvent(eclipse, {
  now: AUG28_MORNING,
  lat: WESTFALL.lat,
  lng: WESTFALL.lng,
  timeZone: WESTFALL.timezone
});
assert("C: after eclipse ended", ended.state === "ended", ended.state);
assert(
  "C: ended not in active discover",
  NE.activeDiscoverEvents({
    catalog,
    now: AUG28_MORNING,
    lat: WESTFALL.lat,
    lng: WESTFALL.lng,
    timeZone: WESTFALL.timezone
  }).length === 0
);

const tokyo = NE.evaluateEvent(eclipse, {
  now: AUG25,
  lat: TOKYO.lat,
  lng: TOKYO.lng,
  timeZone: TOKYO.timezone
});
assert("D: Tokyo not locally visible", tokyo.visible === false && tokyo.state === "not-visible", tokyo.reason);
assert(
  "D: Tokyo not in active discover",
  NE.activeDiscoverEvents({
    catalog,
    now: AUG25,
    lat: TOKYO.lat,
    lng: TOKYO.lng,
    timeZone: TOKYO.timezone
  }).length === 0
);

assert("missing event data → invalid/not shown", NE.lifecycle({ windows: {} }, AUG25, WESTFALL.timezone) === "invalid");

const liveWx = {
  meta: { hydratedAt: "2026-08-25T20:00:00.000Z" },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo" },
    current: { temperature: 78, cloudCover: 20, conditions: { summary: "Clear" } },
    hourly: [
      { time: "2026-08-28T04:00:00.000Z", cloudCover: 18 },
      { time: "2026-08-28T05:00:00.000Z", cloudCover: 22 }
    ]
  },
  daylight: {
    status: "live",
    sunsetFormatted: "7:43 PM",
    goldenHourEvening: "6:43–7:43 PM",
    moonPhase: "Full moon",
    moonPhaseValue: 0.5,
    moonIllumination: 98
  },
  alerts: { status: "live", items: [] },
  airQuality: { status: "live", usAqi: 38, category: "Good" }
};

const cloudyWx = {
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo" },
    current: { cloudCover: 90 },
    hourly: [{ time: "2026-08-28T04:12:00.000Z", cloudCover: 92 }]
  }
};
const outlookClear = NE.evaluateEvent(eclipse, {
  now: AUG25,
  lat: WESTFALL.lat,
  lng: WESTFALL.lng,
  timeZone: WESTFALL.timezone,
  platform: liveWx
});
assert("weather synthesis promising", outlookClear.outlook && outlookClear.outlook.tone === "promising", JSON.stringify(outlookClear.outlook));
const outlookHard = NE.evaluateEvent(eclipse, {
  now: AUG25,
  lat: WESTFALL.lat,
  lng: WESTFALL.lng,
  timeZone: WESTFALL.timezone,
  platform: cloudyWx
});
assert("weather synthesis difficult", outlookHard.outlook && outlookHard.outlook.tone === "difficult");
assert("no invented viewing score", !/score|%\s*chance of seeing/i.test(JSON.stringify(outlookClear.copy)));

const shellA = Shell.renderShell({
  view: "workspace",
  placeContext: WESTFALL,
  platform: liveWx,
  now: AUG25,
  catalog
});
assert("A: eclipse card present", /data-wdb-r-events/.test(shellA) && /lunar eclipse/i.test(shellA));
assert("A: quiet strip absent when eclipse approaching", !/data-wdb-r-discover-quiet/.test(shellA));
assert("A: not labeled Right now", !/data-event-state="happening"/.test(shellA));
assert("A: coming soon kicker", /COMING SOON/i.test(shellA));
assert("A: Based on what present", /Based on what\?/.test(shellA));
assert("A: EclipseWise provenance in why panel", /EclipseWise|NASA GSFC/.test(shellA));

const shellB = Shell.renderShell({
  view: "workspace",
  placeContext: WESTFALL,
  platform: liveWx,
  now: AUG27_NIGHT,
  catalog
});
assert("B: happening state in DOM", /data-event-state="happening"/.test(shellB));
assert("B: not quiet during eclipse", !/data-wdb-r-discover-quiet/.test(shellB));

const shellC = Shell.renderShell({
  view: "workspace",
  placeContext: WESTFALL,
  platform: liveWx,
  now: AUG28_MORNING,
  catalog
});
assert("C: no event card after eclipse", !/data-wdb-r-events/.test(shellC));

const shellD = Shell.renderShell({
  view: "workspace",
  placeContext: TOKYO,
  platform: liveWx,
  now: AUG25,
  catalog
});
assert("D: no watch-the-eclipse for Tokyo", !/Visible from this region/i.test(shellD));
assert("D: no local viewing recommendation", !/Watch the eclipse tonight/i.test(shellD));

const shellE = Shell.renderShell({
  view: "workspace",
  placeContext: WESTFALL,
  platform: liveWx,
  now: JAN15,
  catalog
});
assert("E: truly quiet day allowed", /data-wdb-r-discover-quiet/.test(shellE));
assert("E: no filler event invented", !/data-wdb-r-events/.test(shellE));
assert("E: quiet checks all categories copy", /natural events/i.test(shellE));

NE.setCatalog(null);
const shellMissing = Shell.renderShell({
  view: "workspace",
  placeContext: WESTFALL,
  platform: liveWx,
  now: AUG25
});
assert("missing catalog does not invent eclipse", !/lunar eclipse/i.test(shellMissing));
NE.setCatalog(catalog);

const alertPlatform = {
  meta: { hydratedAt: "2026-08-25T20:00:00.000Z" },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo" },
    current: {
      temperature: 52,
      wind: { speed: 38, gust: 52 },
      conditions: { summary: "Windy" }
    }
  },
  alerts: {
    status: "live",
    items: [{ event: "Wind Advisory", headline: "Wind Advisory" }]
  },
  daylight: liveWx.daylight
};
const shellF = Shell.renderShell({
  view: "workspace",
  placeContext: WESTFALL,
  platform: alertPlatform,
  now: AUG25,
  catalog
});
assert("F: eclipse still present with weather", /lunar eclipse/i.test(shellF) && /data-wdb-r-events/.test(shellF));
assert("F: weather HN not erased", /data-wdb-r-hn/.test(shellF) || /Wind Advisory|official alert/i.test(shellF));

/* Failed fetch */
NE.setCatalog(null);
assert("failed event data omits rather than invents", NE.activeDiscoverEvents({ now: AUG25, lat: WESTFALL.lat, lng: WESTFALL.lng, timeZone: WESTFALL.timezone }).length === 0);
NE.setCatalog(catalog);

/* Deepener: no eclipse story in catalog → no understand filler */
const understand = Deepen.resolveUnderstand({
  now: AUG25,
  location: WESTFALL,
  platform: liveWx,
  catalog
});
assert("no invented eclipse deepener", understand == null || !understand.title);

/* Moon / solar honesty */
assert("moon phase label near full", Daylight.moonPhaseLabel(0.5) === "Full moon");
assert("moon illum at full", Daylight.moonIlluminationPercent(0.5) === 100);
assert("moon illum at new", Daylight.moonIlluminationPercent(0.0) === 0);
const keyFull = Gfx.moonPhaseKey("Full moon", 98, 0.5);
assert("moon graphic key matches full", keyFull === "full", keyFull);
const moonHtml = Gfx.render({ kind: "moon", value: 98, phase: "Full moon", phaseValue: 0.5 });
assert("moon graphic exposes phase key", /data-phase-key="full"/.test(moonHtml));
assert("moon graphic illum near 98", /data-illum="98"/.test(moonHtml));

const gh = Daylight.goldenHourWindows("2026-08-25T06:12:00", "2026-08-25T19:43:00", "America/New_York");
assert("golden hour evening starts ~60 min before sunset", gh && /6:43/.test(gh.evening) && /7:43/.test(gh.evening), JSON.stringify(gh));
assert("day length location-aware", Daylight.dayLengthHours("2026-08-25T06:12:00", "2026-08-25T19:43:00", "America/New_York") > 12);

const lines = Data.composeTodayLines(liveWx);
assert("outside today does not dump temperature number", !lines.some((l) => /\d+°F under/.test(l)));
assert("outside today synthesizes sky", lines.some((l) => /sky looks/i.test(l)));
assert("outside today omits Good AQI filler", !lines.some((l) => /Air quality is Good/i.test(l)));

assert("docs describe quiet as multi-category", /quiet weather/i.test(read("docs/DASHBOARD-DISCOVER.md")) === false || /natural events/i.test(read("docs/DASHBOARD-DISCOVER.md")));
assert("docs distinguish calendar vs phenology", /Calendar season vs phenology/.test(read("docs/DASHBOARD-DISCOVER.md")));
assert("wds.js loads season + events", /wds-dashboard-season\.js/.test(read("design-system/js/wds.js")) && /wds-natural-events\.js/.test(read("design-system/js/wds.js")));

if (failed) {
  console.error("\nDASHBOARD DISCOVER CORRECTNESS: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nDASHBOARD DISCOVER CORRECTNESS: PASS");
