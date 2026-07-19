#!/usr/bin/env node
/**
 * Waypoint Volunteer — Foundation + Opportunity Intelligence Engine tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/volunteer");
let failed = 0;

function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

function readJson(rel) {
  const p = join(pkg, rel);
  ok(existsSync(p), `exists ${rel}`);
  return JSON.parse(readFileSync(p, "utf8"));
}

function memoryStorage() {
  const store = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
    },
    setItem(k, v) {
      store[k] = String(v);
    },
    removeItem(k) {
      delete store[k];
    }
  };
}

function loadScript(rel, sandbox) {
  const code = readFileSync(join(root, rel), "utf8");
  vm.runInContext(code, sandbox);
}

/* —— Surfaces —— */
for (const p of [
  "apps/waypoint-volunteer/index.html",
  "apps/waypoint-volunteer/discover.html",
  "apps/waypoint-volunteer/saved/index.html",
  "apps/waypoint-volunteer/profile/index.html",
  "apps/waypoint-volunteer/impact/index.html"
]) {
  ok(existsSync(join(root, p)), `route ${p}`);
}

for (const p of [
  "design-system/js/volunteer/wds-volunteer-discover.js",
  "design-system/js/volunteer/wds-volunteer-intelligence.js",
  "design-system/js/volunteer/wds-volunteer-weather.js",
  "design-system/js/volunteer/wds-volunteer-profile.js",
  "design-system/js/volunteer/wds-volunteer-planning.js",
  "design-system/js/volunteer/wds-volunteer-impact.js",
  "design-system/js/volunteer/wds-volunteer-map.js"
]) {
  ok(existsSync(join(root, p)), `module ${p}`);
}

const bundle = readJson("samples/demo-bundle.json");
ok(bundle.opportunities?.length >= 10, "expanded sample opportunities");
ok(
  bundle.opportunities.every((o) => o.intelligence && typeof o.intelligence.serviceImpact === "number"),
  "intelligence facets present"
);
ok(
  bundle.opportunities.filter((o) => o.location?.lat != null).length >= 8,
  "map coordinates on most samples"
);

const oppSchema = readJson("schema-opportunity-v0.1.json");
ok(!!oppSchema.properties.intelligence, "schema intelligence");
ok(!!oppSchema.properties.location.properties.lat, "schema lat");

/* —— Engine scoring —— */
const sandbox = {
  window: { localStorage: memoryStorage() },
  console,
  fetch: undefined
};
vm.createContext(sandbox);
loadScript("design-system/js/volunteer/wds-volunteer-profile.js", sandbox);
loadScript("design-system/js/volunteer/wds-volunteer-planning.js", sandbox);
loadScript("design-system/js/volunteer/wds-volunteer-impact.js", sandbox);
loadScript("design-system/js/volunteer/wds-volunteer-intelligence.js", sandbox);
loadScript("design-system/js/volunteer/wds-volunteer-discover.js", sandbox);

const WDS = sandbox.window.WDS;
ok(typeof WDS.volunteerIntelligence.scoreOpportunity === "function", "score API");
ok(typeof WDS.volunteerIntelligence.recommendToday === "function", "recommend API");
ok(typeof WDS.volunteerDiscover.mountDiscover === "function", "mount API");

const coolCtx = {
  honesty: "live",
  season: "spring",
  isWeekend: true,
  location: { lat: 41.35, lon: -74.91 },
  weather: {
    available: true,
    isCool: true,
    isRaining: false,
    isHeavyRain: false,
    isHot: false,
    isFair: true,
    tags: ["cool", "dry"],
    precipProbability: 10
  }
};

const trail = bundle.opportunities.find((o) => o.id === "vo_sample-trail-maintenance");
const pantry = bundle.opportunities.find((o) => o.id === "vo_sample-pantry-pack");
const coolTrail = WDS.volunteerIntelligence.scoreOpportunity(trail, coolCtx, {});
ok(coolTrail.overall >= 70, "cool weather boosts trail work");
ok(
  coolTrail.reasons.some((r) => /cool|fair|outdoor/i.test(r)),
  "trail explanation mentions outdoor/cool"
);

const rainCtx = {
  honesty: "live",
  season: "spring",
  isWeekend: false,
  location: { lat: 41.35, lon: -74.91 },
  weather: {
    available: true,
    isCool: false,
    isRaining: true,
    isHeavyRain: true,
    isHot: false,
    isFair: false,
    tags: ["rain"],
    precipProbability: 80
  }
};
const rainPantry = WDS.volunteerIntelligence.scoreOpportunity(pantry, rainCtx, {});
const rainTrail = WDS.volunteerIntelligence.scoreOpportunity(trail, rainCtx, {});
ok(rainPantry.overall > rainTrail.overall, "rain prefers indoor pantry over trail");
ok(
  rainPantry.reasons.some((r) => /rain|indoor/i.test(r)),
  "rain explanation present"
);

const hotCtx = {
  honesty: "live",
  season: "summer",
  isWeekend: false,
  location: { lat: 41.35, lon: -74.91 },
  weather: {
    available: true,
    isHot: true,
    isRaining: false,
    isHeavyRain: false,
    isCool: false,
    isFair: false,
    tags: ["hot"],
    precipProbability: 5
  }
};
const hotTrail = WDS.volunteerIntelligence.weatherSuitability(trail, hotCtx);
ok(hotTrail.score < 60, "heat lowers outdoor suitability");
ok(/heat/i.test(hotTrail.reasons.join(" ")), "heat explanation");

const profile = {
  preferredTravelMiles: 15,
  preferredDurationMinutes: 90,
  physicalAbility: "light",
  indoorOutdoor: "indoor",
  causes: ["food-banks"],
  availableWeekdays: true,
  availableWeekends: true
};
const rec = WDS.volunteerIntelligence.recommendToday(bundle.opportunities, rainCtx, profile);
ok(rec.top && rec.top.opportunity, "today top recommendation");
ok(Array.isArray(rec.alternatives), "alternatives array");
ok(rec.honesty.catalog === "demo", "demo honesty");

/* —— Filters —— */
ok(
  WDS.volunteerIntelligence.matchesDiscoveryFilters(pantry, { setting: "indoor" }, null),
  "indoor filter"
);
ok(
  !WDS.volunteerIntelligence.matchesDiscoveryFilters(trail, { setting: "indoor" }, null),
  "indoor filter excludes trail"
);
ok(
  WDS.volunteerIntelligence.matchesDiscoveryFilters(trail, { weekend: true }, null),
  "weekend filter matches trail sample"
);

/* —— Planning / profile / impact —— */
WDS.volunteerPlanning.setStatus("vo_sample-trail-maintenance", "interested");
ok(WDS.volunteerPlanning.hasStatus("vo_sample-trail-maintenance", "interested"), "planning interested");
WDS.volunteerPlanning.setStatus("vo_sample-trail-maintenance", "completed");
ok(WDS.volunteerPlanning.hasStatus("vo_sample-trail-maintenance", "completed"), "planning completed");

WDS.volunteerProfile.save({ causes: ["conservation"], preferredTravelMiles: 20 });
ok(WDS.volunteerProfile.load().causes.includes("conservation"), "profile causes");

WDS.volunteerImpact.recordCompletion(trail, { name: "Highland Land Trust (sample)" });
const impact = WDS.volunteerImpact.summary();
ok(impact.state.totals.completedCount >= 1, "impact recorded");
ok(impact.state.totals.hours > 0, "impact hours");
ok(impact.honesty === "private-local", "impact private");

/* —— No gamification language in discover runtime —— */
const discoverSrc = readFileSync(
  join(root, "design-system/js/volunteer/wds-volunteer-discover.js"),
  "utf8"
);
ok(!/leaderboard/i.test(discoverSrc), "no leaderboard");
ok(/No rankings/i.test(discoverSrc), "anti-ranking copy");

const nav = JSON.parse(
  readFileSync(join(root, "design-system/ecosystem/nav-registry.json"), "utf8")
);
const vol = nav.apps.find((a) => a.id === "waypoint-volunteer");
ok(vol.features.some((f) => f.id === "impact"), "nav impact");
ok(vol.features.some((f) => f.id === "profile"), "nav profile");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nWaypoint Volunteer Opportunity Intelligence contracts OK");
