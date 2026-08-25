#!/usr/bin/env node
/**
 * Sheds field UX — Experience Redesign V1 structure + optional CDP screenshots.
 * Run: node automation/test-sheds-field-ux.mjs
 * CDP: SHEDS_CDP=1 node automation/test-sheds-field-ux.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import http from "http";
import { createServer } from "http";
import { readFileSync, statSync, mkdirSync, writeFileSync, copyFileSync } from "fs";
import { setTimeout as delay } from "timers/promises";
import { extname, join, normalize } from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ART = path.join(ROOT, "reports", "sheds-field-ux-v1");
const REDESIGN = path.join(ROOT, "reports", "sheds-experience-redesign-v1");
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
assert("story sheet copy", /(Field briefing|Today.?s Search)/.test(html) && /sheds-story/.test(html) && /data-todays-search/.test(html));
assert("plain-language confidence", /id="plan-stars"/.test(html) && /(Evidence support|Confidence|Next:)/.test(html) && /aria-label="(Evidence support|Confidence|Next step)"/.test(html));
assert("presence chip", /sheds-here/.test(html) && /id="nav-hud"/.test(html) && /btn-here-chip/.test(html));
assert("why details collapsed by default", /sheds-plan__why-wrap/.test(html));
assert("primary intention FABs", /btn-locate/.test(html) && /btn-track/.test(html) && /btn-more/.test(html));
assert("map controls cluster + app dock", /sheds-map-ctrls/.test(html) && /sheds-app-dock/.test(html));
assert("mobile field chrome breakpoint", /@media \(max-width:\s*719px\),\s*\(max-height:\s*500px\)/.test(css) && /sheds-app-dock/.test(css));
assert("collapsible landscape legend", /btn-heat-legend-toggle/.test(html) && /data-expanded/.test(html.match(/id="heat-legend"[^>]*/)[0]));
assert("labeled zoom in field rail (not Leaflet stack)", /btn-zoom-in/.test(html) && /btn-zoom-out/.test(html) && /sheds-zoom-pair/.test(css));
assert("no Leaflet zoom control added", !/L\.control\.zoom\(/.test(app));
assert("add note on FAB for field speed", (() => {
  const fabStart = html.indexOf('class="sheds-fab-rail"');
  const fabChunk = fabStart >= 0 ? html.slice(fabStart, fabStart + 2500) : "";
  const tools = html.match(/id="sheet-tools"[\s\S]*?<\/div>\s*<\/div>/);
  if (!fabChunk || !tools) return false;
  return /btn-add-obs-fab/.test(fabChunk) && /btn-locate/.test(fabChunk) &&
    !/btn-layers/.test(fabChunk) && /btn-layers/.test(tools[0]) && /btn-add-obs/.test(tools[0]);
})());
assert("legend deferred until heat", /id="heat-legend"/.test(html) && /hidden/.test(html.match(/id="heat-legend"[^>]*/)[0]));
assert("expanded briefing hides attribution over copy", /plan-card\[data-expanded="true"\].*leaflet-control-attribution[\s\S]*display:\s*none/i.test(css.replace(/\s+/g, " ")) || /#sheds-map-shell:has\(#plan-card\[data-expanded="true"\]\)\s+\.leaflet-control-attribution\s*\{[^}]*display:\s*none/i.test(css));
assert("field rail owns zoom chrome", /sheds-zoom-pair/.test(html) && /leaflet-bottom\.leaflet-right[\s\S]{0,80}display:\s*none/i.test(css));

assert("privacy honesty on obs sheet", /Map tiles still leave provider/i.test(html));
assert("safe-area respected", /safe-area-inset-bottom/.test(css) && /safe-area-inset-top/.test(css));
assert("no permanent multi-row secondary deck", /sheet-tools/.test(html));
assert("escape closes validate", /sheetValidate/.test(app));
assert("invalidateSize on sheets", /invalidateSize/.test(app));
assert("model version note v2.0", /Biological Model v2\.0|Seasonal timing, landscape guidance|Never a find probability/.test(html));
assert("GPS accuracy + heading helpers", /accuracyCircle|upsertUserMarker|updateNavMeta/.test(app));
assert("map loading state", /map-loading/.test(html) && /setMapLoading/.test(app));
assert("offline banner", /map-offline/.test(html) && /syncOfflineBanner/.test(app));
assert("soft heat layer polish", /\.sheds-heat-layer/.test(css) && /pointer-events:\s*none/.test(css));
assert("reduced motion respected", /prefers-reduced-motion/.test(css));
assert("confidence phrase helper", /confidencePhrase/.test(app) && /dayQualityLine/.test(app));
assert("field briefing helper", /fieldConditionLines/.test(app));
assert("GPS denial memory", /waypoint-sheds-gps-denied-v1/.test(app));
assert("no empty star glyphs in empty plan", !/☆☆☆☆☆/.test(app));
assert("field design system doc", fs.existsSync(path.join(ROOT, "docs/WAYPOINT-FIELD-DESIGN-SYSTEM.md")));
assert("redesign rationale doc", fs.existsSync(path.join(ROOT, "docs/SHEDS-EXPERIENCE-REDESIGN-V1.md")));
assert("autonomy show on map", /Show on map|Show area to inspect/.test(html));

async function runCdp() {
  const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
  const DBG = 9293;
  const PORT = 8093;
  mkdirSync(ART, { recursive: true });
  mkdirSync(path.join(REDESIGN, "after"), { recursive: true });

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
  const wsCandidates = [
    path.join(ROOT, "node_modules/ws/index.js"),
    path.join(ROOT, "../../node_modules/ws/index.js"),
    path.join(ROOT, "../node_modules/ws/index.js")
  ];
  const wsPath = wsCandidates.find((p) => fs.existsSync(p));
  if (!wsPath) throw new Error("ws module not found (install deps or link node_modules/ws)");
  const WebSocket = (await import(wsPath)).default;
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
        const here = document.querySelector(".sheds-here");
        const fabBtns = fab ? fab.querySelectorAll(".sheds-fab:not([hidden])").length : 0;
        const dockBtns = document.querySelectorAll(".sheds-app-dock .sheds-fab:not([hidden])").length;
        const mapCtrlBtns = document.querySelectorAll(".sheds-map-ctrls .sheds-fab:not([hidden])").length;
        const mr = map ? map.getBoundingClientRect() : null;
        const fr = fab ? fab.getBoundingClientRect() : null;
        const dock = document.querySelector(".sheds-app-dock");
        const dockRect = dock ? dock.getBoundingClientRect() : null;
        const mapCtrls = document.querySelector(".sheds-map-ctrls");
        const mapCtrlsRect = mapCtrls ? mapCtrls.getBoundingClientRect() : null;
        const srRect = suggest ? suggest.getBoundingClientRect() : null;
        const hr = hud ? hud.getBoundingClientRect() : null;
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const peekH = srRect ? Math.max(0, vh - srRect.top) : 0;
        const dockH = dockRect ? dockRect.height : 0;
        const chromeShare = vh ? +((peekH + dockH) / vh).toFixed(3) : 0;
        return {
          label: ${JSON.stringify(label)},
          mapHeight: mr ? Math.round(mr.height) : 0,
          mapWidth: mr ? Math.round(mr.width) : 0,
          mapShare: mr && vh ? +(mr.height / vh).toFixed(3) : 0,
          chromeShare,
          peekHeight: Math.round(peekH),
          dockHeight: Math.round(dockH),
          hudHeight: hr ? Math.round(hr.height) : 0,
          fabCount: fabBtns,
          dockCount: dockBtns,
          mapCtrlCount: mapCtrlBtns,
          mapCtrlsTop: mapCtrlsRect ? Math.round(mapCtrlsRect.top) : 0,
          mapCtrlsWidth: mapCtrlsRect ? Math.round(mapCtrlsRect.width) : 0,
          hasHere: !!here,
          storyGlance: (document.getElementById("plan-glance") || {}).textContent || "",
          fabBottom: fr ? Math.round(fr.bottom) : 0,
          suggestTop: srRect ? Math.round(srRect.top) : 0,
          suggestBottom: srRect ? Math.round(srRect.bottom) : 0,
          pageScrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          toolsSheet: !!document.getElementById("sheet-tools"),
          moreBtn: !!document.getElementById("btn-more"),
          layersInTools: !!document.querySelector("#sheet-tools #btn-layers"),
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
      try { localStorage.setItem("waypoint-sheds-first-run-coach-v1", "1"); } catch (e) {}
      var ack = document.getElementById("ethics-ack");
      if (ack) ack.click();
      var coachDismiss = document.getElementById("btn-coach-dismiss");
      if (coachDismiss) coachDismiss.click();
      var coach = document.getElementById("first-run-coach");
      if (coach) coach.setAttribute("hidden", "");
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
  assert("lean app dock (Search/Note/Plan/More)", mPhone.dockCount === 4);
  assert("compact map controls (not control tower)", mPhone.mapCtrlCount <= 4 && mPhone.mapCtrlsWidth < 90);
  assert("briefing + dock leave most map visible", mPhone.chromeShare > 0 && mPhone.chromeShare <= 0.28);
  assert("presence chip present", mPhone.hasHere);
  assert("no horizontal overflow phone", !mPhone.overflowX);
  assert("tools sheet wired", mPhone.toolsSheet && mPhone.moreBtn && mPhone.layersInTools);
  assert("sheet peeks above bottom", mPhone.suggestTop > 0 && mPhone.suggestBottom >= mPhone.mapHeight - 4);

  async function shot(name) {
    const shotRes = await send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(shotRes.data, "base64");
    writeFileSync(path.join(ART, name + ".png"), buf);
    writeFileSync(path.join(REDESIGN, "after", name + ".png"), buf);
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
    "# Sheds Field UX — Experience Redesign V1 evidence",
    "",
    "Generated by `SHEDS_CDP=1 node automation/test-sheds-field-ux.mjs`.",
    "",
    "- `01-fresh-load-phone.png`",
    "- `02-tools-sheet.png`",
    "- `03-sheet-expanded.png`",
    "- `04-android.png`",
    "- `05-desktop.png`",
    "- `*-metrics.json`"
  ].join("\n"));

  writeFileSync(path.join(REDESIGN, "README.md"), [
    "# Sheds Experience Redesign V1 — evidence",
    "",
    "## Before (prior Field Experience V1)",
    "- `before/01-fresh-load-phone.png`",
    "- `before/03-sheet-expanded.png`",
    "- `before/05-desktop.png`",
    "",
    "## After (Experience Redesign V1)",
    "- `after/01-fresh-load-phone.png`",
    "- `after/02-tools-sheet.png`",
    "- `after/03-sheet-expanded.png`",
    "- `after/04-android.png`",
    "- `after/05-desktop.png`",
    "",
    "See `docs/SHEDS-EXPERIENCE-REDESIGN-V1.md` and `docs/WAYPOINT-FIELD-DESIGN-SYSTEM.md`."
  ].join("\n"));

  ws.close();
  proc.kill("SIGTERM");
  server.close();
  console.log("Artifacts written to", ART, "and", REDESIGN);
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
