#!/usr/bin/env node
/**
 * Browser verification + screenshots for Dashboard tile layout repair.
 * Usage: node automation/capture-dashboard-tile-layout-repair.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9444);
const OUT = path.join(ROOT, "docs/rebuild-2026/dashboard-tile-layout-repair");

const VIEWPORTS = [
  { name: "320x800", width: 320, height: 800 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1440x1000", width: 1440, height: 1000 }
];

const ALL_TILES = ["ph-conditions", "ph-air", "ph-alerts", "ph-astronomy", "ph-light"];
const ODD_TILES = ["ph-conditions", "ph-air", "ph-alerts", "ph-astronomy"];

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
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-tile-"));
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
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });

  const failures = [];
  const results = [];

  async function seedPrefs(enabled) {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const pike = ${JSON.stringify(PIKE)};
        localStorage.setItem('wds-location-v3', JSON.stringify(pike));
        localStorage.setItem('wds-location-v1', JSON.stringify(pike));
        localStorage.setItem('waypoint-location', JSON.stringify(pike));
        localStorage.setItem('wds-location-prompted', '1');
        localStorage.setItem('waypoint-dashboard-rebuild-prefs-v1', JSON.stringify({
          version: 1,
          enabled: ${JSON.stringify(enabled)},
          order: ${JSON.stringify(enabled)},
          sizes: Object.fromEntries(${JSON.stringify(enabled)}.map(id => [id, 'standard'])),
          favorites: [],
          gridColumns: 3,
          preset: 'default',
          kioskRefreshMs: 300000
        }));
        const prompt = document.querySelector('#wds-location-prompt, .wds-location-prompt, [data-wds-location-prompt]');
        if (prompt) prompt.setAttribute('hidden', '');
        return true;
      })()`,
      returnByValue: true
    });
  }

  async function dismissLocationIfPresent() {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('[data-wds-location-choice="pike"], button[data-action="use-pike"], .wds-location-prompt button');
        const pike = [...document.querySelectorAll('button')].find(b => /Pike County/i.test(b.textContent || ''));
        if (pike) { pike.click(); return 'clicked'; }
        const prompt = document.querySelector('#wds-location-prompt, .wds-location-prompt');
        if (prompt) { prompt.setAttribute('hidden', ''); prompt.style.display = 'none'; return 'hidden'; }
        return 'none';
      })()`,
      returnByValue: true
    });
    await delay(400);
  }

  async function measureTiles() {
    const r = await send("Runtime.evaluate", {
      expression: `(() => {
        const grid = document.querySelector('[data-wdb-r-grid]');
        const familyGrids = [...document.querySelectorAll('[data-wdb-r-family-grid]')];
        const tiles = [...document.querySelectorAll('.wdb-r-widget')];
        const gridW = grid ? grid.getBoundingClientRect().width : 0;
        const text = document.body.innerText || '';
        return {
          innerWidth: window.innerWidth,
          gridWidth: Math.round(gridW),
          familyCount: familyGrids.length,
          comingSoon: /coming soon/i.test(text),
          tiles: tiles.map(t => {
            const r = t.getBoundingClientRect();
            const parent = t.closest('[data-wdb-r-family-grid]');
            const parentW = parent ? parent.getBoundingClientRect().width : gridW;
            return {
              id: t.getAttribute('data-widget-id'),
              size: t.getAttribute('data-size'),
              className: t.className,
              width: Math.round(r.width),
              parentWidth: Math.round(parentW),
              ratio: parentW ? r.width / parentW : 0
            };
          })
        };
      })()`,
      returnByValue: true
    });
    return r.result.value;
  }

  async function shot(name) {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(shot.data, "base64"));
  }

  async function goto(urlPath) {
    await send("Page.navigate", { url: BASE + urlPath });
    await delay(1800);
    await dismissLocationIfPresent();
    await delay(1200);
  }

  // Warm origin so localStorage applies to the app host
  await send("Page.navigate", { url: BASE + "/?tile-layout-warm" });
  await delay(800);

  // Loading + loaded at desktop, then viewport matrix
  await seedPrefs(ALL_TILES);
  await goto("/?cb=tile-layout-capture");
  await shot("1440-loading-or-settling");
  await delay(2000);
  let m = await measureTiles();
  results.push({ label: "desktop-all", ...m });
  await shot("1440x1000-all-tiles");

  // Odd count
  await seedPrefs(ODD_TILES);
  await goto("/?cb=tile-layout-odd");
  await delay(800);
  m = await measureTiles();
  results.push({ label: "desktop-odd", ...m });
  await shot("1440x1000-odd-tiles");
  const astronomy = (m.tiles || []).find((t) => t.id === "ph-astronomy");
  if (astronomy && astronomy.ratio < 0.85) {
    failures.push("odd/desktop: Astronomy orphan not near full family width (" + astronomy.ratio + ")");
  }

  // Customize
  await seedPrefs(ALL_TILES);
  await goto("/#/customize");
  await delay(800);
  m = await measureTiles();
  results.push({ label: "customize", ...m });
  await shot("1440x1000-customize");
  if (m.comingSoon) failures.push("customize shows Coming Soon");

  for (const vp of VIEWPORTS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width <= 430
    });
    await seedPrefs(ALL_TILES);
    await goto("/?cb=tile-" + vp.name);
    await delay(800);
    m = await measureTiles();
    results.push({ label: vp.name, ...m });
    await shot(vp.name + "-loaded");

    if (m.comingSoon) failures.push(vp.name + ": Coming Soon visible");
    if (!m.tiles || !m.tiles.length) failures.push(vp.name + ": no tiles");

    if (vp.width <= 430) {
      for (const t of m.tiles || []) {
        if (t.ratio < 0.92) {
          failures.push(vp.name + ": tile " + t.id + " not full width (ratio " + t.ratio.toFixed(3) + ")");
        }
        if (/--(sm|half|compact)\b/.test(t.className)) {
          failures.push(vp.name + ": compact/half class on " + t.id);
        }
      }
    } else if (vp.width >= 1024) {
      // Single-tile families (Astronomy, Light) must fill their family row
      for (const t of m.tiles || []) {
        const familySingles = ["ph-astronomy", "ph-light"];
        if (familySingles.includes(t.id) && t.ratio < 0.85) {
          failures.push(vp.name + ": " + t.id + " orphan left gap (ratio " + t.ratio.toFixed(3) + ")");
        }
      }
    }
  }

  // Apps dashboard route smoke
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await seedPrefs(ALL_TILES);
  await goto("/apps/dashboard/?cb=tile-apps");
  await delay(800);
  m = await measureTiles();
  results.push({ label: "apps-dashboard-390", ...m });
  await shot("390-apps-dashboard");
  for (const t of m.tiles || []) {
    if (t.ratio < 0.92) failures.push("apps/dashboard tile not full width: " + t.id);
  }

  fs.writeFileSync(path.join(OUT, "measurements.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(OUT, "verification.json"),
    JSON.stringify({ failures, ok: failures.length === 0, tileCount: ALL_TILES.length }, null, 2)
  );

  ws.close();
  chrome.proc.kill("SIGTERM");

  console.log(JSON.stringify({ out: OUT, failures, sample: results.slice(0, 3) }, null, 2));
  if (failures.length) {
    console.error("FAIL", failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS tile layout browser verification");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
