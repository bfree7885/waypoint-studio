#!/usr/bin/env node
/**
 * Data-driven lunar disk — orthographic area, fixtures, single source of truth.
 * Run: node automation/test-dashboard-lunar.mjs
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

function near(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

const sandbox = {
  console,
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

load("design-system/js/dashboard/rebuild/wds-dashboard-lunar.js", sandbox);
load("design-system/js/wds-icons.js", sandbox);
load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js", sandbox);
load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js", sandbox);

const Lunar = sandbox.WDS.dashboardLunar;
const Data = sandbox.WDS.dashboardRebuildData;
const Reg = sandbox.WDS.dashboardRebuildRegistry;

assert("lunar module loaded", !!(Lunar && Lunar.normalize && Lunar.FIXTURES));
assert("MoonPhase alias", sandbox.WDS.MoonPhase === Lunar);
assert("fixtures include 3% waxing and waning", Lunar.FIXTURES.some((f) => f.illumination === 3 && f.limb === "waxing") && Lunar.FIXTURES.some((f) => f.illumination === 3 && f.limb === "waning"));

function sample(vs, id) {
  return vs.samples.find((s) => s.id === id);
}

function svgLooksFullLit(svg) {
  return /wdb-r-lunar__lit/.test(svg) && !/clip-path/.test(svg) && !/data-lunar-crescent="1"/.test(svg);
}

Lunar.FIXTURES.forEach(function (fix) {
  const state = Lunar.normalize({
    phaseValue: fix.phaseValue,
    illumination: fix.illumination,
    phase: fix.phase
  });
  const vis = Lunar.visualState(state);
  const svg = Lunar.renderDisk(state);
  const raster = Lunar.rasterLitFraction(state, 201);
  const pathFrac = Lunar.pathAreaFraction(state);
  const k = fix.illumination / 100;

  assert(fix.id + " state exists: " + fix.name, !!state);
  assert(
    fix.id + " illumination " + fix.illumination,
    state.illumination === fix.illumination,
    String(state.illumination)
  );
  assert(fix.id + " phase label", state.phase === fix.phase, state.phase);
  assert(fix.id + " limb " + fix.limb, state.limb === fix.limb, state.limb);
  assert(
    fix.id + " svg illumination attr",
    svg.indexOf('data-lunar-illumination="' + fix.illumination + '"') >= 0
  );
  assert(fix.id + " svg limb attr", svg.indexOf('data-lunar-limb="' + fix.limb + '"') >= 0);
  assert(fix.id + " visual illumination", vis.illumination === fix.illumination);

  const areaTol = k <= 0.05 || k >= 0.95 ? 0.025 : 0.04;
  assert(
    fix.id + " raster area ≈ " + fix.illumination + "%",
    near(raster, k, areaTol),
    "raster=" + raster.toFixed(4) + " expected=" + k
  );
  assert(
    fix.id + " path area ≈ " + fix.illumination + "%",
    near(pathFrac, k, areaTol + 0.02),
    "path=" + pathFrac.toFixed(4) + " expected=" + k
  );
  if (fix.illumination === 3) {
    assert(fix.id + " 3% is not mostly lit", raster < 0.12 && pathFrac < 0.12, "raster=" + raster + " path=" + pathFrac);
    assert(fix.id + " 3% svg is crescent sliver", /data-lunar-crescent="1"/.test(svg) && /clip-path/.test(svg));
    assert(fix.id + " 3% does not fill full disk", !svgLooksFullLit(svg));
    assert(fix.id + " almost dark", state.almostDark === true);
    assert(fix.id + " center unlit", sample(vis, "center").lit === false);
    assert(fix.id + " interior unlit", sample(vis, "right").lit === false && sample(vis, "left").lit === false);
  }
  if (fix.illumination === 0) {
    assert(fix.id + " nothing lit at 0%", vis.samples.every((s) => s.lit === false));
    assert(fix.id + " raster 0%", raster < 0.005, String(raster));
    assert(fix.id + " 0% has no lit surface", !/wdb-r-lunar__lit/.test(svg) && !/wdb-r-lunar__surface/.test(svg));
  }
  if (fix.illumination === 50) {
    assert(fix.id + " half flag", state.half === true);
    assert(fix.id + " center on terminator treated lit", sample(vis, "center").lit === true);
    if (fix.limb === "waxing") {
      assert(fix.id + " waxing right lit", sample(vis, "right").lit === true);
      assert(fix.id + " waxing left unlit", sample(vis, "left").lit === false);
    }
    if (fix.limb === "waning") {
      assert(fix.id + " waning left lit", sample(vis, "left").lit === true);
      assert(fix.id + " waning right unlit", sample(vis, "right").lit === false);
    }
  }
  if (fix.illumination === 100) {
    assert(fix.id + " full flag", state.full === true && vis.full === true);
    assert(fix.id + " all samples lit", vis.samples.every((s) => s.lit === true));
    assert(fix.id + " raster ~100%", raster > 0.98, String(raster));
  }
  if (fix.illumination === 25 || fix.illumination === 75 || fix.illumination === 10) {
    if (fix.limb === "waxing") {
      assert(fix.id + " waxing far-right lit", sample(vis, "far-right").lit === true);
      assert(fix.id + " waxing far-left unlit", sample(vis, "far-left").lit === false);
    }
    if (fix.limb === "waning") {
      assert(fix.id + " waning far-left lit", sample(vis, "far-left").lit === true);
      assert(fix.id + " waning far-right unlit", sample(vis, "far-right").lit === false);
    }
  }
  if (fix.illumination === 97) {
    assert(fix.id + " 97% not treated as full disk", state.full !== true);
    assert(fix.id + " 97% raster near 97% not 3%", raster > 0.9 && raster < 0.995, String(raster));
  }
});

const wax25 = Lunar.normalize({ phaseValue: 0.125 });
const wan25 = Lunar.normalize({ phaseValue: 0.875 });
assert("waxing 25% !== waning 25% signature", Lunar.visualState(wax25).pathSignature !== Lunar.visualState(wan25).pathSignature);
assert("waxing 25% lit side right", wax25.litSide === "right");
assert("waning 25% lit side left", wan25.litSide === "left");
assert("same illumination 25", wax25.illumination === 25 && wan25.illumination === 25);

const wax3 = Lunar.normalize({ phaseValue: 0.015, illumination: 3, phase: "New moon" });
const wan3 = Lunar.normalize({ phaseValue: 0.985, illumination: 3, phase: "New moon" });
assert("waxing 3% !== waning 3%", wax3.litSide === "right" && wan3.litSide === "left");
assert(
  "3% vs 97% are opposites not the same disk",
  Lunar.rasterLitFraction(wax3, 161) < 0.1 &&
    Lunar.rasterLitFraction(Lunar.normalize({ illumination: 97, phaseValue: 0.485 }), 161) > 0.9
);

const southWax = Lunar.normalize({ phaseValue: 0.125 }, { lat: -33.9 });
assert("southern hemisphere flips waxing to left", southWax.litSide === "left");
assert("southern still waxing limb", southWax.limb === "waxing");

const nearNew = Lunar.normalize({
  phase: "New moon",
  illumination: 3,
  phaseValue: 0.984
});
assert("live 3% new uses printed illumination", nearNew.illumination === 3);
assert("live 3% labeled New moon", nearNew.phase === "New moon");
assert("live 3% almost dark", nearNew.almostDark === true);
assert("live 3% waning sliver (phaseValue 0.984)", nearNew.limb === "waning");
assert("live 3% raster ~3% not ~70%", Lunar.rasterLitFraction(nearNew, 201) < 0.08);
assert(
  "live 3% svg not mostly lit",
  Lunar.renderDisk(nearNew).indexOf('data-lunar-illumination="3"') >= 0 &&
    /clip-path/.test(Lunar.renderDisk(nearNew)) &&
    /wdb-r-lunar__unlit/.test(Lunar.renderDisk(nearNew))
);

const printed = Lunar.normalize({ illumination: 3, phase: "New moon", phaseValue: 0.984 });
assert("printed 3% drives renderer", printed.illumination === 3);

const payload = Data.buildWidgetPayload("ph-astronomy", {
  daylight: {
    moonPhase: "New moon",
    moonIllumination: 3,
    moonPhaseValue: 0.984,
    moonrise: null,
    moonset: null
  },
  weatherRef: {
    meta: { isPlaceholder: false },
    current: { cloudCover: 10, conditions: { summary: "Clear" } }
  }
});
assert("payload lunarState single source", payload.lunarState && payload.lunarState.illumination === 3);
assert(
  "payload fact Moon matches state",
  (payload.facts || []).some((f) => f.label === "Moon" && f.value === payload.lunarState.phase)
);
assert(
  "payload fact Illumination matches state",
  (payload.facts || []).some(
    (f) => f.label === "Illumination" && f.value === payload.lunarState.illumination + "%"
  )
);
const html = Reg.render(Reg.get("ph-astronomy"), payload);
assert("tile html has lunar disk", /data-lunar-illumination="3"/.test(html));
assert("tile Moon label New moon", /New moon/.test(html));
assert("tile illumination 3%", /3%/.test(html));
assert("tile 3% uses illumination clip", /clip-path/.test(html));

const condRain = Data.buildWidgetPayload("ph-conditions", {
  weatherRef: {
    meta: { isPlaceholder: false },
    current: {
      temperature: 48,
      conditions: { summary: "Thunderstorm" },
      cloudCover: 90,
      wind: { speed: 12 },
      humidity: 80,
      precipitation: { probability: 80, amount: 0.2 }
    }
  }
});
assert("storm sky kind", condRain.skyKind === "storm");
assert("storm sky icon", condRain.skyIcon === "storm");

const condDryRainLabel = Data.buildWidgetPayload("ph-conditions", {
  weatherRef: {
    meta: { isPlaceholder: false },
    current: {
      temperature: 52,
      conditions: { summary: "Light rain" },
      cloudCover: 40,
      precipitation: { probability: 1, amount: 0 }
    },
    hourly: [
      { time: "2026-08-12T22:00", precipitation: { probability: 1 } },
      { time: "2026-08-12T03:00", precipitation: { probability: 5 } }
    ]
  }
});
assert("1% now is dry band", condDryRainLabel.precipBand === "dry", condDryRainLabel.precipBand);
assert("1% does not use rain icon", condDryRainLabel.skyIcon !== "rain" && condDryRainLabel.skyKind !== "rain");
assert(
  "now 1% printed",
  (condDryRainLabel.facts || []).some((f) => f.label === "Precip now" && f.value === "1%")
);
assert(
  "peak 5% explicit",
  (condDryRainLabel.facts || []).some((f) => f.label === "Precip peak" && /5%/.test(f.value)),
  JSON.stringify(condDryRainLabel.facts)
);
assert("rain timing future peak flagged", condDryRainLabel.rainTiming && condDryRainLabel.rainTiming.futurePeak === true);

const airBad = Data.buildWidgetPayload("ph-air", {
  airQuality: { status: "live", usAqi: 165, category: "Unhealthy", pm25: 80 }
});
assert("unhealthy aqi band", airBad.aqiBand === "unhealthy");

const airGood = Data.buildWidgetPayload("ph-air", {
  airQuality: { status: "live", usAqi: 39, category: "Good", pm25: 10 }
});
assert("good aqi band", airGood.aqiBand === "good");

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8");
assert("css lunar disk", /wdb-r-lunar__disk/.test(css));
assert("css one-column phone rule intact", /max-width:\s*47\.99rem/.test(css));
assert("css aqi unhealthy color", /data-aqi="unhealthy"/.test(css));

const wdsJs = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
assert(
  "wds.js loads lunar before data",
  wdsJs.indexOf("wds-dashboard-lunar.js") < wdsJs.indexOf("wds-dashboard-rebuild-data.js") &&
    wdsJs.indexOf("wds-dashboard-lunar.js") >= 0
);

assert("moon icon exists", sandbox.WDS.icons.names.indexOf("moon") >= 0);
assert("astronomy catalog icon is moon", Reg.get("ph-astronomy").icon === "moon");

if (failures.length) {
  console.error("\nFAILED", failures.length, "of", passed + failures.length);
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("\nAll", passed, "lunar accuracy checks passed.");
