#!/usr/bin/env node
/**
 * Browser evidence capture for the complete production audit.
 * Usage: node automation/audit-production-browser.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import https from "https";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "https://waypointstudio.org").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9455);
const OUT = path.join(ROOT, "docs/audits/evidence/2026-07/screenshots");
const JSON_OUT = path.join(ROOT, "docs/audits/evidence/2026-07/json");

const VIEWPORTS = [
  { name: "320x800", width: 320, height: 800, mobile: true },
  { name: "375x812", width: 375, height: 812, mobile: true },
  { name: "390x844", width: 390, height: 844, mobile: true },
  { name: "768x1024", width: 768, height: 1024, mobile: true },
  { name: "1440x1000", width: 1440, height: 1000, mobile: false },
  { name: "1920x1080", width: 1920, height: 1080, mobile: false }
];

const ROUTES = [
  { id: "home", path: "/", product: "dashboard" },
  { id: "dashboard-apps", path: "/apps/dashboard/", product: "dashboard" },
  { id: "dashboard-customize", path: "/#/customize", product: "dashboard" },
  { id: "scenes-hub", path: "/apps/scenes/", product: "scenes" },
  { id: "photo-coach", path: "/apps/photo-coach/", product: "scenes" },
  { id: "photo-library", path: "/apps/photo-library/", product: "scenes" },
  { id: "hidden-landscapes", path: "/apps/hidden-landscapes/", product: "scenes" },
  { id: "living-scenes", path: "/apps/scenes/living-scenes/", product: "scenes" },
  { id: "scene-builder", path: "/apps/scenes/scene-builder/", product: "scenes" },
  { id: "waypoint-scenes-legacy", path: "/apps/waypoint-scenes/", product: "scenes" },
  { id: "sheds-home", path: "/apps/shed-hunting/", product: "sheds" },
  { id: "sheds-map", path: "/apps/shed-hunting/map/", product: "sheds" },
  { id: "about", path: "/about.html", product: "platform" },
  { id: "contact", path: "/contact.html", product: "platform" },
  { id: "support", path: "/support.html", product: "platform" },
  { id: "privacy", path: "/privacy.html", product: "platform" },
  { id: "incubator", path: "/incubator/", product: "platform" },
  { id: "status", path: "/status.html", product: "platform" },
  { id: "debug", path: "/debug.html", product: "platform" }
];

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-audit-"));
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
      if (page) return { proc, page };
    } catch {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(JSON_OUT, { recursive: true });
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
  const failedRequests = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push({
        text: (msg.params.args || []).map((a) => a.value || a.description || "").join(" "),
        at: Date.now()
      });
    }
    if (msg.method === "Network.loadingFailed") {
      failedRequests.push({
        url: msg.params.requestId,
        errorText: msg.params.errorText,
        canceled: msg.params.canceled,
        at: Date.now()
      });
    }
    if (msg.method === "Network.responseReceived") {
      const s = msg.params.response.status;
      if (s >= 400) {
        failedRequests.push({
          url: msg.params.response.url,
          status: s,
          at: Date.now()
        });
      }
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

  const manifest = [];
  const routeFindings = [];

  async function seedLocation() {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const pike = ${JSON.stringify(PIKE)};
        try {
          localStorage.setItem('wds-location-v3', JSON.stringify(pike));
          localStorage.setItem('wds-location-v1', JSON.stringify(pike));
          localStorage.setItem('waypoint-location', JSON.stringify(pike));
          localStorage.setItem('wds-location-prompted', '1');
        } catch (e) {}
        const prompt = document.querySelector('#wds-location-prompt, .wds-location-prompt, [data-wds-location-prompt]');
        if (prompt) { prompt.setAttribute('hidden',''); prompt.style.display='none'; }
        return true;
      })()`,
      returnByValue: true
    });
  }

  async function measure() {
    const r = await send("Runtime.evaluate", {
      expression: `(() => {
        const text = document.body ? (document.body.innerText || '') : '';
        const tiles = [...document.querySelectorAll('.wdb-r-widget, [data-widget-id]')];
        const comingSoon = /coming soon|coming later/i.test(text);
        const unfinished = /future experience|early scene builder|not connected|incubator/i.test(text);
        const overflow = document.documentElement.scrollWidth > window.innerWidth + 2;
        const halfWidth = tiles.some(t => {
          const parent = t.closest('[data-wdb-r-family-grid], [data-wdb-r-grid], .wdb-r-workspace__grid') || document.body;
          const pw = parent.getBoundingClientRect().width;
          const tw = t.getBoundingClientRect().width;
          return pw > 0 && window.innerWidth <= 430 && tw / pw < 0.9;
        });
        return {
          title: document.title,
          url: location.href,
          width: window.innerWidth,
          height: window.innerHeight,
          tileCount: tiles.length,
          tileIds: tiles.map(t => t.getAttribute('data-widget-id')).filter(Boolean),
          comingSoon,
          unfinished,
          overflow,
          halfWidthMobile: halfWidth,
          hasCustomize: !!document.querySelector('[data-wdb-r-customize], a[href*="customize"], [data-wdb-r-action]') ,
          sampleText: text.slice(0, 400)
        };
      })()`,
      returnByValue: true
    });
    return r.result.value;
  }

  async function shot(name) {
    const s = await send("Page.captureScreenshot", { format: "png" });
    const file = name + ".png";
    fs.writeFileSync(path.join(OUT, file), Buffer.from(s.data, "base64"));
    return file;
  }

  // Warm + seed
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send("Page.navigate", { url: BASE + "/?warm=1" });
  await delay(1500);
  await seedLocation();

  // Primary routes at desktop + mobile
  for (const route of ROUTES) {
    for (const vp of [
      VIEWPORTS.find((v) => v.name === "1440x1000"),
      VIEWPORTS.find((v) => v.name === "390x844")
    ]) {
      const beforeErrors = consoleErrors.length;
      const beforeFails = failedRequests.length;
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });
      await send("Page.navigate", { url: BASE + route.path + (route.path.includes("?") ? "&" : "?") + "cb=" + Date.now() });
      await delay(2200);
      await seedLocation();
      await delay(1500);
      const m = await measure();
      const file = await shot(`${route.product}__${route.id}__${vp.name}`);
      manifest.push({
        file,
        product: route.product,
        route: route.id,
        path: route.path,
        viewport: vp.name,
        state: "loaded"
      });
      routeFindings.push({
        ...route,
        viewport: vp.name,
        measure: m,
        newConsoleErrors: consoleErrors.slice(beforeErrors),
        newFailedRequests: failedRequests.slice(beforeFails).slice(0, 10)
      });
    }
  }

  // Extra dashboard viewports for layout regression
  for (const vp of VIEWPORTS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile
    });
    await send("Page.navigate", { url: BASE + "/?cb=dash-" + vp.name });
    await delay(2000);
    await seedLocation();
    await delay(1200);
    const m = await measure();
    const file = await shot(`dashboard__home-matrix__${vp.name}`);
    manifest.push({ file, product: "dashboard", route: "home-matrix", path: "/", viewport: vp.name, state: "loaded" });
    if (vp.width <= 430 && m.halfWidthMobile) {
      routeFindings.push({
        id: "half-width-regression",
        path: "/",
        viewport: vp.name,
        measure: m,
        severity: "P1"
      });
    }
  }

  // Accessibility snapshot on home
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send("Page.navigate", { url: BASE + "/?a11y=1" });
  await delay(2500);
  const a11y = await send("Runtime.evaluate", {
    expression: `(() => {
      const issues = [];
      if (!document.documentElement.lang) issues.push('missing-html-lang');
      if (!document.title) issues.push('missing-title');
      const imgs = [...document.querySelectorAll('img')];
      imgs.forEach((img,i) => { if (!img.hasAttribute('alt')) issues.push('img-missing-alt:'+i); });
      const buttons = [...document.querySelectorAll('button')];
      buttons.forEach((b,i) => {
        const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
        if (!name) issues.push('button-empty-name:'+i);
      });
      const links = [...document.querySelectorAll('a')];
      links.forEach((a,i) => {
        const name = (a.getAttribute('aria-label') || a.textContent || '').trim();
        if (!name) issues.push('link-empty-name:'+i);
      });
      const h1 = document.querySelectorAll('h1').length;
      if (h1 === 0) issues.push('no-h1');
      if (h1 > 1) issues.push('multiple-h1:'+h1);
      return {
        issues: issues.slice(0, 50),
        landmarkCount: document.querySelectorAll('main,nav,header,footer,[role=main]').length,
        h1,
        buttonCount: buttons.length,
        linkCount: links.length
      };
    })()`,
    returnByValue: true
  });

  fs.writeFileSync(path.join(JSON_OUT, "screenshot-manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(JSON_OUT, "browser-route-findings.json"), JSON.stringify(routeFindings, null, 2));
  fs.writeFileSync(
    path.join(JSON_OUT, "browser-console-errors.json"),
    JSON.stringify(consoleErrors.slice(0, 100), null, 2)
  );
  fs.writeFileSync(
    path.join(JSON_OUT, "browser-failed-requests.json"),
    JSON.stringify(failedRequests.slice(0, 100), null, 2)
  );
  fs.writeFileSync(path.join(JSON_OUT, "a11y-home-snapshot.json"), JSON.stringify(a11y.result.value, null, 2));

  ws.close();
  chrome.proc.kill("SIGTERM");
  console.log(
    JSON.stringify(
      {
        screenshots: manifest.length,
        routes: ROUTES.length,
        consoleErrors: consoleErrors.length,
        failedRequests: failedRequests.length,
        a11yIssues: (a11y.result.value && a11y.result.value.issues) || []
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
