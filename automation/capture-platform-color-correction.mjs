#!/usr/bin/env node
/**
 * Capture photography + category-color correction evidence.
 * Usage: node automation/capture-platform-color-correction.mjs [baseUrl]
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
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9422);
const OUT = path.join(ROOT, "docs/rebuild-2026/platform-color-correction");

const PIKE = {
  source: "manual",
  lat: 41.34,
  lng: -75.04,
  timestamp: Date.now(),
  regionId: "pike-county-pa",
  name: "Pike County",
  county: "Pike County",
  state: "Pennsylvania",
  stateCode: "PA",
  placeLabel: "Pike County, PA",
  displayTitle: "Pike County, PA",
  contentMode: "local-bundle"
};

/** Show one widget per semantic category for color proof (capture only). */
const COLOR_PROOF_PREFS = {
  version: 1,
  enabled: [
    "ph-conditions",
    "ph-light",
    "ph-air",
    "ph-astronomy",
    "ph-photography",
    "ph-rivers",
    "ph-wildlife",
    "ph-alerts"
  ],
  order: [
    "ph-conditions",
    "ph-light",
    "ph-air",
    "ph-astronomy",
    "ph-photography",
    "ph-rivers",
    "ph-wildlife",
    "ph-alerts"
  ],
  sizes: {},
  favorites: [],
  gridColumns: 3,
  preset: "default"
};

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-pcc-"));
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
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // Previous subtle treatment baseline (failed review)
  const prevClose = path.join(
    ROOT,
    "docs/rebuild-2026/platform-visual-regression/category-03-final-desktop-widgets-closeup.png"
  );
  if (fs.existsSync(prevClose)) {
    fs.copyFileSync(prevClose, path.join(OUT, "07-side-by-side-previous-widget-treatment.png"));
  }
  const prevWs = path.join(
    ROOT,
    "docs/rebuild-2026/platform-visual-regression/category-03-final-desktop-workspace.png"
  );
  if (fs.existsSync(prevWs)) {
    fs.copyFileSync(prevWs, path.join(OUT, "07b-previous-desktop-workspace.png"));
  }

  const chrome = await startChrome();
  const { default: WebSocket } = await import("ws");
  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.once("open", r);
    ws.once("error", j);
  });
  let id = 0;
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
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  async function goto(url) {
    await send("Page.navigate", { url });
    await delay(2800);
  }

  async function seed(colorProof) {
    await send("Runtime.evaluate", {
      expression: `(() => {
        try {
          localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify(PIKE))});
          localStorage.setItem("wds-location-v1", ${JSON.stringify(JSON.stringify(PIKE))});
          localStorage.setItem("waypoint-location", ${JSON.stringify(JSON.stringify(PIKE))});
          localStorage.setItem("wds-location-prompted", "1");
          ${
            colorProof
              ? `localStorage.setItem("waypoint-dashboard-rebuild-prefs-v1", ${JSON.stringify(
                  JSON.stringify(COLOR_PROOF_PREFS)
                )});`
              : `localStorage.removeItem("waypoint-dashboard-rebuild-prefs-v1");`
          }
        } catch (e) {}
        return true;
      })()`
    });
  }

  async function shot(name) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(result.data, "base64"));
    console.log("wrote", name);
  }

  async function setViewport(w, h, mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile: !!mobile
    });
  }

  async function scrollTo(sel) {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector(${JSON.stringify(sel)});
        if (el) el.scrollIntoView({ block: "center" });
        return !!el;
      })()`
    });
    await delay(700);
  }

  async function inspect() {
    const r = await send("Runtime.evaluate", {
      expression: `(() => {
        const featured = document.querySelector('.wdb-r-deepen__img');
        const scenes = document.querySelector('[data-identity-img="scenes"]');
        const widgets = Array.from(document.querySelectorAll('.wdb-r-widget[data-category]')).map(w => ({
          id: w.getAttribute('data-widget-id'),
          cat: w.getAttribute('data-category'),
          border: getComputedStyle(w).borderColor,
          shadow: getComputedStyle(w).boxShadow.slice(0, 120)
        }));
        const bodyText = document.body ? document.body.innerText : '';
        return {
          title: document.title,
          featuredSrc: featured ? featured.currentSrc || featured.src : null,
          featuredPlaceholder: featured ? featured.getAttribute('data-placeholder') : null,
          featuredCaption: (document.querySelector('.wdb-r-deepen__caption') || {}).textContent || null,
          scenesSrc: scenes ? scenes.currentSrc || scenes.src : null,
          scenesCredit: (document.querySelector('[data-identity-credit="scenes"]') || {}).textContent || null,
          locationPromptOpen: !!document.querySelector('.wds-location-prompt'),
          placeholderCopyHits: [
            'temporary placeholder',
            'replace with owner photography',
            'replace with owner sky photography'
          ].filter(s => bodyText.toLowerCase().includes(s.toLowerCase())),
          brokenImgs: Array.from(document.images).filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
          widgets
        };
      })()`,
      returnByValue: true
    });
    return r.result && r.result.value;
  }

  const meta = { base: BASE, capturedAt: new Date().toISOString(), checks: {} };

  // Desktop Home — default prefs
  await setViewport(1440, 900, false);
  await goto(BASE + "/");
  await seed(false);
  await goto(BASE + "/");
  await delay(4000);
  await shot("01-desktop-home-full.png");
  meta.checks.homeDefault = await inspect();

  // Desktop Home — color proof prefs (all semantic categories)
  await seed(true);
  await goto(BASE + "/");
  await delay(4000);
  await scrollTo('[data-wdb-r-workspace]');
  await shot("02-desktop-widget-grid-closeup.png");
  await shot("07c-corrected-desktop-workspace.png");
  meta.checks.homeColorProof = await inspect();

  await scrollTo('[data-deepen="photo"]');
  await shot("04-desktop-home-featured-photography.png");
  meta.checks.featuredPhoto = await inspect();

  // Scenes hero
  await goto(BASE + "/apps/scenes/");
  await delay(2500);
  await shot("05-desktop-scenes-hero.png");
  meta.checks.scenesHero = await inspect();

  // Mucarri / attribution shot — Featured caption with field credit (no Mucarri in repo)
  await setViewport(1440, 900, false);
  await goto(BASE + "/");
  await seed(true);
  await goto(BASE + "/");
  await delay(3500);
  await scrollTo('[data-deepen="photo"]');
  await shot("06-featured-attribution-caption.png");
  meta.checks.attribution = await inspect();

  // Phone
  await setViewport(390, 844, true);
  await seed(true);
  await goto(BASE + "/");
  await delay(4000);
  await shot("03-home-mobile.png");
  meta.checks.homeMobile = await inspect();

  // Tablet
  await setViewport(768, 1024, true);
  await seed(true);
  await goto(BASE + "/");
  await delay(3500);
  await shot("03b-home-tablet.png");

  // Asset checks
  const assets = [
    "/assets/images/featured/bog-bridge-evergreens.jpg",
    "/assets/images/scenes/old-growth-cedar.jpg",
    "/assets/images/featured/fog-forest.jpg",
    "/apps/scenes/assets/media/hero.jpg",
    "/assets/images/identity/manifest.json"
  ];
  meta.assetStatus = {};
  for (const a of assets) {
    try {
      await new Promise((resolve, reject) => {
        http.get(BASE + a, (res) => {
          meta.assetStatus[a] = res.statusCode;
          res.resume();
          resolve();
        }).on("error", reject);
      });
    } catch (e) {
      meta.assetStatus[a] = String(e.message || e);
    }
  }

  fs.writeFileSync(path.join(OUT, "capture-meta.json"), JSON.stringify(meta, null, 2));
  console.log("meta", JSON.stringify(meta, null, 2));

  try {
    chrome.proc.kill("SIGTERM");
  } catch (_) {}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
