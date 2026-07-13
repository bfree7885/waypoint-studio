#!/usr/bin/env node
/**
 * Headless Chrome smoke test — navigation / App Shell / structural readiness.
 *
 * Usage:
 *   node automation/smoke-browser.mjs [baseUrl]
 *
 * Env:
 *   CHROME_PATH           Chrome binary
 *   WAYPOINT_SMOKE_LIVE=1 Enable live weather/provider assertions (flaky in CI)
 *   WAYPOINT_SMOKE_ARTIFACTS=dir  Screenshot/log directory on failure
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8080").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9223);
const LIVE = process.env.WAYPOINT_SMOKE_LIVE === "1";
const ARTIFACT_DIR =
  process.env.WAYPOINT_SMOKE_ARTIFACTS ||
  path.join(ROOT, "automation", "artifacts", "smoke-" + Date.now());

const PAGES = [
  { name: "studio-home", path: "/", ready: "studio" },
  { name: "dashboard", path: "/apps/dashboard/", ready: "dashboard" },
  { name: "dashboard-redirect", path: "/dashboard.html", ready: "dashboard" },
  { name: "scenes", path: "/apps/scenes/", ready: "shell" },
  { name: "scenes-photo-coach", path: "/apps/scenes/photo-coach/", ready: "shell" },
  { name: "scenes-hidden-landscapes", path: "/apps/scenes/hidden-landscapes/", ready: "shell" },
  { name: "scenes-living-scenes", path: "/apps/scenes/living-scenes/", ready: "shell" },
  { name: "scenes-scene-builder", path: "/apps/scenes/scene-builder/", ready: "shell" },
  { name: "scenes-photographer-profile", path: "/apps/scenes/photographer-profile/", ready: "shell" },
  { name: "photo-coach", path: "/apps/photo-coach/", ready: "coach" },
  { name: "animal-vision", path: "/apps/animal-vision/", ready: "shell" },
  { name: "hidden-landscapes", path: "/apps/hidden-landscapes/", ready: "shell" },
  { name: "kiosk", path: "/kiosk.html", ready: "kiosk", live: true },
  { name: "status", path: "/status.html", ready: "status" },
  { name: "debug", path: "/debug.html", ready: "debug" },
  { name: "foragecast", path: "/apps/foragecast/", ready: "shell" },
  { name: "foragecast-property", path: "/apps/foragecast/property.html", ready: "shell" },
  { name: "foragecast-setup", path: "/apps/foragecast/property-setup.html", ready: "shell" },
  { name: "fieldry", path: "/apps/fieldry/", ready: "shell" },
  { name: "waypoint-scenes", path: "/apps/waypoint-scenes/", ready: "any" },
  { name: "photo-coach-profile", path: "/apps/photo-coach/profile/", ready: "shell" },
  { name: "sheds", path: "/apps/shed-hunting/", ready: "shell" },
  { name: "steepleaf", path: "/apps/steepleaf/", ready: "shell" },
  { name: "signalterrain", path: "/apps/signalterrain/", ready: "shell" },
  { name: "savant", path: "/apps/savant-sommelier/", ready: "shell" },
  { name: "terrainbound-redirect", path: "/apps/terrainbound/", ready: "shell" },
  { name: "species-profile", path: "/design-system/species/profile.html", ready: "any" }
];

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

async function waitForHttp(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else reject(new Error("bad status"));
        }).on("error", reject);
      });
      return;
    } catch (_) {
      await delay(250);
    }
  }
  throw new Error("Server not ready: " + url);
}

async function startChrome() {
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${CDP_PORT}`,
      "about:blank"
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  let stderr = "";
  proc.stderr.on("data", (c) => {
    stderr += String(c);
  });
  for (let i = 0; i < 40; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl, stderr: () => stderr };
    } catch (_) { /* retry */ }
  }
  proc.kill("SIGTERM");
  throw new Error("No page CDP target. Chrome stderr: " + stderr.slice(0, 500));
}

async function cdp(wsUrl) {
  const WebSocket = (await import("ws")).default;
  let id = 0;
  const pending = new Map();
  const handlers = [];
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.on("open", res);
    ws.on("error", rej);
  });
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      handlers.forEach((h) => h(msg));
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  function on(handler) {
    handlers.push(handler);
  }
  async function close() {
    try {
      ws.close();
    } catch (_) { /* noop */ }
  }
  return { send, on, close };
}

function readyExpression(kind) {
  if (kind === "studio") {
    return `(() => {
      const cards = document.querySelectorAll('.was-home__card').length;
      const shell = !!document.querySelector('[data-was-global], .was-global, #was-apps-btn, .was-apps-btn');
      const home = !!document.querySelector('.was-home, #was-home-apps, [data-product="studio-home"]');
      return { ok: shell && home && cards >= 6, cards: cards, shell: shell };
    })()`;
  }
  if (kind === "shell") {
    return `(() => {
      const shell = !!document.querySelector('[data-was-global], .was-global, #was-apps-btn, .was-apps-btn, [data-wds-app-shell]');
      const local = !!document.querySelector('.was-local__nav, [data-was-local]');
      return { ok: shell, shell: shell, local: local };
    })()`;
  }
  if (kind === "dashboard") {
    return `(() => {
      const shell = !!document.querySelector('[data-was-global], .was-global, #was-apps-btn, .was-apps-btn');
      const local = !!document.querySelector('.was-local__nav');
      const main = !!document.querySelector('#main, #wds-content-engine, #outdoor-dashboard');
      const dash = !!document.querySelector('#outdoor-dashboard, .wdb-doc, #wds-content-engine');
      return { ok: shell && local && main, shell: shell, local: local, dash: dash };
    })()`;
  }
  if (kind === "coach") {
    return `(() => {
      const shell = !!document.querySelector('[data-was-global], .was-global, #was-apps-btn, .was-apps-btn, [data-wds-app-shell]');
      const coach = !!document.querySelector('.mode-coach, #coach-dashboard, #coach-drop-zone');
      return { ok: shell && coach, shell: shell, coach: coach };
    })()`;
  }
  if (kind === "kiosk") {
    return `(() => {
      const boot = window.__WAYPOINT_KIOSK_BOOT_DONE__ === true;
      const loc = (document.getElementById('swk-location') || {}).textContent || '';
      const notLocating = loc !== 'Locating…';
      return { ok: boot && notLocating, boot: boot, notLocating: notLocating };
    })()`;
  }
  if (kind === "status") {
    return `(() => ({ ok: /live engine/i.test(document.title || '') }))()`;
  }
  if (kind === "debug") {
    return `(() => ({ ok: /debug/i.test(document.title || '') }))()`;
  }
  return `(() => ({ ok: !!(document.body && document.body.innerText && document.body.innerText.length > 20) }))()`;
}

async function waitReady(client, kind, timeoutMs) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    const { result } = await client.send("Runtime.evaluate", {
      expression: readyExpression(kind),
      returnByValue: true
    });
    last = result.value || {};
    if (last.ok) return last;
    await delay(300);
  }
  return last || { ok: false };
}

async function captureFailure(client, name, serverLog) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  try {
    const shot = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, name + ".png"), Buffer.from(shot.data, "base64"));
  } catch (_) { /* noop */ }
  try {
    const { result } = await client.send("Runtime.evaluate", {
      expression: `({ href: location.href, title: document.title, html: document.documentElement.outerHTML.slice(0, 20000) })`,
      returnByValue: true
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, name + ".json"), JSON.stringify(result.value || {}, null, 2));
  } catch (_) { /* noop */ }
  if (serverLog) {
    fs.writeFileSync(path.join(ARTIFACT_DIR, "server.log"), serverLog);
  }
}

async function testPage(client, page, bag) {
  bag.errors.length = 0;
  bag.warnings.length = 0;
  bag.failedNet.length = 0;

  if (page.name === "kiosk" || page.name === "dashboard") {
    try {
      await client.send("Browser.grantPermissions", {
        origin: new URL(BASE).origin,
        permissions: ["geolocation"]
      });
    } catch (_) { /* noop */ }
    try {
      await client.send("Emulation.setGeolocationOverride", {
        latitude: 41.3312,
        longitude: -75.038,
        accuracy: 100
      });
    } catch (_) { /* noop */ }
  }

  await client.send("Page.navigate", { url: BASE + page.path });

  if (page.name === "dashboard") {
    await delay(800);
    await client.send("Runtime.evaluate", {
      expression: `(() => { const btn = document.getElementById('wds-loc-default'); if (btn) btn.click(); return !!btn; })()`,
      returnByValue: true
    });
  }

  const timeout =
    page.ready === "dashboard" || page.ready === "kiosk"
      ? LIVE
        ? 45000
        : 20000
      : page.ready === "studio" || page.ready === "coach"
        ? 15000
        : 12000;

  const ready = await waitReady(client, page.ready, timeout);

  if (LIVE && page.name === "dashboard") {
    for (let i = 0; i < 20; i++) {
      const { result } = await client.send("Runtime.evaluate", {
        expression: `({
          notices: document.querySelectorAll('.wdb-doc__notice').length,
          busy: document.querySelectorAll('[aria-busy="true"]').length,
          hydrated: !!(window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast && WDS.outdoorIntelligence.getLast() && WDS.outdoorIntelligence.getLast().meta && WDS.outdoorIntelligence.getLast().meta.hydratedAt)
        })`,
        returnByValue: true
      });
      const v = result.value || {};
      if ((v.notices || 0) >= 8 && v.hydrated && (v.busy || 0) === 0) break;
      await delay(1000);
    }
  }

  const { result } = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const doc = document.documentElement;
      const trusts = Array.from(document.querySelectorAll('.wdb-doc__trust')).map(el => (el.textContent || '').trim());
      const domains = Array.from(document.querySelectorAll('.wdb-doc__domain')).map(el => (el.textContent || '').trim().toLowerCase());
      const pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast ? WDS.outdoorIntelligence.getLast() : null;
      const text = (document.body && document.body.innerText || '').toLowerCase();
      const locationLabel = (document.getElementById('swk-location') || {}).textContent || '';
      return {
        title: document.title,
        hasMain: !!document.querySelector('#main, main, .ws-app, .was-shell'),
        hasAppShell: !!document.querySelector('[data-was-global], .was-global, #was-apps-btn, .was-apps-btn'),
        hasAppsLauncher: !!document.querySelector('#was-apps-btn, .was-apps-btn'),
        hasStudioHome: !!document.querySelector('.was-home, #was-home-apps'),
        studioAppCards: document.querySelectorAll('.was-home__card').length,
        hasLocalNav: !!document.querySelector('.was-local__nav'),
        hasDashboard: !!document.querySelector('#outdoor-dashboard'),
        hasBriefingDoc: !!document.querySelector('.wdb-doc'),
        noticeCount: document.querySelectorAll('.wdb-doc__notice').length,
        noticeDomains: domains,
        noticeTrusts: trusts,
        busyCount: document.querySelectorAll('[aria-busy="true"]').length,
        missionCards: document.querySelectorAll('.wdb-missions__card').length,
        eduBadgeEdu: Array.from(document.querySelectorAll('.wdb-edu-fallback__badge')).filter(el => /Educational/i.test(el.textContent || '')).length,
        hydrated: !!(pkg && pkg.meta && pkg.meta.hydratedAt),
        hasLiveUpdated: !!document.querySelector('[data-wds-live-updated], .wdb-doc__last-updated, .wdb-live-updated'),
        liveFeedSource: (function () {
          var el = document.querySelector('[data-wds-live-updated]');
          return el ? el.getAttribute('data-source') : null;
        })(),
        hasKansasRiverLeak: /BURR OAK|\\bKS\\b.*gauge|WHITE ROCK C/i.test(document.body ? document.body.innerText : ''),
        sunriseText: (function () {
          var el = document.querySelector('.wsky-time__value');
          return el ? el.textContent.trim() : '';
        })(),
        sunsetText: (function () {
          var nodes = document.querySelectorAll('.wsky-time__value');
          return nodes.length > 1 ? nodes[1].textContent.trim() : '';
        })(),
        hasCoach: !!document.querySelector('.mode-coach, #coach-dashboard, #coach-drop-zone'),
        hasScenesNav: !!document.querySelector('a[href*="apps/scenes"], a[href*="../scenes"], .was-home__card'),
        hasPhotoCoachNav: !!document.querySelector('a[href*="photo-coach"]'),
        currentPath: location.pathname,
        hScroll: doc.scrollWidth > doc.clientWidth + 1,
        bodyLen: document.body ? document.body.innerText.length : 0,
        bootDone: window.__WAYPOINT_KIOSK_BOOT_DONE__ === true,
        notLocating: locationLabel !== 'Locating…',
        hasResolvedLocation: !!(locationLabel && locationLabel !== 'Locating…' && locationLabel !== 'Location unavailable'),
        hasTemp: (document.getElementById('swk-temp') || {}).textContent !== '—',
        hasConditions: !/loading/i.test((document.getElementById('swk-conditions') || {}).textContent || ''),
        hasUpdated: (document.getElementById('swk-updated') || {}).textContent !== '—',
        hasHourly: document.querySelectorAll('.swk-hour').length >= 1,
        hasModules: document.querySelectorAll('.swk-module').length >= 1,
        hasSynthwaveBrand: /waypoint studio/i.test(text),
        banned: ['coming soon','assignment','homework','lesson','educational'].filter((w) => text.includes(w))
      };
    })()`,
    returnByValue: true
  });

  return {
    name: page.name,
    url: BASE + page.path,
    ready,
    errors: [...new Set(bag.errors)],
    warnings: [...new Set(bag.warnings)].filter((w) => !/DevTools|favicon/i.test(w)),
    failedNet: bag.failedNet.filter((f) => !/favicon/i.test(f.url || "")),
    checks: result.value || {}
  };
}

async function main() {
  let chrome;
  let client;
  let failed = false;
  const results = [];
  const bag = {
    errors: [],
    warnings: [],
    failedNet: [],
    requestIds: new Map()
  };

  try {
    await waitForHttp(BASE + "/");
    chrome = await startChrome();
    client = await cdp(chrome.wsUrl);
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Page.enable");
    await client.send("Network.enable");
    client.on((msg) => {
      if (msg.method === "Runtime.consoleAPICalled") {
        const type = msg.params.type;
        const text = (msg.params.args || [])
          .map((a) => a.value ?? a.description ?? "")
          .join(" ");
        if (type === "error") bag.errors.push(text);
        else if (type === "warning") bag.warnings.push(text);
      }
      if (msg.method === "Runtime.exceptionThrown") {
        const det = msg.params.exceptionDetails || {};
        const desc = det.exception && det.exception.description ? det.exception.description : "";
        bag.errors.push((det.text || "Uncaught exception") + (desc ? " :: " + desc : ""));
      }
      if (msg.method === "Network.requestWillBeSent") {
        bag.requestIds.set(msg.params.requestId, msg.params.request.url);
      }
      if (msg.method === "Network.loadingFailed") {
        bag.failedNet.push({
          url: bag.requestIds.get(msg.params.requestId) || msg.params.requestId,
          errorText: msg.params.errorText,
          type: msg.params.type
        });
      }
    });

    for (const page of PAGES) {
      const r = await testPage(client, page, bag);
      results.push(r);
      if (!r.ready || !r.ready.ok || r.errors.length) {
        await captureFailure(client, r.name);
      }
    }
  } finally {
    if (client) await client.close();
    if (chrome) chrome.proc.kill("SIGTERM");
  }

  for (const r of results) {
    console.log(`\n=== ${r.name} (${r.url}) ===`);
    console.log("Ready:", JSON.stringify(r.ready));
    console.log("Checks:", JSON.stringify(r.checks));
    if (r.errors.length) {
      failed = true;
      console.log("Console ERRORS:");
      r.errors.forEach((e) => console.log("  -", e));
    } else {
      console.log("Console errors: none");
    }
    if (r.failedNet.length) {
      console.log("Failed network:", r.failedNet.slice(0, 5).map((f) => f.url + " (" + f.errorText + ")").join(" | "));
    }
    if (r.warnings.length) {
      console.log("Warnings:", r.warnings.slice(0, 5).join(" | "));
    }

    if (!r.ready || !r.ready.ok) {
      failed = true;
      console.log("FAIL: readiness timeout for " + r.name);
    }
    if (r.checks.hScroll) {
      failed = true;
      console.log("FAIL: horizontal overflow on " + r.name);
    }

    if (r.name === "studio-home") {
      if (!r.checks.hasStudioHome) { failed = true; console.log("FAIL: Studio home missing"); }
      if ((r.checks.studioAppCards || 0) < 6) { failed = true; console.log("FAIL: Studio app cards < 6"); }
      if (!r.checks.hasAppsLauncher) { failed = true; console.log("FAIL: Apps launcher missing"); }
      if (r.checks.hasDashboard) { failed = true; console.log("FAIL: Dashboard on Studio home"); }
    }
    if (r.name === "dashboard-redirect" && !/\/apps\/dashboard\//.test(r.checks.currentPath || "")) {
      if ((r.checks.bodyLen || 0) < 1) {
        failed = true;
        console.log("FAIL: dashboard.html redirect broken");
      }
    }
    if (r.name === "dashboard") {
      if (!r.checks.hasAppShell || !r.checks.hasLocalNav) {
        failed = true;
        console.log("FAIL: Dashboard App Shell / local nav missing");
      }
      if (r.checks.hasKansasRiverLeak) {
        failed = true;
        console.log("FAIL: Kansas river gauge text leaked into dashboard");
      }
      if ((r.checks.missionCards || 0) > 0) {
        failed = true;
        console.log("FAIL: mission cards must not appear");
      }
      if ((r.checks.eduBadgeEdu || 0) > 0) {
        failed = true;
        console.log("FAIL: educational badges present");
      }
      if (LIVE) {
        if (!r.checks.hasDashboard) { failed = true; console.log("FAIL: outdoor-dashboard missing"); }
        if (!r.checks.hasBriefingDoc) { failed = true; console.log("FAIL: briefing missing"); }
        if ((r.checks.noticeCount || 0) < 8) { failed = true; console.log("FAIL: noticeCount < 8"); }
        if (!r.checks.hydrated) { failed = true; console.log("FAIL: OIP not hydrated"); }
        if ((r.checks.busyCount || 0) > 0) { failed = true; console.log("FAIL: aria-busy remains"); }
        if (!r.checks.hasLiveUpdated) { failed = true; console.log("FAIL: live updated missing"); }
        if (r.checks.liveFeedSource && r.checks.liveFeedSource !== "user-oip") {
          failed = true;
          console.log("FAIL: live feed source not user-oip");
        }
        const required = ["current", "forecast", "alerts", "aqi", "sun", "moon", "water", "radar", "readiness"];
        const missing = required.filter((d) => !(r.checks.noticeDomains || []).includes(d));
        if (missing.length) { failed = true; console.log("FAIL: missing domains " + missing.join(", ")); }
        if (Array.isArray(r.checks.noticeTrusts)) {
          const bad = r.checks.noticeTrusts.filter((t) => !/^(Live|Estimated|Unavailable)$/i.test(t));
          if (bad.length) { failed = true; console.log("FAIL: bad trusts " + bad.join(", ")); }
        }
        if (r.checks.sunriseText === "1:34 AM" || r.checks.sunsetText === "4:33 PM") {
          failed = true;
          console.log("FAIL: sunrise/sunset regression times");
        }
      }
    }
    if ((r.name === "scenes" || r.name === "fieldry") && !r.checks.hasAppShell) {
      failed = true;
      console.log("FAIL: App Shell missing on " + r.name);
    }
    if ((r.name === "scenes" || r.name === "fieldry") && !r.checks.hasLocalNav) {
      failed = true;
      console.log("FAIL: local nav missing on " + r.name);
    }
    if (r.name === "scenes" && (r.checks.bodyLen < 100 || !/Waypoint Scenes/i.test(r.checks.title || ""))) {
      failed = true;
      console.log("FAIL: Scenes hub incomplete");
    }
    if (r.name === "photo-coach" && (!r.checks.hasCoach || r.checks.bodyLen < 100)) {
      failed = true;
      console.log("FAIL: Photo Coach incomplete");
    }
    if (r.name === "hidden-landscapes" && (r.checks.bodyLen < 100 || !/Hidden Landscapes/i.test(r.checks.title || ""))) {
      failed = true;
      console.log("FAIL: Hidden Landscapes studio incomplete");
    }
    if (r.name === "waypoint-scenes" && r.checks.bodyLen < 50) {
      failed = true;
      console.log("FAIL: waypoint-scenes blank");
    }
    if (r.name === "status" && !/live engine/i.test(r.checks.title || "")) {
      failed = true;
      console.log("FAIL: status title");
    }
    if (r.name === "debug" && !/debug/i.test(r.checks.title || "")) {
      failed = true;
      console.log("FAIL: debug title");
    }
    if (r.name === "kiosk") {
      if (!r.checks.bootDone || !r.checks.notLocating) {
        failed = true;
        console.log("FAIL: kiosk boot/location");
      }
      if (r.checks.hasKansasRiverLeak) {
        failed = true;
        console.log("FAIL: Kansas leak on kiosk");
      }
      if ((r.checks.banned || []).length) {
        failed = true;
        console.log("FAIL: banned text on kiosk");
      }
      if (LIVE) {
        if (r.checks.hasResolvedLocation && !r.checks.hasTemp) { failed = true; console.log("FAIL: kiosk temp"); }
        if (!r.checks.hasConditions) { failed = true; console.log("FAIL: kiosk conditions"); }
        if (!r.checks.hasUpdated) { failed = true; console.log("FAIL: kiosk updated"); }
        if (r.checks.hasResolvedLocation && !r.checks.hasHourly) { failed = true; console.log("FAIL: kiosk hourly"); }
        if (!r.checks.hasModules) { failed = true; console.log("FAIL: kiosk modules"); }
        if (!r.checks.hasSynthwaveBrand) { failed = true; console.log("FAIL: kiosk brand"); }
      }
    }
  }

  if (failed) {
    console.log("\nArtifacts:", ARTIFACT_DIR);
  }
  console.log(failed ? "\nSMOKE: FAIL" : "\nSMOKE: PASS");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("Smoke runner error:", e.message);
  process.exit(2);
});
