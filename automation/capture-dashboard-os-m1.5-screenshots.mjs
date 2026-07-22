#!/usr/bin/env node
/**
 * Milestone 1.5 — before/after readability screenshots (CDP).
 *
 * Usage:
 *   node automation/capture-dashboard-os-m1.5-screenshots.mjs before [baseUrl]
 *   node automation/capture-dashboard-os-m1.5-screenshots.mjs after [baseUrl]
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
const PHASE = (process.argv[2] || "after").toLowerCase();
if (PHASE !== "before" && PHASE !== "after") {
  console.error("Usage: capture-dashboard-os-m1.5-screenshots.mjs before|after [baseUrl]");
  process.exit(1);
}
const BASE = (process.argv[3] || "http://127.0.0.1:8799").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || (PHASE === "before" ? 9341 : 9342));
const OUT = path.join(ROOT, "docs/dashboard-os-m1.5-review", PHASE);

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `wdb-os-m15-${PHASE}-`));
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
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl, userDataDir };
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
  return {
    send,
    close: () => {
      try {
        ws.close();
      } catch (_) { /* noop */ }
    }
  };
}

async function evaluate(send, expression) {
  const { result } = await send("Runtime.evaluate", { expression, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "evaluate failed");
  }
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

async function shot(send, filename) {
  const res = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const dest = path.join(OUT, filename);
  fs.writeFileSync(dest, Buffer.from(res.data, "base64"));
  console.log("wrote", PHASE + "/" + filename);
  return dest;
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
  await delay(800);
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(send, "document.readyState");
    if (ready === "complete") break;
    await delay(200);
  }
}

async function waitHydrated(send, timeoutMs = 60000) {
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
        return {
          ok: mode === "briefing" && !loading && !finding && !!headline && !!doPrimary && matters >= 1,
          mode, headline, doPrimary, matters
        };
      })()`
    );
    if (last && last.ok) return last;
    await delay(500);
  }
  return last || { ok: false };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { proc, wsUrl } = await startChrome();
  const client = await cdp(wsUrl);
  const { send } = client;

  try {
    await seedLocation(send, PIKE);

    // Desktop first viewport
    await setViewport(send, 1280, 800);
    await navigate(send, BASE + "/apps/dashboard/?m15=" + PHASE + "-desk&t=" + Date.now());
    let hyd = await waitHydrated(send);
    console.log("desktop hydrate", hyd);
    if (!hyd.ok) throw new Error("Desktop did not hydrate: " + JSON.stringify(hyd));
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(200);
    await shot(send, "01-desktop-first-viewport.png");

    // Desktop after scroll
    await evaluate(
      send,
      `(() => {
        const after = document.querySelector("[data-wdb-os-region='after-scroll']");
        if (after) after.scrollIntoView({ block: "start" });
        else window.scrollBy(0, 420);
        return true;
      })()`
    );
    await delay(300);
    await shot(send, "02-desktop-after-scroll.png");

    // Mobile first viewport
    await setViewport(send, 390, 844);
    await navigate(send, BASE + "/apps/dashboard/?m15=" + PHASE + "-mob&t=" + Date.now());
    hyd = await waitHydrated(send);
    console.log("mobile hydrate", hyd);
    if (!hyd.ok) throw new Error("Mobile did not hydrate: " + JSON.stringify(hyd));
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(200);
    await shot(send, "03-mobile-first-viewport.png");

    // Mobile after scroll
    await evaluate(
      send,
      `(() => {
        const after = document.querySelector("[data-wdb-os-region='after-scroll']");
        if (after) after.scrollIntoView({ block: "start" });
        else window.scrollBy(0, 360);
        return true;
      })()`
    );
    await delay(300);
    await shot(send, "04-mobile-after-scroll.png");

    console.log("DONE", PHASE, "→", OUT);
  } finally {
    try {
      client.close();
    } catch (_) { /* noop */ }
    try {
      proc.kill("SIGTERM");
    } catch (_) { /* noop */ }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
