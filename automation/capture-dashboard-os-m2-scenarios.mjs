#!/usr/bin/env node
/**
 * Dashboard OS Milestone 2 — Waypoint Intelligence scenario harness.
 * Feeds fixture payloads through interpret + compose; writes review artifacts.
 *
 * Run: node automation/capture-dashboard-os-m2-scenarios.mjs
 * Out:  docs/dashboard-os-m2-review/scenarios.json
 *       docs/dashboard-os-m2-review/SCENARIOS.md
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/dashboard-os-m2-review");

const DAY = "2026-07-22T14:00:00.000-04:00";
const NIGHT = "2026-07-22T22:30:00.000-04:00";

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

function hoursFrom(baseIso, offsetH, patch) {
  const t = new Date(new Date(baseIso).getTime() + offsetH * 3600000);
  return Object.assign(
    {
      time: t.toISOString(),
      temperature: 68,
      precipitation: { probability: 10 },
      wind: { speed: 6 },
      cloudCover: 40,
      uvIndex: 5
    },
    patch || {}
  );
}

function basePlatform(overrides) {
  const o = overrides || {};
  const wx = o.weather || {};
  const current = Object.assign(
    {
      temperature: 68,
      feelsLike: 66,
      humidity: 55,
      cloudCover: 30,
      uvIndex: 5,
      wind: { speed: 6 },
      visibility: 10,
      conditions: { summary: "Partly cloudy" },
      precipitation: { probability: 15 }
    },
    wx.current || {}
  );
  const hourly =
    wx.hourly ||
    [
      hoursFrom(DAY, 1, { temperature: 70, cloudCover: 25, uvIndex: 6 }),
      hoursFrom(DAY, 4, { temperature: 74, cloudCover: 20, uvIndex: 7 }),
      hoursFrom(DAY, 7, { temperature: 68, cloudCover: 35, uvIndex: 2, precipitation: { probability: 20 } })
    ];
  return {
    meta: Object.assign(
      {
        hydratedAt: DAY,
        blockStatus: { weather: "live", airQuality: "live", alerts: "live", usgsWater: "live" },
        fromCache: false,
        connectivity: "online"
      },
      o.meta || {}
    ),
    weatherRef: {
      meta: { isPlaceholder: false },
      current,
      hourly,
      daily: [{ uvIndex: current.uvIndex || 5, precipitation: { probability: current.precipitation?.probability || 15 } }]
    },
    daylight: Object.assign(
      {
        sunriseFormatted: "5:52 AM",
        sunsetFormatted: "8:21 PM",
        goldenHour: "7:40–8:05 PM"
      },
      o.daylight || {}
    ),
    moon: Object.assign({ phaseLabel: "Waxing gibbous", illumination: 72 }, o.moon || {}),
    airQuality: Object.assign({ status: "live", usAqi: 42, category: "Good" }, o.airQuality || {}),
    alerts: Object.assign({ status: "live", items: [] }, o.alerts || {}),
    water: Object.assign(
      {
        status: "live",
        sites: [
          {
            name: "Delaware River at Milford",
            gageHeight: 4.2,
            streamflow: 1200,
            trend: "Stable",
            distanceMi: 3.1,
            observedAt: DAY
          }
        ]
      },
      o.water || {}
    ),
    rainfall: o.rainfall || { recent: { amount: 0.2, unit: "in", periodDays: 7 } }
  };
}

const location = {
  city: "Milford",
  county: "Pike County",
  stateCode: "PA",
  lat: 41.32,
  lng: -74.8,
  source: "browser",
  displayTitle: "Milford, PA"
};

/** ≥25 environmental scenarios for M2 closeout owner review */
const SCENARIOS = [
  {
    id: "sunny-calm",
    title: "Sunny, calm, mild",
    covers: ["calm ordinary day", "sunny"],
    flags: { now: DAY },
    photo: { live: true, level: "good", summary: "Bright clear light", status: "good" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 72,
            feelsLike: 72,
            humidity: 45,
            cloudCover: 10,
            uvIndex: 7,
            wind: { speed: 5 },
            conditions: { summary: "Sunny" },
            precipitation: { probability: 5 }
          }
        }
      })
  },
  {
    id: "overcast-mild",
    title: "Soft overcast, mild",
    covers: ["overcast"],
    flags: { now: DAY },
    photo: { live: true, level: "excellent", summary: "Diffuse overcast light", status: "excellent" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 64,
            feelsLike: 64,
            humidity: 70,
            cloudCover: 92,
            uvIndex: 3,
            wind: { speed: 4 },
            conditions: { summary: "Overcast" },
            precipitation: { probability: 20 }
          }
        }
      })
  },
  {
    id: "rain-now",
    title: "Light rain",
    covers: ["light rain", "rain"],
    flags: { now: DAY },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 58,
            feelsLike: 56,
            humidity: 88,
            cloudCover: 100,
            uvIndex: 1,
            wind: { speed: 10 },
            conditions: { summary: "Light rain" },
            precipitation: { probability: 80 }
          },
          hourly: [
            hoursFrom(DAY, 1, { precipitation: { probability: 75 }, cloudCover: 100, temperature: 57 }),
            hoursFrom(DAY, 4, { precipitation: { probability: 40 }, cloudCover: 85, temperature: 60 })
          ]
        }
      })
  },
  {
    id: "rain-later",
    title: "Dry now, rain later",
    covers: ["rain"],
    flags: { now: DAY },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 70,
            feelsLike: 70,
            humidity: 55,
            cloudCover: 45,
            uvIndex: 5,
            wind: { speed: 8 },
            conditions: { summary: "Partly cloudy" },
            precipitation: { probability: 20 }
          },
          hourly: [
            hoursFrom(DAY, 1, { precipitation: { probability: 15 }, cloudCover: 40 }),
            hoursFrom(DAY, 3, { precipitation: { probability: 55 }, cloudCover: 80, temperature: 68 }),
            hoursFrom(DAY, 5, { precipitation: { probability: 70 }, cloudCover: 95 })
          ]
        }
      })
  },
  {
    id: "thunderstorms",
    title: "Thunderstorms",
    covers: ["thunderstorm risk", "storms"],
    flags: { now: DAY, storm: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 78,
            feelsLike: 82,
            humidity: 75,
            cloudCover: 90,
            uvIndex: 4,
            wind: { speed: 18 },
            conditions: { summary: "Thunderstorm" },
            precipitation: { probability: 70 }
          }
        },
        alerts: {
          status: "live",
          items: [
            {
              event: "Severe Thunderstorm Warning",
              headline: "Severe thunderstorms until 6 PM",
              severity: "Severe",
              effective: DAY,
              expires: "2026-07-22T18:00:00.000-04:00"
            }
          ]
        }
      })
  },
  {
    id: "snow-ice",
    title: "Snow / icy surfaces",
    covers: ["snow"],
    flags: { now: DAY, snow: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 28,
            feelsLike: 22,
            humidity: 70,
            cloudCover: 95,
            uvIndex: 1,
            wind: { speed: 12 },
            conditions: { summary: "Snow" },
            precipitation: { probability: 70 }
          }
        }
      })
  },
  {
    id: "fog",
    title: "Dense fog",
    covers: ["fog likely", "fog"],
    flags: { now: DAY, fog: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 52,
            feelsLike: 52,
            humidity: 98,
            cloudCover: 100,
            uvIndex: 1,
            wind: { speed: 2 },
            visibility: 0.4,
            conditions: { summary: "Fog" },
            precipitation: { probability: 10 }
          }
        }
      })
  },
  {
    id: "wildfire-smoke",
    title: "Wildfire smoke",
    covers: ["wildfire smoke", "poor AQI"],
    flags: { now: DAY, wildfireSmoke: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 76,
            feelsLike: 76,
            humidity: 35,
            cloudCover: 40,
            uvIndex: 6,
            wind: { speed: 8 },
            visibility: 3,
            conditions: { summary: "Haze" },
            precipitation: { probability: 5 }
          }
        },
        airQuality: { status: "live", usAqi: 168, category: "Unhealthy", pm25: 95 }
      })
  },
  {
    id: "poor-aqi",
    title: "Poor AQI (no smoke label)",
    covers: ["poor AQI"],
    flags: { now: DAY },
    platform: () =>
      basePlatform({
        airQuality: { status: "live", usAqi: 155, category: "Unhealthy" }
      })
  },
  {
    id: "elevated-aqi",
    title: "Elevated AQI (sensitive)",
    covers: ["poor AQI"],
    flags: { now: DAY },
    platform: () =>
      basePlatform({
        airQuality: { status: "live", usAqi: 112, category: "Unhealthy for Sensitive Groups" }
      })
  },
  {
    id: "flood-watch",
    title: "Flood Watch",
    covers: ["Flood Watch", "flood watch"],
    flags: { now: DAY, floodWatch: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 66,
            feelsLike: 66,
            humidity: 70,
            cloudCover: 55,
            uvIndex: 4,
            wind: { speed: 7 },
            conditions: { summary: "Mostly cloudy" },
            precipitation: { probability: 40 }
          }
        },
        alerts: {
          status: "live",
          items: [
            {
              event: "Flood Watch",
              headline: "Flood Watch for low-lying areas",
              severity: "Moderate",
              effective: DAY
            }
          ]
        },
        water: {
          status: "live",
          sites: [
            {
              name: "Shohola Creek",
              gageHeight: 6.8,
              streamflow: 2400,
              trend: "Rising rapidly",
              distanceMi: 2.2,
              observedAt: DAY
            }
          ]
        }
      })
  },
  {
    id: "drought",
    title: "Drought / low water",
    covers: ["low-water or drought conditions", "drought"],
    flags: { now: DAY, drought: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 84,
            feelsLike: 86,
            humidity: 30,
            cloudCover: 15,
            uvIndex: 8,
            wind: { speed: 9 },
            conditions: { summary: "Sunny" },
            precipitation: { probability: 0 }
          }
        },
        water: {
          status: "live",
          sites: [
            {
              name: "Delaware River at Milford",
              gageHeight: 2.1,
              streamflow: 280,
              trend: "Below normal / drought",
              distanceMi: 3.1,
              observedAt: DAY
            }
          ]
        },
        rainfall: { recent: { amount: 0.02, unit: "in", periodDays: 14 } }
      })
  },
  {
    id: "excellent-photography",
    title: "Excellent photography light",
    covers: ["excellent photography conditions", "exceptional photography morning", "excellent photography"],
    flags: { now: DAY, excellentPhotography: true },
    photo: { live: true, level: "excellent", summary: "Soft directional light, gentle cloud", status: "excellent" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 62,
            feelsLike: 62,
            humidity: 60,
            cloudCover: 55,
            uvIndex: 4,
            wind: { speed: 5 },
            conditions: { summary: "Partly cloudy" },
            precipitation: { probability: 10 }
          }
        }
      })
  },
  {
    id: "poor-photography",
    title: "Poor photography / hard light",
    covers: ["poor photography"],
    flags: { now: DAY, poorPhotography: true },
    photo: { live: true, level: "poor", summary: "Harsh midday contrast", status: "poor" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 88,
            feelsLike: 90,
            humidity: 40,
            cloudCover: 5,
            uvIndex: 9,
            wind: { speed: 4 },
            conditions: { summary: "Clear" },
            precipitation: { probability: 0 }
          }
        }
      })
  },
  {
    id: "high-uncertainty",
    title: "Stale provider data",
    covers: ["stale provider data", "high uncertainty"],
    flags: { now: DAY, lowForecastConfidence: true },
    platform: () =>
      basePlatform({
        meta: {
          hydratedAt: "2026-07-22T08:00:00.000-04:00",
          fromCache: true,
          connectivity: "online",
          blockStatus: { weather: "cached", airQuality: "unavailable", alerts: "cached", usgsWater: "unavailable" }
        },
        airQuality: { status: "unavailable" },
        water: { status: "unavailable", sites: [] }
      })
  },
  {
    id: "conflicting-providers",
    title: "Conflicting providers (material)",
    covers: ["conflicting providers"],
    flags: { now: DAY, providerConflict: true, lowForecastConfidence: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 70,
            feelsLike: 70,
            humidity: 60,
            cloudCover: 50,
            uvIndex: 5,
            wind: { speed: 10 },
            conditions: { summary: "Rain" },
            precipitation: { probability: 15 }
          },
          hourly: [
            hoursFrom(DAY, 1, { precipitation: { probability: 10 }, cloudCover: 30 }),
            hoursFrom(DAY, 3, { precipitation: { probability: 10 }, cloudCover: 25 })
          ]
        },
        meta: {
          hydratedAt: DAY,
          fromCache: false,
          connectivity: "online",
          blockStatus: { weather: "live", airQuality: "live", alerts: "live", usgsWater: "live" },
          moduleSources: { weather: "Open-Meteo", weatherAlt: "NWS grid disagrees on POP" }
        }
      })
  },
  {
    id: "heat-wave",
    title: "Meaningful heat limitation",
    covers: ["meaningful heat limitation", "heat"],
    flags: { now: DAY },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 96,
            feelsLike: 102,
            humidity: 55,
            cloudCover: 20,
            uvIndex: 10,
            wind: { speed: 6 },
            conditions: { summary: "Hot and sunny" },
            precipitation: { probability: 5 }
          },
          hourly: [
            hoursFrom(DAY, 1, { temperature: 98, uvIndex: 10 }),
            hoursFrom(DAY, 4, { temperature: 100, uvIndex: 9 }),
            hoursFrom(DAY, 8, { temperature: 88, uvIndex: 2 })
          ]
        }
      })
  },
  {
    id: "high-wind",
    title: "High wind",
    covers: ["strong wind", "wind"],
    flags: { now: DAY },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 60,
            feelsLike: 54,
            humidity: 40,
            cloudCover: 50,
            uvIndex: 4,
            wind: { speed: 28, gust: 40 },
            conditions: { summary: "Windy" },
            precipitation: { probability: 10 }
          }
        }
      })
  },
  {
    id: "conflict-air-light",
    title: "Conflict: good light + poor air",
    covers: ["safety constraint overriding an attractive opportunity", "conflicted", "poor AQI", "excellent photography"],
    flags: { now: DAY, excellentPhotography: true },
    photo: { live: true, level: "excellent", summary: "Golden directional light", status: "excellent" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 70,
            feelsLike: 70,
            humidity: 45,
            cloudCover: 25,
            uvIndex: 5,
            wind: { speed: 5 },
            conditions: { summary: "Mostly clear" },
            precipitation: { probability: 5 }
          }
        },
        airQuality: { status: "live", usAqi: 140, category: "Unhealthy for Sensitive Groups" }
      })
  },
  {
    id: "conflict-sky-water",
    title: "Conflict: clear sky + rising water",
    covers: ["conflicted", "flood watch"],
    flags: { now: DAY },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 68,
            feelsLike: 68,
            humidity: 50,
            cloudCover: 15,
            uvIndex: 6,
            wind: { speed: 5 },
            conditions: { summary: "Clear" },
            precipitation: { probability: 5 }
          }
        },
        water: {
          status: "live",
          sites: [
            {
              name: "Bush Kill",
              gageHeight: 5.9,
              streamflow: 1800,
              trend: "Rising",
              distanceMi: 1.5,
              observedAt: DAY
            }
          ]
        }
      })
  },
  {
    id: "night-clear",
    title: "Clear night",
    covers: ["nighttime briefing", "night"],
    flags: { now: NIGHT },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 55,
            feelsLike: 53,
            humidity: 60,
            cloudCover: 10,
            uvIndex: 0,
            wind: { speed: 4 },
            conditions: { summary: "Clear" },
            precipitation: { probability: 0 }
          }
        },
        moon: { phaseLabel: "Full moon", illumination: 98 }
      })
  },
  {
    id: "oppressive-humidity",
    title: "Oppressive humidity / dew point",
    covers: ["humidity", "dew-point derived"],
    flags: { now: DAY },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 86,
            feelsLike: 94,
            humidity: 88,
            cloudCover: 60,
            uvIndex: 7,
            wind: { speed: 5 },
            conditions: { summary: "Mostly cloudy" },
            precipitation: { probability: 30 }
          }
        }
      })
  },
  {
    id: "warm-safe-afternoon",
    title: "Warm but safe afternoon",
    covers: ["warm but safe afternoon"],
    flags: { now: DAY },
    photo: { live: true, level: "fair", summary: "Ordinary light", status: "fair" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 78,
            feelsLike: 78,
            humidity: 45,
            cloudCover: 25,
            uvIndex: 5,
            wind: { speed: 6 },
            conditions: { summary: "Mostly sunny" },
            precipitation: { probability: 5 }
          }
        }
      })
  },
  {
    id: "high-uv-mild",
    title: "High UV without excessive heat",
    covers: ["high UV without excessive heat"],
    flags: { now: DAY },
    photo: { live: true, level: "fair", summary: "Bright", status: "fair" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 70,
            feelsLike: 70,
            humidity: 40,
            cloudCover: 10,
            uvIndex: 9,
            wind: { speed: 5 },
            conditions: { summary: "Sunny" },
            precipitation: { probability: 0 }
          },
          hourly: [
            hoursFrom(DAY, 1, { temperature: 72, uvIndex: 9 }),
            hoursFrom(DAY, 4, { temperature: 74, uvIndex: 8 })
          ]
        }
      })
  },
  {
    id: "fog-uncertain",
    title: "Fog uncertain",
    covers: ["fog uncertain"],
    flags: { now: DAY, fogUncertain: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 54,
            feelsLike: 54,
            humidity: 96,
            cloudCover: 80,
            uvIndex: 2,
            wind: { speed: 2 },
            visibility: 4,
            conditions: { summary: "Cloudy" },
            precipitation: { probability: 10 }
          }
        }
      })
  },
  {
    id: "heavy-rain",
    title: "Heavy rain",
    covers: ["heavy rain"],
    flags: { now: DAY, heavyRain: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 60,
            feelsLike: 58,
            humidity: 95,
            cloudCover: 100,
            uvIndex: 1,
            wind: { speed: 14 },
            conditions: { summary: "Heavy rain" },
            precipitation: { probability: 95, amount: 0.45 }
          }
        }
      })
  },
  {
    id: "flood-warning",
    title: "Flood Warning / active flooding",
    covers: ["active flooding or Flood Warning"],
    flags: { now: DAY, floodWarning: true, activeFlooding: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 64,
            feelsLike: 64,
            humidity: 80,
            cloudCover: 90,
            uvIndex: 2,
            wind: { speed: 10 },
            conditions: { summary: "Rain" },
            precipitation: { probability: 70 }
          }
        },
        alerts: {
          status: "live",
          items: [
            {
              event: "Flood Warning",
              headline: "Flooding ongoing along low-lying streams",
              severity: "Severe",
              effective: DAY
            }
          ]
        },
        water: {
          status: "live",
          sites: [
            {
              name: "Shohola Creek",
              gageHeight: 9.2,
              streamflow: 5200,
              trend: "Above flood stage",
              distanceMi: 1.8,
              observedAt: DAY
            }
          ]
        }
      })
  },
  {
    id: "partial-provider-failure",
    title: "Partial provider failure",
    covers: ["partial provider failure"],
    flags: { now: DAY, partialProviderFailure: true },
    platform: () =>
      basePlatform({
        meta: {
          hydratedAt: DAY,
          fromCache: false,
          connectivity: "online",
          blockStatus: { weather: "live", airQuality: "unavailable", alerts: "live", usgsWater: "unavailable" }
        },
        airQuality: { status: "unavailable" },
        water: { status: "unavailable", sites: [] }
      })
  },
  {
    id: "no-superior-opportunity",
    title: "No clearly superior outdoor opportunity",
    covers: ["no clearly superior outdoor opportunity"],
    flags: { now: DAY, poorPhotography: true },
    photo: { live: true, level: "poor", summary: "Flat gray light", status: "poor" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 61,
            feelsLike: 61,
            humidity: 55,
            cloudCover: 70,
            uvIndex: 3,
            wind: { speed: 8 },
            conditions: { summary: "Cloudy" },
            precipitation: { probability: 20 }
          }
        }
      })
  },
  {
    id: "excellent-walking",
    title: "Excellent general walking conditions",
    covers: ["excellent general walking conditions"],
    flags: { now: DAY },
    photo: { live: true, level: "fair", summary: "Ordinary", status: "fair" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 66,
            feelsLike: 66,
            humidity: 48,
            cloudCover: 35,
            uvIndex: 4,
            wind: { speed: 5 },
            conditions: { summary: "Partly cloudy" },
            precipitation: { probability: 5 }
          }
        }
      })
  },
  {
    id: "safety-overrides-photo",
    title: "Safety overrides attractive photo opportunity",
    covers: ["safety constraint overriding an attractive opportunity"],
    flags: { now: DAY, excellentPhotography: true, storm: true },
    photo: { live: true, level: "excellent", summary: "Dramatic storm light", status: "excellent" },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 72,
            feelsLike: 72,
            humidity: 65,
            cloudCover: 80,
            uvIndex: 3,
            wind: { speed: 22 },
            conditions: { summary: "Thunderstorm" },
            precipitation: { probability: 60 }
          }
        },
        alerts: {
          status: "live",
          items: [
            {
              event: "Severe Thunderstorm Warning",
              headline: "Damaging winds and lightning",
              severity: "Severe",
              effective: DAY
            }
          ]
        }
      })
  },
  {
    id: "minor-provider-diff",
    title: "Minor provider differences",
    covers: ["minor provider differences"],
    flags: { now: DAY, minorProviderDifference: true },
    platform: () =>
      basePlatform({
        weather: {
          current: {
            temperature: 71,
            feelsLike: 71,
            humidity: 50,
            cloudCover: 30,
            uvIndex: 5,
            wind: { speed: 6 },
            conditions: { summary: "Partly cloudy" },
            precipitation: { probability: 15 }
          }
        }
      })
  }
];

function makeSandbox() {
  const sandbox = {
    window: {},
    globalThis: {},
    console,
    localStorage: {
      _data: {},
      getItem(k) {
        return this._data[k] || null;
      },
      setItem(k, v) {
        this._data[k] = String(v);
      },
      removeItem(k) {
        delete this._data[k];
      }
    },
    navigator: { onLine: true },
    Date
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.WDS = {
    outdoorWeatherIntel: {
      hikingComfort() {
        return { level: "good", summary: "Good hiking conditions", detail: "" };
      },
      photographyConditions() {
        return { level: "fair", summary: "Variable light", detail: "" };
      }
    },
    photographyConditions: {
      fromPlatform(platform) {
        // Per-scenario override via platform._photoStub
        if (platform && platform._photoStub) return platform._photoStub;
        return {
          status: "fair",
          score: 2,
          summary: "No standout light call",
          detail: "",
          level: "fair"
        };
      }
    },
    integrations: {
      get(id) {
        return { provider: id, status: "live" };
      }
    },
    dashboardReliability: {
      classifyPackageTrust(platform) {
        if (platform && platform.meta && platform.meta.fromCache) return "cached";
        if (platform && platform.meta && /unavailable/.test(JSON.stringify(platform.meta.blockStatus || {}))) {
          return "partial";
        }
        return "live";
      }
    },
    usNational: { seasonLabel: () => "summer" }
  };
  return sandbox;
}

const sandbox = makeSandbox();
[
  "design-system/js/dashboard/v2/wds-dashboard-v2-model.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-prefs.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-briefing.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-activity.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-timeline.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-observe.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-trust.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2.js",
  "design-system/js/dashboard/os/wds-dashboard-os-interpret.js",
  "design-system/js/dashboard/os/wds-dashboard-os-compose.js"
].forEach((f) => load(f, sandbox));

const Interpret = sandbox.WDS.dashboardOSInterpret;
const Compose = sandbox.WDS.dashboardOSCompose;
const results = [];

for (const sc of SCENARIOS) {
  const platform = sc.platform();
  if (sc.photo) {
    platform._photoStub = {
      status: sc.photo.status || sc.photo.level,
      score: sc.photo.level === "excellent" ? 5 : sc.photo.level === "poor" ? 1 : 3,
      summary: sc.photo.summary,
      detail: "",
      level: sc.photo.level
    };
  }
  const payload = sandbox.WDS.dashboardV2.buildPayload({
    platform,
    location,
    bundle: null
  });
  payload.flags = sc.flags || {};
  const view = Compose.compose(payload);
  const intel = view.intelligence || Interpret.synthesize({
    model: payload.model,
    briefing: payload.briefing,
    activities: payload.activities,
    windows: payload.windows,
    flags: sc.flags || {}
  });

  const why = (intel.traces || [])
    .map((t) => `${t.rule}: ${t.note || ""}`)
    .filter(Boolean)
    .slice(0, 12);
  const inputs = (intel.signals || []).slice(0, 5).map((s) => ({
    id: s.id,
    kind: s.kind,
    weight: s.weight,
    inputs: s.inputs
  }));

  results.push({
    id: sc.id,
    title: sc.title,
    covers: sc.covers,
    happening: view.happening,
    matters: view.matters,
    do: view.do,
    constraints: view.constraints,
    uncertainty: intel.uncertainty,
    dewPointF: intel.dewPointF,
    rulesApplied: intel.rulesApplied,
    whyEngineProducedIt: why,
    influencingInputs: inputs,
    wordCounts: intel.meta && intel.meta.meta ? intel.meta.meta.wordCounts : intel.meta && intel.meta.wordCounts,
    atmosphere: view.atmosphere,
    placeTime: view.placeTime
  });
}

fs.mkdirSync(OUT, { recursive: true });
const jsonPath = path.join(OUT, "scenarios.json");
fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      scenarioCount: results.length,
      rules: Interpret.RULES,
      scenarios: results
    },
    null,
    2
  )
);

function mdEscape(s) {
  return String(s || "").replace(/\|/g, "\\|");
}

let md = `# Dashboard OS M2 — Scenario Briefings\n\n`;
md += `Generated by \`automation/capture-dashboard-os-m2-scenarios.mjs\`.\n`;
md += `**Count:** ${results.length} scenarios.\n\n`;
md += `| # | Scenario | Happening | What matters | Do this |\n`;
md += `|---|----------|-----------|--------------|----------|\n`;
results.forEach((r, i) => {
  const hap = mdEscape(`${r.happening.headline} — ${r.happening.support}`);
  const mat = mdEscape((r.matters || []).map((m) => m.text).join("; "));
  const doit = mdEscape([r.do.primary, r.do.alternate].filter(Boolean).join(" / "));
  md += `| ${i + 1} | ${r.id} | ${hap} | ${mat} | ${doit} |\n`;
});
md += `\n---\n\n`;
results.forEach((r, i) => {
  md += `## ${i + 1}. ${r.title} (\`${r.id}\`)\n\n`;
  md += `**Covers:** ${r.covers.join(", ")}\n\n`;
  md += `- **Happening:** ${r.happening.headline} / ${r.happening.support}\n`;
  md += `- **What matters:**\n`;
  (r.matters || []).forEach((m) => {
    md += `  ${m.rank}. ${m.text}\n`;
  });
  md += `- **Do this:** ${r.do.primary}\n`;
  if (r.do.alternate) md += `- **Alternate:** ${r.do.alternate}\n`;
  if (r.constraints) md += `- **Constraints:** ${r.constraints.text}\n`;
  md += `- **Why:** ${r.whyEngineProducedIt.join("; ")}\n`;
  md += `- **Inputs:** ${r.influencingInputs.map((s) => `${s.id}(w=${s.weight})`).join(", ")}\n`;
  md += `- **Uncertainty:** ${r.uncertainty && r.uncertainty.level} (${(r.uncertainty && r.uncertainty.reasons || []).join(", ")})\n\n`;
});

fs.writeFileSync(path.join(OUT, "SCENARIOS.md"), md);
console.log(`Wrote ${results.length} scenarios → ${jsonPath}`);
console.log(`Markdown table → ${path.join(OUT, "SCENARIOS.md")}`);
results.forEach((r) => {
  console.log(
    `\n[${r.id}] ${r.happening.headline}\n  → ${r.matters.map((m) => m.text).join(" | ")}\n  → ${r.do.primary}`
  );
});
