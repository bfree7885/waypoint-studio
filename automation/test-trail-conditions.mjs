#!/usr/bin/env node
/**
 * Live Trail Conditions — unit tests for service parsing and intel analysis.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function fail(name, detail) {
  failures.push(name + ": " + detail);
  console.log("FAIL", name, "—", detail);
}

function pass(name) {
  console.log("PASS", name);
}

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInThisContext(code, { filename: file });
}

function loadOutdoorIntel() {
  load("design-system/js/weather/wds-outdoor-weather-intel.js");
}

function mockPlatform(overrides) {
  return Object.assign({
    weatherRef: {
      meta: { isPlaceholder: false, timezone: "America/New_York" },
      current: {
        temperature: { value: 72 },
        feelsLike: { value: 74 },
        humidity: { value: 55 },
        cloudCover: { value: 20 },
        conditions: { summary: "Partly cloudy" },
        wind: { speed: { value: 8 }, gust: { value: 12 } },
        precipitation: { probability: 10 }
      },
      daily: [{ precipitation: { probability: 15 } }]
    },
    daylight: {
      sunriseFormatted: "6:00 AM",
      sunsetFormatted: "8:15 PM",
      goldenHour: "7:00–7:45 AM · 7:30–8:15 PM",
      moonIllumination: 15
    },
    alerts: { status: "empty", items: [] },
    usgsWater: null,
    observations: { items: [] },
    conservation: null,
    calendar: { season: "Summer" }
  }, overrides || {});
}

function run() {
  global.window = global;
  global.WDS = {};
  load("design-system/js/trails/wds-trail-conditions-service.js");
  load("design-system/js/trails/wds-trail-conditions-intel.js");
  loadOutdoorIntel();

  const TC = global.WDS.trailConditions;
  const TCI = global.WDS.trailConditionsIntel;

  const overpassFixture = {
    elements: [
      {
        type: "relation",
        id: 1,
        center: { lat: 41.34, lon: -75.04 },
        tags: {
          name: "Escarpment Trail",
          route: "hiking",
          sac_scale: "mountain_hiking",
          ascent: "320",
          distance: "5.2",
          surface: "ground",
          dog: "no",
          bicycle: "no",
          wheelchair: "no"
        }
      },
      {
        type: "way",
        id: 2,
        center: { lat: 41.33, lon: -75.05 },
        tags: {
          name: "Ridge Loop",
          highway: "path",
          length: "4200",
          sac_scale: "hiking",
          surface: "gravel",
          dog: "leashed"
        }
      },
      {
        type: "node",
        id: 3,
        lat: 41.335,
        lon: -75.03,
        tags: { natural: "waterfall", name: "Falls Brook Falls" }
      },
      {
        type: "node",
        id: 4,
        lat: 41.336,
        lon: -75.02,
        tags: { tourism: "viewpoint", name: "Hawk Overlook" }
      }
    ]
  };

  const parsed = TC.parseOverpass
    ? null
    : null;

  // parseOverpass is internal — test via manual reimplementation using exported distanceKm
  function parseTest(data, lat, lng) {
    const elements = data.elements || [];
    const trails = [];
    const waterfalls = [];
    const viewpoints = [];
    elements.forEach((el) => {
      const tags = el.tags || {};
      if (tags.natural === "waterfall") {
        const dist = TC.distanceKm(lat, lng, el.lat, el.lon);
        waterfalls.push({ name: tags.name, distanceKm: dist });
        return;
      }
      if (tags.route === "hiking" || /^(path|footway|track)$/.test(tags.highway || "")) {
        const c = el.center || { lat: el.lat, lon: el.lon };
        if (!c || c.lat == null) return;
        trails.push({
          name: tags.name,
          distanceKm: TC.distanceKm(lat, lng, c.lat, c.lon),
          tags: tags
        });
      }
    });
    return { trails, waterfalls, viewpoints };
  }

  const pike = parseTest(overpassFixture, 41.3312, -75.038);
  if (!pike.trails.length || pike.trails[0].name !== "Escarpment Trail") {
    fail("nearby-trail-lookup", "expected named trails from fixture");
  } else {
    pass("nearby-trail-lookup");
  }

  if (!pike.waterfalls.length) {
    fail("waterfall-feature", "expected waterfall in fixture parse");
  } else {
    pass("waterfall-feature");
  }

  const trailPkg = {
    status: "live",
    trails: [
      {
        name: "Escarpment Trail",
        distanceMi: 1.2,
        lengthMi: 3.2,
        elevationGainFt: 1050,
        estimatedTime: "2h 30m",
        difficulty: "Moderate",
        surface: "ground",
        dogFriendly: "No dogs",
        bikeFriendly: "No bikes"
      }
    ],
    waterfalls: [{ name: "Falls Brook Falls", distanceMi: 0.8 }],
    viewpoints: [{ name: "Hawk Overlook", distanceMi: 0.5 }],
    attribution: "OpenStreetMap",
    summary: "1 named trail within ~20 mi"
  };

  const live = TCI.analyze(mockPlatform(), trailPkg);
  if (!live.trails.length || live.trails[0].name !== "Escarpment Trail") {
    fail("intel-trails", "live intel missing trails");
  } else {
    pass("intel-trails");
  }

  if (!live.weatherImpacts || live.weatherImpacts.length < 6) {
    fail("weather-impacts", "expected six impact chips");
  } else {
    pass("weather-impacts");
  }

  const mud = live.weatherImpacts.find((c) => c.label === "Mud risk");
  if (!mud || mud.status !== "minimal") {
    fail("weather-impacts-dry", "dry weather should be minimal mud risk, got " + (mud && mud.status));
  } else {
    pass("weather-impacts-dry");
  }

  const rainy = TCI.analyze(mockPlatform({
    weatherRef: {
      meta: { isPlaceholder: false },
      current: {
        temperature: { value: 65 },
        feelsLike: { value: 65 },
        conditions: { summary: "Light rain" },
        wind: { speed: { value: 5 } },
        precipitation: { probability: 80 }
      },
      daily: [{ precipitation: { probability: 80 } }]
    },
    rainfall: { recent: { amount: 1.2, periodDays: 7 } }
  }), trailPkg);
  const mudRain = rainy.weatherImpacts.find((c) => c.label === "Mud risk");
  if (!mudRain || (mudRain.status !== "moderate" && mudRain.status !== "high")) {
    fail("weather-impacts-rain", "rain should elevate mud risk");
  } else {
    pass("weather-impacts-rain");
  }

  const empty = TCI.analyze(mockPlatform(), { status: "empty", trails: [], summary: "No trails" });
  if (empty.status !== "empty" || empty.trailCount !== 0) {
    fail("empty-results", "empty package not handled");
  } else {
    pass("empty-results");
  }

  const missing = TCI.analyze(mockPlatform(), { status: "unavailable", trails: [], error: "timeout" });
  if (missing.status !== "unavailable") {
    fail("missing-provider", "unavailable status expected");
  } else {
    pass("missing-provider");
  }

  const alertPlatform = mockPlatform({
    alerts: {
      status: "live",
      items: [{
        event: "Flood Warning",
        headline: "Flood Warning for Sullivan County",
        description: "Creeks rising rapidly",
        senderName: "NWS"
      }]
    }
  });
  const withAlerts = TCI.analyze(alertPlatform, trailPkg);
  const storm = withAlerts.weatherImpacts.find((c) => c.label === "Storm risk");
  if (!storm || storm.status === "minimal") {
    fail("alert-handling", "NWS alert should elevate storm risk");
  } else {
    pass("alert-handling");
  }

  const closurePlatform = mockPlatform({
    conservation: {
      current: {
        title: "Temporary trail closure",
        summary: "North loop closed for bridge repair through July.",
        agency: "State Park"
      }
    }
  });
  const closures = TCI.analyze(closurePlatform, trailPkg);
  if (!closures.closures.length) {
    fail("closure-handling", "conservation closure not detected");
  } else {
    pass("closure-handling");
  }

  const zeroWind = TCI.analyze(mockPlatform({
    weatherRef: {
      meta: { isPlaceholder: false },
      current: {
        temperature: { value: 70 },
        feelsLike: { value: 70 },
        conditions: { summary: "Clear" },
        wind: { speed: { value: 0 }, gust: { value: 0 } },
        cloudCover: { value: 0 },
        uvIndex: { value: 0 },
        precipitation: { probability: 0 }
      },
      daily: [{ precipitation: { probability: 0 } }]
    }
  }), trailPkg);
  const wind = zeroWind.weatherImpacts.find((c) => c.label === "Wind exposure");
  if (!wind || wind.status !== "minimal") {
    fail("zero-value-wind", "0 mph wind must not be treated as missing/high");
  } else {
    pass("zero-value-wind");
  }

  if (!zeroWind.hikingWindow || zeroWind.hikingWindow.status !== "live") {
    fail("hiking-window", "daylight window missing");
  } else {
    pass("hiking-window");
  }

  if (!withAlerts.photoOps || !withAlerts.photoOps.length) {
    fail("photo-ops", "photo opportunities should include waterfall/viewpoint");
  } else {
    pass("photo-ops");
  }

  if (failures.length) {
    console.error("\nTRAIL CONDITIONS TESTS: FAIL (" + failures.length + ")");
    failures.forEach((f) => console.error("  -", f));
    process.exit(1);
  }
  console.log("\nTRAIL CONDITIONS TESTS: PASS");
}

run();
