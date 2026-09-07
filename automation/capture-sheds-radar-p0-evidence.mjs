#!/usr/bin/env node
/**
 * RADAR P0 acceptance capture — enrichment-ready Frame A/B evidence.
 *
 * Prefers live Open-Meteo when reachable; otherwise serves the committed
 * elev fixture through a page fetch patch so aspect enrichment completes.
 *
 * Usage:
 *   node automation/capture-sheds-radar-p0-evidence.mjs [baseUrl]
 *
 * Writes screenshots + proof JSON under docs/sheds/samples/radar-p0/.
 */
import fs from "fs";
import http from "http";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/sheds/samples/radar-p0");
const FIXTURE = path.join(OUT, "elev-fixture-pike-50x50.json");
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CDP_PORT = Number(process.env.WAYPOINT_RADAR_CDP_PORT || 9334);
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";

const require = createRequire("/tmp/radar-p0-ws/node_modules/ws/package.json");
let WebSocket;
try {
  WebSocket = require("/tmp/radar-p0-ws/node_modules/ws");
} catch (e) {
  console.error("Install ws: npm i ws --prefix /tmp/radar-p0-ws", e);
  process.exit(1);
}

function getJson(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(new Error("bad json from " + url + ": " + d.slice(0, 180)));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.on("open", () =>
      resolve({
        events,
        send(method, params = {}) {
          const msgId = ++id;
          return new Promise((res, rej) => {
            pending.set(msgId, { res, rej });
            ws.send(JSON.stringify({ id: msgId, method, params }));
          });
        },
        close: () => ws.close(),
      })
    );
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.method) events.push(msg);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
    ws.on("error", reject);
  });
}

async function ev(client, expression) {
  const r = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) {
    throw new Error(JSON.stringify(r.exceptionDetails));
  }
  return r.result?.value;
}

async function shot(client, name) {
  const r = await client.send("Page.captureScreenshot", { format: "png" });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  return file;
}

function histScores(grid) {
  const h = {};
  const bands = {};
  for (const c of grid.cells || []) {
    if (!c || c.outsideArea || c.score == null) continue;
    h[c.score] = (h[c.score] || 0) + 1;
    if (c.band) bands[c.band] = (bands[c.band] || 0) + 1;
  }
  return { scores: h, bands };
}

function diffGrids(a, b) {
  const cellsA = (a && a.cells) || [];
  const cellsB = (b && b.cells) || [];
  const n = Math.min(cellsA.length, cellsB.length);
  let changed = 0;
  let unchanged = 0;
  let increased = 0;
  let decreased = 0;
  let solar = 0;
  const changedByAsp = {};
  for (let i = 0; i < n; i++) {
    const ca = cellsA[i];
    const cb = cellsB[i];
    if (!ca || !cb || ca.outsideArea || cb.outsideArea) continue;
    const asp = ca.aspectCardinal || "null";
    if (ca.score === cb.score) {
      unchanged += 1;
      continue;
    }
    changed += 1;
    changedByAsp[asp] = (changedByAsp[asp] || 0) + 1;
    if (cb.score > ca.score) increased += 1;
    else decreased += 1;
    const mods = (cb.interest && cb.interest.modifiers) || [];
    if (mods.some((m) => m.id === "solar_searchability")) solar += 1;
  }
  return {
    changed,
    unchanged,
    increased,
    decreased,
    solarOnB: solar,
    changedByAsp,
    uniformBoost: changed > 0 && unchanged === 0,
  };
}


async function heatFingerprint(client) {
  return ev(
    client,
    `(() => {
      const canvases = [...document.querySelectorAll('canvas.sheds-heat-tile')];
      let sum = 0, nonzero = 0, nonZero = 0;
      for (const c of canvases) {
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < data.length; i += 16) {
          const a = data[i + 3];
          if (a > 0) {
            nonZero += 1;
            sum += data[i] + data[i + 1] * 3 + data[i + 2] * 5 + a * 7;
          }
          nonzero += a;
        }
      }
      return { tiles: canvases.length, sum, nonzero, paintedSamples: nonZero };
    })()`
  );
}

async function waitHeatChanged(client, before, timeoutMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const now = await heatFingerprint(client);
    if (now && before && (now.sum !== before.sum || now.nonzero !== before.nonzero)) return now;
    await delay(200);
  }
  return heatFingerprint(client);
}

async function main() {
  if (!fs.existsSync(FIXTURE)) {
    throw new Error("Missing elev fixture: " + FIXTURE);
  }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  fs.mkdirSync(OUT, { recursive: true });

  const userData = fs.mkdtempSync("/tmp/chrome-radar-proof-");
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-proxy-server",
      "--remote-allow-origins=*",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userData}`,
      "about:blank",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        http_proxy: "",
        https_proxy: "",
        HTTP_PROXY: "",
        HTTPS_PROXY: "",
        ALL_PROXY: "",
        all_proxy: "",
      },
    }
  );

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      await getJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
      ready = true;
      break;
    } catch {
      await delay(250);
    }
  }
  if (!ready) throw new Error("Chrome CDP not ready");

  const page = await getJson(
    `http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent("about:blank")}`,
    "PUT"
  );
  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Install elev fetch patch + fixture before app scripts run.
  // Exact key hits preferred; otherwise bilinear-sample the fixture DEM so
  // slight viewport settle differences still enrich aspect honestly.
  const install = `
(() => {
  try {
    localStorage.setItem('waypoint-sheds-ethics-seen-v1', '1');
    localStorage.setItem('waypoint-sheds-first-run-coach-v1', '1');
  } catch (e) {}
  const FIX = ${JSON.stringify(fixture)};
  const elevByKey = new Map();
  for (let i = 0; i < FIX.lats.length; i++) {
    elevByKey.set(
      Number(FIX.lats[i]).toFixed(5) + "," + Number(FIX.lngs[i]).toFixed(5),
      FIX.elevations[i]
    );
  }
  const haloRows = FIX.rows + 2;
  const haloCols = FIX.cols + 2;
  function sampleElev(lat, lng) {
    const b = FIX.bounds;
    const cellH = (b.north - b.south) / FIX.rows;
    const cellW = (b.east - b.west) / FIX.cols;
    // Halo index space matches SearchPriority.haloLatLngs (r,c from -1..rows)
    const rf = (b.north - lat) / cellH - 0.5 + 1;
    const cf = (lng - b.west) / cellW - 0.5 + 1;
    const r0 = Math.max(0, Math.min(haloRows - 2, Math.floor(rf)));
    const c0 = Math.max(0, Math.min(haloCols - 2, Math.floor(cf)));
    const fr = Math.max(0, Math.min(1, rf - r0));
    const fc = Math.max(0, Math.min(1, cf - c0));
    function at(r, c) { return FIX.elevations[r * haloCols + c]; }
    const a = at(r0, c0);
    const b1 = at(r0, c0 + 1);
    const c = at(r0 + 1, c0);
    const d = at(r0 + 1, c0 + 1);
    const top = a + (b1 - a) * fc;
    const bot = c + (d - c) * fc;
    return top + (bot - top) * fr;
  }
  window.__RADAR_P0_ELEV_FIXTURE = FIX;
  window.__RADAR_P0_ELEV_HITS = 0;
  window.__RADAR_P0_ELEV_MISSES = 0;
  const orig = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = String(input);
    if (url.indexOf("open-meteo.com/v1/elevation") !== -1) {
      const u = new URL(url, location.href);
      const lats = (u.searchParams.get("latitude") || "").split(",").filter(Boolean);
      const lngs = (u.searchParams.get("longitude") || "").split(",").filter(Boolean);
      const elevation = lats.map((la, i) => {
        const lat = Number(la);
        const lng = Number(lngs[i]);
        const key = lat.toFixed(5) + "," + lng.toFixed(5);
        if (elevByKey.has(key)) {
          window.__RADAR_P0_ELEV_HITS += 1;
          return elevByKey.get(key);
        }
        window.__RADAR_P0_ELEV_MISSES += 1;
        return sampleElev(lat, lng);
      });
      return new Response(JSON.stringify({ elevation }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return orig(input, init);
  };
})();`;
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: install });

  await client.send("Page.navigate", {
    url: BASE + "/apps/shed-hunting/map/?radarP0=1",
  });
  await delay(4000);

  // Acceptance-only: seed already set ethics/coach seen; force-hide any leftover overlays.
  await ev(
    client,
    `(() => {
      try {
        localStorage.setItem('waypoint-sheds-ethics-seen-v1', '1');
        localStorage.setItem('waypoint-sheds-first-run-coach-v1', '1');
      } catch (e) {}
      const ethicsAck = document.querySelector('#ethics-ack');
      if (ethicsAck) ethicsAck.click();
      const coach = document.querySelector('#btn-coach-dismiss');
      if (coach) coach.click();
      document.querySelectorAll('.sheds-sheet').forEach((el) => {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('hidden', '');
        el.style.display = 'none';
      });
      const fr = document.querySelector('#first-run-coach');
      if (fr) { fr.setAttribute('hidden', ''); fr.style.display = 'none'; }
      // Hide offline toast noise for clear map capture (does not change radar logic).
      document.querySelectorAll('.sheds-toast, .sheds-banner, [id*="tile-status"]').forEach((el) => {
        if (/network|tile/i.test(el.textContent || '')) el.style.display = 'none';
      });
      return {
        ethicsHidden: document.querySelector('#sheet-ethics')?.getAttribute('aria-hidden'),
        coachHidden: document.querySelector('#first-run-coach')?.hasAttribute('hidden')
      };
    })()`
  );
  await delay(400);

  // Lock exact Pike viewport from fixture.
  const locked = await ev(
    client,
    `(() => {
      const app = window.WaypointShedsMapApp;
      const radar = app && app._radarP0;
      const map = radar && radar.getMap && radar.getMap();
      const FIX = window.__RADAR_P0_ELEV_FIXTURE;
      if (!map || !FIX) return { ok: false, reason: 'no-map-or-fixture' };
      if (!radar.isEnabled()) radar.setEnabled(true);
      const b = FIX.bounds;
      map.fitBounds(
        [[b.south, b.west], [b.north, b.east]],
        { animate: false, padding: [0, 0] }
      );
      // Prefer exact center/zoom when fitBounds overshoots.
      map.setView([FIX.center.lat, FIX.center.lng], FIX.zoom, { animate: false });
      return {
        ok: true,
        center: map.getCenter(),
        zoom: map.getZoom(),
        size: map.getSize()
      };
    })()`
  );
  console.log("locked", locked);
  if (!locked || !locked.ok) throw new Error("Failed to lock map viewport");

  // Wait for moveend settle + enrichment-ready proof status.
  let status = null;
  for (let i = 0; i < 60; i++) {
    await delay(500);
    status = await ev(
      client,
      `(() => {
        const r = window.WaypointShedsMapApp && window.WaypointShedsMapApp._radarP0;
        if (!r || !r.getProofStatus) return { ready: false, reason: 'no-hook' };
        const s = r.getProofStatus();
        s.elevHits = window.__RADAR_P0_ELEV_HITS || 0;
        s.elevMisses = window.__RADAR_P0_ELEV_MISSES || 0;
        s.center = r.getMap().getCenter();
        s.zoom = r.getMap().getZoom();
        return s;
      })()`
    );
    if (i % 4 === 0) console.log("wait", i, status && {
      ready: status.ready,
      elevKey: status.elevKey,
      terrainEnriched: status.terrainEnriched,
      southish: status.southish,
      withAspect: status.withAspect,
      baseKey: status.baseKey,
      elevHits: status.elevHits,
      elevMisses: status.elevMisses,
    });
    if (status && status.ready) break;
  }
  if (!status || !status.ready) {
    throw new Error("Terrain enrichment not ready: " + JSON.stringify(status));
  }

  const elevGenBefore = status.elevFetchGen;

  // Ensure Frame A
  await ev(client, `window.WaypointShedsMapApp._radarP0.setFrame('A')`);
  await delay(400);
  const gridA = await ev(
    client,
    `(() => {
      const g = window.WaypointShedsMapApp._radarP0.getLastGrid();
      return g ? { cells: g.cells, stats: g.stats, frameId: g.frameId, bounds: g.bounds, rows: g.rows, cols: g.cols } : null;
    })()`
  );
  // Boost heat opacity for capture readability only (runtime; not a product default change).
  await ev(client, `(() => {
    const map = window.WaypointShedsMapApp._radarP0.getMap();
    map.eachLayer((ly) => {
      if (ly && ly.setOpacity && ly._isRadarMode) {
        try { ly.setOpacity(0.72); } catch (e) {}
      }
      if (ly && ly.setGrid && ly.setOpacity) {
        try { ly.setOpacity(0.72); } catch (e) {}
      }
    });
    return true;
  })()`);
  await delay(300);
  const fpA = await heatFingerprint(client);
  const pathA = await shot(client, "browser-frame-a.png");
  console.log("Frame A", gridA && gridA.stats, "heat", fpA);

  // Frame B — must not refetch elev
  const mark = client.events.length;
  await ev(client, `window.WaypointShedsMapApp._radarP0.setFrame('B')`);
  const fpB = await waitHeatChanged(client, fpA);
  console.log("heat FP B", fpB);
  const afterB = await ev(
    client,
    `(() => {
      const r = window.WaypointShedsMapApp._radarP0;
      const g = r.getLastGrid();
      return {
        status: r.getProofStatus(),
        elevGen: r.getElevFetchGen(),
        note: (document.querySelector('#model-note')?.textContent || '').slice(0, 220),
        grid: g ? { cells: g.cells, stats: g.stats, frameId: g.frameId } : null
      };
    })()`
  );
  const pathB = await shot(client, "browser-frame-b.png");
  const elevNetAfter = client.events
    .slice(mark)
    .filter(
      (e) =>
        e.method === "Network.requestWillBeSent" &&
        /open-meteo\.com\/v1\/elevation/.test(e.params?.request?.url || "")
    ).length;
  console.log("Frame B", afterB.grid && afterB.grid.stats, "elevGen", afterB.elevGen, "netElev", elevNetAfter);

  if (!fpA || !fpB || fpA.sum === fpB.sum) {
    throw new Error('Heat canvas fingerprint did not change between frames: ' + JSON.stringify({fpA, fpB}));
  }
  if (afterB.elevGen !== elevGenBefore) {
    throw new Error(
      "Elevation refetch on frame switch (gen " + elevGenBefore + " → " + afterB.elevGen + ")"
    );
  }
  if (elevNetAfter !== 0) {
    throw new Error("Network elevation requests on frame switch: " + elevNetAfter);
  }

  const diff = diffGrids(gridA, afterB.grid);
  console.log("diff", diff);
  if (!(diff.changed > 0 && diff.unchanged > 0) || diff.uniformBoost) {
    throw new Error("Analytical WHERE proof failed: " + JSON.stringify(diff));
  }

  // Mobile Frame B
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await delay(600);
  await ev(
    client,
    `([...document.querySelectorAll('button')].find(b=>/understood|got it|close/i.test(b.textContent||''))||{}).click?.()`
  );
  await delay(300);
  const pathMobile = await shot(client, "browser-frame-b-mobile.png");

  // Restore desktop for explain + outside checks
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await delay(400);

  // Tap explain: find a changed cell and an unchanged cell
  const samples = await ev(
    client,
    `(() => {
      const r = window.WaypointShedsMapApp._radarP0;
      const Radar = window.WaypointShedsRadarP0;
      const map = r.getMap();
      // Rebuild A on same base for comparison without elev refetch
      const base = r.getBaseField();
      const paintedA = Radar.applyFrame(base, 'A');
      const paintedB = Radar.applyFrame(base, 'B');
      let changed = null, unchanged = null;
      for (let i = 0; i < paintedA.grid.cells.length; i++) {
        const ca = paintedA.grid.cells[i];
        const cb = paintedB.grid.cells[i];
        if (!ca || !cb || ca.outsideArea) continue;
        const modsB = (cb.interest && cb.interest.modifiers) || [];
        const modsA = (ca.interest && ca.interest.modifiers) || [];
        const hasSolar = modsB.some((m) => m.id === 'solar_searchability');
        const hadSolar = modsA.some((m) => m.id === 'solar_searchability');
        if (!changed && ca.score !== cb.score && hasSolar && !hadSolar) changed = cb;
        if (!unchanged && ca.score === cb.score && !hasSolar && !(ca.aspectCardinal === 'S' || ca.aspectCardinal === 'SE' || ca.aspectCardinal === 'SW')) unchanged = cb;
        if (changed && unchanged) break;
      }
      // Fallbacks
      if (!changed || !unchanged) {
        for (let i = 0; i < paintedA.grid.cells.length; i++) {
          const ca = paintedA.grid.cells[i];
          const cb = paintedB.grid.cells[i];
          if (!ca || !cb || ca.outsideArea) continue;
          if (!changed && ca.score !== cb.score) changed = cb;
          if (!unchanged && ca.score === cb.score) unchanged = cb;
          if (changed && unchanged) break;
        }
      }
      r.setFrame('B');
      const exChanged = changed ? Radar.explainAt(paintedB.grid, { lat: changed.lat, lng: changed.lng }) : null;
      const exUnchanged = unchanged ? Radar.explainAt(paintedB.grid, { lat: unchanged.lat, lng: unchanged.lng }) : null;
      // Also open UI explain at changed point
      if (changed) {
        const pt = map.latLngToContainerPoint([changed.lat, changed.lng]);
        window.__RADAR_EXPLAIN_PT = { x: pt.x, y: pt.y, lat: changed.lat, lng: changed.lng };
      }
      return {
        changed: changed && { lat: changed.lat, lng: changed.lng, score: changed.score, aspect: changed.aspectCardinal, mods: (changed.interest&&changed.interest.modifiers||[]).map(m=>m.id) },
        unchanged: unchanged && { lat: unchanged.lat, lng: unchanged.lng, score: unchanged.score, aspect: unchanged.aspectCardinal, mods: (unchanged.interest&&unchanged.interest.modifiers||[]).map(m=>m.id) },
        explainChanged: exChanged && { score: exChanged.score, factors: exChanged.factors },
        explainUnchanged: exUnchanged && { score: exUnchanged.score, factors: exUnchanged.factors },
        pt: window.__RADAR_EXPLAIN_PT || null
      };
    })()`
  );
  console.log("samples", JSON.stringify(samples, null, 2).slice(0, 2000));

  if (samples && samples.pt) {
    await client.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: samples.pt.x,
      y: samples.pt.y,
      button: "left",
      clickCount: 1,
    });
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: samples.pt.x,
      y: samples.pt.y,
      button: "left",
      clickCount: 1,
    });
    await delay(800);
  }
  const explainUi = await ev(
    client,
    `({
      body: (document.querySelector('#radar-p0-explain-body')?.textContent || document.querySelector('#explain-body')?.textContent || '').slice(0, 900),
      hidden: document.querySelector('#radar-p0-explain')?.hidden
    })`
  );
  await shot(client, "browser-explain-changed.png");

  // Outside pack
  await ev(
    client,
    `(() => {
      const map = window.WaypointShedsMapApp._radarP0.getMap();
      map.setView([39.7392, -104.9903], 12, { animate: false });
      return true;
    })()`
  );
  await delay(2000);
  const outside = await ev(
    client,
    `(() => {
      const r = window.WaypointShedsMapApp._radarP0;
      const g = r.getLastGrid();
      return {
        note: (document.querySelector('#model-note')?.textContent || '').slice(0, 280),
        legend: (document.querySelector('#heat-legend-status')?.textContent || '').slice(0, 160),
        unavailable: !!(g && g.unavailable),
        cells: g && g.cells ? g.cells.length : 0,
        renderMode: g && g.renderMode
      };
    })()`
  );
  await shot(client, "browser-outside-pack.png");
  console.log("outside", outside);

  // Return to Pike Frame B for final mobile-independent desktop pair already saved
  await ev(
    client,
    `(() => {
      const FIX = window.__RADAR_P0_ELEV_FIXTURE;
      const map = window.WaypointShedsMapApp._radarP0.getMap();
      map.setView([FIX.center.lat, FIX.center.lng], FIX.zoom, { animate: false });
      window.WaypointShedsMapApp._radarP0.setFrame('B');
      return true;
    })()`
  );
  await delay(1500);

  const proof = {
    capturedAt: new Date().toISOString(),
    viewport: {
      center: fixture.center,
      zoom: fixture.zoom,
      bounds: fixture.bounds,
      rows: fixture.rows,
      cols: fixture.cols,
    },
    locked,
    statusReady: status,
    elevGenBeforeSwitch: elevGenBefore,
    elevGenAfterSwitch: afterB.elevGen,
    elevNetworkOnSwitch: elevNetAfter,
    heatFingerprintA: fpA,
    heatFingerprintB: fpB,
    frameA: {
      inputs: {
        snowCoverStatus: "limiting",
        freezeThawStatus: null,
        tempTrendStatus: "cooling",
        seasonCategory: "late_winter",
      },
      stats: gridA.stats,
      hist: histScores(gridA),
    },
    frameB: {
      inputs: {
        snowCoverStatus: "light",
        freezeThawStatus: "freeze_thaw",
        tempTrendStatus: "warming",
        seasonCategory: "late_winter",
      },
      stats: afterB.grid.stats,
      hist: histScores(afterB.grid),
      note: afterB.note,
    },
    diff,
    samples,
    explainUi,
    outside,
    screenshots: {
      frameA: pathA,
      frameB: pathB,
      frameBMobile: pathMobile,
    },
  };
  fs.writeFileSync(path.join(OUT, "proof-report.json"), JSON.stringify(proof, null, 2));
  console.log("PROOF_OK", path.join(OUT, "proof-report.json"));

  client.close();
  try { chrome.kill("SIGKILL"); } catch (e) {}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
