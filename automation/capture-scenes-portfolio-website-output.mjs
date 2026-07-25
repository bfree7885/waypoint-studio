#!/usr/bin/env node
/**
 * Capture Scenes Portfolio Website Output screenshots + sample export.
 *
 * Seeds library + portfolio (SVG thumbs). Walks home → create → editor →
 * preview viewports → writes a sample ZIP under docs/scenes/portfolio-website-output/.
 *
 * Usage: node automation/capture-scenes-portfolio-website-output.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9443);
const PORT = Number(process.env.WAYPOINT_HTTP_PORT || 8823);
const BASE = "http://127.0.0.1:" + PORT;
const OUT = path.join(ROOT, "docs/scenes/portfolio-website-output");
const PF = path.join(ROOT, "apps/scenes/portfolio/js");
const PL = path.join(ROOT, "apps/photo-library/js");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pfo-cap-"));
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
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl, userDataDir };
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
    `<text x='16' y='210' font-family='Georgia,serif' font-size='20' fill='#eef2f6'>${label}</text>` +
    `</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

function seedIndex() {
  const rows = [
    { id: "img-ridge", filename: "ridge-dawn.jpg", hue: 205 },
    { id: "img-mist", filename: "valley-mist.jpg", hue: 190 },
    { id: "img-fern", filename: "fern-detail.jpg", hue: 120 },
    { id: "img-trail", filename: "trail-env.jpg", hue: 150 }
  ];
  return rows.map((r) => ({
    schemaVersion: "1.0.0",
    id: r.id,
    filename: r.filename,
    originalFilename: r.filename,
    mimeType: "image/jpeg",
    captureDate: "2025-10-12T10:00:00.000Z",
    importDate: "2026-05-20T12:00:00.000Z",
    updatedAt: "2026-05-20T12:00:00.000Z",
    camera: { make: "Fujifilm", model: "X-T5", lens: null, focalLengthMm: 35 },
    gps: { lat: null, lon: null, accuracyM: null },
    orientation: "landscape",
    width: 4000,
    height: 2667,
    tags: [],
    collectionIds: [],
    rating: 4,
    selectionLabel: "keep",
    favorite: r.id === "img-ridge",
    subjectHints: [],
    photographerNotes: "PRIVATE note — must not export",
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
      id: "pf-output-demo",
      title: "Autumn ridges",
      description: "A quiet shortlist for a photography website draft.",
      purpose: "photography-website",
      createdAt: "2026-05-20T12:00:00.000Z",
      updatedAt: "2026-05-20T12:00:00.000Z",
      coverImageId: "img-ridge",
      imageIds: ["img-ridge", "img-mist", "img-fern", "img-trail"],
      items: [
        { imageId: "img-ridge", notes: "private item", selectionRationale: "opening / cover", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
        { imageId: "img-mist", notes: null, selectionRationale: "hero", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
        { imageId: "img-fern", notes: null, selectionRationale: "detail", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" },
        { imageId: "img-trail", notes: null, selectionRationale: "closing", addedAt: "2026-05-20T12:00:00.000Z", source: "manual" }
      ],
      notes: "PRIVATE portfolio notes — never export",
      health: null,
      private: true
    }
  ];
}

function writeSampleExport() {
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
    Uint8Array,
    Uint32Array,
    TextEncoder: globalThis.TextEncoder,
    Buffer,
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    localStorage: {
      getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
      setItem: (k, v) => localStore.set(k, String(v)),
      removeItem: (k) => localStore.delete(k)
    },
    crypto: { randomUUID: () => "pwo-sample-1" },
    setTimeout: (fn) => fn()
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  function load(dir, file) {
    vm.runInNewContext(fs.readFileSync(path.join(dir, file), "utf8"), sandbox, { filename: file });
  }
  load(PL, "pl-models.js");
  load(PF, "portfolio-models.js");
  load(PF, "portfolio-store.js");
  load(PF, "portfolio-candidates.js");
  load(PF, "portfolio-engine.js");
  load(PF, "output-catalog.js");
  load(PF, "output-models.js");
  load(PF, "output-store.js");
  load(PF, "output-privacy.js");
  load(PF, "output-zip.js");
  load(PF, "output-package.js");
  load(PF, "output-engine.js");

  return (async () => {
    const LibM = sandbox.window.WaypointPhotoLibraryModels;
    const PortEng = sandbox.window.WaypointScenesPortfolioEngine.create();
    await PortEng.init();
    const images = seedIndex().map((row) => LibM.createLibraryImage(row));
    localStore.set("waypoint-photo-library-index-v1", JSON.stringify(images));
    const pf = seedPortfolios()[0];
    const created = PortEng.createPortfolio(pf);
    // recreate with fixed id by saving
    const StoreP = sandbox.window.WaypointScenesPortfolioStore;
    StoreP.savePortfolios([pf]);
    const portEng2 = sandbox.window.WaypointScenesPortfolioEngine.create();
    await portEng2.init();
    const portfolio = portEng2.get("pf-output-demo") || created;

    const out = sandbox.window.WaypointScenesPortfolioOutputEngine.create();
    await out.init();
    const project = out.createFromPortfolio(portfolio, { layout: "editorial" });
    out.updateProject(project.id, {
      title: "Autumn ridges",
      description: "A quiet shortlist for a photography website draft.",
      layout: "editorial"
    });
    out.setImageContent(project.id, "img-ridge", {
      title: "Ridge at dawn",
      caption: "Opening frame",
      altText: "Mountain ridge at dawn"
    });
    out.setImageContent(project.id, "img-mist", {
      altText: "Valley mist"
    });
    out.setImageContent(project.id, "img-fern", {
      altText: "Fern detail"
    });
    out.setImageContent(project.id, "img-trail", {
      altText: "Trail through trees"
    });

    const result = await out.exportPackage(project.id, images, portfolio, { preferOriginal: false });
    if (!result.success) throw new Error("sample export failed: " + result.failureReason);
    const zipPath = path.join(OUT, "sample-autumn-ridges-website.zip");
    fs.writeFileSync(zipPath, Buffer.from(result.zipBytes));
    // Also unpack text files for owner inspection
    const sampleDir = path.join(OUT, "sample-export");
    fs.mkdirSync(path.join(sampleDir, "images"), { recursive: true });
    for (const f of result.files) {
      const dest = path.join(sampleDir, f.name);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (typeof f.bytes === "string") fs.writeFileSync(dest, f.bytes);
      else fs.writeFileSync(dest, Buffer.from(f.bytes));
    }
    return { zipPath, sampleDir, filename: result.filename, approxBytes: result.approxBytes };
  })();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const sample = await writeSampleExport();
  console.log("sample export", sample);

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
        `localStorage.removeItem('waypoint-scenes-portfolio-website-projects-v1');` +
        `localStorage.removeItem('waypoint-scenes-portfolio-website-export-history-v1'); true`
    );
    await send("Page.navigate", { url });
    await delay(1400);
  }

  const results = { desktop: {}, tablet: {}, phone: {}, consoleErrors };

  await setViewport(1280, 900, false);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/output.html");
  await waitFor(`!!document.getElementById('pfo-new')`, 8000);
  await shot("01-desktop-home.png");

  await evalExpr(`document.getElementById('pfo-new').click(); true`);
  await waitFor(`!document.getElementById('pfo-create').hidden`, 8000);
  await delay(300);
  await shot("02-desktop-create.png");

  await evalExpr(`document.getElementById('pfo-create-confirm').click(); true`);
  await waitFor(`!document.getElementById('pfo-editor').hidden`, 8000);
  await delay(400);
  await shot("03-desktop-editor.png");

  await evalExpr(`(function(){
    var shots = document.querySelectorAll('.pfo-shot');
    if (shots[0]) {
      var alt = shots[0].querySelector('[data-field="altText"]');
      if (alt) { alt.value = 'Mountain ridge at dawn'; alt.dispatchEvent(new Event('change', {bubbles:true})); }
      var cap = shots[0].querySelector('[data-field="caption"]');
      if (cap) { cap.value = 'Opening frame'; cap.dispatchEvent(new Event('change', {bubbles:true})); }
    }
    return true;
  })()`);
  await delay(200);
  await shot("04-desktop-editor-captions.png");

  await evalExpr(`document.getElementById('pfo-preview-btn').click(); true`);
  await waitFor(`!document.getElementById('pfo-preview').hidden`, 8000);
  await delay(600);
  await shot("05-desktop-preview.png");

  await setViewport(834, 1112, true);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/output.html?portfolio=pf-output-demo");
  await waitFor(`!document.getElementById('pfo-editor').hidden`, 10000);
  await delay(400);
  await shot("06-tablet-editor.png");
  await evalExpr(`document.getElementById('pfo-preview-btn').click(); true`);
  await waitFor(`!document.getElementById('pfo-preview').hidden`, 8000);
  await evalExpr(`(function(){
    var btn = document.querySelector('[data-viewport="tablet"]');
    if (btn) btn.click();
    return true;
  })()`);
  await delay(500);
  await shot("07-tablet-preview.png");
  results.tablet.preview = await evalExpr(`(function(){
    return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  })()`);

  await setViewport(390, 844, true);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/output.html?portfolio=pf-output-demo");
  await waitFor(`!document.getElementById('pfo-editor').hidden`, 10000);
  await delay(350);
  await shot("08-phone-editor.png");
  await evalExpr(`document.getElementById('pfo-preview-btn').click(); true`);
  await waitFor(`!document.getElementById('pfo-preview').hidden`, 8000);
  await evalExpr(`(function(){
    var btn = document.querySelector('[data-viewport="mobile"]');
    if (btn) btn.click();
    return true;
  })()`);
  await delay(500);
  await shot("09-phone-preview.png");
  results.phone.preview = await evalExpr(`(function(){
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      hasPublish: !!document.body.innerText.match(/\\bPublish\\b/) && !document.body.innerText.match(/not published|never publish/i)
    };
  })()`);

  // Portfolio index link
  await setViewport(1280, 900, false);
  await bootWithSeed(BASE + "/apps/scenes/portfolio/");
  await waitFor(`!!document.querySelector('a[href="output.html"]')`, 8000);
  await shot("10-desktop-portfolio-link.png");
  results.desktop.link = await evalExpr(`!!document.querySelector('a[href="output.html"]')`);

  ws.close();
  chrome.proc.kill("SIGTERM");
  try {
    fs.rmSync(chrome.userDataDir, { recursive: true, force: true });
  } catch (_) {
    /* ignore */
  }
  server.close();

  const summary = {
    results,
    consoleErrors,
    sample,
    screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith(".png"))
  };
  fs.writeFileSync(path.join(OUT, "capture-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (results.phone.preview && results.phone.preview.overflow) {
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
