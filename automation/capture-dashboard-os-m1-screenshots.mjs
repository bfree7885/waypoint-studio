#!/usr/bin/env node
/**
 * Milestone 1 closeout — hydrated Outdoor OS screenshots (CDP).
 * Captures real briefing states; injects alert/partial only when noted.
 *
 * Usage: node automation/capture-dashboard-os-m1-screenshots.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9339);
const OUT = path.join(ROOT, "docs/dashboard-os-m1-screenshots");
const INDEX = path.join(OUT, "SCREENSHOT-INDEX.md");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-os-m1-"));
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

async function evaluate(send, expression, awaitPromise) {
  const params = { expression, returnByValue: true };
  if (awaitPromise) params.awaitPromise = true;
  const { result } = await send("Runtime.evaluate", params);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "evaluate failed");
  }
  return result.value;
}

async function setViewport(send, width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 800
  });
}

async function shot(send, filename) {
  const res = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const dest = path.join(OUT, filename);
  fs.writeFileSync(dest, Buffer.from(res.data, "base64"));
  console.log("wrote", filename);
  return dest;
}

async function seedLocation(send, loc) {
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      try {
        localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify(loc))});
        localStorage.setItem("wds-location-prompt-dismissed", "1");
      } catch (e) {}
    })();`
  });
}

async function clearLocation(send) {
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      try {
        localStorage.removeItem("wds-location-v3");
        localStorage.removeItem("wds-location-v2");
        localStorage.removeItem("wds-location-v1");
        localStorage.removeItem("wds-location-prompt-dismissed");
      } catch (e) {}
    })();`
  });
}

async function navigate(send, url) {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url });
  await delay(800);
  // Wait for document ready
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(send, "document.readyState");
    if (ready === "complete") break;
    await delay(200);
  }
}

async function waitHydrated(send, timeoutMs = 45000) {
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
        const finding = /Finding today/i.test(headline) || /Finding today/i.test(document.body.innerText || "");
        const matters = document.querySelectorAll(".wdb-os__matters-item").length;
        const doPrimary = (document.querySelector(".wdb-os__do-primary") || {}).textContent || "";
        const place = (document.querySelector("[data-wdb-os-region='place-time']") || {}).textContent || "";
        const quietApps = !document.querySelector("#was-apps-btn");
        const quietChrome = !!document.querySelector("[data-was-quiet-chrome]");
        return {
          ok: mode === "briefing" && !loading && !finding && !!headline && !!doPrimary && matters >= 1,
          mode, headline, doPrimary, matters, place, quietApps, quietChrome, loading, finding
        };
      })()`
    );
    if (last && last.ok) return last;
    await delay(500);
  }
  return last || { ok: false };
}

async function waitLoadingVisible(send, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const st = await evaluate(
      send,
      `(() => {
        const loading = !!document.querySelector("[data-wdb-os-region='loading'], .wdb-os-boot");
        const copy = (document.body.innerText || "").slice(0, 200);
        return { ok: loading || /Finding today/i.test(copy), copy };
      })()`
    );
    if (st.ok) return st;
    await delay(100);
  }
  return { ok: false };
}

async function openPanel(send, id) {
  await evaluate(
    send,
    `(() => {
      const root = document.querySelector("[data-wdb-os]");
      if (!root) return false;
      const btn = root.querySelector('[data-wdb-os-open="${id}"]');
      if (btn) { btn.click(); return true; }
      // fallback: force via render API if bind missed
      const host = root.querySelector("[data-wdb-os-panel-host]");
      const view = root._wdbOsView || (window.WDS && WDS.dashboardOS && WDS.dashboardOS.buildView({}));
      if (host && WDS.dashboardOSRender && view) {
        host.innerHTML = WDS.dashboardOSRender.renderPanel("${id}", view);
        host.hidden = false;
        root.classList.add("is-panel-open");
        return true;
      }
      return false;
    })()`
  );
  await delay(400);
}

async function closePanel(send) {
  await evaluate(
    send,
    `(() => {
      const root = document.querySelector("[data-wdb-os]");
      if (!root) return;
      const host = root.querySelector("[data-wdb-os-panel-host]");
      if (host) { host.innerHTML = ""; host.hidden = true; }
      root.classList.remove("is-panel-open");
    })()`
  );
  await delay(200);
}

async function injectAlertView(send) {
  return evaluate(
    send,
    `(() => {
      const root = document.querySelector("[data-wdb-os]");
      if (!root || !WDS.dashboardOSRender || !WDS.dashboardOSCompose) return { ok: false };
      const view = root._wdbOsView || WDS.dashboardOS.buildView({}) || {};
      const next = Object.assign({}, view, {
        mode: "briefing",
        alert: {
          severity: "Severe",
          text: "Severe · Thunderstorm Watch until 6pm · Stay near shelter",
          more: "",
          items: [{
            event: "Severe Thunderstorm Watch",
            severity: "Severe",
            headline: "Damaging winds and lightning possible through early evening",
            summary: "Stay near sturdy shelter this afternoon."
          }]
        },
        matters: [
          { text: "Storm timing shapes the afternoon plan", panel: "alerts", rank: 1 },
          { text: "Finish exposed time before mid-afternoon", panel: "conditions", rank: 2 }
        ],
        do: {
          primary: "Morning only outdoors — finish by early afternoon",
          alternate: "Alternate: short sheltered walk near cover",
          rationale: ["Official alert", "Safety outranks opportunity today."]
        }
      });
      root._wdbOsView = next;
      const html = WDS.dashboardOSRender.renderScreen(next);
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      const fresh = wrap.firstElementChild;
      root.replaceWith(fresh);
      const host = document.querySelector("#outdoor-dashboard, #wds-content-engine");
      const mounted = document.querySelector("[data-wdb-os]");
      if (mounted && WDS.dashboardOS && WDS.dashboardOS.bind) {
        WDS.dashboardOS.bind(host || document.body, {});
        mounted._wdbOsView = next;
      }
      return { ok: true, mode: mounted && mounted.getAttribute("data-wdb-os-mode") };
    })()`
  );
}

async function injectPartialView(send) {
  return evaluate(
    send,
    `(() => {
      const root = document.querySelector("[data-wdb-os]");
      if (!root || !WDS.dashboardOSRender) return { ok: false };
      const view = Object.assign({}, root._wdbOsView || {}, {
        mode: "briefing",
        trust: { status: "Partial", detail: "as of 11:54p" },
        happening: {
          headline: "Cool, partly cloudy, light air",
          support: "Some outdoor signals are missing — briefing uses what we have.",
          panel: "conditions"
        },
        matters: [
          { text: "Air quality unavailable for this place", panel: "sources", rank: 1 },
          { text: "Weather is usable; water data missing", panel: "conditions", rank: 2 }
        ],
        do: {
          primary: "Go with care using the weather we have",
          alternate: "Alternate: check Sources before longer plans",
          rationale: ["Partial briefing", "Do not invent missing domains."]
        },
        gateways: [
          { id: "conditions", label: "Conditions" },
          { id: "light", label: "Light" },
          { id: "sources", label: "Sources" }
        ],
        providers: [
          { id: "weather", provider: "Weather", status: "Live", age: "—" },
          { id: "air", provider: "Air quality", status: "Unavailable", age: "—" },
          { id: "water", provider: "Water", status: "Unavailable", age: "—" }
        ]
      });
      root._wdbOsView = view;
      const html = WDS.dashboardOSRender.renderScreen(view);
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      const fresh = wrap.firstElementChild;
      root.replaceWith(fresh);
      const mounted = document.querySelector("[data-wdb-os]");
      const host = document.querySelector("#outdoor-dashboard, #wds-content-engine");
      if (mounted && WDS.dashboardOS && WDS.dashboardOS.bind) {
        WDS.dashboardOS.bind(host || document.body, {});
        mounted._wdbOsView = view;
      }
      return { ok: true };
    })()`
  );
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // Remove stale loading-only captures that conflict with numbered set
  for (const stale of [
    "desktop-briefing.png",
    "mobile-briefing.png",
    "desktop-empty.png",
    "mobile-empty.png",
    "dashboard-os-briefing-first-viewport.png",
    "dashboard-os-empty-location.png",
    "dashboard-os-empty-with-prompt.png"
  ]) {
    const p = path.join(OUT, stale);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  const { proc, wsUrl } = await startChrome();
  const client = await cdp(wsUrl);
  const { send } = client;
  const notes = [];

  try {
    // ---- Loading (seed location, capture early) ----
    await clearLocation(send);
    await seedLocation(send, PIKE);
    await setViewport(send, 1280, 800);
    // Navigate with cache-bust; capture ASAP while loading
    await navigate(send, BASE + "/apps/dashboard/?m1=loading-desktop&t=" + Date.now());
    const loadDesk = await waitLoadingVisible(send, 6000);
    if (loadDesk.ok) {
      await shot(send, "03-desktop-loading.png");
      notes.push("03-desktop-loading.png — real §5.1 loading / Finding today’s conditions (seeded place, pre-hydrate)");
    } else {
      // Force loading mode via render API
      await evaluate(
        send,
        `(() => {
          const host = document.querySelector("#outdoor-dashboard") || document.querySelector("#wds-content-engine");
          if (!host || !WDS.dashboardOSRender) return false;
          host.innerHTML = WDS.dashboardOSRender.renderScreen({
            mode: "loading",
            placeTime: "Tuesday · Near Pike County",
            atmosphere: "neutral"
          });
          return true;
        })()`
      );
      await delay(200);
      await shot(send, "03-desktop-loading.png");
      notes.push("03-desktop-loading.png — forced loading render via dashboardOSRender (hydrate raced past boot)");
    }

    await setViewport(send, 390, 844);
    await navigate(send, BASE + "/apps/dashboard/?m1=loading-mobile&t=" + Date.now());
    const loadMob = await waitLoadingVisible(send, 6000);
    if (!loadMob.ok) {
      await evaluate(
        send,
        `(() => {
          const host = document.querySelector("#outdoor-dashboard") || document.querySelector("#wds-content-engine");
          if (!host || !WDS.dashboardOSRender) return false;
          host.innerHTML = WDS.dashboardOSRender.renderScreen({
            mode: "loading",
            placeTime: "Tuesday · Near Pike County",
            atmosphere: "neutral"
          });
          return true;
        })()`
      );
      await delay(200);
      notes.push("04-mobile-loading.png — forced loading render via dashboardOSRender");
    } else {
      notes.push("04-mobile-loading.png — real §5.1 loading on mobile viewport");
    }
    await shot(send, "04-mobile-loading.png");

    // ---- Hydrated desktop briefing ----
    await setViewport(send, 1280, 800);
    await navigate(send, BASE + "/apps/dashboard/?m1=brief-desktop&t=" + Date.now());
    let hyd = await waitHydrated(send, 60000);
    console.log("hydrate desktop", hyd);
    if (!hyd.ok) {
      throw new Error("Desktop briefing did not hydrate: " + JSON.stringify(hyd));
    }
    notes.push(
      "01-desktop-hydrated.png — live hydrated Outside briefing (Pike County); quiet chrome=" +
        hyd.quietChrome +
        " no Apps=" +
        hyd.quietApps
    );
    await shot(send, "01-desktop-hydrated.png");

    // Audit snapshot
    const audit = await evaluate(
      send,
      `(() => {
        const text = (sel) => ((document.querySelector(sel) || {}).textContent || "").trim();
        const regions = [...document.querySelectorAll("[data-wdb-os-region]")].map(el => el.getAttribute("data-wdb-os-region"));
        const cards = document.querySelectorAll(".wdb-widget, .wdb-v2-panels, [data-wdb-card]").length;
        const tabs = document.querySelectorAll(".was-local__nav a, [role='tablist'] .wdb-tab").length;
        const gauges = document.querySelectorAll(".wdb-v2-panel, .wdb-gauge").length;
        const volunteer = /Volunteer/i.test(document.querySelector("[data-wdb-os]")?.innerText || "");
        const apps = !!document.querySelector("#was-apps-btn");
        const words = (document.querySelector("[data-wdb-os-region='composition']") || {}).innerText || "";
        const wc = words.trim().split(/\\s+/).filter(Boolean).length;
        return {
          regions, cards, tabs, gauges, volunteer, apps,
          happening: text(".wdb-os__happening-headline"),
          matters: document.querySelectorAll(".wdb-os__matters-item").length,
          doPrimary: text(".wdb-os__do-primary"),
          doAlt: text(".wdb-os__do-alt"),
          sources: text(".wdb-os__sources-cue"),
          wordCountComposition: wc,
          brand: text(".wdb-os__brand"),
          quietChrome: !!document.querySelector("[data-was-quiet-chrome]")
        };
      })()`
    );
    console.log("AUDIT", JSON.stringify(audit, null, 2));
    fs.writeFileSync(path.join(OUT, "audit-desktop.json"), JSON.stringify(audit, null, 2));

    // Location panel
    await openPanel(send, "location");
    await shot(send, "07-location-detail-panel.png");
    notes.push("07-location-detail-panel.png — §3.10 Location panel (Use my location + search)");
    await closePanel(send);

    // Environmental detail (Conditions)
    await openPanel(send, "conditions");
    await shot(send, "08-conditions-detail-panel.png");
    notes.push("08-conditions-detail-panel.png — Conditions environmental detail panel");
    await closePanel(send);

    // Sources
    await openPanel(send, "sources");
    await shot(send, "09-sources-panel.png");
    notes.push("09-sources-panel.png — Sources trust panel");
    await closePanel(send);

    // After-scroll Day Arc + Look closer
    await evaluate(
      send,
      `(() => {
        const after = document.querySelector("[data-wdb-os-region='after-scroll']");
        if (after) after.scrollIntoView({ block: "start" });
        window.scrollBy(0, 120);
        return true;
      })()`
    );
    await delay(300);
    await shot(send, "10-after-scroll-dayarc-look-closer.png");
    notes.push("10-after-scroll-dayarc-look-closer.png — scrolled: Day arc area + Look closer gateways");

    // Scroll back; alert inject
    await evaluate(send, "window.scrollTo(0,0)");
    await delay(200);
    const alertOk = await injectAlertView(send);
    console.log("alert inject", alertOk);
    await delay(300);
    await shot(send, "05-active-alert.png");
    notes.push(
      "05-active-alert.png — alert interrupt injected via console (dashboardOSRender + synthetic alert view); visual-only, no audio"
    );

    // Partial
    await navigate(send, BASE + "/apps/dashboard/?m1=partial&t=" + Date.now());
    hyd = await waitHydrated(send, 60000);
    if (!hyd.ok) console.warn("rehydrate for partial failed", hyd);
    await injectPartialView(send);
    await delay(300);
    await shot(send, "06-partial-data.png");
    notes.push(
      "06-partial-data.png — Partial trust + narrowed Matters/Do injected via console after real place hydrate"
    );

    // ---- Mobile hydrated ----
    await setViewport(send, 390, 844);
    await navigate(send, BASE + "/apps/dashboard/?m1=brief-mobile&t=" + Date.now());
    hyd = await waitHydrated(send, 60000);
    console.log("hydrate mobile", hyd);
    if (!hyd.ok) throw new Error("Mobile briefing did not hydrate: " + JSON.stringify(hyd));
    await shot(send, "02-mobile-hydrated.png");
    notes.push("02-mobile-hydrated.png — live hydrated Outside briefing on 390×844");

    const indexBody =
      "# Dashboard OS M1 Screenshot Index\n\n" +
      "**Captured:** " +
      new Date().toISOString() +
      "\n**Method:** Chrome headless CDP against `" +
      BASE +
      "/apps/dashboard/` with Pike County seeded in `wds-location-v3`. Waited for `data-wdb-os-mode=briefing` with Happening + Do (not “Finding today’s…”).\n\n" +
      "| File | What it shows |\n|------|----------------|\n" +
      notes
        .map((n) => {
          const file = n.split(" — ")[0];
          const desc = n.split(" — ").slice(1).join(" — ");
          return `| \`${file}\` | ${desc} |`;
        })
        .join("\n") +
      "\n\n## Injection methods\n\n" +
      "- **Alert (05):** Re-rendered Outside via `WDS.dashboardOSRender.renderScreen` with a synthetic `alert` + safety-shaped Matters/Do. No `Audio` / tones.\n" +
      "- **Partial (06):** Same render path with `trust.status=Partial`, omitted air/water gateways honesty, and Sources-oriented matters.\n" +
      "- **Loading (03/04):** Prefer real boot skeleton; if hydrate wins the race, forced `mode:loading` via render API (documented per file).\n";

    fs.writeFileSync(INDEX, indexBody);
    console.log("index written", INDEX);
    console.log("DONE", notes.length, "captures");
  } finally {
    try {
      client.close();
    } catch (_) { /* noop */ }
    try {
      proc.kill("SIGTERM");
    } catch (_) { /* noop */ }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
