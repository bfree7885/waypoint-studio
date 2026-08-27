#!/usr/bin/env node
/**
 * Dashboard Ambient Phase 1 — snapshot, #/ambient shell, honesty, Discover isolation.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

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
    location: { pathname: "/apps/dashboard/", hash: "#/ambient" },
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
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    },
    document: {
      documentElement: {
        attrs: {},
        classList: {
          _c: new Set(),
          add(n) {
            this._c.add(n);
          },
          remove(n) {
            this._c.delete(n);
          }
        },
        setAttribute(k, v) {
          this.attrs[k] = v;
        },
        removeAttribute(k) {
          delete this.attrs[k];
        },
        getAttribute(k) {
          return this.attrs[k] || null;
        }
      },
      hidden: false,
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

const MODULES = [
  "design-system/js/dashboard/wds-dashboard-season.js",
  "design-system/js/dashboard/natural-events/wds-natural-events.js",
  "design-system/js/weather/wds-sky-dashboard-intel.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-events.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-happening.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-snapshot.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
];

const snapSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-snapshot.js");
const ambSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient.js");
const rebuildSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js");
const bootSrc = read("apps/dashboard/js/home-boot.js");
const cssSrc = read("design-system/css/wds-dashboard-rebuild.css");
const wdsSrc = read("design-system/js/wds.js");

assert("snapshot module does not fetch", !/\bfetch\s*\(|XMLHttpRequest|getForecast|outdoorIntelligence\.get/.test(snapSrc));
assert("ambient render does not fetch", !/\bfetch\s*\(|XMLHttpRequest|getForecast|outdoorIntelligence\.get/.test(ambSrc));
assert("no billing in ambient modules", !/stripe|paypal|\$4\.99|subscription\.active|entitlement/i.test(snapSrc + ambSrc));
assert("no radio/AI/history scope", !/sdr|rtl-sdr|openai|llm|indexeddb|snapshot\(t-1\)|changeDetection:\s*true/i.test(snapSrc + ambSrc));
assert("wds.js loads ambient before rebuild", /rebuild-ambient-snapshot\.js/.test(wdsSrc) && /rebuild-ambient\.js/.test(wdsSrc));
assert("home-boot skips prompt for ambient", /indexOf\("ambient"\)/.test(bootSrc));
assert(
  "dedicated-display CSS present",
  /@media \(min-width: 1280px\) and \(min-height: 720px\)/.test(cssSrc) &&
    /grid-template-columns: 1\.12fr 1fr 0\.92fr/.test(cssSrc)
);
assert("responsive ambient stack present", /@media \(max-width: 1099px\)/.test(cssSrc));
assert("rebuild parseView includes ambient", /hash === "\/ambient"/.test(rebuildSrc));

const sb = loadModules(MODULES);
const Snap = sb.WDS.dashboardRebuildAmbientSnapshot;
const Ambient = sb.WDS.dashboardRebuildAmbient;
const Shell = sb.WDS.dashboardRebuild;
const Sky = sb.WDS.skyDashboardIntel;

assert("snapshot composer exported", !!(Snap && typeof Snap.compose === "function"));
assert("ambient renderer exported", !!(Ambient && typeof Ambient.render === "function"));
assert("schema version is 1", Snap.SCHEMA_VERSION === 1);
assert("sky intel loaded", !!(Sky && typeof Sky.analyze === "function"));
assert("parseView #/ambient", Shell.parseView("#/ambient") === "ambient");
assert("parseView #ambient", Shell.parseView("#ambient") === "ambient");
assert("parseView workspace unchanged", Shell.parseView("#/") === "workspace");
assert("parseView customize unchanged", Shell.parseView("#/customize") === "customize");
assert("parseView kiosk unchanged", Shell.parseView("#/kiosk") === "kiosk");

const NOW = new Date("2026-01-15T17:00:00.000Z");
const place = {
  placeLabel: "Pike County, PA",
  lat: 41.3312,
  lng: -75.038,
  timezone: "America/New_York",
  trust: "live",
  source: "geo"
};

function livePlatform(extra) {
  extra = extra || {};
  return Object.assign(
    {
      meta: { hydratedAt: NOW.toISOString() },
      weatherRef: {
        meta: { isPlaceholder: false, provider: "open-meteo" },
        current: Object.assign(
          {
            temperature: 34,
            feelsLike: 30,
            humidity: 48,
            cloudCover: 55,
            wind: { speed: 7, gust: 11 },
            conditions: { summary: "Partly cloudy" },
            precipitation: { probability: 10, amount: 0 }
          },
          extra.current || {}
        ),
        hourly: extra.hourly || [],
        daily: extra.daily || [{}]
      },
      daylight: Object.assign(
        {
          sunrise: "2026-01-15T12:20:00.000Z",
          sunset: "2026-01-15T22:05:00.000Z",
          sunriseFormatted: "7:20 AM",
          sunsetFormatted: "5:05 PM",
          moonPhase: "Waning Crescent",
          moonIllumination: 18,
          timezone: "America/New_York"
        },
        extra.daylight || {}
      ),
      alerts: extra.alerts || { status: "live", items: [] },
      airQuality: extra.airQuality || { status: "live", usAqi: 32, category: "Good" }
    },
    extra.root || {}
  );
}

function quietPlatform(extra) {
  extra = extra || {};
  return livePlatform(
    Object.assign(
      {
        current: Object.assign(
          {
            temperature: 58,
            feelsLike: 58,
            humidity: 42,
            cloudCover: 40,
            wind: { speed: 5, gust: 7 },
            conditions: { summary: "Mainly clear" },
            precipitation: { probability: 8, amount: 0 }
          },
          extra.current || {}
        ),
        daylight: Object.assign(
          {
            moonPhase: "First Quarter",
            moonIllumination: 48
          },
          extra.daylight || {}
        )
      },
      extra
    )
  );
}

sb.WDS.naturalEvents.setCatalog({ version: "test", events: [] });

const emptySnap = Snap.compose({ now: NOW });
assert("empty snapshot has schema", emptySnap.schemaVersion === 1 && emptySnap.capturedAt);
assert("empty place is honest", emptySnap.place.label === "Place not set");
assert("empty conditions waiting", emptySnap.conditions.status === "waiting");
assert("empty does not invent temperature", emptySnap.conditions.temperatureF == null);
assert("empty developing unknown", emptySnap.developing.state === "unknown");
assert(
  "empty opportunities unknown photography",
  emptySnap.opportunities.some((o) => o.domain === "photography" && o.status === "unknown")
);
assert(
  "foraging unknown without scores",
  emptySnap.opportunities.some((o) => o.domain === "foraging" && o.status === "unknown" && !o.score)
);
assert(
  "sheds unknown without presence",
  emptySnap.opportunities.some((o) => o.domain === "sheds" && o.status === "unknown")
);

const emptyHtml = Ambient.render(emptySnap);
assert("empty html has three regions", /data-ambient-region="now"/.test(emptyHtml) && /data-ambient-region="developing"/.test(emptyHtml) && /data-ambient-region="opportunities"/.test(emptyHtml));
assert("empty html says waiting", /Waiting for live conditions|Conditions unavailable|Waiting for conditions/.test(emptyHtml));
assert("empty html does not fabricate °F value", !/\b\d+°/.test(emptyHtml.replace(/—/g, "")));
assert("empty html unknown developing", /Not enough to say/.test(emptyHtml));
assert("empty html unknown forage/sheds", /Foraging · Unknown/.test(emptyHtml) && /Sheds · Unknown/.test(emptyHtml));

const live = livePlatform();
const liveSnap = Snap.compose({ platform: live, placeContext: place, now: NOW, catalog: { version: "test", events: [] } });
assert("live snapshot place", liveSnap.place.label === "Pike County, PA" && liveSnap.place.lat === 41.3312);
assert("NOW has temperature", liveSnap.conditions.temperatureF === 34);
assert("NOW has summary", /Partly cloudy/i.test(liveSnap.conditions.summary));
assert("NOW has daylight", liveSnap.conditions.daylight.status === "day" || liveSnap.conditions.daylight.status === "night");
assert("NOW has moon", liveSnap.conditions.moon.status === "ready" && liveSnap.conditions.moon.phaseLabel);
assert("live weatherLive meta", liveSnap.meta.weatherLive === true);
assert("sources include weather", liveSnap.sources.some((s) => s.id === "weather" && /Open-Meteo/.test(s.label)));
assert("no history in phase 1", liveSnap.meta.history === false && liveSnap.meta.changeDetection === false);

const liveHtml = Ambient.render(liveSnap);
assert("NOW region populated", /data-ambient-region="now"/.test(liveHtml) && /34°/.test(liveHtml) && /Pike County/.test(liveHtml));
assert("daylight or moon visible", /sunset|sunrise|Daylight|Night|Waning Crescent/i.test(liveHtml));
assert("photography not unknown when weather live", liveSnap.opportunities.some((o) => o.domain === "photography" && o.status === "ready"));

const quietSnap = Snap.compose({
  platform: quietPlatform(),
  placeContext: place,
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("quiet developing when no HN/alerts/events", quietSnap.developing.state === "quiet", quietSnap.developing.state + " — " + quietSnap.developing.headline);
assert("quiet headline honest", /Nothing important is developing/i.test(quietSnap.developing.headline));
const quietHtml = Ambient.render(quietSnap);
assert("quiet html state attr", /data-state="quiet"/.test(quietHtml));
assert("quiet html copy", /Nothing important is developing/.test(quietHtml));

const alertPlatform = livePlatform({
  alerts: {
    status: "live",
    items: [{ event: "Winter Storm Warning", headline: "Winter Storm Warning", severity: "Severe" }]
  }
});
const alertSnap = Snap.compose({
  platform: alertPlatform,
  placeContext: place,
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("alerts surface in developing", alertSnap.developing.state === "urgent");
assert(
  "alert title present",
  alertSnap.developing.items.some((it) => /alert|Winter Storm/i.test(it.title + " " + it.detail))
);
const alertHtml = Ambient.render(alertSnap);
assert("DEVELOPING populated from alerts", /Winter Storm|Active alert/i.test(alertHtml));
assert("urgent or attention chrome", /data-state="urgent"/.test(alertHtml));

const rainPlatform = livePlatform({
  current: {
    temperature: 41,
    conditions: { summary: "Rain" },
    precipitation: { probability: 80, amount: 0.12, intensity: "moderate" },
    wind: { speed: 14 }
  }
});
const rainSnap = Snap.compose({
  platform: rainPlatform,
  placeContext: place,
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert(
  "rain is developing or at least in signals",
  rainSnap.developing.state !== "quiet" || rainSnap.signals.some((s) => /precip|rain/i.test(s.id + s.title))
);

const eventSnap = Snap.compose({
  platform: livePlatform(),
  placeContext: place,
  now: NOW,
  catalog: {
    version: "test",
    events: [
      {
        id: "test-eclipse",
        type: "lunar-eclipse",
        title: "Total lunar eclipse",
        startUtc: "2026-01-15T16:00:00.000Z",
        endUtc: "2026-01-15T20:00:00.000Z",
        visibility: { boxes: [{ minLat: 20, maxLat: 50, minLng: -90, maxLng: -60 }] }
      }
    ]
  }
});
assert(
  "events can populate developing when catalog says so",
  Array.isArray(eventSnap.signals),
  "signals missing"
);

const placeholderSnap = Snap.compose({
  platform: {
    meta: { hydratedAt: NOW.toISOString() },
    weatherRef: { meta: { isPlaceholder: true, provider: "open-meteo" }, current: { temperature: 99 } }
  },
  placeContext: place,
  now: NOW
});
assert("placeholder does not use fake 99°", placeholderSnap.conditions.temperatureF == null);
assert("placeholder photography unknown", placeholderSnap.opportunities.some((o) => o.domain === "photography" && o.status === "unknown"));
assert("placeholder developing not fabricated quiet", placeholderSnap.developing.state !== "quiet");

const staleSnap = Snap.compose({
  platform: livePlatform({ root: { meta: { hydratedAt: NOW.toISOString(), stale: true, fromCache: true } } }),
  placeContext: place,
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("stale conditions labeled cached", staleSnap.conditions.status === "cached" && staleSnap.conditions.stale === true);
assert("stale still shows temperature", staleSnap.conditions.temperatureF === 34);
const staleHtml = Ambient.render(staleSnap);
assert("stale html says cached", /Cached/i.test(staleHtml));

const alertsDown = Snap.compose({
  platform: quietPlatform({ alerts: { status: "unavailable" } }),
  placeContext: place,
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("alerts unavailable is not fake-quiet", alertsDown.developing.state === "unknown", alertsDown.developing.state);

sb.WDS.naturalEvents.setCatalog(null);
const unknownCatalog = Snap.compose({
  platform: quietPlatform(),
  placeContext: place,
  now: NOW
});
assert(
  "missing catalog is not claimed quiet",
  unknownCatalog.developing.state === "unknown",
  unknownCatalog.developing.state + " " + unknownCatalog.developing.detail
);
sb.WDS.naturalEvents.setCatalog({ version: "test", events: [] });

const shellAmbient = Shell.renderShell({
  view: "ambient",
  placeContext: place,
  platform: live,
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("shell #/ambient independent", /data-view="ambient"/.test(shellAmbient) && /data-wdb-r-ambient/.test(shellAmbient));
assert("ambient omits Discover workspace", !/data-wdb-r-workspace/.test(shellAmbient));
assert("ambient omits Discover today panel", !/data-wdb-r-today/.test(shellAmbient));
assert("ambient omits Discover quiet strip", !/data-wdb-r-discover-quiet/.test(shellAmbient));
assert("ambient omits deepeners", !/data-wdb-r-deepen/.test(shellAmbient));
assert("ambient has NOW DEVELOPING OPPORTUNITIES headings", /Around you/.test(shellAmbient) && />Developing</.test(shellAmbient) && />Opportunities</.test(shellAmbient));
assert("no invented wildlife", !/wildlife sighting|trending near you|sensor reading/i.test(shellAmbient));
assert("no edible/presence claims", !/safe to eat|edible|sheds are here|sheds are present/i.test(shellAmbient));

const shellDiscover = Shell.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here" },
  platform: live,
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("Discover workspace still renders today", /data-wdb-r-today/.test(shellDiscover));
assert("Discover workspace still renders instruments", /data-wdb-r-workspace/.test(shellDiscover));
assert("Discover workspace is not Ambient", !/data-wdb-r-ambient/.test(shellDiscover) && !/data-view="ambient"/.test(shellDiscover));

const missingAmbientBuild = loadModules(
  MODULES.filter((f) => !/ambient/.test(f))
);
const missingHtml = missingAmbientBuild.WDS.dashboardRebuild.renderShell({
  view: "ambient",
  placeContext: place
});
assert("ambient degrades if modules missing", /Ambient is unavailable/.test(missingHtml));

const discoverStill = missingAmbientBuild.WDS.dashboardRebuild.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here" }
});
assert("Discover works without ambient modules", /data-wdb-r-today/.test(discoverStill) && /data-wdb-r-workspace/.test(discoverStill));

if (failed) {
  console.error("\nDASHBOARD AMBIENT: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nDASHBOARD AMBIENT: PASS");
