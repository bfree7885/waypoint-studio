#!/usr/bin/env node
/**
 * Verify live production deployment at waypointstudio.org.
 * Usage: node scripts/verify-production.mjs
 */
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";

const PROD = process.env.WAYPOINT_PROD_URL || "https://waypointstudio.org";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9224;
const PIKE = { lat: 41.331, lng: -75.038 };
const KANSAS_SUNRISE = /6:14\s*AM/i;
const KANSAS_SUNSET = /9:04\s*PM/i;
const KANSAS_RIVER = /WHITE ROCK C NR BURR OAK,\s*KS/i;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
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
  async send(method, params = {}) {
      const msgId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    },
    close() {
      ws.close();
    }
  };
}

async function main() {
  const { proc, wsUrl } = await startChrome();
  const client = await cdp(wsUrl);
  try {
    await client.send("Page.enable");
    await client.send("Emulation.setGeolocationOverride", {
      latitude: PIKE.lat,
      longitude: PIKE.lng,
      accuracy: 50
    });
    const url = PROD.replace(/\/$/, "") + "/?debug=location";
    await client.send("Page.navigate", { url });
    await delay(3000);
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.getElementById('wds-loc-default');
        if (btn) btn.click();
        return !!btn;
      })()`,
      returnByValue: true
    });
    for (let i = 0; i < 20; i++) {
      await delay(2000);
      const { result } = await client.send("Runtime.evaluate", {
        expression: `(() => {
          const pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
            ? WDS.outdoorIntelligence.getLast() : null;
          const loc = window.WDS && WDS.location && WDS.location.getState
            ? WDS.location.getState() : null;
          const nodes = document.querySelectorAll('.wsky-time__value');
          const body = document.body ? document.body.innerText : '';
          return {
            build: window.__WAYPOINT_BUILD__ || null,
            audit: window.__WAYPOINT_RENDER_AUDIT__ || null,
            hydrated: !!(pkg && pkg.meta && pkg.meta.hydratedAt),
            busy: document.querySelectorAll('[aria-busy="true"]').length,
            sunriseDom: nodes[0] ? nodes[0].textContent.trim() : '',
            sunsetDom: nodes[1] ? nodes[1].textContent.trim() : '',
            hasKansasRiver: ${KANSAS_RIVER}.test(body),
            liveFeed: pkg && pkg.meta ? pkg.meta.liveFeed : null,
            contentSource: pkg && pkg.meta ? pkg.meta.contentSource : null,
            daylight: pkg && pkg.daylight ? {
              sunriseFormatted: pkg.daylight.sunriseFormatted,
              sunsetFormatted: pkg.daylight.sunsetFormatted,
              locationContextId: pkg.daylight.locationContextId,
              requestLat: pkg.daylight.requestLat,
              requestLng: pkg.daylight.requestLng
            } : null,
            usgsSite: pkg && pkg.usgsWater && pkg.usgsWater.nearest
              ? pkg.usgsWater.nearest.siteName : null,
            userCoords: loc ? { lat: loc.lat, lng: loc.lng, timezone: loc.timezone } : null,
            scriptLoads: window.WDS && WDS.build && WDS.build.getScriptLoads
              ? WDS.build.getScriptLoads().length : 0
          };
        })()`,
        returnByValue: true
      });
      const v = result.value || {};
      if (v.hydrated && v.busy === 0 && (v.sunriseDom || v.sunsetDom)) {
        console.log("\n=== PRODUCTION VERIFICATION ===");
        console.log("URL:", url);
        console.log("Deployed commit:", v.build && v.build.commit);
        console.log("Loader version:", v.build && v.build.loaderVersion);
        console.log("User coords:", JSON.stringify(v.userCoords));
        console.log("Sunrise DOM:", v.sunriseDom);
        console.log("Sunset DOM:", v.sunsetDom);
        console.log("River site:", v.usgsSite || "none");
        console.log("Kansas river leak:", v.hasKansasRiver);
        console.log("Content source:", v.contentSource);
        console.log("Daylight package:", JSON.stringify(v.daylight));
        console.log("Script loads tracked:", v.scriptLoads);

        let failed = false;
        if (KANSAS_RIVER.test(v.usgsSite || "") || v.hasKansasRiver) {
          failed = true;
          console.log("FAIL: Kansas river text present");
        }
        if (KANSAS_SUNRISE.test(v.sunriseDom) || KANSAS_SUNSET.test(v.sunsetDom)) {
          failed = true;
          console.log("FAIL: Kansas engine sun times in DOM");
        }
        if (!v.build || !v.build.commit || v.build.commit === "unknown") {
          failed = true;
          console.log("FAIL: build metadata missing");
        }
        if (v.contentSource === "live-engine" || v.liveFeed === true) {
          failed = true;
          console.log("FAIL: platform still marked as live-engine feed");
        }
        console.log(failed ? "\nPRODUCTION VERIFY: FAIL" : "\nPRODUCTION VERIFY: PASS");
        process.exit(failed ? 1 : 0);
      }
    }
    console.log("FAIL: production dashboard did not hydrate in time");
    process.exit(1);
  } finally {
    client.close();
    proc.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("Production verify error:", err.message);
  process.exit(2);
});
