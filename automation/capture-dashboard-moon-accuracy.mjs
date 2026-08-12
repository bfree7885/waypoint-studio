#!/usr/bin/env node
/**
 * Browser verification + screenshots for data-driven Astronomy moon.
 * Usage: node automation/capture-dashboard-moon-accuracy.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/rebuild-2026/dashboard-moon-accuracy");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9451);
const HTTP_PORT = Number(process.env.WAYPOINT_HTTP_PORT || 8766);
const BASE_ARG = process.argv[2];

const PIKE = {
  source: "manual",
  lat: 41.34,
  lng: -75.04,
  timestamp: Date.now(),
  regionId: "pike-county-pa",
  name: "Pike County",
  county: "Pike County",
  state: "Pennsylvania",
  stateCode: "PA",
  placeLabel: "Pike County, PA",
  displayTitle: "Pike County, PA",
  contentMode: "local-bundle"
};

const NEAR_NEW_PLATFORM = {
  meta: { fromCache: false },
  location: { lat: 41.34, lng: -75.04 },
  daylight: {
    status: "live",
    moonPhase: "New moon",
    moonIllumination: 3,
    moonPhaseValue: 0.984,
    sunriseFormatted: "6:24 AM",
    sunsetFormatted: "8:57 PM",
    goldenHourEvening: "7:50–8:50 PM",
    goldenHourStatus: "estimated",
    blueHourEvening: "8:57–9:27 PM",
    blueHourStatus: "estimated",
    moonrise: null,
    moonset: null
  },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo" },
    current: {
      temperature: 52,
      feelsLike: 50,
      humidity: 41,
      cloudCover: 12,
      wind: { speed: 4, gust: 6 },
      precipitation: { probability: 5 },
      conditions: { summary: "Clear" }
    }
  },
  airQuality: { status: "live", usAqi: 39, category: "Good", pm25: 10.5 }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-m", "http.server", String(HTTP_PORT), "--bind", "127.0.0.1"], {
      cwd: ROOT,
      stdio: "ignore"
    });
    const url = "http://127.0.0.1:" + HTTP_PORT;
    const t0 = Date.now();
    const tick = () => {
      http
        .get(url + "/", (res) => {
          res.resume();
          resolve({ proc, url });
        })
        .on("error", () => {
          if (Date.now() - t0 > 8000) reject(new Error("static server failed"));
          else setTimeout(tick, 150);
        });
    };
    tick();
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-moon-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 60; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let server = null;
  const BASE = (BASE_ARG || "").replace(/\/$/, "") || null;
  if (!BASE) server = await startStaticServer();
  const base = BASE || server.url;

  const chrome = await startChrome();
  const { default: WebSocket } = await import("ws");
  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.once("open", r);
    ws.once("error", j);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
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

  await send("Page.enable");
  await send("Runtime.enable");

  const failures = [];
  const results = [];

  async function shot(name) {
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(shot.data, "base64"));
  }

  async function evalExpr(expression) {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result && r.result.value;
  }

  async function goto(urlPath) {
    await send("Page.navigate", { url: base + urlPath });
    await delay(1600);
    await evalExpr(`(() => {
      const pike = ${JSON.stringify(PIKE)};
      localStorage.setItem('wds-location-v3', JSON.stringify(pike));
      localStorage.setItem('wds-location-v1', JSON.stringify(pike));
      localStorage.setItem('waypoint-location', JSON.stringify(pike));
      localStorage.setItem('wds-location-prompted', '1');
      const prompt = document.querySelector('#wds-location-prompt, .wds-location-prompt');
      if (prompt) { prompt.setAttribute('hidden', ''); prompt.style.display = 'none'; }
      return true;
    })()`);
    await delay(800);
  }

  async function injectNearNew() {
    return evalExpr(`(() => {
      const platform = ${JSON.stringify(NEAR_NEW_PLATFORM)};
      if (!window.WDS || !WDS.dashboardRebuild || !WDS.dashboardRebuild.setPlatform) {
        return { ok: false, reason: 'no-rebuild' };
      }
      WDS.dashboardRebuild.setPlatform(platform);
      document.querySelectorAll('[data-lazy="pending"]').forEach((el) => {
        try { el.scrollIntoView({ block: "center" }); } catch (e) {}
      });
      const astro = document.querySelector('[data-widget-id="ph-astronomy"]');
      if (astro) {
        try { astro.scrollIntoView({ block: "center" }); } catch (e2) {}
      }
      return { ok: true, lunar: !!(window.WDS && WDS.dashboardLunar) };
    })()`);
  }

  async function measureMoon() {
    return evalExpr(`(() => {
      const tile = document.querySelector('[data-widget-id="ph-astronomy"]');
      const svg = tile && tile.querySelector('[data-lunar-illumination]');
      const rect = tile ? tile.getBoundingClientRect() : null;
      const moon = svg ? svg.getBoundingClientRect() : null;
      const night = tile && [...tile.querySelectorAll('dt')].find(d => /Night sky/i.test(d.textContent || ''));
      const nightRect = night ? night.getBoundingClientRect() : null;
      const overlap = moon && nightRect
        ? !(moon.right < nightRect.left || moon.left > nightRect.right || moon.bottom < nightRect.top || moon.top > nightRect.bottom)
        : false;
      const vw = window.innerWidth;
      return {
        ok: true,
        lazy: tile && tile.getAttribute('data-lazy'),
        illumination: svg && svg.getAttribute('data-lunar-illumination'),
        shape: svg && svg.getAttribute('data-lunar-shape'),
        limb: svg && svg.getAttribute('data-lunar-limb'),
        phase: svg && svg.getAttribute('data-lunar-phase'),
        tileW: rect && Math.round(rect.width),
        moonW: moon && Math.round(moon.width),
        moonH: moon && Math.round(moon.height),
        clipped: moon && rect ? (moon.left < rect.left - 1 || moon.right > rect.right + 2) : null,
        overlapNightSky: overlap,
        innerWidth: vw,
        oneColumn: vw <= 767 && tile && rect ? rect.width / vw >= 0.85 : null,
        hasLunar: !!svg
      };
    })()`);
  }

  async function injectFixtureStrip() {
    return evalExpr(`(() => {
      const Lunar = window.WDS && WDS.dashboardLunar;
      if (!Lunar) return { ok: false };
      let host = document.getElementById('lunar-fixture-strip');
      if (!host) {
        host = document.createElement('div');
        host.id = 'lunar-fixture-strip';
        host.style.cssText = 'display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:12px;background:#120c18;color:#eee;font:12px Inter,sans-serif';
        document.body.prepend(host);
      }
      host.innerHTML = Lunar.FIXTURES.map(f => {
        const s = Lunar.normalize({ phaseValue: f.phaseValue });
        return '<div style="text-align:center">' + Lunar.renderDisk(s, { size: 56 }) +
          '<div>' + f.illumination + '% ' + s.limb + '</div></div>';
      }).join('');
      return { ok: true, count: Lunar.FIXTURES.length };
    })()`);
  }

  for (const vp of [
    { name: "375x812", width: 375, height: 812 },
    { name: "430x932", width: 430, height: 932 }
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: true
    });
    await goto("/?cb=moon-" + vp.name);
    await delay(1200);
    const injected = await injectNearNew();
    await delay(900);
    const info = await measureMoon();
    results.push({ viewport: vp.name, injected, ...info });
    if (!injected || !injected.ok) failures.push(vp.name + ": inject failed " + JSON.stringify(injected));
    if (info && info.illumination !== "3") failures.push(vp.name + ": illumination attr " + info.illumination);
    if (info && info.shape !== "new") failures.push(vp.name + ": shape " + info.shape);
    if (info && info.clipped) failures.push(vp.name + ": moon clipped");
    if (info && info.overlapNightSky) failures.push(vp.name + ": moon overlaps Night Sky text");
    if (info && info.oneColumn === false) failures.push(vp.name + ": one-column broken");
    await delay(400);
    await shot(vp.name + "-near-new");
    await injectFixtureStrip();
    await delay(200);
    await shot(vp.name + "-fixtures");
  }

  fs.writeFileSync(path.join(OUT, "verification.json"), JSON.stringify({ failures, results, ok: failures.length === 0 }, null, 2));

  ws.close();
  chrome.proc.kill("SIGTERM");
  if (server) server.proc.kill("SIGTERM");

  console.log(JSON.stringify({ out: OUT, failures, results }, null, 2));
  if (failures.length) {
    console.error("FAIL", failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS moon accuracy browser verification");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
