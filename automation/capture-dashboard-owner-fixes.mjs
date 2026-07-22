#!/usr/bin/env node
/**
 * Owner-fix after screenshots — Best window + Contact in quiet shell.
 * Usage: node automation/capture-dashboard-owner-fixes.mjs [baseUrl]
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
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9388);
const OUT = path.join(ROOT, "docs/dashboard-owner-fixes/after");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-owner-fix-"));
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
  const { default: WebSocket } = await import("ws").catch(() => ({ default: null }));
  if (!WebSocket) {
    // Fallback: use chrome-remote-interface style via raw WS from undici not available — use child puppeteer-less
    throw new Error("ws package required");
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.once("open", res);
    ws.once("error", rej);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  function send(method, params) {
    const mid = ++id;
    return new Promise((resolve, reject) => {
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }
  return {
    send,
    close: () => ws.close()
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = await startChrome();
  // Prefer existing capture harness pattern via CDP HTTP /json/new
  const { default: WebSocket } = await import("ws");
  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  let page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.once("open", r);
    ws.once("error", j);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
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
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  async function goto(url) {
    await send("Page.navigate", { url });
    await delay(2500);
  }

  async function shot(name) {
    const result = await send("Page.captureScreenshot", { format: "png" });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log("wrote", file);
  }

  async function evalJs(expression) {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return r.result && r.result.value;
  }

  // Seed location then open dashboard
  await goto(BASE + "/apps/dashboard/");
  await evalJs(`(() => {
    localStorage.clear();
    localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify(PIKE))});
    localStorage.setItem("wds-location-prompt-dismissed", "1");
    return true;
  })()`);
  await goto(BASE + "/apps/dashboard/");
  await delay(8000);
  let briefing = null;
  for (let i = 0; i < 12; i++) {
    briefing = await evalJs(`({
    label: (document.querySelector(".wdb-os__do .wdb-os__label")||{}).textContent||"",
    primary: (document.querySelector(".wdb-os__do-primary")||{}).textContent||"",
    alternate: (document.querySelector(".wdb-os__do-alt")||{}).textContent||"",
    mode: document.querySelector("[data-wdb-os]")?.getAttribute("data-wdb-os-mode")
      || document.querySelector(".wdb-os")?.getAttribute("data-wdb-os-mode")
      || document.body.querySelector("[data-mode]")?.getAttribute("data-mode")
      || "",
    hasDoThis: /Do this/i.test(document.body.innerText||""),
    footerContact: (() => {
      const a = Array.from(document.querySelectorAll(".was-footer a")).find(x => /contact/i.test(x.textContent||""));
      return a ? a.getAttribute("href") : null;
    })()
  })`);
    if (briefing && briefing.primary && !/Finding|loading/i.test(briefing.mode || "")) break;
    if (briefing && briefing.label === "Best window" && briefing.primary) break;
    await delay(1500);
  }
  console.log("briefing", briefing);
  await shot("01-desktop-best-window.png");

  // Contact page
  await goto(BASE + "/apps/dashboard/contact.html");
  await delay(1500);
  const contact = await evalJs(`({
    title: document.title,
    quiet: !!document.querySelector("[data-quiet-chrome='true'], [data-was-quiet-chrome]"),
    form: !!document.querySelector("#wcs-contact-form"),
    brandHref: (document.querySelector(".was-brand")||{}).getAttribute?.("href")||""
  })`);
  console.log("contact", contact);
  await shot("02-desktop-contact.png");

  // Mobile dashboard
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await goto(BASE + "/apps/dashboard/");
  await delay(3500);
  await shot("03-mobile-best-window.png");

  await goto(BASE + "/apps/dashboard/contact.html");
  await delay(1500);
  await shot("04-mobile-contact.png");

  fs.writeFileSync(
    path.join(ROOT, "docs/dashboard-owner-fixes/after/capture-meta.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), base: BASE, briefing, contact }, null, 2)
  );

  ws.close();
  chrome.proc.kill("SIGTERM");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
