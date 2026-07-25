#!/usr/bin/env node
/**
 * Capture Scenes Portfolio Coach screenshots (desktop + mobile).
 *
 * Self-contained: static file server + review-only seeded library data
 * (SVG placeholder thumbnails). Opens Portfolio Coach from a similar-frame
 * pair and from manual selection.
 *
 * Usage: node automation/capture-scenes-portfolio-coach.mjs
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9426);
const PORT = Number(process.env.WAYPOINT_HTTP_PORT || 8793);
const BASE = "http://127.0.0.1:" + PORT;
const OUT = path.join(ROOT, "docs/scenes/portfolio-coach");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pfc-cap-"));
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
  const t0 = "2026-05-14T09:00:00.000Z";
  const t1 = "2026-05-14T09:00:02.000Z";
  const t2 = "2026-05-14T09:00:03.500Z";
  const rows = [
    { id: "img-ridge", filename: "ridge-dawn.jpg", favorite: true, selectionLabel: "keep", rating: 5, width: 6000, height: 4000, hue: 205,
      moduleRefs: { photoCoach: { analysisStatus: "analyzed", letterGrade: "A", overallScore: 92 } }, tags: ["ridge", "dawn"] },
    { id: "img-mist", filename: "valley-mist.jpg", selectionLabel: "keep", rating: 4, width: 4000, height: 2667, hue: 190, tags: ["valley"] },
    { id: "img-fern", filename: "fern-detail.jpg", selectionLabel: "maybe", rating: 3, width: 3000, height: 4000, hue: 120 },
    { id: "img-burst-1", filename: "heron-01.jpg", captureDate: t0, width: 4000, height: 2667, hue: 30, selectionLabel: "maybe" },
    { id: "img-burst-2", filename: "heron-02.jpg", captureDate: t1, width: 4000, height: 2667, hue: 32, favorite: true, rating: 5 },
    { id: "img-burst-3", filename: "heron-03.jpg", captureDate: t2, width: 4000, height: 2667, hue: 28 },
    { id: "img-dup-a", filename: "lakeside.jpg", contentFingerprint: "lakeside::1048576::1", byteSize: 1048576, selectionLabel: "keep", width: 4000, height: 2667, hue: 260 },
    { id: "img-dup-b", filename: "lakeside.jpg", contentFingerprint: "lakeside::1048576::1", byteSize: 1048576, selectionLabel: "keep", width: 4000, height: 2667, hue: 262 },
    { id: "img-bare-1", filename: "untitled-3941.jpg", width: 4000, height: 2667, hue: 0 },
    { id: "img-bare-2", filename: "untitled-3942.jpg", width: 4000, height: 2667, hue: 340 }
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
    subjectHints: [],
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
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
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
    id: "pf-coach-demo",
    title: "Marsh morning",
    description: null,
    purpose: "quiet wetland heron",
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
    await evalExpr(`localStorage.setItem('waypoint-photo-library-index-v1', ${JSON.stringify(seed)}); localStorage.setItem('waypoint-scenes-portfolios-v1', ${JSON.stringify(portfolioSeed)}); true`);
    await send("Page.navigate", { url: url + (url.indexOf("?") >= 0 ? "&" : "?") + "portfolio=pf-coach-demo" });
    await delay(1400);
  }

  const results = { desktop: {}, phone: {} };

  // ---- Desktop workspace ----
  await setViewport(1280, 900, false);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/assistant.html");
  await waitFor(`!document.getElementById('pfa-start').hidden`, 8000);
  await shot("01-desktop-assistant-start.png");
  await evalExpr(`document.getElementById('pfa-begin').click(); true`);
  await waitFor(`!document.getElementById('pfa-workspace').hidden && document.querySelectorAll('.pfa-cell').length>0`, 8000);
  await delay(400);
  await shot("02-desktop-workspace-with-coach-entry.png");
  results.desktop.workspace = await evalExpr(`(function(){
    return {
      cells: document.querySelectorAll('.pfa-cell').length,
      coachPair: !!document.querySelector('[data-coach-pair]'),
      coachPick: !!document.querySelector('[data-coach-pick]'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  // Focus duplicate and open Portfolio Coach
  await evalExpr(`(function(){
    var dup = document.querySelector('[data-focus="img-dup-a"]');
    if(dup) dup.click();
    return true;
  })()`);
  await delay(300);
  const opened = await evalExpr(`(function(){
    var btn = document.querySelector('[data-coach-pair]');
    if(btn){ btn.click(); return true; }
    // fallback: manual select two
    var a = document.querySelector('[data-coach-pick="img-burst-1"]');
    var b = document.querySelector('[data-coach-pick="img-burst-2"]');
    if(a) a.click();
    if(b) b.click();
    var open = document.querySelector('[data-coach-manual]');
    if(open){ open.click(); return true; }
    return false;
  })()`);
  results.desktop.coachOpened = opened;
  await waitFor(`!document.getElementById('pfc-coach').hidden`, 8000);
  await delay(400);
  await evalExpr(`(function(){var el=document.getElementById('pfc-coach'); if(el) el.scrollIntoView(); return true;})()`);
  await delay(200);
  await shot("03-desktop-coach-photos.png");

  await evalExpr(`(function(){var t=document.querySelector('[data-coach-tab="points"]'); if(t) t.click(); return !!t;})()`);
  await delay(300);
  await evalExpr(`(function(){var el=document.getElementById('pfc-coach'); if(el) el.scrollIntoView(); return true;})()`);
  await delay(200);
  results.desktop.points = await evalExpr(`(function(){
    return {
      points: document.querySelectorAll('.pfc-point').length,
      evidenceBtn: !!document.querySelector('[data-coach-evidence]'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);
  await shot("04-desktop-coach-points.png");

  // Expand evidence on first point
  await evalExpr(`(function(){var b=document.querySelector('[data-coach-evidence]'); if(b) b.click(); return !!b;})()`);
  await delay(250);
  await shot("05-desktop-coach-evidence.png");

  await evalExpr(`(function(){var t=document.querySelector('[data-coach-tab="decide"]'); if(t) t.click(); return !!t;})()`);
  await delay(300);
  await evalExpr(`(function(){
    var p=document.querySelector('[data-coach-pref="keep-both"]');
    if(p) p.click();
    var note=document.getElementById('pfc-note-input');
    if(note) note.value='Wider frame keeps more marsh context — may suit opening.';
    var save=document.getElementById('pfc-note-save');
    if(save) save.click();
    return true;
  })()`);
  await delay(300);
  await evalExpr(`(function(){var el=document.getElementById('pfc-coach'); if(el) el.scrollIntoView(); return true;})()`);
  await delay(200);
  await shot("06-desktop-coach-decide.png");
  results.desktop.decide = await evalExpr(`(function(){
    return {
      preferOn: !!document.querySelector('[data-coach-pref].is-on'),
      notes: document.querySelectorAll('.pfc-note__list li').length,
      roles: !!document.querySelector('[data-role-side]')
    };
  })()`);

  // ---- Phone ----
  await setViewport(390, 844, true);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/assistant.html");
  await evalExpr(`document.getElementById('pfa-begin').click(); true`);
  await waitFor(`!document.getElementById('pfa-workspace').hidden`, 8000);
  await evalExpr(`(function(){
    var dup = document.querySelector('[data-focus="img-dup-a"]');
    if(dup) dup.click();
    var btn = document.querySelector('[data-coach-pair]');
    if(btn){ btn.click(); return true; }
    return false;
  })()`);
  await waitFor(`!document.getElementById('pfc-coach').hidden`, 8000);
  await delay(300);
  await evalExpr(`window.scrollTo(0, document.getElementById('pfc-coach').offsetTop - 40)`);
  await delay(200);
  results.phone.coach = await evalExpr(`(function(){
    return {
      tabs: document.querySelectorAll('.pfc-tab').length,
      photosShown: !!document.querySelector('.pfc-photos.is-shown'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);
  await shot("07-phone-coach-photos.png");

  await evalExpr(`(function(){var t=document.querySelector('[data-coach-tab="points"]'); if(t) t.click(); return !!t;})()`);
  await delay(300);
  await evalExpr(`window.scrollTo(0, document.getElementById('pfc-coach').offsetTop - 40)`);
  await delay(200);
  await shot("08-phone-coach-points.png");
  results.phone.points = await evalExpr(`(function(){
    return {
      points: document.querySelectorAll('.pfc-point').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  console.log("\nRESULTS", JSON.stringify(results, null, 2));
  console.log("CONSOLE ERRORS:", consoleErrors.length ? consoleErrors : "none");

  ws.close();
  chrome.proc.kill("SIGTERM");
  server.close();

  if (consoleErrors.length) {
    console.log("\nCAPTURE: completed WITH console errors");
    process.exit(1);
  }
  if (!results.desktop.coachOpened) {
    console.log("\nCAPTURE: coach failed to open");
    process.exit(1);
  }
  console.log("\nCAPTURE: PASS");
}

main().catch((e) => {
  console.error("capture error:", e.message);
  process.exit(2);
});
