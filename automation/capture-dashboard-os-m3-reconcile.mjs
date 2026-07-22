#!/usr/bin/env node
/**
 * Milestone 3 — craftsmanship before/after screenshots (CDP).
 *
 * Usage:
 *   node automation/capture-dashboard-os-m3-screenshots.mjs before [baseUrl]
 *   node automation/capture-dashboard-os-m3-screenshots.mjs after [baseUrl]
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
  console.error("Usage: capture-dashboard-os-m3-screenshots.mjs before|after [baseUrl]");
  process.exit(1);
}
const BASE = (process.argv[3] || "http://127.0.0.1:8799").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || (PHASE === "before" ? 9351 : 9352));
const OUT = path.join(ROOT, "docs/dashboard-os-m3-reconcile", "local");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `wdb-os-m3-reconcile-${PHASE}-`));
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

async function openPanel(send, selector) {
  return evaluate(
    send,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, reason: "missing" };
      el.click();
      return { ok: true };
    })()`
  );
}

async function closePanel(send) {
  return evaluate(
    send,
    `(() => {
      const btn = document.querySelector("[data-wdb-os-panel-close]");
      if (btn) { btn.click(); return { ok: true }; }
      return { ok: false };
    })()`
  );
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { proc, wsUrl } = await startChrome();
  const client = await cdp(wsUrl);
  const { send } = client;

  try {
    await seedLocation(send, PIKE);

    // 01 Desktop first viewport
    await setViewport(send, 1280, 800);
    await navigate(send, BASE + "/apps/dashboard/?m3=" + PHASE + "-desk&t=" + Date.now());
    let hyd = await waitHydrated(send);
    console.log("desktop hydrate", hyd);
    if (!hyd.ok) throw new Error("Desktop did not hydrate: " + JSON.stringify(hyd));
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(250);
    await shot(send, "01-desktop-first-viewport.png");

    // 02 Desktop after scroll (Day arc / Look closer)
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

    // 03 Desktop sources panel
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(150);
    await openPanel(send, "[data-wdb-os-open='sources']");
    await delay(400);
    await shot(send, "03-desktop-sources-panel.png");
    await closePanel(send);
    await delay(250);

    // 04 Desktop day-arc panel
    await openPanel(send, "[data-wdb-os-open='day-arc']");
    await delay(400);
    await shot(send, "04-desktop-day-arc-panel.png");
    await closePanel(send);
    await delay(250);

    // 05 Desktop conditions panel
    await openPanel(send, "[data-wdb-os-open='conditions']");
    await delay(400);
    await shot(send, "05-desktop-conditions-panel.png");
    await closePanel(send);
    await delay(250);

    // 06 Mobile first viewport
    await setViewport(send, 390, 844);
    await navigate(send, BASE + "/apps/dashboard/?m3=" + PHASE + "-mob&t=" + Date.now());
    hyd = await waitHydrated(send);
    console.log("mobile hydrate", hyd);
    if (!hyd.ok) throw new Error("Mobile did not hydrate: " + JSON.stringify(hyd));
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(250);
    await shot(send, "06-mobile-first-viewport.png");

    // 07 Mobile after scroll
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
    await shot(send, "07-mobile-after-scroll.png");

    // 08 Mobile sources sheet
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(150);
    await openPanel(send, "[data-wdb-os-open='sources']");
    await delay(450);
    await shot(send, "08-mobile-sources-panel.png");
    await closePanel(send);
    await delay(250);

    // 09 Mobile location panel (place)
    await openPanel(send, "[data-wdb-os-open='location']");
    await delay(450);
    await shot(send, "09-mobile-location-panel.png");
    await closePanel(send);
    await delay(250);

    // 10 Focus ring sample (desktop) — keyboard focus on Do
    await setViewport(send, 1280, 800);
    await navigate(send, BASE + "/apps/dashboard/?m3=" + PHASE + "-focus&t=" + Date.now());
    hyd = await waitHydrated(send);
    if (!hyd.ok) throw new Error("Focus capture hydrate failed: " + JSON.stringify(hyd));
    await evaluate(
      send,
      `(() => {
        const el = document.querySelector(".wdb-os__do-primary");
        if (el) el.focus();
        return !!el;
      })()`
    );
    await delay(200);
    await shot(send, "10-desktop-do-focus.png");

    // 11 Location panel (desktop)
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(150);
    await openPanel(send, "[data-wdb-os-open='location']");
    await delay(400);
    await shot(send, "11-desktop-location-panel.png");
    await closePanel(send);
    await delay(200);

    // 12 Loading snapshot (navigate + early capture before hydrate)
    await navigate(send, BASE + "/apps/dashboard/?m3=reconcile-loading&t=" + Date.now());
    await delay(80);
    await shot(send, "12-desktop-loading.png");

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
