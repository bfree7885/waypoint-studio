#!/usr/bin/env node
/**
 * Waypoint Live Engine v1 — server-side outdoor snapshot → data/live.json
 *
 * Usage:
 *   node scripts/waypoint-live-engine.mjs
 *   ./scripts/waypoint-live-engine
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = process.env.WAYPOINT_LIVE_OUT || path.join(ROOT, "data", "live.json");
const INDEX_PATH = path.join(ROOT, "design-system", "content-engine", "regions-index.json");
const STATUS_PATH = path.join(ROOT, "status.html");
const DEBUG_PATH = path.join(ROOT, "debug.html");
const TIMEOUT_MS = 12000;
const BANNED = ["coming soon", "assignment", "homework", "lesson", "educational"];

const DEFAULT_LOCATION = {
  id: "pike-county-pa",
  name: "Pike County",
  state: "Pennsylvania",
  stateCode: "PA",
  lat: 41.3312,
  lng: -75.038
};

const WMO = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

function moonPhaseFromDate(date) {
  const jd = date / 86400000 + 2440587.5;
  const days = jd - 2451549.5;
  let phase = (days / 29.53058867) % 1;
  if (phase < 0) phase += 1;
  return phase;
}

function moonPhaseLabel(phase) {
  const p = Number(phase);
  if (!Number.isFinite(p)) return null;
  if (p < 0.03 || p > 0.97) return "New moon";
  if (p < 0.22) return "Waxing crescent";
  if (p < 0.28) return "First quarter";
  if (p < 0.47) return "Waxing gibbous";
  if (p < 0.53) return "Full moon";
  if (p < 0.72) return "Waning gibbous";
  if (p < 0.78) return "Last quarter";
  return "Waning crescent";
}

function moonIlluminationPercent(phase) {
  const p = Number(phase);
  if (!Number.isFinite(p)) return null;
  const illum = p <= 0.5 ? p * 2 : (1 - p) * 2;
  return Math.round(illum * 100);
}

function aqiCategory(aqi) {
  const n = Number(aqi);
  if (!Number.isFinite(n)) return "Unknown";
  if (n <= 50) return "Good";
  if (n <= 100) return "Moderate";
  if (n <= 150) return "Unhealthy for sensitive groups";
  if (n <= 200) return "Unhealthy";
  if (n <= 300) return "Very unhealthy";
  return "Hazardous";
}

function formatLocalTime(iso, timeZone) {
  if (!iso) return null;
  try {
    const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timeZone || undefined
    });
  } catch {
    return iso;
  }
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function makeStatusHtml(payload) {
  const updated = shortTime(payload.updatedAt);
  const fresh = Date.now() - Date.parse(payload.updatedAt) <= 3 * 60 * 60 * 1000;
  const failures = payload.meta && payload.meta.failures ? payload.meta.failures : [];
  const sources = payload.meta && payload.meta.sources ? payload.meta.sources : [];
  const hits = BANNED.filter((term) => JSON.stringify(payload).toLowerCase().includes(term));
  const raw = JSON.stringify(payload, null, 2);

  const sourceLis = sources.length
    ? sources.map((s) => `<li>${esc(s)}</li>`).join("")
    : '<li class="wle-muted">No sources recorded</li>';
  const failureLis = failures.length
    ? failures.map((f) => `<li>${esc(f.source || "source")}: ${esc(f.error || "failed")}</li>`).join("")
    : '<li class="wle-muted">No failed sources</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waypoint Live Engine — Status</title>
  <link rel="stylesheet" href="design-system/css/wds-dashboard-home.css">
  <link rel="stylesheet" href="css/home-dashboard.css">
  <style>
    .wle-status { max-width: 42rem; margin: 2rem auto; padding: 0 1.25rem 3rem; font-family: Inter, system-ui, sans-serif; color: #1c1917; }
    .wle-status h1 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; font-size: 2rem; margin: 0 0 0.35rem; }
    .wle-status .lead { color: #57534e; margin: 0 0 1.5rem; }
    .wle-card { border: 1px solid #e7e5e4; border-radius: 8px; padding: 1rem 1.1rem; margin: 0 0 1rem; background: #fafaf9; }
    .wle-card h2 { font-size: 0.95rem; margin: 0 0 0.65rem; letter-spacing: 0.02em; text-transform: uppercase; color: #78716c; }
    .wle-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.35rem 0; border-bottom: 1px solid #f5f5f4; font-size: 0.95rem; }
    .wle-row:last-child { border-bottom: 0; }
    .wle-ok { color: #166534; font-weight: 600; }
    .wle-bad { color: #9f1239; font-weight: 600; }
    .wle-muted { color: #78716c; }
    .wle-list { margin: 0; padding-left: 1.1rem; }
    .wle-nav a { color: #1d4ed8; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 0.8rem; background: #f5f5f4; padding: 0.75rem; border-radius: 6px; overflow: auto; max-height: 18rem; }
  </style>
</head>
<body>
  <div class="wle-status">
    <p class="wle-nav"><a href="./">← Outdoor dashboard</a></p>
    <h1>Live Engine status</h1>
    <p class="lead">Operational check for <code>data/live.json</code> — no redesign, product-focused.</p>

    <section class="wle-card" aria-label="Live file">
      <h2>live.json</h2>
      <div class="wle-row"><span>Loaded</span><span id="st-loaded" class="wle-ok">Yes</span></div>
      <div class="wle-row"><span>Last updated</span><span id="st-updated" class="wle-ok">${esc(updated)}</span></div>
      <div class="wle-row"><span>Location</span><span id="st-location" class="wle-ok">${esc(payload.location && payload.location.label || "—")}</span></div>
      <div class="wle-row"><span>Fresh (&lt; 3h)</span><span id="st-fresh" class="${fresh ? "wle-ok" : "wle-bad"}">${fresh ? "Yes" : "No / stale"}</span></div>
    </section>

    <section class="wle-card" aria-label="Sources">
      <h2>Data sources used</h2>
      <ul class="wle-list" id="st-sources">${sourceLis}</ul>
    </section>

    <section class="wle-card" aria-label="Failures">
      <h2>Failed sources</h2>
      <ul class="wle-list" id="st-failures">${failureLis}</ul>
    </section>

    <section class="wle-card" aria-label="Integrity">
      <h2>Integrity checks</h2>
      <div class="wle-row"><span>Duplicate headings</span><span id="st-dupes" class="wle-muted">Server check requires browser snapshot</span></div>
      <div class="wle-row"><span>Banned text</span><span id="st-banned" class="${hits.length ? "wle-bad" : "wle-ok"}">${hits.length ? "FOUND: " + esc(hits.join(", ")) : "Clear"}</span></div>
      <p class="wle-muted" id="st-banned-detail">Checked for: ${esc(BANNED.join(", "))}</p>
    </section>

    <section class="wle-card" aria-label="Raw">
      <h2>Raw payload</h2>
      <pre id="st-raw">${esc(raw)}</pre>
    </section>
  </div>
  <script>
    (function () {
      var BANNED = ["coming soon", "assignment", "homework", "lesson", "educational"];
      function set(id, html, ok) {
        var el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = html;
        el.className = ok === true ? "wle-ok" : ok === false ? "wle-bad" : "wle-muted";
      }
      function list(id, items, empty) {
        var el = document.getElementById(id);
        if (!el) return;
        if (!items || !items.length) {
          el.innerHTML = "<li class=\\"wle-muted\\">" + (empty || "None") + "</li>";
          return;
        }
        el.innerHTML = items.map(function (x) {
          return "<li>" + String(x).replace(/</g, "&lt;") + "</li>";
        }).join("");
      }
      function bannedHits(text) {
        var lower = String(text || "").toLowerCase();
        return BANNED.filter(function (w) { return lower.indexOf(w) >= 0; });
      }
      fetch("data/live.json?_=" + Date.now(), { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          set("st-loaded", "Yes", true);
          var updated = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—";
          set("st-updated", updated, !!data.updatedAt);
          set("st-location", (data.location && data.location.label) || "—", true);
          var age = data.updatedAt ? Date.now() - Date.parse(data.updatedAt) : Infinity;
          var fresh = age <= 3 * 60 * 60 * 1000;
          set("st-fresh", fresh ? "Yes" : "No / stale", fresh);
          list("st-sources", (data.meta && data.meta.sources) || [], "No sources recorded");
          var fails = ((data.meta && data.meta.failures) || []).map(function (f) {
            return (f.source || "source") + ": " + (f.error || "failed");
          });
          list("st-failures", fails, "No failed sources");
          var hits = bannedHits(JSON.stringify(data));
          set("st-banned", hits.length ? "FOUND: " + hits.join(", ") : "Clear", hits.length === 0);
          document.getElementById("st-banned-detail").textContent = "Checked for: " + BANNED.join(", ");
          document.getElementById("st-raw").textContent = JSON.stringify(data, null, 2);
        })
        .catch(function (err) {
          set("st-loaded", "No — " + (err && err.message ? err.message : "unavailable"), false);
        });
    })();
  </script>
</body>
</html>
`;
}

function makeDebugSeed(payload, commitHash, buildTime) {
  return {
    commitHash,
    buildTime,
    activePageTitle: "Waypoint Studio — Outdoor Dashboard",
    capturedAt: payload.updatedAt,
    headings: [],
    sectionsRendered: [],
    liveWeatherLoaded: !!(payload.current && payload.current.temperatureF != null),
    locationLoaded: !!(payload.location && isFinite(Number(payload.location.lat)) && isFinite(Number(payload.location.lng))),
    bannedTextPresent: BANNED.some((term) => JSON.stringify(payload).toLowerCase().includes(term)),
    bannedTextHits: BANNED.filter((term) => JSON.stringify(payload).toLowerCase().includes(term)),
    serverGenerated: true
  };
}

function makeDebugHtml(seed) {
  const initialReport = [
    "Waypoint Studio Debug",
    "====================",
    "",
    "1) Current deployed commit hash: " + (seed.commitHash || "unavailable"),
    "2) Build date/time: " + (seed.buildTime || "unavailable"),
    "3) Active page title: " + (seed.activePageTitle || "Waypoint Studio"),
    "",
    "4) Visible H1/H2/H3 headings from live dashboard:",
    "(none captured server-side; browser snapshot will fill this when available)",
    "",
    "5) Live weather loaded: " + (seed.liveWeatherLoaded ? "yes" : "no"),
    "6) Location loaded: " + (seed.locationLoaded ? "yes" : "no"),
    "7) Fallback/coming-soon/educational/assignment text present: " + (seed.bannedTextPresent ? "yes" : "no"),
    seed.bannedTextHits && seed.bannedTextHits.length ? "   - matched banned terms: " + seed.bannedTextHits.join(", ") : "",
    "",
    "8) Dashboard sections currently rendered:",
    "(none captured server-side; browser snapshot will fill this when available)",
    "",
    "Snapshot source: server pre-render",
    "Snapshot captured at: " + (seed.capturedAt || "unavailable"),
    "",
    "Raw snapshot:",
    JSON.stringify(seed, null, 2)
  ].filter(Boolean).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waypoint Studio Debug</title>
</head>
<body>
<p><button id="copy-report" type="button">Copy Report</button> <span id="copy-status" aria-live="polite"></span></p>
<pre id="debug-output">${esc(initialReport)}</pre>
<script>
(function () {
  "use strict";

  var DEBUG_KEY = "waypointDebugSnapshot";
  var FALLBACK_COMMIT = ${JSON.stringify(seed.commitHash || "unknown")};
  var FALLBACK_BUILD = ${JSON.stringify(seed.buildTime || "unknown")};
  var TERMS = ["fallback", "coming-soon", "coming soon", "educational", "assignment"];

  function lines(list) {
    if (!list || !list.length) return ["(none)"];
    return list.map(function (item) { return "- " + item; });
  }

  function readSnapshot() {
    if (window.opener && window.opener.__WAYPOINT_DEBUG__) return window.opener.__WAYPOINT_DEBUG__;
    if (window.__WAYPOINT_DEBUG__) return window.__WAYPOINT_DEBUG__;
    try {
      var raw = localStorage.getItem(DEBUG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function containsTerms(snapshotText) {
    var text = String(snapshotText || "").toLowerCase();
    return TERMS.filter(function (term) { return text.indexOf(term) >= 0; });
  }

  function buildReport(snapshot) {
    var headingList = snapshot && snapshot.headings ? snapshot.headings : [];
    var sectionList = snapshot && snapshot.sectionsRendered ? snapshot.sectionsRendered : [];
    var hits = containsTerms(JSON.stringify(snapshot || {}));
    var fallbackLang = !!(snapshot && snapshot.bannedTextPresent) || hits.length > 0;

    var out = [];
    out.push("Waypoint Studio Debug");
    out.push("====================");
    out.push("");
    out.push("1) Current deployed commit hash: " + ((snapshot && snapshot.commitHash) || FALLBACK_COMMIT || "unavailable"));
    out.push("2) Build date/time: " + ((snapshot && snapshot.buildTime) || FALLBACK_BUILD || "unavailable"));
    out.push("3) Active page title: " + ((snapshot && snapshot.activePageTitle) || document.title));
    out.push("");
    out.push("4) Visible H1/H2/H3 headings from live dashboard:");
    out = out.concat(lines(headingList));
    out.push("");
    out.push("5) Live weather loaded: " + (snapshot && snapshot.liveWeatherLoaded ? "yes" : "no"));
    out.push("6) Location loaded: " + (snapshot && snapshot.locationLoaded ? "yes" : "no"));
    out.push("7) Fallback/coming-soon/educational/assignment text present: " + (fallbackLang ? "yes" : "no"));
    if (snapshot && snapshot.bannedTextHits && snapshot.bannedTextHits.length) {
      out.push("   - matched banned terms: " + snapshot.bannedTextHits.join(", "));
    }
    if (hits.length) out.push("   - matched debug terms: " + hits.join(", "));
    out.push("");
    out.push("8) Dashboard sections currently rendered:");
    out = out.concat(lines(sectionList));
    out.push("");
    out.push("Snapshot source: " + (snapshot ? "window/localStorage" : "none found"));
    out.push("Snapshot captured at: " + ((snapshot && snapshot.capturedAt) || "unavailable"));
    out.push("");
    out.push("Raw snapshot:");
    out.push(JSON.stringify(snapshot || {}, null, 2));
    return out.join("\\n");
  }

  function copyReport() {
    var pre = document.getElementById("debug-output");
    var status = document.getElementById("copy-status");
    if (!pre) return;
    var text = pre.textContent || "";
    function markCopied() {
      if (!status) return;
      status.textContent = "Copied.";
      setTimeout(function () {
        if (status.textContent === "Copied.") status.textContent = "";
      }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(markCopied).catch(function () {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "readonly");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); markCopied(); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
      });
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); markCopied(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  document.getElementById("debug-output").textContent = buildReport(readSnapshot() || ${JSON.stringify(seed)});
  var copyBtn = document.getElementById("copy-report");
  if (copyBtn) copyBtn.addEventListener("click", copyReport);
})();
</script>
</body>
</html>
`;
}

function writeRenderedPages(payload) {
  const commitHash = gitCommit();
  const buildTime = new Date().toISOString();
  fs.writeFileSync(STATUS_PATH, makeStatusHtml(payload), "utf8");
  fs.writeFileSync(DEBUG_PATH, makeDebugHtml(makeDebugSeed(payload, commitHash, buildTime)), "utf8");
}

async function fetchJson(url, label, failures, sources) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    sources.push(label);
    return data;
  } catch (err) {
    failures.push({ source: label, error: err && err.message ? err.message : String(err) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function resolveLocation() {
  try {
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
    const id = index.defaultRegionId || DEFAULT_LOCATION.id;
    const region = (index.regions || []).find((r) => r.id === id);
    if (region) {
      return {
        id: region.id,
        name: region.name || DEFAULT_LOCATION.name,
        state: region.state || DEFAULT_LOCATION.state,
        stateCode: region.stateCode || DEFAULT_LOCATION.stateCode,
        lat: Number(region.lat),
        lng: Number(region.lng),
        contentBundle: region.contentBundle || region.id
      };
    }
  } catch {
    /* use default */
  }
  return { ...DEFAULT_LOCATION, contentBundle: DEFAULT_LOCATION.id };
}

function buildPayload(loc, weather, aqi, sources, failures) {
  const updatedAt = new Date().toISOString();
  const tz = (weather && weather.timezone) || "America/New_York";
  const cur = weather && weather.current;
  const daily = weather && weather.daily;
  const hourly = weather && weather.hourly;

  const weatherCode = cur && cur.weather_code;
  const current = cur
    ? {
        temperatureF: cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null,
        feelsLikeF: cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null,
        humidity: cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) : null,
        windMph: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) : null,
        windGustMph: cur.wind_gusts_10m != null ? Math.round(cur.wind_gusts_10m) : null,
        cloudCover: cur.cloud_cover != null ? Math.round(cur.cloud_cover) : null,
        uvIndex: cur.uv_index != null ? Math.round(cur.uv_index * 10) / 10 : null,
        precipIn: cur.precipitation != null ? cur.precipitation : null,
        conditions: WMO[weatherCode] || (weatherCode != null ? "Code " + weatherCode : null),
        weatherCode: weatherCode != null ? weatherCode : null,
        observedAt: cur.time || null
      }
    : null;

  let hourlySummary = null;
  if (hourly && Array.isArray(hourly.time) && hourly.time.length) {
    const now = Date.now();
    const slots = [];
    for (let i = 0; i < hourly.time.length && slots.length < 6; i++) {
      const t = new Date(hourly.time[i]).getTime();
      if (t < now - 30 * 60 * 1000) continue;
      const code = hourly.weather_code && hourly.weather_code[i];
      slots.push({
        time: hourly.time[i],
        temperatureF: hourly.temperature_2m && hourly.temperature_2m[i] != null
          ? Math.round(hourly.temperature_2m[i])
          : null,
        precipProbability: hourly.precipitation_probability && hourly.precipitation_probability[i] != null
          ? Math.round(hourly.precipitation_probability[i])
          : null,
        conditions: WMO[code] || null
      });
    }
    if (slots.length) {
      const nextRain = slots.find((s) => s.precipProbability != null && s.precipProbability >= 40);
      hourlySummary = {
        nextHours: slots,
        note: nextRain
          ? "Rain chance " + nextRain.precipProbability + "% around " + formatLocalTime(nextRain.time, tz)
          : "Low rain chance in the next several hours"
      };
    }
  }

  const sunriseIso = daily && daily.sunrise && daily.sunrise[0] ? daily.sunrise[0] : null;
  const sunsetIso = daily && daily.sunset && daily.sunset[0] ? daily.sunset[0] : null;
  const phase = moonPhaseFromDate(new Date());

  const airQuality = aqi && aqi.current
    ? {
        usAqi: aqi.current.us_aqi != null ? Math.round(aqi.current.us_aqi) : null,
        pm25: aqi.current.pm2_5 != null ? Math.round(aqi.current.pm2_5 * 10) / 10 : null,
        category: aqi.current.us_aqi != null ? aqiCategory(aqi.current.us_aqi) : null,
        status: aqi.current.us_aqi != null ? "live" : "unavailable"
      }
    : { status: "unavailable", usAqi: null, pm25: null, category: null };

  const high = daily && daily.temperature_2m_max && daily.temperature_2m_max[0] != null
    ? Math.round(daily.temperature_2m_max[0])
    : null;
  const low = daily && daily.temperature_2m_min && daily.temperature_2m_min[0] != null
    ? Math.round(daily.temperature_2m_min[0])
    : null;
  const popMax = daily && daily.precipitation_probability_max && daily.precipitation_probability_max[0] != null
    ? Math.round(daily.precipitation_probability_max[0])
    : null;

  return {
    version: 1,
    engine: "waypoint-live-engine",
    updatedAt,
    location: {
      id: loc.id,
      name: loc.name,
      state: loc.state,
      stateCode: loc.stateCode,
      lat: loc.lat,
      lng: loc.lng,
      contentBundle: loc.contentBundle,
      label: loc.name + (loc.stateCode ? ", " + loc.stateCode : "")
    },
    timezone: tz,
    current,
    forecast: {
      highF: high,
      lowF: low,
      precipProbability: popMax,
      summary: current && current.conditions
        ? current.conditions + (high != null && low != null ? " · High " + high + "° / Low " + low + "°" : "")
        : null
    },
    hourly: hourlySummary,
    sun: {
      sunrise: sunriseIso,
      sunset: sunsetIso,
      sunriseFormatted: formatLocalTime(sunriseIso, tz),
      sunsetFormatted: formatLocalTime(sunsetIso, tz)
    },
    moon: {
      phase: moonPhaseLabel(phase),
      illumination: moonIlluminationPercent(phase),
      phaseValue: Math.round(phase * 1000) / 1000,
      trust: "Estimated",
      source: "Calculated"
    },
    airQuality,
    meta: {
      sources: sources.slice(),
      failures: failures.slice(),
      provider: {
        weather: sources.includes("Open-Meteo") ? "open-meteo" : "none",
        airQuality: sources.includes("Open-Meteo Air Quality") ? "open-meteo-air-quality" : "none",
        moon: "calculated"
      },
      generatedBy: "waypoint-live-engine",
      generatedAt: updatedAt
    }
  };
}

async function main() {
  const loc = resolveLocation();
  const sources = [];
  const failures = [];

  const weatherUrl =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: String(loc.lat),
      longitude: String(loc.lng),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,surface_pressure,uv_index,precipitation",
      hourly:
        "temperature_2m,weather_code,precipitation_probability,precipitation",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset",
      timezone: "auto",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      forecast_days: "2"
    }).toString();

  const aqiUrl =
    "https://air-quality-api.open-meteo.com/v1/air-quality?" +
    new URLSearchParams({
      latitude: String(loc.lat),
      longitude: String(loc.lng),
      current: "us_aqi,pm2_5",
      timezone: "auto"
    }).toString();

  const [weather, aqi] = await Promise.all([
    fetchJson(weatherUrl, "Open-Meteo", failures, sources),
    fetchJson(aqiUrl, "Open-Meteo Air Quality", failures, sources)
  ]);

  if (!weather || !weather.current) {
    failures.push({ source: "Open-Meteo", error: failures.some((f) => f.source === "Open-Meteo") ? "already logged" : "No current weather in response" });
  } else if (!sources.includes("Open-Meteo")) {
    sources.push("Open-Meteo");
  }

  sources.push("Calculated moon phase");

  const payload = buildPayload(loc, weather, aqi, sources, failures.filter((f, i, arr) =>
    arr.findIndex((x) => x.source === f.source && x.error === f.error) === i
  ));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const tmp = OUT_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, OUT_PATH);
  writeRenderedPages(payload);

  console.log("Waypoint Live Engine wrote", OUT_PATH);
  console.log("updatedAt:", payload.updatedAt);
  console.log("location:", payload.location.label);
  console.log("sources:", payload.meta.sources.join(", ") || "none");
  if (payload.meta.failures.length) {
    console.log("failures:", payload.meta.failures.map((f) => f.source + ": " + f.error).join("; "));
  }
  if (!payload.current) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error("waypoint-live-engine failed:", err && err.message ? err.message : err);
  process.exit(1);
});
