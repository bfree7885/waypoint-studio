#!/usr/bin/env node
/**
 * Mobile layout checks — portrait and landscape (~320–1440px wide).
 * Prefers Playwright from audits/live-site-qa; falls back to CDP + ws.
 * Usage: node automation/mobile-layout.mjs [baseUrl]
 * Env: MOBILE_LAYOUT_FULL=1 for full matrix; default is a fast critical set.
 */
import { spawn } from "child_process";
import http from "http";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";
import { setTimeout as delay } from "timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIT = path.join(ROOT, "audits/live-site-qa");
const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/chromium-browser";
const PORT = 9225;
const FULL = process.env.MOBILE_LAYOUT_FULL === "1";

const VIEWPORTS_FULL = [
  { name: "w320", width: 320, height: 568 },
  { name: "w375", width: 375, height: 667 },
  { name: "w390", width: 390, height: 844 },
  { name: "w430", width: 430, height: 932 },
  { name: "w768", width: 768, height: 1024 },
  { name: "w1024", width: 1024, height: 768 },
  { name: "w1440", width: 1440, height: 900 },
  { name: "iphone-landscape", width: 844, height: 390 }
];
const VIEWPORTS_FAST = [
  { name: "w320", width: 320, height: 568 },
  { name: "w390", width: 390, height: 844 },
  { name: "w768", width: 768, height: 1024 },
  { name: "w1440", width: 1440, height: 900 }
];

const PAGES_FULL = [
  { name: "studio-home", path: "/", waitMs: 2500 },
  { name: "about", path: "/about.html", waitMs: 1500 },
  { name: "contact", path: "/contact.html", waitMs: 1500 },
  { name: "knowledge", path: "/knowledge.html", waitMs: 2500 },
  { name: "support", path: "/support.html", waitMs: 1500 },
  { name: "settings", path: "/settings.html", waitMs: 1500 },
  { name: "dashboard", path: "/apps/dashboard/", waitMs: 8000 },
  { name: "kiosk", path: "/kiosk.html", waitMs: 5000 },
  { name: "status", path: "/status.html", waitMs: 2500 },
  { name: "scenes", path: "/apps/scenes/", waitMs: 2500 },
  { name: "photo-coach", path: "/apps/photo-coach/", waitMs: 5000 },
  { name: "support", path: "/support.html", waitMs: 1500 },
  { name: "deck", path: "/side-trails/waypoint-deck/", waitMs: 1500 },
];
const PAGES_FAST = [
  { name: "studio-home", path: "/", waitMs: 2500 },
  { name: "contact", path: "/contact.html", waitMs: 1500 },
  { name: "knowledge", path: "/knowledge.html", waitMs: 2500 },
  { name: "dashboard", path: "/apps/dashboard/", waitMs: 8000 },
  { name: "scenes", path: "/apps/scenes/", waitMs: 2500 },
  { name: "deck", path: "/side-trails/waypoint-deck/", waitMs: 1500 }
];

const VIEWPORTS = FULL ? VIEWPORTS_FULL : VIEWPORTS_FAST;
const PAGES = FULL ? PAGES_FULL : PAGES_FAST;

const LAYOUT_PROBE = `(() => {
  const doc = document.documentElement;
  const panels = Array.from(document.querySelectorAll(
    '.swk-panel, .wdb-widget, .wdb-section, .wle-card, .swk-topbar, .swk-statusbar, .wdb-brief, .wdb-doc, .pc-section, .pc-card, .pc-nav, .scenes-feature, .coach-dashboard, .coach-drop-zone, .mode-coach, .was-home__card, .wcs-page, .wk-card'
  ));
  const overlaps = [];
  for (let i = 0; i < panels.length; i++) {
    const a = panels[i].getBoundingClientRect();
    if (a.width < 1 || a.height < 1) continue;
    for (let j = i + 1; j < panels.length; j++) {
      const b = panels[j].getBoundingClientRect();
      if (b.width < 1 || b.height < 1) continue;
      if (a.bottom > b.top + 2 && b.bottom > a.top + 2 &&
          a.right > b.left + 2 && b.right > a.left + 2 &&
          !(panels[i].contains(panels[j]) || panels[j].contains(panels[i]))) {
        overlaps.push(panels[i].className + ' vs ' + panels[j].className);
      }
    }
  }
  const nodes = Array.from(document.querySelectorAll(
    "a, button, .wds-btn, .was-apps-btn, .wcs-pill-row a, input, select, textarea"
  ));
  let small = 0;
  for (const n of nodes) {
    const r = n.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.height < 40 && r.width < 40) small += 1;
  }
  return {
    hScroll: doc.scrollWidth > doc.clientWidth + 1,
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    overlapCount: overlaps.length,
    overlaps: overlaps.slice(0, 5),
    smallTargets: small
  };
})()`;

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

async function loadPlaywright() {
  try {
    const require = createRequire(path.join(AUDIT, "package.json"));
    try {
      return (await import(pathToFileURL(path.join(AUDIT, "node_modules/playwright/index.mjs")).href)).chromium;
    } catch {
      return require("playwright").chromium;
    }
  } catch {
    return null;
  }
}

async function runWithPlaywright(chromium) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined
  });
  const results = [];
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.width <= 430,
        hasTouch: viewport.width <= 430
      });
      for (const route of PAGES) {
        await page.goto(BASE + route.path, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(route.waitMs);
        const layout = await page.evaluate(LAYOUT_PROBE);
        results.push({
          viewport: viewport.name,
          page: route.name,
          url: BASE + route.path,
          layout
        });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function startChrome() {
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--disable-extensions", "--disable-dev-shm-usage",
    `--remote-debugging-port=${PORT}`, "about:blank"
  ], { stdio: "ignore" });
  for (let i = 0; i < 20; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) { /* retry */ }
  }
  throw new Error("Chrome CDP unavailable");
}

async function cdp(wsUrl) {
  const WebSocket = (await import("ws")).default;
  let id = 0;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  return { send, close: () => ws.close() };
}

async function testPage(client, page, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 3,
    mobile: viewport.width <= 430
  });
  await client.send("Page.navigate", { url: BASE + page.path });
  await delay(page.waitMs);
  const { result } = await client.send("Runtime.evaluate", {
    expression: LAYOUT_PROBE,
    returnByValue: true
  });
  return {
    viewport: viewport.name,
    page: page.name,
    url: BASE + page.path,
    layout: result.value || {}
  };
}

async function runWithCdp() {
  let chrome;
  let client;
  const results = [];
  try {
    chrome = await startChrome();
    client = await cdp(chrome.wsUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    for (const viewport of VIEWPORTS) {
      for (const page of PAGES) {
        results.push(await testPage(client, page, viewport));
      }
    }
  } finally {
    if (client) client.close();
    if (chrome) chrome.proc.kill("SIGTERM");
  }
  return results;
}

function report(results) {
  let failed = false;
  console.log(`Mobile layout test — ${BASE} (${FULL ? "full" : "fast"} matrix)\n`);
  for (const r of results) {
    const l = r.layout;
    const issues = [];
    if (l.hScroll) issues.push(`horizontal scroll (${l.scrollWidth}px > ${l.clientWidth}px)`);
    if (l.overlapCount > 0) issues.push(`${l.overlapCount} overlap(s): ${(l.overlaps || []).join("; ")}`);
    if (r.viewport.startsWith("w3") && (l.smallTargets || 0) > 12) {
      console.log(`  note: ${l.smallTargets} sub-40px interactive nodes on ${r.viewport}/${r.page}`);
    }
    const label = `${r.viewport} / ${r.page}`;
    console.log(`${label}: ${issues.length ? "FAIL — " + issues.join("; ") : "PASS"}`);
    if (issues.length) failed = true;
  }
  if (failed) process.exitCode = 1;
  else console.log("\nMOBILE LAYOUT: PASS");
}

async function main() {
  const chromium = await loadPlaywright();
  const results = chromium ? await runWithPlaywright(chromium) : await runWithCdp();
  report(results);
}

main().catch((err) => {
  console.error("mobile-layout failed:", err.message || err);
  process.exit(1);
});
