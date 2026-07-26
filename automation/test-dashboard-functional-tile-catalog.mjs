#!/usr/bin/env node
/**
 * Dashboard functional tile catalog — registry, payload, and customize suite.
 * Run: node automation/test-dashboard-functional-tile-catalog.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

function makeSandbox() {
  const sandbox = {
    console,
    document: {
      documentElement: {
        classList: { add() {}, remove() {}, contains() { return false; } }
      }
    },
    localStorage: {
      _d: Object.create(null),
      getItem(k) {
        return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null;
      },
      setItem(k, v) {
        this._d[k] = String(v);
      },
      removeItem(k) {
        delete this._d[k];
      }
    },
    matchMedia() {
      return { matches: false, addListener() {}, removeListener() {} };
    },
    Intl,
    navigator: { onLine: true },
    dispatchEvent() {},
    CustomEvent: class {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    }
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  [
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js"
  ].forEach((rel) => load(rel, sandbox));
  return sandbox;
}

const sandbox = makeSandbox();
const WDS = sandbox.WDS;
const Reg = WDS.dashboardRebuildRegistry;
const Prefs = WDS.dashboardRebuildPrefs;
const Data = WDS.dashboardRebuildData;
const Workspace = WDS.dashboardRebuildWorkspace;
const Customize = WDS.dashboardRebuildCustomize;

/* ————————————————————— 1–7: registry shape ————————————————————— */

const catalog = Reg.all();
assert("catalog has 32 functional tiles", catalog.length === 32, String(catalog.length));

const REQUIRED_CATEGORIES = [
  "weather",
  "photography",
  "astronomy",
  "air",
  "hiking",
  "water",
  "wildlife",
  "travel",
  "safety"
];
const byCategory = {};
catalog.forEach((w) => {
  byCategory[w.libraryCategory] = (byCategory[w.libraryCategory] || 0) + 1;
});
REQUIRED_CATEGORIES.forEach((cat) => {
  assert("category present: " + cat, byCategory[cat] > 0);
  assert("category has 3+ tiles: " + cat, byCategory[cat] >= 3, String(byCategory[cat]));
});
assert(
  "all nine categories covered",
  REQUIRED_CATEGORIES.every((c) => byCategory[c] > 0) &&
    Object.keys(byCategory).length === REQUIRED_CATEGORIES.length
);
assert("tile ids unique", new Set(catalog.map((w) => w.id)).size === catalog.length);
assert("tile default orders unique", new Set(catalog.map((w) => w.defaultOrder)).size === catalog.length);

catalog.forEach((w) => {
  const valid =
    typeof w.id === "string" &&
    typeof w.title === "string" &&
    w.title.length > 0 &&
    typeof w.description === "string" &&
    w.description.length > 0 &&
    ["standard", "wide", "featured"].indexOf(w.size) >= 0 &&
    Array.isArray(w.dataDependencies) &&
    w.dataDependencies.length > 0 &&
    typeof w.defaultVisible === "boolean" &&
    typeof w.sourceLabel === "string";
  assert("registry metadata valid: " + w.id, valid);
});

catalog.forEach((w) => {
  assert(
    "registry entry maps to a payload builder: " + w.id,
    Data.liveIds.indexOf(w.id) >= 0 && typeof Data.buildWidgetPayload(w.id, null) === "object"
  );
});

assert(
  "no ambiguous legacy sizes in catalog",
  catalog.every((w) => ["sm", "md", "lg", "anchor", "half", "compact"].indexOf(w.size) < 0)
);
assert("every catalog entry is live", catalog.every((w) => w.live === true));
assert("every catalog entry is selectable", catalog.every((w) => w.catalogAvailable === true));
assert(
  "no placeholder or deferred wording in catalog",
  !/coming soon|placeholder|not connected|deferred|disabled/i.test(JSON.stringify(catalog))
);
const DEFERRED = ["ebird", "moonrise", "moonset", "pollen", "smoke", "aurora", "iss", "meteor"];
assert(
  "deferred features are absent from the catalog",
  DEFERRED.every((term) => !catalog.some((w) => new RegExp(term, "i").test(w.id + " " + w.title)))
);

/* ————————————————— 8–9: shared payload, no duplicate work ————————————————— */

const platform = {
  meta: { fromCache: false },
  timezone: "America/New_York",
  region: { id: "blue-ridge", label: "Blue Ridge, NC" },
  calendar: { season: "Summer" },
  elevation: { feet: 3200, available: true },
  location: { latitude: 35.6, longitude: -82.5 },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo" },
    current: {
      temperature: { value: 68, unit: "°F" },
      feelsLike: { value: 71, unit: "°F" },
      humidity: { value: 62, unit: "%" },
      wind: { speed: { value: 9, unit: "mph" }, gust: { value: 17, unit: "mph" }, direction: { value: 220, unit: "deg", label: "SW" } },
      cloudCover: { value: 45, unit: "%" },
      precipitation: { probability: 20, intensity: "none", amount: null },
      uvIndex: { value: 7, unit: "" },
      conditions: { summary: "Partly cloudy", icon: "partly-cloudy-day" }
    },
    hourly: Array.from({ length: 36 }, (_, i) => {
      const t = new Date(Date.now() + (i - 18) * 3600000);
      return {
        time: t.toISOString(),
        temperature: { value: 60 + (i % 12), unit: "°F" },
        feelsLike: { value: 62 + (i % 12), unit: "°F" },
        wind: { speed: { value: 6 + (i % 5), unit: "mph" }, gust: { value: 12, unit: "mph" }, direction: null },
        precipitation: { probability: i % 7 === 0 ? 65 : 15, intensity: "none", amount: { value: i % 7 === 0 ? 0.12 : 0, unit: "in" } },
        cloudCover: { value: 40, unit: "%" },
        conditions: { summary: "Partly cloudy", icon: "partly-cloudy-day" }
      };
    }),
    daily: Array.from({ length: 5 }, (_, i) => ({
      date: new Date(Date.now() + i * 86400000).toISOString(),
      temperatureHigh: { value: 78 - i, unit: "°F" },
      temperatureLow: { value: 55 - i, unit: "°F" },
      precipitation: { probability: 20 + i * 5, intensity: "none", amount: null },
      uvIndex: { value: 8, unit: "" },
      conditions: { summary: "Partly cloudy", icon: "partly-cloudy-day" }
    }))
  },
  daylight: {
    status: "live",
    sunrise: new Date(Date.now() - 6 * 3600000).toISOString(),
    sunset: new Date(Date.now() + 4 * 3600000).toISOString(),
    sunriseFormatted: "6:12 AM",
    sunsetFormatted: "8:40 PM",
    dayLengthHours: 14.5,
    civilTwilight: "8:40 PM – 9:08 PM",
    civilTwilightEvening: "8:40 PM – 9:08 PM",
    astronomicalTwilightEvening: "10:12 PM",
    astronomicalTwilightMorning: "4:40 AM",
    goldenHour: "7:40 PM – 8:40 PM",
    goldenHourMorning: "6:12 AM – 7:12 AM",
    goldenHourEvening: "7:40 PM – 8:40 PM",
    goldenHourStatus: "estimated",
    blueHour: "8:40 PM – 9:05 PM",
    blueHourMorning: "5:47 AM – 6:12 AM",
    blueHourEvening: "8:40 PM – 9:05 PM",
    moonPhase: "Waxing gibbous",
    moonIllumination: 63,
    timezone: "America/New_York",
    localDate: "2026-07-25",
    utcOffset: "UTC−4"
  },
  airQuality: { status: "live", usAqi: 42, category: "Good", pm25: 8.1 },
  alerts: { status: "live", count: 1, items: [{ event: "Flood Watch", headline: "Flood Watch in effect", severity: "Moderate", areaDesc: "Buncombe", expires: new Date(Date.now() + 7200000).toISOString() }] },
  usgsWater: {
    status: "live",
    nearest: { siteName: "French Broad River at Asheville", stageFt: 2.14, dischargeCfs: 812, distanceKm: 6.4 },
    disclaimer: "Provisional USGS data — subject to revision"
  }
};

const bundle = Data.fromPlatform(platform, null);
assert("shared payload builds every tile once", Object.keys(bundle.widgets).length === catalog.length);
assert(
  "shared selectors memoize per platform",
  Data.selectors(platform) === Data.selectors(platform)
);
let fetchCalls = 0;
const originalFetch = sandbox.fetch;
sandbox.fetch = () => {
  fetchCalls += 1;
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
};
catalog.forEach((w) => Reg.getData(w.id, { platform }));
sandbox.fetch = originalFetch;
assert("tiles issue no network requests of their own", fetchCalls === 0, String(fetchCalls));

const liveTiles = catalog.filter((w) => {
  const d = Reg.getData(w.id, { platform });
  return d && (d.status === "live" || d.status === "empty");
});
assert(
  "every tile resolves with full platform data",
  liveTiles.length === catalog.length,
  liveTiles.length + "/" + catalog.length
);

/* ————————————————— 10–15: customization interface ————————————————— */

Prefs.reset();
const catalogHtml = Customize.renderCatalog(Prefs.load(), { libraryFilter: "all" });
assert("catalog groups by category", (catalogHtml.match(/wdb-r-catalog__group"/g) || []).length >= 9);
REQUIRED_CATEGORIES.forEach((cat) => {
  assert("catalog renders group: " + cat, catalogHtml.includes('data-category="' + cat + '"'));
});
assert("catalog shows selected counts", /\d+ of \d+ selected/.test(catalogHtml));
assert("catalog offers select all", /data-wdb-r-action="category-enable-all"/.test(catalogHtml));
assert("catalog offers clear", /data-wdb-r-action="category-clear"/.test(catalogHtml));
assert("catalog is not a flat list", /wdb-r-catalog__groups/.test(catalogHtml));
assert("catalog has no Coming Soon", !/coming soon/i.test(catalogHtml));
assert(
  "catalog lists every functional tile",
  catalog.every((w) => catalogHtml.includes('data-widget-id="' + w.id + '"'))
);

const filtered = Customize.renderCatalog(Prefs.load(), { libraryFilter: "water" });
assert("category filter narrows to one group", (filtered.match(/wdb-r-catalog__group"/g) || []).length === 1);
assert("category filter keeps water tiles", filtered.includes('data-widget-id="ph-river"'));
assert("category filter excludes other categories", !filtered.includes('data-widget-id="ph-conditions"'));

Prefs.setEnabled("ph-blue", true);
assert("per-tile enable", Prefs.load().enabled.indexOf("ph-blue") >= 0);
Prefs.setEnabled("ph-blue", false);
assert("per-tile disable", Prefs.load().enabled.indexOf("ph-blue") < 0);

Prefs.setCategoryEnabled("photography", true);
const photoIds = Reg.categoryIdsFor("photography");
assert(
  "category select-all enables every tile",
  photoIds.every((id) => Prefs.load().enabled.indexOf(id) >= 0)
);
assert(
  "category count reflects selection",
  Prefs.categorySelectedCount("photography") === photoIds.length
);
Prefs.setCategoryEnabled("photography", false);
assert(
  "category clear removes every tile",
  photoIds.every((id) => Prefs.load().enabled.indexOf(id) < 0)
);
assert("category clear leaves other categories alone", Prefs.load().enabled.indexOf("ph-conditions") >= 0);

Prefs.setCategoryEnabled("photography", true);
Prefs.setCategoryEnabled("photography", true);
const dupCheck = Prefs.load().enabled;
assert("selection prevents duplicates", new Set(dupCheck).size === dupCheck.length);

const persistedRaw = sandbox.localStorage.getItem(Prefs.storageKey);
assert(
  "selection persists to storage",
  persistedRaw && JSON.parse(persistedRaw).enabled.indexOf("ph-blue") >= 0
);

Prefs.reset();
const defaults = Prefs.defaults();
assert("default dashboard is a balanced subset", defaults.enabled.length === 11, String(defaults.enabled.length));
assert(
  "default dashboard does not enable everything",
  defaults.enabled.length < catalog.length
);
const defaultCats = new Set(defaults.enabled.map((id) => Reg.get(id).libraryCategory));
assert("default dashboard spans 8+ categories", defaultCats.size >= 8, String(defaultCats.size));
assert(
  "default dashboard ids all exist",
  defaults.enabled.every((id) => !!Reg.get(id))
);

/* ————————————————— 16–20: states and error isolation ————————————————— */

const waiting = Reg.getData("ph-conditions", { platform: null });
assert("loading state is honest", waiting.trust === "waiting" && !waiting.facts);
assert("loading state invents no numbers", !/\d+\s*°|AQI\s*\d+/.test(JSON.stringify(waiting)));

const emptyAlerts = Reg.getData("ph-alerts", {
  platform: { alerts: { status: "empty", items: [], count: 0 } }
});
assert("empty state renders empty status", emptyAlerts.status === "empty");
assert("empty state has honest copy", /No active alerts/i.test(emptyAlerts.message || ""));

const errored = Reg.getData("ph-air", { platform: { airQuality: { status: "unavailable" } } });
assert("error state marks unavailable", errored.trust === "unavailable" || errored.trust === "offline");
assert("error state invents no AQI", !/AQI\s*\d+/i.test(JSON.stringify(errored)));

const stale = Reg.getData("ph-conditions", {
  platform: Object.assign({}, platform, { meta: { fromCache: true } })
});
assert("stale data marked cached", stale.trust === "cached");

const partialPlatform = Object.assign({}, platform, { airQuality: null, usgsWater: null });
const partialAir = Reg.getData("ph-air", { platform: partialPlatform });
const partialConditions = Reg.getData("ph-conditions", { platform: partialPlatform });
assert("one failed dependency degrades only its tile", partialAir.status !== "live");
assert("unrelated tile still live when a provider fails", partialConditions.status === "live");
const partialRiver = Reg.getData("ph-river", { platform: partialPlatform });
assert("missing gauge does not invent a river value", !/\d+\s*(ft|cfs)/.test(JSON.stringify(partialRiver)));

const throwingPlatform = {
  weatherRef: {
    meta: { isPlaceholder: false },
    get current() {
      throw new Error("provider exploded");
    }
  }
};
const rescued = Reg.getData("ph-conditions", { platform: throwingPlatform });
assert("throwing dependency is contained", !!rescued && rescued.status === "unavailable");

/* ————————————————— 21–25: layout and route consistency ————————————————— */

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8");
assert("mobile grid collapses to one column", /@media \(max-width:\s*47\.99rem\)/.test(css));
assert("mobile tiles span the full grid", /grid-column:\s*1\s*\/\s*-1/.test(css));
assert("only standard/wide/featured sizes are styled", Reg.sizes.join(",") === "standard,wide,featured");

const allPrefs = Prefs.load();
allPrefs.enabled = catalog.map((w) => w.id);
allPrefs.order = allPrefs.enabled.slice();
const fullWs = Workspace.renderWorkspace({ prefs: allPrefs, platform, customize: false });
assert(
  "workspace paints every selected tile",
  (fullWs.match(/data-widget-id="/g) || []).length === catalog.length
);
assert("workspace uses family grids", /wdb-r-family__grid/.test(fullWs));
assert("workspace has no Coming Soon", !/coming soon/i.test(fullWs));

const oddPrefs = Prefs.load();
oddPrefs.enabled = ["ph-conditions", "ph-hourly", "ph-wind", "ph-precip", "ph-forecast"];
oddPrefs.order = oddPrefs.enabled.slice();
oddPrefs.gridColumns = 3;
const oddWs = Workspace.renderWorkspace({ prefs: oddPrefs, platform, customize: false });
assert("odd tile count renders all tiles", (oddWs.match(/data-widget-id="/g) || []).length === 5);
assert(
  "odd tile count uses no legacy size class",
  !/wdb-r-widget--(sm|md|lg|anchor|half|compact)\b/.test(oddWs)
);

const longReg = Reg.get("ph-conditions");
const originalTitle = longReg.title;
longReg.title = "Current conditions with a deliberately long observational title for width proof";
const longWs = Workspace.renderWorkspace({
  prefs: { ...Prefs.load(), enabled: ["ph-conditions", "ph-air"], order: ["ph-conditions", "ph-air"] },
  platform,
  customize: false
});
longReg.title = originalTitle;
assert("long title keeps the standard footprint", /wdb-r-widget--standard/.test(longWs));

const loadingWs = Workspace.renderWorkspace({ prefs: allPrefs, platform: null, customize: false });
assert(
  "loading state keeps the same tile count as success",
  (loadingWs.match(/data-widget-id="/g) || []).length ===
    (fullWs.match(/data-widget-id="/g) || []).length
);
assert(
  "loading state keeps the same size classes",
  (loadingWs.match(/wdb-r-widget--standard/g) || []).length ===
    (fullWs.match(/wdb-r-widget--standard/g) || []).length
);

const rootHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const dashHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
const loaderSrc = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
const REGISTRY_SRC = "dashboard/rebuild/wds-dashboard-rebuild-registry.js";
assert(
  "loader registers the tile registry exactly once",
  (loaderSrc.match(new RegExp(REGISTRY_SRC.replace(/[/.]/g, "\\$&"), "g")) || []).length === 1
);
assert("homepage boots the shared loader", /home-boot\.js/.test(rootHtml));
assert("dashboard route boots the shared loader", /home-boot\.js/.test(dashHtml));
assert(
  "homepage and dashboard share the same cache-bust token",
  /v=dash-tile-catalog-1/.test(rootHtml) && /v=dash-tile-catalog-1/.test(dashHtml)
);

const secondSandbox = makeSandbox();
assert(
  "registry is identical across independent mounts",
  secondSandbox.WDS.dashboardRebuildRegistry.all().map((w) => w.id).join(",") ===
    catalog.map((w) => w.id).join(",")
);

/* Interpretation standards — calculated tiles must name their inputs. */
const CALCULATED = [
  "ph-photo",
  "ph-trail-estimate",
  "ph-birding",
  "ph-wildlife-window",
  "ph-driving",
  "ph-risk",
  "ph-freeze",
  "ph-rainfall"
];
CALCULATED.forEach((id) => {
  const d = Reg.getData(id, { platform });
  assert("calculated tile states its basis: " + id, typeof d.basis === "string" && d.basis.length > 10);
  assert("calculated tile is labelled estimated: " + id, d.trust === "estimated");
});
const allText = JSON.stringify(catalog.map((w) => Reg.getData(w.id, { platform })));
assert(
  "no overclaiming language in tile output",
  !/the trail is muddy|wildlife will be active|roads are icy|perfect (photography|conditions)/i.test(allText)
);
assert("driving tile disclaims road data", /does not receive road/i.test(Reg.getData("ph-driving", { platform }).basis || ""));
assert("trail tile disclaims trail reports", /not a trail report/i.test(Reg.getData("ph-trail-estimate", { platform }).basis || ""));
assert(
  "wildlife tile disclaims prediction",
  /not a prediction/i.test(Reg.getData("ph-wildlife-window", { platform }).basis || "")
);

/* Attribution must follow the provider that actually answered. */
const nwsPlatform = JSON.parse(JSON.stringify(platform));
nwsPlatform.weatherRef.meta.provider = "nws";
assert(
  "attribution follows the answering provider",
  Reg.getData("ph-conditions", { platform: nwsPlatform }).source ===
    "NOAA / National Weather Service"
);
assert(
  "attribution defaults to Open-Meteo when it answers",
  Reg.getData("ph-conditions", { platform }).source === "Open-Meteo"
);

/* Providers that publish period pairs out of order must still label correctly. */
const invertedPlatform = JSON.parse(JSON.stringify(platform));
invertedPlatform.weatherRef.daily = [
  {
    date: "2026-07-25",
    temperatureHigh: { value: 53, unit: "°F" },
    temperatureLow: { value: 81, unit: "°F" },
    precipitation: { probability: 10 },
    conditions: { summary: "Clear" }
  }
];
const invertedForecast = Reg.getData("ph-forecast", { platform: invertedPlatform });
assert(
  "forecast labels the warmer value as the high",
  /81° \/ 53°/.test(JSON.stringify(invertedForecast.facts))
);
assert(
  "date-only forecast rows keep their calendar weekday",
  invertedForecast.facts[0].label === "Sat"
);

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(f));
  process.exit(1);
}
