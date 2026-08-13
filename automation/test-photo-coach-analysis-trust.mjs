#!/usr/bin/env node
/**
 * Photo Coach Attack 1 — sharpness confidence + analysis honesty fixtures
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WS = path.join(ROOT, "apps/waypoint-scenes/js");

let n = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  n += 1;
}

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Array,
  Object,
  String,
  Number,
  JSON,
  Uint8ClampedArray,
  Promise,
  ImageData: class ImageData {
    constructor(data, w, h) {
      this.data = data;
      this.width = w;
      this.height = h;
    }
  },
  document: {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => null
    })
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

vm.runInNewContext(
  fs.readFileSync(path.join(WS, "photo-coach-analysis-demo.js"), "utf8"),
  sandbox,
  { filename: "photo-coach-analysis-demo.js" }
);

const Demo = sandbox.window.WaypointPhotoCoachDemo;
assert("engine loaded", !!Demo);
assert("engine v5", Demo.ENGINE_VERSION === "5.0.0");
assert("assessSharpness exported", typeof Demo.assessSharpness === "function");
assert("confidence tiers", Demo.confidenceTier(0.8) === "HIGH" && Demo.confidenceTier(0.6) === "REASONABLE" && Demo.confidenceTier(0.4) === "LOW");

function baseSignals(over) {
  return Object.assign(
    {
      brightness: 110,
      contrast: 40,
      saturation: 0.25,
      warmth: 0.12,
      coolness: 0.1,
      greenFraction: 0.15,
      blueFraction: 0.1,
      darkFraction: 0.1,
      brightFraction: 0.02,
      midFraction: 0.7,
      edgeDensity: 0.09,
      edgeHorizontal: 0.04,
      edgeVertical: 0.04,
      skyBrightness: 0.1,
      foregroundDark: 0.05,
      subjectEmphasis: 0.08,
      leftRightBalance: 0.05,
      topBottomBalance: 0.1,
      tonalSpread: 0.2,
      blurEstimate: 70,
      highlightClip: 0.02,
      shadowClip: 0.1,
      orientation: "landscape",
      isPanoramic: false,
      width: 4000,
      height: 2667,
      megapixels: 10.6,
      dominantColors: ["natural green"],
      histogram: new Array(16).fill(1 / 16)
    },
    over || {}
  );
}

// Fixture: sharp detailed landscape
const sharpFx = Demo.assessSharpness(
  baseSignals({ blurEstimate: 72, edgeDensity: 0.14, greenFraction: 0.25 }),
  {}
);
assert("sharp landscape claimSoftness false", sharpFx.claimSoftness === false);
assert("sharp landscape not LOW without cause", sharpFx.confidenceTier !== "LOW" || sharpFx.score > 50);

// Fixture: smooth sky/water — soft laplacian must NOT claim blurry
const skyFx = Demo.assessSharpness(
  baseSignals({ blurEstimate: 30, edgeDensity: 0.03, skyBrightness: 0.35, blueFraction: 0.25 }),
  {}
);
assert("smooth sky no claimSoftness", skyFx.claimSoftness === false);
assert("smooth sky has ambiguity", skyFx.ambiguities.indexOf("smooth-sky-or-water") >= 0);
assert("smooth sky softNote present", !!skyFx.softNote);
assert("smooth sky note never says blurry", !/this is blurry/i.test(skyFx.softNote || ""));

// Fixture: shallow DOF
const dofFx = Demo.assessSharpness(
  baseSignals({ blurEstimate: 40, edgeDensity: 0.08, subjectEmphasis: 0.2 }),
  { fNumber: 1.8 }
);
assert("shallow dof ambiguity", dofFx.ambiguities.indexOf("shallow-depth-of-field") >= 0);
assert("shallow dof no hard blur claim", dofFx.claimSoftness === false);

// Fixture: low light
const lowFx = Demo.assessSharpness(
  baseSignals({ blurEstimate: 35, brightness: 35, edgeDensity: 0.07 }),
  { iso: 6400 }
);
assert("low light ambiguity", lowFx.ambiguities.indexOf("low-light") >= 0);

// Fixture: clearly soft with edges — may claim softness only at high confidence
const blurFx = Demo.assessSharpness(
  baseSignals({ blurEstimate: 25, edgeDensity: 0.12, skyBrightness: 0.05, blueFraction: 0.05 }),
  {}
);
assert("blur fixture score low", blurFx.score < 38);
// claim may or may not pass CONF_SHARPNESS_CLAIM depending on confidence math — language must never say "this is blurry"
const blurCritique = Demo.analyzeFromSignals(
  baseSignals({ blurEstimate: 25, edgeDensity: 0.12, skyBrightness: 0.05, blueFraction: 0.05, brightFraction: 0.01 }),
  { name: "blur.jpg" },
  { hasExif: false },
  null
);
const blurText = JSON.stringify(blurCritique.improvements || []);
assert("no invented blurry phrase", !/this is blurry/i.test(blurText));
assert("trust label on-device", blurCritique.trustLabel === "On-device analysis");
assert("not demo flagged for users", blurCritique.isDemo === false);
assert("has confidence tier", ["HIGH", "REASONABLE", "LOW"].indexOf(blurCritique.confidenceTier) >= 0);
assert("next time actions array", Array.isArray(blurCritique.nextTimeActions));

// Missing EXIF honesty
assert("missing exif not invented", blurCritique.captureMetadata.source === "None");

// Real EXIF present
const withExif = Demo.analyzeFromSignals(
  baseSignals({ blurEstimate: 65, edgeDensity: 0.11 }),
  { name: "forest.jpg" },
  {
    hasExif: true,
    make: "Sony",
    model: "ILCE-6700",
    iso: 200,
    focalLengthMm: 35,
    fNumber: 8,
    exposureTimeSec: 0.01,
    dateTime: "2026:08:01 10:00:00"
  },
  null
);
assert("exif source labeled", withExif.captureMetadata.source === "EXIF");
assert("does not invent gps", !withExif.captureMetadata.gps || withExif.captureMetadata.gps === undefined || withExif.captureMetadata.gps == null);

// Outdoor context source distinction
const withOutdoor = Demo.analyzeFromSignals(
  baseSignals({}),
  { name: "a.jpg" },
  { hasExif: false },
  { source: "stored-context", weather: { conditions: "Clear", temp: 72 }, daylight: { goldenHour: "6:40 PM" } }
);
assert("outdoor wrapped with source", withOutdoor.outdoorContext && withOutdoor.outdoorContext.source === "stored-context");

const coachHtml = fs.readFileSync(path.join(ROOT, "apps/photo-coach/index.html"), "utf8");
assert("no user demo analysis promise", !/demo analysis/i.test(coachHtml));
assert("local device messaging", /browser|device/i.test(coachHtml));

console.log("\nAll Photo Coach analysis trust tests passed (" + n + ").");
