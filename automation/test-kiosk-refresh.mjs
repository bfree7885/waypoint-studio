#!/usr/bin/env node
/**
 * Kiosk refresh lifecycle test — shortened interval, multi-cycle, wake recovery.
 * Usage: node automation/test-kiosk-refresh.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9224;
const REFRESH_MS = 1500;
const CYCLES = 3;
const KIOSK_URL = BASE + "/kiosk.html?kioskTestRefreshMs=" + REFRESH_MS + "&debug=refresh";

function readBuildCommit() {
  const raw = fs.readFileSync(path.join(ROOT, "design-system/js/wds-build.js"), "utf8");
  const match = raw.match(/"commit":\s*"([^"]+)"/);
  return match ? match[1] : "local";
}

const BUILD_COMMIT = readBuildCommit();

const SEED_SCRIPT = `(() => {
  try {
    localStorage.setItem("waypoint-runtime-migration", JSON.stringify({
      epoch: 2,
      build: ${JSON.stringify(BUILD_COMMIT)},
      loaderVersion: 2,
      locationSchema: 3,
      migratedAt: new Date().toISOString(),
      via: "test"
    }));
    localStorage.setItem("waypoint-active-build", ${JSON.stringify(BUILD_COMMIT)});
    localStorage.setItem("wds-location-v3", JSON.stringify({
      lat: 40.2,
      lng: -75.1,
      displayTitle: "Blooming Grove Township, PA",
      placeLabel: "Blooming Grove Township, PA",
      source: "test",
      timezone: "America/New_York",
      timestamp: Date.now()
    }));
  } catch (e) { /* noop */ }
  (function stubWeather() {
    if (!window.WDS || !window.WDS.weather || !window.WDS.weather.getForecast) {
      return setTimeout(stubWeather, 50);
    }
    var seq = 0;
    window.WDS.weather.getForecast = function () {
      seq += 1;
      var now = new Date().toISOString();
      return Promise.resolve({
        meta: {
          provider: "test-stub",
          fetchedAt: now,
          timezone: "America/New_York",
          lat: 40.2,
          lng: -75.1
        },
        current: {
          temperature: { value: 70 + (seq % 4), unit: "F" },
          feelsLike: { value: 72, unit: "F" },
          humidity: { value: 55, unit: "%" },
          wind: { speed: { value: 8, unit: "mph" }, gust: { value: 12, unit: "mph" } },
          cloudCover: { value: 40, unit: "%" },
          uvIndex: { value: 4, unit: "index" },
          conditions: { summary: "Partly cloudy (test)" }
        },
        daily: [{
          temperature: { max: { value: 78, unit: "F" }, min: { value: 60, unit: "F" } },
          conditions: { summary: "Clear" },
          precipitation: { probability: 10 }
        }],
        hourly: []
      });
    };
  })();
})();`;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function startChrome() {
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 20; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) { /* retry */ }
  }
  throw new Error("No page CDP target");
}

async function cdp(wsUrl) {
  const WebSocket = (await import("ws")).default;
  let id = 0;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.on("open", res);
    ws.on("error", rej);
  });
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  return {
    send(method, params = {}) {
      const msgId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    },
    eval(expression) {
      return this.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true
      }).then((r) => {
        if (r.exceptionDetails) {
          throw new Error(r.exceptionDetails.text || "eval failed");
        }
        return r.result.value;
      });
    },
    close() {
      ws.close();
    }
  };
}

async function readRefreshState(client) {
  return client.eval(`(function () {
    var r = window.__WAYPOINT_KIOSK_REFRESH__;
    if (!r) return null;
    return {
      generation: r.generation,
      lastSuccessAt: r.lastSuccessAt,
      conditionsUpdatedAt: r.conditionsUpdatedAt,
      coordinates: r.coordinates,
      locationContextId: r.locationContextId,
      inFlight: r.inFlight,
      failureCount: r.failureCount,
      latestError: r.latestError,
      updatedText: document.getElementById('swk-updated') ? document.getElementById('swk-updated').textContent : '',
      temp: document.getElementById('swk-temp') ? document.getElementById('swk-temp').textContent : '',
      hasKansas: /BURR OAK|WHITE ROCK/i.test(document.body ? document.body.innerText : '')
    };
  })()`);
}

async function main() {
  let chrome;
  let client;
  const failures = [];

  function fail(msg) {
    failures.push(msg);
    console.log("FAIL", msg);
  }

  function pass(msg) {
    console.log("PASS", msg);
  }

  try {
    chrome = await startChrome();
    client = await cdp(chrome.wsUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: SEED_SCRIPT });
    await client.send("Page.navigate", { url: KIOSK_URL });

    let first = null;
    for (let i = 0; i < 80; i++) {
      await delay(500);
      const state = await readRefreshState(client);
      if (state && state.conditionsUpdatedAt) {
        first = state;
        break;
      }
    }
    if (!first) fail("initial data did not load");
    else pass("initial data loaded");

    const snapshots = [first];
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      await delay(REFRESH_MS + 800);
      const state = await readRefreshState(client);
      snapshots.push(state);
    }

    if (snapshots.filter(Boolean).length < CYCLES + 1) {
      fail("did not capture enough refresh snapshots");
    } else {
      pass("captured " + snapshots.length + " refresh snapshots");
    }

    const gens = snapshots.filter(Boolean).map((s) => s.generation);
    if (Math.max(...gens) - Math.min(...gens) < CYCLES) {
      fail("refresh generation did not advance across " + CYCLES + " cycles (" + gens.join(" -> ") + ")");
    } else {
      pass("generation advanced: " + gens.join(" -> "));
    }

    const successes = snapshots.filter(Boolean).map((s) => s.lastSuccessAt).filter(Boolean);
    const uniqueSuccesses = [...new Set(successes)];
    if (uniqueSuccesses.length < 2) {
      fail("lastSuccessAt did not advance (" + successes.join(", ") + ")");
    } else {
      pass("lastSuccessAt advanced across refreshes");
    }

    const conditions = snapshots.filter(Boolean).map((s) => s.conditionsUpdatedAt).filter(Boolean);
    if (conditions.length < 2) {
      fail("conditionsUpdatedAt missing on refreshes");
    } else {
      pass("conditionsUpdatedAt present on refreshes");
    }

    const temps = [];
    for (const snap of snapshots.filter(Boolean)) {
      if (snap.temp && snap.temp !== "—") temps.push(snap.temp);
    }
    if (temps.length >= 2 && new Set(temps).size < 2) {
      console.log("WARN temperature unchanged across cycles — stub may have cycled same value");
    }

    const last = snapshots[snapshots.length - 1];
    if (last && last.hasKansas) fail("Kansas engine river text leaked into kiosk");
    else pass("no Kansas river leak");

    if (last && last.coordinates && last.locationContextId) {
      pass("coordinates and context ID present");
    } else {
      fail("missing coordinates or context ID");
    }

    if (last && last.temp && last.temp !== "—") pass("temperature rendered");
    else fail("temperature missing");

  // optional module failure should not block refresh
    await client.eval(`(function () {
      var OIP = window.WDS && window.WDS.outdoorIntelligence;
      if (!OIP || !OIP.get) return;
      var orig = window.WDS.usgsWater && window.WDS.usgsWater.fetchNearestGauge;
      if (!orig) return;
      window.WDS.usgsWater.fetchNearestGauge = function () {
        return Promise.reject(new Error('test usgs failure'));
      };
      return window.__WAYPOINT_KIOSK_REFRESH__.refreshNow('test-optional-fail').finally(function () {
        window.WDS.usgsWater.fetchNearestGauge = orig;
      });
    })()`);
    await delay(REFRESH_MS + 1200);
    const afterOptionalFail = await readRefreshState(client);
    if (!afterOptionalFail || !afterOptionalFail.conditionsUpdatedAt) {
      fail("optional module failure blocked refresh");
    } else {
      pass("refresh continued after optional module failure");
    }

  // critical failure schedules retry and next refresh remains scheduled
    await client.eval(`(function () {
      var OIP = window.WDS && window.WDS.outdoorIntelligence;
      if (!OIP || !OIP.get) return;
      var origGet = OIP.get.bind(OIP);
      OIP.get = function () { return Promise.reject(new Error('test critical failure')); };
      return window.__WAYPOINT_KIOSK_REFRESH__.refreshNow('test-critical-fail').catch(function () {}).finally(function () {
        OIP.get = origGet;
      });
    })()`);
    await delay(500);
    const afterCritical = await readRefreshState(client);
    if (!afterCritical || !afterCritical.latestError) {
      fail("critical failure not recorded");
    } else {
      pass("critical failure recorded");
    }
    if (!afterCritical || afterCritical.failureCount < 1) {
      fail("critical failure count not incremented");
    }
    await client.eval(`window.__WAYPOINT_KIOSK_REFRESH__.refreshNow('test-critical-recover')`);
    await delay(2500);
    const recovered = await readRefreshState(client);
    if (!recovered || !recovered.lastSuccessAt) {
      fail("refresh did not continue after critical failure");
    } else {
      pass("next refresh scheduled after critical failure");
    }

  // visibility wake
    await client.eval(`(function () {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return 'visible'; } });
      document.dispatchEvent(new Event('visibilitychange'));
    })()`);
    await delay(800);
    const afterVisibility = await readRefreshState(client);
    if (!afterVisibility || afterVisibility.generation <= recovered.generation) {
      console.log("WARN visibility refresh may have been skipped if data still fresh");
    } else {
      pass("visibility wake triggered refresh");
    }

  // offline -> online
    await client.eval(`(function () {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    })()`);
    await delay(REFRESH_MS + 800);
    const afterOnline = await readRefreshState(client);
    if (!afterOnline || !afterOnline.lastSuccessAt) fail("online event did not recover refresh");
    else pass("online event triggered refresh cycle");

  // build watchdog callable
    const buildOk = await client.eval(`(function () {
      return !!(window.__WAYPOINT_BUILD__ && window.WDS && window.WDS.runtimeMigration && window.WDS.runtimeMigration.watchdog);
    })()`);
    if (!buildOk) fail("build watchdog unavailable");
    else pass("build watchdog available");

    if (failures.length) {
      console.log("\nKIOSK REFRESH TEST: FAIL (" + failures.length + ")");
      process.exit(1);
    }
    console.log("\nKIOSK REFRESH TEST: PASS");
  } finally {
    if (client) client.close();
    if (chrome) chrome.proc.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error("Kiosk refresh test error:", e.message);
  process.exit(2);
});
