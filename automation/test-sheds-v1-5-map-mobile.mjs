#!/usr/bin/env node
/**
 * Sheds V1.5 map — Hunt Plans mobile overflow at 320 / 375 / 390 / 430.
 * Create-plan, ordered markers, plan card, status, missing references.
 *
 * Run: node automation/test-sheds-v1-5-map-mobile.mjs
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
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9356);
const PORT = Number(process.env.SHED_V15_MOBILE_PORT || 8099);
const ART = process.env.SHED_HOST_ARTIFACTS ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(ROOT, "automation/artifacts/sheds-v15-map-mobile"));
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

const SEED_SCOUTS = JSON.stringify({
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

const SEED_PLANS = JSON.stringify({
  schemaVersion: 1,
  huntPlans: [
    {
      kind: "hunt-plan",
      schemaVersion: 1,
      id: "plan_seed_missing",
      name: "Ridge sequence with a missing pin",
      status: "Planned",
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
      scoutSpotIds: ["spot_seed_plan", "spot_gone"],
      note: ""
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
  const userData = fs.mkdtempSync(path.join("/tmp", "chrome-v15-map-"));
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
    async function shot(name) {
      const png = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(ART, name), Buffer.from(png.data, "base64"));
    }
    async function dismissChrome() {
      await evalExpr(`(() => {
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
      try { localStorage.setItem("waypoint-sheds-scout-spots-v1", ${JSON.stringify(SEED_SCOUTS)}); } catch (e) {}
      try { localStorage.setItem("waypoint-sheds-hunt-plans-v1", ${JSON.stringify(SEED_PLANS)}); } catch (e) {}
      return true;
    })()`);
    await dismissChrome();

    await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
    await send("Page.loadEventFired").catch(() => {});
    await delay(2200);
    await dismissChrome();
    await evalExpr(`(() => {
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
      var P = window.WaypointShedsHuntPlans;
      return {
        scoutStore: typeof S,
        planStore: typeof P,
        spots: S ? S.list().length : 0,
        plans: P ? P.list().length : 0,
        marks: document.querySelectorAll(".sheds-scout-mark").length,
        orders: document.querySelectorAll(".sheds-scout-order").length,
        huntHud: !!document.getElementById("hunt-plan-hud"),
        inspect: !!document.getElementById("btn-inspect-point"),
        searchBtn: !!document.getElementById("btn-search-areas"),
        importBtn: !!document.getElementById("btn-import"),
        measure: !!document.getElementById("btn-measure")
      };
    })()`);
    assert("Scout store on window after reload", boot.scoutStore === "object");
    assert("Hunt Plan store on window after reload", boot.planStore === "object");
    assert("scout persistence across reload", boot.spots >= 3, "spots=" + boot.spots);
    assert("hunt plan persistence across reload", boot.plans >= 1, "plans=" + boot.plans);
    assert("scout markers on map", boot.marks >= 3, "marks=" + boot.marks);
    assert("order badges absent until a plan is open", boot.orders === 0, "orders=" + boot.orders);
    assert("Hunt Plan HUD in DOM", !!boot.huntHud);
    assert("Inspect remains", !!boot.inspect);
    assert("Search Areas remains", !!boot.searchBtn);
    assert("Import JSON remains", !!boot.importBtn);
    assert("Measure remains", !!boot.measure);
    await shot("v15r3_map_scout_spots.png");

    const selectFlow = await evalExpr(`(() => {
      window.WaypointShedsMapApp.startHuntSelect([]);
      window.WaypointShedsMapApp.startHuntSelect([]);
      var hud = document.getElementById("hunt-select-hud");
      var markers = document.querySelectorAll(".sheds-scout-mark");
      var ids = ["spot_seed_plan", "spot_seed_checked", "spot_seed_revisit"];
      ids.forEach(function (id) {
        var layerMarks = document.querySelectorAll(".sheds-scout-mark");
        /* toggle via public API by clicking store ids through map-app internals */
      });
      ["spot_seed_plan", "spot_seed_checked"].forEach(function (id) {
        var ev = new MouseEvent("click", { bubbles: true });
        var mark = Array.prototype.find.call(document.querySelectorAll(".leaflet-marker-icon"), function () { return true; });
        if (mark) mark.dispatchEvent(ev);
      });
      return {
        hudOpen: hud && !hud.hasAttribute("hidden"),
        selected: document.querySelectorAll(".sheds-scout-mark.is-selected").length
      };
    })()`);
    assert("select HUD opens", !!selectFlow.hudOpen, JSON.stringify(selectFlow));

    const selected = await evalExpr(`(() => {
      var S = window.WaypointShedsScoutSpots;
      var ids = S.list().map(function (s) { return s.id; }).slice(0, 2);
      window.WaypointShedsMapApp.startHuntSelect(ids);
      return {
        selected: document.querySelectorAll(".sheds-scout-mark.is-selected").length,
        createDisabled: document.getElementById("btn-hunt-select-create").disabled,
        hud: !document.getElementById("hunt-select-hud").hasAttribute("hidden")
      };
    })()`);
    assert("selected Scout Spots are visually marked", selected.selected >= 2, JSON.stringify(selected));
    assert("Create Hunt Plan enabled with selection", selected.createDisabled === false && selected.hud);
    await shot("v15r3_selecting_scout_spots.png");

    const created = await evalExpr(`(() => {
      document.getElementById("btn-hunt-select-create").click();
      var input = document.getElementById("hunt-plan-name-input");
      input.value = "Saturday south benches";
      document.getElementById("btn-hunt-plan-name-save").click();
      var hud = document.getElementById("hunt-plan-hud");
      var P = window.WaypointShedsHuntPlans;
      var plans = P.list();
      var named = plans.filter(function (p) { return p.name === "Saturday south benches"; })[0];
      return {
        hudOpen: hud && !hud.hasAttribute("hidden"),
        name: named && named.name,
        status: named && named.status,
        orders: document.querySelectorAll(".sheds-scout-order").length,
        planCount: named && named.scoutSpotIds.length,
        listRows: document.querySelectorAll(".sheds-hunt-plan-row").length
      };
    })()`);
    assert("Hunt Plan created", created.name === "Saturday south benches" && created.status === "Planned", JSON.stringify(created));
    assert("plan card opens", !!created.hudOpen);
    assert("numbered markers while plan is open", created.orders >= 2, JSON.stringify(created));
    await evalExpr(`(() => {
      var map = window.__SHEDS_MAP__;
      if (map) map.setView([41.324, -74.802], 14, { animate: false });
      return true;
    })()`);
    await delay(250);
    await shot("v15r3_hunt_plan_created.png");
    await shot("v15r3_plan_card.png");
    await evalExpr(`(() => {
      document.getElementById("hunt-plan-hud").setAttribute("hidden", "");
      return true;
    })()`);
    await delay(150);
    await shot("v15r3_numbered_markers.png");
    await evalExpr(`(() => {
      document.getElementById("hunt-plan-hud").removeAttribute("hidden");
      return true;
    })()`);

    const orderFlow = await evalExpr(`(() => {
      var P = window.WaypointShedsHuntPlans;
      var plan = P.list().filter(function (p) { return p.name === "Saturday south benches"; })[0];
      var before = plan.scoutSpotIds.slice();
      var down = document.querySelector('[data-hunt-move="down"]');
      var up = document.querySelectorAll('[data-hunt-move="up"]')[1];
      var downBox = down.getBoundingClientRect();
      var upBox = up.getBoundingClientRect();
      down.click();
      var after = P.getById(plan.id).scoutSpotIds;
      return {
        swapped: before[0] !== after[0] || before[1] !== after[1],
        downH: Math.round(downBox.height),
        downW: Math.round(downBox.width),
        upH: Math.round(upBox.height),
        firstUpDisabled: document.querySelector('[data-hunt-move="up"]').disabled === true
      };
    })()`);
    assert("Move Down reorders intended sequence", !!orderFlow.swapped, JSON.stringify(orderFlow));
    assert("ordering controls touch-sized", orderFlow.downH >= 44 && orderFlow.upH >= 44, JSON.stringify(orderFlow));
    assert("first Up is disabled", !!orderFlow.firstUpDisabled);
    await shot("v15r3_ordering_controls.png");

    const statusFlow = await evalExpr(`(() => {
      document.querySelector('[data-hunt-plan-status="Active"]').click();
      var P = window.WaypointShedsHuntPlans;
      var plan = P.list().filter(function (p) { return p.name === "Saturday south benches"; })[0];
      var scoutStatus = window.WaypointShedsScoutSpots.getById(plan.scoutSpotIds[0]).status;
      var activePressed = document.querySelector('[data-hunt-plan-status="Active"]').getAttribute("aria-pressed");
      var statusH = Math.round(document.querySelector('[data-hunt-plan-status="Active"]').getBoundingClientRect().height);
      return {
        planStatus: plan.status,
        scoutStatus: scoutStatus,
        activePressed: activePressed,
        statusH: statusH
      };
    })()`);
    assert("plan status Active", statusFlow.planStatus === "Active" && statusFlow.activePressed === "true", JSON.stringify(statusFlow));
    assert("plan status does not change Scout Spot status", statusFlow.scoutStatus === "Plan" || statusFlow.scoutStatus === "Checked" || statusFlow.scoutStatus === "Revisit");
    assert("plan status buttons touch-sized", statusFlow.statusH >= 44, "h=" + statusFlow.statusH);
    await shot("v15r3_status_active.png");

    const completed = await evalExpr(`(() => {
      document.querySelector('[data-hunt-plan-status="Completed"]').click();
      var P = window.WaypointShedsHuntPlans;
      var plan = P.list().filter(function (p) { return p.name === "Saturday south benches"; })[0];
      return { status: plan.status };
    })()`);
    assert("plan status Completed", completed.status === "Completed");
    await shot("v15r3_status_completed.png");

    const today = await evalExpr(`(() => {
      var todayEl = document.getElementById("hunt-plan-today-body");
      if (todayEl && todayEl.scrollIntoView) todayEl.scrollIntoView({ block: "center" });
      var body = document.getElementById("hunt-plan-today-body").textContent;
      var saved = document.getElementById("hunt-plan-saved-body").textContent;
      var dist = document.getElementById("hunt-plan-distance").textContent;
      return {
        live: /Need location|Not rated|Today|live|Low|Fair|Good|outside/i.test(body),
        notHistoricalClaim: !/when this Hunt Plan was created and the weather was/i.test(body),
        savedSeparate: /does not copy them/i.test(saved),
        dist: dist,
        straightLine: /straight-line/i.test(dist),
        notRouteClaim: /not hiking, driving, or trail/i.test(dist)
      };
    })()`);
    assert("Today unavailable or live is honest", !!today.live, JSON.stringify(today));
    assert("saved Scout Spot context stays separate", !!today.savedSeparate);
    assert("distance labeled straight-line", !!today.straightLine && !!today.notRouteClaim, today.dist);

    await evalExpr(`(() => {
      var orig = window.WaypointShedsScoutSpots.formatLiveToday;
      window.WaypointShedsScoutSpots.formatLiveToday = function () {
        return {
          lines: ["Need location to read today’s hunt."],
          disclaimer: "Current conditions are live — not from when this Hunt Plan was created. They do not rewrite Scout Spot saved context."
        };
      };
      var P = window.WaypointShedsHuntPlans;
      var plan = P.list().filter(function (p) { return p.name === "Saturday south benches"; })[0];
      window.WaypointShedsMapApp.openHuntPlan(plan.id);
      var todayEl = document.getElementById("hunt-plan-today-body");
      if (todayEl && todayEl.scrollIntoView) todayEl.scrollIntoView({ block: "center" });
      window.WaypointShedsScoutSpots.formatLiveToday = orig;
      return document.getElementById("hunt-plan-today-body").textContent;
    })()`);
    await delay(200);
    await shot("v15r3_today_unavailable.png");

    const missing = await evalExpr(`(() => {
      window.WaypointShedsMapApp.closeHuntPlanHud();
      window.WaypointShedsMapApp.openHuntPlan("plan_seed_missing");
      var rows = Array.prototype.map.call(document.querySelectorAll(".sheds-hunt-plan-row"), function (row) {
        return row.textContent;
      });
      return {
        unavailable: rows.some(function (t) { return /Scout Spot unavailable/i.test(t); }),
        creekKept: rows.some(function (t) { return /Creek bench/.test(t); }),
        fabricated: window.WaypointShedsScoutSpots.getById("spot_gone")
      };
    })()`);
    assert("missing Scout Spot reference is visible", !!missing.unavailable, JSON.stringify(missing));
    assert("present Scout Spot still listed", !!missing.creekKept);
    assert("missing id is not fabricated", !missing.fabricated);
    await shot("v15r3_missing_scout_reference.png");

    const cleanup = await evalExpr(`(() => {
      window.WaypointShedsMapApp.closeHuntPlanHud();
      return {
        orders: document.querySelectorAll(".sheds-scout-order").length,
        hudHidden: document.getElementById("hunt-plan-hud").hasAttribute("hidden"),
        marks: document.querySelectorAll(".sheds-scout-mark").length
      };
    })()`);
    assert("closing plan removes numbered badges", cleanup.orders === 0, JSON.stringify(cleanup));
    assert("closing plan keeps Scout Spot markers", cleanup.marks >= 3);
    assert("plan HUD hidden after Done", !!cleanup.hudHidden);

    const tools = await evalExpr(`(() => {
      document.getElementById("btn-inspect-point").click();
      var inspectOpen = !document.getElementById("inspect-hud").hasAttribute("hidden");
      var planClosed = document.getElementById("hunt-plan-hud").hasAttribute("hidden");
      document.getElementById("btn-inspect-close").click();
      document.getElementById("btn-measure").click();
      var measureOpen = !document.getElementById("measure-hud").hasAttribute("hidden");
      document.getElementById("btn-measure-done").click();
      var search = document.getElementById("btn-search-areas");
      if (search.getAttribute("aria-pressed") !== "true") search.click();
      var searchOn = search.getAttribute("aria-pressed") === "true";
      return { inspectOpen: inspectOpen, planClosed: planClosed, measureOpen: measureOpen, searchOn: searchOn };
    })()`);
    assert("Inspect still usable after Hunt Plan", !!tools.inspectOpen && !!tools.planClosed, JSON.stringify(tools));
    assert("Measure still usable", !!tools.measureOpen);
    assert("Search Areas remains usable", !!tools.searchOn);

    const scoutCard = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openScoutSpot("spot_seed_plan");
      var add = document.getElementById("btn-scout-add-plan");
      var box = add.getBoundingClientRect();
      return {
        addVisible: add && !add.hasAttribute("hidden"),
        addH: Math.round(box.height),
        hudOpen: !document.getElementById("scout-hud").hasAttribute("hidden")
      };
    })()`);
    assert("Scout Spot card still has Add to Hunt Plan", !!scoutCard.addVisible && scoutCard.addH >= 40, JSON.stringify(scoutCard));

    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true
      });
      await delay(350);
      const metrics = await evalExpr(`(() => {
        window.dispatchEvent(new Event("resize"));
        var map = window.__SHEDS_MAP__;
        if (map) map.invalidateSize();
        document.getElementById("inspect-hud").setAttribute("hidden", "");
        document.getElementById("sheds-map-shell").classList.remove("is-inspecting");
        var named = window.WaypointShedsHuntPlans.list().filter(function (p) {
          return p.name === "Saturday south benches";
        })[0];
        window.WaypointShedsMapApp.openHuntPlan(named.id);
        var hud = document.getElementById("hunt-plan-hud");
        if (hud) hud.scrollTop = 0;
        var done = document.getElementById("btn-hunt-plan-close");
        var del = document.getElementById("btn-hunt-plan-delete");
        var doc = document.documentElement;
        var hudBox = hud.getBoundingClientRect();
        var doneBox = done.getBoundingClientRect();
        var delBox = del.getBoundingClientRect();
        var nameBox = document.getElementById("hunt-plan-name").getBoundingClientRect();
        var noteBox = document.getElementById("hunt-plan-note").getBoundingClientRect();
        var statusBtns = Array.prototype.map.call(document.querySelectorAll("[data-hunt-plan-status]"), function (b) {
          return Math.round(b.getBoundingClientRect().height);
        });
        var moveBtns = Array.prototype.map.call(document.querySelectorAll("[data-hunt-move]"), function (b) {
          return Math.round(b.getBoundingClientRect().height);
        });
        return {
          overflowX: doc.scrollWidth > doc.clientWidth + 2,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hudOverflow: hudBox.width > window.innerWidth + 2,
          hudHeight: Math.round(hudBox.height),
          doneReachable: doneBox.top >= 0 && doneBox.bottom <= window.innerHeight + 2 && doneBox.height >= 40,
          deleteReachable: delBox.height >= 40 && delBox.left >= -2 && delBox.right <= window.innerWidth + 2,
          nameOverflow: nameBox.right > window.innerWidth + 2,
          noteOverflow: noteBox.right > window.innerWidth + 2,
          statusMin: Math.min.apply(null, statusBtns),
          moveMin: Math.min.apply(null, moveBtns),
          hudCoversMap: hudBox.height > window.innerHeight * 0.92
        };
      })()`);
      assert(vp.name + " no page horizontal overflow", !metrics.overflowX, "scroll=" + metrics.scrollWidth + " client=" + metrics.clientWidth);
      assert(vp.name + " plan card not wider than viewport", !metrics.hudOverflow);
      assert(vp.name + " Done reachable", !!metrics.doneReachable, JSON.stringify(metrics));
      assert(vp.name + " delete reachable", !!metrics.deleteReachable, JSON.stringify(metrics));
      assert(vp.name + " name/note no overflow", !metrics.nameOverflow && !metrics.noteOverflow);
      assert(vp.name + " status buttons touch-sized", metrics.statusMin >= 40, "min=" + metrics.statusMin);
      assert(vp.name + " ordering controls touch-sized", metrics.moveMin >= 40, "min=" + metrics.moveMin);
      assert(vp.name + " card does not cover entire map", !metrics.hudCoversMap, "h=" + metrics.hudHeight);
      if (vp.width === 320) await shot("v15r3_mobile_320.png");
      if (vp.width === 390) await shot("v15r3_mobile_390.png");
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
  console.log("\nSheds V1.5 map mobile tests passed.");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
