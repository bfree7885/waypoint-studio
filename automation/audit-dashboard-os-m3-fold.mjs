#!/usr/bin/env node
/**
 * Milestone 3 publish gate — Day Arc fold variance across viewports.
 * Does NOT compress primary briefing to force Day Arc above the fold.
 *
 * Usage: node automation/audit-dashboard-os-m3-fold.mjs [baseUrl]
 * Writes: docs/dashboard-os-m3-publish/fold-audit.json
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8799").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9361);
const OUT_DIR = path.join(ROOT, "docs/dashboard-os-m3-publish");
const OUT_JSON = path.join(OUT_DIR, "fold-audit.json");

const VIEWPORTS = [
  { name: "desktop-1440x900", width: 1440, height: 900, mobile: false },
  { name: "desktop-1366x768", width: 1366, height: 768, mobile: false },
  { name: "desktop-1280x720", width: 1280, height: 720, mobile: false },
  { name: "tablet-1024x768", width: 1024, height: 768, mobile: false },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true },
  { name: "mobile-large-430x932", width: 430, height: 932, mobile: true }
];

const PIKE = {
  source: "manual",
  lat: 41.34,
  lng: -75.04,
  timestamp: Date.now(),
  regionId: "pike-county-pa",
  name: "Pike County",
  county: "Pike County",
  state: "Pennsylvania",
  stateCode: "PA",
  placeLabel: "Pike County, PA",
  displayTitle: "Pike County, PA",
  contentMode: "local-bundle"
};

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-os-m3-fold-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 60; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl, userDataDir };
    } catch (_) { /* retry */ }
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function cdp(wsUrl) {
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.on("open", res);
    ws.on("error", rej);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  return {
    send,
    close: () => {
      try {
        ws.close();
      } catch (_) { /* noop */ }
    }
  };
}

async function evaluate(send, expression) {
  const { result } = await send("Runtime.evaluate", { expression, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "evaluate failed");
  }
  return result.value;
}

async function waitHydrated(send, timeoutMs = 60000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await evaluate(
      send,
      `(() => {
        const os = document.querySelector("[data-wdb-os]");
        if (!os) return { ok: false, reason: "no-os" };
        const mode = os.getAttribute("data-wdb-os-mode");
        const headline = (document.querySelector(".wdb-os__happening-headline") || {}).textContent || "";
        const loading = !!document.querySelector("[data-wdb-os-region='loading']");
        const finding = /Finding today/i.test(headline);
        const matters = document.querySelectorAll(".wdb-os__matters-item").length;
        const doPrimary = (document.querySelector(".wdb-os__do-primary") || {}).textContent || "";
        return {
          ok: mode === "briefing" && !loading && !finding && !!headline && !!doPrimary && matters >= 1,
          mode, headline, doPrimary, matters
        };
      })()`
    );
    if (last && last.ok) return last;
    await delay(500);
  }
  return last || { ok: false };
}

function regionTop(sel) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
  })()`;
}

async function measureFold(send, vp) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 1,
    mobile: vp.mobile
  });
  await send("Page.navigate", { url: BASE + "/apps/dashboard/" });
  await delay(600);
  const hydrated = await waitHydrated(send);
  const metrics = await evaluate(
    send,
    `(() => {
      const vh = window.innerHeight;
      const measure = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          height: Math.round(r.height),
          fullyAboveFold: r.bottom <= vh,
          partiallyAboveFold: r.top < vh
        };
      };
      const happening = measure("[data-wdb-os-region='happening'], .wdb-os__happening");
      const matters = measure("[data-wdb-os-region='matters'], .wdb-os__matters");
      const doit = measure("[data-wdb-os-region='do'], .wdb-os__do");
      const dayArc = measure("[data-wdb-os-open='day-arc'], [data-wdb-os-region='day-arc'], .wdb-os__day-arc, button[aria-controls*='day']");
      // Prefer explicit Day Arc control / section
      let day = dayArc;
      if (!day) {
        const buttons = Array.from(document.querySelectorAll("button, a, [role='button']"));
        const btn = buttons.find((b) => /day arc/i.test(b.textContent || ""));
        if (btn) {
          const r = btn.getBoundingClientRect();
          day = {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            height: Math.round(r.height),
            fullyAboveFold: r.bottom <= vh,
            partiallyAboveFold: r.top < vh
          };
        }
      }
      const priorityOrder = [];
      if (happening) priorityOrder.push({ id: "happening", top: happening.top });
      if (matters) priorityOrder.push({ id: "matters", top: matters.top });
      if (doit) priorityOrder.push({ id: "do", top: doit.top });
      const orderOk =
        priorityOrder.length === 3 &&
        priorityOrder[0].id === "happening" &&
        priorityOrder[1].id === "matters" &&
        priorityOrder[2].id === "do" &&
        priorityOrder[0].top <= priorityOrder[1].top &&
        priorityOrder[1].top <= priorityOrder[2].top;
      const primaryAbove =
        !!(happening && happening.partiallyAboveFold) &&
        !!(matters && matters.partiallyAboveFold) &&
        !!(doit && doit.partiallyAboveFold);
      return {
        viewportHeight: vh,
        happening,
        matters,
        do: doit,
        dayArc: day,
        priorityOrderOk: orderOk,
        primaryBriefingVisibleInFirstViewport: primaryAbove,
        dayArcFullyAboveFold: !!(day && day.fullyAboveFold),
        dayArcPartiallyAboveFold: !!(day && day.partiallyAboveFold),
        legacyChrome: !!(
          document.querySelector("[data-wdb-recovery], [data-wdb-v2], [data-wdb-v3], .wdb-v2, .wdb-v3") ||
          /Customize widgets/i.test(document.body && document.body.innerText || "")
        )
      };
    })()`
  );
  return { viewport: vp, hydrated, ...metrics };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const chrome = await startChrome();
  const session = await cdp(chrome.wsUrl);
  const { send } = session;
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => {
        try {
          localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify(PIKE))});
          localStorage.setItem("wds-location-prompt-dismissed", "1");
          localStorage.setItem("waypoint-dashboard-v2", "1");
          localStorage.setItem("waypoint-dashboard-v3", "1");
        } catch (e) {}
      })();`
    });
    const results = [];
    for (const vp of VIEWPORTS) {
      console.log("measuring", vp.name);
      results.push(await measureFold(send, vp));
    }
    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE,
      policy:
        "Priority order Happening → What Matters → Do This must stay visible in first viewport when content allows. Day Arc may sit below fold on short screens. Do not compress primary briefing to force Day Arc above fold.",
      results,
      summary: {
        allPriorityOrderOk: results.every((r) => r.priorityOrderOk),
        allPrimaryVisible: results.every((r) => r.primaryBriefingVisibleInFirstViewport),
        anyLegacyChrome: results.some((r) => r.legacyChrome),
        dayArcBelowFoldOn: results
          .filter((r) => r.dayArc && !r.dayArcFullyAboveFold)
          .map((r) => r.viewport.name)
      }
    };
    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    console.log("wrote", OUT_JSON);
    console.log(JSON.stringify(report.summary, null, 2));
    if (!report.summary.allPriorityOrderOk || report.summary.anyLegacyChrome) {
      process.exitCode = 1;
    }
  } finally {
    session.close();
    chrome.proc.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
