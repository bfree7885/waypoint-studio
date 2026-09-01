#!/usr/bin/env node
/**
 * Sheds V1.4 map — Scout Spots mobile overflow at 320 / 375 / 390 / 430.
 * Save Scout Spot, Scout card, Search Areas on/off, persistence.
 *
 * Run: node automation/test-sheds-v1-4-map-mobile.mjs
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
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9354);
const PORT = Number(process.env.SHED_V14_MOBILE_PORT || 8098);
const ART = process.env.SHED_HOST_ARTIFACTS ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(ROOT, "automation/artifacts/sheds-v14-map-mobile"));
const VIEWPORTS = [
  { name: "w320", width: 320, height: 568 },
  { name: "w375", width: 375, height: 667 },
  { name: "w390", width: 390, height: 844 },
  { name: "w430", width: 430, height: 932 }
];

const failures = [];
function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.log("FAIL", name, "—", detail || "");
  }
}

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
      const page = (tabs || []).find((t) => t.type === "page" && t.webSocketDebuggerUrl && !/chrome-extension:/.test(t.url || ""));
      if (page) return page;
      const any = (tabs || []).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (any) return any;
    } catch (e) { /* starting */ }
    await delay(250);
  }
  throw new Error("CDP tab not ready");
}

const SEED = JSON.stringify({
  schemaVersion: 1,
  scoutSpots: [
    {
      id: "spot_seed_plan",
      name: "Creek bench",
      status: "Plan",
      location: { lat: 41.325, lng: -74.802 },
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
      note: "Walk the bench.",
      terrain: {
        available: true,
        status: "ready",
        searchPriority: "Higher",
        featureKind: "bench",
        featureLabel: "Gentle bench beside steeper terrain.",
        slopeDeg: 8,
        aspectDeg: 220,
        aspectCardinal: "SW",
        elevM: 412,
        why: ["Terrain transition may be worth checking."]
      },
      savedToday: {
        available: true,
        capturedAt: "2026-08-20T16:00:00.000Z",
        band: "Fair",
        huntStatus: "ready",
        seasonCategory: "late_summer",
        seasonLabel: "Late summer"
      }
    },
    {
      id: "spot_seed_checked",
      name: "South slope",
      status: "Checked",
      location: { lat: 41.327, lng: -74.798 },
      terrain: { available: false, status: "unavailable", searchPriority: null }
    },
    {
      id: "spot_seed_revisit",
      name: "North draw",
      status: "Revisit",
      location: { lat: 41.322, lng: -74.805 },
      terrain: {
        available: true,
        status: "ready",
        searchPriority: "Lower",
        featureLabel: "Steep north-facing terrain.",
        slopeDeg: 31,
        why: ["Steep terrain reduces search practicality."]
      },
      savedToday: { available: false }
    }
  ]
});

async function main() {
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
  const userData = fs.mkdtempSync(path.join("/tmp", "chrome-v14-map-"));
  const proc = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--user-data-dir=" + userData,
    "--remote-debugging-port=" + DBG, "about:blank"
  ], { stdio: "ignore" });

  try {
    const page = await waitForTab().catch(async function () {
      await new Promise(function (resolve, reject) {
        const req = http.get("http://127.0.0.1:" + DBG + "/json/new?about:blank", function (res) {
          let d = "";
          res.on("data", function (c) { d += c; });
          res.on("end", function () { resolve(d); });
        });
        req.on("error", reject);
      });
      return waitForTab();
    });
    const wsPath = path.join(ROOT, "node_modules/ws/index.js");
    if (!fs.existsSync(wsPath)) throw new Error("ws module missing");
    const WebSocket = (await import(wsPath)).default;
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
    async function evalExpr(expression) {
      const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (res && res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || "evaluate failed");
      }
      return res.result && res.result.value;
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 2, mobile: true
    });
    await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
    await send("Page.loadEventFired").catch(() => {});
    await delay(2200);

    await evalExpr(`(() => {
      try { localStorage.setItem("waypoint-sheds-ethics-seen-v1", "1"); } catch (e) {}
      try { localStorage.setItem("waypoint-sheds-first-run-coach-v1", "1"); } catch (e) {}
      try { localStorage.setItem("waypoint-sheds-scout-spots-v1", ${JSON.stringify(SEED)}); } catch (e) {}
      var ack = document.getElementById("ethics-ack");
      if (ack) ack.click();
      var coach = document.getElementById("btn-coach-dismiss");
      if (coach) coach.click();
      document.querySelectorAll(".sheds-sheet.is-open").forEach(function (s) {
        s.classList.remove("is-open");
        s.setAttribute("aria-hidden", "true");
      });
      var loading = document.getElementById("map-loading");
      if (loading) { loading.classList.add("is-done"); loading.setAttribute("hidden", ""); }
      return true;
    })()`);

    await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
    await send("Page.loadEventFired").catch(() => {});
    await delay(2200);
    await evalExpr(`(() => {
      var ack = document.getElementById("ethics-ack");
      if (ack) ack.click();
      document.querySelectorAll(".sheds-sheet.is-open").forEach(function (s) {
        s.classList.remove("is-open");
        s.setAttribute("aria-hidden", "true");
      });
      var loading = document.getElementById("map-loading");
      if (loading) { loading.classList.add("is-done"); loading.setAttribute("hidden", ""); }
      var map = window.__SHEDS_MAP__;
      if (map) map.setView([41.325, -74.802], 14, { animate: false });
      if (window.WaypointShedsMapApp && window.WaypointShedsMapApp.refreshScoutSpots) {
        window.WaypointShedsMapApp.refreshScoutSpots();
      }
      return true;
    })()`);
    await delay(600);

    const boot = await evalExpr(`(() => {
      var S = window.WaypointShedsScoutSpots;
      return {
        store: typeof S,
        count: S ? S.list().length : 0,
        marks: document.querySelectorAll(".sheds-scout-mark").length,
        saveBtn: !!document.getElementById("btn-save-scout-spot"),
        hud: !!document.getElementById("scout-hud"),
        inspect: !!document.getElementById("btn-inspect-point"),
        searchBtn: !!document.getElementById("btn-search-areas"),
        importBtn: !!document.getElementById("btn-import")
      };
    })()`);
    assert("Scout store on window after reload", boot.store === "object");
    assert("persistence across reload", boot.count >= 3, "count=" + boot.count);
    assert("scout markers on map", boot.marks >= 3, "marks=" + boot.marks);
    assert("Save Scout Spot control in DOM", !!boot.saveBtn);
    assert("Scout HUD in DOM", !!boot.hud);
    assert("Inspect remains", !!boot.inspect);
    assert("Search Areas remains", !!boot.searchBtn);
    assert("Import JSON remains", !!boot.importBtn);

    const areasOff = await evalExpr(`(() => {
      var btn = document.getElementById("btn-search-areas");
      if (btn && btn.getAttribute("aria-pressed") === "true") btn.click();
      var marks = document.querySelectorAll(".sheds-scout-mark").length;
      return { pressed: btn && btn.getAttribute("aria-pressed"), marks: marks };
    })()`);
    assert("markers remain with Search Areas off", areasOff.marks >= 3, JSON.stringify(areasOff));

    const areasOn = await evalExpr(`(() => {
      var btn = document.getElementById("btn-search-areas");
      if (btn && btn.getAttribute("aria-pressed") !== "true") btn.click();
      var marks = document.querySelectorAll(".sheds-scout-mark").length;
      return { pressed: btn && btn.getAttribute("aria-pressed"), marks: marks };
    })()`);
    assert("markers remain with Search Areas on", areasOn.marks >= 3 && areasOn.pressed === "true", JSON.stringify(areasOn));

    const saved = await evalExpr(`(() => {
      var map = window.__SHEDS_MAP__;
      document.getElementById("btn-inspect-point").click();
      var c = map.getCenter();
      map.fire("click", { latlng: c });
      var actions = document.getElementById("inspect-scout-actions");
      var save = document.getElementById("btn-save-scout-spot");
      var before = window.WaypointShedsScoutSpots.list().length;
      save.click();
      var after = window.WaypointShedsScoutSpots.list().length;
      var hud = document.getElementById("scout-hud");
      return {
        actionsVisible: actions && !actions.hasAttribute("hidden"),
        saveH: save ? Math.round(save.getBoundingClientRect().height) : 0,
        added: after === before + 1,
        hudOpen: hud && !hud.hasAttribute("hidden"),
        inspectClosed: document.getElementById("inspect-hud").hasAttribute("hidden")
      };
    })()`);
    assert("Save Scout Spot from Inspect", !!saved.actionsVisible && !!saved.added, JSON.stringify(saved));
    assert("Scout card opens after save", !!saved.hudOpen);
    assert("Inspect closes after save", !!saved.inspectClosed);
    assert("Save control is touch-sized", saved.saveH >= 40, "h=" + saved.saveH);

    const statusFlow = await evalExpr(`(() => {
      var S = window.WaypointShedsScoutSpots;
      var App = window.WaypointShedsMapApp;
      App.openScoutSpot("spot_seed_plan");
      document.querySelector('[data-scout-status="Checked"]').click();
      var checked = S.getById("spot_seed_plan").status;
      document.querySelector('[data-scout-status="Revisit"]').click();
      var revisit = S.getById("spot_seed_plan").status;
      var name = document.getElementById("scout-name");
      name.value = "Geneva bench";
      name.dispatchEvent(new Event("change", { bubbles: true }));
      var note = document.getElementById("scout-note");
      note.value = "Re-check after melt.";
      note.dispatchEvent(new Event("change", { bubbles: true }));
      var renamed = S.getById("spot_seed_plan");
      return {
        checked: checked,
        revisit: revisit,
        name: renamed.name,
        note: renamed.note
      };
    })()`);
    assert("status Checked then Revisit", statusFlow.checked === "Checked" && statusFlow.revisit === "Revisit", JSON.stringify(statusFlow));
    assert("rename", statusFlow.name === "Geneva bench");
    assert("note editing", /melt/.test(statusFlow.note));

    const missing = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openScoutSpot("spot_seed_checked");
      var body = document.getElementById("scout-body").textContent;
      var saved = document.getElementById("scout-saved-body").textContent;
      var today = document.getElementById("scout-today-body").textContent;
      return {
        terrainUnavailable: /unavailable/i.test(body) && !/Search priority: Moderate/.test(body),
        savedHistorical: /unavailable|when this Scout Spot was saved/i.test(saved),
        todaySeparate: /separate from the saved snapshot/i.test(today),
        honesty: /search guide, not evidence/.test(document.getElementById("scout-field-note").textContent)
      };
    })()`);
    assert("missing terrain is not Moderate", !!missing.terrainUnavailable, JSON.stringify(missing));
    assert("missing saved Today is honest", !!missing.savedHistorical);
    assert("live Today stays labeled separate", !!missing.todaySeparate);
    assert("field note on scout card", !!missing.honesty);

    const del = await evalExpr(`(() => {
      var id = "spot_seed_revisit";
      var before = window.WaypointShedsScoutSpots.list().length;
      window.WaypointShedsScoutSpots.remove(id);
      window.WaypointShedsMapApp.refreshScoutSpots();
      return {
        gone: !window.WaypointShedsScoutSpots.getById(id),
        count: window.WaypointShedsScoutSpots.list().length,
        marks: document.querySelectorAll(".sheds-scout-mark").length,
        dropped: window.WaypointShedsScoutSpots.list().length === before - 1
      };
    })()`);
    assert("delete removes persistence and marker", !!del.gone && !!del.dropped, JSON.stringify(del));

    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true
      });
      await delay(350);
      const scoutMetrics = await evalExpr(`(() => {
        window.dispatchEvent(new Event("resize"));
        var map = window.__SHEDS_MAP__;
        if (map) map.invalidateSize();
        document.getElementById("inspect-hud").setAttribute("hidden", "");
        document.getElementById("sheds-map-shell").classList.remove("is-inspecting");
        window.WaypointShedsMapApp.openScoutSpot("spot_seed_plan");
        var hud = document.getElementById("scout-hud");
        var done = document.getElementById("btn-scout-close");
        var doc = document.documentElement;
        var hudBox = hud.getBoundingClientRect();
        var doneBox = done.getBoundingClientRect();
        var nameBox = document.getElementById("scout-name").getBoundingClientRect();
        var noteBox = document.getElementById("scout-note").getBoundingClientRect();
        var statusBtns = Array.prototype.map.call(document.querySelectorAll("[data-scout-status]"), function (b) {
          return Math.round(b.getBoundingClientRect().height);
        });
        return {
          overflowX: doc.scrollWidth > doc.clientWidth + 2,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hudOverflow: hudBox.width > window.innerWidth + 2,
          hudHeight: Math.round(hudBox.height),
          doneReachable: doneBox.top >= 0 && doneBox.bottom <= window.innerHeight + 2 && doneBox.height >= 40,
          nameOverflow: nameBox.right > window.innerWidth + 2,
          noteOverflow: noteBox.right > window.innerWidth + 2,
          statusMin: Math.min.apply(null, statusBtns),
          hudCoversMap: hudBox.height > window.innerHeight * 0.92
        };
      })()`);
      assert(vp.name + " no page horizontal overflow", !scoutMetrics.overflowX, "scroll=" + scoutMetrics.scrollWidth + " client=" + scoutMetrics.clientWidth);
      assert(vp.name + " scout card not wider than viewport", !scoutMetrics.hudOverflow);
      assert(vp.name + " Done reachable", !!scoutMetrics.doneReachable, JSON.stringify(scoutMetrics));
      assert(vp.name + " name/note no overflow", !scoutMetrics.nameOverflow && !scoutMetrics.noteOverflow);
      assert(vp.name + " status buttons touch-sized", scoutMetrics.statusMin >= 40, "min=" + scoutMetrics.statusMin);
      assert(vp.name + " card does not cover entire map", !scoutMetrics.hudCoversMap, "h=" + scoutMetrics.hudHeight);
      if (vp.width === 320) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(ART, "v14_mobile_320_scout_card.png"), Buffer.from(shot.data, "base64"));
      }
      if (vp.width === 390) {
        await evalExpr(`(() => {
          window.WaypointShedsMapApp.closeScoutHud();
          document.getElementById("inspect-hud").setAttribute("hidden", "");
          document.getElementById("sheds-map-shell").classList.remove("is-inspecting");
          return true;
        })()`);
        await delay(200);
        const shot = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(ART, "v14_mobile_390_map.png"), Buffer.from(shot.data, "base64"));
      }
      const saveMetrics = await evalExpr(`(() => {
        window.WaypointShedsMapApp.closeScoutHud();
        document.getElementById("btn-inspect-point").click();
        var wrap = document.getElementById("inspect-scout-actions");
        wrap.removeAttribute("hidden");
        var save = document.getElementById("btn-save-scout-spot");
        var box = save.getBoundingClientRect();
        return {
          saveReachable: box.height >= 40 && box.left >= -2 && box.right <= window.innerWidth + 2,
          h: Math.round(box.height)
        };
      })()`);
      assert(vp.name + " Save reachable size", !!saveMetrics.saveReachable, "h=" + saveMetrics.h);
    }

    ws.close();
  } finally {
    try { proc.kill("SIGKILL"); } catch (e) { /* */ }
    server.close();
  }

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s):\n" + failures.map((f) => " - " + f).join("\n"));
    process.exit(1);
  }
  console.log("\nSheds V1.4 map mobile tests passed.");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
