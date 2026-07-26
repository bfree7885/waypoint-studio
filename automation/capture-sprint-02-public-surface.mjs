#!/usr/bin/env node
/**
 * Sprint 2 — public surface cleanup evidence: link crawl + screenshots.
 *
 * Usage:
 *   node automation/capture-sprint-02-public-surface.mjs [baseUrl]
 *
 * If baseUrl is omitted, serves the repo root on an ephemeral localhost port.
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
const OUT = path.join(ROOT, "docs/turnaround/2026-07-26-sprint-02");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9342);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true }
];

const SHOTS = [
  { id: "home", path: "/", waitMs: 2800, footer: true },
  { id: "support", path: "/support.html", waitMs: 1200 },
  { id: "incubator", path: "/incubator/", waitMs: 1200 },
  { id: "status", path: "/status.html", waitMs: 600 },
  { id: "debug", path: "/debug.html", waitMs: 600 }
];

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

function startStaticServer() {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      if (urlPath === "/") urlPath = "/index.html";
      const file = path.normalize(path.join(ROOT, urlPath.replace(/^\//, "")));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
        ".woff2": "font/woff2"
      };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wds-sprint02-"));
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

async function crawlLinks(base) {
  const queue = [base + "/"];
  const seen = new Set();
  const results = [];
  const broken = [];
  const skip = /^(mailto:|tel:|javascript:|data:|#)/i;
  const external = /^https?:\/\//i;

  while (queue.length && seen.size < 900) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    let probe;
    try {
      const res = await fetch(url, { redirect: "follow" });
      probe = { url, status: res.status, finalUrl: res.url, ok: res.ok };
    } catch (err) {
      probe = { url, status: 0, ok: false, error: String(err) };
    }
    results.push(probe);
    if (!probe.ok) {
      broken.push(probe);
      continue;
    }
    if (!/\.html?(\?|$)/i.test(url) && !url.endsWith("/")) continue;
    const html = await fetch(url).then((r) => r.text()).catch(() => "");
    const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    for (const href of hrefs) {
      if (!href || skip.test(href)) continue;
      if (external.test(href) && !href.startsWith(base)) continue;
      let next;
      try {
        next = new URL(href, url).href.split("#")[0];
      } catch {
        continue;
      }
      if (!next.startsWith(base)) continue;
      if (!seen.has(next) && !queue.includes(next)) queue.push(next);
    }
  }
  return { checked: results.length, broken, results };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let server = null;
  let base = process.argv[2];
  if (!base) {
    const started = await startStaticServer();
    server = started.server;
    base = started.base;
  }
  base = base.replace(/\/$/, "");

  const fav = await fetch(base + "/favicon.ico");
  const favBuf = Buffer.from(await fav.arrayBuffer());
  fs.writeFileSync(path.join(OUT, "favicon.ico.copy"), favBuf);
  const faviconProbe = {
    url: base + "/favicon.ico",
    status: fav.status,
    bytes: favBuf.length,
    contentType: fav.headers.get("content-type"),
    icoMagic: favBuf.slice(0, 4).equals(Buffer.from([0, 0, 1, 0]))
  };

  const probes = {};
  for (const p of ["/status.html", "/debug.html", "/support.html", "/incubator/", "/favicon.ico", "/", "/about.html"]) {
    const res = await fetch(base + p);
    const text = p.endsWith(".ico") ? "" : await res.text();
    probes[p] = {
      status: res.status,
      title: (text.match(/<title>([^<]*)<\/title>/i) || [])[1] || null,
      hasComingLater: /Coming later/i.test(text),
      hasOperatorStub: /operator surface|not a public product page|not published for public/i.test(text),
      hasRawSnapshot: /Raw snapshot/i.test(text)
    };
  }

  const crawl = await crawlLinks(base);

  const chrome = await startChrome();
  const { default: WebSocket } = await import("ws");
  const ws = new WebSocket(chrome.wsUrl);
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
  const shotManifest = [];

  async function dismissLocationPrompt() {
    await send("Runtime.evaluate", {
      expression: `(() => {
        localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify({
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
        }))});
        localStorage.setItem("wds-location-prompted", "1");
        const mount = document.getElementById("wds-location-prompt");
        if (mount) mount.innerHTML = "";
        return true;
      })()`,
      returnByValue: true
    });
  }

  for (const vp of VIEWPORTS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile
    });
    for (const shot of SHOTS) {
      await send("Page.navigate", { url: base + shot.path });
      await delay(Math.min(800, shot.waitMs));
      if (shot.id === "home") {
        await dismissLocationPrompt();
        await send("Page.reload", { ignoreCache: true });
        await delay(shot.waitMs);
        await dismissLocationPrompt();
      } else {
        await delay(shot.waitMs);
      }
      const png = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const file = `${shot.id}__${vp.name}.png`;
      fs.writeFileSync(path.join(OUT, file), Buffer.from(png.data, "base64"));
      shotManifest.push({ file, viewport: vp.name, path: shot.path });
      if (shot.footer) {
        await send("Runtime.evaluate", {
          expression: `(() => { const el = document.querySelector(".was-footer"); if (el) el.scrollIntoView({ block: "end" }); else window.scrollTo(0, document.body.scrollHeight); return true; })()`,
          returnByValue: true
        });
        await delay(450);
        const foot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
        const ffile = `footer__${vp.name}.png`;
        fs.writeFileSync(path.join(OUT, ffile), Buffer.from(foot.data, "base64"));
        shotManifest.push({ file: ffile, viewport: vp.name, path: shot.path + "#footer" });
      }
    }
  }

  // Favicon visual: navigate to a data URL wrapping the ico is unreliable; screenshot support with icon link instead
  await send("Page.navigate", { url: base + "/support.html" });
  await delay(800);
  const favShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(path.join(OUT, "favicon-context__desktop.png"), Buffer.from(favShot.data, "base64"));
  shotManifest.push({ file: "favicon-context__desktop.png", viewport: "desktop", path: "/support.html", note: "page with favicon.ico link" });

  ws.close();
  chrome.proc.kill("SIGTERM");

  const summary = {
    generatedAt: new Date().toISOString(),
    base,
    faviconProbe,
    probes,
    crawl: {
      checked: crawl.checked,
      broken: crawl.broken.length,
      brokenSamples: crawl.broken.slice(0, 25)
    },
    screenshots: shotManifest,
    localhostOnly: /127\.0\.0\.1|localhost/.test(base),
    noPreviewProductUrls: !crawl.results.some((r) => /pages\.dev|vercel\.app|netlify\.app/i.test(r.url || ""))
  };
  fs.writeFileSync(path.join(OUT, "verification.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT, "crawl-results.json"), JSON.stringify({ checked: crawl.checked, broken: crawl.broken }, null, 2));
  console.log(
    JSON.stringify(
      {
        favicon: faviconProbe.status,
        icoMagic: faviconProbe.icoMagic,
        crawlChecked: crawl.checked,
        crawlBroken: crawl.broken.length,
        shots: shotManifest.length,
        supportComingLater: probes["/support.html"]?.hasComingLater,
        statusStub: probes["/status.html"]?.hasOperatorStub,
        out: path.relative(ROOT, OUT)
      },
      null,
      2
    )
  );

  if (server) server.close();
  let failed = false;
  if (faviconProbe.status !== 200 || !faviconProbe.icoMagic) failed = true;
  if (crawl.broken.length) failed = true;
  if (probes["/support.html"]?.hasComingLater) failed = true;
  if (probes["/status.html"]?.hasRawSnapshot || probes["/debug.html"]?.hasRawSnapshot) failed = true;
  if (!probes["/status.html"]?.hasOperatorStub || !probes["/debug.html"]?.hasOperatorStub) failed = true;
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
