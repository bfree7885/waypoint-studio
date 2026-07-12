#!/usr/bin/env node
/**
 * Mobile layout checks — portrait and landscape (~320–430px wide).
 * Usage: node automation/mobile-layout.mjs [baseUrl]
 */
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9225;
const VIEWPORTS = [
  { name: "iphone-portrait", width: 390, height: 844 },
  { name: "iphone-narrow", width: 320, height: 568 },
  { name: "iphone-landscape", width: 844, height: 390 }
];
const PAGES = [
  { name: "studio-home", path: "/", waitMs: 4000 },
  { name: "dashboard", path: "/apps/dashboard/", waitMs: 12000 },
  { name: "kiosk", path: "/kiosk.html", waitMs: 8000 },
  { name: "status", path: "/status.html", waitMs: 4000 },
  { name: "scenes", path: "/apps/scenes/", waitMs: 4000 },
  { name: "photo-coach", path: "/apps/photo-coach/", waitMs: 8000 }
];

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
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--disable-extensions", "--disable-dev-shm-usage",
    `--remote-debugging-port=${PORT}`, "about:blank"
  ], { stdio: "ignore" });
  for (let i = 0; i < 20; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) { /* retry */ }
  }
  throw new Error("Chrome CDP unavailable");
}

async function cdp(wsUrl) {
  const WebSocket = (await import("ws")).default;
  let id = 0;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  return { send, close: () => ws.close() };
}

async function testPage(client, page, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 3,
    mobile: true
  });
  await client.send("Page.navigate", { url: BASE + page.path });
  await delay(page.waitMs);

  const { result } = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const doc = document.documentElement;
      const panels = Array.from(document.querySelectorAll(
        '.swk-panel, .wdb-widget, .wdb-section, .wle-card, .swk-topbar, .swk-statusbar, .wdb-brief, .wdb-doc, .pc-section, .pc-card, .pc-nav, .scenes-feature, .coach-dashboard, .coach-drop-zone, .mode-coach'
      ));
      const overlaps = [];
      for (let i = 0; i < panels.length; i++) {
        const a = panels[i].getBoundingClientRect();
        if (a.width < 1 || a.height < 1) continue;
        for (let j = i + 1; j < panels.length; j++) {
          const b = panels[j].getBoundingClientRect();
          if (b.width < 1 || b.height < 1) continue;
          if (a.bottom > b.top + 2 && b.bottom > a.top + 2 &&
              a.right > b.left + 2 && b.right > a.left + 2 &&
              !(a.contains(panels[j]) || panels[j].contains(panels[i]))) {
            overlaps.push(panels[i].className + ' vs ' + panels[j].className);
          }
        }
      }
      return {
        hScroll: doc.scrollWidth > doc.clientWidth + 1,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overlapCount: overlaps.length,
        overlaps: overlaps.slice(0, 5)
      };
    })()`,
    returnByValue: true
  });
  return {
    viewport: viewport.name,
    page: page.name,
    url: BASE + page.path,
    layout: result.value || {}
  };
}

async function main() {
  let chrome;
  let client;
  const results = [];
  try {
    chrome = await startChrome();
    client = await cdp(chrome.wsUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    for (const viewport of VIEWPORTS) {
      for (const page of PAGES) {
        results.push(await testPage(client, page, viewport));
      }
    }
  } finally {
    if (client) client.close();
    if (chrome) chrome.proc.kill("SIGTERM");
  }

  let failed = false;
  console.log(`Mobile layout test — ${BASE}\n`);
  for (const r of results) {
    const l = r.layout;
    const issues = [];
    if (l.hScroll) issues.push(`horizontal scroll (${l.scrollWidth}px > ${l.clientWidth}px)`);
    if (l.overlapCount > 0) issues.push(`${l.overlapCount} overlap(s): ${(l.overlaps || []).join("; ")}`);
    const label = `${r.viewport} / ${r.page}`;
    console.log(`${label}: ${issues.length ? "FAIL — " + issues.join("; ") : "PASS"}`);
    if (issues.length) failed = true;
  }
  if (failed) process.exitCode = 1;
  else console.log("\nMOBILE LAYOUT: PASS");
}

main().catch((err) => {
  console.error("mobile-layout failed:", err.message || err);
  process.exit(1);
});
