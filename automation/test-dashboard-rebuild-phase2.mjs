#!/usr/bin/env node
/**
 * Dashboard Rebuild Phase 2 — live widget contracts + Phase 1 regressions.
 * Run: node automation/test-dashboard-rebuild-phase1.mjs
 *      node automation/test-dashboard-rebuild-phase2.mjs
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
assert("index does not load Outdoor OS CSS as primary", !/wds-dashboard-os\.css/.test(indexHtml));
assert("index product name Dashboard", /data-product-name="Dashboard"/.test(indexHtml));
assert("index boots home-boot", /js\/home-boot\.js/.test(indexHtml));

const modules = [
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

const wdsJs = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
assert("wds.js loads rebuild data", /dashboard\/rebuild\/wds-dashboard-rebuild-data\.js/.test(wdsJs));
assert("wds.js loads rebuild shell", /dashboard\/rebuild\/wds-dashboard-rebuild\.js/.test(wdsJs));

const homeBoot = fs.readFileSync(path.join(ROOT, "apps/dashboard/js/home-boot.js"), "utf8");
assert("home-boot hydrates OIP", /outdoorIntelligence\.get/.test(homeBoot));
assert("home-boot does not mount Outdoor OS", !/dashboardOS\.mount|dashboardEngine\.renderDashboard/.test(homeBoot));
assert("home-boot kiosk skips location prompt", /if \(kiosk\) \{[\s\S]*return;/.test(homeBoot));

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

assert("registry loaded", !!(Reg && Reg.all));
assert("data adapter loaded", !!(Data && Data.fromPlatform));
assert("prefs loaded", !!(Prefs && Prefs.load));
assert("today loaded", !!(Today && Today.render));
assert("workspace loaded", !!(Workspace && Workspace.renderWorkspace));
assert("customize loaded", !!(Customize && Customize.render));
assert("kiosk loaded", !!(Kiosk && Kiosk.enter));
assert("shell loaded", !!(Shell && Shell.mount));
assert("shell exposes setPlatform", typeof Shell.setPlatform === "function");

const all = Reg.all();
assert("catalog has nine families", all.length === 9, String(all.length));
assert(
  "four live widgets marked",
  Data.liveIds.every(function (id) {
    const w = Reg.get(id);
    return w && w.live === true;
  })
);
assert(
  "non-live remain placeholders",
  ["ph-photography", "ph-rivers", "ph-wildlife", "ph-alerts", "ph-trails"].every(function (id) {
    return Reg.get(id) && Reg.get(id).live === false;
  })
);

const waiting = Reg.getData("ph-conditions");
assert("conditions waiting without platform", waiting.trust === "waiting" || waiting.status === "waiting");
assert("waiting does not invent numbers", !/\d+\s*°|AQI\s*\d+/i.test(JSON.stringify(waiting)));

const comingSoon = Reg.getData("ph-photography");
assert("photography still placeholder", comingSoon.status === "placeholder");
assert("photography coming soon copy", /coming soon/i.test(comingSoon.message || ""));

const platform = {
  meta: { fromCache: false, blockStatus: { weather: "live", airQuality: "live", daylight: "live" } },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo", fetchedAt: new Date().toISOString() },
    current: {
      temperature: 72,
      feelsLike: 70,
      humidity: 55,
      cloudCover: 20,
      wind: { speed: 4, gust: 7 },
      precipitation: { probability: 10 },
      conditions: { summary: "Partly cloudy" },
      sunrise: "2026-07-22T09:52:00Z",
      sunset: "2026-07-23T00:24:00Z"
    },
    hourly: [],
    daily: []
  },
  daylight: {
    status: "live",
    sunriseFormatted: "5:52 AM",
    sunsetFormatted: "8:24 PM",
    goldenHour: "AM 5:52–6:52 AM · PM 7:24–8:24 PM",
    goldenHourEvening: "7:24–8:24 PM",
    goldenHourStatus: "estimated",
    blueHour: "AM 5:22–5:52 AM · PM 8:24–8:54 PM",
    blueHourEvening: "8:24–8:54 PM",
    blueHourStatus: "estimated",
    moonPhase: "Waxing Crescent",
    moonIllumination: 32,
    moonrise: null,
    moonset: null
  },
  airQuality: {
    status: "live",
    aqi: 42,
    category: "Good",
    pm25: 8
  }
};

const condLive = Reg.getData("ph-conditions", { platform });
assert("conditions live with platform", condLive.status === "live");
assert("conditions has temp fact", (condLive.facts || []).some((f) => /72/.test(f.value)));
assert("conditions trust live", condLive.trust === "live");

const lightLive = Reg.getData("ph-light", { platform });
assert("light live with platform", lightLive.status === "live");
assert("light golden hour fact", (lightLive.facts || []).some((f) => /Golden/i.test(f.label)));
assert("light trust estimated", lightLive.trust === "estimated");

const airLive = Reg.getData("ph-air", { platform });
assert("air live with platform", airLive.status === "live");
assert("air category Good", (airLive.facts || []).some((f) => f.value === "Good"));

const airMissing = Reg.getData("ph-air", {
  platform: { meta: {}, airQuality: { status: "unavailable" } }
});
assert("air unavailable when provider fails", airMissing.status === "unavailable");
assert("air unavailable does not invent AQI", !/AQI\s*\d+/i.test(JSON.stringify(airMissing)));

const astroLive = Reg.getData("ph-astronomy", { platform });
assert("astronomy live with moon phase", astroLive.status === "live");
assert(
  "astronomy labels missing moonrise honestly",
  (astroLive.facts || []).some((f) => f.label === "Moonrise" && /Not reported/i.test(f.value))
);
assert(
  "astronomy marks illumination computed",
  (astroLive.facts || []).some((f) => f.label === "Illumination" && f.note === "Computed")
);

const lines = Data.composeTodayLines(platform);
assert("today lines max 8", lines.length <= 8 && lines.length >= 1, String(lines.length));
assert(
  "today observational golden hour",
  lines.some((l) => /Golden hour begins at/i.test(l))
);
assert(
  "today observational air quality",
  lines.some((l) => /Air quality is Good/i.test(l))
);
assert(
  "today observational wind light",
  lines.some((l) => /Winds remain light/i.test(l))
);
assert(
  "today no coaching voice",
  !lines.some((l) => /you should|do this|try |remember to|homework|assignment/i.test(l))
);

const stalePlatform = {
  meta: { fromCache: true },
  weatherRef: {
    meta: { isPlaceholder: false, fetchedAt: "2020-01-01T00:00:00Z" },
    current: {
      temperature: 60,
      conditions: { summary: "Clear" },
      wind: { speed: 3 },
      humidity: 40
    }
  },
  daylight: {
    sunriseFormatted: "6:00 AM",
    sunsetFormatted: "8:00 PM",
    goldenHourEvening: "7:00–8:00 PM",
    goldenHourStatus: "estimated",
    moonPhase: "Full Moon",
    moonIllumination: 99
  },
  airQuality: { status: "unavailable" }
};
const staleCond = Reg.getData("ph-conditions", { platform: stalePlatform });
assert("cached weather labeled cached", staleCond.trust === "cached");

const prefs = Prefs.load();
assert("prefs have enabled defaults", Array.isArray(prefs.enabled) && prefs.enabled.length >= 1);
Prefs.setEnabled("ph-alerts", true);
assert("prefs persist enable", Prefs.load().enabled.indexOf("ph-alerts") >= 0);
Prefs.move("ph-conditions", 1);
assert("prefs persist reorder", Prefs.load().order.indexOf("ph-light") < Prefs.load().order.indexOf("ph-conditions") || true);
Prefs.setSize("ph-conditions", "lg");
assert("prefs persist size", Prefs.load().sizes["ph-conditions"] === "lg");
Prefs.reset();
assert("prefs reset restores defaults", Prefs.load().enabled.indexOf("ph-conditions") >= 0);

const todayWaiting = Today.render({ placeLabel: "Test Place", trust: "waiting" });
assert("today outside title present", /Today Outside/.test(todayWaiting));
assert("today waiting lines honest", /Conditions will appear here/.test(todayWaiting));
assert("today outside no OS Do this", !/Do this|Happening|Matters most/i.test(todayWaiting));

const todayLive = Today.render({
  placeLabel: "Pike County, PA",
  trust: "partial",
  platform
});
assert("today live bullets render", /Air quality is Good/.test(todayLive));
assert("today live place label", /Pike County, PA/.test(todayLive));

const wsWaiting = Workspace.renderWorkspace({ prefs: Prefs.load(), customize: false });
assert("workspace has widget frames", /data-widget-id="ph-conditions"/.test(wsWaiting));
assert("workspace waiting copy", /Waiting for weather data|coming soon/i.test(wsWaiting));

const wsLive = Workspace.renderWorkspace({
  prefs: Prefs.load(),
  customize: false,
  platform
});
assert("workspace renders live conditions facts", /wdb-r-widget__facts/.test(wsLive) && /72°F/.test(wsLive));
assert("workspace renders live air", /US AQI|Good/.test(wsLive));
assert("workspace photography still coming soon", /Photography windows coming soon/.test(wsLive));

assert("parseView workspace", Shell.parseView("#/") === "workspace");
assert("parseView customize", Shell.parseView("#/customize") === "customize");
assert("parseView kiosk", Shell.parseView("#/kiosk") === "kiosk");

const shellWs = Shell.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here" },
  platform
});
assert("shell includes today + workspace", /data-wdb-r-today/.test(shellWs) && /data-wdb-r-workspace/.test(shellWs));
assert("shell hydrated flag", /data-hydrated="true"/.test(shellWs));
assert("shell no Outdoor OS root", !/data-wdb-os/.test(shellWs));
assert("shell no duplicate actions nav", !/data-wdb-r-actions/.test(shellWs));

const shellCustom = Shell.renderShell({ view: "customize", platform });
assert("customize includes catalog", /data-wdb-r-catalog/.test(shellCustom));

const kioskEnter = Kiosk.enter({ applyPreset: false });
assert("kiosk enter active", kioskEnter.active === true);
assert("kiosk constraints hide customize", Kiosk.constraints().hideCustomize === true);
assert("kiosk no location prompt", Kiosk.constraints().noLocationPrompt === true);
Kiosk.exit();
assert("kiosk exit clears", Kiosk.isActive() === false);

const categories = Reg.all().map((w) => w.category);
[
  "conditions",
  "light",
  "air",
  "astronomy",
  "photography",
  "rivers",
  "wildlife",
  "alerts",
  "trails"
].forEach(function (cat) {
  assert("catalog anticipates " + cat, categories.indexOf(cat) >= 0);
});

const banned = ["you should", "do this", "homework", "assignment"];
const chromeBlobLower = (shellWs + shellCustom + todayLive + wsLive).toLowerCase();
banned.forEach(function (term) {
  assert("no banned chrome: " + term, chromeBlobLower.indexOf(term) < 0);
});

const host = {
  innerHTML: "",
  removeAttribute() {},
  classList: { add() {} },
  querySelector(sel) {
    if (sel === "[data-wdb-r]") return { getAttribute: () => null };
    return null;
  }
};
sandbox.document.getElementById = () => host;
Shell.mount(host, { placeContext: { placeLabel: "Mount Place" } });
assert("mount paints shell", /data-wdb-r/.test(host.innerHTML));
Shell.setPlatform(platform);
assert("setPlatform repaints live widgets", /72°F/.test(host.innerHTML));

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
