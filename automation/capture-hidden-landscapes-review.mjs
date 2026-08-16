#!/usr/bin/env node
/**
 * Hidden Landscapes real-photo matrix + owner review gallery capture.
 * Usage: node automation/capture-hidden-landscapes-review.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

let WS;
try {
  WS = require("ws");
} catch (e) {
  console.error("ws package required");
  process.exit(1);
}

const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9488);
const OUT = path.join(ROOT, "docs/rebuild-2026/scenes-v1-hidden-landscapes");
const FIX = path.join(ROOT, "automation/fixtures/hidden-landscapes");
const MATRIX = path.join(OUT, "real-photo-matrix");
const SHOTS = path.join(OUT, "screenshots");

const FIXTURES = [
  "01-well-exposed-landscape.png",
  "02-underexposed-landscape.png",
  "03-bright-sky-dark-fg.png",
  "04-sunset.png",
  "05-forest.png",
  "06-snow.png",
  "07-water.png",
  "08-wildlife.png",
  "09-high-iso-wildlife.png",
  "10-low-light-night.png",
  "11-smooth-fog.png",
  "12-detailed-foliage.png",
  "13-strong-sat.png",
  "14-low-contrast-haze.png",
  "A-cloud-DSC00745.JPG",
  "B-water-DSC00314.JPG",
  "C-fog-fogforest.jpg",
  "D-wildlife-Robin.JPG",
  "E-static-Edited-8190413.JPG",
  "F-complex-mist-valley.jpg"
].filter((f) => fs.existsSync(path.join(FIX, f)));

const VIEWS = [
  { pillar: "light", view: "luminance" },
  { pillar: "light", view: "tonal" },
  { pillar: "light", view: "concentration" },
  { pillar: "color", view: "families" },
  { pillar: "color", view: "warm-cool" },
  { pillar: "color", view: "saturation" },
  { pillar: "structure", view: "edges" },
  { pillar: "structure", view: "texture" },
  { pillar: "structure", view: "local-contrast" },
  { pillar: "structure", view: "estimated-depth" },
  { pillar: "animal", view: "deer" },
  { pillar: "animal", view: "canine" },
  { pillar: "animal", view: "bee-uv" },
  { pillar: "animal", view: "bird-uv" }
];

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

async function startServer() {
  const baseArg = process.argv[2];
  if (baseArg) return { base: baseArg.replace(/\/$/, ""), proc: null };
  const port = 8765;
  const proc = spawn("python3", ["-m", "http.server", String(port)], {
    cwd: ROOT,
    stdio: "ignore"
  });
  await delay(600);
  return { base: `http://127.0.0.1:${port}`, proc };
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "hl-review-"));
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
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${CDP_PORT}/json/version`, (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => resolve(d));
        }).on("error", reject);
      });
      return proc;
    } catch (e) {
      await delay(150);
    }
  }
  throw new Error("Chrome CDP not ready");
}

async function cdpConnect() {
  const list = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
  const page = list.find((t) => t.type === "page") || list[0];
  const ws = new WS(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.once("open", r));
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  function send(method, params = {}) {
    const mid = ++id;
    return new Promise((resolve, reject) => {
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }
  await send("Page.enable");
  await send("Runtime.enable");
  return { ws, send };
}

async function navigate(send, url) {
  await send("Page.navigate", { url });
  await delay(900);
  for (let i = 0; i < 30; i++) {
    const r = await send("Runtime.evaluate", {
      expression: "document.getElementById('hl-studio') && document.getElementById('hl-studio').getAttribute('aria-busy') === 'false'",
      returnByValue: true
    });
    if (r.result && r.result.value) break;
    await delay(200);
  }
}

async function loadFixture(send, filePath) {
  const buf = fs.readFileSync(filePath);
  const b64 = buf.toString("base64");
  const name = path.basename(filePath);
  const mime = /\.png$/i.test(name) ? "image/png" : "image/jpeg";
  const expr = `
    (async function() {
      const b64 = ${JSON.stringify(b64)};
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: ${JSON.stringify(mime)} });
      const file = new File([blob], ${JSON.stringify(name)}, { type: ${JSON.stringify(mime)} });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.getElementById('hl-file');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      for (let i = 0; i < 80; i++) {
        await new Promise(r => setTimeout(r, 100));
        const c = document.getElementById('hl-canvas-result');
        if (c && c.width > 10) return { ok: true, w: c.width, h: c.height };
      }
      return { ok: false };
    })()
  `;
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  return r.result && r.result.value;
}

async function selectView(send, pillar, view) {
  const expr = `
    (async function() {
      const p = document.querySelector('[data-pillar="${pillar}"]');
      if (p) p.click();
      await new Promise(r => setTimeout(r, 120));
      const v = document.querySelector('[data-view="${view}"]');
      if (v) v.click();
      await new Promise(r => setTimeout(r, 450));
      const banner = document.getElementById('hl-unavailable-banner');
      const unavailable = banner && !banner.hidden;
      const c = document.getElementById('hl-canvas-result');
      return {
        unavailable: !!unavailable,
        banner: unavailable ? banner.textContent : '',
        w: c ? c.width : 0,
        ep: (document.querySelector('#hl-why-body .hl-ep') || document.querySelector('.hl-view.is-active .hl-ep') || {}).textContent || ''
      };
    })()
  `;
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  return r.result && r.result.value;
}

async function canvasPng(send, canvasId) {
  const expr = `
    (function() {
      const c = document.getElementById(${JSON.stringify(canvasId)});
      if (!c || !c.width) return null;
      return c.toDataURL('image/jpeg', 0.88).split(',')[1];
    })()
  `;
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  return r.result && r.result.value;
}

async function screenshot(send, outPath, width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: width,
    height: height,
    deviceScaleFactor: 1,
    mobile: width < 500
  });
  await delay(200);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
}

async function main() {
  ensureDir(MATRIX);
  ensureDir(SHOTS);
  ensureDir(path.join(OUT, "exports"));

  const { base, proc: server } = await startServer();
  const chrome = await startChrome();
  const { ws, send } = await cdpConnect();
  const report = { base, fixtures: [], views: VIEWS, capturedAt: new Date().toISOString() };

  try {
    await navigate(send, base + "/apps/hidden-landscapes/");
    await screenshot(send, path.join(SHOTS, "desktop-empty-1440.png"), 1440, 900);
    await screenshot(send, path.join(SHOTS, "desktop-empty-1728.png"), 1728, 1000);
    await screenshot(send, path.join(SHOTS, "mobile-empty-390.png"), 390, 844);
    await screenshot(send, path.join(SHOTS, "mobile-empty-430.png"), 430, 932);

    // Nav overflow QC at 390 (after mobile empty shot already set 390 metrics)
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await delay(200);
    const navQc = await send("Runtime.evaluate", {
      expression: `(() => {
        const nav = document.querySelector('.was-local__nav');
        const doc = document.documentElement;
        const links = Array.from(document.querySelectorAll('.was-local__nav a')).map(a => a.textContent.trim());
        return {
          links,
          navScrollWidth: nav ? nav.scrollWidth : 0,
          navClientWidth: nav ? nav.clientWidth : 0,
          pageScrollWidth: doc.scrollWidth,
          pageClientWidth: doc.clientWidth,
          pageHScroll: doc.scrollWidth > doc.clientWidth + 1,
          hasHiddenLandscapes: links.some(t => /Hidden Landscapes/i.test(t)),
          hasOtherWays: links.some(t => /Other ways of seeing/i.test(t))
        };
      })()`,
      returnByValue: true
    });
    report.navQc390 = navQc.result && navQc.result.value;

    // Full matrix — Attack 4 corpus + owner A–F
    const matrixFixtures = FIXTURES;
    for (const fix of matrixFixtures) {
      const stem = fix.replace(/\.[^.]+$/, "");
      const dir = path.join(MATRIX, stem);
      ensureDir(dir);
      console.log("Fixture", fix);
      await navigate(send, base + "/apps/hidden-landscapes/");
      const loaded = await loadFixture(send, path.join(FIX, fix));
      if (!loaded || !loaded.ok) {
        report.fixtures.push({ fix, ok: false });
        continue;
      }
      // original
      const origB64 = await canvasPng(send, "hl-canvas-original");
      if (origB64) fs.writeFileSync(path.join(dir, "00-original.jpg"), Buffer.from(origB64, "base64"));

      const entry = { fix, ok: true, views: {} };
      for (const { pillar, view } of VIEWS) {
        const meta = await selectView(send, pillar, view);
        const b64 = await canvasPng(send, "hl-canvas-result");
        const name = `${pillar}-${view}.jpg`;
        if (b64 && !(meta && meta.unavailable)) {
          fs.writeFileSync(path.join(dir, name), Buffer.from(b64, "base64"));
        }
        if (meta && meta.unavailable) {
          fs.writeFileSync(path.join(dir, `${pillar}-${view}-UNAVAILABLE.txt`), meta.banner || "UNAVAILABLE");
        }
        entry.views[`${pillar}/${view}`] = meta;
      }
      report.fixtures.push(entry);
    }

    // Desktop + mobile with a loaded photo — photo-first viewports
    await navigate(send, base + "/apps/hidden-landscapes/");
    await loadFixture(send, path.join(FIX, matrixFixtures[0]));
    await selectView(send, "light", "luminance");
    await screenshot(send, path.join(SHOTS, "desktop-luminance-1440.png"), 1440, 900);
    await screenshot(send, path.join(SHOTS, "desktop-luminance-1728.png"), 1728, 1000);
    await selectView(send, "structure", "edges");
    await screenshot(send, path.join(SHOTS, "desktop-structure-edges-1440.png"), 1440, 900);
    await selectView(send, "animal", "deer");
    await screenshot(send, path.join(SHOTS, "desktop-deer-1440.png"), 1440, 900);
    await screenshot(send, path.join(SHOTS, "desktop-deer-1728.png"), 1728, 1000);
    await screenshot(send, path.join(SHOTS, "mobile-deer-390.png"), 390, 844);
    await screenshot(send, path.join(SHOTS, "mobile-deer-430.png"), 430, 932);
    await selectView(send, "animal", "bee-uv");
    await screenshot(send, path.join(SHOTS, "desktop-bee-unavailable-1440.png"), 1440, 900);
    await screenshot(send, path.join(SHOTS, "mobile-bee-unavailable-390.png"), 390, 844);
    await screenshot(send, path.join(SHOTS, "mobile-bee-unavailable-430.png"), 430, 932);

    // Import-only empty should not show analysis chrome
    await navigate(send, base + "/apps/hidden-landscapes/");
    const emptyState = await send("Runtime.evaluate", {
      expression: `(() => {
        const imp = document.getElementById('hl-import');
        const work = document.getElementById('hl-workspace');
        const pillars = document.getElementById('hl-pillars');
        return {
          importVisible: imp && !imp.hidden,
          workspaceHidden: work && work.hidden,
          pillarsEmpty: !pillars || pillars.children.length === 0 || work.hidden
        };
      })()`,
      returnByValue: true
    });
    report.emptyState = emptyState.result && emptyState.result.value;

    // Animal vision redirect
    await send("Page.navigate", { url: base + "/apps/animal-vision/" });
    await delay(800);
    const loc = await send("Runtime.evaluate", {
      expression: "location.pathname + location.search",
      returnByValue: true
    });
    report.animalVisionRedirect = loc.result && loc.result.value;

    fs.writeFileSync(path.join(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
    console.log("Wrote", OUT);
    console.log("Fixtures OK", report.fixtures.filter((f) => f.ok).length);
  } finally {
    try { ws.close(); } catch (e) { /* ignore */ }
    try { chrome.kill(); } catch (e) { /* ignore */ }
    if (server) try { server.kill(); } catch (e) { /* ignore */ }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
