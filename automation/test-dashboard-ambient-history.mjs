#!/usr/bin/env node
/**
 * Dashboard Ambient Phase 1.5 — local history persistence + deterministic change detection.
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
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-store.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-changes.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
];

const storeSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-store.js");
const changeSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-changes.js");
const snapSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient-snapshot.js");
const ambSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-ambient.js");
const rebuildSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js");
const wdsSrc = read("design-system/js/wds.js");
const allAmbient = storeSrc + changeSrc + snapSrc + ambSrc;

assert("store does not fetch", !/\bfetch\s*\(|XMLHttpRequest|getForecast|outdoorIntelligence\.get/.test(storeSrc));
assert("changes does not fetch", !/\bfetch\s*\(|XMLHttpRequest|getForecast|outdoorIntelligence\.get/.test(changeSrc));
assert("no billing in phase 1.5 modules", !/stripe|paypal|\$4\.99|subscription\.active|entitlement/i.test(allAmbient));
assert("no radio/LLM APIs in phase 1.5 modules", !/rtl-sdr|openai|anthropic|speech-to-text|\bstripe\b/i.test(allAmbient));
assert("no server persistence", !/firebase|supabase|local-user\/sync|waypoint-cloud-history/i.test(storeSrc));
assert(
  "wds.js loads store and changes before rebuild",
  /rebuild-ambient-store\.js/.test(wdsSrc) &&
    /rebuild-ambient-changes\.js/.test(wdsSrc) &&
    wdsSrc.indexOf("rebuild-ambient-store.js") < wdsSrc.indexOf("wds-dashboard-rebuild.js")
);
assert("rebuild wires attachAmbientHistory", /attachAmbientHistory/.test(rebuildSrc));
assert("store uses IndexedDB", /indexedDB/.test(storeSrc) && /waypoint-ambient-history-v1/.test(storeSrc));

const sb = loadModules(MODULES);
const Snap = sb.WDS.dashboardRebuildAmbientSnapshot;
const Store = sb.WDS.dashboardRebuildAmbientStore;
const Changes = sb.WDS.dashboardRebuildAmbientChanges;
const Ambient = sb.WDS.dashboardRebuildAmbient;
const Shell = sb.WDS.dashboardRebuild;

assert("store exported", !!(Store && Store.remember && Store.reference));
assert("changes exported", !!(Changes && Changes.diff && Changes.decorateSnapshot));
assert("record version 1", Store.RECORD_VERSION === 1 && Store.SNAPSHOT_SCHEMA === 1);

const NOW = new Date("2026-01-15T20:00:00.000Z");
const EARLIER = new Date(NOW.getTime() - 3 * 3600 * 1000);
const place = {
  placeLabel: "Pike County, PA",
  lat: 41.3312,
  lng: -75.038,
  timezone: "America/New_York",
  trust: "live",
  source: "geo"
};
const otherPlace = {
  placeLabel: "Boston, MA",
  lat: 42.3601,
  lng: -71.0589,
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

function composeAt(platform, when, loc) {
  return Snap.compose({
    platform: platform,
    placeContext: loc || place,
    now: when,
    catalog: { version: "test", events: [] }
  });
}

sb.WDS.naturalEvents.setCatalog({ version: "test", events: [] });
await Store.resetForTests();

const first = composeAt(livePlatform(), EARLIER);
const firstWrite = await Store.ingest(first, { force: true, capturedAt: EARLIER });
assert("first snapshot persists", firstWrite.persisted === true, JSON.stringify(firstWrite));
assert("first snapshot in list", Store.list().length === 1);

const firstAgain = await Store.ingest(composeAt(livePlatform(), EARLIER), {
  capturedAt: new Date(EARLIER.getTime() + 60 * 1000)
});
assert("duplicate snapshot is deduped", firstAgain.persisted === false && firstAgain.reason === "duplicate", JSON.stringify(firstAgain));
assert("list still one after duplicate", Store.list().length === 1);

const warmer = composeAt(livePlatform({ current: { temperature: 43, feelsLike: 40, wind: { speed: 7 }, precipitation: { probability: 10, amount: 0 }, conditions: { summary: "Partly cloudy" } } }), EARLIER);
const second = await Store.ingest(warmer, {
  force: true,
  capturedAt: new Date(EARLIER.getTime() + 20 * 60 * 1000)
});
assert("subsequent material snapshot persists", second.persisted === true, JSON.stringify(second));
assert("list grew after material write", Store.list().length === 2);

const geo = Store.list()[0].snapshot.place;
assert(
  "stored coordinates are coarsened",
  geo.lat != null && Math.abs(geo.lat - 41.35) < 0.02 && Math.abs(geo.lng - -75.05) < 0.02,
  JSON.stringify(geo)
);
assert("precise GPS trail is not stored", Math.abs(geo.lat - 41.3312) > 0.001);

await Store.resetForTests();
const staleRows = [];
for (let i = 0; i < 8; i++) {
  staleRows.push({
    id: i + 1,
    recordVersion: 1,
    schemaVersion: 1,
    capturedAt: new Date(NOW.getTime() - 40 * 3600 * 1000 - i * 60000).toISOString(),
    placeKey: Store.placeKey({ lat: 41.3312, lng: -75.038, timezone: "America/New_York", label: "Pike County, PA" }),
    fingerprint: "old-" + i,
    snapshot: { schemaVersion: 1, capturedAt: new Date(NOW.getTime() - 40 * 3600 * 1000).toISOString(), place: { label: "Pike County, PA", lat: 41.35, lng: -75.05, timezone: "America/New_York" }, conditions: { status: "live", temperatureF: 20 } }
  });
}
Store.replaceCacheForTests(staleRows);
assert("unpruned old records still list until write", Store.list().length === 8, "list=" + Store.list().length);

const afterPrune = await Store.ingest(composeAt(livePlatform(), NOW), { force: true, capturedAt: NOW });
assert("new write after stale seed persists", afterPrune.persisted === true);
assert(
  "retention pruning drops 40h records",
  Store.list().every((r) => NOW.getTime() - new Date(r.capturedAt).getTime() <= Store.POLICY.retentionMs),
  Store.list()
    .map((r) => r.capturedAt)
    .join(",")
);
assert("retention keeps the new record", Store.list().some((r) => r.capturedAt === NOW.toISOString() || Math.abs(new Date(r.capturedAt) - NOW) < 1000));

await Store.resetForTests();
const many = [];
const key = Store.placeKey({ lat: 41.3312, lng: -75.038, timezone: "America/New_York", label: "Pike County, PA" });
for (let i = 0; i < 80; i++) {
  many.push({
    id: i + 1,
    recordVersion: 1,
    schemaVersion: 1,
    capturedAt: new Date(NOW.getTime() - (80 - i) * 20 * 60 * 1000).toISOString(),
    placeKey: key,
    fingerprint: "n" + i,
    snapshot: {
      schemaVersion: 1,
      capturedAt: new Date(NOW.getTime() - (80 - i) * 20 * 60 * 1000).toISOString(),
      place: { label: "Pike County, PA", lat: 41.35, lng: -75.05, timezone: "America/New_York" },
      conditions: { status: "live", temperatureF: 30 }
    }
  });
}
Store.replaceCacheForTests(many);
await Store.ingest(composeAt(livePlatform(), NOW), { force: true, capturedAt: NOW });
assert("max record cap applied", Store.list().length <= Store.POLICY.maxRecords, "count=" + Store.list().length);

Store.replaceCacheForTests([
  { not: "a record" },
  { recordVersion: 1, schemaVersion: 99, capturedAt: EARLIER.toISOString(), placeKey: key, snapshot: { schemaVersion: 99 } },
  {
    recordVersion: 1,
    schemaVersion: 1,
    capturedAt: EARLIER.toISOString(),
    placeKey: key,
    fingerprint: "ok",
    snapshot: composeAt(livePlatform({ current: { temperature: 43, feelsLike: 40, wind: { speed: 6 }, precipitation: { probability: 10, amount: 0 }, conditions: { summary: "Clear" } } }), EARLIER)
  }
]);
let threw = false;
let ref = null;
try {
  ref = Store.reference(composeAt(livePlatform(), NOW));
} catch (e) {
  threw = true;
}
assert("malformed persisted data does not throw", threw === false);
assert("obsolete schema is not used as reference", !ref || (ref.snapshot && ref.snapshot.schemaVersion === 1));
assert("malformed rows are omitted from list", Store.list().every((r) => r.schemaVersion === 1 && r.snapshot && r.snapshot.schemaVersion === 1));

await Store.useBackend(Store.createUnavailableBackend("quota"));
const failedWrite = await Store.remember(composeAt(livePlatform(), NOW));
assert("storage unavailable fails open", failedWrite.persisted === false && failedWrite.reason === "unavailable", JSON.stringify(failedWrite));
await Store.resetForTests();

const basePrev = composeAt(livePlatform({ current: { temperature: 43, feelsLike: 40, wind: { speed: 6 }, precipitation: { probability: 10, amount: 0 }, conditions: { summary: "Partly cloudy" } } }), EARLIER);
const baseNow = composeAt(livePlatform(), NOW);

const tempDrop = Changes.diff(basePrev, baseNow);
assert("meaningful temperature decrease", tempDrop.status === "changed" && tempDrop.items.some((it) => /Temperature ↓ 9°F/.test(it.title)), JSON.stringify(tempDrop.items));

const noisePrev = composeAt(livePlatform({ current: { temperature: 34.0, feelsLike: 30, wind: { speed: 7 }, precipitation: { probability: 10, amount: 0 }, conditions: { summary: "Partly cloudy" } } }), EARLIER);
const noiseNow = composeAt(livePlatform({ current: { temperature: 33.8, feelsLike: 30, wind: { speed: 7.2 }, precipitation: { probability: 10, amount: 0 }, conditions: { summary: "Partly cloudy" } } }), NOW);
const noise = Changes.diff(noisePrev, noiseNow);
assert("insignificant temperature fluctuation is quiet", noise.status === "quiet" && noise.items.length === 0, JSON.stringify(noise));

const windPrev = composeAt(livePlatform({ current: { temperature: 34, wind: { speed: 6 }, precipitation: { probability: 10, amount: 0 }, conditions: { summary: "Partly cloudy" } } }), EARLIER);
const windNow = composeAt(livePlatform({ current: { temperature: 34, wind: { speed: 22 }, precipitation: { probability: 10, amount: 0 }, conditions: { summary: "Partly cloudy" } } }), NOW);
const wind = Changes.diff(windPrev, windNow);
assert("meaningful wind increase", wind.items.some((it) => /Wind increasing/.test(it.title)), JSON.stringify(wind.items));

const dry = composeAt(livePlatform({ current: { temperature: 41, wind: { speed: 8 }, precipitation: { probability: 20, amount: 0 }, conditions: { summary: "Cloudy" } } }), EARLIER);
const wet = composeAt(livePlatform({ current: { temperature: 41, wind: { speed: 8 }, precipitation: { probability: 80, amount: 0.12 }, conditions: { summary: "Rain" } } }), NOW);
const precip = Changes.diff(dry, wet);
assert("precipitation transition", precip.items.some((it) => /Rain has started/.test(it.title)), JSON.stringify(precip.items));

const noAlert = composeAt(livePlatform({ alerts: { status: "live", items: [] } }), EARLIER);
const yesAlert = composeAt(
  livePlatform({
    alerts: { status: "live", items: [{ event: "Winter Storm Warning", headline: "Winter Storm Warning", severity: "Severe" }] }
  }),
  NOW
);
const alertAdd = Changes.diff(noAlert, yesAlert);
assert("alert added", alertAdd.items.some((it) => /Winter Storm Warning issued/.test(it.title)), JSON.stringify(alertAdd.items.map((i) => i.title)));

const alertGone = Changes.diff(yesAlert, noAlert);
assert("alert expired with valid current evidence", alertGone.items.some((it) => /Winter Storm Warning ended/.test(it.title)), JSON.stringify(alertGone.items.map((i) => i.title)));

const alertFail = composeAt(livePlatform({ alerts: { status: "unavailable", items: [] } }), NOW);
const alertFailDiff = Changes.diff(yesAlert, alertFail);
assert(
  "alert source failure does not imply resolution",
  !alertFailDiff.items.some((it) => /ended/.test(it.title)),
  JSON.stringify(alertFailDiff)
);

const missingWx = Snap.compose({
  platform: {
    meta: { hydratedAt: NOW.toISOString() },
    weatherRef: { meta: { isPlaceholder: true, provider: "open-meteo" }, current: { temperature: 0 } },
    alerts: { status: "live", items: [] }
  },
  placeContext: place,
  now: NOW,
  catalog: { version: "test", events: [] }
});
const missingDiff = Changes.diff(basePrev, missingWx);
assert("missing weather is not a temperature change", !missingDiff.items.some((it) => /Temperature/.test(it.title)), JSON.stringify(missingDiff.items));
assert("placeholder 0° is not used as a drop to zero", missingWx.conditions.temperatureF == null);

const astroPrev = JSON.parse(JSON.stringify(basePrev));
const astroNow = JSON.parse(JSON.stringify(baseNow));
function setOpp(snap, domain, level, status) {
  snap.opportunities = (snap.opportunities || []).map((o) => {
    if (o.domain !== domain) return o;
    return Object.assign({}, o, { status: status || "ready", level: level, headline: level });
  });
  snap.meta = Object.assign({}, snap.meta, { weatherLive: true });
}
setOpp(astroPrev, "astronomy", "excellent", "ready");
setOpp(astroNow, "astronomy", "poor", "ready");
const astro = Changes.diff(astroPrev, astroNow);
assert("astronomy opportunity transition", astro.items.some((it) => /Night-sky opportunity deteriorated/.test(it.title)), JSON.stringify(astro.items));

const unkPrev = JSON.parse(JSON.stringify(basePrev));
const unkNow = JSON.parse(JSON.stringify(baseNow));
setOpp(unkPrev, "astronomy", null, "unknown");
setOpp(unkNow, "astronomy", "poor", "unknown");
const unk = Changes.diff(unkPrev, unkNow);
assert("UNKNOWN stays distinct and does not fabricate opportunity change", !unk.items.some((it) => /opportunity/.test(it.title)), JSON.stringify(unk.items));

const failOppPrev = JSON.parse(JSON.stringify(basePrev));
const failOppNow = JSON.parse(JSON.stringify(missingWx));
setOpp(failOppPrev, "astronomy", "good", "ready");
const failOpp = Changes.diff(failOppPrev, failOppNow);
assert("stale/missing weather does not end an opportunity", !failOpp.items.some((it) => /deteriorated|ended/.test(it.title)), JSON.stringify(failOpp.items));

const boston = composeAt(livePlatform({ current: { temperature: 9, wind: { speed: 6 } } }), NOW, otherPlace);
const placeDiff = Changes.diff(basePrev, boston);
assert("different-place snapshots are not compared", placeDiff.status === "incomparable" && placeDiff.items.length === 0, JSON.stringify(placeDiff));

const warming = Changes.diff(null, baseNow);
assert("no history is warming, not fake change", warming.status === "warming" && warming.items.length === 0);

const decoratedWarm = Changes.decorateSnapshot(JSON.parse(JSON.stringify(baseNow)), warming);
assert("first-run developing copy is honest", /Building recent context/.test(decoratedWarm.developing.headline));
const warmHtml = Ambient.render(decoratedWarm);
assert("first-run html is honest", /Building recent context/.test(warmHtml));
assert("first-run does not invent a drop", !/Temperature ↓/.test(warmHtml));

const decoratedQuiet = Changes.decorateSnapshot(JSON.parse(JSON.stringify(baseNow)), { status: "quiet", items: [], windowLabel: "since 12:00 PM" });
assert("quiet history keeps Phase 1 calm copy", /Nothing important is developing/.test(decoratedQuiet.developing.headline));
const quietHtml = Ambient.render(decoratedQuiet);
assert("quiet html stays quiet", /Nothing important is developing/.test(quietHtml) && !/Temperature ↓/.test(quietHtml));

const decoratedChange = Changes.decorateSnapshot(JSON.parse(JSON.stringify(baseNow)), tempDrop);
assert("DEVELOPING surfaces temperature change", /Temperature ↓/.test(decoratedChange.developing.headline + decoratedChange.developing.detail + JSON.stringify(decoratedChange.developing.items)));
const changeHtml = Ambient.render(decoratedChange);
assert("change html includes temperature drop", /Temperature ↓ 9°F/.test(changeHtml));
assert("NOW still shows current temperature", /34°/.test(changeHtml));
assert("OPPORTUNITIES still present", /Opportunities/.test(changeHtml) && /Foraging · Unknown/.test(changeHtml));

const decoratedAlert = Changes.decorateSnapshot(JSON.parse(JSON.stringify(yesAlert)), alertAdd);
assert(
  "significant alert change is prominent",
  /Winter Storm Warning/.test(
    decoratedAlert.developing.headline + " " + decoratedAlert.developing.detail + JSON.stringify(decoratedAlert.developing.items)
  )
);
assert("alert change is urgent or attention", decoratedAlert.developing.state === "urgent" || decoratedAlert.developing.state === "attention");

await Store.resetForTests();
await Store.ingest(basePrev, { force: true, capturedAt: EARLIER });
const shellChanged = Shell.renderShell({
  view: "ambient",
  placeContext: place,
  platform: livePlatform(),
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("shell DEVELOPING uses local history", /Temperature ↓ 9°F/.test(shellChanged), shellChanged.replace(/\s+/g, " ").slice(0, 500));
assert("shell still has NOW and OPPORTUNITIES", /Around you/.test(shellChanged) && /Opportunities/.test(shellChanged));
assert("shell does not mount Discover", !/data-wdb-r-workspace/.test(shellChanged) && !/data-wdb-r-today/.test(shellChanged));

await Store.resetForTests();
const shellFirst = Shell.renderShell({
  view: "ambient",
  placeContext: place,
  platform: livePlatform(),
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("shell first-run is building context", /Building recent context/.test(shellFirst));

const discover = Shell.renderShell({
  view: "workspace",
  placeContext: place,
  platform: livePlatform(),
  now: NOW,
  catalog: { version: "test", events: [] }
});
assert("Discover remains workspace", /data-wdb-r-today/.test(discover) && /data-wdb-r-workspace/.test(discover) && !/data-wdb-r-ambient/.test(discover));

if (failed) {
  console.error("\nDASHBOARD AMBIENT HISTORY: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nDASHBOARD AMBIENT HISTORY: PASS");
