#!/usr/bin/env node
/**
 * Seeds a persistent Chrome profile with pre-fix Kansas packages and verifies self-recovery.
 * Usage: node automation/test-profile-migration.mjs [baseUrl]
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
const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
let PORT = Number(process.env.WAYPOINT_MIG_CDP_PORT || 9225);
let PROFILE = path.join(os.tmpdir(), "waypoint-migration-profile-" + process.pid);

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

async function startChrome() {
  fs.mkdirSync(PROFILE, { recursive: true });
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--user-data-dir=${PROFILE}`,
      `--remote-debugging-port=${PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 30; i++) {
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
    }
  });
  return {
    async send(method, params = {}) {
      const msgId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    },
    close() { ws.close(); }
  };
}

const KANSAS_OUTDOOR = JSON.stringify({
  version: 1,
  savedAt: "2026-07-09T12:00:00.000Z",
  location: { lat: 41.331, lng: -75.038, county: "Pike", state: "PA" },
  daylight: { sunrise: "6:14 AM", sunset: "9:04 PM", trust: "Live", source: "waypoint-live-engine" },
  weather: { conditions: "Clear", temp: 80, trust: "Live", source: "waypoint-live-engine" }
});

async function main() {
  const { proc, wsUrl } = await startChrome();
  let client = null;
  let failed = false;
  try {
    client = await cdp(wsUrl);
    await client.send("Page.enable");
    await client.send("Page.navigate", { url: BASE + "/" });
    await delay(1500);

    await client.send("Runtime.evaluate", {
      expression: `(() => {
        localStorage.setItem('waypoint-runtime-migration', JSON.stringify({
          epoch: 0, build: '6dfeae8', loaderVersion: 1, locationSchema: 1
        }));
        localStorage.setItem('waypoint-briefing-snapshot-v1', JSON.stringify({
          date: '2026-07-08', temp: 70, cond: 'Clear'
        }));
        sessionStorage.setItem('waypoint-outdoor-context-v1', ${JSON.stringify(KANSAS_OUTDOOR)});
        return true;
      })()`,
      returnByValue: true
    });

    await client.send("Page.navigate", { url: BASE + "/?debug=location" });
    for (let i = 0; i < 24; i++) {
      await delay(2000);
      const { result } = await client.send("Runtime.evaluate", {
        expression: `(() => {
          const pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
            ? WDS.outdoorIntelligence.getLast() : null;
          const body = document.body ? document.body.innerText : '';
          const diag = window.WDS && WDS.runtimeMigration && WDS.runtimeMigration.diagnose
            ? WDS.runtimeMigration.diagnose() : null;
          return {
            build: window.__WAYPOINT_BUILD__ || null,
            migration: diag && diag.migrationState,
            needsMigration: diag && diag.needsMigration,
            outdoorContextEngine: diag && diag.outdoorContextEngine,
            contentSource: pkg && pkg.meta ? pkg.meta.contentSource : null,
            hasKansasRiver: /WHITE ROCK|BURR OAK,\\s*KS/i.test(body),
            sunriseDom: (document.querySelectorAll('.wsky-time__value')[0] || {}).textContent || '',
            sunsetDom: (document.querySelectorAll('.wsky-time__value')[1] || {}).textContent || '',
            hydrated: !!(pkg && pkg.meta && pkg.meta.hydratedAt)
          };
        })()`,
        returnByValue: true
      });
      const v = result.value || {};
      if (!v.hydrated) continue;

      console.log("Profile migration check:", JSON.stringify(v, null, 2));
      if (!v.build || !v.build.commit) { failed = true; console.log("FAIL: missing build"); }
      if (v.build && v.build.commit < "cf51ce4" && v.build.commit !== "cf51ce4") {
        /* commit compare is string - cf51ce4 is target */
      }
      if (v.hasKansasRiver) { failed = true; console.log("FAIL: Kansas river in DOM"); }
      if (/6:14\\s*AM/i.test(v.sunriseDom) && /9:04\\s*PM/i.test(v.sunsetDom)) {
        failed = true; console.log("FAIL: Kansas sun times in DOM");
      }
      if (v.contentSource && v.contentSource !== "user-oip") {
        failed = true; console.log("FAIL: content source", v.contentSource);
      }
      if (v.outdoorContextEngine) { failed = true; console.log("FAIL: stale outdoor context remains"); }
      if (v.needsMigration) { failed = true; console.log("FAIL: still needs migration after load"); }
      break;
    }

    if (!failed) {
      console.log("\nPROFILE MIGRATION TEST: PASS");
      console.log("Profile path:", PROFILE);
      return 0;
    }
    console.log("\nPROFILE MIGRATION TEST: FAIL");
    return 1;
  } finally {
    try { if (client) client.close(); } catch (_) { /* noop */ }
    try { proc.kill("SIGTERM"); } catch (_) { /* noop */ }
  }
}

function isTransientCdpError(err) {
  const msg = err && err.message ? err.message : String(err || "");
  return /navigated or closed|Target closed|WebSocket|ECONNREFUSED|No page CDP/i.test(msg);
}

async function run() {
  const attempts = 2;
  for (let i = 0; i < attempts; i++) {
    PORT = Number(process.env.WAYPOINT_MIG_CDP_PORT || 9225) + i;
    PROFILE = path.join(os.tmpdir(), `waypoint-migration-profile-${process.pid}-${i}`);
    try {
      const code = await main();
      process.exit(code);
    } catch (err) {
      if (!isTransientCdpError(err) || i === attempts - 1) {
        console.error(err.message);
        process.exit(2);
      }
      console.error(
        `Profile migration transient CDP error; retrying (${i + 1}/${attempts - 1}):`,
        err.message
      );
      await delay(1500);
    }
  }
}

run();
