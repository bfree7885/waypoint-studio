#!/usr/bin/env node
/**
 * Dashboard Rebuild — instrument intelligence fixtures (deterministic, no network).
 * Run: node automation/test-dashboard-rebuild-intel.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

const NOW = new Date("2026-07-15T18:00:00.000Z"); // mid/late afternoon UTC

function isoOffset(minutes) {
  return new Date(NOW.getTime() + minutes * 60000).toISOString();
}

function hoursFrom(specs) {
  return specs.map(function (s, i) {
    return {
      time: isoOffset(s.atMin != null ? s.atMin : (i + 1) * 60),
      temperature: s.temp != null ? s.temp : 72,
      precipitation: { probability: s.prob != null ? s.prob : 5 },
      wind: { speed: s.wind != null ? s.wind : 5 },
      cloudCover: s.cloud != null ? s.cloud : 20,
      conditions: s.conditions || "Clear"
    };
  });
}

function platform(overrides) {
  const o = overrides || {};
  const cur = Object.assign(
    {
      temperature: 72,
      feelsLike: 72,
      humidity: 45,
      cloudCover: 20,
      uvIndex: 4,
      wind: { speed: 5, gust: 8 },
      conditions: { summary: "Clear" },
      precipitation: { probability: 5, amount: 0 }
    },
    o.current || {}
  );
  return {
    meta: { hydratedAt: NOW.toISOString(), fromCache: false },
    weatherRef: {
      meta: { isPlaceholder: false, timezone: "America/New_York" },
      current: cur,
      hourly: o.hourly || hoursFrom([{ prob: 5 }, { prob: 5 }, { prob: 8 }, { prob: 10 }]),
      daily: o.daily || [{ temperatureHigh: 78, temperatureLow: 58, uvIndex: 6 }]
    },
    daylight: Object.assign(
      {
        sunriseISO: isoOffset(-12 * 60),
        sunsetISO: isoOffset(4 * 60),
        sunriseFormatted: "6:00 AM",
        sunsetFormatted: "8:00 PM",
        kind: "day"
      },
      o.daylight || {}
    ),
    airQuality: Object.assign({ status: "live", usAqi: 35, category: "Good", pm25: 8 }, o.air || {}),
    alerts: Object.assign({ status: "live", items: [] }, o.alerts || {})
  };
}

const sandbox = { window: {}, console, Date };
sandbox.window = sandbox;
sandbox.global = sandbox;
load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js", sandbox);
load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js", sandbox);
load("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js", sandbox);

const Intel = sandbox.WDS.dashboardRebuildIntel;
const Data = sandbox.WDS.dashboardRebuildData;
const Reg = sandbox.WDS.dashboardRebuildRegistry;

assert("intel module loaded", !!(Intel && Intel.analyze && Intel.version));
assert("intel version", /instrument-intelligence|happening-now-layer/.test(Intel.version));
assert("data loads after intel", !!(Data && Data.fromPlatform));
assert("wds.js includes intel before data", /rebuild-intel\.js[\s\S]*rebuild-data\.js/.test(
  fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8")
));
assert(
  "css has doorway brief styles",
  /\.wdb-r-widget__brief/.test(
    fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8")
  )
);

function ids(signals) {
  return (signals || []).map((s) => s.id);
}

function hasId(signals, id) {
  return ids(signals).indexOf(id) >= 0;
}

function everySignalHasEvidence(signals) {
  return (signals || []).every((s) => Array.isArray(s.evidence) && s.evidence.length > 0);
}

function noUnsupportedClaims(brief) {
  const banned = [/enjoy your day/i, /check the weather before/i, /have a great/i];
  return !banned.some((re) => re.test(brief || ""));
}

/* ---------- Fixture matrix ---------- */

const fixtures = [
  {
    name: "1 calm clear summer afternoon",
    build: () =>
      platform({
        current: {
          temperature: 78,
          feelsLike: 78,
          humidity: 40,
          cloudCover: 15,
          uvIndex: 6,
          wind: { speed: 4, gust: 6 },
          precipitation: { probability: 5 }
        },
        daylight: { sunsetISO: isoOffset(180) }
      }),
    expect: (a) => {
      assert(a.name + " has dry/calm signals", hasId(a.signals, "precip-dry-now") || hasId(a.signals, "wind-calm"));
      assert(a.name + " BYO brief present", !!(a.beforeYouGo && a.beforeYouGo.brief));
      assert(a.name + " evidence on signals", everySignalHasEvidence(a.signals));
      assert(a.name + " no filler prose", noUnsupportedClaims(a.beforeYouGo.brief));
    }
  },
  {
    name: "2 hot humid afternoon",
    build: () =>
      platform({
        current: {
          temperature: 88,
          feelsLike: 96,
          humidity: 78,
          cloudCover: 40,
          wind: { speed: 6 },
          precipitation: { probability: 15 }
        }
      }),
    expect: (a) => {
      assert(a.name + " heat or humid signal", hasId(a.signals, "temp-heat") || hasId(a.signals, "comfort-humid"));
      assert(a.name + " BYO mentions heat/humid", /hot|heat|humid|°F/i.test(a.beforeYouGo.brief));
    }
  },
  {
    name: "3 rain arriving soon",
    build: () =>
      platform({
        current: {
          temperature: 68,
          humidity: 70,
          precipitation: { probability: 20 },
          conditions: { summary: "Mostly cloudy" },
          cloudCover: 80,
          wind: { speed: 8 }
        },
        hourly: hoursFrom([
          { atMin: 60, prob: 55 },
          { atMin: 120, prob: 70 },
          { atMin: 180, prob: 40 }
        ])
      }),
    expect: (a) => {
      assert(a.name + " precip-soon", hasId(a.signals, "precip-soon"), ids(a.signals).join(","));
      assert(a.name + " noteworthy includes rain", hasId(a.happeningNow, "precip-soon"));
      /* BYO may omit precip prose when Happening Now already surfaces it */
      assert(
        a.name + " BYO still useful without rain echo",
        !!(a.beforeYouGo.brief && a.beforeYouGo.brief.length > 8) &&
          !/Enjoy your day|check the weather before/i.test(a.beforeYouGo.brief)
      );
    }
  },
  {
    name: "4 rain ending",
    build: () =>
      platform({
        current: {
          temperature: 64,
          humidity: 85,
          precipitation: { probability: 80, amount: 0.05, intensity: "moderate" },
          conditions: { summary: "Light rain" },
          cloudCover: 95,
          wind: { speed: 7 }
        },
        hourly: hoursFrom([
          { atMin: 60, prob: 35 },
          { atMin: 120, prob: 15 },
          { atMin: 180, prob: 10 }
        ])
      }),
    expect: (a) => {
      assert(a.name + " precip-active", hasId(a.signals, "precip-active"));
      assert(a.name + " precip-ending", hasId(a.signals, "precip-ending"), ids(a.signals).join(","));
    }
  },
  {
    name: "5 high wind gusts",
    build: () =>
      platform({
        current: {
          temperature: 55,
          humidity: 40,
          wind: { speed: 22, gust: 38 },
          precipitation: { probability: 10 }
        }
      }),
    expect: (a) => {
      assert(a.name + " wind-gusts", hasId(a.signals, "wind-gusts"));
      assert(a.name + " gusts ranked high", a.happeningNow[0] && a.happeningNow[0].id === "wind-gusts");
      assert(
        a.name + " BYO useful without gust echo",
        !!(a.beforeYouGo.brief && a.beforeYouGo.brief.length > 8)
      );
    }
  },
  {
    name: "6 cold freezing evening",
    build: () =>
      platform({
        current: {
          temperature: 28,
          feelsLike: 22,
          humidity: 55,
          wind: { speed: 10 },
          precipitation: { probability: 10 },
          cloudCover: 30
        },
        daylight: { sunsetISO: isoOffset(-30), kind: "night" }
      }),
    expect: (a) => {
      assert(a.name + " temp-freezing", hasId(a.signals, "temp-freezing"));
      assert(a.name + " BYO freezing", /freezing|°F/i.test(a.beforeYouGo.brief));
    }
  },
  {
    name: "7 golden hour approaching",
    build: () =>
      platform({
        current: {
          temperature: 70,
          humidity: 45,
          cloudCover: 35,
          wind: { speed: 5 },
          precipitation: { probability: 5 }
        },
        daylight: { sunsetISO: isoOffset(35), sunsetFormatted: "7:35 PM", kind: "golden" }
      }),
    expect: (a) => {
      assert(a.name + " golden signal", hasId(a.signals, "light-golden-approaching"));
      assert(a.name + " omits unpublished Scenes link", !(a.toolLinks || []).some((l) => l.id === "scenes"));
      assert(a.name + " evidence minutesToSunset", a.signals.some((s) =>
        s.id === "light-golden-approaching" && s.evidence.some((e) => e.metric === "minutesToSunset")
      ));
    }
  },
  {
    name: "8 new moon clear night",
    build: () =>
      platform({
        current: {
          temperature: 58,
          humidity: 40,
          cloudCover: 15,
          wind: { speed: 4 },
          precipitation: { probability: 0 },
          uvIndex: 0
        },
        daylight: {
          sunsetISO: isoOffset(-120),
          sunriseISO: isoOffset(8 * 60),
          kind: "night",
          moonIllumination: 2,
          moonPhase: "New Moon"
        }
      }),
    expect: (a) => {
      assert(a.name + " dark-moon signal", hasId(a.signals, "astro-dark-moon-clear"), ids(a.signals).join(","));
      assert(a.name + " omits unpublished Scenes dark-sky link", !(a.toolLinks || []).some((l) => l.id === "scenes"));
    }
  },
  {
    name: "9 full moon cloudy night",
    build: () =>
      platform({
        current: {
          temperature: 60,
          cloudCover: 85,
          wind: { speed: 6 },
          precipitation: { probability: 15 }
        },
        daylight: {
          sunsetISO: isoOffset(-90),
          kind: "night",
          moonIllumination: 98,
          moonPhase: "Full Moon"
        }
      }),
    expect: (a) => {
      assert(a.name + " bright cloudy signal", hasId(a.signals, "astro-bright-moon-cloudy"));
      assert(a.name + " not falsely favorable", !(a.toolLinks || []).some((l) => /dark-sky|stargaz/i.test(l.reason || "")));
    }
  },
  {
    name: "10 moderate air quality",
    build: () =>
      platform({
        current: { temperature: 75, humidity: 50, wind: { speed: 5 }, precipitation: { probability: 5 } },
        air: { usAqi: 85, category: "Moderate", pm25: 28 }
      }),
    expect: (a) => {
      assert(a.name + " air-moderate", hasId(a.signals, "air-moderate"));
      assert(
        a.name + " air in HN or BYO",
        hasId(a.happeningNow, "air-moderate") ||
          /air|AQI|moderate/i.test(a.beforeYouGo.brief + JSON.stringify(a.beforeYouGo.facts))
      );
    }
  },
  {
    name: "11 active severe alert",
    build: () =>
      platform({
        current: { temperature: 72, wind: { speed: 15 }, precipitation: { probability: 40 } },
        alerts: {
          status: "live",
          items: [
            {
              event: "Severe Thunderstorm Warning",
              severity: "Severe",
              headline: "Severe Thunderstorm Warning in effect"
            }
          ]
        }
      }),
    expect: (a) => {
      assert(a.name + " alert-active", hasId(a.signals, "alert-active"));
      assert(a.name + " alert ranks first", a.happeningNow[0] && a.happeningNow[0].id === "alert-active");
      assert(a.name + " BYO leads with alert", /alert|warning|thunderstorm/i.test(a.beforeYouGo.brief));
      assert(a.name + " no forage/shed fake links", !(a.toolLinks || []).some((l) => l.id === "sheds" || l.id === "foragecast"));
    }
  },
  {
    name: "12 ordinary nothing noteworthy",
    build: () =>
      platform({
        current: {
          temperature: 68,
          feelsLike: 68,
          humidity: 48,
          cloudCover: 40,
          uvIndex: 3,
          wind: { speed: 5, gust: 7 },
          precipitation: { probability: 8 }
        },
        daylight: { sunsetISO: isoOffset(240) },
        air: { usAqi: 32, category: "Good" },
        alerts: { status: "live", items: [] }
      }),
    expect: (a) => {
      assert(a.name + " happeningNow empty or low-noise", a.happeningNow.length === 0, String(a.happeningNow.length));
      assert(a.name + " BYO still useful", !!(a.beforeYouGo.brief && a.beforeYouGo.brief.length > 8));
      assert(a.name + " no manufactured urgency", !/urgent|severe|warning|danger/i.test(a.beforeYouGo.brief));
      assert(a.name + " no scenes ad without reason", !(a.toolLinks || []).length);
    }
  }
];

fixtures.forEach(function (fx) {
  const analysis = Intel.analyze(fx.build(), { lat: 41.3, lng: -74.8, timezone: "America/New_York" }, NOW);
  analysis.name = fx.name;
  assert(fx.name + " state normalized", !!(analysis.state && analysis.state.weather));
  assert(fx.name + " no fabricated temp when present", analysis.state.weather.temperatureF != null);
  fx.expect(analysis);

  /* Doorway payload uses intel brief */
  const pack = Data.fromPlatform(fx.build(), { lat: 41.3, lng: -74.8 });
  const door = pack.widgets["ph-doorway"];
  assert(fx.name + " doorway live", door && door.status === "live");
  assert(fx.name + " doorway brief", !!(door.brief && door.brief.length > 5), door && door.brief);
  assert(fx.name + " doorway trust derived", door.trust === "derived");
  assert(fx.name + " pack.intel present", !!(pack.intel && pack.intel.signals));

  const html = Reg.render ? Reg.render(Reg.get("ph-doorway"), door) : "";
  if (Reg.render) {
    assert(fx.name + " doorway renders brief class", /wdb-r-widget__brief/.test(html), html.slice(0, 160));
  }
});

/* Contradictions: dry + rain soon should not both claim dry-now when rain soon fires */
{
  const a = Intel.analyze(
    platform({
      current: { precipitation: { probability: 5 }, conditions: { summary: "Clear" } },
      hourly: hoursFrom([{ atMin: 90, prob: 65 }, { atMin: 150, prob: 70 }, { atMin: 210, prob: 40 }])
    }),
    null,
    NOW
  );
  assert("no dry-now with precip-soon", !(hasId(a.signals, "precip-dry-now") && hasId(a.signals, "precip-soon")));
}

/* Ranking: higher severity before lower */
{
  const a = Intel.analyze(
    platform({
      current: { temperature: 95, feelsLike: 102, humidity: 70, wind: { speed: 8 }, precipitation: { probability: 5 } },
      alerts: {
        status: "live",
        items: [{ event: "Heat Advisory", severity: "Moderate" }]
      }
    }),
    null,
    NOW
  );
  assert("alerts outrank heat in happeningNow", a.happeningNow[0].id === "alert-active");
}

/* Catalog inventory still 12 instruments */
assert("catalog has 12 instruments", Reg.all().length === 12, String(Reg.all().length));

console.log("\n" + passed + " assertions passed.");
if (failures.length) {
  console.error("\n" + failures.length + " failures:");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("All Dashboard rebuild intel tests passed.");
