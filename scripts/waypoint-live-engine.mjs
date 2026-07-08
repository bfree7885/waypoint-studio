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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = process.env.WAYPOINT_LIVE_OUT || path.join(ROOT, "data", "live.json");
const INDEX_PATH = path.join(ROOT, "design-system", "content-engine", "regions-index.json");
const TIMEOUT_MS = 12000;

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
