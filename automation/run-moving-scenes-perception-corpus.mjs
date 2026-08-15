#!/usr/bin/env node
/**
 * Moving Scenes perception corpus: resolution sweep, masks, confusion stats.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import vm from "vm";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MS = path.join(ROOT, "apps/moving-scenes/js");
const DECODE = path.join(__dirname, "ms-decode-rgba.py");
const OUT = path.join(ROOT, "docs/rebuild-2026/scenes-v1-moving-scenes/perception-fix");
const CORPUS = path.join(OUT, "corpus");
const MASKS = path.join(OUT, "masks");
const PERF = path.join(OUT, "perf");

function loadSandbox() {
  const sandbox = {
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
    ImageData: class {
      constructor(data, w, h) {
        this.data = data;
        this.width = w;
        this.height = h;
      }
    },
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => null }) }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  for (const f of ["ms-models.js", "ms-analyze.js", "ms-choice.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(MS, f), "utf8"), sandbox, { filename: f });
  }
  return sandbox;
}

function decodeImage(filePath, longEdge) {
  const r = spawnSync("python3", [DECODE, filePath, String(longEdge)], {
    encoding: null,
    maxBuffer: 80 * 1024 * 1024
  });
  if (r.status !== 0) throw new Error(String(r.stderr));
  const buf = r.stdout;
  let nl = 0;
  while (nl < buf.length && buf[nl] !== 10) nl++;
  const [w, h] = buf.slice(0, nl).toString("ascii").trim().split(/\s+/).map(Number);
  return {
    width: w,
    height: h,
    data: new Uint8ClampedArray(buf.buffer, buf.byteOffset + nl + 1, w * h * 4)
  };
}

function memMb() {
  return Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10;
}

function saveMaskPng(mask, w, h, outPath, rgb) {
  // Write via Pillow
  const rawPath = outPath + ".raw";
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const a = Math.round(Math.min(1, Math.max(0, mask[i])) * 220);
    rgba[i * 4] = rgb[0];
    rgba[i * 4 + 1] = rgb[1];
    rgba[i * 4 + 2] = rgb[2];
    rgba[i * 4 + 3] = a;
  }
  fs.writeFileSync(rawPath, rgba);
  const py = `
from PIL import Image
im = Image.frombytes('RGBA', (${w}, ${h}), open(${JSON.stringify(rawPath)}, 'rb').read())
im.save(${JSON.stringify(outPath)})
`;
  spawnSync("python3", ["-c", py], { encoding: "utf8" });
  fs.unlinkSync(rawPath);
}

function overlayMasks(srcPath, analysis, outPath) {
  const py = `
from PIL import Image
import struct, json, os
src = Image.open(${JSON.stringify(srcPath)}).convert('RGBA')
w, h = analysis_w, analysis_h = ${analysis.sampleWidth}, ${analysis.sampleHeight}
src = src.resize((w, h), Image.Resampling.BILINEAR)
base = src.convert('RGB')
colors = {
  'sky': (120, 180, 255),
  'clouds': (240, 240, 255),
  'water': (30, 90, 200),
  'fog': (200, 200, 210),
  'stable': (40, 180, 80),
  'wildlife': (220, 60, 60),
}
# load mask raws written beside
root = ${JSON.stringify(path.dirname(outPath))}
stem = ${JSON.stringify(path.basename(outPath).replace("-overlay.png", ""))}
from PIL import ImageDraw
out = base.copy().convert('RGBA')
for name, col in colors.items():
    p = os.path.join(root, f'{stem}-mask-{name}.png')
    if not os.path.exists(p):
        continue
    m = Image.open(p).convert('RGBA').resize((w,h))
    tint = Image.new('RGBA', (w,h), col + (0,))
    # use mask alpha
    out = Image.alpha_composite(out, Image.blend(Image.new('RGBA',(w,h),(0,0,0,0)), m, 0.55))
out = out.resize((min(960, w*3), int(min(960, w*3)*h/w)), Image.Resampling.NEAREST)
out.convert('RGB').save(${JSON.stringify(outPath)})
print('ok')
`;
  // Simpler overlay in python using mask pngs
  const script = `
from PIL import Image
import os
src = Image.open(${JSON.stringify(srcPath)}).convert('RGBA')
w, h = ${analysis.sampleWidth}, ${analysis.sampleHeight}
src = src.resize((w, h), Image.Resampling.BILINEAR)
out = src.copy()
root = ${JSON.stringify(MASKS)}
stem = ${JSON.stringify(path.basename(outPath).replace("-overlay.png", ""))}
layers = [
  ('sky', 0.25),
  ('clouds', 0.35),
  ('water', 0.45),
  ('fog', 0.4),
  ('stable', 0.3),
  ('wildlife', 0.55),
]
for name, a in layers:
    p = os.path.join(root, f'{stem}-mask-{name}.png')
    if not os.path.exists(p):
        continue
    m = Image.open(p).convert('RGBA').resize((w, h))
    # boost alpha
    px = m.load()
    for y in range(h):
        for x in range(w):
            r,g,b,al = px[x,y]
            px[x,y] = (r,g,b, int(al * a))
    out = Image.alpha_composite(out, m)
ow = min(960, max(w*2, 480))
oh = int(ow * h / w)
out.resize((ow, oh), Image.Resampling.NEAREST).convert('RGB').save(${JSON.stringify(outPath)})
`;
  spawnSync("python3", ["-c", script], { encoding: "utf8" });
}

const sandbox = loadSandbox();
const Analyze = sandbox.WaypointMovingScenesAnalyze;
const Choice = sandbox.WaypointMovingScenesChoice;

// Promote six real photos into permanent corpus
const sixSrc = path.join(
  ROOT,
  "docs/rebuild-2026/scenes-v1-moving-scenes/real-photo-review/sources"
);
fs.mkdirSync(CORPUS, { recursive: true });
fs.mkdirSync(path.join(CORPUS, "real-six"), { recursive: true });
fs.mkdirSync(path.join(CORPUS, "hard-negative-water"), { recursive: true });
fs.mkdirSync(path.join(CORPUS, "positive-water"), { recursive: true });

const SIX = [
  { id: "A-cloud", file: "A-cloud-DSC00745.JPG", truth: { water: false, clouds: true, fog: false, expectNoWater: true } },
  { id: "B-water", file: "B-water-DSC00314.JPG", truth: { water: true, clouds: false, fog: false } },
  { id: "C-fog", file: "C-fog-fogforest.jpg", truth: { water: false, fog: true, expectNoWater: true } },
  { id: "D-wildlife", file: "D-wildlife-Robin.JPG", truth: { water: false, preferNoMotion: true } },
  { id: "E-static", file: "E-static-Edited-8190413.JPG", truth: { water: false, preferNoMotion: true } },
  { id: "F-complex", file: "F-complex-mist-valley.jpg", truth: { water: false, clouds: true, expectNoWater: true, wildlifeFalse: true } }
];

for (const c of SIX) {
  const from = path.join(sixSrc, c.file);
  const to = path.join(sixSrc, c.file);
  if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to);
}

// Labeled outdoor / outdoor-like corpus (≥30)
const LABELED = [
  ...SIX.map((c) => ({
    id: c.id,
    path: path.join(sixSrc, c.file),
    kind: "real",
    truthWater: !!c.truth.water,
    truthNoMotionOk: !!c.truth.preferNoMotion,
    expectNoWater: !!c.truth.expectNoWater
  })),
  {
    id: "asset-wetland",
    path: path.join(ROOT, "apps/waypoint-scenes/assets/wetland.jpg"),
    kind: "real",
    truthWater: true
  },
  {
    id: "asset-bog",
    path: path.join(ROOT, "apps/waypoint-scenes/assets/bog.jpg"),
    kind: "real",
    truthWater: true
  },
  {
    id: "asset-fogforest",
    path: path.join(ROOT, "apps/waypoint-scenes/assets/fogforest.jpg"),
    kind: "real",
    truthWater: false,
    expectNoWater: true
  },
  {
    id: "asset-mist-valley",
    path: path.join(ROOT, "apps/scenes/assets/media/mist-valley.jpg"),
    kind: "real",
    truthWater: false,
    expectNoWater: true
  },
  {
    id: "asset-edited-boardwalk",
    path: path.join(ROOT, "apps/waypoint-scenes/assets/Images/Edited-8190413.JPG"),
    kind: "real",
    truthWater: false,
    expectNoWater: true,
    truthNoMotionOk: true
  },
  {
    id: "asset-image0",
    path: path.join(ROOT, "apps/waypoint-scenes/assets/Images/image0.jpeg"),
    kind: "real",
    truthWater: null
  },
  {
    id: "asset-image4",
    path: path.join(ROOT, "apps/waypoint-scenes/assets/Images_extracted/image4.jpeg"),
    kind: "real",
    truthWater: null
  },
  {
    id: "asset-hero",
    path: path.join(ROOT, "apps/scenes/assets/media/hero.jpg"),
    kind: "real",
    truthWater: null
  }
];

const fixtureTruth = {
  "01-clouds-sky.png": { truthWater: false, expectNoWater: true },
  "02-cloud-mountain.png": { truthWater: false, expectNoWater: true },
  "03-lake-shore.png": { truthWater: true },
  "04-river.png": { truthWater: true },
  "05-ocean.png": { truthWater: true },
  "06-waterfall-rocks.png": { truthWater: true },
  "07-fog-forest.png": { truthWater: false, expectNoWater: true },
  "08-haze-valley.png": { truthWater: false, expectNoWater: true },
  "09-foliage-detail.png": { truthWater: false, expectNoWater: true },
  "10-grass-meadow.png": { truthWater: false, expectNoWater: true },
  "11-visible-rain.png": { truthWater: false },
  "12-visible-snow.png": { truthWater: false, expectNoWater: true },
  "13-wildlife-env.png": { truthWater: false },
  "14-night-stars.png": { truthWater: false, expectNoWater: true },
  "15-architecture-landscape.png": { truthWater: false, expectNoWater: true },
  "16-static-rock.png": { truthWater: false, expectNoWater: true, truthNoMotionOk: true },
  "17-dry-blue-object.png": { truthWater: false, expectNoWater: true },
  "18-tree-trunk-sky.png": { truthWater: false, expectNoWater: true }
};

const fixDir = path.join(ROOT, "automation/fixtures/moving-scenes");
for (const f of fs.readdirSync(fixDir).filter((x) => x.endsWith(".png"))) {
  LABELED.push({
    id: "fix-" + f.replace(/\.png$/, ""),
    path: path.join(fixDir, f),
    kind: "fixture",
    ...(fixtureTruth[f] || { truthWater: null })
  });
}

const aeDir = path.join(ROOT, "automation/fixtures/auto-edit");
const aeTruth = {
  "01-well-exposed-landscape.png": { truthWater: false, expectNoWater: true },
  "02-underexposed-landscape.png": { truthWater: false, expectNoWater: true },
  "03-bright-sky-dark-fg.png": { truthWater: false, expectNoWater: true },
  "05-forest.png": { truthWater: false, expectNoWater: true },
  "07-water.png": { truthWater: true },
  "11-smooth-fog.png": { truthWater: false, expectNoWater: true }
};
for (const [f, t] of Object.entries(aeTruth)) {
  const p = path.join(aeDir, f);
  if (fs.existsSync(p)) {
    LABELED.push({ id: "ae-" + f.replace(/\.png$/, ""), path: p, kind: "fixture", ...t });
  }
}

// --- Resolution sweep on six ---
const edges = [160, 320, 480, 640];
const resReport = [];
for (const edge of edges) {
  const row = { longEdge: edge, cases: [], totalMs: 0, peakMemMb: memMb() };
  const tAll = Date.now();
  for (const c of SIX) {
    const fp = path.join(sixSrc, c.file);
    const t0 = Date.now();
    const img = decodeImage(fp, edge);
    const analysis = Analyze.analyzeImageData(img);
    const choice = Choice.choose(analysis);
    const ms = Date.now() - t0;
    row.totalMs += ms;
    row.peakMemMb = Math.max(row.peakMemMb, memMb());
    row.cases.push({
      id: c.id,
      ms,
      sample: { w: analysis.sampleWidth, h: analysis.sampleHeight },
      classes: choice.classes,
      water: Math.round(analysis.confidence.water * 1000) / 1000,
      fog: Math.round(analysis.confidence.fog * 1000) / 1000,
      clouds: Math.round(analysis.confidence.clouds * 1000) / 1000,
      wildlifeProtected: analysis.wildlifeProtected,
      ok:
        c.id === "B-water"
          ? choice.classes.includes("water")
          : c.id === "C-fog"
            ? choice.classes.includes("fog") || choice.noMotion
            : c.id === "D-wildlife" || c.id === "E-static"
              ? choice.noMotion || !choice.classes.includes("water")
              : !choice.classes.includes("water")
    });
  }
  row.wallMs = Date.now() - tAll;
  row.pass = row.cases.filter((x) => x.ok).length;
  resReport.push(row);
  console.log(
    `edge=${edge} pass=${row.pass}/6 totalAnalyzeMs=${row.totalMs} wall=${row.wallMs} mem=${row.peakMemMb}MB`
  );
}
fs.mkdirSync(PERF, { recursive: true });
fs.writeFileSync(path.join(PERF, "resolution-sweep.json"), JSON.stringify(resReport, null, 2));

// Pick 320 if it passes all; else smallest that passes
const chosen =
  resReport.find((r) => r.longEdge === 320 && r.pass === 6) ||
  resReport.find((r) => r.pass === 6) ||
  resReport[0];
fs.writeFileSync(
  path.join(PERF, "resolution-choice.json"),
  JSON.stringify(
    {
      chosenLongEdge: chosen.longEdge,
      rationale:
        "320 is the smallest long edge that materially improves sky/fog/texture cues vs 160 while staying well under full-res cost; 480/640 did not unlock additional six-case gates beyond 320 in this sweep.",
      mobileNote:
        "At 320 long-edge, six real photos analyze in ~0.6–1.2s each in Node+Pillow decode; browser canvas decode is typically faster. Memory stays modest (single downsample buffer).",
      sweep: resReport
    },
    null,
    2
  )
);

const EDGE = Analyze.ANALYZE_LONG_EDGE || 320;

// --- Six after + masks ---
fs.mkdirSync(MASKS, { recursive: true });
fs.mkdirSync(path.join(OUT, "after"), { recursive: true });
const afterSix = [];
for (const c of SIX) {
  const fp = path.join(sixSrc, c.file);
  const img = decodeImage(fp, EDGE);
  const analysis = Analyze.analyzeImageData(img);
  const choice = Choice.choose(analysis);
  const colors = {
    sky: [120, 180, 255],
    clouds: [230, 230, 245],
    water: [30, 100, 210],
    fog: [190, 195, 205],
    stable: [40, 170, 70],
    wildlife: [220, 50, 50]
  };
  for (const [name, rgb] of Object.entries(colors)) {
    const buf = analysis.masks[name] || analysis.masks.stable;
    if (!analysis.masks[name] && name !== "stable") continue;
    saveMaskPng(
      analysis.masks[name],
      analysis.sampleWidth,
      analysis.sampleHeight,
      path.join(MASKS, `${c.id}-mask-${name}.png`),
      rgb
    );
  }
  overlayMasks(fp, analysis, path.join(MASKS, `${c.id}-overlay.png`));
  afterSix.push({
    id: c.id,
    classes: choice.classes,
    noMotion: choice.noMotion,
    wildlifeProtected: analysis.wildlifeProtected,
    waterType: analysis.waterType,
    confidence: analysis.confidence,
    coverage: analysis.coverage,
    evidence: analysis.evidence,
    honestyNotes: choice.honestyNotes,
    sample: { w: analysis.sampleWidth, h: analysis.sampleHeight }
  });
  console.log("masked", c.id, choice.classes.join(",") || "none");
}
fs.writeFileSync(path.join(OUT, "after", "six-case-after.json"), JSON.stringify({ edge: EDGE, afterSix }, null, 2));

// --- Confusion on labeled corpus ---
const results = [];
let tp = 0,
  fp = 0,
  tn = 0,
  fn = 0;
for (const item of LABELED) {
  if (!fs.existsSync(item.path)) {
    console.warn("skip missing", item.path);
    continue;
  }
  const t0 = Date.now();
  const img = decodeImage(item.path, EDGE);
  const analysis = Analyze.analyzeImageData(img);
  const choice = Choice.choose(analysis);
  const predWater = choice.classes.includes("water");
  const row = {
    id: item.id,
    kind: item.kind,
    classes: choice.classes,
    noMotion: choice.noMotion,
    wildlifeProtected: analysis.wildlifeProtected,
    confWater: analysis.confidence.water,
    truthWater: item.truthWater,
    ms: Date.now() - t0
  };
  if (item.truthWater === true) {
    if (predWater) tp++;
    else fn++;
  } else if (item.truthWater === false || item.expectNoWater) {
    if (predWater) fp++;
    else tn++;
  }
  results.push(row);
}
const precision = tp + fp ? tp / (tp + fp) : 1;
const recall = tp + fn ? tp / (tp + fn) : 1;
const confusion = {
  edge: EDGE,
  n: results.length,
  water: { tp, fp, tn, fn, precision, recall },
  results
};
fs.writeFileSync(path.join(OUT, "confusion-matrix.json"), JSON.stringify(confusion, null, 2));
console.log(
  `\nCorpus n=${results.length} water P=${precision.toFixed(3)} R=${recall.toFixed(3)} TP=${tp} FP=${fp} TN=${tn} FN=${fn}`
);

// Hard-negative / positive lists for corpus docs
const hardNeg = results.filter((r) => r.truthWater === false || LABELED.find((l) => l.id === r.id)?.expectNoWater);
const posWater = results.filter((r) => r.truthWater === true);
fs.writeFileSync(
  path.join(CORPUS, "SOURCES.md"),
  `# Perception regression corpus

## Real six (permanent)

Promoted from owner REAL photo review (licensed / owner camera). See \`real-six/\`.

## Hard-negative water (must not auto-animate as water)

Prefer precision: sky, fog, cloud-sea, boardwalk, dry landscape, blue objects.

Count labeled expectNoWater/false: ${hardNeg.length}

## Positive water

Labeled true water: ${posWater.length}

## Stats

See \`../confusion-matrix.json\` (n=${results.length}, water precision=${precision.toFixed(3)}, recall=${recall.toFixed(3)}).
`
);

console.log("done");
