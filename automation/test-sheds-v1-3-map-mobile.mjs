#!/usr/bin/env node
/**
 * Sheds V1.3 map — mobile overflow at 320 / 375 / 390 / 430.
 * Controls: Search Areas, Inspect, Measure, Import JSON remain.
 *
 * Run: node automation/test-sheds-v1-3-map-mobile.mjs
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
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9351);
const PORT = Number(process.env.SHED_V13_MOBILE_PORT || 8096);
const ART = process.env.SHED_HOST_ARTIFACTS ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(ROOT, "automation/artifacts/sheds-v13-map-mobile"));
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
  const userData = fs.mkdtempSync(path.join("/tmp", "chrome-v13-map-"));
  const proc = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--user-data-dir=" + userData,
    "--remote-debugging-port=" + DBG, "about:blank"
  ], { stdio: "ignore" });

  try {
    const page = await waitForTab().catch(async function () {
      await new Promise(function (resolve, reject) {
        const req = http.get("http://127.0.0.1:" + DBG + "/json/new?about:blank", function (res) {
          let d = "";
          res.on("data", function (c) { d += c; });
          res.on("end", function () { resolve(d); });
        });
        req.on("error", reject);
      });
      return waitForTab();
    });
    const wsPath = path.join(ROOT, "node_modules/ws/index.js");
    if (!fs.existsSync(wsPath)) throw new Error("ws module missing");
    const WebSocket = (await import(wsPath)).default;
    const ws = new WebSocket(page.webSocketDebuggerUrl);
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

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 2, mobile: true
    });
    await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
    await send("Page.loadEventFired").catch(() => {});
    await delay(2500);

    await send("Runtime.evaluate", {
      expression: `(() => {
        try { localStorage.setItem("waypoint-sheds-ethics-seen-v1", "1"); } catch (e) {}
        var ack = document.getElementById("ethics-ack");
        if (ack) ack.click();
        document.querySelectorAll(".sheds-sheet.is-open").forEach(function (s) {
          s.classList.remove("is-open");
          s.setAttribute("aria-hidden", "true");
        });
        var loading = document.getElementById("map-loading");
        if (loading) { loading.classList.add("is-done"); loading.setAttribute("hidden", ""); }
        return {
          searchBtn: !!document.getElementById("btn-search-areas"),
          searchCheck: !!document.getElementById("search-areas-visible"),
          inspect: !!document.getElementById("btn-inspect-point"),
          inspectHud: !!document.getElementById("inspect-hud"),
          measure: !!document.getElementById("btn-measure"),
          importBtn: !!document.getElementById("btn-import"),
          priority: typeof window.WaypointShedsSearchPriority
        };
      })()`,
      returnByValue: true
    }).then(function (res) {
      const v = (res && res.result && res.result.value) || {};
      assert("Search Areas button in DOM", !!v.searchBtn);
      assert("Search Areas checkbox in DOM", !!v.searchCheck);
      assert("Inspect control in DOM", !!v.inspect && !!v.inspectHud);
      assert("Measure control in DOM", !!v.measure);
      assert("Import JSON in DOM", !!v.importBtn);
      assert("SearchPriority module on window", v.priority === "object");
    });

    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true
      });
      await delay(350);
      const metrics = await send("Runtime.evaluate", {
        expression: `(() => {
          window.dispatchEvent(new Event("resize"));
          var hud = document.getElementById("inspect-hud");
          if (hud) {
            hud.removeAttribute("hidden");
            var body = document.getElementById("inspect-body");
            if (body) {
              body.textContent = "Search priority: Higher\\n\\nTerrain\\nGentle southwest-facing bench beside steeper terrain.\\nSlope 8° · southwest-facing · ~412 m (1,352 ft)\\n\\nWhy\\n• Terrain transition may be worth checking.\\n• Moderate slope should be relatively searchable.";
            }
            var note = document.getElementById("inspect-field-note");
            if (note) {
              note.hidden = false;
              note.textContent = "Use the terrain as a search guide, not evidence that sheds are present.";
            }
            document.getElementById("sheds-map-shell").classList.add("is-inspecting");
          }
          var areas = document.getElementById("btn-search-areas");
          if (areas) areas.setAttribute("aria-pressed", "true");
          var legend = document.getElementById("search-areas-legend");
          if (legend) {
            legend.setAttribute("data-on", "true");
            var body = document.getElementById("search-areas-legend-body");
            if (body) body.hidden = false;
          }
          var doc = document.documentElement;
          var inspectBox = hud ? hud.getBoundingClientRect() : null;
          var legendBox = legend ? legend.getBoundingClientRect() : null;
          var toggleBox = areas ? areas.getBoundingClientRect() : null;
          return {
            overflowX: doc.scrollWidth > doc.clientWidth + 2,
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            inspectWidth: inspectBox ? Math.round(inspectBox.width) : 0,
            inspectOverflow: inspectBox ? inspectBox.width > window.innerWidth + 2 : false,
            legendOverflow: legendBox ? legendBox.right > window.innerWidth + 2 : false,
            toggleOverflow: toggleBox ? toggleBox.right > window.innerWidth + 2 : false,
            searchToggle: areas ? areas.getBoundingClientRect().height : 0
          };
        })()`,
        returnByValue: true
      });
      const v = (metrics.result && metrics.result.value) || {};
      assert(vp.name + " no page horizontal overflow", !v.overflowX, "scroll=" + v.scrollWidth + " client=" + v.clientWidth);
      assert(vp.name + " inspect sheet not wider than viewport", !v.inspectOverflow, "w=" + v.inspectWidth);
      assert(vp.name + " Search Areas legend in viewport", !v.legendOverflow);
      assert(vp.name + " Search Areas toggle in viewport", !v.toggleOverflow);
      if (vp.width === 320) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(ART, "v13_map_inspect_320.png"), Buffer.from(shot.data, "base64"));
      }
      if (vp.width === 390) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(ART, "v13_map_390.png"), Buffer.from(shot.data, "base64"));
      }
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
  console.log("\nSheds V1.3 map mobile tests passed.");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
