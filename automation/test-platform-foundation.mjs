#!/usr/bin/env node
/**
 * Platform foundation smoke tests — catalog, stores, shell, WOS extensions, future data gate.
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

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInThisContext(code, { filename: file });
}

function makeLocalStorage() {
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

function run() {
  global.window = global;
  global.document = {
    readyState: "complete",
    documentElement: { getAttribute: () => null },
    querySelector: () => null,
    addEventListener: () => {}
  };
  global.localStorage = makeLocalStorage();

  load("design-system/js/platform/wds-platform-catalog.js");
  load("design-system/js/platform/wds-platform-stores.js");
  load("design-system/js/platform/wds-platform-shell.js");
  load("design-system/js/platform/wds-platform-foundation.js");
  load("design-system/js/platform/wds-platform-future-data.js");
  load("design-system/js/observations/wds-wos-core.js");
  load("design-system/js/observations/wds-wos-extensions.js");
  load("apps/shed-hunting/js/sheds-models.js");
  load("apps/steepleaf/js/steepleaf-models.js");
  load("apps/signalterrain/js/signalterrain-models.js");
  load("apps/savant-sommelier/js/savant-models.js");
  load("apps/fieldry/js/fieldry-life-list.js");

  const Cat = global.WDS.platformCatalog;
  assert("catalog has core products", Cat.list({ coreOnly: true }).length >= 4);
  assert("catalog has foundations", Cat.list({ tier: "foundation" }).length >= 4);
  assert("resolve sheds href", /shed-hunting/.test(Cat.resolveHref(Cat.byId("sheds"), 1)));

  const topbar = global.WDS.platformShell.renderTopbar({ depth: 1, currentId: "fieldry" });
  assert("shell topbar renders", /ws-topnav/.test(topbar) && /Fieldry/.test(topbar));
  assert("shell marks current", /aria-current="page"/.test(topbar));

  const profile = global.WDS.platform.Profile.load();
  assert("profile private default", profile.privacy.visibility === "private");
  global.WDS.platform.Profile.setDisplayName("Field naturalist");
  assert("profile saves", global.WDS.platform.Profile.load().displayName === "Field naturalist");

  const loc = global.WDS.platform.Locations.create({ label: "Home woods", lat: 41.3, lng: -75.0 });
  global.WDS.platform.Locations.save(loc);
  assert("locations save", global.WDS.platform.Locations.list().length === 1);

  const fav = global.WDS.platform.Collections.favorites("fieldry");
  global.WDS.platform.Collections.addItem(fav.id, "item-1");
  assert("collections favorites", global.WDS.platform.Collections.list()[0].itemIds.indexOf("item-1") >= 0);

  const settings = global.WDS.platform.Settings.load();
  assert("settings sync off", settings.data.syncEnabled === false);
  assert("subscription readiness", settings.subscription.readiness === true);

  const foundationHtml = global.WDS.platformFoundation.render({
    title: "Sheds",
    status: "foundation",
    lead: "Test",
    modules: [{ title: "Species", status: "foundation", description: "Cervids" }]
  });
  assert("foundation render", /Sheds/.test(foundationHtml) && /What you can explore/.test(foundationHtml));

  const env = global.WDS.observations.extensions.createEnvelope({
    application: "shed-hunting",
    observationType: "shed-find",
    privacy: "private"
  });
  assert("envelope id", /^obs_/.test(env.id));
  assert("envelope privacy", env.privacy === "private");
  global.WDS.observations.extensions.setExtension(env, "shed-hunting", { speciesId: "elk" });
  assert("extension set", env.extensions["shed-hunting"].speciesId === "elk");

  assert("future data disabled", global.WDS.futureData.ENABLED === false);
  assert("future gis blocked", global.WDS.futureData.gisExport.exportGeoJSON().enabled === false);
  assert("no marketplace hook name", !("marketplace" in global.WDS.futureData));

  assert("sheds species count", global.WaypointSheds.SPECIES.length >= 9);
  const find = global.WaypointSheds.createFind({ speciesId: "cervus-canadensis" });
  assert("shed find private", find.privacy === "private" && find.location.privacy === "private");

  const tea = global.WaypointSteepleaf.createTea({ name: "Dragonwell" });
  global.WaypointSteepleaf.saveTea(tea);
  assert("steepleaf tea store", global.WaypointSteepleaf.listTeas().length === 1);

  const rx = global.WaypointSignalTerrain.createReceiver({ label: "Scanner A" });
  global.WaypointSignalTerrain.saveReceiver(rx);
  assert("signalterrain receiver", global.WaypointSignalTerrain.listReceivers().length === 1);

  const site = global.WaypointSavant.createSite({ label: "Ridge parcel" });
  global.WaypointSavant.saveSite(site);
  assert("savant site", global.WaypointSavant.listSites().length === 1);

  const life = global.WaypointFieldryLifeList.summarizeLifeList([]);
  assert("fieldry categories", global.WaypointFieldryLifeList.CATEGORIES.length >= 15);
  assert("life list empty total", life.total === 0);

  // Foundation JSON files exist
  [
    "apps/shed-hunting/data/foundation.json",
    "apps/steepleaf/data/foundation.json",
    "apps/signalterrain/data/foundation.json",
    "apps/savant-sommelier/data/foundation.json"
  ].forEach((f) => {
    const raw = fs.readFileSync(path.join(ROOT, f), "utf8");
    const json = JSON.parse(raw);
    assert("foundation json " + f, json.title && json.modules && json.modules.length > 0);
  });

  if (failures.length) {
    console.log("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll platform foundation tests passed.");
}

run();
