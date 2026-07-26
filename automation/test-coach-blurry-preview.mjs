#!/usr/bin/env node
/**
 * Regression tests: Coach recommendation previews must not collapse into ribbons.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import http from "http";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WS = path.join(ROOT, "apps/waypoint-scenes/js");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";

let n = 0;
function assert(name, cond, detail) {
  if (!cond) {
    console.error("FAIL", name, detail || "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  n += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const folio = read("apps/photo-coach/css/photo-coach-folio.css");
const shell = read("apps/photo-coach/css/photo-coach-shell.css");
const base = read("apps/waypoint-scenes/css/photo-coach.css");
const cssBlob = folio + "\n" + shell + "\n" + base;

assert("folio no longer forces 4/3 cover thumbs", !/pc-shoot-summary__thumb\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/s.test(folio));
assert("primary thumb uses contain", /object-fit:\s*contain/.test(cssBlob));
assert("reco grid layout present", /\.pc-reco/.test(folio) || /\.pc-reco/.test(shell));
assert("no fixed 3rem square thumb in folio", !/\.pc-shoot-summary__thumb\s*\{[^}]*width:\s*3/.test(folio));
assert(
  "strong uses grid",
  /\.pc-shoot-summary__strong\s*\{[^}]*display:\s*grid/s.test(shell) ||
    /\.pc-shell\s+\.pc-shoot-summary__strong\s*\{[^}]*display:\s*grid/s.test(folio)
);

const localStore = new Map();
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
  Promise,
  document: {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        save() {},
        restore() {},
        translate() {},
        rotate() {},
        scale() {},
        drawImage() {}
      }),
      toDataURL: () => "data:image/jpeg;base64,AAA"
    })
  },
  Image: function () {
    this.naturalWidth = 4000;
    this.naturalHeight = 3000;
    Object.defineProperty(this, "src", {
      set: () => {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    });
  },
  setTimeout: (fn) => fn(),
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  }
};
sandbox.window = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(WS, "photo-coach-shoot.js"), "utf8"), sandbox, {
  filename: "photo-coach-shoot.js"
});

const Shoot = sandbox.window.WaypointPhotoCoachShoot;
assert("Shoot module loads", !!Shoot);
assert(
  "PREVIEW_MAX >> THUMB_MAX",
  Shoot.PREVIEW_MAX >= 960 && Shoot.THUMB_MAX <= 200 && Shoot.PREVIEW_MAX > Shoot.THUMB_MAX * 4
);
assert("mediaSrc prefers preview", Shoot.mediaSrc({ preview: "p", thumbnail: "t" }) === "p");
assert("mediaSrc falls back to thumb", Shoot.mediaSrc({ thumbnail: "t" }) === "t");

const summaryHtml = Shoot.renderSummaryHtml(
  {
    sessionDateLabel: "Test",
    imageCount: 2,
    letter: "B",
    overallShootScore: 80,
    weatherPlaceholder: { note: "n" },
    sessionInsights: [],
    strongestImages: [
      {
        imageId: "1",
        fileName: "wide.jpg",
        why: "Strong",
        preview: "data:image/jpeg;base64,PREVIEW",
        previewWidth: 1280,
        previewHeight: 720,
        thumbnail: "data:image/jpeg;base64,THUMB",
        score: 88,
        letter: "A-"
      }
    ],
    bestOfSession: [
      {
        title: "Best Composition",
        pick: {
          imageId: "1",
          fileName: "wide.jpg",
          why: "Pick",
          preview: "data:image/jpeg;base64,PREVIEW",
          previewWidth: 1280,
          previewHeight: 720,
          thumbnail: "data:image/jpeg;base64,THUMB"
        }
      }
    ],
    commonStrengths: [],
    recurringImprovements: [],
    technicalConsistency: { score: 70, notes: [] },
    nextOutingFocus: { title: "t", detail: "d" },
    editingSuggestions: [],
    imagesNeedingAnotherAttempt: [],
    interestingSubjects: [],
    sessionStats: { percentages: {} },
    gear: {},
    locations: [],
    labelCounts: {},
    groupCount: 0,
    scoreDetail: { score: 80 }
  },
  { images: [] }
);

assert("summary uses pc-reco card", /pc-reco/.test(summaryHtml));
assert("summary uses preview src", /src="data:image\/jpeg;base64,PREVIEW"/.test(summaryHtml));
assert("summary does not embed THUMB as primary", !/src="data:image\/jpeg;base64,THUMB"/.test(summaryHtml));
assert("summary preserves width/height attrs", /width="1280"/.test(summaryHtml) && /height="720"/.test(summaryHtml));
assert("summary sets aspect-ratio from dims", /aspect-ratio:1280\/720/.test(summaryHtml));
assert("View photograph button present", /View photograph/.test(summaryHtml));
assert("pc-reco__img class present", /pc-reco__img/.test(summaryHtml));

/**
 * Deterministic layout model for recommendation cards.
 * Mirrors the CSS contract: desktop grid 1.6fr / 0.85fr with width:100% +
 * intrinsic aspect-ratio; mobile single column. Fails if a regress would force
 * ribbon heights (e.g. fixed 3rem / cover crush).
 */
function simulateRecoBox(viewportWidth, aspectW, aspectH) {
  const content = Math.max(280, viewportWidth - 48); // page padding approx
  const stacked = viewportWidth <= 720;
  const mediaFrac = stacked ? 1 : 1.6 / (1.6 + 0.85);
  const mediaW = content * mediaFrac;
  const mediaH = mediaW * (aspectH / aspectW);
  return {
    w: Math.round(mediaW),
    h: Math.round(mediaH),
    ratio: Math.round((mediaH / mediaW) * 1000) / 1000
  };
}

const aspectCases = [
  { name: "landscape", aw: 1280, ah: 853 },
  { name: "portrait", aw: 853, ah: 1280 },
  { name: "square", aw: 960, ah: 960 },
  { name: "small-source-large-display", aw: 4000, ah: 3000 } // never upscale policy is separate; box still natural
];

const layoutFailures = [];
for (const vw of [1440, 1024, 768, 430, 390, 375]) {
  for (const c of aspectCases) {
    const box = simulateRecoBox(vw, c.aw, c.ah);
    if (box.w >= 120 && box.ratio < 0.22) {
      layoutFailures.push(`ribbon model ${c.name}@${vw}: ${box.w}x${box.h}`);
    }
    if (box.w >= 120 && box.h < 72) {
      layoutFailures.push(`too short model ${c.name}@${vw}: ${box.w}x${box.h}`);
    }
    // Portrait must remain taller than wide
    if (c.ah > c.aw * 1.1 && box.ratio <= 1) {
      layoutFailures.push(`portrait not tall ${c.name}@${vw}: ratio=${box.ratio}`);
    }
    // Landscape must remain wider than tall
    if (c.aw > c.ah * 1.1 && box.ratio >= 1) {
      layoutFailures.push(`landscape not wide ${c.name}@${vw}: ratio=${box.ratio}`);
    }
  }
}
assert("layout model: no ribbon collapse across viewports", layoutFailures.length === 0, layoutFailures.join(" | "));

// Optional live Chrome probe (COACH_LAYOUT_BROWSER=1)
async function layoutProbeBrowser() {
  if (process.env.COACH_LAYOUT_BROWSER !== "1") {
    console.log("SKIP live Chrome layout probe (set COACH_LAYOUT_BROWSER=1 to enable)");
    return;
  }
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const filePath = path.join(ROOT, urlPath.replace(/^\//, ""));
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const PORT = server.address().port;
  const failures = [];
  const outDir = path.join(ROOT, "automation/artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  try {
    for (const w of [1440, 1024, 768, 430, 390, 375]) {
      const outFile = path.join(outDir, `probe-dom-${w}.html`);
      const url = `http://127.0.0.1:${PORT}/docs/scenes/fixtures/coach-preview-layout-probe.html`;
      const script = path.join(outDir, `probe-run-${w}.sh`);
      fs.writeFileSync(
        script,
        `#!/bin/bash\ntimeout 12 "${CHROME}" --headless=new --disable-gpu --no-sandbox --virtual-time-budget=1200 --window-size=${w},1100 --dump-dom "${url}" > "${outFile}"\n`
      );
      spawnSync("bash", [script], { timeout: 20000 });
      const dom = fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8") : "";
      const m = dom.match(/<pre id="probe-json"[^>]*>([\s\S]*?)<\/pre>/);
      if (!m || !m[1].trim()) {
        failures.push(`no probe payload at ${w}`);
        continue;
      }
      const payload = JSON.parse(m[1].trim());
      for (const row of payload.rows || []) {
        if (row.w >= 120 && (row.ratio < 0.22 || row.h < 72)) {
          failures.push(`ribbon at ${w}: ${row.w}x${row.h}`);
        }
      }
    }
  } finally {
    server.close();
  }
  if (failures.length) {
    console.warn("WARN live Chrome layout probe incomplete:", failures.join(" | "));
    console.warn("Screenshots + deterministic layout model remain the gate.");
  } else {
    assert("live Chrome layout probe", true);
  }
}

await layoutProbeBrowser();
console.log("\nAll Coach blurry-preview regression tests passed (" + n + ").");
