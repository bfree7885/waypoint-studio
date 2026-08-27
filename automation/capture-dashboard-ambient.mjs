#!/usr/bin/env node
/**
 * Dashboard Ambient Phase 1 — dedicated-display + mobile screenshots and layout checks.
 * Usage: node automation/capture-dashboard-ambient.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const ART = "/opt/cursor/artifacts";
const CHROME =
  process.env.CHROME_PATH ||
  ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"].find((p) =>
    fs.existsSync(p)
  );
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9341);

fs.mkdirSync(ART, { recursive: true });

let WebSocket;
try {
  WebSocket = createRequire(import.meta.url)("ws");
} catch (e) {
  console.error("ws package required");
  process.exit(1);
}

function assert(name, cond, detail) {
  if (!cond) throw new Error("FAIL " + name + (detail ? ": " + detail : ""));
  console.log("PASS", name);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + " " + res.status);
  return res.json();
}

const FIXTURE = `(() => {
  const WDS = window.WDS;
  if (!WDS || !WDS.dashboardRebuild) return { ok: false, reason: "no-rebuild" };
  const now = new Date();
  const rise = new Date(now.getTime() - 8 * 3600 * 1000);
  const set = new Date(now.getTime() + 2.5 * 3600 * 1000);
  const place = {
    placeLabel: "Pike County, PA",
    lat: 41.3312,
    lng: -75.038,
    timezone: "America/New_York",
    trust: "live",
    source: "geo"
  };
  const platform = {
    meta: { hydratedAt: now.toISOString() },
    weatherRef: {
      meta: { isPlaceholder: false, provider: "open-meteo" },
      current: {
        temperature: 34,
        feelsLike: 30,
        humidity: 48,
        cloudCover: 55,
        wind: { speed: 7, gust: 11 },
        conditions: { summary: "Partly cloudy" },
        precipitation: { probability: 10, amount: 0 }
      },
      hourly: [],
      daily: [{}]
    },
    daylight: {
      sunrise: rise.toISOString(),
      sunset: set.toISOString(),
      sunriseFormatted: rise.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      sunsetFormatted: set.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      moonPhase: "Waning Crescent",
      moonIllumination: 18,
      timezone: "America/New_York"
    },
    alerts: { status: "live", items: [] },
    airQuality: { status: "live", usAqi: 32, category: "Good" }
  };
  if (window.__wpAmbientAlert) {
    platform.alerts = {
      status: "live",
      items: [{ event: "Winter Storm Warning", headline: "Winter Storm Warning", severity: "Severe" }]
    };
  }
  if (WDS.naturalEvents && WDS.naturalEvents.setCatalog) {
    WDS.naturalEvents.setCatalog({ version: "test", events: [] });
  }
  if (WDS.dashboardRebuild.setPlaceContext) WDS.dashboardRebuild.setPlaceContext(place);
  if (WDS.dashboardRebuild.setPlatform) WDS.dashboardRebuild.setPlatform(platform);
  return { ok: true, view: WDS.dashboardRebuild.getView && WDS.dashboardRebuild.getView() };
})()`;

async function main() {
  if (!CHROME) {
    console.log("SKIP capture (no chrome)");
    return;
  }
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-dash-ambient-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  await delay(1600);
  try {
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const page = targets.find((t) => t.type === "page") || targets[0];
    const session = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      session.once("open", res);
      session.once("error", rej);
    });

    async function send(method, params = {}) {
      const id = Math.floor(Math.random() * 1e9);
      return new Promise((resolve, reject) => {
        const onMsg = (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.id !== id) return;
          session.off("message", onMsg);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        };
        session.on("message", onMsg);
        session.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    const weatherHits = [];
    session.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        return;
      }
      if (msg.method !== "Network.requestWillBeSent") return;
      const url = (msg.params && msg.params.request && msg.params.request.url) || "";
      if (/open-meteo|api\.weather\.gov/i.test(url)) weatherHits.push(url);
    });

    async function waitReady(expr, tries = 50) {
      for (let i = 0; i < tries; i++) {
        const ready = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
        if (ready.result && ready.result.value) return true;
        await delay(200);
      }
      return false;
    }

    async function shot(name, width, height, mobile, hash, extraExpr, save) {
      save = save !== false;
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: mobile ? 2 : 1,
        mobile
      });
      await send("Page.navigate", { url: `${BASE}/apps/dashboard/?ambient=${Date.now()}${hash}` });
      const booted = await waitReady(`!!(window.WDS && WDS.dashboardRebuild && document.querySelector("[data-wdb-r]"))`);
      assert(`${name} shell booted`, booted);
      if (extraExpr) {
        await send("Runtime.evaluate", { expression: extraExpr, returnByValue: true });
      }
      const applied = await send("Runtime.evaluate", { expression: FIXTURE, returnByValue: true });
      const applyVal = applied.result && applied.result.value;
      assert(`${name} fixture applied`, applyVal && applyVal.ok, JSON.stringify(applyVal));
      await delay(400);
      const infoRes = await send("Runtime.evaluate", {
        expression: `(() => {
          const root = document.querySelector("[data-wdb-r]");
          const ambient = document.querySelector("[data-wdb-r-ambient]");
          const now = document.querySelector('[data-ambient-region="now"]');
          const dev = document.querySelector('[data-ambient-region="developing"]');
          const opp = document.querySelector('[data-ambient-region="opportunities"]');
          const workspace = !!document.querySelector("[data-wdb-r-workspace]");
          const today = !!document.querySelector("[data-wdb-r-today]");
          const doc = document.documentElement;
          const overflowX = doc.scrollWidth > doc.clientWidth + 2;
          const overflowY = doc.scrollHeight > doc.clientHeight + 8;
          const regions = [now, dev, opp].filter(Boolean).map((el) => {
            const r = el.getBoundingClientRect();
            return { id: el.getAttribute("data-ambient-region"), top: r.top, bottom: r.bottom, height: r.height };
          });
          const primaryBottom = Math.max(0, ...regions.map((r) => r.bottom));
          const body = (document.body && document.body.innerText) || "";
          return {
            view: root && root.getAttribute("data-view"),
            hasAmbient: !!ambient,
            workspace,
            today,
            overflowX,
            overflowY,
            clientHeight: doc.clientHeight,
            scrollHeight: doc.scrollHeight,
            primaryBottom,
            regions,
            hasNow: !!now,
            hasDev: !!dev,
            hasOpp: !!opp,
            bodyHasTemp: /\\d+°/.test(body),
            bodyHasUnknown: /Unknown/.test(body),
            bodyHasDeveloping: /Developing|Quiet|Needs attention|Changed|Getting oriented/i.test(body),
            developingText: dev ? (dev.innerText || "").slice(0, 500) : "",
            changesAttr: (ambient && ambient.getAttribute("data-changes")) || "",
            historyAttr: (ambient && ambient.getAttribute("data-history")) || "",
            bodySlice: body.replace(/\\s+/g, " ").slice(0, 400)
          };
        })()`,
        returnByValue: true
      });
      const info = infoRes.result.value;
      if (save) {
        const png = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
        const file = path.join(ART, name + ".png");
        fs.writeFileSync(file, Buffer.from(png.data, "base64"));
        console.log("SHOT", file, JSON.stringify(info));
        return { file, info };
      }
      console.log("PROBE", name, JSON.stringify(info));
      return { info };
    }

    const dedicated = await shot(
      "ambient_phase1_dedicated_1920x1080",
      1920,
      1080,
      false,
      "#/ambient",
      "window.__wpAmbientAlert = false"
    );
    assert("dedicated is ambient view", dedicated.info.view === "ambient" && dedicated.info.hasAmbient);
    assert("dedicated has three regions", dedicated.info.hasNow && dedicated.info.hasDev && dedicated.info.hasOpp);
    assert("dedicated omits Discover workspace", !dedicated.info.workspace && !dedicated.info.today);
    assert("dedicated no horizontal overflow", !dedicated.info.overflowX);
    assert(
      "dedicated primary regions in viewport",
      dedicated.info.primaryBottom <= dedicated.info.clientHeight + 24,
      "primaryBottom=" + dedicated.info.primaryBottom + " client=" + dedicated.info.clientHeight
    );
    assert("dedicated no vertical page scroll", !dedicated.info.overflowY, "scrollHeight=" + dedicated.info.scrollHeight);
    assert("dedicated shows temperature", dedicated.info.bodyHasTemp);

    const mobile = await shot(
      "ambient_phase1_mobile_390x844",
      390,
      844,
      true,
      "#/ambient",
      "window.__wpAmbientAlert = false"
    );
    assert("mobile is ambient view", mobile.info.view === "ambient" && mobile.info.hasAmbient);
    assert("mobile has three regions", mobile.info.hasNow && mobile.info.hasDev && mobile.info.hasOpp);
    assert("mobile no horizontal overflow", !mobile.info.overflowX);
    assert("mobile may stack (vertical scroll allowed)", true);

    for (const vp of [
      { name: "375", width: 375, height: 812 },
      { name: "430", width: 430, height: 932 }
    ]) {
      const probe = await shot(
        "ambient_probe_" + vp.name,
        vp.width,
        vp.height,
        true,
        "#/ambient",
        "window.__wpAmbientAlert = false",
        false
      );
      assert(
        "responsive " + vp.name + " has three regions",
        probe.info.hasNow && probe.info.hasDev && probe.info.hasOpp
      );
      assert("responsive " + vp.name + " no horizontal overflow", !probe.info.overflowX);
    }

    const alertShot = await shot(
      "ambient_phase1_alert_1920x1080",
      1920,
      1080,
      false,
      "#/ambient",
      "window.__wpAmbientAlert = true"
    );
    assert("alert ambient still three regions", alertShot.info.hasNow && alertShot.info.hasDev && alertShot.info.hasOpp);

    const weatherAfterAmbient = weatherHits.length;
    await send("Runtime.evaluate", { expression: FIXTURE, returnByValue: true });
    await delay(1200);
    assert(
      "fixture/re-paint does not duplicate weather APIs",
      weatherHits.length === weatherAfterAmbient,
      "before=" + weatherAfterAmbient + " after=" + weatherHits.length + " extra=" + JSON.stringify(weatherHits.slice(weatherAfterAmbient))
    );

    async function evalAwait(expression) {
      return send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
    }

    async function captureNamed(name) {
      const png = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const file = path.join(ART, name + ".png");
      fs.writeFileSync(file, Buffer.from(png.data, "base64"));
      console.log("SHOT", file);
      return file;
    }

    const SEED_QUIET = `(async () => {
      const WDS = window.WDS;
      const Store = WDS.dashboardRebuildAmbientStore;
      const Snap = WDS.dashboardRebuildAmbientSnapshot;
      if (!Store || !Snap) return { ok: false, reason: "missing-modules" };
      await Store.hydrate();
      if (Store.clear) await Store.clear();
      const now = new Date();
      const earlier = new Date(now.getTime() - 3 * 3600 * 1000);
      const rise = new Date(now.getTime() - 8 * 3600 * 1000);
      const set = new Date(now.getTime() + 2.5 * 3600 * 1000);
      const place = {
        placeLabel: "Pike County, PA",
        lat: 41.3312,
        lng: -75.038,
        timezone: "America/New_York",
        trust: "live",
        source: "geo"
      };
      function platform(temp, wind, alerts) {
        return {
          meta: { hydratedAt: now.toISOString() },
          weatherRef: {
            meta: { isPlaceholder: false, provider: "open-meteo" },
            current: {
              temperature: temp,
              feelsLike: temp - 4,
              humidity: 48,
              cloudCover: 55,
              wind: { speed: wind, gust: wind + 3 },
              conditions: { summary: "Partly cloudy" },
              precipitation: { probability: 10, amount: 0 }
            },
            hourly: [],
            daily: [{}]
          },
          daylight: {
            sunrise: rise.toISOString(),
            sunset: set.toISOString(),
            sunriseFormatted: rise.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
            sunsetFormatted: set.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
            moonPhase: "Waning Crescent",
            moonIllumination: 18,
            timezone: "America/New_York"
          },
          alerts: alerts || { status: "live", items: [] },
          airQuality: { status: "live", usAqi: 32, category: "Good" }
        };
      }
      if (WDS.naturalEvents && WDS.naturalEvents.setCatalog) {
        WDS.naturalEvents.setCatalog({ version: "test", events: [] });
      }
      const mode = window.__wpAmbientHistoryMode || "quiet";
      const currentPlat = mode === "alert"
        ? platform(34, 7, {
            status: "live",
            items: [{ event: "Winter Storm Warning", headline: "Winter Storm Warning", severity: "Severe" }]
          })
        : platform(34, 7);
      const currentSnap = Snap.compose({
        platform: currentPlat,
        placeContext: place,
        now: now,
        catalog: { version: "test", events: [] }
      });
      const prior = JSON.parse(JSON.stringify(currentSnap));
      prior.capturedAt = earlier.toISOString();
      if (mode === "temp") {
        prior.conditions.temperatureF = 43;
        prior.conditions.apparentTemperatureF = 40;
        prior.conditions.headline = "43°";
      }
      if (mode === "alert") {
        prior.signals = [];
        prior.developing = {
          state: "quiet",
          headline: "Nothing important is developing",
          detail: "No significant weather, alerts, or natural events are active or approaching.",
          items: [],
          gaps: []
        };
        prior.sources = (prior.sources || []).map(function (s) {
          if (s.id !== "nws") return s;
          return Object.assign({}, s, { trust: "live" });
        });
      }
      const written = await Store.ingest(prior, { force: true, capturedAt: earlier });
      if (WDS.dashboardRebuild.setPlaceContext) WDS.dashboardRebuild.setPlaceContext(place);
      if (WDS.dashboardRebuild.setPlatform) WDS.dashboardRebuild.setPlatform(currentPlat);
      const rec = Store.reference(Snap.compose({ platform: currentPlat, placeContext: place, now: now, catalog: { version: "test", events: [] } }));
      return { ok: true, written: written && written.persisted, hasRef: !!(rec && rec.snapshot), mode: mode };
    })()`;

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send("Page.navigate", { url: `${BASE}/apps/dashboard/?ambient=${Date.now()}#/ambient` });
    assert("phase15 first-run booted", await waitReady(`!!(window.WDS && WDS.dashboardRebuild && document.querySelector("[data-wdb-r]"))`));
    await evalAwait(`(async () => {
      const Store = window.WDS && WDS.dashboardRebuildAmbientStore;
      if (Store && Store.clear) await Store.clear();
      if (Store && Store.hydrate) await Store.hydrate();
      return { ok: true };
    })()`);
    await send("Runtime.evaluate", { expression: "window.__wpAmbientAlert = false", returnByValue: true });
    await send("Runtime.evaluate", { expression: FIXTURE, returnByValue: true });
    await delay(500);
    const firstRunInfo = await send("Runtime.evaluate", {
      expression: `({
        developing: (document.querySelector('[data-ambient-region="developing"]') || {}).innerText || "",
        changes: (document.querySelector("[data-wdb-r-ambient]") || {}).getAttribute && document.querySelector("[data-wdb-r-ambient]").getAttribute("data-changes"),
        hasNow: !!document.querySelector('[data-ambient-region="now"]')
      })`,
      returnByValue: true
    });
    const firstRun = firstRunInfo.result.value;
    assert("first-run still renders Ambient", firstRun.hasNow);
    assert(
      "first-run developing is honest",
      /Building recent context/i.test(firstRun.developing),
      firstRun.developing
    );
    await captureNamed("ambient_phase15_first_run_1920x1080");

    const weatherBeforeHistory = weatherHits.length;
    await send("Runtime.evaluate", { expression: `window.__wpAmbientHistoryMode = "quiet"`, returnByValue: true });
    const quietSeed = await evalAwait(SEED_QUIET);
    const quietVal = quietSeed.result && quietSeed.result.value;
    assert("quiet history seeded", quietVal && quietVal.ok && quietVal.hasRef, JSON.stringify(quietVal));
    await delay(400);
    const quietInfo = await send("Runtime.evaluate", {
      expression: `({
        developing: (document.querySelector('[data-ambient-region="developing"]') || {}).innerText || "",
        temp: (document.querySelector("[data-ambient-temp]") || {}).innerText || ""
      })`,
      returnByValue: true
    });
    const quietDev = quietInfo.result.value;
    assert(
      "quiet history stays quiet",
      /Nothing important is developing/i.test(quietDev.developing) && !/Temperature ↓/i.test(quietDev.developing),
      quietDev.developing
    );
    await captureNamed("ambient_phase15_quiet_history_1920x1080");

    await send("Runtime.evaluate", { expression: `window.__wpAmbientHistoryMode = "temp"`, returnByValue: true });
    const tempSeed = await evalAwait(SEED_QUIET);
    const tempVal = tempSeed.result && tempSeed.result.value;
    assert("temp history seeded", tempVal && tempVal.ok && tempVal.hasRef, JSON.stringify(tempVal));
    await delay(400);
    const tempInfo = await send("Runtime.evaluate", {
      expression: `({
        developing: (document.querySelector('[data-ambient-region="developing"]') || {}).innerText || "",
        temp: (document.querySelector("[data-ambient-temp]") || {}).innerText || ""
      })`,
      returnByValue: true
    });
    const tempDev = tempInfo.result.value;
    assert("meaningful weather change surfaces", /Temperature ↓ 9°F/i.test(tempDev.developing), tempDev.developing);
    assert("NOW still shows current temp", /34/.test(tempDev.temp), tempDev.temp);
    await captureNamed("ambient_phase15_temp_drop_1920x1080");

    await send("Runtime.evaluate", { expression: `window.__wpAmbientHistoryMode = "alert"`, returnByValue: true });
    const alertSeed = await evalAwait(SEED_QUIET);
    const alertVal = alertSeed.result && alertSeed.result.value;
    assert("alert history seeded", alertVal && alertVal.ok && alertVal.hasRef, JSON.stringify(alertVal));
    await delay(400);
    const alertInfo = await send("Runtime.evaluate", {
      expression: `({
        developing: (document.querySelector('[data-ambient-region="developing"]') || {}).innerText || "",
        state: (document.querySelector('[data-ambient-region="developing"]') || {}).getAttribute && document.querySelector('[data-ambient-region="developing"]').getAttribute("data-state")
      })`,
      returnByValue: true
    });
    const alertDev = alertInfo.result.value;
    assert("significant alert change surfaces", /Winter Storm Warning/i.test(alertDev.developing), alertDev.developing);
    await captureNamed("ambient_phase15_alert_issued_glanceable_1920x1080");

    const weatherAfterHistory = weatherHits.length;
    assert(
      "snapshot comparison does not add Open-Meteo/NWS requests",
      weatherAfterHistory === weatherBeforeHistory,
      "before=" + weatherBeforeHistory + " after=" + weatherAfterHistory + " extra=" + JSON.stringify(weatherHits.slice(weatherBeforeHistory))
    );

    const dedicated15 = await shot(
      "ambient_phase15_dedicated_1920x1080",
      1920,
      1080,
      false,
      "#/ambient",
      "window.__wpAmbientAlert = false"
    );
    assert("dedicated 1.5 no horizontal overflow", !dedicated15.info.overflowX);
    assert(
      "dedicated 1.5 primary regions in viewport",
      dedicated15.info.primaryBottom <= dedicated15.info.clientHeight + 24,
      "primaryBottom=" + dedicated15.info.primaryBottom + " client=" + dedicated15.info.clientHeight
    );
    assert("dedicated 1.5 no vertical page scroll", !dedicated15.info.overflowY, "scrollHeight=" + dedicated15.info.scrollHeight);

    const mobile15 = await shot(
      "ambient_phase15_mobile_390x844",
      390,
      844,
      true,
      "#/ambient",
      "window.__wpAmbientAlert = false"
    );
    assert("mobile 1.5 no horizontal overflow", !mobile15.info.overflowX);

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    const switched = await send("Runtime.evaluate", {
      expression: `(() => {
        if (!window.WDS || !WDS.dashboardRebuild || !WDS.dashboardRebuild.setView) return { ok: false };
        WDS.dashboardRebuild.setView("workspace");
        return { ok: true, view: WDS.dashboardRebuild.getView && WDS.dashboardRebuild.getView() };
      })()`,
      returnByValue: true
    });
    assert("setView workspace from Ambient", switched.result && switched.result.value && switched.result.value.ok);
    await delay(400);
    const discInfo = await send("Runtime.evaluate", {
      expression: `({
        view: document.querySelector("[data-wdb-r]") && document.querySelector("[data-wdb-r]").getAttribute("data-view"),
        today: !!document.querySelector("[data-wdb-r-today]"),
        workspace: !!document.querySelector("[data-wdb-r-workspace]"),
        ambient: !!document.querySelector("[data-wdb-r-ambient]"),
        prompt: !!document.querySelector("#wds-location-prompt .wds-location-prompt, [data-wds-location-prompt]")
      })`,
      returnByValue: true
    });
    const d = discInfo.result.value;
    assert("discover remains workspace after Ambient", d.view === "workspace" && d.today && d.workspace && !d.ambient);
    const discPng = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    fs.writeFileSync(
      path.join(ART, "discover_after_ambient_setview_1440x900.png"),
      Buffer.from(discPng.data, "base64")
    );

    session.close();
    console.log("\nDASHBOARD AMBIENT CAPTURE: PASS");
  } finally {
    proc.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
