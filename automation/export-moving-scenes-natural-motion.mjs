#!/usr/bin/env node
/**
 * Natural Motion Fix 2 — before/after clips, stability, QC artifacts.
 * Before = Perception Fix 1 renderer exports (copied). After = current ms-render.js.
 */
import fs from "fs";
import path from "path";
import http from "http";
import os from "os";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/rebuild-2026/scenes-v1-moving-scenes/natural-motion");
const BEFORE = path.join(OUT, "before");
const AFTER = path.join(OUT, "after");
const MASKS = path.join(OUT, "masks");
const SHOTS = path.join(OUT, "screenshots");
const QC = path.join(OUT, "qc");
const SOURCES_OUT = path.join(OUT, "sources");
const SOURCES = path.join(
  ROOT,
  "docs/rebuild-2026/scenes-v1-moving-scenes/real-photo-review/sources"
);
const PERC_EXPORTS = path.join(
  ROOT,
  "docs/rebuild-2026/scenes-v1-moving-scenes/perception-fix/exports"
);
const PERC_MASKS = path.join(
  ROOT,
  "docs/rebuild-2026/scenes-v1-moving-scenes/perception-fix/masks"
);
const CDP_PORT = Number(process.env.WAYPOINT_MS_NATURAL_CDP || 9543);

const CASES = [
  { id: "A-cloud", file: "A-cloud-DSC00745.JPG", primary: true },
  { id: "B-water", file: "B-water-DSC00314.JPG", primary: true },
  { id: "C-fog", file: "C-fog-fogforest.jpg", primary: false },
  { id: "D-wildlife", file: "D-wildlife-Robin.JPG", primary: false },
  { id: "E-static", file: "E-static-Edited-8190413.JPG", primary: false },
  { id: "F-complex", file: "F-complex-mist-valley.jpg", primary: true }
];

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findChrome() {
  for (const c of [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  ].filter(Boolean)) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = path.join(ROOT, urlPath.replace(/^\//, ""));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".webm": "video/webm"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function startChrome() {
  const chrome = findChrome();
  if (!chrome) throw new Error("Chrome not found");
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-nat-chrome-"));
  const proc = spawn(
    chrome,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    try {
      const tabs = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = tabs.find((t) => t.type === "page") || tabs[0];
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (_) {
      /* wait */
    }
    await delay(250);
  }
  if (!wsUrl) {
    proc.kill();
    throw new Error("CDP not ready");
  }
  return { proc, wsUrl, userDataDir };
}

async function cdp(wsUrl) {
  const { default: WebSocket } = await import("ws");
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.once("open", res);
    ws.once("error", rej);
  });
  let nextId = 1;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      ws.close();
    }
  };
}

function b64ToFile(b64, file) {
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
}

function copyIf(src, dest) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function loadSandbox() {
  const require = createRequire(import.meta.url);
  // Canvas not needed for analyze-only; keep null.
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
    Uint8ClampedArray,
    Float32Array,
    ImageData: class ImageData {
      constructor(data, w, h) {
        if (typeof data === "number") {
          this.width = data;
          this.height = w;
          this.data = new Uint8ClampedArray(data * w * 4);
        } else {
          this.data = data;
          this.width = w;
          this.height = h;
        }
      }
    }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  for (const f of [
    "ms-models.js",
    "ms-analyze.js",
    "ms-choice.js",
    "ms-render.js"
  ]) {
    const code = fs.readFileSync(path.join(ROOT, "apps/moving-scenes/js", f), "utf8");
    vm.runInNewContext(code, sandbox, { filename: f });
  }
  return sandbox;
}

[OUT, BEFORE, AFTER, MASKS, SHOTS, QC, SOURCES_OUT].forEach((d) =>
  fs.mkdirSync(d, { recursive: true })
);

// Copy sources + perception before clips + masks
const sourcesMd = ["# Sources — same six as Perception Fix 1", ""];
for (const cse of CASES) {
  const src = path.join(SOURCES, cse.file);
  copyIf(src, path.join(SOURCES_OUT, cse.file));
  sourcesMd.push(`- **${cse.id}**: \`${cse.file}\``);
  copyIf(path.join(PERC_EXPORTS, `${cse.id}-moving.webm`), path.join(BEFORE, `${cse.id}-moving.webm`));
  copyIf(path.join(PERC_EXPORTS, `${cse.id}-phase0.jpg`), path.join(BEFORE, `${cse.id}-phase0.jpg`));
  copyIf(path.join(PERC_EXPORTS, `${cse.id}-phase50.jpg`), path.join(BEFORE, `${cse.id}-phase50.jpg`));
  copyIf(path.join(PERC_EXPORTS, `${cse.id}-no-motion.txt`), path.join(BEFORE, `${cse.id}-no-motion.txt`));
  copyIf(path.join(PERC_EXPORTS, `${cse.id}-evidence.json`), path.join(BEFORE, `${cse.id}-evidence.json`));
  for (const m of ["clouds", "water", "fog", "sky", "stable", "wildlife"]) {
    copyIf(
      path.join(PERC_MASKS, `${cse.id}-mask-${m}.png`),
      path.join(MASKS, `${cse.id}-mask-${m}.png`)
    );
  }
  copyIf(path.join(PERC_MASKS, `${cse.id}-overlay.png`), path.join(MASKS, `${cse.id}-overlay.png`));
}
fs.writeFileSync(path.join(SOURCES_OUT, "SOURCES.md"), sourcesMd.join("\n") + "\n");

const { server, port } = await startServer();
const base = `http://127.0.0.1:${port}`;
const chrome = await startChrome();
const client = await cdp(chrome.wsUrl);
const summary = [];
const stability = [];

try {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Page.navigate", { url: `${base}/apps/moving-scenes/` });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    const { result } = await client.send("Runtime.evaluate", {
      expression:
        "!!(window.WaypointMovingScenesAnalyze && window.WaypointMovingScenesChoice && window.WaypointMovingScenesRender && window.WaypointMovingScenesModels)",
      returnByValue: true
    });
    if (result && result.value) {
      ready = true;
      break;
    }
    await delay(200);
  }
  if (!ready) throw new Error("modules not ready");

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const desk = await client.send("Page.captureScreenshot", { format: "png" });
  b64ToFile(desk.data, path.join(SHOTS, "desktop-1440.png"));

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  const mob = await client.send("Page.captureScreenshot", { format: "png" });
  b64ToFile(mob.data, path.join(SHOTS, "mobile-390.png"));
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  for (const cse of CASES) {
    const photoUrl = `${base}/docs/rebuild-2026/scenes-v1-moving-scenes/real-photo-review/sources/${cse.file}`;
    console.log("export", cse.id);
    const { result } = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const photoUrl = ${JSON.stringify(photoUrl)};
        const caseId = ${JSON.stringify(cse.id)};
        return (async () => {
          const resp = await fetch(photoUrl);
          if (!resp.ok) throw new Error("fetch failed " + resp.status);
          const blob = await resp.blob();
          const img = await window.WaypointMovingScenesRender.loadImage(blob);
          const analysis = window.WaypointMovingScenesAnalyze.analyzeSource(img);
          const choice = window.WaypointMovingScenesChoice.choose(analysis);
          const fit = window.WaypointMovingScenesRender.fitSize(
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            Math.min(960, window.WaypointMovingScenesModels.FINAL_MAX)
          );
          const canvas = document.createElement("canvas");
          canvas.width = fit.w;
          canvas.height = fit.h;
          const renderer = window.WaypointMovingScenesRender.createRenderer(canvas);
          await renderer.prepare(img, analysis, choice, null);

          // Frame stability: mean abs delta on bottom-right terrain band vs cloud band
          function sampleBand(phase, y0, y1) {
            renderer.renderAt(phase);
            const ctx = canvas.getContext("2d");
            const d = ctx.getImageData(0, Math.floor(fit.h * y0), fit.w, Math.max(1, Math.floor(fit.h * (y1 - y0)))).data;
            return d;
          }
          function mae(a, b) {
            let s = 0;
            const n = Math.min(a.length, b.length);
            for (let i = 0; i < n; i += 4) {
              s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
            }
            return s / ((n / 4) * 3);
          }
          const t0 = sampleBand(0, 0.72, 0.98);
          const t5 = sampleBand(0.5, 0.72, 0.98);
          const c0 = sampleBand(0, 0.02, 0.28);
          const c5 = sampleBand(0.5, 0.02, 0.28);
          const terrainMae = mae(t0, t5);
          const cloudMae = mae(c0, c5);

          // Loop continuity: phase 0 vs ~1 and three mid-loop samples
          const loop0 = sampleBand(0, 0.05, 0.35);
          const loop1 = sampleBand(0.999, 0.05, 0.35);
          const loopMae = mae(loop0, loop1);
          const pA = sampleBand(0.15, 0.05, 0.35);
          const pB = sampleBand(0.5, 0.05, 0.35);
          const pC = sampleBand(0.85, 0.05, 0.35);

          let videoB64 = null;
          let mime = null;
          if (!choice.noMotion && choice.classes.length) {
            const stream = canvas.captureStream(0);
            const track = stream.getVideoTracks()[0];
            const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
            const chunks = [];
            rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
            const done = new Promise((res) => { rec.onstop = () => res(); });
            rec.start(100);
            // 3 consecutive loop cycles for natural-motion inspection
            const frames = 54;
            for (let i = 0; i < frames; i++) {
              const phase = (i / 18) % 1;
              renderer.renderAt(phase);
              if (track.requestFrame) track.requestFrame();
              await new Promise((r) => setTimeout(r, 35));
            }
            rec.stop();
            await done;
            const vblob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
            mime = vblob.type;
            const ab = await vblob.arrayBuffer();
            const bytes = new Uint8Array(ab);
            let bin = "";
            const chunk = 0x8000;
            for (let i = 0; i < bytes.length; i += chunk) {
              bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            }
            videoB64 = btoa(bin);
          } else {
            renderer.renderAt(0);
          }

          const posterB64 = canvas.toDataURL("image/png").split(",")[1];
          let phase0 = null, phase33 = null, phase50 = null, phase66 = null;
          if (!choice.noMotion) {
            renderer.renderAt(0);
            phase0 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
            renderer.renderAt(0.33);
            phase33 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
            renderer.renderAt(0.5);
            phase50 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
            renderer.renderAt(0.66);
            phase66 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
          }
          renderer.destroy && renderer.destroy();
          return {
            caseId,
            classes: choice.classes,
            noMotion: choice.noMotion,
            summary: choice.summary,
            wildlifeProtected: analysis.wildlifeProtected,
            waterType: analysis.waterType,
            confidence: analysis.confidence,
            coverage: analysis.coverage,
            analyzeLongEdge: analysis.analyzeLongEdge || window.WaypointMovingScenesAnalyze.ANALYZE_LONG_EDGE,
            engineVersion: window.WaypointMovingScenesModels.ENGINE_VERSION,
            sample: { w: analysis.sampleWidth, h: analysis.sampleHeight },
            render: fit,
            mime,
            videoB64,
            posterB64,
            phase0,
            phase33,
            phase50,
            phase66,
            honestyNotes: choice.honestyNotes,
            stability: {
              terrainMae: Math.round(terrainMae * 1000) / 1000,
              cloudMae: Math.round(cloudMae * 1000) / 1000,
              loopMae: Math.round(loopMae * 1000) / 1000,
              midMotion: [
                Math.round(mae(pA, pB) * 1000) / 1000,
                Math.round(mae(pB, pC) * 1000) / 1000
              ]
            }
          };
        })().catch((e) => ({ error: String(e && e.stack || e), caseId }));
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    const payload = result && result.value;
    if (!payload || payload.error) {
      console.error("case failed", cse.id, payload);
      throw new Error((payload && payload.error) || "empty result for " + cse.id);
    }
    const v = payload;
    if (v.posterB64) b64ToFile(v.posterB64, path.join(AFTER, `${cse.id}-poster.png`));
    if (v.videoB64) b64ToFile(v.videoB64, path.join(AFTER, `${cse.id}-moving.webm`));
    else {
      fs.writeFileSync(
        path.join(AFTER, `${cse.id}-no-motion.txt`),
        (v.honestyNotes || []).join("\n")
      );
    }
    if (v.phase0) b64ToFile(v.phase0, path.join(AFTER, `${cse.id}-phase0.jpg`));
    if (v.phase33) b64ToFile(v.phase33, path.join(AFTER, `${cse.id}-phase33.jpg`));
    if (v.phase50) b64ToFile(v.phase50, path.join(AFTER, `${cse.id}-phase50.jpg`));
    if (v.phase66) b64ToFile(v.phase66, path.join(AFTER, `${cse.id}-phase66.jpg`));
    const { videoB64, posterB64, phase0, phase33, phase50, phase66, ...meta } = v;
    fs.writeFileSync(path.join(AFTER, `${cse.id}-evidence.json`), JSON.stringify(meta, null, 2));
    summary.push(meta);
    if (meta.stability) stability.push({ id: cse.id, ...meta.stability, classes: meta.classes, noMotion: meta.noMotion });
    console.log(cse.id, meta.classes, meta.noMotion ? "NO-MOTION" : "moving", meta.stability);
  }

  fs.writeFileSync(path.join(AFTER, "chrome-six-summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(QC, "frame-stability.json"), JSON.stringify(stability, null, 2));
  console.log("natural motion export done");
} finally {
  try {
    client.close();
  } catch (_) {}
  chrome.proc.kill("SIGKILL");
  server.close();
}
process.exit(0);
