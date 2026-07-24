#!/usr/bin/env node
/**
 * Platform Polish RC2 — public walkthrough captures + console/link checks.
 * Usage: node automation/capture-platform-polish-rc2.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9412);
const OUT = path.join(ROOT, "docs/rebuild-2026/platform-polish-rc2");

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

const ROUTES = [
  { id: "01-desktop-home", path: "/", waitMs: 4500, scroll: false },
  { id: "02-desktop-home-featured", path: "/", waitMs: 4500, scrollTo: ".wdb-r-deepener, [data-wdb-deepener], #wds-content-engine" },
  { id: "03-desktop-scenes", path: "/apps/scenes/", waitMs: 2500 },
  { id: "04-desktop-sheds", path: "/apps/shed-hunting/", waitMs: 2500 },
  { id: "05-desktop-articles", path: "/articles/", waitMs: 2500 },
  { id: "06-desktop-about", path: "/about.html", waitMs: 1500 },
  { id: "07-desktop-contact", path: "/contact.html", waitMs: 1500 },
  { id: "08-desktop-privacy", path: "/privacy.html", waitMs: 1200 },
  { id: "09-desktop-terms", path: "/terms.html", waitMs: 1200 },
  { id: "10-desktop-support", path: "/support.html", waitMs: 1200 },
  { id: "11-desktop-incubator", path: "/incubator/", waitMs: 1200 },
  { id: "12-phone-home", path: "/", waitMs: 4500, mobile: true },
  { id: "13-phone-about", path: "/about.html", waitMs: 1500, mobile: true }
];

const LEGACY_RE =
  /Outdoor OS|Browse Applications|Open Dashboard|\bDashboard\b|Waypoint Volunteer|SignalTerrain|Fieldry|Steepleaf|Savant Sommelier|Coming later/i;

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-polish-rc2-"));
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
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
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
  const consoleNotes = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.method === "Runtime.consoleAPICalled") {
      const t = msg.params && msg.params.type;
      if (t === "error" || t === "warning") {
        const text = (msg.params.args || [])
          .map((a) => a.value || a.description || "")
          .join(" ");
        consoleNotes.push({ type: t, text: String(text).slice(0, 240) });
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
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");

  const results = [];

  for (const route of ROUTES) {
    const mobile = !!route.mobile;
    await send("Emulation.setDeviceMetricsOverride", {
      width: mobile ? 390 : 1440,
      height: mobile ? 844 : 900,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile
    });
    const url = BASE + route.path;
    await send("Page.navigate", { url });
    await delay(800);
    await send("Runtime.evaluate", {
      expression: `(() => {
        try {
          localStorage.setItem("waypoint.location.v1", ${JSON.stringify(JSON.stringify(PIKE))});
          localStorage.setItem("wds.location", ${JSON.stringify(JSON.stringify(PIKE))});
        } catch (e) {}
        return true;
      })()`
    });
    await send("Page.navigate", { url });
    await delay(route.waitMs || 2000);
    if (route.scrollTo) {
      await send("Runtime.evaluate", {
        expression: `(() => {
          const el = document.querySelector(${JSON.stringify(route.scrollTo)});
          if (el) el.scrollIntoView({ block: "center" });
          else window.scrollTo(0, Math.min(1200, document.body.scrollHeight * 0.45));
          return !!el;
        })()`
      });
      await delay(600);
    }
    const probe = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const body = (document.body && document.body.innerText) || "";
        const title = document.title || "";
        const nav = Array.from(document.querySelectorAll(".was-primary-nav__link, .was-primary-nav a"))
          .map((a) => (a.textContent || "").trim()).filter(Boolean);
        const footer = Array.from(document.querySelectorAll(".was-footer a, .wds-footer a"))
          .map((a) => (a.textContent || "").trim()).filter(Boolean);
        const imgs = Array.from(document.images || []).map((img) => ({
          src: img.currentSrc || img.src || "",
          ok: !!(img.complete && img.naturalWidth > 0),
          alt: img.alt || ""
        }));
        const brokenImgs = imgs.filter((i) => i.src && !i.ok).map((i) => i.src);
        const legacyHit = ${LEGACY_RE}.test(body);
        const legacySamples = [];
        const re = ${LEGACY_RE};
        const m = body.match(re);
        if (m) legacySamples.push(m[0]);
        return {
          title,
          href: location.href,
          nav,
          footer,
          legacyHit,
          legacySamples,
          brokenImgs: brokenImgs.slice(0, 8),
          h1: (document.querySelector("h1") && document.querySelector("h1").textContent || "").trim()
        };
      })()`
    });
    const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const file = route.id + ".png";
    fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, "base64"));
    console.log("wrote", file);
    results.push({ route: route.path, file, probe: probe.result.value });
  }

  const meta = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    results,
    consoleNotes: consoleNotes.slice(0, 40)
  };
  fs.writeFileSync(path.join(OUT, "capture-meta.json"), JSON.stringify(meta, null, 2));
  console.log("meta", path.join(OUT, "capture-meta.json"));

  ws.close();
  try { chrome.proc.kill("SIGTERM"); } catch (_) {}
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
