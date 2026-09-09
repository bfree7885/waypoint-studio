#!/usr/bin/env node
/**
 * RADAR production-readiness live browser proof (NO elevation fixture).
 *
 * Proves: real Open-Meteo weather + elevation → aspect → continuous Today/Landscape.
 * Controlled Cold/Thaw fixtures are optional supplemental captures (labeled).
 *
 * Usage:
 *   node automation/capture-sheds-radar-production-readiness.mjs [baseUrl]
 *
 * Writes under docs/sheds/samples/radar-production-readiness/ (Studio only; not published).
 */
import fs from "fs";
import http from "http";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/sheds/samples/radar-production-readiness");
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CDP_PORT = Number(process.env.WAYPOINT_RADAR_CDP_PORT || 9341);
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PIKE = { lat: 41.3091, lng: -74.7835, zoom: 13 };

fs.mkdirSync(OUT, { recursive: true });

const require = createRequire("/tmp/radar-p0-ws/node_modules/ws/package.json");
let WebSocket;
try {
  WebSocket = require("/tmp/radar-p0-ws/node_modules/ws");
} catch (e) {
  console.error("Install ws: npm i ws --prefix /tmp/radar-p0-ws", e);
  process.exit(1);
}

function getJson(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function connectCdp() {
  const list = await getJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = list.find((t) => t.type === "page") || list[0];
  if (!page) throw new Error("no CDP page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.once("open", res);
    ws.once("error", rej);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (buf) => {
    const msg = JSON.parse(buf.toString());
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
  return {
    send,
    close: () => ws.close(),
    ev: async (expr) => {
      const r = await send("Runtime.evaluate", {
        expression: expr,
        awaitPromise: true,
        returnByValue: true
      });
      if (r.exceptionDetails) {
        throw new Error(JSON.stringify(r.exceptionDetails));
      }
      return r.result && r.result.value;
    }
  };
}

async function shot(client, name) {
  const r = await client.send("Page.captureScreenshot", { format: "png" });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  return file;
}

async function main() {
  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--window-size=1280,800",
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  await delay(1200);
  const client = await connectCdp();
  await client.send("Page.enable");
  await client.send("Network.enable");

  const networkLog = [];
  // Track elevation + forecast without intercepting (live proof).
  client.send("Network.requestWillBeSent").catch(() => {});
  const origOn = client._ws; // unused; use CDP events via raw — simpler poll from page

  await client.send("Page.navigate", {
    url: BASE + "/apps/shed-hunting/map/?radarP0=1"
  });
  await delay(3500);

  await client.ev(`(() => {
    try {
      localStorage.setItem('waypoint-sheds-ethics-seen-v1', '1');
      localStorage.setItem('waypoint-sheds-first-run-coach-v1', '1');
    } catch (e) {}
    const ethicsAck = document.querySelector('#ethics-ack');
    if (ethicsAck) ethicsAck.click();
    const coach = document.querySelector('#btn-coach-dismiss');
    if (coach) coach.click();
    document.querySelectorAll('.sheds-sheet').forEach((el) => {
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('hidden', '');
    });
    return true;
  })()`);

  // radarP0=1 already centers Pike — avoid setView thrash that aborts elev fetch.

  let status = null;
  let elevClass = "unknown";
  for (let i = 0; i < 180; i++) {
    await delay(1000);
    status = await client.ev(`(() => {
      const r = window.WaypointShedsMapApp && window.WaypointShedsMapApp._radarP0;
      if (!r || !r.getProofStatus) return { ready: false, reason: 'no-hook' };
      const s = r.getProofStatus();
      const frame = r.getConditionFrame && r.getConditionFrame();
      s.conditionFreshness = frame ? frame.freshness : null;
      s.weatherReady = !!(frame && frame.freshness === 'fresh');
      s.surfaceMode = r.getSurfaceMode && r.getSurfaceMode();
      s.toggleHidden = !!(document.querySelector('#btn-radar-p0-toggle') || {}).hidden;
      s.proofHidden = !!(document.querySelector('#radar-p0-proof-wrap') || {}).hidden;
      s.prototypeCopy = /Radar P0|Frame A|prototype/i.test(document.body.innerText || '');
      s.statusText = (document.querySelector('#radar-p0-status') || {}).textContent || '';
      s.frameLabel = (document.querySelector('#radar-p0-frame-label') || {}).textContent || '';
      return s;
    })()`);
    if (i % 10 === 0) {
      console.log("wait", i, {
        ready: status && status.ready,
        terrainEnriched: status && status.terrainEnriched,
        withAspect: status && status.withAspect,
        southish: status && status.southish,
        weatherReady: status && status.weatherReady,
        elevKey: status && status.elevKey,
        elevFetchGen: status && status.elevFetchGen
      });
    }
    if (status && status.ready) break;
  }

  if (!status || !status.terrainEnriched || !(status.withAspect > 0)) {
    const net = await client.ev(`(() => {
      return {
        online: navigator.onLine,
        lastElevFail: window.__RADAR_ELEV_LAST_ERROR || null
      };
    })()`).catch(() => ({ online: null }));
    elevClass =
      net && net.online === false
        ? "A_environment_offline"
        : "A_rate_limit_or_timing_B_chunked_elevation";
    const report = {
      ok: false,
      classification: elevClass,
      status,
      network: net,
      note: "Live terrain enrichment did not become ready. No fixture used for main proof. Likely Open-Meteo 429 on chunked elevation."
    };
    fs.writeFileSync(path.join(OUT, "live-proof-report.json"), JSON.stringify(report, null, 2));
    console.error("LIVE TERRAIN PROOF FAILED", elevClass);
    try { await client.close(); } catch (e) {}
    try { chrome.kill("SIGKILL"); } catch (e) {}
    process.exit(2);
  }

  elevClass = "live_ok";

  // Desktop Today
  await client.ev(`window.WaypointShedsMapApp._radarP0.setSurfaceMode('today')`);
  await delay(600);
  const todayGrid = await client.ev(`(() => {
    const g = window.WaypointShedsMapApp._radarP0.getLastGrid();
    const f = window.WaypointShedsMapApp._radarP0.getConditionFrame();
    return {
      surfaceMode: g && g.surfaceMode,
      frameLabel: g && g.frameLabel,
      stats: g && g.stats,
      conditionStatus: g && g.conditionStatus,
      freshness: f && f.freshness,
      freezeThawStatus: f && f.freezeThawStatus,
      tempTrendStatus: f && f.tempTrendStatus,
      snowCoverStatus: f && f.snowCoverStatus
    };
  })()`);
  await shot(client, "live-desktop-today.png");

  // Tap explain Today
  await client.ev(`(() => {
    const map = window.WaypointShedsMapApp._radarP0.getMap();
    const c = map.getCenter();
    map.fire('click', { latlng: c });
    return true;
  })()`);
  await delay(400);
  const explainToday = await client.ev(`(() => {
    const body = document.querySelector('#radar-p0-explain-body');
    const panel = document.querySelector('#radar-p0-explain');
    return {
      visible: panel && !panel.hidden,
      text: body ? body.textContent : ''
    };
  })()`);
  await shot(client, "live-desktop-today-tap.png");

  // Landscape
  await client.ev(`window.WaypointShedsMapApp._radarP0.setSurfaceMode('landscape')`);
  await delay(600);
  const landGrid = await client.ev(`(() => {
    const g = window.WaypointShedsMapApp._radarP0.getLastGrid();
    return {
      surfaceMode: g && g.surfaceMode,
      frameLabel: g && g.frameLabel,
      stats: g && g.stats,
      conditionStatus: g && g.conditionStatus
    };
  })()`);
  await shot(client, "live-desktop-landscape.png");

  await client.ev(`(() => {
    const map = window.WaypointShedsMapApp._radarP0.getMap();
    map.fire('click', { latlng: map.getCenter() });
    return true;
  })()`);
  await delay(400);
  const explainLand = await client.ev(`(() => {
    const body = document.querySelector('#radar-p0-explain-body');
    return { text: body ? body.textContent : '' };
  })()`);

  // Mobile 390
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await client.ev(`window.WaypointShedsMapApp._radarP0.setSurfaceMode('today')`);
  await delay(500);
  const overflow390 = await client.ev(
    `document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`
  );
  await shot(client, "live-mobile-390-today.png");

  // Mobile 320
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 568,
    deviceScaleFactor: 2,
    mobile: true
  });
  await delay(400);
  const overflow320 = await client.ev(
    `document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`
  );
  await shot(client, "live-mobile-320-today.png");

  // Controlled fixtures (labeled test evidence) — supplemental only
  await client.send("Emulation.clearDeviceMetricsOverride");
  await client.ev(`window.WaypointShedsMapApp._radarP0.setProofFixtures(true)`);
  await client.ev(`window.WaypointShedsMapApp._radarP0.setFrame('B')`);
  await delay(500);
  const thaw = await client.ev(`(() => {
    const g = window.WaypointShedsMapApp._radarP0.getLastGrid();
    return { frameId: g && g.frameId, stats: g && g.stats, label: g && g.frameLabel };
  })()`);
  await shot(client, "controlled-thaw-TEST-EVIDENCE.png");

  await client.ev(`window.WaypointShedsMapApp._radarP0.setFrame('A')`);
  await delay(500);
  const cold = await client.ev(`(() => {
    const g = window.WaypointShedsMapApp._radarP0.getLastGrid();
    return { frameId: g && g.frameId, stats: g && g.stats, label: g && g.frameLabel };
  })()`);
  await shot(client, "controlled-cold-TEST-EVIDENCE.png");

  const report = {
    ok: true,
    elevClassification: elevClass,
    fixtureUsedForMainProof: false,
    proofStatus: status,
    today: todayGrid,
    landscape: landGrid,
    explainToday,
    explainLandscape: explainLand,
    overflow390,
    overflow320,
    controlledThaw: thaw,
    controlledCold: cold,
    normalUi: {
      toggleHidden: status.toggleHidden,
      proofHidden: status.proofHidden,
      prototypeCopy: status.prototypeCopy
    },
    capturedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(OUT, "live-proof-report.json"), JSON.stringify(report, null, 2));
  console.log("LIVE PROOF OK", {
    weather: todayGrid && todayGrid.freshness,
    aspect: status.withAspect,
    southish: status.southish,
    todayMode: todayGrid && todayGrid.surfaceMode,
    landMode: landGrid && landGrid.surfaceMode
  });

  await client.close();
  chrome.kill();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
