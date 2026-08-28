#!/usr/bin/env node
/**
 * Platform integration (Phase 3) — identity, observations bridge, places,
 * search, notifications, graph, workflows.
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
function assert(name, cond, detail) {
  if (cond) pass(name);
  else fail(name, detail || "assertion failed");
}

function makeStorage() {
  const s = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null;
    },
    setItem(k, v) {
      s[k] = String(v);
    },
    removeItem(k) {
      delete s[k];
    }
  };
}

function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

function run() {
  global.window = global;
  global.addEventListener = () => {};
  global.document = {
    readyState: "complete",
    documentElement: { dataset: {} },
    addEventListener() {},
    createElement: () => ({ setAttribute() {}, style: {} }),
    body: { insertBefore() {} },
    getElementById: () => null
  };
  global.localStorage = makeStorage();
  global.sessionStorage = makeStorage();

  load("design-system/js/platform/wds-platform-catalog.js");
  load("design-system/js/platform/wds-platform-stores.js");
  load("design-system/js/platform/wds-platform-observations.js");
  load("design-system/js/platform/wds-platform-places.js");
  load("design-system/js/platform/wds-platform-search.js");
  load("design-system/js/platform/wds-platform-notifications.js");
  load("design-system/js/platform/wds-platform-graph.js");
  load("design-system/js/platform/wds-platform-workflows.js");
  load("design-system/js/platform/wds-platform-identity.js");

  assert("stores present", !!(global.WDS.platform && global.WDS.platform.Profile));
  assert("observations present", !!global.WDS.platformObservations);
  assert("places present", !!global.WDS.platformPlaces);
  assert("search present", !!global.WDS.platformSearch);
  assert("notifications present", !!global.WDS.platformNotifications);
  assert("graph present", !!global.WDS.platformGraph);
  assert("workflows present", !!global.WDS.platformWorkflows);
  assert("identity present", !!global.WDS.platformIdentity);

  const ensured = global.WDS.platformIdentity.ensure();
  assert("identity ensure", !!(ensured && ensured.profile && ensured.settings));
  assert("settings has units", !!(ensured.settings.units && ensured.settings.units.measurementSystem));
  assert("settings has theme", !!(ensured.settings.theme && ensured.settings.theme.mode));

  global.WDS.platform.Profile.setDisplayName("Trail Walker");
  assert("display name", global.WDS.platformIdentity.displayName() === "Trail Walker");
  global.WDS.platformIdentity.linkApp("fieldry", { role: "primary" });
  assert("linked app", !!global.WDS.platform.Profile.load().linkedApps.fieldry);

  // Seed Fieldry + Sheds
  global.localStorage.setItem(
    "waypoint-fieldry-observations-v1",
    JSON.stringify([
      {
        id: "obs_1",
        recordedAt: "2026-03-01T12:00:00.000Z",
        taxon: { commonName: "White-tailed Deer", scientificName: "Odocoileus virginianus" },
        location: { county: "Pike", state: "PA", latitude: 41.3, longitude: -74.9 }
      }
    ])
  );
  global.localStorage.setItem(
    "waypoint-sheds-observations-v1",
    JSON.stringify([
      {
        id: "sh_1",
        type: "deer_sign",
        speciesId: "odocoileus-virginianus",
        observedAt: "2026-03-02T12:00:00.000Z",
        location: { lat: 41.31, lng: -74.91 }
      }
    ])
  );

  const all = global.WDS.platformObservations.list();
  assert("unified list has both apps", all.length >= 2);
  assert(
    "fieldry envelope",
    all.some((o) => o.sourceApp === "fieldry" && /deer/i.test(o.title))
  );
  assert(
    "sheds envelope",
    all.some((o) => o.sourceApp === "shed-hunting" && o.kind === "sheds-observation")
  );
  const wild = global.WDS.platformObservations.wildlifeContext();
  assert("wildlife context counts", wild.fieldryCount === 1 && wild.shedsCount === 1);
  assert("wildlife honesty", /private/i.test(wild.honesty));

  // Places
  const place = global.WDS.platform.Locations.create({
    label: "Home ridge",
    lat: 41.3,
    lng: -74.9,
    county: "Pike",
    state: "PA"
  });
  global.WDS.platform.Locations.save(place);
  global.WDS.platformPlaces.remember(place);
  assert("saved places", global.WDS.platformPlaces.saved().length >= 1);
  assert("recent places", global.WDS.platformPlaces.recent().length >= 1);

  // Search
  const res = global.WDS.platformSearch.search("deer fieldry", { depth: 0, limit: 20 });
  assert("search finds results", res.total >= 1);
  assert("search honesty", /local|private|knowledge/i.test(res.honesty));
  assert(
    "search groups",
    Object.keys(res.groups).length >= 1
  );

  // Notifications opt-in
  assert("ntf disabled by default", global.WDS.platformNotifications.isEnabled() === false);
  assert(
    "ntf blocked when disabled",
    global.WDS.platformNotifications.add({ title: "Test reminder" }) === null
  );
  global.WDS.platform.Settings.patch({ notifications: { enabled: true } });
  assert(
    "ntf allowed when enabled",
    !!global.WDS.platformNotifications.add({ title: "Season note", body: "Spring green-up" })
  );
  assert("ntf list", global.WDS.platformNotifications.list().length >= 1);

  // Graph
  global.WDS.platformGraph.seedArchitecture();
  const related = global.WDS.platformGraph.related("app:fieldry");
  assert("graph seeds fieldry edges", related.length >= 2);
  const derived = global.WDS.platformGraph.deriveFromObservations();
  assert("graph derives from observations", derived >= 1);

  // Workflows — public handoffs stay inside the five-effort portfolio
  const wf = global.WDS.platformWorkflows.forApp("shed-hunting");
  assert("sheds workflows point at Studio", wf.some((w) => w.to === "dashboard"));
  assert("sheds workflows omit Fieldry", !wf.some((w) => w.to === "fieldry"));
  const html = global.WDS.platformWorkflows.renderLinksHtml("shed-hunting", {
    depth: 1,
    when: "after-observation"
  });
  assert("workflow html", /Dashboard/i.test(html) && /wds-workflows/.test(html) && !/Fieldry/i.test(html));

  // Files / docs exist
  const required = [
    "settings.html",
    "design-system/js/platform/wds-platform-observations.js",
    "design-system/js/platform/wds-platform-places.js",
    "design-system/js/platform/wds-platform-search.js",
    "design-system/js/platform/wds-platform-notifications.js",
    "design-system/js/platform/wds-platform-graph.js",
    "design-system/js/platform/wds-platform-workflows.js",
    "design-system/js/platform/wds-platform-identity.js",
    "docs/PLATFORM-INTEGRATION-REPORT.md",
    "docs/PLATFORM-CROSS-APP-WORKFLOWS.md",
    "docs/PLATFORM-KNOWLEDGE-GRAPH-ARCHITECTURE.md",
    "docs/PLATFORM-SHARED-SERVICES-INVENTORY.md",
    "docs/PLATFORM-INTEGRATION-CHANGELOG.md",
    "docs/PLATFORM-INTEGRATION-OPPORTUNITIES.md",
    "docs/PLATFORM-INTEGRATION-TECHNICAL-DEBT.md"
  ];
  required.forEach((rel) => {
    assert("exists " + rel, fs.existsSync(path.join(ROOT, rel)));
  });

  const wds = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
  assert("wds.js loads observations", /wds-platform-observations\.js/.test(wds));
  assert("wds.js loads search", /wds-platform-search\.js/.test(wds));
  assert("wds.js loads identity", /wds-platform-identity\.js/.test(wds));

  const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert("home has Dashboard", /apps\/dashboard\//.test(home));
  assert("home has Deck", /waypoint-deck/.test(home));

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll platform integration tests passed.");
}

run();
