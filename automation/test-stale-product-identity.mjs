#!/usr/bin/env node
/**
 * Stale localStorage must not resurrect discontinued product identity
 * in Dashboard / public runtime copy. Historical records stay readable.
 *
 * Run: node automation/test-stale-product-identity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const DISCONTINUED = [
  "OpenRoad",
  "Civic Trails",
  "SignalTerrain",
  "Global Signals",
  "Fieldry",
  "ForageCast",
  "Steepleaf",
  "Savant Sommelier",
  "Landscape Interpretation",
  "Terrainbound",
  "Waypoint Volunteer"
];

const LEAK_PHRASES = [
  "Open Fieldry",
  "Start in Fieldry",
  "Your Fieldry",
  "Fieldry log",
  "Private Fieldry",
  "For Fieldry",
  "Fieldry favorites",
  "Recent Fieldry",
  "Visit ForageCast",
  "Open ForageCast",
  "Use ForageCast",
  "Log conditions in Fieldry"
];

const QUOTED_IDENTITY = new RegExp(
  "(['\"`])(" +
    DISCONTINUED.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
    ")\\1"
);

function leaksIn(value) {
  const hay = typeof value === "string" ? value : JSON.stringify(value);
  return DISCONTINUED.filter((name) => hay.includes(name));
}

function assertClean(name, value) {
  const found = leaksIn(value);
  assert(name, found.length === 0, found.join(", "));
}

function loadModules(files, extra) {
  const sandbox = {
    console,
    location: { pathname: "/apps/dashboard/", hash: "" },
    localStorage: {
      _d: {},
      getItem(k) {
        return this._d[k] == null ? null : this._d[k];
      },
      setItem(k, v) {
        this._d[k] = String(v);
      },
      removeItem(k) {
        delete this._d[k];
      }
    },
    document: {
      readyState: "complete",
      documentElement: { getAttribute: () => null },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      getElementById() {
        return null;
      },
      addEventListener() {}
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.WDS = {};
  Object.assign(sandbox, extra || {});
  for (const f of files) {
    vm.runInNewContext(read(f), sandbox, { filename: f });
  }
  return sandbox;
}

function seedHistoricalStores(sandbox) {
  sandbox.localStorage.setItem(
    "waypoint-fieldry-observations-v1",
    JSON.stringify([
      {
        id: "fr_deer",
        recordedAt: "2026-04-01T12:00:00.000Z",
        taxon: { commonName: "White-tailed deer", scientificName: "Odocoileus virginianus" },
        location: { county: "Pike", state: "PA" },
        notes: "Trail camera still"
      },
      {
        id: "fr_warbler",
        recordedAt: "2026-04-02T12:00:00.000Z",
        taxon: { commonName: "Yellow warbler", scientificName: "Setophaga petechia" }
      },
      {
        id: "fr_frog",
        recordedAt: "2026-04-03T12:00:00.000Z",
        taxon: { commonName: "Wood frog", scientificName: "Lithobates sylvaticus" }
      },
      {
        id: "fr_snake",
        recordedAt: "2026-04-04T12:00:00.000Z",
        taxon: { commonName: "Garter snake", scientificName: "Thamnophis sirtalis" }
      },
      {
        id: "fr_bee",
        recordedAt: "2026-04-05T12:00:00.000Z",
        taxon: { commonName: "Bumble bee", scientificName: "Bombus" }
      }
    ])
  );
  sandbox.localStorage.setItem(
    "foragecast.journal.v1",
    JSON.stringify([{ id: "fcj_1", text: "Morels after rain on a north slope", at: "2026-04-06T12:00:00.000Z" }])
  );
  sandbox.localStorage.setItem(
    "waypoint-volunteer-planning-v1",
    JSON.stringify({
      items: {
        vol_1: {
          title: "Stream cleanup",
          org: "Watershed group",
          updatedAt: "2026-04-07T12:00:00.000Z",
          statuses: ["saved"]
        }
      }
    })
  );
  sandbox.localStorage.setItem(
    "waypoint-sheds-observations-v1",
    JSON.stringify([
      {
        id: "sh_1",
        type: "deer_sign",
        speciesId: "odocoileus-virginianus",
        observedAt: "2026-04-08T12:00:00.000Z",
        location: { lat: 41.31, lng: -74.91 }
      }
    ])
  );
}

const obs = loadModules(["design-system/js/platform/wds-platform-observations.js"]);
seedHistoricalStores(obs);

assert(
  "historical Fieldry store is still readable",
  JSON.parse(obs.localStorage.getItem("waypoint-fieldry-observations-v1")).length === 5
);
assert(
  "historical ForageCast journal is still readable",
  JSON.parse(obs.localStorage.getItem("foragecast.journal.v1")).length === 1
);

const listed = obs.WDS.platformObservations.list();
assert("unified ledger keeps historical records", listed.length >= 7, "count=" + listed.length);
assert(
  "Fieldry records keep internal sourceApp",
  listed.filter((o) => o.sourceApp === "fieldry").length === 5
);
assert(
  "Fieldry/ForageCast/Volunteer hrefs are not product URLs",
  listed
    .filter((o) => o.sourceApp === "fieldry" || o.sourceApp === "foragecast" || o.sourceApp === "waypoint-volunteer")
    .every((o) => o.href == null)
);
assert("Sheds records still link to Sheds", listed.some((o) => o.sourceApp === "shed-hunting" && /shed-hunting/.test(o.href || "")));

for (const o of listed) {
  assertClean("observation title " + o.id, o.title);
  assertClean("observation honesty " + o.id, o.honesty);
  assertClean("observation sourceLabel " + o.id, o.sourceLabel);
  assertClean("observation subtitle " + o.id, o.subtitle || "");
}

assert("sourceLabel(fieldry) is neutral", obs.WDS.platformObservations.sourceLabel("fieldry") === "field notes");
assert("sourceLabel(foragecast) is neutral", obs.WDS.platformObservations.sourceLabel("foragecast") === "journal");
assert("sourceLabel(volunteer) is neutral", obs.WDS.platformObservations.sourceLabel("waypoint-volunteer") === "saved notes");

const wildCtx = obs.WDS.platformObservations.wildlifeContext();
assert("wildlifeContext still counts Fieldry store", wildCtx.fieldryCount === 5);
assertClean("wildlifeContext honesty", wildCtx.honesty);
assertClean("wildlifeContext recent titles", wildCtx.recent);

const intelBox = loadModules(["design-system/js/wildlife/wds-wildlife-dashboard-intel.js"]);
seedHistoricalStores(intelBox);
const intel = intelBox.WDS.wildlifeDashboardIntel.analyze({
  calendar: { month: 4, season: "spring" },
  region: { label: "Pike County, PA" },
  weatherRef: { meta: { isPlaceholder: true }, current: {} }
});
assert("wildlife intel produced cards", !!(intel && intel.wildlifeActivity && intel.birdActivity));
assert("wildlife card preserves taxon", /White-tailed deer/.test(intel.wildlifeActivity.happening), intel.wildlifeActivity.happening);
assert("bird card preserves taxon", /Yellow warbler/.test(intel.birdActivity.happening), intel.birdActivity.happening);
assertClean("wildlife intel cards", intel);
assert("neutral mammal copy", /Your notes include/.test(intel.wildlifeActivity.happening), intel.wildlifeActivity.happening);
assert("neutral bird copy", /Your notes:/.test(intel.birdActivity.happening), intel.birdActivity.happening);

const dash = loadModules([
  "design-system/js/platform/wds-platform-observations.js",
  "design-system/js/dashboard/wds-dashboard-widget-data.js",
  "design-system/js/dashboard/wds-dashboard-widgets.js",
  "design-system/js/dashboard/wds-dashboard-catalog.js"
]);
seedHistoricalStores(dash);
const notesWidget = dash.WDS.dashboardWidgets.get("recent-fieldry-observations");
assert("field notes widget still registered", !!(notesWidget && notesWidget.resolve));
assert("field notes widget title is neutral", notesWidget.title === "Recent field notes");
const notesData = notesWidget.resolve();
assert("field notes widget reads historical count", notesData && notesData.summary === "5 observations", JSON.stringify(notesData));
assertClean("field notes widget payload", notesData);
assert(
  "field notes widget does not link to Fieldry",
  !!(notesData.link && /settings\.html/.test(notesData.link.href) && !/fieldry/i.test(notesData.link.href + notesData.link.label))
);

const searchBox = loadModules([
  "design-system/js/platform/wds-platform-observations.js",
  "design-system/js/platform/wds-platform-search.js"
]);
seedHistoricalStores(searchBox);
const search = searchBox.WDS.platformSearch.search("deer", { depth: 0, limit: 20 });
assert("search finds historical observation", search.total >= 1);
assertClean("search results", search);
const obsHits = (search.groups && search.groups.observations) || [];
assert(
  "search observation subtitle is relabeled",
  obsHits.every((h) => !/fieldry/i.test(h.subtitle || "") && !/foragecast/i.test(h.subtitle || ""))
);

const forage = loadModules([
  "design-system/js/flora/wds-foraging-dashboard-intel.js",
  "design-system/js/flora/wds-foraging-dashboard-ui.js"
]);
const forageIntel = forage.WDS.foragingDashboardIntel.analyze({
  calendar: { month: 4, season: "spring" },
  region: { label: "Pike County, PA" },
  weatherRef: { meta: { isPlaceholder: true }, current: { humidity: { value: 80 } } }
});
assert("foraging intel produced cards", !!(forageIntel && forageIntel.cardList && forageIntel.cardList.length));
assertClean("foraging intel", forageIntel);
const forageHtml = forage.WDS.foragingDashboardUI.render(forageIntel);
assertClean("foraging UI html", forageHtml);
assert("foraging footer has no ForageCast CTA", !/Open ForageCast/.test(forageHtml));

const observe = loadModules(["design-system/js/dashboard/v2/wds-dashboard-v2-observe.js"]);
const observeCards = observe.WDS.dashboardV2Observe.cards({
  weather: { current: { windMph: 3, tempF: 55, conditions: "Clear" } },
  daylight: { sunrise: "06:12" },
  rainfall: { recent: { amount: 0.2 } },
  season: "spring",
  moon: {},
  platform: {}
});
assert("observe cards produced", observeCards.length >= 2);
assertClean("observe cards", observeCards);
assert(
  "observe CTAs stay inside current products",
  observeCards.every((c) => {
    const label = (c.link && c.link.label) || "";
    const href = (c.link && c.link.href) || "";
    return !/fieldry|foragecast|landscape-interpretation/i.test(label + href);
  })
);

const engine = loadModules(["design-system/js/wds-content-engine.js"]);
const retiredFeature = engine.WDS.contentEngine.renderHome(
  { featuredProject: { name: "ForageCast", href: "apps/foragecast/", toolLabel: "Visit ForageCast" } },
  { sections: ["foragecast"], includeCitizenScience: false, includeMethodology: false }
);
assert("retired featured project is skipped", retiredFeature === "");
assertClean("retired featured project html", retiredFeature);
const experiences = engine.WDS.contentEngine.renderHome(
  { experiences: [{ href: "apps/scenes/", name: "Scenes", slug: "scenes", status: "live" }] },
  { sections: ["experiences"] }
);
assertClean("content-engine experiences intro", experiences);
assert("experiences intro names current products", /Dashboard/.test(experiences) && /Shed Hunting/.test(experiences));

const wdsLoader = read("design-system/js/wds.js");
const listStart = wdsLoader.indexOf('["wds-core.js"');
const listEnd = wdsLoader.indexOf("].forEach");
assert("wds.js module list parsed", listStart >= 0 && listEnd > listStart);
if (listStart >= 0 && listEnd > listStart) {
  const modules = JSON.parse(wdsLoader.slice(listStart, listEnd + 1));
  for (const rel of modules) {
    const src = read("design-system/js/" + rel);
    const quoted = src.match(QUOTED_IDENTITY);
    assert(
      "public runtime " + rel + " has no quoted discontinued identity",
      !quoted,
      quoted ? quoted[0] : ""
    );
    const phraseHits = LEAK_PHRASES.filter((phrase) => src.includes(phrase));
    assert(
      "public runtime " + rel + " omits discontinued CTA copy",
      phraseHits.length === 0,
      phraseHits.join(", ")
    );
  }
}

const publicSurfaces = [
  "index.html",
  "about.html",
  "support.html",
  "settings.html",
  "apps/dashboard/index.html",
  "apps/scenes/index.html",
  "apps/shed-hunting/index.html",
  "side-trails/waypoint-deck/index.html",
  "deep-forest-dispatch/index.html"
];
for (const rel of publicSurfaces) {
  const html = read(rel);
  assertClean("public surface " + rel, html);
}
assert("Deep Forest Dispatch remains", /Deep Forest Dispatch/.test(read("deep-forest-dispatch/index.html")));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\n" + passed + " passed.");
