#!/usr/bin/env node
/**
 * Sheds V1.8 map — Hunt History mobile overflow at 320 / 375 / 390 / 430.
 * Run: node automation/test-sheds-v1-8-map-mobile.mjs
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
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9363);
const PORT = Number(process.env.SHED_V18_MOBILE_PORT || 8104);
const ART = process.env.SHED_HOST_ARTIFACTS ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(ROOT, "automation/artifacts/sheds-v18-map-mobile"));
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
      id: "spot_v18_a",
      name: "Oak Bench",
      status: "Plan",
      location: { lat: 41.325, lng: -74.802 },
      terrain: { available: true, status: "ready", searchPriority: "Higher", featureLabel: "Gentle bench." }
    },
    {
      id: "spot_v18_b",
      name: "South slope",
      status: "Plan",
      location: { lat: 41.327, lng: -74.798 },
      terrain: { available: false, status: "unavailable", searchPriority: null }
    }
  ]
});

const SEED_PLANS = JSON.stringify({
  schemaVersion: 1,
  huntPlans: [{
    kind: "hunt-plan",
    schemaVersion: 1,
    id: "plan_v18_field",
    name: "Ridge North",
    status: "Planned",
    scoutSpotIds: ["spot_v18_a", "spot_v18_b"],
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
  const userData = fs.mkdtempSync(path.join("/tmp", "chrome-v18-map-"));
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
        records: typeof window.WaypointShedsHuntRecords,
        historyBtn: (document.getElementById("btn-history") || {}).textContent,
        detail: !!document.getElementById("sheet-hunt-detail"),
        empty: !!document.getElementById("hunt-history-empty"),
        inspect: !!document.getElementById("btn-inspect-point"),
        measure: !!document.getElementById("btn-measure"),
        importBtn: !!document.getElementById("btn-import"),
        fieldHud: !!document.getElementById("field-hunt-hud"),
        count: window.WaypointShedsHuntRecords.list().length
      };
    })()`);
    assert("Hunt Records on window", boot.records === "object");
    assert("Hunt History button label", /Hunt History/.test(boot.historyBtn || ""));
    assert("Hunt Detail sheet in DOM", !!boot.detail);
    assert("empty state element", !!boot.empty);
    assert("Inspect remains", !!boot.inspect);
    assert("Measure remains", !!boot.measure);
    assert("Import JSON remains", !!boot.importBtn);
    assert("Field Hunt HUD remains", !!boot.fieldHud);
    assert("starts with no Hunt Records", boot.count === 0);

    const emptyUi = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openHuntHistory();
      var sheet = document.getElementById("sheet-history");
      var empty = document.getElementById("hunt-history-empty");
      var list = document.getElementById("hunt-history-list");
      var title = (document.getElementById("history-title") || {}).textContent;
      return {
        open: sheet && sheet.classList.contains("is-open"),
        title: title,
        emptyShown: empty && !empty.hidden,
        emptyText: empty && empty.textContent,
        items: list ? list.querySelectorAll("li").length : -1
      };
    })()`);
    assert("empty Hunt History opens", !!emptyUi.open);
    assert("empty Hunt History title", /Hunt History/.test(emptyUi.title || ""));
    assert("empty state visible", !!emptyUi.emptyShown && /No hunts recorded yet/i.test(emptyUi.emptyText || ""));
    assert("empty state is not an error", !/broken|failed|error/i.test(emptyUi.emptyText || ""));
    assert("empty list has no rows", emptyUi.items === 0);
    await shot("v18_empty_history.png");

    const seeded = await evalExpr(`(() => {
      var R = window.WaypointShedsHuntRecords;
      R.persist({
        kind: "hunt-record",
        huntRecordId: "hrec_v18_old",
        huntPlanNameSnapshot: "Older walk",
        startedAt: "2026-08-01T10:00:00.000Z",
        finishedAt: "2026-08-01T11:00:00.000Z",
        trackPoints: [{ lat: 41.324, lng: -74.803, t: 1 }, { lat: 41.325, lng: -74.803, t: 20000 }],
        trackDistanceM: 111,
        trackDistanceAvailable: true,
        observations: []
      });
      R.persist({
        kind: "hunt-record",
        huntRecordId: "hrec_v18_new",
        huntPlanNameSnapshot: "Ridge North",
        startedAt: "2026-09-02T10:00:00.000Z",
        finishedAt: "2026-09-02T12:00:00.000Z",
        trackPoints: [{ lat: 41.325, lng: -74.802, t: 1 }, { lat: 41.326, lng: -74.802, t: 30000 }],
        trackDistanceM: 111,
        trackDistanceAvailable: true,
        observations: [
          { id: "hobs_v18_s", type: "shed_found", createdAt: "2026-09-02T11:00:00.000Z", lat: 41.326, lng: -74.802, note: "Left side" },
          { id: "hobs_v18_u", type: "deer_sign", createdAt: "2026-09-02T11:10:00.000Z", note: "Tracks only" }
        ]
      });
      R.persist({
        kind: "hunt-record",
        huntRecordId: "hrec_v18_nogps",
        huntPlanNameSnapshot: "Fog morning",
        startedAt: "2026-08-15T09:00:00.000Z",
        finishedAt: "2026-08-15T10:00:00.000Z",
        trackPoints: [],
        trackDistanceAvailable: false,
        observations: []
      });
      window.WaypointShedsMapApp.openHuntHistory();
      var cards = Array.prototype.map.call(document.querySelectorAll("#hunt-history-list .sheds-history-card__plan"), function (el) {
        return el.textContent;
      });
      var empty = document.getElementById("hunt-history-empty");
      return { cards: cards, emptyHidden: empty && empty.hidden, count: R.list().length };
    })()`);
    assert("seeded three Hunt Records", seeded.count === 3, JSON.stringify(seeded));
    assert("newest-first in History UI", seeded.cards[0] === "Ridge North" && seeded.cards[1] === "Fog morning" && seeded.cards[2] === "Older walk", JSON.stringify(seeded.cards));
    assert("empty state hides when hunts exist", !!seeded.emptyHidden);

    const detail = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openHuntDetail("hrec_v18_new");
      var sheet = document.getElementById("sheet-hunt-detail");
      var stats = (document.getElementById("hunt-detail-stats") || {}).textContent || "";
      var obs = document.getElementById("hunt-detail-obs-list");
      var items = obs ? obs.querySelectorAll("li").length : 0;
      var unmapped = /Not mapped/.test(obs && obs.textContent || "");
      var mapped = (obs && obs.textContent || "").indexOf("41.326") >= 0;
      return {
        open: sheet && sheet.classList.contains("is-open"),
        stats: stats,
        items: items,
        unmapped: unmapped,
        mapped: mapped
      };
    })()`);
    assert("Hunt Detail opens", !!detail.open);
    assert("Hunt Detail shows plan name", /Ridge North/.test(detail.stats || ""));
    assert("Hunt Detail shows duration", /Duration/.test(detail.stats || ""));
    assert("Hunt Detail shows searched distance", /Searched distance/.test(detail.stats || ""));
    assert("Hunt Detail lists observations", detail.items === 2);
    assert("unmapped observation listed without invented pin copy", !!detail.unmapped);
    assert("mapped observation lists coordinates", !!detail.mapped);
    await shot("v18_hunt_detail.png");

    const mapped = await evalExpr(`(() => {
      window.WaypointShedsMapApp.showHistoricalHunt("hrec_v18_new", { fit: true });
      window.WaypointShedsMapApp.showHistoricalHunt("hrec_v18_old", { fit: false });
      var hist = document.querySelectorAll(".sheds-history-track, path.sheds-history-track").length;
      var live = document.querySelectorAll(".sheds-hunt-track, path.sheds-hunt-track").length;
      var marks = document.querySelectorAll(".sheds-history-obs-mark").length;
      var sheds = document.querySelectorAll(".sheds-history-obs-mark--shed").length;
      return { hist: hist, live: live, marks: marks, sheds: sheds };
    })()`);
    assert("historical tracks render", mapped.hist >= 1, JSON.stringify(mapped));
    assert("multiple historical tracks allowed", mapped.hist >= 2, JSON.stringify(mapped));
    assert("live hunt track not implied by history", mapped.live === 0, JSON.stringify(mapped));
    assert("mapped observations render", mapped.marks >= 1, JSON.stringify(mapped));
    assert("historical Shed Found marker", mapped.sheds >= 1, JSON.stringify(mapped));

    const shedsTab = await evalExpr(`(() => {
      document.getElementById("btn-history-sheds").click();
      window.WaypointShedsMapApp.openHuntHistory();
      document.getElementById("btn-history-sheds").click();
      var view = document.getElementById("hunt-history-sheds-view");
      var list = document.getElementById("shed-found-history-list");
      var text = list ? list.textContent : "";
      return {
        shown: view && !view.hidden,
        rows: list ? list.querySelectorAll("li").length : 0,
        note: /Left side/.test(text),
        noSpecies: !/whitetail score|trophy|Boone/.test(text)
      };
    })()`);
    assert("Shed Found history view", !!shedsTab.shown && shedsTab.rows >= 1, JSON.stringify(shedsTab));
    assert("Shed Found preserves note", !!shedsTab.note);
    assert("Shed Found has no fake trophy metadata", !!shedsTab.noSpecies);

    const nogps = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openHuntDetail("hrec_v18_nogps");
      var stats = (document.getElementById("hunt-detail-stats") || {}).textContent || "";
      var note = (document.getElementById("hunt-detail-track-note") || {}).textContent || "";
      var obs = (document.getElementById("hunt-detail-obs-list") || {}).textContent || "";
      return {
        noTrack: /No GPS track|No Hunt Track/.test(stats + note),
        zeroObs: /0 observations/.test(obs),
        plan: /Fog morning/.test(stats)
      };
    })()`);
    assert("no-GPS historical hunt is honest", !!nogps.noTrack && !!nogps.plan, JSON.stringify(nogps));
    assert("no-GPS hunt shows zero observations", !!nogps.zeroObs);

    const persist = await evalExpr(`(() => {
      return {
        stillThere: !!window.WaypointShedsHuntRecords.getById("hrec_v18_new"),
        count: window.WaypointShedsHuntRecords.list().length
      };
    })()`);
    assert("records persist in the live page", persist.stillThere && persist.count === 3);

    const coexist = await evalExpr(`(() => {
      window.WaypointShedsMapApp.openHuntPlan("plan_v18_field");
      document.getElementById("btn-hunt-plan-start").click();
      var hud = document.getElementById("field-hunt-hud");
      var histStill = window.WaypointShedsHuntRecords.list().length;
      window.WaypointShedsMapApp.showHistoricalHunt("hrec_v18_new", { fit: false });
      var histLines = document.querySelectorAll(".sheds-history-track, path.sheds-history-track").length;
      var hudOpen = hud && !hud.hasAttribute("hidden");
      return { hudOpen: hudOpen, histStill: histStill, histLines: histLines };
    })()`);
    assert("active Field Hunt coexists with Hunt History", !!coexist.hudOpen && coexist.histStill === 3, JSON.stringify(coexist));
    assert("historical tracks remain subordinate during live hunt", coexist.histLines >= 1, JSON.stringify(coexist));

    const deleted = await evalExpr(`(() => {
      window.confirm = function () { return true; };
      var scoutsBefore = window.WaypointShedsScoutSpots.list().length;
      var plansBefore = window.WaypointShedsHuntPlans.list().length;
      window.WaypointShedsMapApp.openHuntDetail("hrec_v18_old");
      document.getElementById("btn-hunt-detail-delete").click();
      return {
        gone: !window.WaypointShedsHuntRecords.getById("hrec_v18_old"),
        remaining: window.WaypointShedsHuntRecords.list().length,
        scouts: window.WaypointShedsScoutSpots.list().length === scoutsBefore,
        plans: window.WaypointShedsHuntPlans.list().length === plansBefore,
        historyOpen: document.getElementById("sheet-history").classList.contains("is-open")
      };
    })()`);
    assert("delete removes only that Hunt Record", !!deleted.gone && deleted.remaining === 2, JSON.stringify(deleted));
    assert("delete keeps Scout Spots and Hunt Plans", !!deleted.scouts && !!deleted.plans);
    assert("delete returns to Hunt History", !!deleted.historyOpen);

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
        var sheet = document.getElementById("sheet-history");
        var panel = sheet ? sheet.querySelector(".sheds-sheet__panel") : null;
        var tab = document.getElementById("btn-history-hunts");
        var card = document.querySelector("#hunt-history-list .sheds-history-card");
        var tabBox = tab ? tab.getBoundingClientRect() : { height: 0, width: 0 };
        var cardBox = card ? card.getBoundingClientRect() : { height: 0, width: 0 };
        var panelBox = panel ? panel.getBoundingClientRect() : { width: 0, height: 0 };
        var mapEl = document.querySelector(".leaflet-container");
        var mapBox = mapEl ? mapEl.getBoundingClientRect() : { height: 0 };
        var overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
        window.WaypointShedsMapApp.openHuntDetail("hrec_v18_new");
        var detail = document.getElementById("sheet-hunt-detail");
        var show = document.getElementById("btn-hunt-detail-map");
        var del = document.getElementById("btn-hunt-detail-delete");
        var showBox = show ? show.getBoundingClientRect() : { height: 0 };
        var delBox = del ? del.getBoundingClientRect() : { height: 0 };
        var detailOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
        var hud = document.getElementById("field-hunt-hud");
        var hudBox = hud ? hud.getBoundingClientRect() : { height: 0 };
        return {
          overflowX: overflowX,
          detailOverflow: detailOverflow,
          tabH: Math.round(tabBox.height),
          cardH: Math.round(cardBox.height),
          showH: Math.round(showBox.height),
          delH: Math.round(delBox.height),
          panelW: Math.round(panelBox.width),
          vw: window.innerWidth,
          mapH: Math.round(mapBox.height),
          sheetOpen: detail && detail.classList.contains("is-open"),
          hudCovers: hud && !hud.hasAttribute("hidden") && hudBox.height > window.innerHeight * 0.78
        };
      })()`);
      assert(vp.name + " no page horizontal overflow", !metrics.overflowX && !metrics.detailOverflow, JSON.stringify(metrics));
      assert(vp.name + " Hunt History tab touch-sized", metrics.tabH >= 40, JSON.stringify(metrics));
      assert(vp.name + " hunt card touch-sized", metrics.cardH >= 40, JSON.stringify(metrics));
      assert(vp.name + " Show on map touch-sized", metrics.showH >= 40, JSON.stringify(metrics));
      assert(vp.name + " Delete touch-sized", metrics.delH >= 40, JSON.stringify(metrics));
      assert(vp.name + " history panel fits viewport", metrics.panelW <= metrics.vw + 2, JSON.stringify(metrics));
      assert(vp.name + " map still has height", metrics.mapH > 80, JSON.stringify(metrics));
      assert(vp.name + " history does not replace Field Hunt HUD coverage", !metrics.hudCovers, JSON.stringify(metrics));
      if (vp.width === 320) await shot("v18_mobile_320.png");
      if (vp.width === 375) await shot("v18_mobile_375.png");
      if (vp.width === 390) await shot("v18_mobile_390.png");
      if (vp.width === 430) await shot("v18_mobile_430.png");
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
  console.log("\nSheds V1.8 map mobile tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
