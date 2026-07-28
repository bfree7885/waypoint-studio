#!/usr/bin/env node
/**
 * Capture platform photography + visual regression owner-review screenshots.
 * Usage: node automation/capture-platform-visual-regression.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9411);
const OUT = path.join(ROOT, "docs/rebuild-2026/platform-visual-regression");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-pvr-"));
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
  // Preserve prior subtle category treatment as "current" baseline from Phase 3
  const phase3 = path.join(ROOT, "docs/rebuild-2026/phase3/01-desktop-workspace.png");
  if (fs.existsSync(phase3)) {
    fs.copyFileSync(phase3, path.join(OUT, "category-01-current-desktop-workspace.png"));
  }
  const phase3phone = path.join(ROOT, "docs/rebuild-2026/phase3/04-phone-workspace.png");
  if (fs.existsSync(phase3phone)) {
    fs.copyFileSync(phase3phone, path.join(OUT, "category-01-current-phone-workspace.png"));
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

  async function seedLocation() {
    await send("Runtime.evaluate", {
      expression: `(() => {
        try {
          localStorage.setItem("wds-location-v1", ${JSON.stringify(JSON.stringify(PIKE))});
          localStorage.setItem("waypoint-location", ${JSON.stringify(JSON.stringify(PIKE))});
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
    await delay(600);
  }

  async function consoleErrors() {
    const r = await send("Runtime.evaluate", {
      expression: `(() => {
        return {
          brokenImgs: Array.from(document.images).filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
          placeholders: Array.from(document.querySelectorAll('[data-placeholder="true"]')).length,
          featuredSrc: (document.querySelector('.wdb-r-deepen__img') || {}).src || null,
          scenesHero: (document.querySelector('[data-identity-img="scenes"]') || {}).currentSrc || (document.querySelector('.scenes-stage__media img') || {}).src || null,
          title: document.title
        };
      })()`
    });
    return r.result.value;
  }

  const meta = { base: BASE, capturedAt: new Date().toISOString(), checks: {} };

  // ——— Desktop Home ———
  await setViewport(1440, 900, false);
  await goto(BASE + "/");
  await seedLocation();
  await goto(BASE + "/");
  await delay(3500);
  await shot("01-desktop-home-after.png");
  await scrollTo('[data-deepen="photo"]');
  await shot("02-desktop-home-featured-photography.png");
  meta.checks.homeDesktop = await consoleErrors();
  await shot("category-03-final-desktop-workspace.png");
  // proposed = same stronger treatment (approved implementation)
  fs.copyFileSync(
    path.join(OUT, "category-03-final-desktop-workspace.png"),
    path.join(OUT, "category-02-proposed-desktop-workspace.png")
  );

  // ——— Desktop Scenes ———
  await goto(BASE + "/apps/scenes/");
  await delay(2000);
  await shot("03-desktop-scenes-after.png");
  meta.checks.scenesDesktop = await consoleErrors();

  // ——— Desktop Sheds ———
  await goto(BASE + "/apps/shed-hunting/");
  await delay(2000);
  await shot("04-desktop-sheds-after.png");
  meta.checks.shedsDesktop = await consoleErrors();

  // ——— Desktop Articles / Contact ———
  await goto(BASE + "/articles/");
  await delay(1500);
  await shot("05-desktop-articles.png");
  await goto(BASE + "/contact.html");
  await delay(1500);
  await shot("06-desktop-contact.png");

  // ——— Phone ———
  await setViewport(390, 844, true);
  await goto(BASE + "/");
  await seedLocation();
  await goto(BASE + "/");
  await delay(3500);
  await shot("07-phone-home-after.png");
  await scrollTo('[data-deepen="photo"]');
  await shot("08-phone-home-featured-photography.png");
  await shot("category-03-final-phone-workspace.png");
  fs.copyFileSync(
    path.join(OUT, "category-03-final-phone-workspace.png"),
    path.join(OUT, "category-02-proposed-phone-workspace.png")
  );

  await goto(BASE + "/apps/scenes/");
  await delay(2000);
  await shot("09-phone-scenes-after.png");
  meta.checks.scenesPhone = await consoleErrors();

  await goto(BASE + "/apps/shed-hunting/");
  await delay(2000);
  await shot("10-phone-sheds-after.png");
  meta.checks.shedsPhone = await consoleErrors();

  // Asset HEAD checks
  const assets = [
    "/assets/images/home/hero.jpg",
    "/apps/scenes/assets/media/hero.jpg",
    "/apps/scenes/assets/fogforest.jpg",
    "/apps/scenes/assets/wetland.jpg",
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

  ws.close();
  chrome.proc.kill("SIGTERM");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
