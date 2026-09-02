#!/usr/bin/env node
/**
 * Sheds V1.6 map — Field Hunt Mode mobile HUD at 320 / 375 / 390 / 430.
 * Run: node automation/test-sheds-v1-6-map-mobile.mjs
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
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9361);
const PORT = Number(process.env.SHED_V16_MOBILE_PORT || 8102);
const ART = process.env.SHED_HOST_ARTIFACTS ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(ROOT, "automation/artifacts/sheds-v16-map-mobile"));
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
      id: "spot_v16_a",
      name: "Oak Bench",
      status: "Plan",
      location: { lat: 41.325, lng: -74.802 },
      terrain: { available: true, status: "ready", searchPriority: "Higher", featureLabel: "Gentle bench." }
    },
    {
      id: "spot_v16_b",
      name: "South slope",
      status: "Plan",
      location: { lat: 41.327, lng: -74.798 },
      terrain: { available: false, status: "unavailable", searchPriority: null }
    },
    {
      id: "spot_v16_c",
      name: "North draw",
      status: "Plan",
      location: { lat: 41.322, lng: -74.805 },
      terrain: { available: true, status: "ready", searchPriority: "Lower", featureLabel: "Steep north-facing terrain." }
    }
  ]
});

const SEED_PLANS = JSON.stringify({
  schemaVersion: 1,
  huntPlans: [{
    kind: "hunt-plan",
    schemaVersion: 1,
    id: "plan_v16_field",
    name: "Ridge North",
    status: "Planned",
    scoutSpotIds: ["spot_v16_a", "spot_v16_b", "spot_v16_c"],
    note: ""
  }]
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
  const userData = fs.mkdtempSync(path.join("/tmp", "chrome-v16-map-"));
  const proc = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
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
      const msg = JSON.parse(String(raw));
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
      if (res && res.exceptionDetails) throw new Error(res.exceptionDetails.text || "evaluate failed");
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
    await delay(2000);
    await evalExpr(`(() => {
      try { localStorage.setItem("waypoint-sheds-ethics-seen-v1", "1"); } catch (e) {}
      try { localStorage.setItem("waypoint-sheds-first-run-coach-v1", "1"); } catch (e) {}
      try { localStorage.setItem("waypoint-sheds-scout-spots-v1", ${JSON.stringify(SEED_SCOUTS)}); } catch (e) {}
      try { localStorage.setItem("waypoint-sheds-hunt-plans-v1", ${JSON.stringify(SEED_PLANS)}); } catch (e) {}
      return true;
    })()`);
    await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
    await send("Page.loadEventFired").catch(() => {});
    await delay(2200);
    await dismissChrome();

    const boot = await evalExpr(`(() => {
      return {
        session: typeof window.WaypointShedsHuntSession,
        start: !!document.getElementById("btn-hunt-plan-start"),
        hud: !!document.getElementById("field-hunt-hud"),
        inspect: !!document.getElementById("btn-inspect-point"),
        measure: !!document.getElementById("btn-measure"),
        importBtn: !!document.getElementById("btn-import"),
        search: !!document.getElementById("btn-search-areas")
      };
    })()`);
    assert("Hunt Session on window", boot.session === "object");
    assert("Start Hunt in DOM", !!boot.start);
    assert("Field Hunt HUD in DOM", !!boot.hud);
    assert("Inspect remains", !!boot.inspect);
    assert("Measure remains", !!boot.measure);
    assert("Import JSON remains", !!boot.importBtn);
    assert("Search Areas remains", !!boot.search);

    const started = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openHuntPlan("plan_v16_field");
      var start = document.getElementById("btn-hunt-plan-start");
      var startBox = start.getBoundingClientRect();
      start.click();
      var hud = document.getElementById("field-hunt-hud");
      var sess = window.WaypointShedsHuntSession.get();
      var aStatus = window.WaypointShedsScoutSpots.getById("spot_v16_a").status;
      var pStatus = window.WaypointShedsHuntPlans.getById("plan_v16_field").status;
      return {
        hudOpen: hud && !hud.hasAttribute("hidden"),
        startH: Math.round(startBox.height),
        active: sess && sess.activeScoutSpotId,
        scoutUnchanged: aStatus === "Plan",
        planUnchanged: pStatus === "Planned",
        kicker: (document.getElementById("field-hunt-kicker") || {}).textContent,
        progress: (document.getElementById("field-hunt-progress") || {}).textContent,
        loc: (document.getElementById("field-hunt-location") || {}).textContent,
        dist: (document.getElementById("field-hunt-distance") || {}).textContent,
        activeMark: document.querySelectorAll(".sheds-scout-mark.is-field-active").length,
        orders: document.querySelectorAll(".sheds-scout-order").length
      };
    })()`);
    assert("Start Hunt opens Field Mode", !!started.hudOpen, JSON.stringify(started));
    assert("Start Hunt touch-sized", started.startH >= 40, "h=" + started.startH);
    assert("Scout Spot unchanged on start", !!started.scoutUnchanged);
    assert("Hunt Plan unchanged on start", !!started.planUnchanged);
    assert("progress visible", /0 of 3/.test(started.progress || ""), started.progress);
    assert("location unavailable is honest", /Location unavailable/i.test(started.loc || ""), started.loc);
    assert("no fabricated distance", /not shown|not invented|unavailable|needs your current location/i.test(started.dist || ""), started.dist);
    assert("active Scout Spot marked", started.activeMark >= 1 && started.orders >= 3, JSON.stringify(started));
    await shot("v16_field_hunt_started.png");

    const actions = await evalExpr(`(() => {
      document.getElementById("btn-field-hunt-checked").click();
      var st = window.WaypointShedsScoutSpots.getById("spot_v16_a").status;
      document.getElementById("btn-field-hunt-next").click();
      var sess = window.WaypointShedsHuntSession.get();
      document.getElementById("btn-field-hunt-revisit").click();
      var stB = window.WaypointShedsScoutSpots.getById(sess.activeScoutSpotId).status;
      var progress = document.getElementById("field-hunt-progress").textContent;
      return { checked: st, revisit: stB, active: sess.activeScoutSpotId, progress: progress };
    })()`);
    assert("Checked mutates Scout Spot", actions.checked === "Checked");
    assert("Next Spot advances", actions.active === "spot_v16_b", JSON.stringify(actions));
    assert("Revisit mutates Scout Spot", actions.revisit === "Revisit");
    assert("progress counts Checked only", /1 of 3/.test(actions.progress || ""), actions.progress);

    const finished = await evalExpr(`(() => {
      var planStatus = window.WaypointShedsHuntPlans.getById("plan_v16_field").status;
      window.WaypointShedsMapApp.finishFieldHunt();
      return {
        session: window.WaypointShedsHuntSession.get(),
        fieldHidden: document.getElementById("field-hunt-hud").hasAttribute("hidden"),
        planHud: !document.getElementById("hunt-plan-hud").hasAttribute("hidden"),
        planStatus: window.WaypointShedsHuntPlans.getById("plan_v16_field").status,
        planStatusBefore: planStatus,
        checkedKept: window.WaypointShedsScoutSpots.getById("spot_v16_a").status === "Checked"
      };
    })()`);
    assert("Finish Hunt ends session", !finished.session && !!finished.fieldHidden, JSON.stringify(finished));
    assert("Finish returns to Hunt Plan", !!finished.planHud);
    assert("Finish does not auto-complete plan", finished.planStatus === finished.planStatusBefore);
    assert("Scout edits persist after finish", !!finished.checkedKept);

    const resume = await evalExpr(`(() => {
      document.getElementById("btn-hunt-plan-start").click();
      return {
        open: !document.getElementById("field-hunt-hud").hasAttribute("hidden"),
        label: document.getElementById("btn-hunt-plan-start").textContent
      };
    })()`);
    assert("Resume Hunt works", !!resume.open);

    const tools = await evalExpr(`(() => {
      window.WaypointShedsMapApp.finishFieldHunt();
      document.getElementById("btn-inspect-point").click();
      var inspectOpen = !document.getElementById("inspect-hud").hasAttribute("hidden");
      document.getElementById("btn-inspect-close").click();
      document.getElementById("btn-measure").click();
      var measureOpen = !document.getElementById("measure-hud").hasAttribute("hidden");
      document.getElementById("btn-measure-done").click();
      return { inspectOpen: inspectOpen, measureOpen: measureOpen };
    })()`);
    assert("Inspect still usable", !!tools.inspectOpen);
    assert("Measure still usable", !!tools.measureOpen);

    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true
      });
      await delay(350);
      const metrics = await evalExpr(`(() => {
        window.dispatchEvent(new Event("resize"));
        var map = window.__SHEDS_MAP__;
        if (map) map.invalidateSize();
        window.WaypointShedsMapApp.openHuntPlan("plan_v16_field");
        document.getElementById("btn-hunt-plan-start").click();
        var hud = document.getElementById("field-hunt-hud");
        var doc = document.documentElement;
        var hudBox = hud.getBoundingClientRect();
        var finish = document.getElementById("btn-field-hunt-finish").getBoundingClientRect();
        var checked = document.getElementById("btn-field-hunt-checked").getBoundingClientRect();
        var revisit = document.getElementById("btn-field-hunt-revisit").getBoundingClientRect();
        var note = document.getElementById("btn-field-hunt-note").getBoundingClientRect();
        var next = document.getElementById("btn-field-hunt-next").getBoundingClientRect();
        var mapEl = document.querySelector(".leaflet-container").getBoundingClientRect();
        function inHud(box) {
          return box.height >= 40 && box.top >= hudBox.top - 2 && box.bottom <= hudBox.bottom + 2 &&
            box.left >= -2 && box.right <= window.innerWidth + 2 && box.bottom <= window.innerHeight + 2;
        }
        return {
          overflowX: doc.scrollWidth > doc.clientWidth + 2,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hudOverflow: hudBox.width > window.innerWidth + 2,
          hudHeight: Math.round(hudBox.height),
          finishH: Math.round(finish.height),
          finishReachable: finish.height >= 40 && finish.top >= -2 && finish.bottom <= window.innerHeight + 2,
          checkedH: Math.round(checked.height),
          checkedVisible: inHud(checked),
          revisitH: Math.round(revisit.height),
          revisitVisible: inHud(revisit),
          noteH: Math.round(note.height),
          noteVisible: inHud(note),
          nextH: Math.round(next.height),
          nextVisible: inHud(next),
          coversMap: hudBox.height > window.innerHeight * 0.78,
          mapH: Math.round(mapEl.height)
        };
      })()`);
      assert(vp.name + " no page horizontal overflow", !metrics.overflowX, "scroll=" + metrics.scrollWidth + " client=" + metrics.clientWidth);
      assert(vp.name + " field HUD not wider than viewport", !metrics.hudOverflow);
      assert(vp.name + " Finish reachable", !!metrics.finishReachable && metrics.finishH >= 40, JSON.stringify(metrics));
      assert(vp.name + " Checked touch-sized", metrics.checkedH >= 40 && !!metrics.checkedVisible, JSON.stringify(metrics));
      assert(vp.name + " Revisit touch-sized", metrics.revisitH >= 40 && !!metrics.revisitVisible, JSON.stringify(metrics));
      assert(vp.name + " Quick Note touch-sized", metrics.noteH >= 40 && !!metrics.noteVisible, JSON.stringify(metrics));
      assert(vp.name + " Next Spot touch-sized", metrics.nextH >= 40 && !!metrics.nextVisible, JSON.stringify(metrics));
      assert(vp.name + " HUD does not cover the map", !metrics.coversMap, "h=" + metrics.hudHeight + " map=" + metrics.mapH);
      if (vp.width === 320) await shot("v16_mobile_320.png");
      if (vp.width === 375) await shot("v16_mobile_375.png");
      if (vp.width === 390) await shot("v16_mobile_390.png");
      if (vp.width === 430) await shot("v16_mobile_430.png");
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
  console.log("\nSheds V1.6 map mobile tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
