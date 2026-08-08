#!/usr/bin/env node
/**
 * Capture homepage Global Signals teaser screenshots (unavailable + live).
 * Live capture uses temporary production artifacts (mode: live) — not committed.
 * Usage: node automation/capture-homepage-gs-teaser.mjs [baseUrl]
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
const OUT = path.join(ROOT, "docs/product/homepage-gs-teaser");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9397);
const PORT = Number(process.env.WAYPOINT_CAPTURE_PORT || 8769);
const BASE = (process.argv[2] || `http://127.0.0.1:${PORT}`).replace(/\/$/, "");

const LIVE_EVENT = {
  id: "gse_capture_ofac",
  title: "OFAC publishes sanctions-related Federal Register notice",
  summary: "Official government notice used only for local screenshot verification.",
  eventType: "sanctions",
  source: "federal-register",
  sourceUrl: "https://www.federalregister.gov/",
  publishedAt: new Date(Date.now() - 18 * 60000).toISOString(),
  retrievedAt: new Date().toISOString(),
  lastVerifiedAt: new Date().toISOString(),
  status: "active",
  provenance: {
    source: "federal-register",
    publisher: "Federal Register",
    retrievedAt: new Date().toISOString(),
    sourceUrl: "https://www.federalregister.gov/"
  }
};

const TEMP_FILES = [
  "data/global-signals/production/events/events.json",
  "data/global-signals/production/impacts/impacts.json",
  "data/global-signals/ingestion/status.json"
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

function startStaticServer() {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2"
  };
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.join(ROOT, urlPath.replace(/^\//, ""));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-gs-teaser-"));
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

function writeLiveArtifacts() {
  for (const rel of TEMP_FILES) {
    fs.mkdirSync(path.join(ROOT, path.dirname(rel)), { recursive: true });
  }
  const now = new Date().toISOString();
  fs.writeFileSync(
    path.join(ROOT, TEMP_FILES[0]),
    JSON.stringify(
      {
        version: "1.0.0",
        mode: "live",
        modeLabel: "Live ingested events",
        updatedAt: now,
        honesty: {
          banner: "Local capture artifact — not committed. Production must come from the live pipeline."
        },
        counts: { deduped: 1 },
        events: [LIVE_EVENT]
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(ROOT, TEMP_FILES[1]),
    JSON.stringify(
      {
        version: "1.0.0",
        mode: "live",
        updatedAt: now,
        honesty: {
          banner: "Impacts are calculated exposure paths — not Observed facts."
        },
        industries: [
          {
            id: "gsi_capture_ind",
            originEvent: LIVE_EVENT.id,
            affectedEntity: "gse_industry_semiconductors",
            affectedEntityLabel: "Semiconductors",
            affectedEntityType: "Industry",
            impactDirection: "exposure",
            order: 1,
            confidence: "High",
            timeHorizon: "Weeks",
            evidence: [{ kind: "origin_event", label: LIVE_EVENT.title, url: LIVE_EVENT.sourceUrl }],
            updatedAt: now,
            status: "calculated"
          }
        ],
        citizen: [
          {
            id: "gsi_capture_cit",
            originEvent: LIVE_EVENT.id,
            affectedEntity: "gse_citizen_electronics",
            affectedEntityLabel: "Consumer electronics availability",
            affectedEntityType: "Citizen Impact",
            impactDirection: "exposure",
            order: 2,
            confidence: "Medium",
            timeHorizon: "Months",
            evidence: [{ kind: "origin_event", label: LIVE_EVENT.title, url: LIVE_EVENT.sourceUrl }],
            updatedAt: now,
            status: "calculated"
          }
        ],
        impacts: []
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(ROOT, TEMP_FILES[2]),
    JSON.stringify(
      {
        version: "1.0.0",
        mode: "live",
        updatedAt: now,
        lastSuccessfulIngestion: new Date(Date.now() - 18 * 60000).toISOString(),
        eventsIngested: 1
      },
      null,
      2
    )
  );
}

function removeLiveArtifacts() {
  for (const rel of TEMP_FILES) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  removeLiveArtifacts();

  const ownServer = !process.argv[2];
  const server = ownServer ? await startStaticServer() : null;
  const chrome = await startChrome();
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
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

  async function evalJs(expression) {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return r.result && r.result.value;
  }

  async function shot(name) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log("wrote", file);
  }

  async function openHomeAndScrollTeaser() {
    await send("Page.navigate", { url: BASE + "/" });
    await delay(2000);
    await evalJs(`(() => {
      const loc = {
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
      localStorage.clear();
      localStorage.setItem("wds-location-v3", JSON.stringify(loc));
      localStorage.setItem("wds-location-prompted", "1");
      return true;
    })()`);
    await send("Page.reload", { ignoreCache: true });
    await delay(3500);
    await evalJs(`(() => {
      const prompt = document.getElementById("wds-location-prompt");
      if (prompt) prompt.innerHTML = "";
      const el = document.querySelector('[data-deepen="global-signals-teaser"]');
      if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
      return {
        teaser: !!el,
        state: el && el.querySelector("[data-gs-teaser-state]")?.getAttribute("data-gs-teaser-state"),
        text: (el && el.innerText) || ""
      };
    })()`);
    await delay(400);
    return evalJs(`(() => {
      const el = document.querySelector('[data-deepen="global-signals-teaser"]');
      return {
        teaser: !!el,
        state: el && el.querySelector("[data-gs-teaser-state]")?.getAttribute("data-gs-teaser-state"),
        text: (el && el.innerText) || "",
        href: el && el.querySelector('[data-deepen-link="global-signals"]')?.getAttribute("href")
      };
    })()`);
  }

  const meta = { base: BASE, captures: [] };

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  const unavailable = await openHomeAndScrollTeaser();
  console.log("unavailable", unavailable);
  await shot("01-desktop-gs-teaser-unavailable.png");
  meta.captures.push({ file: "01-desktop-gs-teaser-unavailable.png", state: unavailable });

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  const unavailablePhone = await openHomeAndScrollTeaser();
  await shot("02-phone-gs-teaser-unavailable.png");
  meta.captures.push({ file: "02-phone-gs-teaser-unavailable.png", state: unavailablePhone });

  writeLiveArtifacts();

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const live = await openHomeAndScrollTeaser();
  console.log("live", live);
  await shot("03-desktop-gs-teaser-live.png");
  meta.captures.push({ file: "03-desktop-gs-teaser-live.png", state: live });

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  const livePhone = await openHomeAndScrollTeaser();
  await shot("04-phone-gs-teaser-live.png");
  meta.captures.push({ file: "04-phone-gs-teaser-live.png", state: livePhone });

  removeLiveArtifacts();
  fs.writeFileSync(path.join(OUT, "capture-meta.json"), JSON.stringify(meta, null, 2));
  console.log("wrote capture-meta.json");

  ws.close();
  chrome.proc.kill("SIGTERM");
  if (server) server.close();
}

main().catch((err) => {
  removeLiveArtifacts();
  console.error(err);
  process.exit(1);
});
