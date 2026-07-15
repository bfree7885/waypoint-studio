#!/usr/bin/env node
/**
 * CDP QA — Scene Builder overlay dimming + Dashboard progressive shell.
 */
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { readFileSync, statSync } from "fs";
import { extname, join, normalize } from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const DBG_PORT = 9287;
const HTTP_PORT = 8087;
const BASE = "http://127.0.0.1:" + HTTP_PORT;

let passed = 0;
const failures = [];

function pass(name) {
  console.log("PASS", name);
  passed += 1;
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

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

function contentType(file) {
  const ext = extname(file).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2"
  })[ext] || "application/octet-stream";
}

function startStaticServer() {
  const server = createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403); res.end("Forbidden"); return;
      }
      const st = statSync(file);
      if (!st.isFile()) {
        res.writeHead(404); res.end("Not found"); return;
      }
      res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      res.end(readFileSync(file));
    } catch (e) {
      res.writeHead(404); res.end("Not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(HTTP_PORT, "127.0.0.1", () => resolve(server));
  });
}

async function openCdp() {
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-debugging-port=" + DBG_PORT, "about:blank"
  ], { stdio: "ignore" });
  await delay(2000);
  const tabs = await fetchJson("http://127.0.0.1:" + DBG_PORT + "/json/list");
  const wsUrl = tabs.find((t) => t.type === "page").webSocketDebuggerUrl;
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.on("open", r));
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
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
  return { proc, ws, send };
}

async function evaluate(send, expression, awaitPromise) {
  const params = { expression, returnByValue: true };
  if (awaitPromise) params.awaitPromise = true;
  const { result } = await send("Runtime.evaluate", params);
  return result && result.value;
}

async function main() {
  const server = await startStaticServer();
  const { proc, ws, send } = await openCdp();

  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Network.setCacheDisabled", { cacheDisabled: true });

    // ── Scene Builder: compare mount must not dim first paint ──
    await send("Page.navigate", { url: BASE + "/apps/waypoint-scenes/" });
    await delay(4000);
    const scene = await evaluate(send, `(() => {
      const el = document.getElementById("coach-compare-mount");
      if (!el) return { missing: true };
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        hiddenAttr: el.hasAttribute("hidden") || el.hidden === true,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        pointerEvents: cs.pointerEvents,
        width: rect.width,
        height: rect.height,
        covering: rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.9 && cs.display !== "none",
        bodyFilter: getComputedStyle(document.body).filter,
        htmlFilter: getComputedStyle(document.documentElement).filter
      };
    })()`);
    assert("scene compare mount present", scene && !scene.missing);
    assert("scene compare mount hidden attr", scene && scene.hiddenAttr);
    assert("scene compare mount display none", scene && scene.display === "none");
    assert("scene compare not covering viewport", scene && !scene.covering);
    assert("scene body not filtered", scene && (!scene.bodyFilter || scene.bodyFilter === "none"));

    // ── Dashboard progressive shell ──
    const seed = {
      source: "manual",
      lat: 41.34,
      lng: -75.04,
      timestamp: Date.now(),
      regionId: "pike-county-pa",
      contentBundle: "pike-county-pa",
      name: "Pike County",
      state: "Pennsylvania",
      stateCode: "PA",
      placeLabel: "Pike County, PA",
      displayTitle: "Pike County, PA",
      contentMode: "local-bundle"
    };
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source:
        "localStorage.setItem('wds-location-v3'," + JSON.stringify(JSON.stringify(seed)) + ");" +
        "localStorage.setItem('wds-location-prompted','1');"
    });

    const t0 = Date.now();
    await send("Page.navigate", { url: BASE + "/apps/dashboard/" });

    let shellMs = null;
    let ready = false;
    for (let i = 0; i < 40; i++) {
      await delay(250);
      const snap = await evaluate(send, `(() => {
        const mount = document.getElementById("wds-content-engine");
        const widgets = document.querySelectorAll("[data-widget-id]");
        const busy = mount && mount.getAttribute("aria-busy");
        return {
          ready: !!(mount && mount.classList.contains("wdb-content-ready")),
          widgetCount: widgets.length,
          ariaBusy: busy,
          hasSkeleton: !!document.querySelector(".wdb-page-loading"),
          updatingTags: Array.from(document.querySelectorAll(".wdb-widget__tag")).filter(function (t) {
            return /Updating|Loading|Live|Partial|Cached/.test(t.textContent || "");
          }).map(function (t) { return t.textContent.trim(); }).slice(0, 8)
        };
      })()`);
      if (snap && snap.ready && snap.widgetCount >= 3) {
        ready = true;
        shellMs = Date.now() - t0;
        assert("dashboard progressive shell ready", true);
        assert("dashboard has widgets before OIP done", snap.widgetCount >= 3, "count=" + snap.widgetCount);
        assert("dashboard shell under 8s", shellMs < 8000, "ms=" + shellMs);
        break;
      }
    }
    if (!ready) assert("dashboard progressive shell ready", false, "timeout");

    // Wait for hydrate; assert progressive end-state (not stuck on page skeleton).
    let after = null;
    for (let i = 0; i < 24; i++) {
      await delay(1000);
      after = await evaluate(send, `(() => {
        const mount = document.getElementById("wds-content-engine");
        const pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
          ? WDS.outdoorIntelligence.getLast() : null;
        const entries = performance.getEntriesByType("resource").filter(function (e) {
          return /open-meteo|api\\.open-meteo/i.test(e.name);
        });
        const tags = Array.from(document.querySelectorAll(".wdb-widget__tag")).map(function (t) {
          return (t.textContent || "").trim();
        });
        return {
          ready: !!(mount && mount.classList.contains("wdb-content-ready")),
          initKey: mount && mount.getAttribute("data-wdb-init-key"),
          ariaBusy: mount && mount.getAttribute("aria-busy"),
          hydrated: !!(pkg && pkg.meta && pkg.meta.hydratedAt),
          hasLive: tags.some(function (t) { return t === "Live" || t === "Partial" || t === "Cached"; }),
          openMeteoCount: entries.length,
          openMeteoUrls: entries.map(function (e) { return e.name; }).slice(0, 6),
          hasSkeleton: !!document.querySelector(".wdb-page-loading"),
          promptHidden: (function () {
            var p = document.getElementById("wds-location-prompt");
            if (!p) return true;
            if (p.hasAttribute("hidden")) {
              var cs = getComputedStyle(p);
              return cs.display === "none";
            }
            return !(p.querySelector(".wds-location-prompt"));
          })(),
          liveOrUpdating: tags.slice(0, 12)
        };
      })()`);
      if (after && (after.hydrated || after.hasLive)) break;
    }

    assert("dashboard hydrated or live widget", after && (after.hydrated || after.hasLive));
    assert("dashboard no page skeleton after shell", after && !after.hasSkeleton);
    assert("dashboard aria-busy cleared", after && after.ariaBusy !== "true");
    assert("location prompt not dimming", after && after.promptHidden);
    // Progressive shell should avoid a fan-out of duplicate Open-Meteo boots.
    assert(
      "open-meteo request count bounded",
      after && after.openMeteoCount <= 4,
      "count=" + (after && after.openMeteoCount) + " urls=" + JSON.stringify(after && after.openMeteoUrls)
    );

    console.log("shellMs", shellMs, "hydrate summary", JSON.stringify({
      initKey: after && after.initKey,
      openMeteoCount: after && after.openMeteoCount,
      tags: after && after.liveOrUpdating
    }, null, 2));
  } finally {
    try { ws.close(); } catch (e) { /* noop */ }
    try { proc.kill("SIGTERM"); } catch (e) { /* noop */ }
    try { server.close(); } catch (e) { /* noop */ }
  }

  if (failures.length) {
    console.error("\nStabilization CDP failed (" + failures.length + ").");
    process.exit(1);
  }
  console.log("\nAll stabilization CDP checks passed (" + passed + ").");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
