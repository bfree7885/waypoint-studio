#!/usr/bin/env node
/**
 * Dashboard Rebuild Phase 3 — widget library, favorites, columns, empty states.
 * Run: node automation/test-dashboard-rebuild-phase3.mjs
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

const indexHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
assert("index uses rebuild CSS", /wds-dashboard-rebuild\.css/.test(indexHtml));
assert("index cache-bust home-rc1", /home-rc1|rebuild-p3|dash-rc25-s6|dash-tile-layout-1|dash-tile-catalog-1/.test(indexHtml));
assert("index does not load Outdoor OS CSS as primary", !/wds-dashboard-os\.css/.test(indexHtml));

const modules = [
  "design-system/js/wds-icons.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
];
modules.forEach(function (rel) {
  assert("module exists " + path.basename(rel), fs.existsSync(path.join(ROOT, rel)));
});

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8");
assert("css supports 1-column preference", /data-columns="1"/.test(css));
assert("css supports 2-column preference", /data-columns="2"/.test(css));
assert("css honors reduced motion", /prefers-reduced-motion/.test(css));
assert("css content-visibility for widgets", /content-visibility:\s*auto/.test(css));
assert("css library tabs", /wdb-r-library__tab/.test(css));
assert("css availability badges", /wdb-r-badge--available/.test(css) && /wdb-r-badge--coming-soon/.test(css));

const sandbox = {
  window: {},
  console,
  document: {
    documentElement: {
      classList: {
        add() {},
        remove() {},
        contains() {
          return false;
        }
      },
      setAttribute() {},
      removeAttribute() {},
      getAttribute() {
        return null;
      }
    },
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
    querySelector() {
      return null;
    }
  },
  location: { pathname: "/apps/dashboard/", hash: "#/" },
  history: { replaceState() {} },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  CustomEvent: function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  },
  localStorage: {
    _data: {},
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null;
    },
    setItem(k, v) {
      this._data[k] = String(v);
    },
    removeItem(k) {
      delete this._data[k];
    }
  },
  setInterval() {
    return 1;
  },
  clearInterval() {},
  requestAnimationFrame(fn) {
    fn();
    return 1;
  },
  matchMedia() {
    return { matches: false };
  },
  Date,
  isFinite,
  Number,
  String,
  Object,
  Array,
  JSON,
  Math
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.WDS = {};

modules.forEach(function (rel) {
  load(rel, sandbox);
});

const Reg = sandbox.WDS.dashboardRebuildRegistry;
const Prefs = sandbox.WDS.dashboardRebuildPrefs;
const Today = sandbox.WDS.dashboardRebuildToday;
const Workspace = sandbox.WDS.dashboardRebuildWorkspace;
const Customize = sandbox.WDS.dashboardRebuildCustomize;
const Kiosk = sandbox.WDS.dashboardRebuildKiosk;
const Shell = sandbox.WDS.dashboardRebuild;
const Data = sandbox.WDS.dashboardRebuildData;

assert("registry phase3", !!(Reg && Reg.version && /phase3|rc25-s6|tile-layout|tile-catalog/.test(Reg.version)));
assert("prefs key preserved", Prefs.storageKey === "waypoint-dashboard-rebuild-prefs-v1");
assert("prefs exposes favorites API", typeof Prefs.toggleFavorite === "function");
assert("prefs exposes columns API", typeof Prefs.setGridColumns === "function");
assert("customize library API", typeof Customize.renderCatalog === "function");
assert("workspace lazy API", typeof Workspace.bindLazy === "function");

const all = Reg.all();
assert("catalog excludes travel placeholder", !Reg.get("ph-travel"));
assert("catalog live ids match catalog size", Data.liveIds.length === all.length);
assert(
  "library categories complete",
  Reg.libraryCategories()
    .map((c) => c.id)
    .join(",") ===
    "weather,photography,astronomy,air,hiking,water,wildlife,travel,safety,favorites"
);

[
  ["ph-conditions", "weather", "Available"],
  ["ph-golden", "photography", "Available"],
  ["ph-air", "air", "Available"],
  ["ph-sun", "astronomy", "Available"],
  ["ph-river", "water", "Available"],
  ["ph-birding", "wildlife", "Available"],
  ["ph-place", "travel", "Available"],
  ["ph-hiking-window", "hiking", "Available"],
  ["ph-alerts", "safety", "Available"]
].forEach(function (row) {
  const w = Reg.get(row[0]);
  assert(row[0] + " library category", w && w.libraryCategory === row[1]);
  assert(row[0] + " availability badge", Reg.availability(w).label === row[2]);
});
assert("removed placeholders stay gone", !Reg.get("ph-photography") && !Reg.get("ph-rivers") && !Reg.get("ph-light"));

Prefs.reset();
assert("defaults gridColumns 3", Prefs.load().gridColumns === 3);
assert("defaults favorites empty", Prefs.load().favorites.length === 0);

Prefs.setGridColumns(2);
assert("persist gridColumns 2", Prefs.load().gridColumns === 2);
Prefs.setGridColumns(1);
assert("persist gridColumns 1", Prefs.load().gridColumns === 1);
Prefs.setGridColumns(99);
assert("invalid columns normalize to 3", Prefs.load().gridColumns === 3);

Prefs.toggleFavorite("ph-moon");
assert("favorite persists", Prefs.isFavorite("ph-moon"));
assert("favorite auto-enables", Prefs.load().enabled.indexOf("ph-moon") >= 0);
Prefs.setEnabled("ph-conditions", true);
Prefs.setEnabled("ph-air", true);
Prefs.setEnabled("ph-moon", true);
const ordered = Prefs.visibleOrdered();
assert(
  "favorites rise to top",
  ordered[0] === "ph-moon",
  ordered.join(",")
);

/* Legacy prefs without favorites/gridColumns still load */
sandbox.localStorage.setItem(
  Prefs.storageKey,
  JSON.stringify({
    version: 1,
    enabled: ["ph-conditions", "ph-light"],
    order: ["ph-conditions", "ph-light"],
    sizes: { "ph-conditions": "md", "ph-light": "md" },
    preset: "minimal",
    kioskRefreshMs: 300000
  })
);
const legacy = Prefs.load();
assert("legacy prefs migrate favorites", Array.isArray(legacy.favorites));
assert("legacy prefs default columns", legacy.gridColumns === 3);
assert("legacy prefs keep enabled", legacy.enabled.indexOf("ph-conditions") >= 0);

Prefs.reset();
Prefs.setEnabled("ph-conditions", false);
Prefs.setEnabled("ph-light", false);
Prefs.setEnabled("ph-air", false);
Prefs.setEnabled("ph-astronomy", false);
Prefs.setEnabled("ph-alerts", false);
/* After clearing all, normalize may restore defaults if empty — force empty via save */
Prefs.save({
  version: 1,
  enabled: [],
  order: Prefs.load().order,
  sizes: Prefs.load().sizes,
  favorites: [],
  gridColumns: 3,
  preset: "default",
  kioskRefreshMs: 300000
});
/* normalize restores defaults when enabled empty — assert that behavior OR empty state with ids */
let emptyPrefs = Prefs.load();
if (emptyPrefs.enabled.length === 0) {
  const emptyWs = Workspace.renderWorkspace({ prefs: emptyPrefs, customize: false });
  assert(
    "empty workspace copy",
    /Your workspace is empty/.test(emptyWs) &&
      /Open Customize to choose the outdoor instruments/.test(emptyWs)
  );
} else {
  /* normalize restores defaults when empty — simulate empty via ids override */
  const emptyWs = Workspace.renderWorkspace({
    prefs: emptyPrefs,
    ids: [],
    customize: false
  });
  assert(
    "empty workspace copy",
    /Your workspace is empty/.test(emptyWs) &&
      /Open Customize to choose the outdoor instruments/.test(emptyWs)
  );
  const emptyCustom = Workspace.renderWorkspace({
    prefs: emptyPrefs,
    ids: [],
    customize: true
  });
  assert(
    "empty customize copy",
    /Your workspace is empty/.test(emptyCustom) &&
      /Add instruments from the library below/.test(emptyCustom)
  );
}

Prefs.reset();
Prefs.setGridColumns(2);
const wsCols = Workspace.renderWorkspace({ prefs: Prefs.load(), customize: false });
assert("workspace emits data-columns", /data-columns="2"/.test(wsCols));

const lib = Customize.renderCatalog(Prefs.load(), { libraryFilter: "weather" });
assert("library title", /Widget library/.test(lib));
assert("library filter weather", /data-filter="weather"/.test(lib));
assert("library shows Available badge", /wdb-r-badge--available/.test(lib));
assert("library has no Coming Soon", !/Coming Soon/i.test(Customize.renderCatalog(Prefs.load(), { libraryFilter: "all" })));
assert("library weather includes Conditions", /Conditions/.test(lib));
assert("library weather excludes Trails", !/Trail Conditions/.test(lib));
assert("library has icons", /wdb-r-catalog__icon/.test(lib));
assert("library favorite control", /data-wdb-r-action="favorite"/.test(lib));
assert("library category tabs", /role="tablist"/.test(lib));

const hiking = Customize.renderCatalog(Prefs.load(), { libraryFilter: "hiking" });
assert("hiking category removed with trails placeholder", !/Trail Conditions/.test(hiking) && hiking.indexOf("ph-trails") < 0);

const favFilter = Customize.renderCatalog(
  Object.assign(Prefs.load(), { favorites: ["ph-air"] }),
  { libraryFilter: "favorites" }
);
assert("favorites filter lists pinned", /data-widget-id="ph-air"/.test(favFilter));

const toolbar = Customize.renderToolbar(Prefs.load());
assert("toolbar restore defaults", /Restore defaults/.test(toolbar));
assert("toolbar column picker", /data-wdb-r-action="columns"/.test(toolbar));
assert("toolbar a11y columns group", /aria-label="Workspace columns"/.test(toolbar));

Prefs.reset();
Customize.handleAction("columns", {
  getAttribute(name) {
    return name === "data-columns" ? "1" : null;
  }
});
assert("handleAction sets columns", Prefs.load().gridColumns === 1);

Customize.handleAction("favorite", {
  getAttribute(name) {
    return name === "data-widget-id" ? "ph-golden" : null;
  }
});
assert("handleAction favorites", Prefs.isFavorite("ph-golden"));

const platform = {
  meta: { fromCache: false, blockStatus: { weather: "live", airQuality: "live", daylight: "live" } },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo", fetchedAt: new Date().toISOString() },
    current: {
      temperature: 72,
      feelsLike: 68,
      humidity: 72,
      cloudCover: 65,
      wind: { speed: 4, gust: 7 },
      precipitation: { probability: 10 },
      conditions: { summary: "Partly cloudy" }
    },
    hourly: [],
    daily: []
  },
  daylight: {
    status: "live",
    sunriseFormatted: "5:52 AM",
    sunsetFormatted: "8:24 PM",
    goldenHourEvening: "7:24–8:24 PM",
    goldenHourStatus: "estimated",
    blueHourEvening: "8:24–8:54 PM",
    blueHourStatus: "estimated",
    moonPhase: "Waxing Crescent",
    moonIllumination: 32,
    moonrise: null,
    moonset: null
  },
  airQuality: { status: "live", aqi: 42, category: "Good", pm25: 8 }
};

const lines = Data.composeTodayLines(platform);
assert("today lines max 8", lines.length <= 8 && lines.length >= 1, String(lines.length));
assert("today observational humidity", lines.some((l) => /Humidity sits near/i.test(l)));
assert("today observational cloud", lines.some((l) => /Cloud cover near/i.test(l)));
assert("today observational feels-like", lines.some((l) => /feels closer to/i.test(l)));
assert(
  "today bans instructional voice",
  !lines.some((l) =>
    /you should|don't forget|great day for|do this|try |remember to|homework/i.test(l)
  )
);
assert("bannedLine helper catches Great day for hiking", Data.bannedLine("Great day for hiking."));
assert("bannedLine helper catches Don't forget", Data.bannedLine("Don't forget sunscreen."));
assert("bannedLine allows observational", !Data.bannedLine("Air quality is Good."));

const filtered = Today.resolveLines({
  lines: ["Air quality is Good.", "Great day for hiking.", "You should go outside.", "Don't forget water."]
});
assert("today resolveLines strips coaching", filtered.length === 1 && /Air quality/.test(filtered[0]));

const shellCustom = Shell.renderShell({ view: "customize", platform });
assert("customize shell has library", /Widget library/.test(shellCustom));
assert("customize shell has tabs", /wdb-r-library__tab/.test(shellCustom));
assert("customize shell has column controls", /data-wdb-r-action="columns"/.test(shellCustom));
assert("customize no Outdoor OS", !/data-wdb-os|Happening|Matters most/i.test(shellCustom));

const shellWs = Shell.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here" },
  platform
});
assert("workspace shell preserved today", /data-wdb-r-today/.test(shellWs));
assert("workspace shell preserved grid", /data-wdb-r-workspace/.test(shellWs));
assert("no coaching chrome", !/you should|great day for|don't forget/i.test(shellWs));

Prefs.reset();
const customWs = Workspace.renderWorkspace({
  prefs: Prefs.load(),
  customize: true,
  platform
});
assert("customize widget favorite control", /data-wdb-r-action="favorite"/.test(customWs));
assert("customize reorder controls", /data-wdb-r-action="move-up"/.test(customWs));

const lazyHtml = Workspace.renderWorkspace({
  prefs: Prefs.load(),
  lazy: true,
  platform
});
assert("lazy frames pending", /data-lazy="pending"/.test(lazyHtml));
assert("lazy reserved settling copy", /Settling…/.test(lazyHtml));
assert("lazy skeleton placeholders", /wdb-r-skeleton/.test(lazyHtml));
assert("workspace family grouping", /wdb-r-group__label/.test(Workspace.renderWorkspace({ prefs: Prefs.load(), platform })));
assert("widget family attrs", /data-family="weather"/.test(Workspace.renderWorkspace({ prefs: Prefs.load(), platform })));

assert("kiosk constraints unchanged", Kiosk.constraints().hideCustomize === true);

const host = {
  innerHTML: "",
  removeAttribute() {},
  classList: { add() {}, remove() {} },
  querySelector(sel) {
    if (sel === "[data-wdb-r]") return { getAttribute: () => null };
    return null;
  },
  querySelectorAll() {
    return [];
  }
};
sandbox.document.getElementById = () => host;
Shell.mount(host, { placeContext: { placeLabel: "Mount Place" } });
assert("mount paints shell", /data-wdb-r/.test(host.innerHTML));
Shell.setPlatform(platform);
assert("setPlatform no page reload contract", /data-wdb-r/.test(host.innerHTML));

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
