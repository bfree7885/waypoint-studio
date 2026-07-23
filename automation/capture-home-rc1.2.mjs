#!/usr/bin/env node
/**
 * Capture Home RC1.2 footer screenshots (desktop + phone) + link verification.
 * Usage: node automation/capture-home-rc1.2.mjs [baseUrl]
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
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9397);
const OUT = path.join(ROOT, "docs/rebuild-2026/home-rc1.2");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-home-rc12-"));
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
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = await startChrome();
  const { default: WebSocket } = await import("ws");
  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.once("open", r);
    ws.once("error", j);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  async function goto(url) {
    await send("Page.navigate", { url });
    await delay(2500);
  }

  async function shot(name) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log("wrote", file);
  }

  async function evalJs(expression) {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return r.result && r.result.value;
  }

  async function seedHome() {
    await goto(BASE + "/");
    await evalJs(`(() => {
      const loc = ${JSON.stringify(PIKE)};
      localStorage.clear();
      localStorage.setItem("wds-location-v3", JSON.stringify(loc));
      localStorage.setItem("wds-location-prompted", "1");
      return true;
    })()`);
    await send("Page.reload", { ignoreCache: true });
    await delay(3000);
    await evalJs(`(() => {
      const mount = document.getElementById("wds-location-prompt");
      if (mount) mount.innerHTML = "";
      return true;
    })()`);
    return evalJs(`(() => {
      const footer = document.querySelector(".was-footer");
      const links = Array.from(document.querySelectorAll(".was-footer__links a")).map((a) => ({
        label: (a.textContent || "").trim(),
        href: a.getAttribute("href") || ""
      }));
      return {
        title: document.title,
        productName: document.querySelector("[data-product-name]")?.getAttribute("data-product-name"),
        footerText: footer ? footer.innerText : "",
        footerLinks: links,
        linkLabels: links.map((l) => l.label)
      };
    })()`);
  }

  async function checkHref(href) {
    const url = href.startsWith("http") ? href : new URL(href, BASE + "/").href;
    const res = await evalJs(`fetch(${JSON.stringify(url)}, { method: "GET", cache: "no-store" })
      .then((r) => ({ ok: r.ok, status: r.status, url: r.url }))
      .catch((e) => ({ ok: false, status: 0, error: String(e) }))`);
    return { href, ...res };
  }

  const meta = { base: BASE, place: PIKE.displayTitle, captures: [], linkChecks: [] };

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const desk = await seedHome();
  console.log("desktop footer", desk);
  if (JSON.stringify(desk.linkLabels) !== JSON.stringify(["Contact", "Privacy Policy", "Terms of Service"])) {
    throw new Error("Unexpected desktop footer links: " + JSON.stringify(desk.linkLabels));
  }
  const banned = /Support|Coming later|Something wrong|Suggest an idea|\bAbout\b|Dashboard/i;
  if (banned.test(desk.footerText.replace(/Waypoint Studio/g, ""))) {
    throw new Error("Historical footer navigation still present: " + desk.footerText);
  }
  await evalJs(`(() => {
    const el = document.querySelector(".was-footer");
    if (el) el.scrollIntoView({ block: "end" });
    return true;
  })()`);
  await delay(400);
  await shot("01-desktop-home-footer.png");
  meta.captures.push({ file: "01-desktop-home-footer.png", entry: "/", viewport: "desktop", meta: desk });

  for (const link of desk.footerLinks) {
    const check = await checkHref(link.href);
    meta.linkChecks.push({ viewport: "desktop", label: link.label, ...check });
    console.log("link", link.label, check.status, check.ok);
    if (!check.ok) throw new Error("Broken footer link: " + link.label + " -> " + link.href);
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  const phone = await seedHome();
  console.log("phone footer", phone);
  if (JSON.stringify(phone.linkLabels) !== JSON.stringify(["Contact", "Privacy Policy", "Terms of Service"])) {
    throw new Error("Unexpected phone footer links: " + JSON.stringify(phone.linkLabels));
  }
  await evalJs(`(() => {
    const el = document.querySelector(".was-footer");
    if (el) el.scrollIntoView({ block: "end" });
    return true;
  })()`);
  await delay(400);
  await shot("02-phone-home-footer.png");
  meta.captures.push({ file: "02-phone-home-footer.png", entry: "/", viewport: "phone", meta: phone });

  fs.writeFileSync(path.join(OUT, "capture-meta.json"), JSON.stringify(meta, null, 2));
  console.log("wrote capture-meta.json");

  ws.close();
  chrome.proc.kill("SIGTERM");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
