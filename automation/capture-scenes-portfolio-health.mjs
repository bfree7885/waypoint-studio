#!/usr/bin/env node
/**
 * Capture Scenes Portfolio Health screenshots (desktop + tablet + phone).
 *
 * Seeds a review-only library + portfolios (SVG thumbs). Walks scope →
 * overview → insight detail → repetition → compare.
 *
 * Usage: node automation/capture-scenes-portfolio-health.mjs
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9441);
const PORT = Number(process.env.WAYPOINT_HTTP_PORT || 8821);
const BASE = "http://127.0.0.1:" + PORT;
const OUT = path.join(ROOT, "docs/scenes/portfolio-health");

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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pfh-cap-"));
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
    } catch (_) {
      /* retry */
    }
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
    { id: "img-ridge", filename: "ridge-dawn.jpg", favorite: true, selectionLabel: "keep", rating: 5, width: 6000, height: 4000, hue: 205, captureDate: "2025-10-01T10:00:00.000Z", tags: ["ridge", "alpine"], contentFingerprint: "fp-ridge", byteSize: 1000 },
    { id: "img-ridge-b", filename: "ridge-dawn-b.jpg", selectionLabel: "keep", rating: 4, width: 6000, height: 4000, hue: 208, captureDate: "2025-10-01T10:00:02.000Z", tags: ["ridge"], contentFingerprint: "fp-ridge-2" },
    { id: "img-ridge-dup", filename: "ridge-dawn.jpg", selectionLabel: "keep", rating: 4, width: 6000, height: 4000, hue: 206, captureDate: "2025-10-01T10:00:00.000Z", tags: ["ridge"], contentFingerprint: "fp-ridge", byteSize: 1000 },
    { id: "img-mist", filename: "valley-mist.jpg", selectionLabel: "keep", rating: 4, width: 4000, height: 2667, hue: 190, captureDate: "2025-10-12T10:00:00.000Z", tags: ["valley"] },
    { id: "img-fern", filename: "fern-detail.jpg", selectionLabel: "maybe", rating: 3, width: 3000, height: 4000, hue: 120, captureDate: "2026-04-01T10:00:00.000Z", tags: ["fern"] },
    { id: "img-winter-1", filename: "snow-1.jpg", selectionLabel: "keep", width: 5000, height: 3300, hue: 210, captureDate: "2026-01-10T10:00:00.000Z", tags: ["snow"] },
    { id: "img-winter-2", filename: "snow-2.jpg", selectionLabel: "keep", width: 5000, height: 3300, hue: 215, captureDate: "2026-01-12T10:00:00.000Z", tags: ["snow"] },
    { id: "img-winter-3", filename: "snow-3.jpg", width: 4800, height: 3200, hue: 218, captureDate: "2026-01-14T10:00:00.000Z", tags: ["snow"] },
    { id: "img-trail", filename: "trail-env.jpg", selectionLabel: "keep", rating: 3, width: 5000, height: 3300, hue: 150, captureDate: "2026-06-01T09:00:00.000Z", tags: ["trail"] },
    { id: "img-portrait", filename: "tree-p.jpg", width: 2400, height: 3600, hue: 100, captureDate: "2026-05-01T09:00:00.000Z", tags: ["forest"] }
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
    media: {
      hasOriginal: false,
      hasThumbnail: true,
      thumbnailDataUrl: svgThumb(r.filename, r.hue),
      originalBlobKey: r.id,
      thumbBlobKey: null
    },
    moduleRefs: { photoCoach: { analysisStatus: "not-analyzed" } },
    source: "upload",
    legacy: {}
  }));
}

function seedPortfolios() {
  return [
    {
      schemaVersion: "1.0.0",
      id: "pf-health-main",
      title: "Autumn ridges",
      description: "Website shortlist",
      purpose: "photography-website",
      createdAt: "2026-05-20T12:00:00.000Z",
      updatedAt: "2026-05-20T12:00:00.000Z",
      coverImageId: "img-ridge",
      imageIds: ["img-ridge", "img-ridge-b", "img-ridge-dup", "img-mist"],
      items: [
        { imageId: "img-ridge", notes: null, selectionRationale: "opening / cover candidate", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
        { imageId: "img-ridge-b", notes: null, selectionRationale: "hero", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
        { imageId: "img-ridge-dup", notes: null, selectionRationale: "supporting", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
        { imageId: "img-mist", notes: null, selectionRationale: "supporting", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" }
      ],
      notes: null,
      health: null,
      private: true
    },
    {
      schemaVersion: "1.0.0",
      id: "pf-health-alt",
      title: "Trail journal",
      description: null,
      purpose: "hiking-outdoor-journal",
      createdAt: "2026-05-20T12:00:00.000Z",
      updatedAt: "2026-05-20T12:00:00.000Z",
      coverImageId: "img-trail",
      imageIds: ["img-trail", "img-fern", "img-portrait"],
      items: [
        { imageId: "img-trail", notes: null, selectionRationale: "opening", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
        { imageId: "img-fern", notes: null, selectionRationale: "detail", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
        { imageId: "img-portrait", notes: null, selectionRationale: "detail", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" }
      ],
      notes: null,
      health: null,
      private: true
    }
  ];
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const chrome = await startChrome();
  const { default: WebSocket } = await import("ws");
  const ws = new WebSocket(chrome.wsUrl);
  await new Promise((r, j) => {
    ws.once("open", r);
    ws.once("error", j);
  });

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
      consoleErrors.push((det.text || "exception") + " " + ((det.exception && det.exception.description) || ""));
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
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
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
  const portfolioSeed = JSON.stringify(seedPortfolios());

  async function bootWithSeed(url) {
    await send("Page.navigate", { url });
    await waitFor(`!!document.querySelector('#main')`, 12000);
    await evalExpr(
      `localStorage.setItem('waypoint-photo-library-index-v1', ${JSON.stringify(seed)});` +
        `localStorage.setItem('waypoint-scenes-portfolios-v1', ${JSON.stringify(portfolioSeed)});` +
        `localStorage.removeItem('waypoint-scenes-portfolio-health-v1'); true`
    );
    await send("Page.navigate", { url });
    await delay(1400);
  }

  const results = { desktop: {}, tablet: {}, phone: {}, consoleErrors };

  // ---- Desktop ----
  await setViewport(1280, 900, false);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/health.html");
  await waitFor(`document.querySelectorAll('#pfh-portfolios option').length > 0`, 8000);
  await shot("01-desktop-scope.png");
  results.desktop.scope = await evalExpr(`(function(){
    return {
      options: document.querySelectorAll('#pfh-portfolios option').length,
      analyze: !!document.getElementById('pfh-analyze'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  await evalExpr(`(function(){
    var sel = document.getElementById('pfh-portfolios');
    sel.selectedIndex = 0;
    document.getElementById('pfh-analyze').click();
    return true;
  })()`);
  await waitFor(`!document.getElementById('pfh-overview').hidden`, 10000);
  await delay(400);
  await shot("02-desktop-overview.png");
  results.desktop.overview = await evalExpr(`(function(){
    return {
      areas: document.querySelectorAll('.pfh-overview-item').length,
      cards: document.querySelectorAll('.pfh-card').length,
      scoreRing: !!document.querySelector('.score-ring, [data-health-score]'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  await evalExpr(`(function(){
    var card = document.querySelector('.pfh-card');
    if (card) card.click();
    return !!card;
  })()`);
  await waitFor(`!document.getElementById('pfh-detail').hidden`, 8000);
  await delay(300);
  await shot("03-desktop-insight.png");

  await evalExpr(`(function(){
    document.getElementById('pfh-detail-back').click();
    var filter = document.getElementById('pfh-filter-cat');
    filter.value = 'repetition';
    filter.dispatchEvent(new Event('change'));
    var card = document.querySelector('.pfh-card');
    if (card) card.click();
    return true;
  })()`);
  await waitFor(`!document.getElementById('pfh-detail').hidden`, 8000);
  await delay(300);
  await shot("04-desktop-repetition.png");

  await evalExpr(`(function(){
    document.getElementById('pfh-detail-back').click();
    document.getElementById('pfh-scope-type').value = 'compare';
    document.getElementById('pfh-scope-type').dispatchEvent(new Event('change'));
    var sel = document.getElementById('pfh-portfolios');
    Array.prototype.forEach.call(sel.options, function(o){ o.selected = true; });
    document.getElementById('pfh-analyze').click();
    return true;
  })()`);
  await waitFor(`!document.getElementById('pfh-compare').hidden`, 10000);
  await delay(350);
  await shot("05-desktop-compare.png");

  // ---- Tablet ----
  await setViewport(834, 1112, true);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/health.html");
  await evalExpr(`(function(){
    document.getElementById('pfh-portfolios').selectedIndex = 0;
    document.getElementById('pfh-analyze').click();
    return true;
  })()`);
  await waitFor(`!document.getElementById('pfh-overview').hidden`, 10000);
  await delay(350);
  await shot("06-tablet-overview.png");
  results.tablet.overview = await evalExpr(`(function(){
    return {
      cards: document.querySelectorAll('.pfh-card').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);

  // ---- Phone ----
  await setViewport(390, 844, true);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/health.html");
  await shot("07-phone-scope.png");
  await evalExpr(`(function(){
    document.getElementById('pfh-portfolios').selectedIndex = 0;
    document.getElementById('pfh-analyze').click();
    return true;
  })()`);
  await waitFor(`!document.getElementById('pfh-overview').hidden`, 10000);
  await delay(350);
  await shot("08-phone-overview.png");
  await evalExpr(`(function(){
    var card = document.querySelector('.pfh-card');
    if (card) card.click();
    return !!card;
  })()`);
  await waitFor(`!document.getElementById('pfh-detail').hidden`, 8000);
  await delay(300);
  await shot("09-phone-insight.png");
  results.phone.overview = await evalExpr(`(function(){
    return {
      cards: document.querySelectorAll('.pfh-card').length || document.querySelectorAll('.pfh-detail').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      detailOpen: !document.getElementById('pfh-detail').hidden
    };
  })()`);

  ws.close();
  chrome.proc.kill("SIGTERM");
  server.close();

  const summary = {
    results,
    consoleErrors,
    screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith(".png"))
  };
  fs.writeFileSync(path.join(OUT, "capture-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (results.desktop.overview && results.desktop.overview.scoreRing) {
    console.error("FAIL: score ring present");
    process.exitCode = 1;
  }
  if (results.desktop.scope && results.desktop.scope.overflow) {
    console.error("FAIL: desktop overflow");
    process.exitCode = 1;
  }
  if (results.phone.overview && results.phone.overview.overflow) {
    console.error("FAIL: phone overflow");
    process.exitCode = 1;
  }
  if (consoleErrors.length) {
    console.warn("Console errors:", consoleErrors);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
