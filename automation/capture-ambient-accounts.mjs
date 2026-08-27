#!/usr/bin/env node
/**
 * Phase 2 lifecycle capture: mock magic-link → checkout → entitlement → cancel.
 * Screenshots go to /opt/cursor/artifacts. Labeled mock Stripe stand-in — not stripe.com.
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
const BASE = (process.argv[2] || "http://127.0.0.1:8080").replace(/\/$/, "");
const ART = "/opt/cursor/artifacts";
const CHROME =
  process.env.CHROME_PATH ||
  ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"].find((p) =>
    fs.existsSync(p)
  );
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9342);

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
  window.__wpAmbientPlace = place;
  window.__wpAmbientPlatform = platform;
  if (WDS.naturalEvents && WDS.naturalEvents.setCatalog) {
    WDS.naturalEvents.setCatalog({ version: "test", events: [] });
  }
  if (WDS.dashboardRebuild.setPlaceContext) WDS.dashboardRebuild.setPlaceContext(place);
  if (WDS.dashboardRebuild.setPlatform) WDS.dashboardRebuild.setPlatform(platform);
  return { ok: true, view: WDS.dashboardRebuild.getView && WDS.dashboardRebuild.getView() };
})()`;

const SEED_HISTORY = `(() => {
  const WDS = window.WDS;
  if (!WDS || !WDS.dashboardRebuildAmbientStore || !WDS.dashboardRebuildAmbientSnapshot) {
    return Promise.resolve({ ok: false, reason: "no-store" });
  }
  const now = new Date();
  const earlier = new Date(now.getTime() - 3 * 3600 * 1000);
  const place = window.__wpAmbientPlace;
  const platformNow = window.__wpAmbientPlatform;
  if (!place || !platformNow) return Promise.resolve({ ok: false, reason: "no-fixture" });
  const prevPlatform = JSON.parse(JSON.stringify(platformNow));
  prevPlatform.weatherRef.current.temperature = 43;
  prevPlatform.weatherRef.current.feelsLike = 40;
  const prev = WDS.dashboardRebuildAmbientSnapshot.compose({
    platform: prevPlatform,
    placeContext: place,
    now: earlier,
    catalog: { version: "test", events: [] }
  });
  return WDS.dashboardRebuildAmbientStore.resetForTests().then(function () {
    return WDS.dashboardRebuildAmbientStore.ingest(prev, { force: true, capturedAt: earlier });
  }).then(function (write) {
    if (WDS.dashboardRebuild.paint) WDS.dashboardRebuild.paint({ animate: false });
    return { ok: !!write && write.persisted, reason: write && write.reason };
  });
})()`;

async function main() {
  if (!CHROME) throw new Error("no chrome");
  const health = await fetchJson("http://127.0.0.1:8787/v1/health");
  assert("accounts mock health", health.ok === true && health.stripe === "mock" && health.liveBilling === false);

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-ambient-accounts-"));
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

    let msgId = 1;
    async function send(method, params = {}) {
      const id = msgId++;
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
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false
    });

    async function waitReady(expr, tries = 60) {
      for (let i = 0; i < tries; i++) {
        const ready = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
        if (ready.result && ready.result.value) return true;
        await delay(200);
      }
      return false;
    }

    async function evalExpr(expression, awaitPromise) {
      const res = await send("Runtime.evaluate", {
        expression,
        awaitPromise: !!awaitPromise,
        returnByValue: true
      });
      return res.result && res.result.value;
    }

    async function screenshot(name) {
      const png = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const file = path.join(ART, name + ".png");
      fs.writeFileSync(file, Buffer.from(png.data, "base64"));
      console.log("SHOT", file);
      return file;
    }

    async function bodyText() {
      return evalExpr(`(document.body && document.body.innerText || "").replace(/\\s+/g, " ").slice(0, 1200)`);
    }

    await send("Page.navigate", { url: BASE + "/apps/dashboard/#/ambient" });
    assert(
      "ambient booted",
      await waitReady(`!!(window.WDS && WDS.dashboardRebuild && document.querySelector("[data-wdb-r-ambient]"))`)
    );
    await evalExpr(FIXTURE);
    await delay(600);
    await screenshot("ambient_anonymous_preview");
    const anonText = await bodyText();
    assert("anonymous preview has Get Ambient", /Get Ambient/.test(anonText));
    assert("anonymous preview names $4.99", /\$4\.99/.test(anonText));
    assert("anonymous preview does not invent a temperature drop", !/Temperature ↓/.test(anonText));

    await send("Page.navigate", { url: BASE + "/apps/dashboard/#/" });
    assert("discover booted", await waitReady(`!!document.querySelector("[data-wdb-r-today], [data-wdb-r-workspace]")`));
    await evalExpr(FIXTURE);
    await delay(400);
    await screenshot("discover_free_with_billing_present");
    const disc = await bodyText();
    assert("Discover is not Ambient paywall", !/Get Ambient/.test(disc) && !/\$4\.99/.test(disc));

    await send("Page.navigate", { url: BASE + "/apps/dashboard/#/ambient" });
    await waitReady(`!!document.querySelector("[data-wdb-r-ambient]")`);
    await evalExpr(FIXTURE);
    await delay(500);
    await evalExpr(`document.querySelector('[data-ambient-action="signin"]').click()`);
    await delay(400);
    await evalExpr(`(function(){
      const input = document.querySelector("#wdb-r-ambient-email");
      if (!input) return false;
      input.value = "owner+" + Date.now() + "@example.com";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return input.value;
    })()`);
    await evalExpr(`document.querySelector("[data-ambient-signin]").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))`);
    const magicReady = await waitReady(`!!document.querySelector("[data-ambient-test-magic]")`, 40);
    assert("test-mode magic link shown", magicReady);
    await screenshot("ambient_signed_out_upgrade_ui");

    const magicHref = await evalExpr(`document.querySelector("[data-ambient-test-magic]").href`);
    assert("magic href is consume URL", /\/v1\/auth\/consume/.test(String(magicHref)));
    await send("Page.navigate", { url: magicHref });
    await delay(800);
    await waitReady(`!!(window.WDS && WDS.dashboardRebuild)`);
    await waitReady(`!!document.querySelector("[data-wdb-r-ambient]")`);
    await evalExpr(FIXTURE);
    await delay(1200);
    for (let i = 0; i < 15; i++) {
      const txt = await bodyText();
      if (/@example.com/.test(txt) && /Ambient preview/.test(txt)) break;
      await delay(400);
    }
    await screenshot("ambient_signed_in_free");
    const freeText = await bodyText();
    assert("signed-in free shows email", /@example.com/.test(freeText));
    assert("signed-in free is preview", /Ambient preview/.test(freeText));

    await evalExpr(`document.querySelector('[data-ambient-action="subscribe"]').click()`);
    await delay(800);
    const checkoutUrl = await evalExpr(`location.href`);
    assert("landed on mock checkout", /__stripe_test_checkout/.test(String(checkoutUrl)));
    await screenshot("stripe_test_checkout_standin");
    const checkoutText = await bodyText();
    assert("checkout labeled as stand-in", /STRIPE TEST-MODE STAND-IN/.test(checkoutText));
    assert("checkout shows $4.99", /\$4\.99/.test(checkoutText));

    await evalExpr(`document.querySelector("form").submit()`);
    await delay(1000);
    await waitReady(`!!(window.WDS && WDS.dashboardRebuild && document.querySelector("[data-wdb-r]"))`, 50);
    await evalExpr(FIXTURE);
    let entitled = false;
    for (let i = 0; i < 20; i++) {
      const sess = await evalExpr(
        `(window.WDS && WDS.waypointAccounts && WDS.waypointAccounts.refresh)
          ? WDS.waypointAccounts.refresh().then(() => WDS.waypointAccounts.session())
          : Promise.resolve(null)`,
        true
      );
      if (sess && sess.ambient && sess.ambient.entitled) {
        entitled = true;
        break;
      }
      await delay(500);
    }
    assert("server entitlement became active", entitled);
    await evalExpr(SEED_HISTORY, true);
    await delay(600);
    await screenshot("ambient_active_subscriber");
    const paidText = await bodyText();
    assert("active chrome", /Ambient active/.test(paidText) && /Manage subscription/.test(paidText));
    assert("paid history change visible", /Temperature ↓ 9°F/.test(paidText), paidText.slice(0, 500));

    await screenshot("ambient_account_billing_active");
    await evalExpr(`document.querySelector('[data-ambient-action="portal"]').click()`);
    await delay(800);
    await screenshot("stripe_test_portal_standin");
    const portalText = await bodyText();
    assert("portal labeled stand-in", /STRIPE CUSTOMER PORTAL STAND-IN/.test(portalText));
    await evalExpr(`document.querySelector("form").submit()`);
    await delay(1000);
    await waitReady(`!!document.querySelector("[data-wdb-r-ambient]")`, 50);
    await evalExpr(FIXTURE);
    for (let i = 0; i < 20; i++) {
      const sess = await evalExpr(
        `(window.WDS && WDS.waypointAccounts && WDS.waypointAccounts.refresh)
          ? WDS.waypointAccounts.refresh().then(() => WDS.waypointAccounts.session())
          : Promise.resolve(null)`,
        true
      );
      if (sess && sess.ambient && sess.ambient.surface === "inactive") break;
      await delay(400);
    }
    await evalExpr(SEED_HISTORY, true);
    await delay(500);
    await screenshot("ambient_canceled_inactive");
    const inactiveText = await bodyText();
    assert("inactive chrome", /Ambient inactive/.test(inactiveText) && /Resubscribe/.test(inactiveText));
    assert("inactive hides paid change", !/Temperature ↓/.test(inactiveText));

    await send("Page.navigate", { url: BASE + "/apps/dashboard/#/" });
    await waitReady(`!!document.querySelector("[data-wdb-r-today], [data-wdb-r-workspace]")`);
    await evalExpr(FIXTURE);
    await delay(400);
    await screenshot("discover_after_cancel");
    const disc2 = await bodyText();
    const discoverDom = await evalExpr(`!!document.querySelector("[data-wdb-r-today], [data-wdb-r-workspace]") && !document.querySelector("[data-wdb-r-ambient]")`);
    assert("Discover still works after cancel", discoverDom === true, disc2.slice(0, 200));

    session.close();
    console.log("\nAMBIENT ACCOUNTS CAPTURE: PASS");
  } finally {
    try {
      proc.kill();
    } catch (e) {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
