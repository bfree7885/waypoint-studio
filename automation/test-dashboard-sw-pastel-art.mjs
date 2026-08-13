#!/usr/bin/env node
/**
 * Southwestern pastel identity + unique data-driven instrument art gate.
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

const css = read("design-system/css/wds-dashboard-rebuild.css");
const tokens = read("design-system/css/wds-tokens.css");
const shell = read("design-system/css/wds-app-shell.css");
const gfxSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js");
const dataSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js");
const docs = read("docs/DASHBOARD-VISUAL-LANGUAGE.md");

if (/--wdb-r-dusty-rose/.test(css) && /--wdb-r-peach/.test(css) && /--wdb-r-adobe/.test(css) && /--wdb-r-turquoise/.test(css)) {
  pass("SW pastel tokens present");
} else fail("missing SW pastel tokens");

if (/--wdb-r-charcoal/.test(css) && /--wdb-r-volcanic/.test(css) && /--wdb-r-desert-plum/.test(css)) {
  pass("high-desert foundation tokens present");
} else fail("missing high-desert foundation tokens");

if (!/--wp-aubergine/.test(css) && !/#8b7ab0/.test(css) && !/var\(--wp-purple/.test(css)) {
  pass("legacy purple/aubergine absent from dashboard rebuild CSS");
} else fail("legacy purple/aubergine still in dashboard rebuild CSS");

if (/html\[data-product="dashboard"\][\s\S]*#141210/.test(css)) {
  pass("dashboard page foundation is volcanic charcoal");
} else fail("dashboard page foundation not charcoal");

if (/charcoal → desert plum → adobe → peach|charcoal → desert plum/.test(css) || /wdb-r-peach/.test(css) && /wdb-r-today/.test(css)) {
  pass("Today Outside twilight uses SW pastels");
} else fail("Today Outside still old purple wash");

const dashBlock = tokens.split('[data-product="dashboard"]')[1] || "";
if (/--wp-accent:\s*#c4908a/.test(dashBlock) && /--wp-bg:\s*#141210/.test(dashBlock)) {
  pass("dashboard product tokens dusty rose on charcoal");
} else fail("dashboard product tokens still purple-on-aubergine");

if (/was-shell\[data-product="dashboard"\][\s\S]*#e0b090/.test(shell) && /#c4908a/.test(shell)) {
  pass("active nav is SW pastel, not glowing purple bar");
} else fail("dashboard nav active state not SW pastel");

if (/grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css) && /customize-bar__columns[\s\S]*display:\s*none/.test(css)) {
  pass("mobile one-column + hidden column picker preserved");
} else fail("mobile layout contract broken");

if (css.includes("0 0 22px") && css.includes("--wdb-r-glow-strength") && css.includes("ellipse 85% 60% at 0% 0%")) {
  pass("luminous desert-sunset edges preserved");
} else fail("luminous edges missing");

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
vm.runInNewContext(gfxSrc, sandbox);

const Gfx = sandbox.WDS.dashboardRebuildGraphics;
if (Gfx && /(instrument|semi-realistic|field-art|moon-rain)/.test(String(Gfx.version || ""))) {
  pass("instrument-scene graphics version (" + Gfx.version + ")");
} else fail("graphics version not instrument scenes");

const cond = Gfx.render({ kind: "sky", state: "clear" });
const rain = Gfx.render({ kind: "sky", state: "rain" });
const snow = Gfx.render({ kind: "sky", state: "snow" });
const storm = Gfx.render({ kind: "sky", state: "storm" });
const light = Gfx.render({ kind: "sun", state: "sunset" });
const day = Gfx.render({ kind: "sun", state: "day" });
const air = Gfx.render({ kind: "aqi", value: 42 });
const moon = Gfx.render({ kind: "moon", value: 72, phase: "waxing gibbous", phaseValue: 0.4 });
const wind = Gfx.render({ kind: "wind", speed: 18, direction: 270 });
const precipWet = Gfx.render({ kind: "precip", probability: 80, intensity: "heavy" });
const precipDry = Gfx.render({ kind: "precip", probability: 8, intensity: "none" });

const MESA = "wdb-r-mesa";
const HORIZON = "wdb-r-horizon";
const DEPTH = "wdb-r-depth";
const LUNA = "wdb-r-luna";
const FLOW = "wdb-r-flow";
const CURTAIN = "wdb-r-curtain";
const WINTER = "wdb-r-winter";

if (cond.includes(MESA) && !cond.includes(HORIZON) && !cond.includes(LUNA)) pass("Conditions uses desert mesas, not Light/Moon subjects");
else fail("Conditions scene not mesa-weather");

if (light.includes(HORIZON) && light.includes("wdb-r-light-bands") && !light.includes(MESA)) pass("Light is horizon/sun, not mesa clone");
else fail("Light still shares Conditions mesa");

if (day.includes(HORIZON) && day.includes("cx=\"100\"") && !day.includes(MESA)) pass("midday Light is high sun on horizon");
else fail("day Light scene missing");

if (air.includes(DEPTH) && !air.includes(MESA) && (air.match(/<path/g) || []).length >= 2) {
  pass("Air is depth/visibility terrain haze, not tinted mesas");
} else fail("Air still mesa clone");

if (moon.includes(LUNA) && moon.includes("r=\"28\"") && !moon.includes(MESA)) pass("Moon is close-up textured disc, not landscape with moon");
else fail("Moon still landscape clone");

if (wind.includes(FLOW) && !wind.includes(MESA) && !wind.includes(CURTAIN)) pass("Wind is grass/flow movement, not mesa+streaks");
else fail("Wind still clone of weather/precip");

if (precipWet.includes(CURTAIN) && !precipWet.includes(MESA) && precipWet !== precipDry) pass("Precipitation is rain curtain driven by probability");
else fail("Precip still weather clone or not data-driven");

if (snow.includes(WINTER) && !snow.includes(CURTAIN) && snow !== rain) pass("Snow is winter drifts, not recolored rain");
else fail("Snow still recolored weather");

if ((storm.includes("108 36") || storm.includes("108 34") || storm.includes("wdb-r-lightning")) && storm.includes(MESA)) {
  pass("Storm keeps lightning on weather mesas");
} else fail("Storm lost lightning");

const scenes = [cond, light, air, moon, wind, precipWet, snow];
const unique = new Set(scenes);
if (unique.size === scenes.length) pass("seven instrument scenes are not identical markup");
else fail("instrument scenes still share identical markup");

const wax = Gfx.render({ kind: "moon", value: 22, phase: "waxing crescent", phaseValue: 0.14 });
const wane = Gfx.render({ kind: "moon", value: 22, phase: "waning crescent", phaseValue: 0.86 });
if (
  wax !== wane &&
  (/data-limb="waxing"/.test(wax) || wax.includes("clipPath")) &&
  (/data-limb="waning"/.test(wane) || wane.includes("clipPath"))
) {
  pass("waxing vs waning moon geometry differs");
} else fail("waxing/waning moon not distinct");

if (precipWet.split("<path").length > precipDry.split("<path").length) pass("heavier precip draws denser curtain");
else fail("precip density not driven by probability");

const windE = Gfx.render({ kind: "wind", speed: 6, direction: 90 });
const windW = Gfx.render({ kind: "wind", speed: 22, direction: 270 });
if (windE !== windW) pass("wind art changes with speed/direction");
else fail("wind art ignores live speed/direction");

if (dataSrc.includes("precipGraphic") && dataSrc.includes("direction: cur.windDir") && dataSrc.includes("state: \"day\"")) {
  pass("live data wires precip/wind/time-of-day into graphics");
} else fail("data adapters not driving unique art");

if (
  docs.includes("Southwestern") &&
  docs.includes("instrument") &&
  docs.includes("mesa") &&
  docs.includes("horizon")
) {
  pass("visual language documents SW identity + unique instruments");
} else fail("docs missing SW / unique-art rules");

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll Southwestern pastel + unique art gates passed.");
