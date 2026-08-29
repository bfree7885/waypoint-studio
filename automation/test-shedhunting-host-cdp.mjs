#!/usr/bin/env node
/**
 * Dedicated-host CDP check against a static origin (dist/shedhunting as / or /shedhunting.org/).
 * Usage:
 *   node automation/test-shedhunting-host-cdp.mjs http://127.0.0.1:8770/
 *   node automation/test-shedhunting-host-cdp.mjs http://127.0.0.1:8766/shedhunting.org/
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8770/").replace(/\/?$/, "/");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9331);
const ART = process.env.SHED_HOST_ARTIFACTS || "/opt/cursor/artifacts";
const WIDTH = Number(process.env.SHED_HOST_WIDTH || 1280);
const HEIGHT = Number(process.env.SHED_HOST_HEIGHT || 800);
const PREFIX = process.env.SHED_HOST_PREFIX || "host";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function waitForTab() {
  for (let i = 0; i < 25; i += 1) {
    try {
      const tabs = await fetchJson("http://127.0.0.1:" + DBG + "/json/list");
      const page = (tabs || []).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (e) { /* chrome still starting */ }
    await delay(200);
  }
  throw new Error("CDP tab not ready");
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--window-size=" + WIDTH + "," + HEIGHT,
      "--remote-debugging-port=" + DBG,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  const page = await waitForTab();
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.on("open", r));
  let id = 0;
  const pending = new Map();
  const failed = [];
  const consoleErrors = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params && msg.params.type === "error") {
      consoleErrors.push((msg.params.args || []).map((a) => a.value || a.description || "").join(" "));
    }
    if (msg.method === "Network.loadingFailed") {
      failed.push({
        url: msg.params.requestId,
        error: msg.params.errorText,
        canceled: msg.params.canceled
      });
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
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: WIDTH < 800
  });

  const netFails = [];
  const responses = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.method === "Network.responseReceived" && msg.params && msg.params.response) {
      responses.push({
        url: msg.params.response.url,
        status: msg.params.response.status
      });
    }
    if (msg.method === "Network.loadingFailed" && msg.params && !msg.params.canceled) {
      netFails.push(msg.params.errorText + " " + (msg.params.requestId || ""));
    }
  });

  await send("Page.navigate", { url: BASE });
  await send("Page.loadEventFired").catch(() => {});
  await delay(1500);

  async function shot(name) {
    const img = await send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(img.data, "base64");
    const tmp = path.join("/tmp", PREFIX + "_" + name + ".png");
    const file = path.join(ART, PREFIX + "_" + name + ".png");
    fs.writeFileSync(tmp, buf);
    try {
      fs.copyFileSync(tmp, file);
    } catch (e) {
      console.warn("artifact copy failed", file, e.message);
    }
    return file;
  }

  const overview = await send("Runtime.evaluate", {
    expression: `(() => {
      const brand = document.querySelector(".sheds-host-brand__name");
      const powered = document.querySelector("[data-powered-by-waypoint]");
      const openMap = document.querySelector('a[href="map/"]');
      const nav = (document.querySelector(".sheds-host-nav") || {}).innerText || "";
      return {
        hostAttr: document.documentElement.getAttribute("data-shed-host"),
        title: document.title,
        brand: brand && brand.textContent,
        poweredHref: powered && powered.getAttribute("href"),
        openMap: !!(openMap),
        scenes: /Scenes/.test(nav),
        paywall: /Free\\/Pro|paywall/i.test(document.body.innerText),
        studioSupport: Array.from(document.querySelectorAll("a")).some((a) => (a.href || "").includes("waypointstudio.org/support.html")),
        terms: Array.from(document.querySelectorAll("a")).some((a) => (a.href || "").includes("waypointstudio.org/terms.html")),
        contact: Array.from(document.querySelectorAll("a")).some((a) => (a.href || "").includes("waypointstudio.org/contact.html")),
        traversal: document.documentElement.outerHTML.includes("../../")
      };
    })()`,
    returnByValue: true
  });
  await shot("overview");

  await send("Runtime.evaluate", {
    expression: `(() => { const a = document.querySelector('a[href="map/"]'); if (a) a.click(); return true; })()`,
    returnByValue: true
  });
  await delay(5000);

  const map = await send("Runtime.evaluate", {
    expression: `(() => {
      const gis = window.WaypointShedsGisPack;
      return {
        href: location.href,
        hasLeaflet: typeof L !== "undefined",
        leafMap: !!(window.L && document.querySelector(".leaflet-container")),
        leafletPane: !!document.querySelector(".leaflet-map-pane"),
        today: !!document.getElementById("today-windows") || !!document.querySelector("[id*='today']"),
        todayScript: typeof window.WaypointShedsTodaysSearch !== "undefined",
        inspect: !!document.getElementById("inspect-hud"),
        planner: !!(window.WaypointShedsPlanner && window.WaypointShedsPlanner.plan),
        importBtn: !!document.getElementById("btn-import"),
        importMod: typeof window.WaypointShedsImport !== "undefined",
        powered: (document.querySelector("[data-powered-by-waypoint]") || {}).href || "",
        support: (document.querySelector('a[data-studio-path="/support.html"]') || {}).href || "",
        scenesNav: /Scenes/.test(document.body.innerText) && !!document.querySelector('a[href*="scenes"]'),
        paywall: /Free\\/Pro|subscribe now/i.test(document.body.innerText),
        antlerClaim: /confirmed antler|antler is here/i.test(document.body.innerText),
        gisApi: !!(gis && gis.listBundled),
        fieldPlan: !!document.getElementById("btn-field-plan") || !!document.getElementById("btn-field-plan-fab")
      };
    })()`,
    returnByValue: true
  });
  await shot("map");

  await send("Runtime.evaluate", {
    expression: `(() => { const b = document.getElementById("btn-more"); if (b) b.click(); return true; })()`,
    returnByValue: true
  });
  await delay(600);
  const more = await send("Runtime.evaluate", {
    expression: `(() => {
      const sheet = document.getElementById("sheet-tools");
      const hrefs = Array.from(document.querySelectorAll("#sheet-tools a")).map((a) => a.getAttribute("href"));
      return {
        open: sheet && sheet.getAttribute("aria-hidden") !== "true",
        hrefs: hrefs,
        import: !!document.getElementById("btn-import")
      };
    })()`,
    returnByValue: true
  });
  await shot("more_sheet");

  await send("Runtime.evaluate", {
    expression: `(() => {
      document.querySelectorAll("[data-close-sheet]").forEach((b) => b.click());
      const layers = document.getElementById("btn-layers");
      if (layers) layers.click();
      return true;
    })()`,
    returnByValue: true
  });
  await delay(400);
  const inspectArm = await send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.getElementById("btn-inspect-point");
      if (btn) btn.click();
      return {
        hasBtn: !!btn,
        hud: !!document.getElementById("inspect-hud"),
        inspecting: document.getElementById("sheds-map-shell") && document.getElementById("sheds-map-shell").classList.contains("is-inspecting")
      };
    })()`,
    returnByValue: true
  });
  await shot("inspect_armed");

  const gisLoad = await send("Runtime.evaluate", {
    expression: `(() => {
      const Pack = window.WaypointShedsGisPack;
      if (!Pack || !Pack.listBundled || !Pack.loadPack) {
        return Promise.resolve({ ok: false, reason: "no pack api" });
      }
      const entry = Pack.listBundled()[0];
      return Pack.loadPack(entry).then((pack) => ({
        ok: true,
        packId: pack && pack.packId,
        hasNlcd: !!(pack && (pack.nlcd || pack.nlcdArr))
      })).catch((e) => ({ ok: false, error: String(e) }));
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const importRoundtrip = await send("Runtime.evaluate", {
    expression: `(() => {
      const Importer = window.WaypointShedsImport;
      if (!Importer) return { ok: false, error: "missing importer" };
      const payload = {
        format: "waypoint-sheds-field-private-v1",
        observations: { observations: [{ id: "obs_cdp", type: "deer_sign", location: { lat: 41.32, lng: -74.8 } }] },
        sessions: { sessions: [], coverage: [] },
        searchAreas: { searchAreas: [] },
        validations: [],
        finds: []
      };
      const parsed = Importer.parseExport(JSON.stringify(payload));
      if (!parsed.ok) return parsed;
      const result = Importer.importPayload(parsed);
      const listed = window.WaypointShedsObservations && WaypointShedsObservations.list().some((o) => o.id === "obs_cdp");
      return { ok: result.ok, listed: listed, counts: result.counts };
    })()`,
    returnByValue: true
  });

  const ov = overview.result.value || {};
  const mv = map.result.value || {};
  const morev = more.result.value || {};
  const gis = (gisLoad.result && gisLoad.result.value) || {};
  const imp = (importRoundtrip.result && importRoundtrip.result.value) || {};

  const badAssets = responses.filter((r) => r.status >= 400 && !/\/favicon\.ico$/i.test(r.url) && !/^https:\/\/fonts\./.test(r.url));
  const studioRuntime = responses.filter((r) => /waypointstudio\.org\/(design-system|apps\/shed-hunting)/.test(r.url));

  const report = {
    base: BASE,
    viewport: { width: WIDTH, height: HEIGHT },
    overview: ov,
    map: mv,
    more: morev,
    gis,
    import: imp,
    consoleErrors: consoleErrors.slice(0, 12),
    badAssets,
    studioRuntime,
    responsesSample: responses.filter((r) => r.url.startsWith(BASE)).slice(0, 20)
  };
  const reportPathTmp = path.join("/tmp", PREFIX + "_cdp_report.json");
  fs.writeFileSync(reportPathTmp, JSON.stringify(report, null, 2));
  try {
    fs.copyFileSync(reportPathTmp, path.join(ART, PREFIX + "_cdp_report.json"));
  } catch (e) {
    console.warn("report copy failed", e.message);
  }

  const checks = [
    ["overview host attr", ov.hostAttr === "1"],
    ["overview brand", /ShedHunting/.test(ov.brand || "")],
    ["overview Open Map", ov.openMap],
    ["overview Powered by Waypoint", ov.poweredHref === "https://waypointstudio.org/"],
    ["overview no Scenes", !ov.scenes],
    ["overview no paywall", !ov.paywall],
    ["overview Support/Terms/Contact", ov.studioSupport && ov.terms && ov.contact],
    ["overview no ../../", !ov.traversal],
    ["map leaflet", mv.hasLeaflet && mv.leafMap],
    ["map Today’s Search", mv.todayScript],
    ["map inspect hud", mv.inspect],
    ["inspect next-tap control", inspectArm.result && inspectArm.result.value && inspectArm.result.value.hasBtn],
    ["map planner", mv.planner],
    ["map Import JSON", mv.importBtn && mv.importMod],
    ["map Powered by Waypoint", String(mv.powered).replace(/\/$/, "/") === "https://waypointstudio.org/" || String(mv.powered).startsWith("https://waypointstudio.org")],
    ["map Support Studio", String(mv.support).includes("waypointstudio.org/support.html")],
    ["map no paywall", !mv.paywall],
    ["map no antler-presence claim", !mv.antlerClaim],
    ["GIS pack fetches", gis.ok && gis.hasNlcd],
    ["import merge-by-id", imp.ok && imp.listed],
    ["no 4xx local assets", badAssets.length === 0],
    ["no Studio origin for app CSS/JS", studioRuntime.length === 0]
  ];
  let failedCount = 0;
  checks.forEach(function (c) {
    if (c[1]) console.log("PASS", c[0]);
    else {
      failedCount += 1;
      console.error("FAIL", c[0]);
    }
  });
  console.log(JSON.stringify({ leaflet: mv.leafMap, gis: gis.ok, import: imp.ok, badAssets, consoleErrors: consoleErrors.slice(0, 6) }, null, 2));

  ws.close();
  proc.kill("SIGTERM");
  if (failedCount) process.exit(1);
  console.log("SHED HOST CDP PASS " + BASE + " " + WIDTH + "x" + HEIGHT);
}

main().catch(function (err) {
  console.error(err);
  process.exit(2);
});
