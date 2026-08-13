#!/usr/bin/env node
/**
 * V1 final visual finish quality gate.
 * Cartoon-cloud removal, quiet alert/dry rain horizons, hours transitions,
 * Details affordance, micro-type bumps — without touching moon geometry.
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

if (Gfx && /v1-visual-finish/.test(String(Gfx.version || ""))) pass("graphics version " + Gfx.version);
else fail("expected 5.3.0-v1-visual-finish");

/* Cloud family distinctness */
const dens = ["cirrus", "scattered", "overcast", "storm", "fog"].map((d) =>
  Gfx.render({ kind: "sky", state: d === "scattered" ? "partly" : d === "overcast" ? "cloudy" : d === "storm" ? "storm" : d === "fog" ? "fog" : "clear" })
);
if (new Set(dens).size === dens.length) pass("sky density scenes remain distinct");
else fail("sky density scenes collapsed");

const cloudy = Gfx.render({ kind: "sky", state: "cloudy" });
const storm = Gfx.render({ kind: "sky", state: "storm" });
const fog = Gfx.render({ kind: "sky", state: "fog" });
if (cloudy.includes("wdb-r-cloud--stratus") && storm.includes("wdb-r-cloud--storm") && fog.includes("wdb-r-cloud--fog")) {
  pass("cloud family class markers present");
} else fail("cloud family markers missing");
if (cloudy.includes("feGaussianBlur") || storm.includes("feGaussianBlur")) pass("soft-edge cloud filters present");
else fail("cloud soft edges missing");

/* Quiet alert / dry rain — no weather-icon clouds */
const alertQ = Gfx.render({ kind: "alert", active: false });
const dry = Gfx.render({ kind: "precip", nowProbability: 4, probability: 55 });
if (/data-illum="quiet"/.test(alertQ) && !/wdb-r-cloud--(cumulus|storm|stratus)/.test(alertQ) && /wdb-r-horizon|wdb-r-ridge/.test(alertQ)) {
  pass("alerts none = calm atmospheric horizon");
} else fail("alerts none still cloud-icon or missing horizon");
if (/data-scene="precip-dry"/.test(dry) && !/data-rain="active"/.test(dry) && !/wdb-r-cloud--(cumulus|storm|stratus)/.test(dry)) {
  pass("rain dry = atmosphere without cloud icon / streaks");
} else fail("rain dry still icon-like or raining");

/* Hours transitions */
const hs = ["stable", "clearing", "rain-approaching", "day-evening", "clouds-building"].map((t) =>
  Gfx.render({ kind: "hours", transition: t })
);
if (new Set(hs).size === hs.length && !hs[0].includes("wdb-r-hours-ticks")) {
  pass("Next Hours transitions distinct, no tick infographic");
} else fail("Next Hours transitions weak");

/* Moon untouched */
const moonSrc = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js");
const moonFn = moonSrc.indexOf("function moonDisc(");
const moonEnd = moonSrc.indexOf("function normalizeSkyState(");
const moonBlock = moonSrc.slice(moonFn, moonEnd);
if (
  moonBlock.includes("moonLitPath") &&
  moonBlock.includes("moonSurfaceTexture") &&
  moonBlock.includes("data-limb") &&
  /k >= 0\.08/.test(moonBlock)
) {
  pass("Astronomy lunar renderer block still present with lit-path + texture gate");
} else fail("moon renderer appears altered/missing");

const wax = Gfx.render({ kind: "moon", value: 22, phase: "waxing crescent", phaseValue: 0.14 });
const wane = Gfx.render({ kind: "moon", value: 22, phase: "waning crescent", phaseValue: 0.86 });
if (wax !== wane && /data-limb="waxing"/.test(wax) && /data-limb="waning"/.test(wane)) pass("waxing/waning limbs preserved");
else fail("moon limb geometry broken");

/* Preserve Air / UV / Light quality markers */
const air = Gfx.render({ kind: "aqi", value: 40 });
const uv = Gfx.render({ kind: "uv", value: 8 });
const light = Gfx.render({ kind: "sun", state: "golden" });
if (air.includes("wdb-r-depth") && uv.includes("feGaussianBlur") && light.includes("wdb-r-light-bands")) {
  pass("Air / UV / Light quality markers preserved");
} else fail("Air/UV/Light quality markers degraded");

/* Details affordance + type bumps */
const depth = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-depth.js");
if (/Details ›/.test(depth) || /Details &rsaquo;/.test(depth) || /Details &#8250;/.test(depth)) {
  pass("Details › affordance present");
} else fail("Details affordance not updated");

const css = read("design-system/css/wds-dashboard-rebuild.css");
if (/wdb-r-group__label[\s\S]*?font-size:\s*0\.75rem/.test(css)) pass("family label type bumped");
else fail("family label still tiny");
if (/wdb-r-hero__meta dt[\s\S]*?font-size:\s*0\.7rem/.test(css)) pass("WIND/HUMIDITY/PRECIP labels bumped");
else fail("hero meta labels still tiny");
if (/min\(42%/.test(css) || /min\(46%/.test(css)) pass("art footprint tightened toward right 30–40%");
else fail("art footprint not restrained");

const data = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js");
if (/hoursArtTransition|transition:\s*hoursArtTransition/.test(data)) pass("Next Hours graphic carries transition hint");
else fail("Next Hours transition wiring missing");

/* Live hoursArtTransition: weather change beats evening labels (3 PM → 6 PM). */
const dataSandbox = {
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  isFinite,
  parseFloat,
  parseInt,
  JSON
};
dataSandbox.global = dataSandbox;
dataSandbox.window = dataSandbox;
dataSandbox.WDS = {};
vm.runInNewContext(data, dataSandbox);
const Data = dataSandbox.WDS.dashboardRebuildData;

function afternoonISO(hour, rollDay) {
  const d = new Date();
  if (rollDay) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  d.setMilliseconds(0);
  return d.toISOString();
}
const rollAfternoon = new Date().setHours(15, 0, 0, 0) < Date.now() - 20 * 60 * 1000;
function afternoonHourly(rows) {
  return [15, 16, 17, 18].map((hour, i) => {
    const row = rows[i] || {};
    return {
      time: afternoonISO(hour, rollAfternoon),
      temperature: 74,
      precipitation: { probability: row.prob != null ? row.prob : 10 },
      conditions: { summary: row.sky || "Clear" }
    };
  });
}
function nextHoursGraphic(hourly, currentProb) {
  return Data.buildWidgetPayload("ph-next-hours", {
    meta: {},
    weatherRef: {
      meta: { isPlaceholder: false },
      current: { precipitation: { probability: currentProb } },
      hourly
    }
  });
}

const origTLS = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function () {
  const h = this.getHours();
  const h12 = h % 12 || 12;
  return h12 + (h < 12 ? " AM" : " PM");
};
try {
  const rainNh = nextHoursGraphic(
    afternoonHourly([{ prob: 10, sky: "Clear" }, { prob: 18 }, { prob: 35 }, { prob: 50, sky: "Rain" }]),
    10
  );
  if (rainNh && rainNh.graphic && rainNh.graphic.transition === "rain-approaching") {
    pass("afternoon rising precip uses rain-approaching art, not day-evening");
  } else {
    fail("afternoon rising precip masked by evening art: " + ((rainNh && rainNh.graphic && rainNh.graphic.transition) || "missing"));
  }

  const cloudNh = nextHoursGraphic(
    afternoonHourly([{ sky: "Clear", prob: 5 }, { sky: "Clear" }, { sky: "Partly cloudy" }, { sky: "Cloudy", prob: 10 }]),
    5
  );
  if (cloudNh && cloudNh.graphic && cloudNh.graphic.transition === "clouds-building") {
    pass("afternoon cloud-up uses clouds-building art, not day-evening");
  } else {
    fail("afternoon clouds-building masked by evening art: " + ((cloudNh && cloudNh.graphic && cloudNh.graphic.transition) || "missing"));
  }

  const clearNh = nextHoursGraphic(
    afternoonHourly([{ sky: "Cloudy", prob: 30 }, { sky: "Cloudy" }, { sky: "Partly cloudy" }, { sky: "Clear", prob: 8 }]),
    30
  );
  if (clearNh && clearNh.graphic && clearNh.graphic.transition === "clearing") {
    pass("afternoon clearing uses clearing art, not day-evening");
  } else {
    fail("afternoon clearing masked by evening art: " + ((clearNh && clearNh.graphic && clearNh.graphic.transition) || "missing"));
  }

  const eveNh = nextHoursGraphic(
    afternoonHourly([{ sky: "Clear", prob: 8 }, { prob: 8 }, { prob: 10 }, { sky: "Clear", prob: 10 }]),
    8
  );
  if (eveNh && eveNh.graphic && eveNh.graphic.transition === "day-evening") {
    pass("stable afternoon→evening still uses day-evening art");
  } else {
    fail("stable evening transition lost: " + ((eveNh && eveNh.graphic && eveNh.graphic.transition) || "missing"));
  }
} finally {
  Date.prototype.toLocaleTimeString = origTLS;
}

const matrix = read("docs/rebuild-2026/dashboard-v1-visual-finish-matrix.html");
const compare = read("docs/rebuild-2026/dashboard-v1-visual-finish-compare.html");
if (matrix.includes("Thin crescent") && matrix.includes("Rain approaching") && compare.includes("cartoon")) {
  pass("fixture matrix + comparison page present");
} else fail("fixture docs incomplete");

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll V1 visual finish gates passed.");
