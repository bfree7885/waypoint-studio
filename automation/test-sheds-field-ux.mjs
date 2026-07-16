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
const ART = path.join(ROOT, "reports", "sheds-field-ux-v1");
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

assert("full-screen map shell absolute", /#sheds-map-shell[\s\S]*position:\s*absolute/.test(css));
assert("floating FAB rail", /sheds-fab-rail/.test(html) && /sheds-fab-rail/.test(css));
assert("bottom sheet field class", /sheds-sheet-field/.test(html) && /sheds-sheet-field/.test(css));
assert("plan card is floating suggest", /class="[^"]*sheds-suggest/.test(html) && /id="plan-card"/.test(html));
assert("today search copy", /Today.?s Search/.test(html));
assert("plan stars confidence", /id="plan-stars"/.test(html));
assert("nav HUD present", /sheds-nav-hud/.test(html) && /id="nav-hud"/.test(html));
assert("why details collapsed by default", /sheds-plan__why-wrap/.test(html));
assert("primary field FABs", /btn-locate/.test(html) && /btn-track/.test(html) && /btn-add-obs/.test(html) && /btn-more/.test(html) && /btn-layers/.test(html));
assert("secondary tools not in FAB rail", (() => {
  const m = html.match(/<div class="sheds-fab-rail"[\s\S]*?<\/div>/);
  return m ? !/btn-ethics|btn-export|btn-history|btn-validate/.test(m[0]) : false;
})());
assert("ethics mentions tile providers", /Map providers|OpenTopoMap|tile/i.test(html));
assert("privacy honesty on obs sheet", /Map tiles still leave provider/i.test(html));
assert("safe-area respected", /safe-area-inset-bottom/.test(css) && /safe-area-inset-top/.test(css));
assert("no permanent multi-row secondary deck", /sheet-tools/.test(html));
assert("escape closes validate", /sheetValidate/.test(app));
assert("invalidateSize on sheets", /invalidateSize/.test(app));
assert("model version note v1.1", /Biological Model v1\.1/.test(html));
assert("GPS accuracy + heading helpers", /accuracyCircle|upsertUserMarker|updateNavMeta/.test(app));
assert("map loading state", /map-loading/.test(html) && /setMapLoading/.test(app));
assert("offline banner", /map-offline/.test(html) && /syncOfflineBanner/.test(app));
assert("soft heat layer polish", /\.sheds-heat-layer/.test(css) && /pointer-events:\s*none/.test(css));
assert("reduced motion respected", /prefers-reduced-motion/.test(css));

async function runCdp() {
  const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
  const DBG = 9293;
  const PORT = 8093;
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

  async function measureViewport(label, width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile
    });
    await delay(400);
    await send("Runtime.evaluate", {
      expression: `window.dispatchEvent(new Event("resize")); true`,
      returnByValue: true
    });
    await delay(500);
    const metrics = await send("Runtime.evaluate", {
      expression: `(() => {
        const map = document.getElementById("sheds-map");
        const fab = document.querySelector(".sheds-fab-rail");
        const suggest = document.getElementById("plan-card");
        const hud = document.querySelector(".sheds-hud-top");
        const mr = map ? map.getBoundingClientRect() : null;
        const fr = fab ? fab.getBoundingClientRect() : null;
        const srRect = suggest ? suggest.getBoundingClientRect() : null;
        const hr = hud ? hud.getBoundingClientRect() : null;
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        return {
          label: ${JSON.stringify(label)},
          mapHeight: mr ? Math.round(mr.height) : 0,
          mapWidth: mr ? Math.round(mr.width) : 0,
          mapShare: mr && vh ? +(mr.height / vh).toFixed(3) : 0,
          hudHeight: hr ? Math.round(hr.height) : 0,
          fabBottom: fr ? Math.round(fr.bottom) : 0,
          suggestTop: srRect ? Math.round(srRect.top) : 0,
          suggestBottom: srRect ? Math.round(srRect.bottom) : 0,
          pageScrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          toolsSheet: !!document.getElementById("sheet-tools"),
          moreBtn: !!document.getElementById("btn-more"),
          layersBtn: !!document.getElementById("btn-layers"),
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
        };
      })()`,
      returnByValue: true
    });
    return (metrics.result && metrics.result.value) || {};
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
  await delay(7000);

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
      if (loading) { loading.classList.add("is-done"); loading.setAttribute("hidden",""); }
      return true;
    })()`,
    returnByValue: true
  });
  await delay(800);

  const mPhone = await measureViewport("iphone-390x844", 390, 844, true);
  writeFileSync(path.join(ART, "mobile-390x844-metrics.json"), JSON.stringify(mPhone, null, 2));

  assert("map owns vast majority of viewport", mPhone.mapShare >= 0.85);
  assert("hud is minimal", mPhone.hudHeight > 0 && mPhone.hudHeight < 80);
  assert("no horizontal overflow phone", !mPhone.overflowX);
  assert("tools sheet wired", mPhone.toolsSheet && mPhone.moreBtn && mPhone.layersBtn);
  assert("sheet peeks above bottom", mPhone.suggestTop > 0 && mPhone.suggestBottom >= mPhone.mapHeight - 4);

  async function shot(name) {
    const shotRes = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(ART, name + ".png"), Buffer.from(shotRes.data, "base64"));
  }

  await shot("01-fresh-load-phone");

  await send("Runtime.evaluate", {
    expression: `document.getElementById("btn-more").click(); true`,
    returnByValue: true
  });
  await delay(400);
  await shot("02-tools-sheet");

  await send("Runtime.evaluate", {
    expression: `document.querySelectorAll(".sheds-sheet.is-open").forEach(s => {
      s.classList.remove("is-open");
      s.setAttribute("aria-hidden","true");
    }); true`,
    returnByValue: true
  });
  await delay(200);

  await send("Runtime.evaluate", {
    expression: `document.getElementById("btn-toggle-plan").click(); true`,
    returnByValue: true
  });
  await delay(400);
  await shot("03-sheet-expanded");

  await send("Runtime.evaluate", {
    expression: `document.getElementById("btn-toggle-plan").click(); true`,
    returnByValue: true
  });
  await delay(300);

  const mAndroid = await measureViewport("android-412x915", 412, 915, true);
  writeFileSync(path.join(ART, "android-412x915-metrics.json"), JSON.stringify(mAndroid, null, 2));
  assert("android map share high", mAndroid.mapShare >= 0.85);
  assert("android no overflow", !mAndroid.overflowX);
  await shot("04-android");

  const mDesk = await measureViewport("desktop-1280x800", 1280, 800, false);
  writeFileSync(path.join(ART, "desktop-1280x800-metrics.json"), JSON.stringify(mDesk, null, 2));
  assert("desktop map fills", mDesk.mapShare >= 0.9);
  await shot("05-desktop");

  writeFileSync(path.join(ART, "README.md"), [
    "# Sheds Field Experience V1 — evidence",
    "",
    "Generated by `SHEDS_CDP=1 node automation/test-sheds-field-ux.mjs`.",
    "",
    "- `01-fresh-load-phone.png` — iPhone-like 390×844 full-screen map",
    "- `02-tools-sheet.png` — More menu",
    "- `03-sheet-expanded.png` — Expanded Today’s Search sheet",
    "- `04-android.png` — 412×915",
    "- `05-desktop.png` — 1280×800",
    "- `*-metrics.json` — map share / overflow"
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
    failures.forEach((f) => console.error(" -", f));
    process.exit(1);
  }
  console.log("\nAll sheds field UX tests passed (" + passed + ").");
}

main();
