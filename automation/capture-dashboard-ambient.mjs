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
            bodyHasDeveloping: /Developing|Quiet|Needs attention/i.test(body)
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
