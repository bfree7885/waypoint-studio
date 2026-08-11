#!/usr/bin/env node
/**
 * Dashboard visual refinement gate — field-guide graphics + quiet illumination.
 * Usage: node automation/test-dashboard-visual-refinement.mjs
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
const neon = ["#4da3e0", "#8fd14a", "#a78bfa", "#e879c8", "#2dd4bf", "#3d8f5a"];
const neonHit = neon.filter((h) => css.toLowerCase().includes(h.toLowerCase()));
if (!neonHit.length) pass("no neon category hex in rebuild CSS");
else fail("neon hex still present: " + neonHit.join(", "));

if (!/0\s+0\s+24px\s+color-mix|0\s+0\s+32px\s+color-mix/.test(css)) {
  pass("no outer neon glow box-shadow rings");
} else fail("outer glow rings still present");

if (
  css.includes(".wdb-r-widget__atmosphere") &&
  css.includes("data-illum") &&
  css.includes("--wdb-r-illum-rain") &&
  css.includes("--wdb-r-illum-golden")
) {
  pass("atmosphere + illumination tokens present");
} else fail("missing atmosphere / illum CSS contracts");

if (css.includes("prefers-reduced-motion")) pass("reduced-motion rules present");
else fail("missing reduced-motion");

const docs = read("docs/DASHBOARD-VISUAL-LANGUAGE.md");
if (
  docs.includes("Illustration system") &&
  docs.includes("Illumination") &&
  docs.includes("Moon phase") &&
  docs.includes("Surface")
) {
  pass("visual language doc covers illustration/illum/moon/surface");
} else fail("docs/DASHBOARD-VISUAL-LANGUAGE.md incomplete");

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
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.WDS = {};

[
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js"
].forEach((rel) => load(rel, sandbox));

const Gfx = sandbox.WDS.dashboardRebuildGraphics;
const Reg = sandbox.WDS.dashboardRebuildRegistry;

if (Gfx && String(Gfx.version).includes("field-guide")) pass("graphics module field-guide");
else fail("graphics version missing field-guide");

const skyNeed = [
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
const skyOk = skyNeed.every((s) => {
  const html = Gfx.render({ kind: "sky", state: s });
  return html && html.includes("wdb-r-graphic") && html.includes("data-illum");
});
if (skyOk) pass("sky states render with data-illum (" + skyNeed.length + ")");
else fail("sky state render incomplete");

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
const phaseOk = phases.every((p) => {
  const key = Gfx.moonPhaseKey(p, 50);
  const html = Gfx.render({ kind: "moon", value: 50, phase: p });
  return key && html && html.includes("wdb-r-graphic--moon");
});
if (phaseOk) pass("moon phases map and render (" + phases.length + ")");
else fail("moon phase mapping broken");

const lightKinds = ["sunrise", "sunset", "golden", "blue-hour"];
const lightOk = lightKinds.every((k) => {
  const html = Gfx.render({ kind: "sun", state: k });
  return html && html.includes("data-illum");
});
if (lightOk) pass("light/photography graphics render");
else fail("light graphics incomplete");

const aqi = Gfx.render({ kind: "aqi", value: 120 });
if (aqi && aqi.includes("aqi-usg") && aqi.includes('data-illum="aqi-usg"')) {
  pass("AQI atmospheric graphic progressive");
} else fail("AQI graphic missing progressive band");

const alertOn = Gfx.render({ kind: "alert", active: true });
if (alertOn && alertOn.includes('data-illum="alert"')) pass("alert active illumination");
else fail("alert illumination missing");

const body = Reg.render(
  { id: "ph-conditions", title: "Conditions" },
  {
    status: "ready",
    trust: "live",
    facts: [{ label: "Now", value: "72°" }],
    graphic: { kind: "sky", state: "rain" }
  }
);
if (
  body.includes("wdb-r-widget__atmosphere") &&
  body.includes("wdb-r-widget__content") &&
  body.includes('data-illum="rain"')
) {
  pass("registry body uses atmosphere + content + illum");
} else fail("registry composition missing atmosphere layout");

const catalog = Reg.all().map((w) => w.id);
const depth = [
  "ph-conditions",
  "ph-next-hours",
  "ph-doorway",
  "ph-alerts",
  "ph-air",
  "ph-precip-window",
  "ph-uv",
  "ph-light",
  "ph-astronomy",
  "ph-wind",
  "ph-comfort",
  "ph-day-range"
];
if (catalog.length === depth.length && depth.every((id) => catalog.includes(id))) {
  pass("tile catalog unchanged at 12 depth instruments");
} else fail("catalog size drift: " + catalog.length + " ids");

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll visual refinement gates passed.");
