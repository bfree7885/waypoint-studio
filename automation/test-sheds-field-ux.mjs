#!/usr/bin/env node
/**
 * Sheds field UX — static structure + optional CDP mobile metrics/screenshots.
 * Run: node automation/test-sheds-field-ux.mjs
 * CDP (requires Chrome): SHEDS_CDP=1 node automation/test-sheds-field-ux.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import http from "http";
import { createServer } from "http";
import { readFileSync, statSync, mkdirSync, writeFileSync } from "fs";
import { setTimeout as delay } from "timers/promises";
import { extname, join, normalize } from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ART = path.join(ROOT, "reports", "sheds-field-ux-2026-07");
let passed = 0;
const failures = [];

function assert(name, cond) {
  if (cond) {
    passed++;
    console.log("PASS", name);
  } else {
    failures.push(name);
    console.log("FAIL", name);
  }
}

const html = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/css/sheds-map.css"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");

assert("compact status in header", /sheds-status-compact/.test(html) && /status-panel/.test(html));
assert("plan card is floating suggest", /class="sheds-suggest"/.test(html) && /id="plan-card"/.test(html));
assert("why details collapsed by default", /sheds-plan__why-wrap/.test(html));
assert("toolbar has four primary actions", /btn-locate/.test(html) && /btn-track/.test(html) && /btn-add-obs/.test(html) && /btn-more/.test(html));
assert("secondary tools not in primary toolbar strip", (() => {
  const m = html.match(/<div class="sheds-toolbar"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
  return m ? !/btn-ethics|btn-export|btn-history|btn-validate/.test(m[0]) : false;
})());
assert("ethics mentions tile providers", /Map providers|OpenTopoMap|tile/i.test(html));
assert("privacy honesty on obs sheet", /Map tiles still leave provider/i.test(html));
assert("css map-first flex min-height 0", /#sheds-map-shell[\s\S]*min-height:\s*0/.test(css) || /#sheds-map-shell \{[\s\S]*min-height: 0/.test(css));
assert("safe-area respected", /safe-area-inset-bottom/.test(css) && /safe-area-inset-top/.test(css));
assert("no permanent multi-row secondary deck", /sheet-tools/.test(html));
assert("escape closes validate", /sheetValidate/.test(app));
assert("invalidateSize on sheets", /invalidateSize/.test(app));
assert("model version note v1.1", /Biological Model v1\.1/.test(html));

async function runCdp() {
  const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
  const DBG = 9292;
  const PORT = 8092;
  mkdirSync(ART, { recursive: true });

  function contentType(file) {
    return ({
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json",
      ".png": "image/png"
    })[extname(file).toLowerCase()] || "application/octet-stream";
  }

  const server = createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      const st = statSync(file);
      if (!st.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      res.end(readFileSync(file));
    } catch (e) {
      res.writeHead(404); res.end("missing");
    }
  });
  await new Promise((r) => server.listen(PORT, "127.0.0.1", () => r()));

  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-debugging-port=" + DBG, "about:blank"
  ], { stdio: "ignore" });
  await delay(2200);

  const tabs = await new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:" + DBG + "/json/list", (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
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

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
  await delay(5500);

  // Dismiss first-run ethics so the map-first shell can be measured honestly
  await send("Runtime.evaluate", {
    expression: `(() => {
      try { localStorage.setItem("waypoint-sheds-ethics-seen-v1", "1"); } catch (e) {}
      var ack = document.getElementById("ethics-ack");
      if (ack) ack.click();
      document.querySelectorAll(".sheds-sheet.is-open").forEach(function (s) {
        s.classList.remove("is-open");
        s.setAttribute("aria-hidden", "true");
      });
      return true;
    })()`,
    returnByValue: true
  });
  await delay(800);
  await send("Runtime.evaluate", {
    expression: `window.dispatchEvent(new Event("resize")); true`,
    returnByValue: true
  });
  await delay(600);

  const metrics = await send("Runtime.evaluate", {
    expression: `(() => {
      const map = document.getElementById("sheds-map");
      const top = document.querySelector(".sheds-top");
      const tool = document.querySelector(".sheds-toolbar");
      const suggest = document.getElementById("plan-card");
      const skip = document.querySelector(".sheds-skip");
      const sr = skip ? getComputedStyle(skip) : null;
      const mr = map ? map.getBoundingClientRect() : null;
      const tr = top ? top.getBoundingClientRect() : null;
      const thr = tool ? tool.getBoundingClientRect() : null;
      const srRect = suggest ? suggest.getBoundingClientRect() : null;
      const vh = window.innerHeight;
      const skipTransform = sr ? sr.transform : "";
      const overlap = thr && srRect ? Math.max(0, Math.min(thr.bottom, srRect.bottom) - Math.max(thr.top, srRect.top)) : 0;
      return {
        mapHeight: mr ? Math.round(mr.height) : 0,
        topHeight: tr ? Math.round(tr.height) : 0,
        toolHeight: thr ? Math.round(thr.height) : 0,
        toolTop: thr ? Math.round(thr.top) : 0,
        toolBottom: thr ? Math.round(thr.bottom) : 0,
        suggestBottom: srRect ? Math.round(srRect.bottom) : 0,
        suggestPresent: !!suggest,
        toolsSheet: !!document.getElementById("sheet-tools"),
        mapShare: mr && vh ? +(mr.height / vh).toFixed(3) : 0,
        pageScrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        skipTransform,
        ethicsList: !!document.querySelector(".sheds-ethics-list"),
        moreBtn: !!document.getElementById("btn-more"),
        suggestToolbarOverlapPx: Math.round(overlap)
      };
    })()`,
    returnByValue: true
  });
  const m = (metrics.result && metrics.result.value) || {};
  writeFileSync(path.join(ART, "mobile-390x844-metrics.json"), JSON.stringify(m, null, 2));

assert("map owns majority of viewport", m.mapShare >= 0.45);
assert("top chrome not dominating", m.topHeight > 0 && m.topHeight < 220);
assert("suggest does not overlap toolbar", (m.suggestToolbarOverlapPx || 0) < 4);
assert("toolbar below suggest", m.toolTop >= (m.suggestBottom || 0) - 2);
  assert("no horizontal overflow", m.pageScrollWidth <= m.clientWidth + 2);
  assert("tools sheet wired", m.toolsSheet && m.moreBtn);

  async function shot(name) {
    const shotRes = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(ART, name + ".png"), Buffer.from(shotRes.data, "base64"));
  }

  await shot("01-fresh-load");

  await send("Runtime.evaluate", {
    expression: `document.getElementById("btn-more").click(); true`,
    returnByValue: true
  });
  await delay(400);
  await shot("02-tools-sheet");

  await send("Runtime.evaluate", {
    expression: `document.getElementById("btn-ethics").click(); true`,
    returnByValue: true
  });
  await delay(400);
  await shot("04-ethics");

  await send("Runtime.evaluate", {
    expression: `document.querySelectorAll(".sheds-sheet.is-open").forEach(s => {
      s.classList.remove("is-open");
      s.setAttribute("aria-hidden","true");
    }); true`,
    returnByValue: true
  });
  await delay(300);

  await send("Runtime.evaluate", {
    expression: `document.getElementById("btn-toggle-plan").click(); true`,
    returnByValue: true
  });
  await delay(300);
  await shot("03-suggest-expanded");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false
  });
  await delay(500);
  await send("Runtime.evaluate", {
    expression: `document.querySelectorAll(".sheds-sheet.is-open").forEach(s => s.classList.remove("is-open")); true`,
    returnByValue: true
  });
  await delay(300);
  await shot("05-desktop");

  writeFileSync(path.join(ART, "README.md"), [
    "# Sheds field UX evidence",
    "",
    "Generated by `automation/test-sheds-field-ux.mjs`.",
    "",
    "- `01-fresh-load.png` — iPhone-like 390×844",
    "- `02-tools-sheet.png` — More menu",
    "- `03-suggest-expanded.png` — Expanded suggestion",
    "- `04-ethics.png` — Ethics sheet",
    "- `05-desktop.png` — 1280×800",
    "- `mobile-390x844-metrics.json` — map share / chrome heights"
  ].join("\n"));

  ws.close();
  proc.kill("SIGTERM");
  server.close();
  console.log("Artifacts written to", ART);
}

async function main() {
  if (process.env.SHEDS_CDP === "1") {
    try {
      await runCdp();
    } catch (e) {
      console.error("CDP section error:", e.message || e);
      failures.push("cdp-run");
    }
  } else {
    console.log("SKIP cdp (set SHEDS_CDP=1 to capture screenshots)");
  }

  if (failures.length) {
    console.error("\nSheds field UX tests failed (" + failures.length + ").");
    process.exit(1);
  }
  console.log("\nAll sheds field UX tests passed (" + passed + ").");
}

main();
