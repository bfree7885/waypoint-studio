#!/usr/bin/env node
/**
 * Milestone 3 publish — live production verification + screenshots.
 * Usage: node automation/capture-dashboard-os-m3-live.mjs [baseUrl]
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
const BASE = (process.argv[2] || "https://waypointstudio.org").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9371);
const OUT = path.join(ROOT, "docs/dashboard-os-m3-publish", "live");
const META = path.join(ROOT, "docs/dashboard-os-m3-publish", "live-verification.json");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-os-m3-live-"));
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

async function waitHydrated(send, timeoutMs = 90000) {
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
        const finding = /Finding today/i.test(headline);
        const matters = document.querySelectorAll(".wdb-os__matters-item").length;
        const doPrimary = (document.querySelector(".wdb-os__do-primary") || {}).textContent || "";
        const brand = (document.querySelector(".wdb-os__brand") || {}).textContent || "";
        const build = (document.querySelector('meta[name="waypoint-build"]') || {}).content || "";
        const legacy = !!(
          document.querySelector("[data-wdb-recovery], [data-wdb-v2], [data-wdb-v3], .wdb-v2, .wdb-v3") ||
          /Customize widgets/i.test(document.body && document.body.innerText || "")
        );
        return {
          ok: mode === "briefing" && !loading && !!doPrimary && matters >= 1 && !legacy && /Outside/i.test(brand || title),
          partialFinding: finding,
          mode, headline, doPrimary, matters, brand, build, legacy,
          quiet: !!document.querySelector('[data-quiet-chrome="true"], .was-global--quiet'),
          sources: !!document.querySelector("[data-wdb-os-open='sources']"),
          dayArc: !!document.querySelector("[data-wdb-os-open='day-arc'], .wdb-os__dayarc"),
          title: document.title
        };
      })()`
    );
    if (last && last.ok) return last;
    await delay(500);
  }
  return last || { ok: false };
}

async function shot(send, filename) {
  const res = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const dest = path.join(OUT, filename);
  fs.writeFileSync(dest, Buffer.from(res.data, "base64"));
  console.log("wrote", filename);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = await startChrome();
  const session = await cdp(chrome.wsUrl);
  const { send } = session;
  const consoleErrors = [];
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Network.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify(PIKE))});
          localStorage.setItem("wds-location-prompt-dismissed", "1");
          localStorage.setItem("waypoint-dashboard-v2", "1");
          localStorage.setItem("waypoint-dashboard-v3", "1");
        } catch (e) {}
        window.__WDB_CONSOLE_ERRORS__ = [];
        const orig = console.error;
        console.error = function () {
          try { window.__WDB_CONSOLE_ERRORS__.push(Array.from(arguments).join(" ")); } catch (e) {}
          return orig.apply(console, arguments);
        };
      })();`
    });

    const bust = Date.now();
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
    });
    await send("Page.navigate", { url: BASE + "/apps/dashboard/?publish=m3&t=" + bust });
    await delay(1000);
    const desktop = await waitHydrated(send);
    console.log("desktop", desktop);
    if (!desktop.ok) throw new Error("Desktop hydrate failed: " + JSON.stringify(desktop));
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(300);
    await shot(send, "01-desktop-first-viewport.png");
    await evaluate(send, "window.scrollTo(0, document.body.scrollHeight)");
    await delay(400);
    await shot(send, "02-desktop-after-scroll.png");
    await evaluate(send, "document.querySelector(\"[data-wdb-os-open='sources']\")?.click()");
    await delay(500);
    await shot(send, "03-desktop-sources-panel.png");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await delay(300);
    await evaluate(send, "document.querySelector(\"[data-wdb-os-open='day-arc']\")?.click()");
    await delay(500);
    await shot(send, "04-desktop-day-arc-panel.png");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await delay(200);

    await send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 2, mobile: true
    });
    await send("Page.navigate", { url: BASE + "/apps/dashboard/?publish=m3-mob&t=" + bust });
    await delay(800);
    const mobile = await waitHydrated(send);
    console.log("mobile", mobile);
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(300);
    await shot(send, "05-mobile-first-viewport.png");
    await evaluate(send, "window.scrollTo(0, document.body.scrollHeight)");
    await delay(400);
    await shot(send, "06-mobile-after-scroll.png");

    // Spot-check Scenes + Sheds
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false
    });
    await send("Page.navigate", { url: BASE + "/apps/scenes/?t=" + bust });
    await delay(2000);
    const scenes = await evaluate(send, `({title:document.title, shell:!!document.querySelector('[data-wds-app-shell],main')})`);
    await send("Page.navigate", { url: BASE + "/apps/shed-hunting/?t=" + bust });
    await delay(2000);
    const sheds = await evaluate(send, `({title:document.title, shell:!!document.querySelector('[data-wds-app-shell],main')})`);
    await send("Page.navigate", { url: BASE + "/?t=" + bust });
    await delay(2000);
    const home = await evaluate(send, `({title:document.title, cards:document.querySelectorAll('.was-home__card').length})`);

    const errors = await evaluate(send, `window.__WDB_CONSOLE_ERRORS__ || []`);
    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl: BASE,
      expectedBuild: "45dc889",
      desktop,
      mobile,
      scenes,
      sheds,
      home,
      consoleErrors: errors,
      checks: {
        outdoorOS: !!(desktop.ok && !desktop.legacy),
        buildMatches: desktop.build === "45dc889" || String(desktop.build || "").startsWith("45dc889"),
        quietChrome: !!desktop.quiet,
        sourcesDayArc: !!(desktop.sources && desktop.dayArc),
        mobileOS: !!(mobile.ok && !mobile.legacy),
        scenesOk: !!scenes.shell,
        shedsOk: !!sheds.shell,
        homeOk: (home.cards || 0) >= 4,
        noConsoleErrors: !(errors && errors.length)
      }
    };
    fs.writeFileSync(META, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.checks, null, 2));
    const bad = Object.entries(report.checks).filter(([, v]) => !v);
    if (bad.length) {
      console.error("FAILED CHECKS", bad);
      process.exitCode = 1;
    } else {
      console.log("LIVE VERIFICATION PASS");
    }
  } finally {
    session.close();
    chrome.proc.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
