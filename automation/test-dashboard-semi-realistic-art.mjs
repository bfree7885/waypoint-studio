#!/usr/bin/env node
/**
 * Semi-realistic atmospheric field-art quality gate.
 * Preserves moon illumination + precip NOW honesty.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const pass = (m) => console.log("PASS", m);
const fail = (m) => {
  console.error("FAIL", m);
  failed += 1;
};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const sandbox = {
  console,
  location: { pathname: "/apps/dashboard/" },
  localStorage: {
    _d: {},
    getItem(k) {
      return this._d[k] ?? null;
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
vm.runInNewContext(read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js"), sandbox);

const Gfx = sandbox.WDS.dashboardRebuildGraphics;
if (Gfx && /semi-realistic|field-art|visual-finish/.test(String(Gfx.version || ""))) {
  pass("semi-realistic field-art graphics version (" + Gfx.version + ")");
} else fail("missing semi-realistic graphics version");

/* Moon accuracy */
if (Math.abs(Gfx.moonIlluminationFraction(1) - 0.01) < 1e-9) pass("illum 1 → 1%");
else fail("illum 1 must remain 1%");
if (Math.abs(Gfx.moonIlluminationFraction(100) - 1) < 1e-9) pass("illum 100 → full");
else fail("illum 100 broken");

const waxKey = Gfx.moonPhaseKey(null, 28, 0.15);
const waneKey = Gfx.moonPhaseKey(null, 28, 0.85);
if (waxKey === "waxing-crescent" && waneKey === "waning-crescent") {
  pass("phaseValue distinguishes waxing vs waning");
} else fail("phaseValue moon key failed: " + waxKey + " / " + waneKey);

const geo28 = Gfx.moonGeometry("waxing-crescent", 28);
if (geo28 && Math.abs(geo28.lit - 0.28) < 0.001 && geo28.waxing) {
  pass("moonGeometry illumination drives lit amount");
} else fail("moonGeometry illumination not applied");

const moon2 = Gfx.render({ kind: "moon", value: 2, phase: "new moon", phaseValue: 0.02 });
const moon2Tex = (moon2.match(/wdb-r-luna-tex/g) || []).length;
const moon2EllipsesOutside = moon2.includes("wdb-r-luna-tex")
  ? 0
  : (moon2.match(/<ellipse/g) || []).length;
if (moon2.includes("wdb-r-luna") && moon2Tex === 0 && moon2EllipsesOutside === 0) {
  pass("2% moon has no unmasked maria/texture");
} else fail("2% moon still shows false surface illumination");

const moon40 = Gfx.render({
  kind: "moon",
  value: 40,
  phase: "waxing crescent",
  phaseValue: 0.2
});
if (moon40.includes("clipPath") && moon40.includes("wdb-r-luna-tex")) {
  pass("gibbous-enough moon uses clipped surface texture");
} else fail("moon surface texture missing or unclipped");

const wax = Gfx.render({
  kind: "moon",
  value: 22,
  phase: "waxing crescent",
  phaseValue: 0.14
});
const wane = Gfx.render({
  kind: "moon",
  value: 22,
  phase: "waning crescent",
  phaseValue: 0.86
});
if (wax !== wane && /data-limb="waxing"/.test(wax) && /data-limb="waning"/.test(wane)) {
  pass("waxing vs waning limb geometry differs");
} else fail("waxing/waning moon not distinct");

/* Precip NOW honesty */
const dry = Gfx.render({
  kind: "precip",
  nowProbability: 1,
  probability: 43,
  intensity: "none"
});
const wet = Gfx.render({
  kind: "precip",
  nowProbability: 80,
  intensity: "heavy"
});
if (/data-scene="precip-dry"/.test(dry) && !/data-rain="active"/.test(dry)) {
  pass("0–10% NOW stays precip-dry with no active rain");
} else fail("low NOW still paints rain");
if (!/wdb-r-cloud--cumulus|wdb-r-cloud--storm|wdb-r-cloud--stratus/.test(dry)) {
  pass("precip-dry uses atmosphere/horizon, not weather-icon clouds");
} else fail("precip-dry still paints cloud-icon silhouette");
if (/data-rain="active"/.test(wet) && (wet.match(/l-1\.8/g) || []).length > 0) {
  pass("wet NOW paints active curtain");
} else fail("wet precip missing rain curtain");

/* Organic clouds / no oval air */
const cloudy = Gfx.render({ kind: "sky", state: "cloudy" });
if (
  cloudy.includes("wdb-r-cloud--stratus") ||
  cloudy.includes("wdb-r-cloud--cumulus") ||
  cloudy.includes("wdb-r-cloud")
) {
  pass("cloudy uses organic cloud classes");
} else fail("cloudy missing organic cloud markup");

const air = Gfx.render({ kind: "aqi", value: 64 });
const airEllipses = (air.match(/<ellipse/g) || []).length;
if (air.includes("wdb-r-depth") && airEllipses === 0 && (air.match(/<path/g) || []).length >= 2) {
  pass("Air uses terrain-haze paths, not stacked ovals");
} else fail("Air still oval/stacked or missing depth");

const uv0 = Gfx.render({ kind: "uv", value: 0 });
const uv8 = Gfx.render({ kind: "uv", value: 8 });
if (uv0 !== uv8 && uv8.includes("feGaussianBlur") && !/<circle[^>]+stroke="#e8c888"/.test(uv0)) {
  pass("UV is natural glow (data-aware), not geometric rings");
} else fail("UV still icon-like or not data-aware");

["sunrise", "sunset", "golden", "blue-hour", "day"].forEach((k) => {
  const html = Gfx.render({ kind: "sun", state: k });
  if (
    html &&
    html.includes("wdb-r-light-bands") &&
    (html.includes("wdb-r-horizon") || html.includes("wdb-r-ridge"))
  ) {
    pass("Light scene " + k);
  } else fail("Light scene weak: " + k);
});

const alertQ = Gfx.render({ kind: "alert", active: false });
const alertStorm = Gfx.render({ kind: "alert", active: true, event: "Severe Thunderstorm Warning" });
const alertHeat = Gfx.render({ kind: "alert", active: true, event: "Excessive Heat Warning" });
if (alertQ.includes('data-illum="quiet"') && alertStorm.includes('data-illum="alert"')) {
  pass("alerts state-honest");
} else fail("alerts not state-honest");
if (!/wdb-r-cloud--cumulus|wdb-r-cloud--storm|wdb-r-cloud--stratus|wdb-r-cloud--light/.test(alertQ)) {
  pass("quiet alerts are calm horizon, not weather-icon cloud");
} else fail("quiet alerts still paint cloud icon");
if (alertStorm.includes("wdb-r-lightning") && !alertQ.includes("wdb-r-lightning")) {
  pass("lightning only when storm-like alert active");
} else fail("alert lightning honesty failed");
if (alertHeat !== alertStorm) pass("alert art responds to hazard type");
else fail("alert art ignores hazard type");

const hoursStable = Gfx.render({ kind: "hours", transition: "stable" });
const hoursRain = Gfx.render({ kind: "hours", transition: "rain-approaching" });
const hoursEve = Gfx.render({ kind: "hours", transition: "day-evening" });
if (
  hoursStable !== hoursRain &&
  hoursStable !== hoursEve &&
  !hoursStable.includes("wdb-r-hours-ticks") &&
  /data-scene="hours-/.test(hoursStable)
) {
  pass("Next Hours transition art is distinct without tick infographic");
} else fail("Next Hours transition art weak or tick-infographic remains");

/* Instrument distinctness */
const scenes = [
  Gfx.render({ kind: "sky", state: "clear" }),
  Gfx.render({ kind: "sun", state: "sunset" }),
  Gfx.render({ kind: "aqi", value: 42 }),
  Gfx.render({ kind: "moon", value: 72, phase: "waxing gibbous", phaseValue: 0.4 }),
  Gfx.render({ kind: "wind", speed: 18, direction: 270 }),
  Gfx.render({ kind: "precip", nowProbability: 80, intensity: "heavy" }),
  Gfx.render({ kind: "sky", state: "snow" })
];
if (new Set(scenes).size === scenes.length) pass("instrument scenes remain distinct");
else fail("instrument scenes collapsed to identical markup");

const css = read("design-system/css/wds-dashboard-rebuild.css");
if (css.includes("--wdb-r-glow-weather") && css.includes("--wdb-r-glow-strength")) {
  pass("luminous edge system preserved");
} else fail("neon edge system missing");
if (/grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css)) pass("mobile one-column CSS preserved");
else fail("mobile column CSS missing");

const dataSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js");
if (/event:\s*\(items\[0\]/.test(dataSrc) || /event:\s*items\[0\]/.test(dataSrc)) {
  pass("alerts payload passes event hint for hazard art");
} else fail("alerts payload missing event hint");

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll semi-realistic art quality gates passed.");
