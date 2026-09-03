#!/usr/bin/env node
/**
 * Sheds V1.9 map — Hunt Detail conditions at 320 / 375 / 390 / 430.
 * Run: node automation/test-sheds-v1-9-map-mobile.mjs
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
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9364);
const PORT = Number(process.env.SHED_V19_MOBILE_PORT || 8105);
const ART = process.env.SHED_HOST_ARTIFACTS ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(ROOT, "automation/artifacts/sheds-v19-map-mobile"));
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
  scoutSpots: [{
    id: "spot_v19_a",
    name: "Oak Bench",
    status: "Plan",
    location: { lat: 41.325, lng: -74.802 },
    terrain: { available: true, status: "ready", searchPriority: "Higher", featureLabel: "Gentle bench." }
  }]
});

const SEED_PLANS = JSON.stringify({
  schemaVersion: 1,
  huntPlans: [{
    kind: "hunt-plan",
    schemaVersion: 1,
    id: "plan_v19_field",
    name: "Ridge North",
    status: "Planned",
    scoutSpotIds: ["spot_v19_a"],
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
  const userData = fs.mkdtempSync(path.join("/tmp", "chrome-v19-map-"));
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
      try { localStorage.removeItem("waypoint-sheds-hunt-records-v1"); } catch (e) {}
      return true;
    })()`);
    await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
    await send("Page.loadEventFired").catch(() => {});
    await delay(2200);
    await dismissChrome();

    const boot = await evalExpr(`(() => {
      return {
        snap: typeof window.WaypointShedsConditionSnapshot,
        svc: typeof window.WaypointShedsConditionService,
        records: typeof window.WaypointShedsHuntRecords,
        conditions: !!document.getElementById("hunt-detail-conditions"),
        inspect: !!document.getElementById("btn-inspect-point"),
        measure: !!document.getElementById("btn-measure"),
        importBtn: !!document.getElementById("btn-import"),
        history: !!document.getElementById("btn-history"),
        fieldHud: !!document.getElementById("field-hunt-hud")
      };
    })()`);
    assert("Condition Snapshot on window", boot.snap === "object");
    assert("Condition Service on window", boot.svc === "object");
    assert("Hunt Records on window", boot.records === "object");
    assert("Hunt Detail conditions in DOM", !!boot.conditions);
    assert("Inspect remains", !!boot.inspect);
    assert("Measure remains", !!boot.measure);
    assert("Import JSON remains", !!boot.importBtn);
    assert("Hunt History remains", !!boot.history);
    assert("Field Hunt HUD remains", !!boot.fieldHud);

    const seeded = await evalExpr(`(() => {
      var R = window.WaypointShedsHuntRecords;
      var Snap = window.WaypointShedsConditionSnapshot;
      R.persist({
        kind: "hunt-record",
        huntRecordId: "hrec_v19_legacy",
        huntPlanNameSnapshot: "Older walk",
        startedAt: "2026-08-01T10:00:00.000Z",
        finishedAt: "2026-08-01T11:00:00.000Z",
        trackPoints: [{ lat: 41.324, lng: -74.803, t: 1 }, { lat: 41.325, lng: -74.803, t: 20000 }],
        trackDistanceM: 111,
        trackDistanceAvailable: true,
        observations: []
      });
      var recorded = Snap.fromWeatherPackage({
        lat: 41.325,
        lng: -74.802,
        weather: {
          ready: true,
          tempC: -2.1,
          dailyMinC: -8.4,
          dailyMaxC: 1.2,
          precipMm24h: 1.5,
          snowfallSumCm: 0.4,
          snowDepthKnown: true,
          snowDepthM: 0.03,
          windSpeedMs: 3.2,
          freezeThaw: { status: "freeze_thaw", nightMinC: -8.4, dayMaxC: 1.2, deadbandC: 1, source: "daily" },
          snowCover: { status: "light", depthM: 0.03 },
          tempTrend: { status: "warming", deltaC: 2, lookbackHours: 48 }
        }
      });
      R.persist({
        kind: "hunt-record",
        huntRecordId: "hrec_v19_ok",
        huntPlanNameSnapshot: "Ridge North",
        startedAt: "2026-09-02T10:00:00.000Z",
        finishedAt: "2026-09-02T12:00:00.000Z",
        trackPoints: [{ lat: 41.325, lng: -74.802, t: 1 }, { lat: 41.326, lng: -74.802, t: 30000 }],
        trackDistanceM: 111,
        trackDistanceAvailable: true,
        observations: [{ id: "hobs_v19_s", type: "shed_found", createdAt: "2026-09-02T11:00:00.000Z", lat: 41.326, lng: -74.802, note: "Left side" }],
        conditionSnapshot: recorded
      });
      R.persist({
        kind: "hunt-record",
        huntRecordId: "hrec_v19_unavail",
        huntPlanNameSnapshot: "Fog morning",
        startedAt: "2026-08-15T09:00:00.000Z",
        finishedAt: "2026-08-15T10:00:00.000Z",
        trackPoints: [],
        trackDistanceAvailable: false,
        observations: [],
        conditionSnapshot: Snap.unavailable({ lat: 41.32, lng: -74.80, status: "offline", reason: "offline" })
      });
      window.WaypointShedsMapApp.openHuntHistory();
      var cards = Array.prototype.map.call(document.querySelectorAll("#hunt-history-list .sheds-history-card__plan"), function (el) {
        return el.textContent;
      });
      var meta = Array.prototype.map.call(document.querySelectorAll("#hunt-history-list .sheds-history-card__meta"), function (el) {
        return el.textContent;
      }).join(" | ");
      return { cards: cards, meta: meta, count: R.list().length };
    })()`);
    assert("seeded three Hunt Records", seeded.count === 3, JSON.stringify(seeded));
    assert("History cards omit condition facts", !/°C|Snow depth|Freeze/.test(seeded.meta || ""));

    const recordedUi = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openHuntDetail("hrec_v19_ok");
      var note = (document.getElementById("hunt-detail-conditions-note") || {}).textContent || "";
      var stats = (document.getElementById("hunt-detail-conditions-stats") || {}).textContent || "";
      return { note: note, stats: stats, heading: (document.getElementById("hunt-detail-conditions-heading") || {}).textContent };
    })()`);
    assert("recorded conditions heading", /Conditions at hunt time/.test(recordedUi.heading || ""));
    assert("recorded conditions show temperature", /Temperature/.test(recordedUi.stats || "") && /°C/.test(recordedUi.stats || ""));
    assert("recorded conditions are not a score", !/search priority|find probability|heat map/i.test(recordedUi.note + recordedUi.stats));
    await shot("v19_hunt_detail_conditions.png");

    const legacyUi = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openHuntDetail("hrec_v19_legacy");
      var note = (document.getElementById("hunt-detail-conditions-note") || {}).textContent || "";
      var stats = (document.getElementById("hunt-detail-conditions-stats") || {}).textContent || "";
      return { note: note, stats: stats };
    })()`);
    assert("legacy conditions not recorded", /Conditions not recorded/.test(legacyUi.note || ""), JSON.stringify(legacyUi));
    assert("legacy does not invent weather rows", !/°C/.test(legacyUi.stats || ""));

    const unavailUi = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openHuntDetail("hrec_v19_unavail");
      var note = (document.getElementById("hunt-detail-conditions-note") || {}).textContent || "";
      var stats = (document.getElementById("hunt-detail-conditions-stats") || {}).textContent || "";
      return { note: note, stats: stats };
    })()`);
    assert("unavailable hunt is not legacy copy", /unavailable during this hunt/i.test(unavailUi.note || ""), JSON.stringify(unavailUi));
    assert("unavailable fields say Unavailable", /Unavailable/.test(unavailUi.stats || ""));

    const tools = await evalExpr(`(() => {
      document.getElementById("btn-inspect-point").click();
      var inspectOpen = !document.getElementById("inspect-hud").hasAttribute("hidden");
      var inspectDone = document.getElementById("btn-inspect-close") || document.getElementById("btn-inspect-done");
      if (inspectDone) inspectDone.click();
      document.getElementById("btn-measure").click();
      var measureOpen = !document.getElementById("measure-hud").hasAttribute("hidden");
      document.getElementById("btn-measure-done").click();
      return { inspectOpen: inspectOpen, measureOpen: measureOpen };
    })()`);
    assert("Inspect still usable", !!tools.inspectOpen);
    assert("Measure still usable", !!tools.measureOpen);

    const jsonRound = await evalExpr(`(() => {
      var payload = {
        format: "waypoint-sheds-field-private-v1",
        huntRecords: window.WaypointShedsHuntRecords.exportJson()
      };
      var text = JSON.stringify(payload);
      var parsed = window.WaypointShedsImport.parseExport(text);
      var hasSession = /"huntSession"/.test(text);
      var hasActivity = /"huntActivity"/.test(text);
      return {
        ok: parsed.ok,
        n: parsed.huntRecords.length,
        hasSnap: !!(parsed.huntRecords.find(function (r) { return r.huntRecordId === "hrec_v19_ok"; }) || {}).conditionSnapshot,
        hasSession: hasSession,
        hasActivity: hasActivity
      };
    })()`);
    assert("live export includes V1.9 snapshot", !!jsonRound.ok && jsonRound.n === 3 && !!jsonRound.hasSnap);
    assert("live export omits session/activity", !jsonRound.hasSession && !jsonRound.hasActivity);

    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true
      });
      await delay(400);
      const metrics = await evalExpr(`(() => {
        window.dispatchEvent(new Event("resize"));
        var map = window.__SHEDS_MAP__;
        if (map) map.invalidateSize();
        window.WaypointShedsMapApp.openHuntHistory();
        var huntsTab = document.getElementById("btn-history-hunts");
        if (huntsTab) huntsTab.click();
        var histOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
        window.WaypointShedsMapApp.openHuntDetail("hrec_v19_ok");
        var detail = document.getElementById("sheet-hunt-detail");
        var panel = detail ? detail.querySelector(".sheds-sheet__panel") : null;
        var cond = document.getElementById("hunt-detail-conditions");
        var condBox = cond ? cond.getBoundingClientRect() : { width: 0, height: 0, top: 0 };
        var panelBox = panel ? panel.getBoundingClientRect() : { width: 0, height: 0 };
        var show = document.getElementById("btn-hunt-detail-map");
        var showBox = show ? show.getBoundingClientRect() : { height: 0 };
        var overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
        var mapEl = document.querySelector(".leaflet-container");
        var mapBox = mapEl ? mapEl.getBoundingClientRect() : { height: 0 };
        return {
          histOverflow: histOverflow,
          overflowX: overflowX,
          condW: Math.round(condBox.width),
          condH: Math.round(condBox.height),
          panelW: Math.round(panelBox.width),
          panelH: Math.round(panelBox.height),
          showH: Math.round(showBox.height),
          vw: window.innerWidth,
          vh: window.innerHeight,
          mapH: Math.round(mapBox.height),
          sheetOpen: detail && detail.classList.contains("is-open"),
          condVisible: condBox.height > 20 && condBox.width > 100
        };
      })()`);
      assert(vp.name + " no page horizontal overflow", !metrics.overflowX && !metrics.histOverflow, JSON.stringify(metrics));
      assert(vp.name + " conditions section visible", !!metrics.condVisible, JSON.stringify(metrics));
      assert(vp.name + " conditions not a full-screen dashboard", metrics.condH < metrics.vh * 0.62, JSON.stringify(metrics));
      assert(vp.name + " detail panel fits viewport width", metrics.panelW <= metrics.vw + 2, JSON.stringify(metrics));
      assert(vp.name + " Show on map touch-sized", metrics.showH >= 40, JSON.stringify(metrics));
      assert(vp.name + " map still has height", metrics.mapH > 80, JSON.stringify(metrics));
      if (vp.width === 320) await shot("v19_mobile_320.png");
      if (vp.width === 375) await shot("v19_mobile_375.png");
      if (vp.width === 390) await shot("v19_mobile_390.png");
      if (vp.width === 430) await shot("v19_mobile_430.png");
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
  console.log("\nSheds V1.9 map mobile tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
