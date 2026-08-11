#!/usr/bin/env node
/**
 * Dashboard visual-target gate — luminous edges, atmospheric art, mobile 1-col.
 * Usage: node automation/test-dashboard-visual-target.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let failed = 0;
function pass(m) {
  console.log("PASS", m);
}
function fail(m) {
  console.error("FAIL", m);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function load(rel, sandbox) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

const css = read("design-system/css/wds-dashboard-rebuild.css");

if (css.includes("--wdb-r-glow-weather") && css.includes("0 0 16px color-mix")) {
  pass("luminous edge tokens + outer diffusion present");
} else fail("missing luminous edge system");

const gaming = ["#4da3e0", "#8fd14a", "#e879c8", "#2dd4bf"];
if (!gaming.some((h) => css.toLowerCase().includes(h))) {
  pass("old RGB gaming hexes absent");
} else fail("gaming hex restored");

if (
  css.includes(".wdb-r-widget__art") &&
  css.includes(".wdb-r-hero__temp") &&
  css.includes(".wdb-r-hours__row")
) {
  pass("art / hero / hours composition CSS present");
} else fail("missing composition CSS");

if (
  /@media \(max-width:\s*47\.99rem\)[\s\S]*?\.wdb-r-customize-bar__columns\s*\{\s*display:\s*none/m.test(
    css
  )
) {
  pass("mobile CSS hides column picker");
} else fail("mobile column picker not hidden in CSS");

if (
  /@media \(max-width:\s*47\.99rem\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/m.test(
    css
  )
) {
  pass("mobile CSS forces one-column grids");
} else fail("mobile one-column grid missing");

const docs = read("docs/DASHBOARD-VISUAL-LANGUAGE.md");
if (docs.includes("Luminous edges") && docs.includes("Always one column")) {
  pass("visual language docs cover glow + mobile");
} else fail("docs incomplete");

function makeSandbox(matchesMobile) {
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
    matchMedia(q) {
      const mobile = String(q).includes("47.99");
      return { matches: mobile ? !!matchesMobile : false };
    }
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.WDS = {};
  [
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js"
  ].forEach((rel) => load(rel, sandbox));
  return sandbox;
}

const desk = makeSandbox(false);
const Gfx = desk.WDS.dashboardRebuildGraphics;
const Reg = desk.WDS.dashboardRebuildRegistry;
const Customize = desk.WDS.dashboardRebuildCustomize;
const Workspace = desk.WDS.dashboardRebuildWorkspace;
const Prefs = desk.WDS.dashboardRebuildPrefs;

if (Gfx && /atmospheric|cinematic/.test(String(Gfx.version || ""))) pass("graphics atmospheric module");
else fail("graphics not atmospheric");

const skies = [
  "clear",
  "partly",
  "cloudy",
  "rain",
  "heavy-rain",
  "storm",
  "snow",
  "fog",
  "wind",
  "clear-night"
];
if (
  skies.every((s) => {
    const html = Gfx.render({ kind: "sky", state: s });
    return html && html.includes("wdb-r-widget__art") && html.includes("data-illum");
  })
) {
  pass("sky atmospheric art for all states");
} else fail("sky art incomplete");

const phases = [
  "new",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full",
  "waning gibbous",
  "last quarter",
  "waning crescent"
];
if (
  phases.every((p) => {
    const html = Gfx.render({ kind: "moon", value: 40, phase: p });
    return html && html.includes("wdb-r-widget__art--moon");
  })
) {
  pass("moon phase atmospheric art");
} else fail("moon art broken");

const alertQuiet = Gfx.render({ kind: "alert", active: false });
const alertHot = Gfx.render({ kind: "alert", active: true });
if (
  alertQuiet &&
  alertQuiet.includes('data-illum="quiet"') &&
  alertHot &&
  alertHot.includes('data-illum="alert"')
) {
  pass("alerts art honest (quiet vs active)");
} else fail("alerts art honesty failed");

const condBody = Reg.render(
  { id: "ph-conditions", title: "Conditions" },
  {
    status: "live",
    trust: "live",
    current: { tempF: 81, feelsF: 83, conditions: "Overcast", windMph: 6, humidity: 55, precipProb: 13 },
    facts: [{ label: "Temp", value: "81°F" }],
    graphic: { kind: "sky", state: "cloudy" }
  }
);
if (
  condBody.includes("wdb-r-hero__temp") &&
  condBody.includes("wdb-r-widget__art") &&
  condBody.includes("Overcast")
) {
  pass("Conditions hero + atmospheric art");
} else fail("Conditions hero missing");

const hoursBody = Reg.render(
  { id: "ph-next-hours", title: "Next hours" },
  {
    status: "live",
    trust: "live",
    hours: [
      { label: "5 PM", tempF: 76, precipProb: 10, conditions: "Partly cloudy" },
      { label: "6 PM", tempF: 74, precipProb: 20, conditions: "Cloudy" }
    ],
    facts: [],
    graphic: { kind: "hours" }
  }
);
if (hoursBody.includes("wdb-r-hours__row") && hoursBody.includes("76°")) {
  pass("hourly forecast compact strip");
} else fail("hours strip missing");

const airBody = Reg.render(
  { id: "ph-air", title: "Air" },
  {
    status: "live",
    trust: "live",
    air: { aqi: 42, category: "Good", pm25: 8 },
    facts: [
      { label: "Quality", value: "Good" },
      { label: "US AQI", value: "42" }
    ],
    graphic: { kind: "aqi", value: 42 }
  }
);
if (airBody.includes("wdb-r-aqi__value") && airBody.includes("42")) pass("Air AQI hero");
else fail("Air hero missing");

const deskCust = Customize.render({ prefs: Prefs.defaults() });
if (deskCust.includes("wdb-r-customize-bar__columns") && deskCust.includes('data-columns="2"')) {
  pass("desktop Customize retains column control");
} else fail("desktop column control missing");

const mobile = makeSandbox(true);
const mobCust = mobile.WDS.dashboardRebuildCustomize.render({
  prefs: mobile.WDS.dashboardRebuildPrefs.defaults()
});
if (!mobCust.includes("wdb-r-customize-bar__columns") && !mobCust.includes('data-columns="2"')) {
  pass("mobile Customize omits column control entirely");
} else fail("mobile still exposes column control");

const mobWs = mobile.WDS.dashboardRebuildWorkspace.renderWorkspace({
  prefs: Object.assign({}, mobile.WDS.dashboardRebuildPrefs.defaults(), { gridColumns: 3 }),
  customize: false
});
if (mobWs.includes('data-columns="1"') && mobWs.includes("--wdb-r-columns: 1")) {
  pass("mobile workspace forces one column");
} else fail("mobile workspace not forced to 1 column");

const ids = Reg.all().map((w) => w.id);
if (ids.length === 12) pass("catalog remains 12 instruments");
else fail("catalog drift: " + ids.length);

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll visual-target gates passed.");
