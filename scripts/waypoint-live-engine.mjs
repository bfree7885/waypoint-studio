#!/usr/bin/env node
/**
 * Waypoint Live Engine v2 — reliability-focused modular pipeline.
 *
 * - Plugin/module architecture per data source
 * - Per-module health tracking and stale detection
 * - health.json output with runtime stats
 * - Previous-good-data fallback on source failure
 * - status/debug pre-render for crawler-readable diagnostics
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const ENGINE_VERSION = "2.1.0";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const LIVE_PATH = process.env.WAYPOINT_LIVE_OUT || path.join(DATA_DIR, "live.json");
const HEALTH_PATH = path.join(DATA_DIR, "health.json");
const INDEX_PATH = path.join(ROOT, "design-system", "content-engine", "regions-index.json");
const STATUS_PATH = path.join(ROOT, "status.html");
const DEBUG_PATH = path.join(ROOT, "debug.html");
const PUBLISH_STATE_PATH = path.join(DATA_DIR, "publish-state.json");

const DEFAULT_TIMEOUT_MS = 12000;
const ENGINE_STALE_MS = 3 * 60 * 60 * 1000;
const MODULE_DEFAULT_STALE_MS = 2 * 60 * 60 * 1000;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_ATTEMPTS = 3;
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);
const CRITICAL_MODULES = ["weather", "sunrise_sunset", "air_quality", "uv", "alerts"];
const BANNED = ["coming soon", "assignment", "homework", "lesson", "educational"];
const EBIRD_API_KEY = (process.env.WAYPOINT_EBIRD_API_KEY || process.env.EBIRD_API_KEY || "").trim();

const DEFAULT_LOCATION = {
  id: "engine-publish",
  name: "Engine publish point",
  state: "United States",
  stateCode: "US",
  lat: 39.8283,
  lng: -98.5795
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

function ageLabel(iso) {
  if (!iso) return "—";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  const hours = Math.round(mins / 60);
  if (hours < 48) return hours + " h ago";
  const days = Math.round(hours / 24);
  return days + " d ago";
}

function defaultPublishState() {
  return {
    version: 1,
    lastEngineRun: null,
    dataUpdatedAt: null,
    nextScheduledRun: null,
    lastPublishAt: null,
    lastPublishedDataAt: null,
    lastPublishCommit: null,
    lastPublishStatus: "never",
    lastPublishMessage: "No publish attempted yet"
  };
}

function readPublishState() {
  return { ...defaultPublishState(), ...(readJson(PUBLISH_STATE_PATH) || {}) };
}

function writePublishState(state) {
  writeJsonAtomic(PUBLISH_STATE_PATH, state);
}

function formatLocalTime(iso, timeZone) {
  if (!iso) return null;
  try {
    const hasExplicitZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(String(iso));
    if (!hasExplicitZone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(iso))) {
      const m = String(iso).match(/T(\d{2}):(\d{2})/);
      if (m) {
        const h24 = Number(m[1]);
        const min = m[2];
        const suffix = h24 >= 12 ? "PM" : "AM";
        const h12 = h24 % 12 || 12;
        return h12 + ":" + min + " " + suffix;
      }
    }
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

function nextHalfHourIso(now) {
  const d = new Date(now);
  const m = d.getUTCMinutes();
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(m < 30 ? 30 : 60);
  return d.toISOString();
}

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

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function usgsBbox(lat, lng, delta = 0.35) {
  return [
    (lng - delta).toFixed(4),
    (lat - delta).toFixed(4),
    (lng + delta).toFixed(4),
    (lat + delta).toFixed(4)
  ].join(",");
}

function parseUsgsSeries(data) {
  const ts = data && data.value && data.value.timeSeries;
  if (!Array.isArray(ts)) return [];
  return ts.map((series) => {
    const src = series.sourceInfo || {};
    const geo = src.geoLocation && src.geoLocation.geogLocation;
    const siteCode = src.siteCode && src.siteCode[0] ? src.siteCode[0].value : null;
    const varCode = series.variable && series.variable.variableCode &&
      series.variable.variableCode[0] ? series.variable.variableCode[0].value : null;
    const val = series.values && series.values[0] && series.values[0].value &&
      series.values[0].value[0] ? series.values[0].value[0] : null;
    return {
      siteId: siteCode,
      siteName: src.siteName || "USGS gauge",
      lat: geo ? Number(geo.latitude) : null,
      lng: geo ? Number(geo.longitude) : null,
      parameter: varCode,
      value: val ? Number(val.value) : null,
      unit: series.variable && series.variable.unit ? series.variable.unit.unitCode : null,
      observedAt: val ? val.dateTime : null
    };
  }).filter((s) => s.siteId && s.value != null && Number.isFinite(s.value));
}

function mergeUsgsBySite(rows) {
  const map = {};
  rows.forEach((r) => {
    if (!map[r.siteId]) {
      map[r.siteId] = {
        siteId: r.siteId,
        siteName: r.siteName,
        lat: r.lat,
        lng: r.lng,
        observedAt: r.observedAt
      };
    }
    if (r.parameter === "00060") {
      map[r.siteId].dischargeCfs = r.value;
      map[r.siteId].dischargeUnit = r.unit;
    }
    if (r.parameter === "00065") {
      map[r.siteId].stageFt = r.value;
      map[r.siteId].stageUnit = r.unit;
    }
    if (r.observedAt && (!map[r.siteId].observedAt || r.observedAt > map[r.siteId].observedAt)) {
      map[r.siteId].observedAt = r.observedAt;
    }
  });
  return Object.values(map);
}

async function fetchUsgsNearestGauge(lat, lng, resilientFetch, timeoutMs) {
  const MAX_GAUGE_DISTANCE_MILES = 50;
  const MAX_GAUGE_DISTANCE_KM = MAX_GAUGE_DISTANCE_MILES * 1.60934;
  const url = "https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=" +
    encodeURIComponent(usgsBbox(lat, lng)) +
    "&parameterCd=00060,00065&siteStatus=active";
  const data = await resilientFetch(url, { timeoutMs: timeoutMs || 25000, maxRetries: 2 });
  const sites = mergeUsgsBySite(parseUsgsSeries(data));
  if (!sites.length) return null;
  sites.forEach((s) => {
    if (s.lat != null && s.lng != null) {
      s.distanceKm = distanceKm(lat, lng, s.lat, s.lng);
    } else {
      s.distanceKm = 9999;
    }
  });
  sites.sort((a, b) => a.distanceKm - b.distanceKm);
  const nearest = sites[0];
  if (!nearest || nearest.distanceKm > MAX_GAUGE_DISTANCE_KM) {
    return {
      nearest: null,
      siteCount: sites.length,
      status: "no-nearby",
      fallbackReason: `no-gauge-within-${MAX_GAUGE_DISTANCE_MILES}-miles`
    };
  }
  return { nearest, siteCount: sites.length };
}

function formatRiverSummary(gauge) {
  if (!gauge || !gauge.nearest) return "Data currently unavailable";
  const n = gauge.nearest;
  const parts = [];
  if (n.stageFt != null) parts.push(n.stageFt + " ft stage");
  if (n.dischargeCfs != null) parts.push(n.dischargeCfs + " cfs");
  const detail = parts.length ? parts.join(" · ") : "Gauge reading available";
  const dist = n.distanceKm != null && n.distanceKm < 9000 ? " · " + n.distanceKm.toFixed(1) + " km away" : "";
  return n.siteName + " — " + detail + dist;
}

function pollenLevelLabel(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (v < 10) return "Low";
  if (v < 50) return "Moderate";
  if (v < 100) return "High";
  return "Very high";
}

function summarizePollen(current) {
  if (!current) return null;
  const types = [
    ["Tree", current.birch_pollen],
    ["Grass", current.grass_pollen],
    ["Ragweed", current.ragweed_pollen],
    ["Olive", current.olive_pollen]
  ].filter(([, v]) => v != null && Number.isFinite(Number(v)));
  if (!types.length) return null;
  types.sort((a, b) => Number(b[1]) - Number(a[1]));
  const top = types[0];
  const level = pollenLevelLabel(top[1]);
  const extra = types.length > 1
    ? " · also " + types.slice(1, 3).map(([name, val]) => name + " " + pollenLevelLabel(val).toLowerCase()).join(", ")
    : "";
  return top[0] + " pollen " + (level ? level.toLowerCase() : "active") + extra;
}

function localHourMinute(iso) {
  if (!iso || typeof iso !== "string") return null;
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

function validateSunWindow(sunriseIso, sunsetIso, lat) {
  const sr = localHourMinute(sunriseIso);
  const ss = localHourMinute(sunsetIso);
  if (!sr || !ss) return { ok: false, reason: "Missing sunrise/sunset fields" };
  if (Math.abs(Number(lat)) >= 60) return { ok: true };
  const sunriseMinutes = sr.hour * 60 + sr.minute;
  const sunsetMinutes = ss.hour * 60 + ss.minute;
  const sunrisePlausible = sunriseMinutes >= 180 && sunriseMinutes <= 600;
  const sunsetPlausible = sunsetMinutes >= 900 && sunsetMinutes <= 1380;
  const orderingPlausible = sunsetMinutes > sunriseMinutes;
  if (sunrisePlausible && sunsetPlausible && orderingPlausible) return { ok: true };
  return {
    ok: false,
    reason: "Impossible sun window for location: sunrise " + sunriseIso + ", sunset " + sunsetIso
  };
}

function formatBirdObservationTime(iso, timeZone) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timeZone || undefined
    });
  } catch {
    return iso;
  }
}

function normalizeEbirdObservations(rows, lat, lng, timeZone) {
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => {
    const obsLat = row && row.lat != null ? Number(row.lat) : null;
    const obsLng = row && row.lng != null ? Number(row.lng) : null;
    const observedAt = row && row.obsDt ? row.obsDt : null;
    const distance = Number.isFinite(obsLat) && Number.isFinite(obsLng)
      ? Math.round(distanceKm(lat, lng, obsLat, obsLng) * 10) / 10
      : null;
    const count = row && row.howMany != null && Number.isFinite(Number(row.howMany))
      ? Number(row.howMany)
      : null;
    return {
      speciesCode: row && row.speciesCode ? row.speciesCode : null,
      commonName: row && row.comName ? row.comName : "Unknown species",
      scientificName: row && row.sciName ? row.sciName : null,
      count,
      observedAt,
      observedLabel: formatBirdObservationTime(observedAt, timeZone),
      locationName: row && row.locName ? row.locName : null,
      lat: Number.isFinite(obsLat) ? obsLat : null,
      lng: Number.isFinite(obsLng) ? obsLng : null,
      distanceKm: distance
    };
  });
}

async function fetchEbirdRecent(lat, lng, timeZone) {
  if (!EBIRD_API_KEY) {
    return {
      source: "eBird",
      data: {
        status: "unavailable",
        summary: "Regional estimate only — eBird key not configured",
        provider: "eBird",
        observations: [],
        count: 0
      }
    };
  }

  const url = "https://api.ebird.org/v2/data/obs/geo/recent?" + new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    dist: "25",
    back: "3",
    maxResults: "12"
  }).toString();
  let attempts = 0;
  let totalMs = 0;
  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    attempts = attempt + 1;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
          "X-eBirdApiToken": EBIRD_API_KEY
        }
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = await res.json();
      clearTimeout(timer);
      totalMs += Date.now() - t0;
      const observations = normalizeEbirdObservations(rows, lat, lng, timeZone).slice(0, 8);
      if (!observations.length) {
        return {
          source: "eBird",
          data: {
            status: "unavailable",
            summary: "No recent bird observations nearby",
            provider: "eBird",
            observations: [],
            count: 0
          },
          fetchMeta: { attempts, responseMs: totalMs }
        };
      }
      return {
        source: "eBird",
        data: {
          status: "live",
          summary: "Recent birds nearby: " + observations.length + " observation" + (observations.length === 1 ? "" : "s"),
          provider: "eBird",
          observations,
          count: observations.length
        },
        fetchMeta: { attempts, responseMs: totalMs }
      };
    } catch (err) {
      clearTimeout(timer);
      totalMs += Date.now() - t0;
      lastError = err;
      if (!isRetryableError(err) || attempt >= RETRY_MAX_ATTEMPTS) break;
      await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
  const err = new Error(lastError && lastError.message ? lastError.message : "eBird fetch failed");
  err.attempts = attempts;
  err.responseMs = totalMs;
  throw err;
}

function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

function resolveLocation() {
  const envLat = process.env.WAYPOINT_ENGINE_LAT;
  const envLng = process.env.WAYPOINT_ENGINE_LNG;
  if (envLat != null && envLng != null) {
    const lat = Number(envLat);
    const lng = Number(envLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        id: "engine-configured",
        name: process.env.WAYPOINT_ENGINE_NAME || "Configured engine location",
        state: process.env.WAYPOINT_ENGINE_STATE || "United States",
        stateCode: process.env.WAYPOINT_ENGINE_STATE_CODE || "US",
        lat,
        lng,
        contentBundle: process.env.WAYPOINT_ENGINE_BUNDLE || "us-national",
        enginePublish: true
      };
    }
  }
  return {
    ...DEFAULT_LOCATION,
    contentBundle: "us-national",
    enginePublish: true,
    label: "Engine publish point (set WAYPOINT_ENGINE_LAT/LNG for your kiosk)"
  };
}

async function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  const msg = String(err && err.message ? err.message : err);
  if (/aborted|AbortError|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|fetch failed/i.test(msg)) {
    return true;
  }
  const httpMatch = msg.match(/HTTP (\d+)/);
  if (httpMatch) return RETRYABLE_HTTP.has(Number(httpMatch[1]));
  return false;
}

async function fetchJsonResilient(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries != null ? options.maxRetries : RETRY_MAX_ATTEMPTS;
  let attempts = 0;
  let totalMs = 0;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts = attempt + 1;
    const t0 = Date.now();
    try {
      const data = await fetchJson(url, timeoutMs);
      totalMs += Date.now() - t0;
      return { data, attempts, responseMs: totalMs };
    } catch (err) {
      totalMs += Date.now() - t0;
      lastError = err;
      if (!isRetryableError(err) || attempt >= maxRetries) break;
      await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
  const err = new Error(lastError && lastError.message ? lastError.message : "fetch failed");
  err.attempts = attempts;
  err.responseMs = totalMs;
  throw err;
}

function moduleDisplayStatus(status, lastSuccessfulUpdate, staleMs) {
  const s = String(status || "").toLowerCase();
  if (s === "unavailable") return "TEMPORARILY UNAVAILABLE";
  if (s === "live") return "LIVE";
  if (s === "fallback" || s === "estimated" || s === "degraded") {
    if (!lastSuccessfulUpdate) return "TEMPORARILY UNAVAILABLE";
    const age = Date.now() - Date.parse(lastSuccessfulUpdate);
    const limit = staleMs || MODULE_DEFAULT_STALE_MS;
    if (!isFinite(age) || age > limit) return "TEMPORARILY UNAVAILABLE";
    return "ESTIMATED";
  }
  return "TEMPORARILY UNAVAILABLE";
}

function moduleUsable(mod, staleMs) {
  if (!mod) return false;
  return moduleDisplayStatus(mod.status, mod.lastSuccessfulUpdate, staleMs) !== "TEMPORARILY UNAVAILABLE";
}

function moduleIsRecentFallback(mod, staleMs) {
  if (!mod || mod.status !== "fallback") return false;
  if (!mod.lastSuccessfulUpdate) return false;
  const age = Date.now() - Date.parse(mod.lastSuccessfulUpdate);
  const limit = staleMs || MODULE_DEFAULT_STALE_MS;
  return isFinite(age) && age <= limit;
}

function cacheStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "fallback") return "serving-cache";
  if (s === "live") return "fresh";
  if (s === "estimated" || s === "degraded") return "derived";
  return "none";
}

function overallHealthLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "healthy-degraded") return "HEALTHY (DEGRADED)";
  if (s === "healthy") return "HEALTHY";
  if (s === "warning") return "WARNING";
  if (s === "stale") return "STALE";
  return String(status || "unknown").toUpperCase();
}

function previousModuleData(previousLive, moduleName) {
  return previousLive && previousLive.modules && previousLive.modules[moduleName]
    ? previousLive.modules[moduleName].data
    : null;
}

function moduleWasHealthy(previousHealth, moduleName) {
  return previousHealth &&
    previousHealth.modules &&
    previousHealth.modules[moduleName] &&
    previousHealth.modules[moduleName].lastSuccessfulUpdate
    ? previousHealth.modules[moduleName].lastSuccessfulUpdate
    : null;
}

function buildPlugins() {
  return [
    {
      name: "weather",
      provider: "Open-Meteo",
      staleMs: 90 * 60 * 1000,
      maxRetries: 3,
      async fetch(ctx) {
        const weatherUrl =
          "https://api.open-meteo.com/v1/forecast?" +
          new URLSearchParams({
            latitude: String(ctx.location.lat),
            longitude: String(ctx.location.lng),
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
        const result = await fetchJsonResilient(weatherUrl, {
          timeoutMs: DEFAULT_TIMEOUT_MS,
          maxRetries: ctx.pluginMaxRetries
        });
        if (!result.data || !result.data.current) throw new Error("No current weather in response");
        return { source: "Open-Meteo", data: result.data, fetchMeta: { attempts: result.attempts, responseMs: result.responseMs } };
      }
    },
    {
      name: "sunrise_sunset",
      provider: "Open-Meteo astronomy",
      staleMs: 24 * 60 * 60 * 1000,
      async fetch(ctx) {
        const wx = ctx.moduleResults.weather && ctx.moduleResults.weather.data;
        if (!wx || !wx.daily || !wx.daily.sunrise || !wx.daily.sunset) {
          throw new Error("Weather module unavailable for sunrise/sunset");
        }
        const sunrise = wx.daily.sunrise[0] || null;
        const sunset = wx.daily.sunset[0] || null;
        const check = validateSunWindow(sunrise, sunset, ctx.location.lat);
        if (!check.ok) throw new Error(check.reason);
        return {
          source: "Open-Meteo astronomy",
          data: {
            sunrise,
            sunset,
            sunriseFormatted: formatLocalTime(sunrise, wx.timezone),
            sunsetFormatted: formatLocalTime(sunset, wx.timezone),
            timezone: wx.timezone || "America/New_York"
          }
        };
      }
    },
    {
      name: "moon",
      provider: "Calculated",
      staleMs: 24 * 60 * 60 * 1000,
      async fetch() {
        const phase = moonPhaseFromDate(new Date());
        return {
          source: "Calculated",
          data: {
            phase: moonPhaseLabel(phase),
            illumination: moonIlluminationPercent(phase),
            phaseValue: Math.round(phase * 1000) / 1000,
            trust: "Estimated"
          }
        };
      }
    },
    {
      name: "air_quality",
      provider: "Open-Meteo Air Quality",
      staleMs: 90 * 60 * 1000,
      maxRetries: 3,
      async fetch(ctx) {
        const url =
          "https://air-quality-api.open-meteo.com/v1/air-quality?" +
          new URLSearchParams({
            latitude: String(ctx.location.lat),
            longitude: String(ctx.location.lng),
            current: "us_aqi,pm2_5",
            timezone: "auto"
          }).toString();
        const result = await fetchJsonResilient(url, {
          timeoutMs: DEFAULT_TIMEOUT_MS,
          maxRetries: ctx.pluginMaxRetries
        });
        if (!result.data || !result.data.current) throw new Error("No AQ payload");
        const usAqi = result.data.current.us_aqi != null ? Math.round(result.data.current.us_aqi) : null;
        return {
          source: "Open-Meteo Air Quality",
          data: {
            usAqi,
            pm25: result.data.current.pm2_5 != null ? Math.round(result.data.current.pm2_5 * 10) / 10 : null,
            category: usAqi != null ? aqiCategory(usAqi) : null,
            status: usAqi != null ? "live" : "unavailable"
          },
          fetchMeta: { attempts: result.attempts, responseMs: result.responseMs }
        };
      }
    },
    {
      name: "uv",
      provider: "Open-Meteo",
      staleMs: 90 * 60 * 1000,
      async fetch(ctx) {
        const wx = ctx.moduleResults.weather && ctx.moduleResults.weather.data;
        if (!wx || !wx.current) throw new Error("Weather module unavailable for UV");
        return {
          source: "Open-Meteo",
          data: {
            uvIndex: wx.current.uv_index != null ? Math.round(wx.current.uv_index * 10) / 10 : null,
            status: wx.current.uv_index != null ? "live" : "unavailable"
          }
        };
      }
    },
    {
      name: "pollen",
      provider: "Open-Meteo Air Quality",
      staleMs: 6 * 60 * 60 * 1000,
      maxRetries: 2,
      async fetch(ctx) {
        const url = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" +
          encodeURIComponent(ctx.location.lat) + "&longitude=" + encodeURIComponent(ctx.location.lng) +
          "&current=birch_pollen,grass_pollen,olive_pollen,ragweed_pollen";
        const result = await fetchJsonResilient(url, {
          timeoutMs: DEFAULT_TIMEOUT_MS,
          maxRetries: ctx.pluginMaxRetries
        });
        const current = result.data && result.data.current ? result.data.current : null;
        const summary = summarizePollen(current);
        if (!summary) {
          return {
            source: "Open-Meteo Air Quality",
            data: { status: "unavailable", summary: "Data currently unavailable" },
            fetchMeta: { attempts: result.attempts, responseMs: result.responseMs }
          };
        }
        return {
          source: "Open-Meteo Air Quality",
          data: {
            status: "estimated",
            summary,
            birch: current.birch_pollen != null ? Math.round(current.birch_pollen) : null,
            grass: current.grass_pollen != null ? Math.round(current.grass_pollen) : null,
            ragweed: current.ragweed_pollen != null ? Math.round(current.ragweed_pollen) : null,
            olive: current.olive_pollen != null ? Math.round(current.olive_pollen) : null
          },
          fetchMeta: { attempts: result.attempts, responseMs: result.responseMs }
        };
      }
    },
    {
      name: "river_gauges",
      provider: "USGS Water Services",
      staleMs: 2 * 60 * 60 * 1000,
      maxRetries: 2,
      async fetch(ctx) {
        const gauge = await fetchUsgsNearestGauge(ctx.location.lat, ctx.location.lng, async (url, opts) => {
          const result = await fetchJsonResilient(url, {
            timeoutMs: opts && opts.timeoutMs ? opts.timeoutMs : 12000,
            maxRetries: ctx.pluginMaxRetries
          });
          ctx.lastFetchMeta = { attempts: result.attempts, responseMs: result.responseMs };
          return result.data;
        }, 12000);
        if (!gauge || !gauge.nearest) {
          return {
            source: "USGS Water Services",
            data: {
              status: gauge && gauge.status === "no-nearby" ? "no-nearby" : "unavailable",
              summary: "No nearby monitored rivers",
              fallbackReason: gauge && gauge.fallbackReason ? gauge.fallbackReason : "no-active-gauge"
            },
            fetchMeta: ctx.lastFetchMeta || { attempts: 1, responseMs: 0 }
          };
        }
        return {
          source: "USGS Water Services",
          data: {
            status: "live",
            summary: formatRiverSummary(gauge),
            nearest: gauge.nearest,
            siteCount: gauge.siteCount,
            disclaimer: "Provisional USGS data — subject to revision"
          },
          fetchMeta: ctx.lastFetchMeta || { attempts: 1, responseMs: 0 }
        };
      }
    },
    {
      name: "ebird",
      provider: "eBird",
      staleMs: 3 * 60 * 60 * 1000,
      maxRetries: 2,
      async fetch(ctx) {
        const wx = ctx.moduleResults.weather && ctx.moduleResults.weather.data;
        const tz = wx && wx.timezone ? wx.timezone : "America/New_York";
        return fetchEbirdRecent(ctx.location.lat, ctx.location.lng, tz);
      }
    },
    {
      name: "alerts",
      provider: "NWS",
      staleMs: 60 * 60 * 1000,
      maxRetries: 3,
      async fetch(ctx) {
        const url = "https://api.weather.gov/alerts/active?point=" + encodeURIComponent(ctx.location.lat + "," + ctx.location.lng);
        const result = await fetchJsonResilient(url, {
          timeoutMs: DEFAULT_TIMEOUT_MS,
          maxRetries: ctx.pluginMaxRetries
        });
        const feats = result.data && result.data.features ? result.data.features : [];
        return {
          source: "NWS",
          data: {
            status: "live",
            count: feats.length,
            items: feats.slice(0, 6).map((f) => {
              const p = f && f.properties ? f.properties : {};
              return { event: p.event || "Alert", severity: p.severity || null, headline: p.headline || null };
            })
          },
          fetchMeta: { attempts: result.attempts, responseMs: result.responseMs }
        };
      }
    },
    {
      name: "photography_conditions",
      provider: "Derived from weather/sun",
      staleMs: 90 * 60 * 1000,
      async fetch(ctx) {
        const wx = ctx.moduleResults.weather && ctx.moduleResults.weather.data;
        const sun = ctx.moduleResults.sunrise_sunset && ctx.moduleResults.sunrise_sunset.data;
        if (!wx || !wx.current) throw new Error("Weather module unavailable for photography");
        const cloud = wx.current.cloud_cover != null ? Math.round(wx.current.cloud_cover) : null;
        let score = 50;
        if (cloud != null) {
          if (cloud <= 15) score = 80;
          else if (cloud <= 55) score = 92;
          else if (cloud <= 85) score = 68;
          else score = 48;
        }
        return {
          source: "Derived from weather/sun",
          data: {
            status: "estimated",
            cloudCover: cloud,
            score,
            summary: cloud == null
              ? "Data currently unavailable"
              : (score >= 80 ? "Strong outdoor light conditions" : "Moderate outdoor light conditions"),
            sunrise: sun ? sun.sunriseFormatted : null,
            sunset: sun ? sun.sunsetFormatted : null
          }
        };
      }
    }
  ];
}

async function runPlugin(plugin, ctx) {
  const started = Date.now();
  const nowIso = new Date().toISOString();
  const previousData = previousModuleData(ctx.previousLive, plugin.name);
  const previousModuleHealth = ctx.previousHealth &&
    ctx.previousHealth.modules ? ctx.previousHealth.modules[plugin.name] : null;
  const previousSuccess = moduleWasHealthy(ctx.previousHealth, plugin.name);
  const prevFailureCount = previousModuleHealth && Number.isFinite(previousModuleHealth.failureCount)
    ? previousModuleHealth.failureCount : 0;
  const wasRecovering = previousModuleHealth &&
  (previousModuleHealth.status === "fallback" ||
    previousModuleHealth.status === "unavailable" ||
    previousModuleHealth.lastError);

  ctx.pluginMaxRetries = plugin.maxRetries != null ? plugin.maxRetries : RETRY_MAX_ATTEMPTS;
  ctx.lastFetchMeta = null;

  let status = "unavailable";
  let data = previousData;
  let source = plugin.provider || plugin.name;
  let error = null;
  let lastSuccessfulUpdate = previousSuccess ||
    (previousData ? (ctx.previousLive && ctx.previousLive.updatedAt) : null);
  let retryAttempts = 0;
  let responseMs = 0;

  function normalizeStatusFromData(value) {
    if (!value || typeof value.status !== "string") return "live";
    const s = value.status.toLowerCase();
    if (s === "live" || s === "estimated" || s === "unavailable" || s === "editorial" || s === "degraded") {
      return s;
    }
    return "live";
  }

  function finalize(fields) {
    const staleMs = plugin.staleMs || MODULE_DEFAULT_STALE_MS;
    const fallbackAgeMs = fields.status === "fallback" && fields.lastSuccessfulUpdate
      ? Math.max(0, Date.now() - Date.parse(fields.lastSuccessfulUpdate))
      : null;
    return {
      name: plugin.name,
      provider: plugin.provider || fields.source,
      status: fields.status,
      displayStatus: moduleDisplayStatus(fields.status, fields.lastSuccessfulUpdate, staleMs),
      data: fields.data,
      source: fields.source,
      error: fields.error || null,
      lastError: fields.error || null,
      responseMs: fields.responseMs,
      retryAttempts: fields.retryAttempts,
      failureCount: fields.failureCount,
      recoveryAt: fields.recoveryAt || null,
      lastAttempt: nowIso,
      lastSuccessfulUpdate: fields.lastSuccessfulUpdate,
      fallbackAgeMs,
      fallbackAge: fallbackAgeMs != null ? ageLabel(fields.lastSuccessfulUpdate) : null,
      cacheStatus: cacheStatusLabel(fields.status),
      stale: false
    };
  }

  try {
    const result = await plugin.fetch(ctx);
    data = result && result.data != null ? result.data : null;
    source = result && result.source ? result.source : (plugin.provider || plugin.name);
    status = normalizeStatusFromData(data);
    lastSuccessfulUpdate = nowIso;
    const fetchMeta = result && result.fetchMeta ? result.fetchMeta : (ctx.lastFetchMeta || null);
    retryAttempts = fetchMeta && fetchMeta.attempts ? fetchMeta.attempts : 1;
    responseMs = fetchMeta && fetchMeta.responseMs != null
      ? fetchMeta.responseMs
      : (Date.now() - started);
    const recoveryAt = wasRecovering ? nowIso : (previousModuleHealth && previousModuleHealth.recoveryAt) || null;
    ctx.moduleResults[plugin.name] = { data, source, status };
    return finalize({
      status,
      data,
      source,
      error: null,
      responseMs,
      retryAttempts,
      failureCount: 0,
      recoveryAt,
      lastSuccessfulUpdate
    });
  } catch (err) {
    error = err && err.message ? err.message : String(err);
    retryAttempts = err && err.attempts ? err.attempts : (ctx.lastFetchMeta && ctx.lastFetchMeta.attempts) || 1;
    responseMs = err && err.responseMs != null
      ? err.responseMs
      : (Date.now() - started);
    const failureCount = prevFailureCount + 1;
    if (previousData != null) {
      status = "fallback";
      source = "previous-success";
      data = previousData;
    } else {
      status = "unavailable";
      source = "none";
      data = null;
    }
    ctx.failures.push({ module: plugin.name, source: plugin.provider || source, error, retryAttempts });
    ctx.moduleResults[plugin.name] = { data, source, status };
    return finalize({
      status,
      data,
      source,
      error,
      responseMs,
      retryAttempts,
      failureCount,
      recoveryAt: null,
      lastSuccessfulUpdate
    });
  }
}

function applyStale(result, staleMs) {
  const limit = staleMs || MODULE_DEFAULT_STALE_MS;
  if (!result.lastSuccessfulUpdate) {
    result.stale = true;
    if (result.status === "live") result.status = "degraded";
    result.displayStatus = moduleDisplayStatus(result.status, null, limit);
    return result;
  }
  const age = Date.now() - Date.parse(result.lastSuccessfulUpdate);
  result.stale = !isFinite(age) || age > limit;
  result.fallbackAgeMs = result.status === "fallback" ? Math.max(0, age) : result.fallbackAgeMs;
  result.fallbackAge = result.fallbackAgeMs != null ? ageLabel(result.lastSuccessfulUpdate) : result.fallbackAge;
  if (result.stale && result.status === "live") result.status = "degraded";
  result.displayStatus = moduleDisplayStatus(result.status, result.lastSuccessfulUpdate, limit);
  result.cacheStatus = cacheStatusLabel(result.status);
  return result;
}

function buildLivePayload(ctx, moduleList) {
  const weather = ctx.moduleResults.weather && ctx.moduleResults.weather.data;
  const sun = ctx.moduleResults.sunrise_sunset && ctx.moduleResults.sunrise_sunset.data;
  const moon = ctx.moduleResults.moon && ctx.moduleResults.moon.data;
  const air = ctx.moduleResults.air_quality && ctx.moduleResults.air_quality.data;
  const uv = ctx.moduleResults.uv && ctx.moduleResults.uv.data;
  const alerts = ctx.moduleResults.alerts && ctx.moduleResults.alerts.data;
  const photography = ctx.moduleResults.photography_conditions && ctx.moduleResults.photography_conditions.data;
  const river = ctx.moduleResults.river_gauges && ctx.moduleResults.river_gauges.data;
  const pollen = ctx.moduleResults.pollen && ctx.moduleResults.pollen.data;
  const ebird = ctx.moduleResults.ebird && ctx.moduleResults.ebird.data;

  const cur = weather && weather.current ? weather.current : null;
  const daily = weather && weather.daily ? weather.daily : null;
  const hourly = weather && weather.hourly ? weather.hourly : null;
  const weatherCode = cur && cur.weather_code;
  const timezone = weather && weather.timezone ? weather.timezone : "America/New_York";

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
        temperatureF: hourly.temperature_2m && hourly.temperature_2m[i] != null ? Math.round(hourly.temperature_2m[i]) : null,
        precipProbability: hourly.precipitation_probability && hourly.precipitation_probability[i] != null ? Math.round(hourly.precipitation_probability[i]) : null,
        conditions: WMO[code] || null
      });
    }
    if (slots.length) {
      const nextRain = slots.find((s) => s.precipProbability != null && s.precipProbability >= 40);
      hourlySummary = {
        nextHours: slots,
        note: nextRain
          ? "Rain chance " + nextRain.precipProbability + "% around " + formatLocalTime(nextRain.time, timezone)
          : "Low rain chance in the next several hours"
      };
    }
  }

  const high = daily && daily.temperature_2m_max && daily.temperature_2m_max[0] != null ? Math.round(daily.temperature_2m_max[0]) : null;
  const low = daily && daily.temperature_2m_min && daily.temperature_2m_min[0] != null ? Math.round(daily.temperature_2m_min[0]) : null;
  const popMax = daily && daily.precipitation_probability_max && daily.precipitation_probability_max[0] != null
    ? Math.round(daily.precipitation_probability_max[0])
    : null;

  const sources = moduleList
    .map((m) => ctx.moduleHealth[m.name])
    .filter((h) => h && (h.status === "live" || h.status === "fallback" || h.status === "degraded"))
    .map((h) => h.source)
    .filter(Boolean);

  const payload = {
    version: 2,
    engine: "waypoint-live-engine",
    engineVersion: ENGINE_VERSION,
    updatedAt: ctx.runAt,
    nextScheduledUpdate: nextHalfHourIso(ctx.runStarted),
    location: {
      id: ctx.location.id,
      name: ctx.location.name,
      state: ctx.location.state,
      stateCode: ctx.location.stateCode,
      lat: ctx.location.lat,
      lng: ctx.location.lng,
      contentBundle: ctx.location.contentBundle,
      label: ctx.location.label || (ctx.location.enginePublish
        ? "Engine publish · " + ctx.location.name + (ctx.location.stateCode ? ", " + ctx.location.stateCode : "")
        : ctx.location.name + (ctx.location.stateCode ? ", " + ctx.location.stateCode : ""))
    },
    timezone,
    current: cur ? {
      temperatureF: cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null,
      feelsLikeF: cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null,
      humidity: cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) : null,
      windMph: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) : null,
      windGustMph: cur.wind_gusts_10m != null ? Math.round(cur.wind_gusts_10m) : null,
      cloudCover: cur.cloud_cover != null ? Math.round(cur.cloud_cover) : null,
      uvIndex: uv && uv.uvIndex != null ? uv.uvIndex : (cur.uv_index != null ? Math.round(cur.uv_index * 10) / 10 : null),
      precipIn: cur.precipitation != null ? cur.precipitation : null,
      conditions: WMO[weatherCode] || (weatherCode != null ? "Code " + weatherCode : null),
      weatherCode: weatherCode != null ? weatherCode : null,
      observedAt: cur.time || null
    } : null,
    forecast: {
      highF: high,
      lowF: low,
      precipProbability: popMax,
      summary: cur && (WMO[weatherCode] || "Current conditions available")
        ? (WMO[weatherCode] || "Current conditions available") + (high != null && low != null ? " · High " + high + "° / Low " + low + "°" : "")
        : null
    },
    hourly: hourlySummary,
    sun: sun || {
      sunrise: null,
      sunset: null,
      sunriseFormatted: null,
      sunsetFormatted: null
    },
    moon: moon || {
      phase: null,
      illumination: null,
      phaseValue: null,
      trust: "Estimated",
      source: "Calculated"
    },
    airQuality: air || { status: "unavailable", usAqi: null, pm25: null, category: null },
    modules: {
      weather: { data: weather || null },
      sunrise_sunset: { data: sun || null },
      moon: { data: moon || null },
      air_quality: { data: air || null },
      uv: { data: uv || null },
      pollen: { data: pollen || null },
      river_gauges: { data: river || null },
      ebird: { data: ebird || null },
      alerts: { data: alerts || null },
      photography_conditions: { data: photography || null }
    },
    meta: {
      sources: sources,
      failures: ctx.failures.slice(),
      generatedBy: "waypoint-live-engine",
      generatedAt: ctx.runAt,
      healthFile: "data/health.json",
      blockStatus: {
        weather: blockStatusFor(ctx, "weather"),
        alerts: blockStatusFor(ctx, "alerts"),
        airQuality: blockStatusFor(ctx, "air_quality"),
        elevation: "unavailable",
        usgsWater: blockStatusFor(ctx, "river_gauges"),
        ebird: blockStatusFor(ctx, "ebird")
      }
    }
  };
  return payload;
}

function blockStatusFor(ctx, moduleName) {
  const mod = ctx.moduleHealth[moduleName];
  if (!mod) return "unavailable";
  if (mod.displayStatus === "LIVE") return "live";
  if (mod.displayStatus === "ESTIMATED") return "estimated";
  return "unavailable";
}

const OPTIONAL_UNAVAILABLE_OK = new Set(["pollen", "river_gauges", "ebird"]);

function buildHealth(ctx, moduleList, payload) {
  const modules = {};
  const nextRefresh = payload.nextScheduledUpdate;
  moduleList.forEach((m) => {
    const mod = { ...ctx.moduleHealth[m.name] };
    mod.nextScheduledRefresh = nextRefresh;
    modules[m.name] = mod;
  });

  const pluginStaleMs = (name) => {
    const plugin = moduleList.find((m) => m.name === name);
    return plugin ? (plugin.staleMs || MODULE_DEFAULT_STALE_MS) : MODULE_DEFAULT_STALE_MS;
  };

  const criticalUnavailableCount = CRITICAL_MODULES.filter((name) => {
    return !moduleUsable(modules[name], pluginStaleMs(name));
  }).length;
  const criticalRecentFallbackCount = CRITICAL_MODULES.filter((name) => {
    return moduleIsRecentFallback(modules[name], pluginStaleMs(name));
  }).length;
  const criticalLiveCount = CRITICAL_MODULES.filter((name) => {
    return modules[name] && modules[name].status === "live";
  }).length;
  const criticalUsableCount = CRITICAL_MODULES.length - criticalUnavailableCount;

  let overallStatus;
  let message;
  if (criticalUsableCount === 0) {
    overallStatus = "stale";
    message = "No usable live information from critical modules. Check upstream providers and publish pipeline.";
  } else if (criticalUnavailableCount >= 2) {
    overallStatus = "warning";
    message = criticalUnavailableCount + " critical modules temporarily unavailable.";
  } else if (criticalRecentFallbackCount > 0 || criticalUnavailableCount === 1) {
    overallStatus = "healthy-degraded";
    if (criticalRecentFallbackCount > 0) {
      message = "Serving recent cached data for " + criticalRecentFallbackCount +
        " critical module(s) while providers recover automatically.";
    } else {
      message = "One critical module temporarily unavailable; remaining core data is still available.";
    }
  } else {
    overallStatus = "healthy";
    message = criticalLiveCount === CRITICAL_MODULES.length
      ? "All critical modules live."
      : "Core modules healthy.";
  }

  const successful = Object.values(modules)
    .map((m) => m.lastSuccessfulUpdate)
    .filter(Boolean)
    .sort();
  const lastSuccessfulRefresh = successful.length ? successful[successful.length - 1] : null;

  const health = {
    version: 1,
    engine: "waypoint-live-engine",
    engineVersion: ENGINE_VERSION,
    generatedAt: ctx.runAt,
    nextScheduledUpdate: payload.nextScheduledUpdate,
    overall: {
      status: overallStatus,
      label: overallHealthLabel(overallStatus),
      message,
      lastSuccessfulRefresh,
      criticalLive: criticalLiveCount,
      criticalUsable: criticalUsableCount,
      criticalFallback: criticalRecentFallbackCount,
      criticalUnavailable: criticalUnavailableCount
    },
    publish: ctx.publishState || defaultPublishState(),
    modules,
    runtime: {
      uptimeSeconds: Math.round(process.uptime()),
      runDurationMs: Date.now() - ctx.runStarted,
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    },
    pipeline: {
      stage: {
        apiFetch: ctx.failures.length ? "partial" : "ok",
        payloadBuild: payload && payload.updatedAt ? "ok" : "failed",
        healthBuild: "ok",
        writeLiveJson: "ok",
        writeHealthJson: "ok",
        writeStatusDebug: "ok",
        publishState: ctx.publishState && ctx.publishState.lastPublishStatus ? ctx.publishState.lastPublishStatus : "unknown"
      },
      criticalModulesHealthy: criticalUsableCount,
      criticalModulesTotal: CRITICAL_MODULES.length
    },
    failures: ctx.failures.slice()
  };
  return health;
}

function makeStatusHtml(payload, health) {
  const updated = shortTime(payload.updatedAt);
  const fresh = Date.now() - Date.parse(payload.updatedAt) <= ENGINE_STALE_MS;
  const failures = health && health.failures ? health.failures : [];
  const sources = payload.meta && payload.meta.sources ? payload.meta.sources : [];
  const hits = BANNED.filter((term) => JSON.stringify(payload).toLowerCase().includes(term));
  const raw = JSON.stringify(payload, null, 2);
  const publish = (health && health.publish) || defaultPublishState();
  const publishOk = publish.lastPublishStatus === "succeeded";
  const publishRecent = publish.lastPublishAt &&
    Date.now() - Date.parse(publish.lastPublishAt) <= ENGINE_STALE_MS;
  const overall = health.overall || {};
  const overallStatus = overall.status || "unknown";
  const overallLabel = overall.label || overallHealthLabel(overallStatus);

  function overallHealthClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "healthy" || s === "healthy-degraded") return "wle-ok";
    if (s === "warning") return "wle-warn";
    return "wle-bad";
  }

  const moduleRows = Object.keys(health.modules || {}).map((name) => {
    const m = health.modules[name];
    const display = m.displayStatus || moduleDisplayStatus(m.status, m.lastSuccessfulUpdate, MODULE_DEFAULT_STALE_MS);
    const warnNote = m.lastError ? esc(m.lastError) : "—";
    return "<tr>" +
      "<td>" + esc(name) + "</td>" +
      "<td>" + esc(display) + "</td>" +
      "<td>" + esc(m.status) + "</td>" +
      "<td>" + esc(m.provider || m.source || "—") + "</td>" +
      "<td>" + esc(String(m.responseMs != null ? m.responseMs : "—") + " ms") + "</td>" +
      "<td>" + esc(String(m.retryAttempts != null ? m.retryAttempts : "—")) + "</td>" +
      "<td>" + esc(String(m.failureCount != null ? m.failureCount : "0")) + "</td>" +
      "<td>" + esc(shortTime(m.lastSuccessfulUpdate)) + "</td>" +
      "<td>" + esc(m.fallbackAge || "—") + "</td>" +
      "<td>" + esc(shortTime(m.nextScheduledRefresh || health.nextScheduledUpdate)) + "</td>" +
      "<td>" + esc(m.cacheStatus || cacheStatusLabel(m.status)) + "</td>" +
      "<td>" + esc(shortTime(m.recoveryAt)) + "</td>" +
      "<td class=\"wle-muted\">" + warnNote + "</td>" +
      "</tr>";
  }).join("");
  const refreshIntervalMins = 30;
  const moduleFailures = failures.filter((f) => f && f.module);
  const lastFailedModule = moduleFailures.length ? moduleFailures[moduleFailures.length - 1].module : "none";
  const cacheAge = payload.updatedAt ? ageLabel(payload.updatedAt) : "unknown";
  const tz = payload.timezone || "unknown";
  const pipeline = health.pipeline && health.pipeline.stage ? health.pipeline.stage : {};

  const sourceLis = sources.length
    ? sources.map((s) => "<li>" + esc(s) + "</li>").join("")
    : '<li class="wle-muted">No sources recorded</li>';
  const failureLis = failures.length
    ? failures.map((f) => {
      const retries = f.retryAttempts != null ? " · " + f.retryAttempts + " attempt(s)" : "";
      return "<li>" + esc(f.module || f.source || "source") + ": " + esc(f.error || "failed") + esc(retries) + "</li>";
    }).join("")
    : '<li class="wle-muted">No failed sources this run</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waypoint Live Engine — Status</title>
  <link rel="stylesheet" href="design-system/css/wds-dashboard-home.css">
  <link rel="stylesheet" href="css/home-dashboard.css">
  <style>
    .wle-status { max-width: 56rem; margin: 2rem auto; padding: 0 1.25rem 3rem; font-family: Inter, system-ui, sans-serif; color: #1c1917; }
    .wle-status h1 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; font-size: 2rem; margin: 0 0 0.35rem; }
    .wle-status .lead { color: #57534e; margin: 0 0 1.5rem; }
    .wle-card { border: 1px solid #e7e5e4; border-radius: 8px; padding: 1rem 1.1rem; margin: 0 0 1rem; background: #fafaf9; }
    .wle-card h2 { font-size: 0.95rem; margin: 0 0 0.65rem; letter-spacing: 0.02em; text-transform: uppercase; color: #78716c; }
    .wle-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.35rem 0; border-bottom: 1px solid #f5f5f4; font-size: 0.95rem; }
    .wle-row:last-child { border-bottom: 0; }
    .wle-ok { color: #166534; font-weight: 600; }
    .wle-warn { color: #b45309; font-weight: 600; }
    .wle-bad { color: #9f1239; font-weight: 600; }
    .wle-muted { color: #78716c; }
    .wle-list { margin: 0; padding-left: 1.1rem; }
    .wle-nav a { color: #1d4ed8; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 0.8rem; background: #f5f5f4; padding: 0.75rem; border-radius: 6px; overflow: auto; max-height: 18rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid #ece8e4; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; min-width: 0; }
    th { color: #57534e; font-weight: 600; }
    .wle-table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -0.25rem; padding: 0 0.25rem; }
    @media (max-width: 700px) {
      .wle-status { margin: 1rem auto; padding: 0 0.85rem 2rem; }
      .wle-status h1 { font-size: 1.5rem; }
      .wle-row { flex-direction: column; align-items: flex-start; gap: 0.15rem; }
      .wle-row > span:last-child { text-align: left; max-width: 100%; overflow-wrap: anywhere; }
      .wle-card { padding: 0.85rem 0.9rem; margin-bottom: 0.85rem; }
      table { font-size: 0.78rem; }
      pre { font-size: 0.72rem; max-height: 14rem; }
    }
  </style>
</head>
<body>
  <div class="wle-status">
    <p class="wle-nav"><a href="./">← Outdoor dashboard</a></p>
    <h1>Live Engine status</h1>
    <p class="lead">Operational check for <code>data/live.json</code> and <code>data/health.json</code>.</p>

    <section class="wle-card" aria-label="Engine health">
      <h2>Engine Health</h2>
      <div class="wle-row"><span>Status</span><span class="${overallHealthClass(overallStatus)}">${esc(overallLabel)}</span></div>
      <div class="wle-row"><span>Raw status key</span><span>${esc(overallStatus)}</span></div>
      <div class="wle-row"><span>Critical modules live</span><span>${esc(String(overall.criticalLive != null ? overall.criticalLive : "—"))} / ${esc(String(CRITICAL_MODULES.length))}</span></div>
      <div class="wle-row"><span>Critical modules on cache</span><span>${esc(String(overall.criticalFallback != null ? overall.criticalFallback : "0"))}</span></div>
      <div class="wle-row"><span>Critical modules unavailable</span><span>${esc(String(overall.criticalUnavailable != null ? overall.criticalUnavailable : "0"))}</span></div>
      <div class="wle-row"><span>Last engine run</span><span class="wle-ok">${esc(shortTime(publish.lastEngineRun || health.generatedAt))}</span></div>
      <div class="wle-row"><span>Last successful refresh</span><span>${esc(shortTime(health.overall.lastSuccessfulRefresh))}</span></div>
      <div class="wle-row"><span>Next scheduled run</span><span>${esc(shortTime(health.nextScheduledUpdate))}</span></div>
      <div class="wle-row"><span>Engine version</span><span>${esc(health.engineVersion)}</span></div>
      <div class="wle-row"><span>Timezone</span><span>${esc(tz)}</span></div>
      <div class="wle-row"><span>Refresh interval</span><span>${esc(String(refreshIntervalMins) + " min")}</span></div>
      <div class="wle-row"><span>Data age</span><span class="${fresh ? "wle-ok" : "wle-bad"}">${esc(ageLabel(payload.updatedAt))} · ${esc(updated)}</span></div>
      <div class="wle-row"><span>Payload freshness (&lt;3h)</span><span class="${fresh ? "wle-ok" : "wle-bad"}">${fresh ? "Yes" : "No / stale"}</span></div>
      <div class="wle-row"><span>Cache age</span><span>${esc(cacheAge)}</span></div>
      <div class="wle-row"><span>Last failed module</span><span>${esc(lastFailedModule)}</span></div>
      <p class="wle-muted">${esc(health.overall.message)}</p>
    </section>

    <section class="wle-card" aria-label="Public publish">
      <h2>Public Publish</h2>
      <div class="wle-row"><span>Last public publish</span><span class="${publishOk && publishRecent ? "wle-ok" : "wle-bad"}">${esc(shortTime(publish.lastPublishAt))}</span></div>
      <div class="wle-row"><span>Published data age</span><span>${esc(ageLabel(publish.lastPublishedDataAt))}</span></div>
      <div class="wle-row"><span>Publish commit</span><span>${esc(publish.lastPublishCommit || "—")}</span></div>
      <div class="wle-row"><span>Publish status</span><span class="${publishOk ? "wle-ok" : "wle-bad"}">${esc(publish.lastPublishStatus || "unknown")}</span></div>
      <p class="wle-muted">${esc(publish.lastPublishMessage || "No publish log message")}</p>
    </section>

    <section class="wle-card" aria-label="Module health">
      <h2>Module Health</h2>
      <p class="wle-muted">Each module reports LIVE, ESTIMATED (recent cache/derived), or TEMPORARILY UNAVAILABLE. Brief provider errors with valid cached data stay ESTIMATED and do not downgrade engine health to WARNING.</p>
      <div class="wle-table-wrap">
      <table>
        <thead><tr>
          <th>Module</th><th>Health</th><th>Raw</th><th>Provider</th><th>Latency</th>
          <th>Retries</th><th>Failures</th><th>Last OK</th><th>Cache age</th>
          <th>Next refresh</th><th>Cache</th><th>Recovered</th><th>Last error</th>
        </tr></thead>
        <tbody>${moduleRows}</tbody>
      </table>
      </div>
    </section>

    <section class="wle-card" aria-label="Pipeline trace">
      <h2>Refresh Pipeline Trace</h2>
      <div class="wle-row"><span>API fetch stage</span><span>${esc(pipeline.apiFetch || "unknown")}</span></div>
      <div class="wle-row"><span>Payload generation</span><span>${esc(pipeline.payloadBuild || "unknown")}</span></div>
      <div class="wle-row"><span>Health generation</span><span>${esc(pipeline.healthBuild || "unknown")}</span></div>
      <div class="wle-row"><span>live.json write</span><span>${esc(pipeline.writeLiveJson || "unknown")}</span></div>
      <div class="wle-row"><span>health.json write</span><span>${esc(pipeline.writeHealthJson || "unknown")}</span></div>
      <div class="wle-row"><span>status/debug write</span><span>${esc(pipeline.writeStatusDebug || "unknown")}</span></div>
      <div class="wle-row"><span>Publish stage</span><span>${esc(pipeline.publishState || "unknown")}</span></div>
    </section>

    <section class="wle-card" aria-label="Live file">
      <h2>Live file</h2>
      <div class="wle-row"><span>Engine publish location</span><span class="wle-muted">${esc(payload.location && payload.location.label || "—")}</span></div>
      <div class="wle-row"><span>Your location</span><span class="wle-ok" id="wle-user-location">Detecting…</span></div>
      <div class="wle-row"><span>Loaded</span><span class="wle-ok">Yes</span></div>
    </section>

    <section class="wle-card" aria-label="Sources">
      <h2>Data sources used</h2>
      <ul class="wle-list">${sourceLis}</ul>
    </section>

    <section class="wle-card" aria-label="Failures">
      <h2>Failures</h2>
      <ul class="wle-list">${failureLis}</ul>
    </section>

    <section class="wle-card" aria-label="Runtime">
      <h2>Runtime Stats</h2>
      <div class="wle-row"><span>Run duration</span><span>${esc(String(health.runtime.runDurationMs) + " ms")}</span></div>
      <div class="wle-row"><span>Process uptime</span><span>${esc(String(health.runtime.uptimeSeconds) + " s")}</span></div>
      <div class="wle-row"><span>Memory RSS</span><span>${esc(String(health.runtime.memory.rss))}</span></div>
      <div class="wle-row"><span>Node</span><span>${esc(health.runtime.nodeVersion)}</span></div>
    </section>

    <section class="wle-card" aria-label="Integrity">
      <h2>Integrity checks</h2>
      <div class="wle-row"><span>Banned text</span><span class="${hits.length ? "wle-bad" : "wle-ok"}">${hits.length ? "FOUND: " + esc(hits.join(", ")) : "Clear"}</span></div>
      <p class="wle-muted">Checked for: ${esc(BANNED.join(", "))}</p>
    </section>

    <section class="wle-card" aria-label="Raw live payload">
      <h2>Raw live payload</h2>
      <pre>${esc(raw)}</pre>
    </section>
    <div id="wds-location-debug-mount"></div>
  </div>
  <script src="design-system/js/wds-us-states.js" defer></script>
  <script src="design-system/js/wds-geocode-service.js" defer></script>
  <script src="design-system/js/wds-ip-geolocation.js" defer></script>
  <script src="design-system/js/dashboard/wds-us-national-context.js" defer></script>
  <script src="design-system/js/wds-location.js" defer></script>
  <script src="design-system/js/wds-location-debug.js" defer></script>
  <script src="js/status-location.js" defer></script>
</body>
</html>`;
}

function makeDebugSeed(payload, health, commitHash, buildTime) {
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
    engineHealth: health.overall.label || health.overall.status,
    moduleHealth: Object.fromEntries(Object.entries(health.modules).map(([k, v]) => [k, { status: v.status, stale: v.stale }])),
    ebirdStatus: health.modules && health.modules.ebird ? health.modules.ebird.status : "unavailable",
    ebirdObservations: payload.modules && payload.modules.ebird && payload.modules.ebird.data && Array.isArray(payload.modules.ebird.data.observations)
      ? payload.modules.ebird.data.observations.length
      : 0,
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
    "Engine health: " + (seed.engineHealth || "unknown"),
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
  function lines(list) { if (!list || !list.length) return ["(none)"]; return list.map(function (item) { return "- " + item; }); }
  function readSnapshot() {
    if (window.opener && window.opener.__WAYPOINT_DEBUG__) return window.opener.__WAYPOINT_DEBUG__;
    if (window.__WAYPOINT_DEBUG__) return window.__WAYPOINT_DEBUG__;
    try { var raw = localStorage.getItem(DEBUG_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
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
    if (snapshot && snapshot.bannedTextHits && snapshot.bannedTextHits.length) out.push("   - matched banned terms: " + snapshot.bannedTextHits.join(", "));
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
      setTimeout(function () { if (status.textContent === "Copied.") status.textContent = ""; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(markCopied).catch(function () {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "readonly"); ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); markCopied(); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
      });
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "readonly"); ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); markCopied(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }
  document.getElementById("debug-output").textContent = buildReport(readSnapshot() || ${JSON.stringify(seed)});
  var copyBtn = document.getElementById("copy-report");
  if (copyBtn) copyBtn.addEventListener("click", copyReport);
})();
</script>
</body>
</html>`;
}

function writeRenderedPages(payload, health) {
  const commitHash = gitCommit();
  const buildTime = new Date().toISOString();
  fs.writeFileSync(STATUS_PATH, makeStatusHtml(payload, health), "utf8");
  fs.writeFileSync(DEBUG_PATH, makeDebugHtml(makeDebugSeed(payload, health, commitHash, buildTime)), "utf8");
}

async function main() {
  const runStarted = Date.now();
  const runAt = new Date().toISOString();
  const location = resolveLocation();
  const previousLive = readJson(LIVE_PATH);
  const previousHealth = readJson(HEALTH_PATH);
  const publishState = readPublishState();
  publishState.lastEngineRun = runAt;
  const ctx = {
    runStarted,
    runAt,
    location,
    previousLive,
    previousHealth,
    publishState,
    moduleResults: {},
    moduleHealth: {},
    failures: []
  };

  const modules = buildPlugins();
  for (const module of modules) {
    const result = await runPlugin(module, ctx);
    ctx.moduleHealth[module.name] = applyStale(result, module.staleMs || MODULE_DEFAULT_STALE_MS);
  }

  const payload = buildLivePayload(ctx, modules);
  const health = buildHealth(ctx, modules, payload);

  publishState.dataUpdatedAt = payload.updatedAt;
  publishState.nextScheduledRun = payload.nextScheduledUpdate;
  ctx.publishState = publishState;
  health.publish = publishState;

  writeJsonAtomic(LIVE_PATH, payload);
  writeJsonAtomic(HEALTH_PATH, health);
  writePublishState(publishState);
  writeRenderedPages(payload, health);

  console.log("Waypoint Live Engine wrote", LIVE_PATH, "and", HEALTH_PATH);
  console.log("engine ran:", runAt);
  console.log("files changed: data/live.json, data/health.json, data/publish-state.json, status.html, debug.html");
  console.log("updatedAt:", payload.updatedAt);
  console.log("location:", payload.location.label);
  console.log("engineVersion:", ENGINE_VERSION);
  console.log("overallHealth:", health.overall.label || health.overall.status);
  if (ctx.failures.length) {
    console.log("failures:", ctx.failures.map((f) => (f.module || "module") + ": " + f.error).join("; "));
  }
  if (!payload.current && !previousLive) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error("waypoint-live-engine failed:", err && err.message ? err.message : err);
  process.exit(1);
});
