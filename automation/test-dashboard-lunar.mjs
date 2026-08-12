#!/usr/bin/env node
/**
 * Data-driven lunar disk — fixtures, single source of truth, waxing vs waning.
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
assert("ten fixtures", Lunar.FIXTURES.length === 10);

function sample(vs, id) {
  return vs.samples.find((s) => s.id === id);
}

Lunar.FIXTURES.forEach(function (fix) {
  const state = Lunar.normalize({
    phaseValue: fix.phaseValue,
    illumination: fix.illumination,
    phase: fix.phase
  });
  const vis = Lunar.visualState(state);
  const svg = Lunar.renderDisk(state);

  assert(fix.id + " state exists: " + fix.name, !!state);
  assert(
    fix.id + " illumination " + fix.illumination,
    state.illumination === fix.illumination,
    String(state.illumination)
  );
  assert(
    fix.id + " phase label",
    state.phase === fix.phase,
    state.phase
  );
  assert(
    fix.id + " limb " + fix.limb,
    state.limb === fix.limb,
    state.limb
  );
  assert(
    fix.id + " svg illumination attr",
    svg.indexOf('data-lunar-illumination="' + fix.illumination + '"') >= 0
  );
  assert(
    fix.id + " svg limb attr",
    svg.indexOf('data-lunar-limb="' + fix.limb + '"') >= 0
  );
  assert(fix.id + " visual illumination", vis.illumination === fix.illumination);
  assert(fix.id + " visual limb", vis.limb === fix.limb);

  if (fix.illumination <= 3) {
    assert(fix.id + " almost dark", state.almostDark === true && vis.almostDark === true);
    assert(fix.id + " center unlit", sample(vis, "center").lit === false);
    assert(fix.id + " right unlit", sample(vis, "right").lit === false);
  }
  if (fix.illumination === 0) {
    assert(fix.id + " nothing lit at 0%", vis.samples.every((s) => s.lit === false));
  }
  if (fix.illumination >= 45 && fix.illumination <= 55) {
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
  if (fix.illumination >= 97) {
    assert(fix.id + " full flag", state.full === true && vis.full === true);
    assert(fix.id + " all samples lit", vis.samples.every((s) => s.lit === true));
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
});

const wax25 = Lunar.normalize({ phaseValue: 0.125 });
const wan25 = Lunar.normalize({ phaseValue: 0.875 });
assert("waxing 25% !== waning 25% signature", Lunar.visualState(wax25).pathSignature !== Lunar.visualState(wan25).pathSignature);
assert("waxing 25% lit side right", wax25.litSide === "right");
assert("waning 25% lit side left", wan25.litSide === "left");
assert("same illumination 25", wax25.illumination === 25 && wan25.illumination === 25);

const wax75 = Lunar.normalize({ phaseValue: 0.375 });
const wan75 = Lunar.normalize({ phaseValue: 0.625 });
assert("waxing 75% !== waning 75% signature", Lunar.visualState(wax75).pathSignature !== Lunar.visualState(wan75).pathSignature);

const southWax = Lunar.normalize({ phaseValue: 0.125 }, { lat: -33.9 });
assert("southern hemisphere flips waxing to left", southWax.litSide === "left");
assert("southern still waxing limb", southWax.limb === "waxing");

const nearNew = Lunar.normalize({
  phase: "New moon",
  illumination: 3,
  phaseValue: 0.984
});
assert("live 3% new uses phaseValue illumination", nearNew.illumination === 3);
assert("live 3% labeled New moon", nearNew.phase === "New moon");
assert("live 3% almost dark", nearNew.almostDark === true);
assert("live 3% not full shape", nearNew.shape === "new");
assert("live 3% waning sliver (phaseValue 0.984)", nearNew.limb === "waning");
assert(
  "live 3% svg not mostly lit",
  Lunar.renderDisk(nearNew).indexOf('data-lunar-shape="new"') >= 0 &&
    Lunar.renderDisk(nearNew).indexOf('data-lunar-illumination="3"') >= 0
);

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
assert("tile html has lunar shape new", /data-lunar-shape="new"/.test(html));
assert("tile Moon label New moon", /New moon/.test(html));
assert("tile illumination 3%", /3%/.test(html));

const condRain = Data.buildWidgetPayload("ph-conditions", {
  weatherRef: {
    meta: { isPlaceholder: false },
    current: {
      temperature: 48,
      conditions: { summary: "Thunderstorm" },
      cloudCover: 90,
      wind: { speed: 12 },
      humidity: 80,
      precipitation: { probability: 80 }
    }
  }
});
assert("storm sky kind", condRain.skyKind === "storm");
assert("storm sky icon", condRain.skyIcon === "storm");

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
