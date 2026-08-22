#!/usr/bin/env node
/**
 * Fast perception regression for Moving Scenes (no Chrome).
 * Decodes real photos via Pillow → ms-analyze + ms-choice in vm.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MS = path.join(ROOT, "apps/moving-scenes/js");
const DECODE = path.join(__dirname, "ms-decode-rgba.py");

function loadAnalyze() {
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
    Float32Array,
    Uint8Array,
    Uint8ClampedArray,
    ImageData: class ImageData {
      constructor(data, w, h) {
        this.data = data;
        this.width = w;
        this.height = h;
      }
    }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  for (const file of ["ms-models.js", "ms-analyze.js", "ms-choice.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(MS, file), "utf8"), sandbox, {
      filename: file
    });
  }
  return sandbox;
}

function decodeImage(filePath, longEdge) {
  const r = spawnSync("python3", [DECODE, filePath, String(longEdge)], {
    encoding: null,
    maxBuffer: 50 * 1024 * 1024
  });
  if (r.status !== 0) {
    throw new Error(`decode failed: ${r.stderr && r.stderr.toString()}`);
  }
  const buf = r.stdout;
  let nl = 0;
  while (nl < buf.length && buf[nl] !== 10) nl++;
  const header = buf.slice(0, nl).toString("ascii").trim().split(/\s+/);
  const w = Number(header[0]);
  const h = Number(header[1]);
  const pixels = buf.slice(nl + 1);
  if (pixels.length < w * h * 4) throw new Error("short pixel buffer");
  return { width: w, height: h, data: new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, w * h * 4) };
}

function summarize(analysis, choice) {
  const conf = analysis.confidence || {};
  const round = (x) => Math.round((x || 0) * 1000) / 1000;
  return {
    sample: { w: analysis.sampleWidth, h: analysis.sampleHeight },
    classes: choice.classes,
    summary: choice.summary,
    noMotion: choice.noMotion,
    wildlifeProtected: analysis.wildlifeProtected,
    waterType: analysis.waterType,
    confidence: {
      clouds: round(conf.clouds),
      water: round(conf.water),
      fog: round(conf.fog),
      haze: round(conf.haze),
      foliage: round(conf.foliage)
    },
    coverage: {
      clouds: round(analysis.coverage.clouds),
      water: round(analysis.coverage.water),
      fog: round(analysis.coverage.fog),
      sky: round(analysis.coverage.sky),
      foliage: round(analysis.coverage.foliage),
      wildlife: round(analysis.coverage.wildlife),
      wood: round(analysis.coverage.wood),
      waterConnectivity: round(analysis.coverage.waterConnectivity),
      waterCentroidY: round(analysis.coverage.waterCentroidY)
    },
    evidence: analysis.evidence,
    honestyNotes: choice.honestyNotes
  };
}

const sandbox = loadAnalyze();
const Analyze = sandbox.WaypointMovingScenesAnalyze;
const Choice = sandbox.WaypointMovingScenesChoice;
const longEdge = Number(process.env.MS_ANALYZE_EDGE || Analyze.ANALYZE_LONG_EDGE || 320);

const sixDir = path.join(
  ROOT,
  "docs/rebuild-2026/scenes-v1-moving-scenes/real-photo-review/sources"
);
const CASES = [
  {
    id: "A-cloud",
    file: "A-cloud-DSC00745.JPG",
    require: (s) =>
      s.classes.indexOf("water") < 0 &&
      (s.classes.indexOf("clouds") >= 0 || s.noMotion)
  },
  {
    id: "B-water",
    file: "B-water-DSC00314.JPG",
    require: (s) => s.classes.indexOf("water") >= 0 && !s.noMotion
  },
  {
    id: "C-fog",
    file: "C-fog-fogforest.jpg",
    require: (s) =>
      s.classes.indexOf("water") < 0 &&
      (s.classes.indexOf("fog") >= 0 || s.classes.indexOf("haze") >= 0 || s.noMotion)
  },
  {
    id: "D-wildlife",
    file: "D-wildlife-Robin.JPG",
    require: (s) => s.noMotion || s.classes.every((c) => c !== "water" || true)
  },
  {
    id: "E-static",
    file: "E-static-Edited-8190413.JPG",
    require: (s) => s.noMotion && s.classes.indexOf("water") < 0
  },
  {
    id: "F-complex",
    file: "F-complex-mist-valley.jpg",
    require: (s) =>
      s.classes.indexOf("water") < 0 &&
      s.wildlifeProtected === false &&
      (s.classes.indexOf("clouds") >= 0 || s.noMotion)
  }
];

// D: no animal animation — any selected class is env-only; still preferred
CASES[3].require = (s) => s.noMotion || (s.wildlifeProtected && s.classes.indexOf("water") < 0);
// Actually owner wants: no animal anim; refusal OK. Prefer noMotion or clouds only without water.
CASES[3].require = (s) => s.noMotion || s.classes.every((c) => c === "clouds" || c === "fog" || c === "haze");

const results = [];
let fails = 0;
for (const c of CASES) {
  const fp = path.join(sixDir, c.file);
  if (!fs.existsSync(fp)) {
    console.error("MISSING", fp);
    fails++;
    continue;
  }
  const t0 = Date.now();
  const img = decodeImage(fp, longEdge);
  const analysis = Analyze.analyzeImageData(img);
  const choice = Choice.choose(analysis);
  const ms = Date.now() - t0;
  const s = summarize(analysis, choice);
  s.id = c.id;
  s.file = c.file;
  s.analyzeMs = ms;
  s.ok = !!c.require(s);
  results.push(s);
  const mark = s.ok ? "PASS" : "FAIL";
  if (!s.ok) fails++;
  console.log(
    `${mark} ${c.id} classes=${JSON.stringify(s.classes)} water=${s.confidence.water} fog=${s.confidence.fog} clouds=${s.confidence.clouds} wild=${s.wildlifeProtected} ${ms}ms`
  );
}

const outDir = path.join(
  ROOT,
  "docs/rebuild-2026/scenes-v1-moving-scenes/perception-fix"
);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "six-case-after.json"),
  JSON.stringify({ longEdge, generatedAt: new Date().toISOString(), results }, null, 2)
);

console.log(`\n${results.length - fails}/${results.length} gates pass (longEdge=${longEdge})`);
process.exitCode = fails ? 1 : 0;
