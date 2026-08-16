#!/usr/bin/env node
/**
 * Permanent Dashboard instrument-panel gate.
 * Dashboard = daily outdoor instrument panel — not marketing or app directory.
 *
 * Usage:
 *   node automation/test-dashboard-instrument-panel.mjs [baseUrl]
 */
import fs from "fs";
import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { WebSocket } from "ws";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_DASH_CDP_PORT || 9491);
const STATIC_PORT = Number(process.env.WAYPOINT_DASH_STATIC_PORT || 0);

let failed = 0;
function pass(m) {
  console.log("PASS", m);
}
function fail(m) {
  console.error("FAIL", m);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

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

function staticChecks() {
  const html = read("apps/dashboard/index.html");
  if (!/data-product="dashboard"/.test(html)) fail("missing data-product=dashboard");
  else pass("data-product=dashboard");
  if (!/data-product-name="Dashboard"/.test(html)) fail("product name not Dashboard");
  else pass("product-name Dashboard");
  if (!/<title>Dashboard/.test(html)) fail("title not Dashboard");
  else pass("title Dashboard");
  if (!/canonical[^>]*apps\/dashboard\//.test(html)) fail("canonical not /apps/dashboard/");
  else pass("canonical /apps/dashboard/");
  if (!/home-boot\.js/.test(html) || !/wds-dashboard-rebuild\.css/.test(html)) {
    fail("missing Dashboard rebuild boot");
  } else pass("rebuild boot linked");
  if (/was-home-hero|studio-home\.js/.test(html)) fail("dashboard embeds studio homepage modules");
  else pass("not embedding studio homepage");

  const deepen = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js");
  if (/data-deepen="scenes"|data-deepen="sheds"|data-deepen="side-trails"|data-deepen="articles"|data-deepen="photo"|Open Scenes|Open Sheds|Field Notes|Featured Photography|View all Side Trails|SIDE_TRAILS_CARDS/.test(deepen)) {
    fail("deepeners still contain cross-product promo");
  } else pass("no cross-product deepeners");

  const tokens = read("design-system/css/wds-tokens.css");
  if (!/\[data-product="dashboard"\][\s\S]*--wp-accent:\s*var\(--waypoint-orange\)/.test(tokens)) {
    fail("dashboard accent not locked southwest orange");
  } else pass("dashboard DS 2.0 southwest orange accent");

  const sandbox = {
    window: {},
    console,
    location: { pathname: "/apps/dashboard/", hash: "" },
    localStorage: {
      _d: {},
      getItem(k) {
        return this._d[k] == null ? null : this._d[k];
      },
      setItem(k, v) {
        this._d[k] = String(v);
      },
      removeItem(k) {
        delete this._d[k];
      }
    },
    matchMedia() {
      return { matches: false };
    }
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.WDS = {};
  [
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
    "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
  ].forEach((rel) => {
    vm.runInNewContext(read(rel), sandbox, { filename: rel });
  });

  const Prefs = sandbox.WDS.dashboardRebuildPrefs;
  const defaults = Prefs.defaults();
  const need = ["ph-conditions", "ph-next-hours", "ph-doorway", "ph-air", "ph-alerts", "ph-precip-window", "ph-uv", "ph-light", "ph-astronomy"];
  if (!need.every((id) => defaults.enabled.indexOf(id) >= 0)) fail("defaults missing core instruments");
  else pass("core instruments in defaults");
  const order = defaults.order || sandbox.WDS.dashboardRebuildRegistry.defaultOrderIds();
  if (!(order.indexOf("ph-light") < order.indexOf("ph-astronomy"))) fail("Light should precede Astronomy");
  else pass("IA order Light before Astronomy");

  const shell = sandbox.WDS.dashboardRebuild.renderShell({
    view: "workspace",
    placeContext: { placeLabel: "Test Place", trust: "waiting" }
  });
  if (!/Today Outside|wdb-r-today/.test(shell)) fail("workspace missing Today Outside");
  else pass("Today Outside present");
  if (!/data-wdb-r-workspace|wdb-r-workspace/.test(shell)) fail("workspace missing instruments region");
  else pass("workspace instruments region");
  if (/data-deepen="scenes"|data-deepen="sheds"|data-deepen="side-trails"|Field Notes/.test(shell)) {
    fail("workspace shell still has cross-product sections");
  } else pass("workspace shell surface-isolated");

  const customize = sandbox.WDS.dashboardRebuild.renderShell({
    view: "customize",
    placeContext: { placeLabel: "Test Place", trust: "waiting" }
  });
  if (!/Customize|library|data-wdb-r-customize/.test(customize)) fail("customize view broken");
  else pass("customize view renders");
  if (/data-wdb-r-deepen/.test(customize)) fail("customize should omit deepeners");
  else pass("customize omits deepeners");
}

async function cdpEval(ws, expression) {
  const id = Math.floor(Math.random() * 1e9);
  return new Promise((resolve, reject) => {
    const onMsg = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id !== id) return;
      ws.off("message", onMsg);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    };
    ws.on("message", onMsg);
    ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
  });
}

async function browserChecks(baseUrl) {
  if (!fs.existsSync(CHROME)) {
    console.log("SKIP browser (no chrome)");
    return;
  }
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-dash-gate-"));
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
  await delay(1200);
  try {
    const ver = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const ws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.once("open", res);
      ws.once("error", rej);
    });
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const page = targets.find((t) => t.type === "page") || targets[0];
    const session = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      session.once("open", res);
      session.once("error", rej);
    });

    async function send(method, params) {
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

    for (const width of [375, 1440]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: width === 375 ? 812 : 900,
        deviceScaleFactor: 1,
        mobile: width < 800
      });
      await send("Page.navigate", { url: `${baseUrl}/apps/dashboard/?gate=${Date.now()}` });
      await delay(3500);
      const result = await send("Runtime.evaluate", {
        expression: `(() => {
          const title = document.title || "";
          const product = document.documentElement.getAttribute("data-product");
          const today = !!document.querySelector("[data-wdb-r-today], .wdb-r-today");
          const workspace = !!document.querySelector("[data-wdb-r-workspace], .wdb-r-workspace, [data-wdb-r]");
          const scenesPromo = !!document.querySelector('[data-deepen="scenes"], [data-deepen="sheds"], [data-deepen="side-trails"]');
          const fieldNotes = !!document.querySelector('[data-deepen="articles"]');
          const trust = Array.from(document.querySelectorAll("[data-trust], .wds-trust-chip")).slice(0, 8).map(el => el.getAttribute("data-trust") || el.textContent.trim());
          const nan = /\\bNaN\\b|undefined/.test(document.body && document.body.innerText || "");
          const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
          const dashCurrent = !!document.querySelector('.was-primary-nav a[aria-current="page"][href*="dashboard"], .was-primary-nav [aria-current="page"]');
          return { title, product, today, workspace, scenesPromo, fieldNotes, trust, nan, overflow, dashCurrent };
        })()`,
        returnByValue: true
      });
      const v = result.result.value;
      console.log("viewport", width, JSON.stringify(v));
      if (v.product !== "dashboard") fail("product @" + width);
      else pass("product @" + width);
      if (!/Dashboard/i.test(v.title)) fail("title @" + width);
      else pass("title @" + width);
      if (!v.today || !v.workspace) fail("instrument panel missing @" + width);
      else pass("instrument panel @" + width);
      if (v.scenesPromo || v.fieldNotes) fail("cross-product promo visible @" + width);
      else pass("no cross-product promo @" + width);
      if (v.nan) fail("NaN/undefined visible @" + width);
      else pass("no NaN/undefined @" + width);
      if (v.overflow) fail("horizontal overflow @" + width);
      else pass("no h-overflow @" + width);
    }

    session.close();
    ws.close();
  } finally {
    try {
      proc.kill("SIGKILL");
    } catch (e) {}
  }
}

async function main() {
  staticChecks();
  const useLocal = !process.argv[2];
  let server;
  let baseUrl = BASE || "http://127.0.0.1:8765";
  if (useLocal) {
    const { createServer } = await import("http");
    const { readFile } = await import("fs/promises");
    const mime = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".woff2": "font/woff2"
    };
    server = createServer(async (req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath.endsWith("/")) urlPath += "index.html";
        const file = path.join(ROOT, urlPath.replace(/^\//, ""));
        if (!file.startsWith(ROOT)) {
          res.writeHead(403);
          res.end();
          return;
        }
        const buf = await readFile(file);
        res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
        res.end(buf);
      } catch (e) {
        res.writeHead(404);
        res.end("not found");
      }
    });
    await new Promise((r) => server.listen(STATIC_PORT || 0, "127.0.0.1", r));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  }
  try {
    await browserChecks(baseUrl);
  } finally {
    if (server) server.close();
  }
  if (failed) {
    console.error("\nDASHBOARD INSTRUMENT PANEL: FAIL (" + failed + ")");
    process.exit(1);
  }
  console.log("\nDASHBOARD INSTRUMENT PANEL: PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
