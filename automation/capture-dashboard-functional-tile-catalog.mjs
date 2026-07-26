#!/usr/bin/env node
/**
 * Browser verification + screenshots for the functional tile catalog.
 * Usage: node automation/capture-dashboard-functional-tile-catalog.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9445);
const OUT = path.join(ROOT, "docs/rebuild-2026/dashboard-functional-tile-catalog");

const VIEWPORTS = [
  { name: "320x800", width: 320, height: 800 },
  { name: "360x800", width: 360, height: 800 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1440x1000", width: 1440, height: 1000 }
];

const CATEGORIES = [
  "weather",
  "photography",
  "astronomy",
  "air",
  "hiking",
  "water",
  "wildlife",
  "travel",
  "safety"
];

const ALL_TILES = [
  "ph-conditions", "ph-hourly", "ph-forecast", "ph-wind", "ph-precip",
  "ph-golden", "ph-blue", "ph-photo", "ph-sky", "ph-night-photo",
  "ph-sun", "ph-moon", "ph-dark-sky",
  "ph-air", "ph-uv", "ph-exposure",
  "ph-hiking-window", "ph-daylight-left", "ph-trail-estimate", "ph-pack",
  "ph-river", "ph-rainfall", "ph-flood",
  "ph-birding", "ph-wildlife-window", "ph-seasonal",
  "ph-driving", "ph-travel-window", "ph-place",
  "ph-alerts", "ph-risk", "ph-freeze"
];
const DEFAULT_TILES = [
  "ph-conditions", "ph-hourly", "ph-golden", "ph-sun", "ph-air",
  "ph-hiking-window", "ph-daylight-left", "ph-river", "ph-wildlife-window",
  "ph-alerts", "ph-risk"
];
const ODD_TILES = ["ph-conditions", "ph-hourly", "ph-wind", "ph-precip", "ph-forecast"];
const ONE_CATEGORY = ["ph-river", "ph-rainfall", "ph-flood"];

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-catalog-"));
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
  const consoleErrors = [];
  const networkUrls = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push((msg.params.args || []).map((a) => a.value || a.description || "").join(" "));
    }
    if (msg.method === "Network.requestWillBeSent") {
      networkUrls.push(msg.params.request.url);
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
  await send("Network.enable");
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

  async function measure() {
    const r = await send("Runtime.evaluate", {
      expression: `(() => {
        const grid = document.querySelector('[data-wdb-r-grid]');
        const tiles = [...document.querySelectorAll('.wdb-r-widget')];
        const gridW = grid ? grid.getBoundingClientRect().width : 0;
        const text = document.body.innerText || '';
        const groups = [...document.querySelectorAll('.wdb-r-catalog__group')];
        return {
          innerWidth: window.innerWidth,
          gridWidth: Math.round(gridW),
          familyCount: document.querySelectorAll('[data-wdb-r-family-grid]').length,
          catalogGroups: groups.map(g => ({
            category: g.getAttribute('data-category'),
            selected: Number(g.getAttribute('data-selected')),
            total: Number(g.getAttribute('data-total'))
          })),
          comingSoon: /coming soon/i.test(text),
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          tiles: tiles.map(t => {
            const r = t.getBoundingClientRect();
            const parent = t.closest('[data-wdb-r-family-grid]');
            const parentW = parent ? parent.getBoundingClientRect().width : gridW;
            return {
              id: t.getAttribute('data-widget-id'),
              size: t.getAttribute('data-size'),
              className: t.className,
              width: Math.round(r.width),
              height: Math.round(r.height),
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
    const s = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(s.data, "base64"));
  }

  async function goto(urlPath) {
    await send("Page.navigate", { url: BASE + urlPath });
    await delay(1800);
    await dismissLocationIfPresent();
    await delay(1200);
  }

  await send("Page.navigate", { url: BASE + "/?catalog-warm" });
  await delay(800);

  /* Default dashboard */
  await seedPrefs(DEFAULT_TILES);
  await goto("/?cb=catalog-default");
  await shot("1440x1000-default-loading");
  await delay(2200);
  let m = await measure();
  results.push({ label: "desktop-default", ...m });
  await shot("1440x1000-default");
  if (m.tiles.length !== DEFAULT_TILES.length) {
    failures.push(`default dashboard painted ${m.tiles.length} of ${DEFAULT_TILES.length} tiles`);
  }
  const loadingHeights = m.tiles.map((t) => t.height);

  /* All tiles selected */
  await seedPrefs(ALL_TILES);
  await goto("/?cb=catalog-all");
  await delay(2200);
  m = await measure();
  results.push({ label: "desktop-all", ...m });
  await shot("1440x1000-all-tiles");
  if (m.tiles.length !== ALL_TILES.length) {
    failures.push(`all-tiles view painted ${m.tiles.length} of ${ALL_TILES.length}`);
  }
  if (m.comingSoon) failures.push("all-tiles view shows Coming Soon");
  if (m.horizontalOverflow) failures.push("all-tiles view overflows horizontally");

  /* Odd tile count */
  await seedPrefs(ODD_TILES);
  await goto("/?cb=catalog-odd");
  await delay(1200);
  m = await measure();
  results.push({ label: "desktop-odd", ...m });
  await shot("1440x1000-odd-count");
  for (const t of m.tiles) {
    if (t.ratio < 0.3) failures.push(`odd count: ${t.id} collapsed (ratio ${t.ratio.toFixed(3)})`);
  }

  /* One category selected */
  await seedPrefs(ONE_CATEGORY);
  await goto("/?cb=catalog-one-category");
  await delay(1200);
  m = await measure();
  results.push({ label: "desktop-one-category", ...m });
  await shot("1440x1000-one-category");

  /* Partial data failure — block the air-quality provider only */
  await send("Network.setBlockedURLs", { urls: ["*air-quality-api.open-meteo.com*"] });
  await seedPrefs(DEFAULT_TILES);
  await goto("/?cb=catalog-partial");
  await delay(2200);
  m = await measure();
  results.push({ label: "desktop-partial-failure", ...m });
  await shot("1440x1000-partial-data-failure");
  if (m.tiles.length !== DEFAULT_TILES.length) {
    failures.push("partial failure dropped tiles from the workspace");
  }
  await send("Network.setBlockedURLs", { urls: [] });

  /* Customization interface — desktop */
  await seedPrefs(DEFAULT_TILES);
  await goto("/#/customize");
  await delay(1400);
  m = await measure();
  results.push({ label: "desktop-customize", ...m });
  await shot("1440x1000-customize");
  if (m.comingSoon) failures.push("customize shows Coming Soon");
  const seenCats = (m.catalogGroups || []).map((g) => g.category);
  for (const cat of CATEGORIES) {
    if (!seenCats.includes(cat)) failures.push("customize missing category group: " + cat);
  }
  if ((m.catalogGroups || []).some((g) => g.total === 0 && g.category !== "favorites")) {
    failures.push("customize has an empty category group");
  }

  /* Each category section, scrolled into view */
  for (const cat of CATEGORIES) {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const g = document.querySelector('.wdb-r-catalog__group[data-category="${cat}"]');
        if (g) g.scrollIntoView({ block: 'start' });
        return !!g;
      })()`,
      returnByValue: true
    });
    await delay(350);
    await shot("1440x1000-customize-category-" + cat);
  }

  /* Select-all then clear on one category */
  const bulk = await send("Runtime.evaluate", {
    expression: `(() => {
      const g = document.querySelector('.wdb-r-catalog__group[data-category="wildlife"]');
      if (!g) return { ok: false };
      g.querySelector('[data-wdb-r-action="category-enable-all"]').click();
      return { ok: true };
    })()`,
    returnByValue: true
  });
  await delay(700);
  await shot("1440x1000-customize-select-all-wildlife");
  if (!bulk.result.value.ok) failures.push("category select-all control missing");

  /* Customization interface — mobile */
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await seedPrefs(DEFAULT_TILES);
  await goto("/#/customize");
  await delay(1400);
  m = await measure();
  results.push({ label: "mobile-customize", ...m });
  await shot("390x844-customize");
  if (m.horizontalOverflow) failures.push("mobile customize overflows horizontally");

  /* Viewport matrix */
  for (const vp of VIEWPORTS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width <= 430
    });
    await seedPrefs(ALL_TILES);
    await goto("/?cb=catalog-" + vp.name);
    await delay(1400);
    m = await measure();
    results.push({ label: vp.name, ...m });
    await shot(vp.name + "-all-tiles");

    if (m.comingSoon) failures.push(vp.name + ": Coming Soon visible");
    if (!m.tiles.length) failures.push(vp.name + ": no tiles painted");
    if (m.horizontalOverflow) failures.push(vp.name + ": horizontal overflow");

    if (vp.width <= 430) {
      for (const t of m.tiles) {
        if (t.ratio < 0.92) {
          failures.push(`${vp.name}: tile ${t.id} not full width (ratio ${t.ratio.toFixed(3)})`);
        }
        if (/--(sm|half|compact)\b/.test(t.className)) {
          failures.push(`${vp.name}: legacy compact class on ${t.id}`);
        }
      }
    }
  }

  /* /apps/dashboard/ parity */
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await seedPrefs(ALL_TILES);
  await goto("/apps/dashboard/?cb=catalog-apps");
  await delay(1600);
  m = await measure();
  results.push({ label: "apps-dashboard-390", ...m });
  await shot("390x844-apps-dashboard");
  if (m.tiles.length !== ALL_TILES.length) {
    failures.push(`/apps/dashboard/ painted ${m.tiles.length} of ${ALL_TILES.length} tiles`);
  }
  for (const t of m.tiles) {
    if (t.ratio < 0.92) failures.push("apps/dashboard tile not full width: " + t.id);
  }

  /* Duplicate-request check across the shared payload */
  const dataUrls = networkUrls.filter((u) => /open-meteo|weather\.gov|waterservices\.usgs/.test(u));
  const dupes = {};
  dataUrls.forEach((u) => {
    dupes[u] = (dupes[u] || 0) + 1;
  });

  fs.writeFileSync(path.join(OUT, "measurements.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(OUT, "verification.json"),
    JSON.stringify(
      {
        ok: failures.length === 0,
        failures,
        tileCount: ALL_TILES.length,
        defaultCount: DEFAULT_TILES.length,
        categories: CATEGORIES.length,
        consoleErrors: consoleErrors.slice(0, 20),
        stableLoadingHeights: loadingHeights,
        upstreamRequestCounts: dupes
      },
      null,
      2
    )
  );

  ws.close();
  chrome.proc.kill("SIGTERM");

  console.log(JSON.stringify({ out: OUT, failures, consoleErrors: consoleErrors.slice(0, 5) }, null, 2));
  if (failures.length) {
    console.error("FAIL", failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS functional tile catalog browser verification");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
