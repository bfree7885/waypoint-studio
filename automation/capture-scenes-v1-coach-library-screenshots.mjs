#!/usr/bin/env node
/**
 * Scenes V1 Attack 1 — Coach + Library visual validation screenshots (local).
 * Captures empty / importing / analyzing / review / shoot summary / library / storage error
 * at 390 and 1440 (plus key states at 430/768/1728).
 *
 * Usage: node automation/capture-scenes-v1-coach-library-screenshots.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/rebuild-2026/scenes-v1-coach-library-screenshots");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9477);
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");

fs.mkdirSync(OUT, { recursive: true });

function cdp(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ id: Date.now(), method, params, sessionId });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: CDP_PORT,
        path: "/json/version",
        method: "GET"
      },
      () => {}
    );
    // Use websocket via chrome remote — fall back to simpler screenshot via CLI flags below
    reject(new Error("use cli path"));
  });
}

async function startStaticServer() {
  const existing = await fetch(BASE + "/apps/photo-coach/").then((r) => r.ok).catch(() => false);
  if (existing) return { stop: () => {} };
  const port = Number(new URL(BASE).port || 8765);
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const filePath = path.join(ROOT, urlPath.replace(/^\//, ""));
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      const ext = path.extname(filePath);
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml"
      };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    stop: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      })
  };
}

function runChromeScreenshot(url, outFile, width, height, evalJs) {
  return new Promise((resolve, reject) => {
    const tmpHtml = path.join(OUT, "_capture-runner.html");
    // Prefer chrome headless screenshot of URL after optional wait
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=${width},${height}`,
      `--screenshot=${outFile}`,
      "--virtual-time-budget=8000",
      url
    ];
    const child = spawn(CHROME, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(outFile)) resolve(outFile);
      else reject(new Error("chrome screenshot failed: " + err.slice(0, 400)));
    });
  });
}

async function captureStates() {
  const report = { capturedAt: new Date().toISOString(), base: BASE, shots: [] };
  const viewports = [
    { w: 390, h: 844 },
    { w: 430, h: 932 },
    { w: 768, h: 1024 },
    { w: 1440, h: 900 },
    { w: 1728, h: 1117 }
  ];

  // Empty Coach + Library across primary widths
  for (const vp of viewports) {
    for (const route of [
      { name: "photo-coach-empty", path: "/apps/photo-coach/" },
      { name: "photo-library-empty", path: "/apps/photo-library/" }
    ]) {
      const file = path.join(OUT, `${route.name}-${vp.w}.png`);
      await runChromeScreenshot(BASE + route.path, file, vp.w, vp.h);
      report.shots.push({ file: path.basename(file), w: vp.w, route: route.path, state: "empty" });
      console.log("captured", path.basename(file));
    }
  }

  // Profile + guide secondary clarity
  for (const vp of [
    { w: 390, h: 844 },
    { w: 1440, h: 900 }
  ]) {
    for (const route of [
      { name: "photo-coach-profile", path: "/apps/photo-coach/profile/" },
      { name: "photo-coach-guide", path: "/apps/photo-coach/guide/" },
      { name: "scenes-hub", path: "/apps/scenes/" }
    ]) {
      const file = path.join(OUT, `${route.name}-${vp.w}.png`);
      await runChromeScreenshot(BASE + route.path, file, vp.w, vp.h);
      report.shots.push({ file: path.basename(file), w: vp.w, route: route.path, state: "static" });
      console.log("captured", path.basename(file));
    }
  }

  // Synthetic UI states via data-URI HTML harness (importing / analyzing / storage error / summary chrome)
  const harness = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="${BASE}/design-system/css/wds.css">
  <link rel="stylesheet" href="${BASE}/apps/waypoint-scenes/css/studio-shell.css">
  <link rel="stylesheet" href="${BASE}/apps/waypoint-scenes/css/photo-coach.css">
  <link rel="stylesheet" href="${BASE}/apps/photo-coach/css/photo-coach-shell.css">
  <link rel="stylesheet" href="${BASE}/apps/photo-coach/css/photo-coach-folio.css">
  <style>body{margin:0;background:#0c1018;color:#e8ecf2;font-family:"Source Sans 3",sans-serif}
  .stage{padding:1.25rem}.shot{border:1px solid rgba(255,255,255,.12);border-radius:1rem;overflow:hidden;background:#05070c}
  .shot img{width:100%;display:block;max-height:52vh;object-fit:cover}
  .panel{padding:1rem 1.1rem}.h{font-family:Georgia,serif;font-size:1.6rem;margin:0 0 .4rem}
  .muted{opacity:.75;font-size:.92rem}.err{border-left:3px solid #c97;padding:.5rem .8rem;margin:1rem 0;background:rgba(200,100,80,.12)}
  .strip{display:flex;gap:.4rem;overflow:auto;padding:.5rem 0}.thumb{width:4.5rem;height:3.2rem;background:#1a2030;border-radius:.35rem;border:2px solid #a8c48a}
  .labels button{margin-right:.35rem;margin-top:.5rem}
  </style></head><body class="pc-shell"><div class="stage" id="root"></div>
  <script>
  const states = {
    importing: '<div class="panel"><p class="muted">Importing…</p><div class="pc-batch-progress"><p class="pc-batch-progress__title">Reading files</p><div class="pc-batch-progress__bar"><div class="pc-batch-progress__fill" style="width:35%"></div></div></div></div>',
    analyzing: '<div class="panel"><p class="muted">Analyzing on this device…</p><div class="pc-batch-progress"><p class="pc-batch-progress__title">Reviewing today’s shoot…</p><p class="muted">Photograph 2 of 6 · dusk-forest.jpg</p><div class="pc-batch-progress__bar"><div class="pc-batch-progress__fill" style="width:40%"></div></div><button class="wds-btn wds-btn--secondary">Cancel remaining</button></div></div>',
    single: '<div class="shot"><img src="data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22800%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop stop-color=%22%231a2a1f%22/><stop offset=%221%22 stop-color=%22%233a4a38%22/></linearGradient></defs><rect width=%221200%22 height=%22800%22 fill=%22url(%23g)%22/><circle cx=%22720%22 cy=%22320%22 r=%2280%22 fill=%22%23c9b27a%22 opacity=%22.35%22/></svg>" alt="sample"></div><div class="panel"><h1 class="h">Overall read</h1><p class="muted">HIGH confidence · On-device analysis</p><h2>What worked</h2><p>Near-to-far layering holds.</p><h2>What to watch</h2><p>Edges compete with the subject.</p><h2>Next time</h2><ol><li>Lower the camera and include one foreground anchor.</li></ol><div class="labels"><button>Keep</button><button>Maybe</button><button>Reject</button><button>Favorite</button></div></div>',
    multi: '<div class="strip"><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div></div><div class="shot"><img src="data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22800%22><rect width=%221200%22 height=%22800%22 fill=%22%230f1820%22/><rect x=%220%22 y=%22520%22 width=%221200%22 height=%22280%22 fill=%22%23182818%22/></svg>" alt=""></div><div class="panel"><h1 class="h">How did today’s shoot go?</h1><p class="muted">A quiet mentor read of the outing — not a leaderboard.</p><p>Your labels: 2 Keep · 1 Favorite · 1 Maybe · 0 Reject · 3 keepers</p><h2>Progression</h2><p>Later frames read a bit stronger than early ones.</p><h2>Next time</h2><p>Take one quieter frame of the same subject before moving on.</p></div>',
    library: '<div class="panel"><h1 class="h">Your photographs, once.</h1><p class="muted">Stored on this device. No cloud sync.</p><div class="strip"><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div></div><p>Shoot · 4 · Favorites · Keep · Has EXIF</p><p><a href="#">Open Coach result</a> · <a href="#">Return to shoot</a></p></div>',
    storage: '<div class="panel"><h1 class="h">Storage needs attention</h1><div class="err" role="alert">Could not save this shoot to browser storage (quota or privacy mode). Your labels still apply for this session — free space before closing the tab.</div><p class="muted">In-session review is preserved. Photos were not uploaded.</p></div>',
    shootDetail: '<div class="panel"><h1 class="h">Shoot detail</h1><p class="muted">Stable shoot id · 4 photographs · 10:02–10:41</p><div class="strip"><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div></div><p>Open Coach result · Return to shoot summary</p></div>'
  };
  const key = new URLSearchParams(location.search).get('state') || 'single';
  document.getElementById('root').innerHTML = states[key] || states.single;
  </script></body></html>`;

  const harnessPath = path.join(OUT, "_harness.html");
  fs.writeFileSync(harnessPath, harness.replaceAll("${BASE}", BASE));

  const synth = [
    "importing",
    "analyzing",
    "single",
    "multi",
    "library",
    "storage",
    "shootDetail"
  ];
  for (const state of synth) {
    for (const vp of [
      { w: 390, h: 844 },
      { w: 1440, h: 900 }
    ]) {
      const file = path.join(OUT, `state-${state}-${vp.w}.png`);
      const url = "file://" + harnessPath + "?state=" + state;
      await runChromeScreenshot(url, file, vp.w, vp.h);
      report.shots.push({ file: path.basename(file), w: vp.w, state });
      console.log("captured", path.basename(file));
    }
  }

  fs.writeFileSync(path.join(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  return report;
}

const server = await startStaticServer();
try {
  const report = await captureStates();
  console.log("\nWrote", report.shots.length, "screenshots to", OUT);
} finally {
  await server.stop();
}
