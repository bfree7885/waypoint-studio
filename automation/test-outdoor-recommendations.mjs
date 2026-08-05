import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const enginePath = path.join(
  root,
  "design-system/js/outdoor-intelligence/wds-outdoor-recommendations.js"
);
const source = fs.readFileSync(enginePath, "utf8");
const sandbox = {
  console,
  Date,
  Promise,
  encodeURIComponent,
  isFinite,
  setTimeout,
  clearTimeout
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: enginePath });

const engine = sandbox.WDS.outdoorRecommendations;
assert.equal(engine.version, "1.0.0");
assert.deepEqual(
  Array.from(engine.surfaces),
  ["dashboard", "articles", "scenes", "sheds"]
);
assert.deepEqual(
  Array.from(engine.domains),
  [
    "weather", "season", "species", "phenology", "astronomy", "geology",
    "trail-conditions", "camera-activity", "photo-metadata",
    "recent-observations", "article-categories", "location"
  ]
);

const now = "2026-08-05T12:00:00.000Z";
const richContext = {
  now,
  weather: {
    status: "live",
    conditions: { summary: "Thunderstorms and rain" },
    wind: { gust: { value: 38 } },
    cloudCover: { value: 80 },
    alerts: [{ event: "Severe Thunderstorm Warning" }]
  },
  season: "summer",
  species: [{ commonName: "White-tailed deer" }],
  phenology: [{ title: "Blackberries ripening" }],
  astronomy: { moonIllumination: 12, events: [{ name: "Perseid meteor shower" }] },
  geology: [{ name: "Shale ledges" }],
  trailConditions: { status: "caution", summary: "Muddy trail and stream crossing" },
  cameraActivity: { recentShootCount: 3, goals: ["composition"] },
  photoMetadata: [{ lens: "400mm", tags: ["wildlife"] }],
  recentObservations: [{
    title: "White-tailed deer",
    taxonLabel: "White-tailed deer",
    recordedAt: "2026-08-04T10:00:00.000Z"
  }],
  articleCategories: ["Geology", "Wildlife"],
  location: { label: "Hudson Valley", scope: "Hudson Valley", lat: 42.1, lng: -73.9 },
  articles: [{
    id: "regional-wildlife",
    title: "Forest habitat changes",
    summary: "A regional habitat report.",
    canonicalUrl: "https://example.org/habitat",
    sourceName: "Example",
    categories: ["Wildlife"],
    geographicScopes: ["Hudson Valley"],
    relevanceScore: 70
  }]
};

const first = engine.recommendFor("dashboard", richContext, { limit: 20 });
const second = engine.recommendFor("dashboard", richContext, { limit: 20 });
assert.equal(JSON.stringify(first), JSON.stringify(second), "same input must produce the same ranking");
assert.equal(first[0].id, "weather-active-alert", "active safety alert must rank first");
assert.ok(first.every((item) => item.reason && item.honesty && item.evidence.length));
assert.ok(first.some((item) => item.id === "article:regional-wildlife"));
assert.ok(first.some((item) => item.id === "phenology-seasonal-change"));
assert.ok(first.some((item) => item.id === "geology-landscape-reading"));
assert.ok(first.some((item) => item.id === "species-recent-observation"));

const scenes = engine.recommendFor("scenes", richContext, { limit: 20 });
assert.ok(scenes.some((item) => item.id === "camera-recent-practice"));
assert.ok(scenes.some((item) => item.id === "camera-profile-goal"));
assert.ok(!scenes.some((item) => item.id === "sheds-cervid-context"));
assert.ok(!scenes.some((item) => item.id === "article:regional-wildlife"));
assert.ok(scenes.filter((item) => item.kind === "article").length <= 1);
const noisySceneCategory = engine.recommendFor("scenes", {
  now,
  articles: [{
    id: "flight",
    title: "A new commercial turbulence tool",
    categories: ["Birds", "Weather"],
    canonicalUrl: "https://example.org/flight",
    relevanceScore: 90
  }]
}, { limit: 10 });
assert.ok(!noisySceneCategory.some((item) => item.id === "article:flight"));

const sheds = engine.recommendFor("sheds", richContext, { limit: 20 });
assert.ok(sheds.some((item) => item.id === "sheds-cervid-context"));
assert.ok(sheds.some((item) => item.id === "weather-wet-trails"));
assert.ok(sheds.filter((item) => item.kind === "article").length <= 1);
assert.ok(
  sheds.filter((item) => item.kind === "article").every((item) =>
    /wildlife|habitat|conservation|forest|season|deer/i.test(
      `${item.article.title} ${(item.article.categories || []).join(" ")}`
    )
  )
);

const clearNight = engine.recommendFor("scenes", {
  now,
  weather: { status: "live", conditions: "Clear", cloudCover: 20 },
  astronomy: { moonIllumination: 15 },
  location: { label: "Adirondacks" }
}, { includeArticles: false });
assert.ok(clearNight.some((item) => item.id === "astronomy-clear-dark-sky"));

const sparse = engine.recommendFor("articles", { now }, { includeArticles: false });
assert.equal(sparse.length, 1, "sparse context should only produce an honest seasonal prompt");
assert.equal(sparse[0].id, "season-default-observation");

const htmlFiles = [
  "articles/index.html",
  "apps/scenes/index.html",
  "apps/shed-hunting/index.html"
];
for (const relative of htmlFiles) {
  const html = fs.readFileSync(path.join(root, relative), "utf8");
  assert.match(html, /wds-outdoor-recommendations\.js/);
  assert.match(html, /outdoorRecommendations/);
}

const loader = fs.readFileSync(path.join(root, "design-system/js/wds.js"), "utf8");
assert.match(loader, /outdoor-intelligence\/wds-outdoor-recommendations\.js/);
const dashboard = fs.readFileSync(
  path.join(root, "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js"),
  "utf8"
);
assert.match(dashboard, /outdoorRecommendations/);
assert.doesNotMatch(source, /\bOpenAI\b|\bChatGPT\b|\bgenerative AI\b/i);

console.log("Outdoor recommendation engine tests passed.");
