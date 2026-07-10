#!/usr/bin/env node
/**
 * Headless Chrome smoke test — captures console errors on key pages.
 * Usage: node automation/smoke-browser.mjs [baseUrl]
 */
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9223;
const PAGES = [
  { name: "homepage", path: "/", waitMs: 20000 },
  { name: "kiosk", path: "/kiosk.html", waitMs: 12000 },
  { name: "status", path: "/status.html", waitMs: 3000 },
  { name: "debug", path: "/debug.html", waitMs: 3000 },
  { name: "waypoint-scenes", path: "/apps/waypoint-scenes/", waitMs: 8000 },
  { name: "photo-coach", path: "/apps/photo-coach/", waitMs: 12000 }
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

async function startChrome() {
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 20; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) { /* retry */ }
  }
  throw new Error("No page CDP target");
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
    ws.close();
  }
  return { send, on, close };
}

async function testPage(client, page) {
  const errors = [];
  const warnings = [];
  client.on((msg) => {
    if (msg.method === "Runtime.consoleAPICalled") {
      const type = msg.params.type;
      const text = msg.params.args
        .map((a) => a.value ?? a.description ?? "")
        .join(" ");
      if (type === "error") errors.push(text);
      else if (type === "warning") warnings.push(text);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const det = msg.params.exceptionDetails || {};
      const desc = det.exception && det.exception.description ? det.exception.description : "";
      errors.push((det.text || "Uncaught exception") + (desc ? " :: " + desc : ""));
    }
  });

  await client.send("Page.navigate", { url: BASE + page.path });
  if (page.name === "homepage") {
    await delay(2500);
    // Production: location should already bootstrap without prompt.
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.getElementById('wds-loc-default');
        if (btn) btn.click();
        return !!btn;
      })()`,
      returnByValue: true
    });
    for (let i = 0; i < 16; i++) {
      await delay(1500);
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
    }
  } else if (page.name === "kiosk") {
    await delay(page.waitMs);
  } else {
    await delay(page.waitMs);
  }

  const kioskExpr = `(() => {
    const text = (document.body && document.body.innerText || '').toLowerCase();
  return {
    title: document.title,
    hasTemp: (document.getElementById('swk-temp') || {}).textContent !== '—',
    hasConditions: !/loading/i.test((document.getElementById('swk-conditions') || {}).textContent || ''),
    hasUpdated: (document.getElementById('swk-updated') || {}).textContent !== '—',
    hasHourly: document.querySelectorAll('.swk-hour').length >= 1,
    hasEngineBadge: /engine|healthy|degraded|stale|offline/i.test((document.getElementById('swk-health-badge') || {}).textContent || ''),
    hasModules: document.querySelectorAll('.swk-module').length >= 1,
    hasSynthwaveBrand: /waypoint live engine/i.test(text),
    banned: ['coming soon','assignment','homework','lesson','educational'].filter((w) => text.includes(w)),
    bodyLen: text.length
  };
})()`;

  const { result } = await client.send("Runtime.evaluate", {
    expression: page.name === "kiosk" ? kioskExpr : `(() => {
      const trusts = Array.from(document.querySelectorAll('.wdb-doc__trust')).map(el => (el.textContent || '').trim());
      const domains = Array.from(document.querySelectorAll('.wdb-doc__domain')).map(el => (el.textContent || '').trim().toLowerCase());
      const pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast ? WDS.outdoorIntelligence.getLast() : null;
      const tags = Array.from(document.querySelectorAll('.wdb-widget__tag')).map(el => (el.textContent || '').trim());
      return {
        title: document.title,
        hasMain: !!document.querySelector('#main, main, .ws-app'),
        hasDashboard: !!document.querySelector('#outdoor-dashboard'),
        hasBriefingDoc: !!document.querySelector('.wdb-doc'),
        hasMorning: !!document.querySelector('.wdb-morning'),
        hasPulse: !!document.querySelector('.wdb-morning__pulse'),
        morningAnswers: document.querySelectorAll('.wdb-morning__answer').length,
        natureCards: document.querySelectorAll('.wdb-nature__card').length,
        missionCards: document.querySelectorAll('.wdb-missions__card').length,
        photoCards: document.querySelectorAll('.wdb-photo-field__card').length,
        noticeCount: document.querySelectorAll('.wdb-doc__notice').length,
        noticeDomains: domains,
        noticeTrusts: trusts,
        widgetTags: tags,
        busyCount: document.querySelectorAll('[aria-busy="true"]').length,
        pendingEdu: document.querySelectorAll('.wdb-edu-fallback__pending').length,
        eduBadgeEdu: Array.from(document.querySelectorAll('.wdb-edu-fallback__badge')).filter(el => /Educational/i.test(el.textContent || '')).length,
        hydrated: !!(pkg && pkg.meta && pkg.meta.hydratedAt),
        blockStatus: pkg && pkg.meta && pkg.meta.blockStatus || null,
        ebirdStatus: pkg && pkg.ebird && pkg.ebird.status || null,
        ebirdCount: pkg && pkg.ebird && pkg.ebird.observations ? pkg.ebird.observations.length : 0,
        hasRecentBirdsCard: !!document.querySelector('#widget-recent-birds-nearby'),
        hasLiveUpdated: !!document.querySelector('[data-wds-live-updated], .wdb-doc__last-updated, .wdb-live-updated'),
        liveUpdatedText: (document.querySelector('.wdb-live-updated') || document.querySelector('.wdb-doc__last-updated') || {}).textContent || '',
        liveFeedSource: (function () {
          var el = document.querySelector('[data-wds-live-updated]');
          return el ? el.getAttribute('data-source') : null;
        })(),
        hasKansasRiverLeak: /BURR OAK|\\bKS\\b.*gauge|WHITE ROCK C/i.test(document.body ? document.body.innerText : ''),
        sunriseText: (function () {
          var el = document.querySelector('.wsky-time__value, .wdb-doc__stat-value, [data-widget-id="sun-moon-dashboard"] .wsky-time__value');
          return el ? el.textContent.trim() : '';
        })(),
        sunsetText: (function () {
          var nodes = document.querySelectorAll('.wsky-time__value');
          return nodes.length > 1 ? nodes[1].textContent.trim() : '';
        })(),
        locationContextId: (function () {
          var pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast ? WDS.outdoorIntelligence.getLast() : null;
          return pkg && pkg.daylight ? pkg.daylight.locationContextId : null;
        })(),
        hasCoach: !!document.querySelector('.mode-coach, #coach-upload, [data-mode="coach"]'),
        hasPcUpload: !!document.querySelector('#pc-drop'),
        hasOutdoorContext: !!document.querySelector('.coach-outdoor-context'),
        bodyLen: document.body ? document.body.innerText.length : 0
      };
    })()`,
    returnByValue: true
  });

  return {
    name: page.name,
    url: BASE + page.path,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)].filter((w) => !/DevTools|favicon/i.test(w)),
    checks: result.value || {}
  };
}

async function main() {
  let chrome;
  let client;
  const results = [];
  try {
    chrome = await startChrome();
    client = await cdp(chrome.wsUrl);
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Page.enable");
    for (const page of PAGES) {
      results.push(await testPage(client, page));
    }
  } finally {
    if (client) await client.close();
    if (chrome) chrome.proc.kill("SIGTERM");
  }

  let failed = false;
  for (const r of results) {
    console.log(`\n=== ${r.name} (${r.url}) ===`);
    console.log("Checks:", JSON.stringify(r.checks));
    if (r.errors.length) {
      failed = true;
      console.log("Console ERRORS:");
      r.errors.forEach((e) => console.log("  -", e));
    } else {
      console.log("Console errors: none");
    }
    if (r.warnings.length) {
      console.log("Warnings:", r.warnings.slice(0, 5).join(" | "));
    }
    if (r.name === "homepage" && !r.checks.hasDashboard) {
      failed = true;
      console.log("FAIL: outdoor-dashboard not rendered after location bootstrap");
    }
    if (r.name === "homepage" && !r.checks.hasBriefingDoc) {
      failed = true;
      console.log("FAIL: operational briefing document missing");
    }
    if (r.name === "homepage" && r.checks.noticeCount < 8) {
      failed = true;
      console.log("FAIL: expected ≥8 operational blocks, got " + r.checks.noticeCount);
    }
    if (r.name === "homepage" && !r.checks.hydrated) {
      failed = true;
      console.log("FAIL: OIP did not hydrate in first load cycle");
    }
    if (r.name === "homepage" && (r.checks.busyCount || 0) > 0) {
      failed = true;
      console.log("FAIL: dashboard still has aria-busy mounts (" + r.checks.busyCount + ")");
    }
    if (r.name === "homepage" && (r.checks.missionCards || 0) > 0) {
      failed = true;
      console.log("FAIL: mission cards must not appear on production dashboard");
    }
    if (r.name === "homepage" && (r.checks.eduBadgeEdu || 0) > 0) {
      failed = true;
      console.log("FAIL: educational fallback badges still present");
    }
    if (r.name === "homepage" && Array.isArray(r.checks.noticeTrusts)) {
      const bad = r.checks.noticeTrusts.filter((t) => !/^(Live|Estimated|Unavailable)$/i.test(t));
      if (bad.length) {
        failed = true;
        console.log("FAIL: notices must be Live/Estimated/Unavailable, found: " + bad.join(", "));
      }
    }
    const required = ["current", "forecast", "alerts", "aqi", "sun", "moon", "water", "radar", "readiness"];
    if (r.name === "homepage" && Array.isArray(r.checks.noticeDomains)) {
      const missing = required.filter((d) => !(r.checks.noticeDomains || []).includes(d));
      if (missing.length) {
        failed = true;
        console.log("FAIL: missing operational domains: " + missing.join(", "));
      }
    }
    if (r.name === "homepage" && !r.checks.hasLiveUpdated) {
      failed = true;
      console.log("FAIL: Last updated timestamp missing on dashboard");
    }
    if (r.name === "homepage" && r.checks.hasKansasRiverLeak) {
      failed = true;
      console.log("FAIL: Kansas river gauge text leaked into user dashboard");
    }
    if (r.name === "homepage" && r.checks.sunriseText === "1:34 AM") {
      failed = true;
      console.log("FAIL: sunrise regression time 1:34 AM rendered");
    }
    if (r.name === "homepage" && r.checks.sunsetText === "4:33 PM") {
      failed = true;
      console.log("FAIL: sunset regression time 4:33 PM rendered");
    }
    if (r.name === "homepage" && r.checks.liveFeedSource && r.checks.liveFeedSource !== "user-oip") {
      failed = true;
      console.log("FAIL: dashboard conditions source is not user-oip");
    }
    if (r.name === "photo-coach" && !r.checks.hasPcUpload) {
      failed = true;
      console.log("FAIL: Photo Coach upload zone missing");
    }
    if (r.name === "waypoint-scenes" && r.checks.bodyLen < 50) {
      failed = true;
      console.log("FAIL: scenes appears blank");
    }
    if (r.name === "status" && !/live engine/i.test(r.checks.title || "")) {
      failed = true;
      console.log("FAIL: status page title missing");
    }
    if (r.name === "debug" && !/debug/i.test(r.checks.title || "")) {
      failed = true;
      console.log("FAIL: debug page title missing");
    }
    if (r.name === "kiosk" && !r.checks.hasTemp) {
      failed = true;
      console.log("FAIL: kiosk temperature missing");
    }
    if (r.name === "kiosk" && !r.checks.hasConditions) {
      failed = true;
      console.log("FAIL: kiosk conditions missing");
    }
    if (r.name === "kiosk" && !r.checks.hasUpdated) {
      failed = true;
      console.log("FAIL: kiosk last updated label missing");
    }
    if (r.name === "kiosk" && !r.checks.hasHourly) {
      failed = true;
      console.log("FAIL: kiosk hourly strip missing");
    }
    if (r.name === "kiosk" && !r.checks.hasModules) {
      failed = true;
      console.log("FAIL: kiosk module status strip missing");
    }
    if (r.name === "kiosk" && !r.checks.hasSynthwaveBrand) {
      failed = true;
      console.log("FAIL: kiosk brand header missing");
    }
    if (r.name === "kiosk" && r.checks.hasKansasRiverLeak) {
      failed = true;
      console.log("FAIL: Kansas river gauge text leaked into kiosk user panels");
    }
    if (r.name === "kiosk" && (r.checks.banned || []).length) {
      failed = true;
      console.log("FAIL: kiosk banned text present: " + r.checks.banned.join(", "));
    }
  }

  console.log(failed ? "\nSMOKE: FAIL" : "\nSMOKE: PASS");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("Smoke runner error:", e.message);
  process.exit(2);
});
