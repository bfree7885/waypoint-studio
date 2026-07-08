#!/usr/bin/env node
/**
 * Production outdoor dashboard first-load check.
 * Asserts operational blocks settle to Live / Estimated / Unavailable.
 */
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9226;

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

const proc = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-extensions",
  `--remote-debugging-port=${PORT}`, "about:blank"
], { stdio: "ignore" });
await delay(2000);
const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
const page = targets.find((t) => t.type === "page" && !/extension/i.test(t.url || "")) || targets.find((t) => t.type === "page");
if (!page) throw new Error("No page CDP target");
const { default: WebSocket } = await import("ws");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.on("open", r));
let id = 0;
const pending = new Map();
ws.on("message", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const errors = [];
await send("Runtime.enable");
ws.on("message", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.method === "Runtime.exceptionThrown") {
    errors.push(msg.params.exceptionDetails.text || "exception");
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    errors.push(msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  }
});
await send("Page.navigate", { url: BASE + "/" });
for (let i = 0; i < 20; i++) {
  await delay(1500);
  const { result } = await send("Runtime.evaluate", {
    expression: `(() => {
      const pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast && WDS.outdoorIntelligence.getLast();
      return {
        notices: document.querySelectorAll('.wdb-doc__notice').length,
        busy: document.querySelectorAll('[aria-busy="true"]').length,
        hydrated: !!(pkg && pkg.meta && pkg.meta.hydratedAt)
      };
    })()`,
    returnByValue: true
  });
  const v = result.value || {};
  if ((v.notices || 0) >= 8 && v.hydrated && (v.busy || 0) === 0) break;
}
const { result } = await send("Runtime.evaluate", {
  expression: `(() => {
    const trusts = Array.from(document.querySelectorAll('.wdb-doc__trust')).map(el => (el.textContent || '').trim());
    const domains = Array.from(document.querySelectorAll('.wdb-doc__domain')).map(el => (el.textContent || '').trim().toLowerCase());
    const pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast ? WDS.outdoorIntelligence.getLast() : null;
    return {
      dashboard: !!document.querySelector('#outdoor-dashboard'),
      briefing: !!document.querySelector('.wdb-doc'),
      notices: document.querySelectorAll('.wdb-doc__notice').length,
      domains,
      trusts,
      missions: document.querySelectorAll('.wdb-missions__card').length,
      nature: document.querySelectorAll('.wdb-nature__card').length,
      busy: document.querySelectorAll('[aria-busy="true"]').length,
      hydrated: !!(pkg && pkg.meta && pkg.meta.hydratedAt),
      blockStatus: pkg && pkg.meta && pkg.meta.blockStatus || null,
      title: document.title
    };
  })()`,
  returnByValue: true
});
const checks = result.value || {};
const required = ["current", "forecast", "alerts", "aqi", "sun", "moon", "water", "radar", "readiness"];
const missing = required.filter((d) => !(checks.domains || []).includes(d));
const badTrust = (checks.trusts || []).filter((t) => !/^(Live|Estimated|Unavailable)$/i.test(t));
let failed = false;
if (!checks.dashboard || !checks.briefing) failed = true;
if ((checks.notices || 0) < 8) failed = true;
if (!checks.hydrated) failed = true;
if ((checks.busy || 0) > 0) failed = true;
if ((checks.missions || 0) > 0) failed = true;
if (missing.length) failed = true;
if (badTrust.length) failed = true;
if (errors.length) failed = true;
console.log(JSON.stringify({ checks, missing, badTrust, errors, failed }, null, 2));
proc.kill();
ws.close();
process.exit(failed ? 1 : 0);
