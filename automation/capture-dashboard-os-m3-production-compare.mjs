#!/usr/bin/env node
/**
 * Milestone 3 — live production vs local comparison screenshots (CDP).
 * Usage: node automation/capture-dashboard-os-m3-production-compare.mjs [localBase]
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
const LOCAL = (process.argv[2] || "http://127.0.0.1:8799").replace(/\/$/, "");
const PROD = "https://waypointstudio.org";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9355);
const OUT_LOCAL = path.join(ROOT, "docs/dashboard-os-m3-review/local");
const OUT_PROD = path.join(ROOT, "docs/dashboard-os-m3-review/production");

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
  const lib = url.startsWith("https") ? https : http;
  return new Promise((resolve, reject) => {
    lib.get(url, (res) => {
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-os-m3-prod-"));
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
    } catch (_) { /* retry */ }
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function cdp(wsUrl) {
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.on("open", res);
    ws.on("error", rej);
  });
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
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  return { send, close: () => { try { ws.close(); } catch (_) {} } };
}

async function evaluate(send, expression) {
  const { result } = await send("Runtime.evaluate", { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "evaluate failed");
  return result.value;
}

async function setViewport(send, width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 800
  });
}

async function shot(send, dir, filename) {
  const res = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const dest = path.join(dir, filename);
  fs.writeFileSync(dest, Buffer.from(res.data, "base64"));
  console.log("wrote", path.relative(ROOT, dest));
}

async function seedLocation(send, loc) {
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      try {
        localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify(loc))});
        localStorage.setItem("wds-location-prompt-dismissed", "1");
      } catch (e) {}
    })();`
  });
}

async function navigate(send, url) {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url });
  await delay(1000);
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(send, "document.readyState");
    if (ready === "complete") break;
    await delay(200);
  }
}

async function waitLocalHydrated(send, timeoutMs = 60000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await evaluate(
      send,
      `(() => {
        const os = document.querySelector("[data-wdb-os]");
        if (!os) return { ok: false, reason: "no-os" };
        const mode = os.getAttribute("data-wdb-os-mode");
        const headline = (document.querySelector(".wdb-os__happening-headline") || {}).textContent || "";
        const loading = !!document.querySelector("[data-wdb-os-region='loading']");
        const doPrimary = (document.querySelector(".wdb-os__do-primary") || {}).textContent || "";
        return {
          ok: mode === "briefing" && !loading && !!headline && !!doPrimary,
          mode, headline, doPrimary,
          build: (document.querySelector('meta[name="waypoint-build"]') || {}).content || ""
        };
      })()`
    );
    if (last && last.ok) return last;
    await delay(500);
  }
  return last || { ok: false };
}

async function waitProdSettled(send, timeoutMs = 45000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await evaluate(
      send,
      `(() => {
        const title = document.title || "";
        const build = (document.querySelector('meta[name="waypoint-build"]') || {}).content || "";
        const hasOs = !!document.querySelector("[data-wdb-os]");
        const hasV2 = !!document.querySelector(".wdb-v2, [data-wdb-v2], .wdb-recovery, #outdoor-dashboard");
        const bodyText = (document.body && document.body.innerText || "").slice(0, 200);
        const busy = document.querySelector('[aria-busy="true"]');
        return {
          ok: !busy && (hasOs || hasV2 || /Dashboard|Outside|Today/i.test(title + bodyText)),
          title, build, hasOs, hasV2
        };
      })()`
    );
    if (last && last.ok) return last;
    await delay(500);
  }
  return last || { ok: false };
}

async function main() {
  fs.mkdirSync(OUT_LOCAL, { recursive: true });
  fs.mkdirSync(OUT_PROD, { recursive: true });
  const { proc, wsUrl } = await startChrome();
  const client = await cdp(wsUrl);
  const { send } = client;

  try {
    await seedLocation(send, PIKE);

    // Local Outdoor OS
    await setViewport(send, 1280, 800);
    await navigate(send, LOCAL + "/apps/dashboard/?m3=local-compare&t=" + Date.now());
    const local = await waitLocalHydrated(send);
    console.log("local", local);
    if (!local.ok) throw new Error("Local hydrate failed: " + JSON.stringify(local));
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(250);
    await shot(send, OUT_LOCAL, "01-desktop-first-viewport.png");

    await setViewport(send, 390, 844);
    await navigate(send, LOCAL + "/apps/dashboard/?m3=local-mob&t=" + Date.now());
    const localM = await waitLocalHydrated(send);
    console.log("local mobile", localM);
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(250);
    await shot(send, OUT_LOCAL, "02-mobile-first-viewport.png");

    // Production live
    await setViewport(send, 1280, 800);
    await navigate(send, PROD + "/apps/dashboard/?m3=prod-compare&t=" + Date.now());
    const prod = await waitProdSettled(send);
    console.log("production", prod);
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(400);
    await shot(send, OUT_PROD, "01-desktop-first-viewport.png");

    await setViewport(send, 390, 844);
    await navigate(send, PROD + "/apps/dashboard/?m3=prod-mob&t=" + Date.now());
    const prodM = await waitProdSettled(send);
    console.log("production mobile", prodM);
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(400);
    await shot(send, OUT_PROD, "02-mobile-first-viewport.png");

    const meta = {
      capturedAt: new Date().toISOString(),
      localUrl: LOCAL + "/apps/dashboard/",
      productionUrl: PROD + "/apps/dashboard/",
      local,
      production: prod,
      productionMobile: prodM
    };
    fs.writeFileSync(
      path.join(ROOT, "docs/dashboard-os-m3-review/production-compare.json"),
      JSON.stringify(meta, null, 2)
    );
    console.log("DONE compare meta → docs/dashboard-os-m3-review/production-compare.json");
  } finally {
    try { client.close(); } catch (_) {}
    try { proc.kill("SIGTERM"); } catch (_) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
