#!/usr/bin/env node
/**
 * Dashboard Today Outside briefing — unit tests (no network).
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

const sandbox = { window: {}, console };
sandbox.window = sandbox;
sandbox.WDS = {};

function load(rel) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

load("design-system/js/dashboard/wds-dashboard-brief.js");
load("design-system/js/dashboard/wds-dashboard-today-summary.js");

const TS = sandbox.WDS.todaySummary;
assert("todaySummary loaded", !!(TS && TS.buildBullets && TS.render));

const loading = TS.buildBullets({ platform: {} });
assert("pending loading state", loading.ready === false && loading.verdict === "loading");

const live = TS.buildBullets({
  platform: {
    meta: { hydratedAt: "2026-07-19T12:00:00.000Z" },
    weatherRef: {
      meta: { isPlaceholder: false },
      current: {
        temperature: 72,
        humidity: 90,
        uvIndex: 7,
        wind: { speed: 20, direction: { label: "NW" } },
        precipitation: { probability: 20 },
        conditions: { summary: "Partly cloudy" }
      },
      daily: [{ uvIndex: 7, precipitation: { probability: 20 } }]
    },
    daylight: {
      sunriseFormatted: "5:48 AM",
      sunsetFormatted: "8:22 PM",
      goldenHour: "Golden hour begins near 7:40 PM"
    },
    airQuality: { usAqi: 42, category: "Good", status: "live" },
    alerts: { status: "live", items: [] }
  }
});

assert("live ready", live.ready === true);
assert("has why on bullets", live.bullets.some((b) => b.why && b.why.length > 8));
assert(
  "fog interpretation",
  live.bullets.some((b) => /fog/i.test(b.text) || /fog/i.test(b.why || ""))
);
assert(
  "telephoto / wind interpretation",
  live.bullets.some((b) => /telephoto|wind/i.test(b.text + " " + (b.why || "")))
);
assert(
  "uv interpretation without raw dump only",
  live.bullets.some((b) => /UV/i.test(b.text))
);
assert("preview capped", live.preview.length <= 3);

const html = TS.render({
  platform: {
    meta: { hydratedAt: "2026-07-19T12:00:00.000Z" },
    weatherRef: {
      meta: { isPlaceholder: false },
      current: { temperature: 68, humidity: 50, uvIndex: 2, conditions: { summary: "Clear" } },
      daily: [{}]
    },
    daylight: { sunriseFormatted: "6:00 AM", sunsetFormatted: "8:00 PM" },
    alerts: { status: "live", items: [] }
  }
});
assert("eyebrow Today Outside", /Today Outside/.test(html));
assert("preview list in hero", /wdb-today-summary__list--preview/.test(html));

const panel = TS.renderTodayPanel({
  platform: {
    meta: { hydratedAt: "2026-07-19T12:00:00.000Z" },
    weatherRef: {
      meta: { isPlaceholder: false },
      current: { temperature: 68, humidity: 50, uvIndex: 2, conditions: { summary: "Clear" } },
      daily: [{}]
    },
    alerts: { status: "live", items: [] }
  }
});
assert("panel has why label", /wdb-today-summary__why-label/.test(panel));

const osCompose = fs.readFileSync(
  path.join(ROOT, "design-system/js/dashboard/os/wds-dashboard-os-compose.js"),
  "utf8"
);
const osRender = fs.readFileSync(
  path.join(ROOT, "design-system/js/dashboard/os/wds-dashboard-os-render.js"),
  "utf8"
);
assert("Outdoor OS compose present", /dashboardOSCompose/.test(osCompose));
assert(
  "Outdoor OS interpret present",
  fs.existsSync(path.join(ROOT, "design-system/js/dashboard/os/wds-dashboard-os-interpret.js"))
);
const osInterpret = fs.readFileSync(
  path.join(ROOT, "design-system/js/dashboard/os/wds-dashboard-os-interpret.js"),
  "utf8"
);
assert("Outdoor OS PriorityRanker API", /dashboardOSInterpret/.test(osInterpret));
assert("Outdoor OS location panel", /id === "location"/.test(osRender) || /=== \"location\"/.test(osRender));
assert(
  "obsolete Recovery presentation gone",
  !fs.existsSync(path.join(ROOT, "design-system/js/dashboard/wds-dashboard-recovery.js.obsolete"))
);
const engineSrc = fs.readFileSync(
  path.join(ROOT, "design-system/js/dashboard/wds-dashboard-engine.js"),
  "utf8"
);
assert(
  "product engine prefers Outdoor OS over V2/Recovery",
  /var OS = global\.WDS && global\.WDS\.dashboardOS/.test(engineSrc) &&
    /OS\.renderDashboard/.test(engineSrc) &&
    engineSrc.indexOf("dashboardOS") < engineSrc.indexOf("dashboardRecovery")
);
assert(
  "V2 render not on product Outside page",
  !fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8").includes("wds-dashboard-v2-render")
);
assert(
  "obsolete customize gone",
  !fs.existsSync(path.join(ROOT, "design-system/js/dashboard/wds-dashboard-customize.js.obsolete")) &&
    !fs.existsSync(path.join(ROOT, "design-system/js/dashboard/wds-dashboard-customize.js"))
);
const recoveryStub = fs.readFileSync(
  path.join(ROOT, "design-system/js/dashboard/wds-dashboard-recovery.js"),
  "utf8"
);
assert("Recovery stub disabled", /isEnabled:\s*function\s*\(\)\s*\{\s*return false/.test(recoveryStub));
assert("quiet chrome attribute on Outside", fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8").includes('data-quiet-chrome="true"'));
assert("Volunteer not in OS prefs catalog UI", !/value="volunteer"/.test(osRender));

/* Legacy presentation must not become the normal production Outside route */
const dashHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
const navConfig = fs.readFileSync(
  path.join(ROOT, "design-system/js/platform/wds-app-nav-config.js"),
  "utf8"
);
const navRegistry = fs.readFileSync(
  path.join(ROOT, "design-system/ecosystem/nav-registry.json"),
  "utf8"
);
assert("Outside entry loads Outdoor OS CSS", /wds-dashboard-os\.css/.test(dashHtml));
assert("Outside entry does not load V2/V3 CSS", !/wds-dashboard-v2\.css|wds-dashboard-v3\.css/.test(dashHtml));
assert(
  "Outside entry has no Recovery/V2/V3 product chrome markers",
  !/data-wdb-recovery|data-wdb-v2|data-wdb-v3|Customize widgets|How is today/.test(dashHtml)
);
assert(
  "engine refuses legacy fallthrough on Outside",
  /isOutsideProductSurface/.test(engineSrc) && /outdoorOsUnavailableHtml/.test(engineSrc)
);
assert(
  "dashboard nav features empty (no Recovery/V2 tabs)",
  /"id":\s*"dashboard"[\s\S]*?"features":\s*\[\]/.test(navConfig) &&
    /"id":\s*"dashboard"[\s\S]*?"features":\s*\[\]/.test(navRegistry)
);
assert(
  "dashboard product titled Outside",
  /"title":\s*"Outside"/.test(navConfig) && /"title":\s*"Outside"/.test(navRegistry)
);
assert(
  "V2/V3 localStorage flags are not consulted by engine renderDashboard",
  !/waypoint-dashboard-v2/.test(engineSrc) && !/waypoint-dashboard-v3/.test(engineSrc)
);
assert(
  "home-boot Outside sections are outdoor-dashboard only",
  /sections:\s*\[["']outdoor-dashboard["']\]/.test(
    fs.readFileSync(path.join(ROOT, "apps/dashboard/js/home-boot.js"), "utf8")
  )
);

/* Runtime: stale V2/V3 flags must not change product render when OS is present */
const rt = { window: {}, console, document: { documentElement: { getAttribute: () => "dashboard" } }, location: { pathname: "/apps/dashboard/" } };
rt.window = rt;
rt.WDS = {
  dashboardOS: {
    renderDashboard() {
      return '<div data-wdb-os class="wdb-os"><p class="wdb-os__brand">Outside</p></div>';
    },
    mount() {
      return Promise.resolve();
    }
  },
  dashboardRecovery: {
    isEnabled() {
      return true;
    },
    renderDashboard() {
      return '<div data-wdb-recovery>RECOVERY</div>';
    }
  },
  dashboardWidgets: { all() { return []; } },
  dashboardSettings: {
    load() { return {}; },
    enabledWidgets() { return []; },
    favoriteWidgets() { return []; },
    customGroupSections() { return []; },
    enabledWidgetsBySection() { return []; }
  }
};
vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/wds-dashboard-engine.js"), "utf8"),
  rt,
  { filename: "wds-dashboard-engine.js" }
);
const osHtml = rt.WDS.dashboardEngine.renderDashboard({});
assert("runtime OS wins even if Recovery claims enabled", /data-wdb-os/.test(osHtml) && !/RECOVERY|data-wdb-recovery/.test(osHtml));

const rtNoOs = {
  window: {},
  console,
  document: { documentElement: { getAttribute: () => "dashboard" } },
  location: { pathname: "/apps/dashboard/" }
};
rtNoOs.window = rtNoOs;
rtNoOs.WDS = {
  dashboardRecovery: {
    isEnabled() {
      return true;
    },
    renderDashboard() {
      return '<div data-wdb-recovery>RECOVERY</div>';
    }
  },
  dashboardWidgets: { all() { return []; } },
  dashboardSettings: {
    load() { return {}; },
    enabledWidgets() { return [{ tier: "vital" }]; },
    favoriteWidgets() { return []; },
    customGroupSections() { return []; },
    enabledWidgetsBySection() { return []; }
  }
};
vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/wds-dashboard-engine.js"), "utf8"),
  rtNoOs,
  { filename: "wds-dashboard-engine.js" }
);
const missingOsHtml = rtNoOs.WDS.dashboardEngine.renderDashboard({});
assert(
  "Outside without OS does not fall through to Recovery/widgets",
  /data-wdb-os/.test(missingOsHtml) &&
    /unavailable|could not load/i.test(missingOsHtml) &&
    !/RECOVERY|data-wdb-recovery|wdb-vitals|wdb-grid/.test(missingOsHtml)
);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Today Outside tests passed.");
