#!/usr/bin/env node
/**
 * Dashboard Ambient Phase 2 — preview vs paid history, account chrome, Discover isolation.
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
    failed += 1;
    console.log("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function loadModules(files, extras) {
  const sandbox = {
    console,
    location: { pathname: "/apps/dashboard/", hash: "#/ambient", hostname: "127.0.0.1", href: "http://127.0.0.1:8080/apps/dashboard/#/ambient" },
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
    fetch: async function () {
      throw new Error("billing-offline");
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
      querySelector() {
        return null;
      },
      hidden: false
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.WDS = {};
  if (extras) Object.assign(sandbox, extras);
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
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-store.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-changes.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-accounts.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
];

const wdsSrc = read("design-system/js/wds.js");
const accSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-accounts.js");
const rebuildSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js");
const indexHtml = read("apps/dashboard/index.html");
const privacy = read("privacy.html");
const terms = read("terms.html");

assert(
  "wds.js loads accounts before rebuild",
  /rebuild-ambient-accounts\.js/.test(wdsSrc) &&
    wdsSrc.indexOf("rebuild-ambient-accounts.js") < wdsSrc.indexOf("wds-dashboard-rebuild.js")
);
assert("accounts client has no localStorage entitlement", !/localStorage[\s\S]{0,80}entitled|isPremium/.test(accSrc));
assert("accounts client uses credentials include", /credentials:\s*"include"/.test(accSrc));
assert("index cache-busts ambient-5", /dash-ambient-5/.test(indexHtml));
assert("privacy mentions Stripe and on-device history", /Stripe/.test(privacy) && /IndexedDB|on the user/.test(privacy));
assert("terms flag unfinished paid contract", /not[\s\S]{0,40}finished contract/i.test(terms));
assert("rebuild does not trust localStorage for paid", !/localStorage[\s\S]{0,60}isEntitled/.test(rebuildSrc));
assert("no LIMITED TIME copy", !/LIMITED TIME|founding.member|free trial/i.test(accSrc));

const sb = loadModules(MODULES);
const Acc = sb.WDS.waypointAccounts;
const Shell = sb.WDS.dashboardRebuild;
const Store = sb.WDS.dashboardRebuildAmbientStore;
const Snap = sb.WDS.dashboardRebuildAmbientSnapshot;

assert("accounts exported", !!(Acc && Acc.isEntitled && Acc.renderChrome));
assert("default not entitled", Acc.isEntitled() === false);
assert("anonymous chrome has Sign in and Get Ambient", /Sign in/.test(Acc.renderChrome()) && /Get Ambient/.test(Acc.renderChrome()));
assert("chrome states \$4.99/month", /\$4\.99\/month/.test(Acc.renderChrome()));
assert("chrome says Discover stays free", /Discover/.test(Acc.renderChrome()) && /stays free/.test(Acc.renderChrome()));

Acc.applySessionForTests({
  auth: "authenticated",
  email: "free@example.com",
  accountId: "acct_free",
  ambient: { entitled: false, status: "none", surface: "none", periodEnd: null }
});
assert(
  "signed-in free chrome",
  /free@example.com/.test(Acc.renderChrome()) && /Ambient preview/.test(Acc.renderChrome()) && /Get Ambient/.test(Acc.renderChrome())
);

Acc.applySessionForTests({
  auth: "authenticated",
  email: "paid@example.com",
  accountId: "acct_paid",
  ambient: { entitled: true, status: "active", surface: "active", periodEnd: null }
});
assert(
  "active subscriber chrome",
  /paid@example.com/.test(Acc.renderChrome()) && /Ambient active/.test(Acc.renderChrome()) && /Manage subscription/.test(Acc.renderChrome())
);

Acc.applySessionForTests({
  auth: "authenticated",
  email: "gone@example.com",
  accountId: "acct_gone",
  ambient: { entitled: false, status: "canceled", surface: "inactive", periodEnd: null }
});
assert(
  "inactive subscriber chrome",
  /gone@example.com/.test(Acc.renderChrome()) && /Ambient inactive/.test(Acc.renderChrome()) && /Resubscribe/.test(Acc.renderChrome())
);

Acc.applySessionForTests({
  auth: "anonymous",
  email: null,
  accountId: null,
  ambient: { entitled: false, status: "none", surface: "none", periodEnd: null }
});

const NOW = new Date("2026-01-15T20:00:00.000Z");
const place = {
  placeLabel: "Pike County, PA",
  lat: 41.3312,
  lng: -75.038,
  timezone: "America/New_York",
  trust: "live",
  source: "geo"
};

function livePlatform() {
  return {
    meta: { hydratedAt: NOW.toISOString() },
    weatherRef: {
      meta: { isPlaceholder: false, provider: "open-meteo" },
      current: {
        temperature: 34,
        feelsLike: 30,
        humidity: 48,
        cloudCover: 55,
        wind: { speed: 7, gust: 11 },
        conditions: { summary: "Partly cloudy" },
        precipitation: { probability: 10, amount: 0 }
      },
      hourly: [],
      daily: [{}]
    },
    daylight: {
      sunrise: new Date(NOW.getTime() - 8 * 3600 * 1000).toISOString(),
      sunset: new Date(NOW.getTime() + 2.5 * 3600 * 1000).toISOString(),
      timezone: "America/New_York"
    },
    alerts: { status: "live", items: [] },
    airQuality: { status: "live", usAqi: 32, category: "Good" }
  };
}

const prevSnap = Snap.compose({
  platform: {
    meta: { hydratedAt: NOW.toISOString() },
    weatherRef: {
      meta: { isPlaceholder: false, provider: "open-meteo" },
      current: {
        temperature: 43,
        feelsLike: 40,
        humidity: 48,
        cloudCover: 55,
        wind: { speed: 7, gust: 11 },
        conditions: { summary: "Partly cloudy" },
        precipitation: { probability: 10, amount: 0 }
      },
      hourly: [],
      daily: [{}]
    },
    daylight: { timezone: "America/New_York" },
    alerts: { status: "live", items: [] }
  },
  placeContext: place,
  now: new Date(NOW.getTime() - 3 * 3600 * 1000),
  catalog: { version: "test", events: [] }
});

await Store.resetForTests();
await Store.ingest(prevSnap, { force: true, capturedAt: new Date(NOW.getTime() - 3 * 3600 * 1000) });

const preview = Shell.renderShell({
  view: "ambient",
  placeContext: place,
  platform: livePlatform(),
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("anonymous Ambient preview renders", /data-wdb-r-ambient/.test(preview) && /Around you/.test(preview));
assert("preview chrome present", /Sign in/.test(preview) && /\$4\.99\/month/.test(preview));
assert("preview does not invent history change", !/Temperature ↓/.test(preview));
assert("preview note names paid watching", /Watching conditions over time/.test(preview));

Acc.session = Acc.session;
sb.WDS.waypointAccounts.isEntitled = function () {
  return false;
};
const freeAuthHtml = Acc.renderChrome();
assert("free chrome can still show preview language", /preview|Sign in|Get Ambient/.test(freeAuthHtml));

sb.WDS.waypointAccounts.isEntitled = function () {
  return true;
};
const paid = Shell.renderShell({
  view: "ambient",
  placeContext: place,
  platform: livePlatform(),
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("paid shell unlocks change copy", /Temperature ↓ 9°F/.test(paid), paid.replace(/\s+/g, " ").slice(0, 500));

sb.WDS.waypointAccounts.isEntitled = function () {
  return false;
};
const inactive = Shell.renderShell({
  view: "ambient",
  placeContext: place,
  platform: livePlatform(),
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("inactive returns to preview without exposing paid change", !/Temperature ↓/.test(inactive));
assert("lapse does not delete local history", Store.list().length >= 1);

const discover = Shell.renderShell({
  view: "workspace",
  placeContext: place,
  platform: livePlatform(),
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert(
  "Discover unchanged while Ambient billing is in the page",
  /data-wdb-r-today/.test(discover) && /data-wdb-r-workspace/.test(discover) && !/data-wdb-r-ambient/.test(discover)
);
assert("Discover is not paywalled", !/Get Ambient/.test(discover) && !/\$4\.99/.test(discover));

await Acc.refresh();
assert("billing fetch failure does not entitle", Acc.isEntitled() === false);

if (failed) {
  console.error("\nDASHBOARD AMBIENT ACCOUNTS: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nDASHBOARD AMBIENT ACCOUNTS: PASS");
