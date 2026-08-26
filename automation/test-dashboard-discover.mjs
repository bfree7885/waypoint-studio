#!/usr/bin/env node
/**
 * Dashboard Discover v1 — honesty, quiet strip, Take from intel, Explore links.
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
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
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

const docs = read("docs/DASHBOARD-DISCOVER.md");
assert("discover doc present", /Dashboard Discover/.test(docs) && /deterministic/i.test(docs));
assert("product direction points to discover doc", /DASHBOARD-DISCOVER\.md/.test(read("docs/PRODUCT-DIRECTION.md")));

const dashHtml = read("apps/dashboard/index.html");
assert("dashboard meta discover", /Discover what is interesting outdoors/i.test(dashHtml));
assert("no OpenRoad promo in dashboard html", !/OpenRoad/i.test(dashHtml));
assert("no Fieldry promo in dashboard html", !/Fieldry/i.test(dashHtml));
assert("no Savant promo in dashboard html", !/Savant/i.test(dashHtml));

const deepenSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js");
assert("explore links articles", /href="\.\.\/\.\.\/articles\/"/.test(deepenSrc));
assert("explore links scenes", /href="\.\.\/\.\.\/apps\/scenes\/"/.test(deepenSrc));
assert("explore links dfd", /deep-forest-dispatch/.test(deepenSrc));
assert("no sheds promo section", !/data-deepen="sheds"|Open Sheds/.test(deepenSrc));
assert("take prefers intel brief", /beforeYouGo\.brief/.test(deepenSrc));

const contact = read("automation/test-contact-platform.mjs");
assert("contact scan skips worktrees", /\.worktrees/.test(contact) && /\.tmp-/.test(contact));
assert("contact correct mailbox", /contact@waypointstudio\.org/.test(contact));

const sb = loadModules([
  "design-system/js/dashboard/wds-dashboard-season.js",
  "design-system/js/dashboard/natural-events/wds-natural-events.js",
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
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
]);

const Today = sb.WDS.dashboardRebuildToday;
const Happening = sb.WDS.dashboardRebuildHappening;
const Deepen = sb.WDS.dashboardRebuildDeepeners;
const Shell = sb.WDS.dashboardRebuild;

const todayHtml = Today.render({
  placeLabel: "Test Place",
  trust: "partial",
  now: new Date("2026-08-25T16:00:00-04:00"),
  location: { lat: 41.3312, lng: -75.038, timezone: "America/New_York" },
  platform: {
    weatherRef: {
      meta: { isPlaceholder: false, provider: "open-meteo" },
      current: { temperature: 70 }
    },
    calendar: { season: "late summer" },
    phenology: { stage: "canopy still full", status: "editorial" }
  }
});
assert("today discover kicker", /Outside today/.test(todayHtml));
assert("today discover title", /What the day looks like/.test(todayHtml));
assert("today provider provenance", /Based on Open-Meteo/.test(todayHtml));
assert("today calendar season is computed not editorial spring", /Calendar: late summer/.test(todayHtml));
assert("today does not print stale late spring", !/late spring/i.test(todayHtml));
assert("undated phenology omitted", !/canopy still full/i.test(todayHtml));

const quietHn = Happening.render({ signals: [], platform: { meta: {} }, now: new Date() });
assert("hn empty returns no hn root", quietHn === "");

sb.WDS.naturalEvents.setCatalog({ version: "test", events: [] });
const shellQuiet = Shell.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here" },
  platform: {
    meta: { hydratedAt: "2026-08-25T12:00:00.000Z" },
    weatherRef: { meta: { isPlaceholder: false, provider: "open-meteo" }, current: {} }
  },
  now: new Date("2026-01-15T12:00:00Z")
});
assert("quiet strip when no strong signals", /data-wdb-r-discover-quiet/.test(shellQuiet));
assert("quiet does not invent hn", !/data-wdb-r-hn(?!-)/.test(shellQuiet) || !/data-wdb-r-hn"/.test(shellQuiet));
assert(
  "quiet has no fake wildlife",
  !/wildlife sighting|trending near you|sensor reading/i.test(shellQuiet)
);

const shellWaiting = Shell.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here", trust: "waiting" }
});
assert("no quiet strip before hydrate", !/data-wdb-r-discover-quiet/.test(shellWaiting));

const shellPlaceholderWx = Shell.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here", trust: "waiting" },
  platform: {
    meta: { hydratedAt: "2026-08-25T12:00:00.000Z" },
    weatherRef: { meta: { isPlaceholder: true, provider: "open-meteo" }, current: {} }
  },
  now: new Date("2026-01-15T12:00:00Z")
});
assert(
  "no quiet strip while weather is placeholder",
  !/data-wdb-r-discover-quiet/.test(shellPlaceholderWx)
);

const takeLive = Deepen.resolveTake({
  platform: {
    weatherRef: {
      meta: { isPlaceholder: false },
      current: {
        temperature: 88,
        humidity: 80,
        wind: { speed: 18, gust: 28 },
        precipitation: { probability: 10 },
        conditions: { summary: "Humid" }
      },
      hourly: [],
      daily: [{}]
    },
    daylight: {},
    alerts: { items: [] },
    airQuality: { status: "live", usAqi: 40, category: "Good" }
  },
  now: new Date("2026-07-15T14:00:00Z")
});
assert("take has body", !!(takeLive && takeLive.body && takeLive.body.length > 20));
assert("take meta honest", /Derived from live|Editorial/.test(takeLive.meta));

const deepenHtml = Deepen.render();
assert("deepen explore section", /data-deepen="explore"/.test(deepenHtml));
assert("deepen articles path", /Articles/.test(deepenHtml) && /articles\//.test(deepenHtml));

if (failed) {
  console.error("\nDASHBOARD DISCOVER: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nDASHBOARD DISCOVER: PASS");
