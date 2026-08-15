#!/usr/bin/env node
/**
 * After-perception clips + UI screenshots for the six real photos.
 * Uses production renderer renderAt(phase) + MediaRecorder (not stock play()).
 */
import fs from "fs";
import path from "path";
import http from "http";
import os from "os";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/rebuild-2026/scenes-v1-moving-scenes/perception-fix");
const EXPORTS = path.join(OUT, "exports");
const SHOTS = path.join(OUT, "screenshots");
const SOURCES = path.join(
  ROOT,
  "docs/rebuild-2026/scenes-v1-moving-scenes/real-photo-review/sources"
);
const CDP_PORT = Number(process.env.WAYPOINT_MS_PERCEPTION_CDP || 9541);

const CASES = [
  { id: "A-cloud", file: "A-cloud-DSC00745.JPG" },
  { id: "B-water", file: "B-water-DSC00314.JPG" },
  { id: "C-fog", file: "C-fog-fogforest.jpg" },
  { id: "D-wildlife", file: "D-wildlife-Robin.JPG" },
  { id: "E-static", file: "E-static-Edited-8190413.JPG" },
  { id: "F-complex", file: "F-complex-mist-valley.jpg" }
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-perc-chrome-"));
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

fs.mkdirSync(EXPORTS, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const { server, port } = await startServer();
const base = `http://127.0.0.1:${port}`;
const chrome = await startChrome();
const client = await cdp(chrome.wsUrl);
const summary = [];

try {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Page.navigate", { url: `${base}/apps/moving-scenes/` });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    const { result } = await client.send("Runtime.evaluate", {
      expression:
        "!!(window.WaypointMovingScenesAnalyze && window.WaypointMovingScenesChoice && window.WaypointMovingScenesRender && window.WaypointMovingScenesExport)",
      returnByValue: true
    });
    if (result && result.value) {
      ready = true;
      break;
    }
    await delay(200);
  }
  if (!ready) throw new Error("modules not ready");

  // Desktop screenshot of empty studio
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
            window.WaypointMovingScenesModels.FINAL_MAX
          );
          const canvas = document.createElement("canvas");
          canvas.width = fit.w;
          canvas.height = fit.h;
          const renderer = window.WaypointMovingScenesRender.createRenderer(canvas);
          await renderer.prepare(img, analysis, choice, null);
          let videoB64 = null;
          let posterB64 = null;
          let mime = null;
          if (!choice.noMotion && choice.classes.length) {
            // Phase-driven capture for visible motion evidence
            const stream = canvas.captureStream(0);
            const track = stream.getVideoTracks()[0];
            const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
            const chunks = [];
            rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
            const done = new Promise((res) => { rec.onstop = () => res(); });
            rec.start(100);
            const frames = 36;
            for (let i = 0; i < frames; i++) {
              const phase = i / frames;
              renderer.renderAt(phase);
              if (track.requestFrame) track.requestFrame();
              await new Promise((r) => setTimeout(r, 40));
            }
            rec.stop();
            await done;
            const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
            mime = blob.type;
            const ab = await blob.arrayBuffer();
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
          posterB64 = canvas.toDataURL("image/png").split(",")[1];
          // phase stills for motion cases
          let phase0 = null, phase50 = null;
          if (!choice.noMotion) {
            renderer.renderAt(0);
            phase0 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
            renderer.renderAt(0.5);
            phase50 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
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
            analyzeLongEdge: analysis.analyzeLongEdge || window.WaypointMovingScenesAnalyze.ANALYZE_LONG_EDGE,
            sample: { w: analysis.sampleWidth, h: analysis.sampleHeight },
            render: fit,
            mime,
            videoB64,
            posterB64,
            phase0,
            phase50,
            honestyNotes: choice.honestyNotes
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
    if (v.posterB64) b64ToFile(v.posterB64, path.join(EXPORTS, `${cse.id}-poster.png`));
    if (v.videoB64) b64ToFile(v.videoB64, path.join(EXPORTS, `${cse.id}-moving.webm`));
    else {
      fs.writeFileSync(
        path.join(EXPORTS, `${cse.id}-no-motion.txt`),
        (v.honestyNotes || []).join("\n")
      );
    }
    if (v.phase0) b64ToFile(v.phase0, path.join(EXPORTS, `${cse.id}-phase0.jpg`));
    if (v.phase50) b64ToFile(v.phase50, path.join(EXPORTS, `${cse.id}-phase50.jpg`));
    const { videoB64, posterB64, phase0, phase50, ...meta } = v;
    fs.writeFileSync(path.join(EXPORTS, `${cse.id}-evidence.json`), JSON.stringify(meta, null, 2));
    summary.push(meta);
    console.log(cse.id, meta.classes, meta.noMotion ? "NO-MOTION" : "moving");
  }

  fs.writeFileSync(path.join(OUT, "after", "chrome-six-summary.json"), JSON.stringify(summary, null, 2));
  console.log("chrome validation done");
} finally {
  try {
    client.close();
  } catch (_) {}
  chrome.proc.kill("SIGKILL");
  server.close();
}
process.exit(0);
