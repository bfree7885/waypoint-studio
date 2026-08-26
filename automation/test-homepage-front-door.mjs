#!/usr/bin/env node
/**
 * Permanent homepage front-door gate.
 * Ensures / is a studio front door — not the outdoor Dashboard workspace.
 *
 * Usage:
 *   node automation/test-homepage-front-door.mjs [baseUrl]
 */
import fs from "fs";
import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { WebSocket } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_HOME_CDP_PORT || 9488);

let failed = 0;
function pass(m) { console.log("PASS", m); }
function fail(m) { console.error("FAIL", m); failed += 1; }

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

async function staticChecks() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  if (!/data-product="studio-home"/.test(html)) fail("index missing data-product=studio-home");
  else pass("data-product=studio-home");
  if (!/Observe\.\s*Discover\.\s*Understand/.test(html)) fail("missing Observe/Discover/Understand");
  else pass("mission IA present");
  if (!/Enter Dashboard|apps\/dashboard\//.test(html)) fail("missing Dashboard entry");
  else pass("Dashboard entry");
  if (!/apps\/scenes\//.test(html) || !/apps\/shed-hunting\//.test(html) || !/articles\//.test(html)) {
    fail("missing Scenes/Sheds/Articles entries");
  } else pass("Scenes/Sheds/Articles entries");
  if (!/Side Trails/.test(html) || !/Archive/i.test(html)) fail("Side Trails not marked as archive");
  else pass("Side Trails archive");
  if (/side-trails\/openroad-pa|OpenRoad PA —|SignalTerrain<\/a>|Global Signals<\/a>/.test(html) &&
      /adaptive cyber|relationship intelligence/i.test(html)) {
    fail("homepage still promotes OpenRoad/ST/GS as live Side Trails products");
  } else pass("homepage does not promote retired Side Trails products");
  if (/Fieldry.*coming soon|coming soon.*Fieldry/i.test(html)) fail("homepage promises Fieldry");
  else pass("no Fieldry coming-soon promise");
  if (/home-boot\.js|wds-dashboard-rebuild\.css|wds-content-engine/.test(html)) {
    fail("homepage still boots outdoor dashboard workspace");
  } else pass("not embedding outdoor dashboard boot");
  if (!/wds-studio-home\.css/.test(html) || !/js\/studio-home\.js/.test(html)) {
    fail("missing front-door CSS/JS");
  } else pass("front-door assets linked");
  if (!/was-home-hero/.test(html)) fail("missing hero");
  else pass("hero present");

  const nav = fs.readFileSync(path.join(ROOT, "design-system/js/platform/wds-app-nav-config.js"), "utf8");
  if (!/"id": "dashboard"[\s\S]*?"href": "\/apps\/dashboard\/"/.test(nav)) {
    fail("primary nav Dashboard still points at /");
  } else pass("primary nav Dashboard → /apps/dashboard/");

  const dashRedirect = fs.readFileSync(path.join(ROOT, "dashboard.html"), "utf8");
  if (!/apps\/dashboard\//.test(dashRedirect)) fail("dashboard.html does not redirect to apps/dashboard/");
  else pass("dashboard.html redirects to Dashboard");
}

async function browserChecks() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-home-gate-"));
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${userDataDir}`, "about:blank"
  ], { stdio: "ignore" });
  await delay(1000);
  const ver = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.once("open", r); ws.once("error", j); });
  let id = 0;
  const pending = new Map();
  ws.on("message", (buf) => {
    const msg = JSON.parse(buf.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) => {
    const msg = { id: ++id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    ws.send(JSON.stringify(msg));
    return new Promise((resolve, reject) => pending.set(msg.id, { resolve, reject }));
  };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);

  for (const w of [375, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: w, height: w < 768 ? 900 : 1100, deviceScaleFactor: 1, mobile: w < 768
    }, sessionId);
    await send("Page.navigate", { url: BASE + "/" }, sessionId);
    await delay(1600);
    const r = await send("Runtime.evaluate", {
      expression: `(() => {
        const text = document.body.innerText;
        const dashCurrent = !!document.querySelector('.was-primary-nav__link[aria-current="page"]');
        const dashLink = [...document.querySelectorAll('.was-primary-nav__link')].find(a => /dashboard/i.test(a.textContent));
        const dashHref = dashLink ? dashLink.getAttribute('href') : '';
        const dashIsCurrent = dashLink && dashLink.getAttribute('aria-current') === 'page';
        const cards = document.querySelectorAll('.was-home__card').length;
        const hero = !!document.querySelector('.was-home-hero');
        const outdoor = !!document.querySelector('#wds-content-engine, .wdb-r-workspace, [data-wdb-os]');
        const hOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
        return {
          title: document.title,
          hero,
          outdoor,
          cards,
          dashHref,
          dashIsCurrent,
          hOverflow,
          hasObserve: /Observe/.test(text),
          hasArchive: /Archive/i.test(text),
          hasScenes: /Scenes/.test(text),
          hasSheds: /Sheds/.test(text),
          hasArticles: /Articles/.test(text)
        };
      })()`,
      returnByValue: true
    }, sessionId);
    const v = r.result.value;
    console.log("viewport", w, JSON.stringify(v));
    if (!v.hero) fail(`hero missing @${w}`); else pass(`hero @${w}`);
    if (v.outdoor) fail(`outdoor dashboard leaked onto home @${w}`); else pass(`no outdoor dashboard @${w}`);
    if (v.cards < 4) fail(`gate cards < 4 @${w}`); else pass(`gate pathways @${w}`);
    if (!/dashboard/i.test(v.dashHref || "")) fail(`Dashboard href bad @${w}: ${v.dashHref}`);
    else pass(`Dashboard href @${w}`);
    if (v.dashIsCurrent) fail(`Dashboard incorrectly current on front door @${w}`);
    else pass(`Dashboard not current on / @${w}`);
    if (v.hOverflow) fail(`horizontal overflow @${w}`); else pass(`no h-overflow @${w}`);
    if (!v.hasObserve || !v.hasArchive || !v.hasScenes || !v.hasSheds || !v.hasArticles) {
      fail(`content incomplete @${w}`);
    } else pass(`content complete @${w}`);
  }

  // Click Dashboard entry
  await send("Page.navigate", { url: BASE + "/" }, sessionId);
  await delay(1000);
  await send("Runtime.evaluate", {
    expression: `document.querySelector('a[href*="apps/dashboard"]')?.click(); true`,
    returnByValue: true
  }, sessionId);
  await delay(1500);
  const after = await send("Runtime.evaluate", {
    expression: `({ path: location.pathname, hasWorkspace: !!document.querySelector('#wds-content-engine, .wdb-r-workspace, [data-wdb-os]') })`,
    returnByValue: true
  }, sessionId);
  const av = after.result.value;
  if (!/\/apps\/dashboard\//.test(av.path)) fail("Dashboard click did not reach /apps/dashboard/ (" + av.path + ")");
  else pass("Dashboard click reaches workspace route");

  ws.close();
  proc.kill();
}

await staticChecks();
try {
  await browserChecks();
} catch (e) {
  fail("browser: " + (e && e.message ? e.message : e));
}

console.log(failed ? `\nHOMEPAGE GATE: FAIL (${failed})` : "\nHOMEPAGE GATE: PASS");
process.exit(failed ? 1 : 0);
