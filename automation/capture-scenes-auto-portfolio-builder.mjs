#!/usr/bin/env node
/**
 * Capture Scenes Auto Portfolio Builder screenshots (desktop + mobile).
 *
 * Self-contained: static file server + review-only seeded library data
 * (SVG placeholder thumbnails). Walks setup → draft → selection → sequence →
 * alternatives → save panels.
 *
 * Usage: node automation/capture-scenes-auto-portfolio-builder.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9437);
const PORT = Number(process.env.WAYPOINT_HTTP_PORT || 8817);
const BASE = "http://127.0.0.1:" + PORT;
const OUT = path.join(ROOT, "docs/scenes/auto-portfolio-builder");

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

function startServer() {
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      let filePath = path.join(ROOT, urlPath);
      if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pfb-cap-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 60; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) { /* retry */ }
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

function svgThumb(label, hue) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240'>` +
    `<rect width='320' height='240' fill='hsl(${hue},40%,32%)'/>` +
    `<rect x='0' y='170' width='320' height='70' fill='hsl(${hue},45%,22%)'/>` +
    `<circle cx='250' cy='70' r='34' fill='hsl(${(hue + 40) % 360},60%,68%)'/>` +
    `<text x='16' y='210' font-family='Inter,Arial' font-size='22' fill='#eef2f6'>${label}</text>` +
    `</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

function seedIndex() {
  const rows = [
    { id: "img-ridge", filename: "ridge-dawn.jpg", favorite: true, selectionLabel: "keep", rating: 5, width: 6000, height: 4000, hue: 205, captureDate: "2026-05-01T10:00:00.000Z", tags: ["ridge", "dawn"],
      moduleRefs: { photoCoach: { analysisStatus: "analyzed", letterGrade: "A", overallScore: 92 } } },
    { id: "img-mist", filename: "valley-mist.jpg", selectionLabel: "keep", rating: 4, width: 4000, height: 2667, hue: 190, captureDate: "2026-06-01T10:00:00.000Z", tags: ["valley"] },
    { id: "img-fern", filename: "fern-detail.jpg", selectionLabel: "maybe", rating: 3, width: 3000, height: 4000, hue: 120, captureDate: "2026-07-01T10:00:00.000Z", tags: ["fern"] },
    { id: "img-summit", filename: "summit.jpg", favorite: true, selectionLabel: "keep", rating: 5, width: 5500, height: 3600, hue: 30, captureDate: "2026-07-15T09:00:00.000Z", tags: ["summit"] },
    { id: "img-trail", filename: "trail-env.jpg", selectionLabel: "keep", rating: 3, width: 5000, height: 3300, hue: 150, captureDate: "2026-08-01T09:00:00.000Z", tags: ["trail"], subjectHints: ["environmental"] },
    { id: "img-stream", filename: "stream.jpg", selectionLabel: "keep", rating: 4, width: 4200, height: 2800, hue: 200, captureDate: "2026-08-20T09:00:00.000Z", tags: ["water"] },
    { id: "img-meadow", filename: "meadow.jpg", selectionLabel: "keep", rating: 4, width: 4800, height: 3200, hue: 90, captureDate: "2026-04-01T09:00:00.000Z", tags: ["meadow"] },
    { id: "img-sky", filename: "cloud.jpg", favorite: true, rating: 5, width: 4600, height: 3100, hue: 220, captureDate: "2026-03-01T09:00:00.000Z", tags: ["sky"] },
    { id: "img-dup-a", filename: "lakeside.jpg", contentFingerprint: "lakeside::1048576::1", byteSize: 1048576, selectionLabel: "keep", width: 4000, height: 2667, hue: 260, captureDate: "2026-05-10T09:00:00.000Z" },
    { id: "img-dup-b", filename: "lakeside.jpg", contentFingerprint: "lakeside::1048576::1", byteSize: 1048576, selectionLabel: "keep", width: 4000, height: 2667, hue: 262, captureDate: "2026-05-10T09:00:00.000Z" },
    { id: "img-bare", filename: "untitled-3941.jpg", width: 4000, height: 2667, hue: 0 },
    { id: "img-cairn", filename: "cairn.jpg", selectionLabel: "maybe", rating: 3, width: 4000, height: 3000, hue: 40, captureDate: "2026-07-02T09:00:00.000Z", tags: ["cairn"] }
  ];
  return rows.map((r) => ({
    schemaVersion: "1.0.0",
    id: r.id,
    filename: r.filename,
    originalFilename: r.filename,
    mimeType: "image/jpeg",
    byteSize: r.byteSize != null ? r.byteSize : null,
    contentFingerprint: r.contentFingerprint || null,
    captureDate: r.captureDate || null,
    importDate: "2026-05-20T12:00:00.000Z",
    updatedAt: "2026-05-20T12:00:00.000Z",
    camera: { make: null, model: null, lens: null, focalLengthMm: null, fNumber: null, iso: null, shutter: null, exposureTimeSec: null },
    gps: { lat: null, lon: null, accuracyM: null },
    orientation: r.width >= r.height ? "landscape" : "portrait",
    aspectRatio: r.height ? Math.round((r.width / r.height) * 1000) / 1000 : null,
    width: r.width,
    height: r.height,
    tags: r.tags || [],
    collectionIds: [],
    rating: r.rating != null ? r.rating : null,
    selectionLabel: r.selectionLabel || null,
    favorite: !!r.favorite,
    subjectHints: r.subjectHints || [],
    photographerNotes: null,
    aiNotes: null,
    media: { hasOriginal: false, hasThumbnail: true, thumbnailDataUrl: svgThumb(r.filename, r.hue), originalBlobKey: r.id, thumbBlobKey: null },
    moduleRefs: r.moduleRefs || { photoCoach: { analysisStatus: "not-analyzed" } },
    source: "upload",
    legacy: {}
  }));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const chrome = await startChrome();
  const { default: WebSocket } = await import("ws");
  const ws = new WebSocket(chrome.wsUrl);
  await new Promise((r, j) => { ws.once("open", r); ws.once("error", j); });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push((msg.params.args || []).map((a) => a.value || a.description || "").join(" "));
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const det = msg.params.exceptionDetails || {};
      consoleErrors.push((det.text || "exception") + " " + (det.exception && det.exception.description || ""));
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  const evalExpr = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result && result.result.value;
  };

  async function setViewport(w, h, mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile: !!mobile
    });
  }

  async function waitFor(expr, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < (timeoutMs || 12000)) {
      if (await evalExpr(expr)) return true;
      await delay(250);
    }
    return false;
  }

  async function shot(name) {
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, "base64"));
    console.log("wrote", name);
  }

  const seed = JSON.stringify(seedIndex());
  const portfolioSeed = JSON.stringify([{
    schemaVersion: "1.0.0",
    id: "pf-builder-demo",
    title: "Marsh morning",
    description: null,
    purpose: "quiet wetland set",
    createdAt: "2026-05-20T12:00:00.000Z",
    updatedAt: "2026-05-20T12:00:00.000Z",
    coverImageId: "img-ridge",
    imageIds: ["img-ridge", "img-mist"],
    items: [
      { imageId: "img-ridge", notes: null, selectionRationale: null, addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
      { imageId: "img-mist", notes: null, selectionRationale: null, addedAt: "2026-05-20T12:00:00.000Z", source: "manual" }
    ],
    notes: null,
    health: null,
    private: true
  }]);

  async function bootWithSeed(url) {
    await send("Page.navigate", { url });
    await waitFor(`!!document.querySelector('#main')`, 12000);
    await evalExpr(
      `localStorage.setItem('waypoint-photo-library-index-v1', ${JSON.stringify(seed)});` +
      `localStorage.setItem('waypoint-scenes-portfolios-v1', ${JSON.stringify(portfolioSeed)}); true`
    );
    await send("Page.navigate", { url });
    await delay(1400);
  }

  const results = { desktop: {}, phone: {} };

  // ---- Desktop ----
  await setViewport(1280, 900, false);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/builder.html");
  await waitFor(`!document.getElementById('pfb-setup').hidden`, 8000);
  await shot("01-desktop-setup.png");
  results.desktop.setup = await evalExpr(`(function(){
    return {
      sources: document.querySelectorAll('#pfb-source option').length,
      purposes: document.querySelectorAll('#pfb-purpose option').length,
      limitations: !!document.getElementById('pfb-setup-limitations'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  await evalExpr(`document.getElementById('pfb-generate').click(); true`);
  await waitFor(`!document.getElementById('pfb-workspace').hidden && document.querySelectorAll('.pfb-card').length>0`, 10000);
  await delay(400);
  await shot("02-desktop-selection.png");
  results.desktop.selection = await evalExpr(`(function(){
    return {
      cards: document.querySelectorAll('.pfb-card').length,
      omitted: !!document.getElementById('pfb-omitted'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  await evalExpr(`document.getElementById('pfb-tab-sequence').click(); true`);
  await delay(350);
  await shot("03-desktop-sequence.png");
  results.desktop.sequence = await evalExpr(`(function(){
    return {
      items: document.querySelectorAll('.pfb-seq-item').length,
      moveUp: !!document.querySelector('[data-act="move-up"]'),
      pin: !!document.querySelector('[data-act="pin"]'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  await evalExpr(`document.getElementById('pfb-tab-alternatives').click(); true`);
  await delay(350);
  await shot("04-desktop-alternatives.png");

  await evalExpr(`document.getElementById('pfb-tab-save').click(); true`);
  await delay(350);
  await shot("05-desktop-save.png");
  results.desktop.save = await evalExpr(`(function(){
    return {
      title: !!document.getElementById('pfb-save-title'),
      confirm: !!document.getElementById('pfb-save-confirm'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  // ---- Phone ----
  await setViewport(390, 844, true);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/builder.html");
  await evalExpr(`document.getElementById('pfb-generate').click(); true`);
  await waitFor(`!document.getElementById('pfb-workspace').hidden`, 10000);
  await delay(400);
  results.phone.selection = await evalExpr(`(function(){
    return {
      cards: document.querySelectorAll('.pfb-card').length,
      tabs: document.querySelectorAll('.pfb-tab').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);
  await shot("06-phone-selection.png");

  await evalExpr(`document.getElementById('pfb-tab-sequence').click(); true`);
  await delay(350);
  results.phone.sequence = await evalExpr(`(function(){
    return {
      items: document.querySelectorAll('.pfb-seq-item').length,
      moveControls: document.querySelectorAll('[data-act="move-up"],[data-act="move-down"]').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);
  await shot("07-phone-sequence.png");

  await evalExpr(`document.getElementById('pfb-tab-save').click(); true`);
  await delay(350);
  await shot("08-phone-save.png");

  console.log("\nRESULTS", JSON.stringify(results, null, 2));
  console.log("CONSOLE ERRORS:", consoleErrors.length ? consoleErrors : "none");

  ws.close();
  chrome.proc.kill("SIGTERM");
  server.close();

  if (consoleErrors.length) {
    console.log("\nCAPTURE: completed WITH console errors");
    process.exit(1);
  }
  if (!results.desktop.selection || results.desktop.selection.cards < 1) {
    console.log("\nCAPTURE: draft selection failed");
    process.exit(1);
  }
  if (results.desktop.setup.overflow || results.desktop.selection.overflow || results.phone.selection.overflow) {
    console.log("\nCAPTURE: horizontal overflow detected");
    process.exit(1);
  }
  console.log("\nCAPTURE: PASS");
}

main().catch((e) => {
  console.error("capture error:", e.message);
  process.exit(2);
});
