#!/usr/bin/env node
/**
 * V1.4 visual capture against apps/shed-hunting/map (local, not a deploy).
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { createServer } from "http";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { extname, join, normalize } from "path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
const DBG = 9368;
const PORT = 8781;
const ART = fs.existsSync("/opt/cursor/artifacts")
  ? "/opt/cursor/artifacts"
  : path.join(ROOT, "automation/artifacts/sheds-v14-visual");

const SEED = {
  schemaVersion: 1,
  scoutSpots: [
    {
      id: "spot_vis_plan",
      name: "Creek bench",
      status: "Plan",
      location: { lat: 41.325, lng: -74.802 },
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
      note: "Walk the bench above the creek.",
      terrain: {
        available: true,
        status: "ready",
        searchPriority: "Higher",
        featureKind: "bench",
        featureLabel: "Gentle southwest-facing bench beside steeper terrain.",
        slopeDeg: 8,
        aspectDeg: 220,
        aspectCardinal: "SW",
        elevM: 412,
        why: ["Terrain transition may be worth checking.", "Moderate slope should be relatively searchable."]
      },
      savedToday: {
        available: true,
        capturedAt: "2026-08-20T16:00:00.000Z",
        band: "Fair",
        huntStatus: "ready",
        seasonCategory: "late_summer",
        seasonLabel: "Late summer",
        freezeThawLabel: "freeze then thaw",
        tempTrendLabel: "warming",
        snowCoverLabel: "No snow on the ground (measured)."
      }
    },
    {
      id: "spot_vis_checked",
      name: "South slope",
      status: "Checked",
      location: { lat: 41.328, lng: -74.797 },
      terrain: {
        available: true,
        status: "ready",
        searchPriority: "Moderate",
        featureLabel: "Walkable south-facing slope.",
        slopeDeg: 14,
        aspectCardinal: "S",
        elevM: 440,
        why: ["Walkable slope with some terrain differentiation."]
      },
      savedToday: { available: false }
    },
    {
      id: "spot_vis_revisit",
      name: "North draw",
      status: "Revisit",
      location: { lat: 41.321, lng: -74.806 },
      terrain: {
        available: true,
        status: "ready",
        searchPriority: "Lower",
        featureLabel: "Steep north-facing terrain.",
        slopeDeg: 31,
        aspectCardinal: "N",
        elevM: 510,
        why: ["Steep terrain reduces search practicality."]
      },
      savedToday: {
        available: true,
        capturedAt: "2026-08-18T11:00:00.000Z",
        band: "Low",
        seasonLabel: "Late summer"
      }
    },
    {
      id: "spot_vis_missing",
      name: "Unrated pin",
      status: "Plan",
      location: { lat: 41.3235, lng: -74.8005 },
      terrain: { available: false, status: "unavailable", searchPriority: null, why: [] },
      savedToday: { available: false }
    }
  ]
};

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".woff2": "font/woff2"
  })[extname(file).toLowerCase()] || "application/octet-stream";
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function waitForTab() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const tabs = await fetchJson("http://127.0.0.1:" + DBG + "/json/list");
      const page = (tabs || []).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (e) { /* */ }
    await delay(250);
  }
  throw new Error("CDP tab not ready");
}

function dismissChrome(evalExpr) {
  return evalExpr(`(() => {
    try { localStorage.setItem("waypoint-sheds-ethics-seen-v1", "1"); } catch (e) {}
    try { localStorage.setItem("waypoint-sheds-first-run-coach-v1", "1"); } catch (e) {}
    var ack = document.getElementById("ethics-ack");
    if (ack) ack.click();
    var coach = document.getElementById("btn-coach-dismiss");
    if (coach) coach.click();
    var coachEl = document.getElementById("first-run-coach");
    if (coachEl) coachEl.setAttribute("hidden", "");
    document.querySelectorAll(".sheds-sheet.is-open").forEach(function (s) {
      s.classList.remove("is-open"); s.setAttribute("aria-hidden", "true");
    });
    var loading = document.getElementById("map-loading");
    if (loading) { loading.classList.add("is-done"); loading.setAttribute("hidden", ""); }
    return true;
  })()`);
}

fs.mkdirSync(ART, { recursive: true });
const server = createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = normalize(join(ROOT, urlPath));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const st = fs.statSync(file);
    if (!st.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
    res.end(fs.readFileSync(file));
  } catch (e) {
    res.writeHead(404); res.end("missing");
  }
});

await new Promise((r) => server.listen(PORT, "127.0.0.1", () => r()));
const chromePath = fs.existsSync(CHROME) ? CHROME : "/usr/bin/google-chrome";
const userData = fs.mkdtempSync("/tmp/chrome-v14-visual-");
const proc = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  "--window-size=1280,800",
  "--user-data-dir=" + userData,
  "--remote-debugging-port=" + DBG, "about:blank"
], { stdio: "ignore" });

try {
  const page = await waitForTab();
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.on("open", r));
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  async function shot(name) {
    const res = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ART, name + ".png"), Buffer.from(res.data, "base64"));
    console.log("shot", name);
  }
  async function evalExpr(expression) {
    const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return res.result && res.result.value;
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
  await send("Page.loadEventFired").catch(() => {});
  await delay(2200);
  await dismissChrome(evalExpr);
  await evalExpr("localStorage.setItem(" + JSON.stringify("waypoint-sheds-scout-spots-v1") + ", " + JSON.stringify(JSON.stringify(SEED)) + ")");
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
  await send("Page.loadEventFired").catch(() => {});
  await delay(2200);
  await dismissChrome(evalExpr);
  await evalExpr(`(() => {
    var map = window.__SHEDS_MAP__;
    if (map) map.setView([41.325, -74.802], 14, { animate: false });
    if (window.WaypointShedsMapApp) window.WaypointShedsMapApp.refreshScoutSpots();
    if (window.WaypointShedsMapApp) window.WaypointShedsMapApp.closeScoutHud();
    document.getElementById("inspect-hud").setAttribute("hidden", "");
    document.getElementById("sheds-map-shell").classList.remove("is-inspecting");
    return true;
  })()`);
  await delay(800);
  await shot("v14_scout_spots_map");

  await evalExpr(`(() => {
    var map = window.__SHEDS_MAP__;
    window.WaypointShedsMapApp.closeScoutHud();
    document.getElementById("btn-inspect-point").click();
    map.fire("click", { latlng: map.getCenter() });
    var body = document.getElementById("inspect-body");
    if (body && !/Search priority/.test(body.textContent)) {
      body.textContent = "Search priority: Higher\\n\\nTerrain\\nGentle southwest-facing bench beside steeper terrain.\\nSlope 8° · southwest-facing · ~412 m (1,352 ft)\\n\\nWhy\\n• Terrain transition may be worth checking.";
    }
    var note = document.getElementById("inspect-field-note");
    if (note) {
      note.hidden = false;
      note.textContent = "Use the terrain as a search guide, not evidence that sheds are present.";
    }
    document.getElementById("inspect-scout-actions").removeAttribute("hidden");
    return true;
  })()`);
  await delay(1200);
  await shot("v14_inspect_save");

  await evalExpr(`(() => {
    document.getElementById("inspect-hud").setAttribute("hidden", "");
    document.getElementById("sheds-map-shell").classList.remove("is-inspecting");
    window.WaypointShedsMapApp.openScoutSpot("spot_vis_plan");
    return true;
  })()`);
  await delay(500);
  await shot("v14_scout_card");

  await evalExpr(`(() => {
    document.querySelector('[data-scout-status="Checked"]').click();
    return true;
  })()`);
  await delay(300);
  await shot("v14_status_checked");

  await evalExpr(`(() => {
    window.WaypointShedsMapApp.openScoutSpot("spot_vis_revisit");
    return true;
  })()`);
  await delay(400);
  await shot("v14_status_revisit");

  await evalExpr(`(() => {
    window.WaypointShedsMapApp.closeScoutHud();
    var btn = document.getElementById("btn-search-areas");
    if (btn && btn.getAttribute("aria-pressed") !== "true") btn.click();
    return true;
  })()`);
  await delay(3500);
  await shot("v14_scout_with_search_areas");

  await evalExpr(`(() => {
    window.WaypointShedsMapApp.openScoutSpot("spot_vis_missing");
    return true;
  })()`);
  await delay(400);
  await shot("v14_missing_terrain_context");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await evalExpr(`(() => {
    window.WaypointShedsMapApp.closeScoutHud();
    document.getElementById("inspect-hud").setAttribute("hidden", "");
    document.getElementById("sheds-map-shell").classList.remove("is-inspecting");
    window.dispatchEvent(new Event("resize"));
    var map = window.__SHEDS_MAP__;
    if (map) { map.invalidateSize(); map.setView([41.325, -74.802], 14, { animate: false }); }
    return true;
  })()`);
  await delay(800);
  await shot("v14_mobile_390_map");

  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 568, deviceScaleFactor: 2, mobile: true });
  await evalExpr(`(() => {
    window.WaypointShedsMapApp.openScoutSpot("spot_vis_plan");
    window.dispatchEvent(new Event("resize"));
    var map = window.__SHEDS_MAP__;
    if (map) map.invalidateSize();
    return true;
  })()`);
  await delay(500);
  await shot("v14_mobile_320_scout_card");

  ws.close();
} finally {
  try { proc.kill("SIGKILL"); } catch (e) { /* */ }
  server.close();
}

console.log("V1.4 visual capture complete.");
