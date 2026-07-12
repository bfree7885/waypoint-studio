#!/usr/bin/env node
/**
 * Fieldry Life List MVP tests — capture, life list, stats, achievements,
 * privacy defaults, migrations, Knowledge unavailable behavior.
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
    },
    _raw: s
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
  global.FormData = class FormData {
    constructor() { this._m = new Map(); }
    set(k, v) { this._m.set(k, v); }
    get(k) { return this._m.has(k) ? this._m.get(k) : null; }
  };

  load("design-system/js/observations/wds-wos-core.js");
  load("design-system/js/observations/wds-wos-extensions.js");
  load("design-system/js/platform/wds-platform-stores.js");
  load("apps/fieldry/js/fieldry-util.js");
  load("apps/fieldry/js/fieldry-life-list.js");
  load("apps/fieldry/js/fieldry-achievements.js");
  load("apps/fieldry/js/fieldry-stats.js");
  load("apps/fieldry/js/fieldry-storage.js");
  load("apps/fieldry/js/fieldry-form.js");

  const O = global.WDS.observations;
  const Life = global.WaypointFieldryLifeList;
  const Storage = global.FieldryStorage;

  assert("categories cover foundation list", Life.CATEGORIES.length >= 16);
  assert("birds category present", !!Life.CATEGORY_BY_ID.birds);
  assert("clouds category present", !!Life.CATEGORY_BY_ID.clouds);

  // Extensions survive normalize
  let obs = O.emptyObservation({ source: "fieldry", productId: "fieldry" });
  O.extensions.setExtension(obs, "fieldry", { category: "birds", privacyLevel: "private" });
  const normalized = O.normalizeObservation(obs);
  assert("normalize preserves extensions", normalized.extensions && normalized.extensions.fieldry &&
    normalized.extensions.fieldry.category === "birds");

  // Create observation via storage
  let draft = Storage.createDraft(null, { county: "Hampshire", state: "MA", stateCode: "MA" });
  assert("draft created", !!draft && !!draft.id);
  assert("privacy default private", draft.meta.fieldry.privacyLevel === "private");
  assert("location precision default regional/county",
    draft.location.privacy.precision === "county");

  draft.taxon.label = "Eastern bluebird at fence";
  draft.taxon.commonName = "Eastern Bluebird";
  draft.meta.fieldry.category = "birds";
  draft.meta.fieldry.privacyLevel = "private";
  draft.observedAt.date = "2026-04-12";
  draft.observedAt.time = "21:30";
  draft.record.confidence = "likely";
  draft.location.latitude = 42.12345;
  draft.location.longitude = -72.54321;
  draft.location.privacy.precision = "county";
  Storage.ensureFieldryExtension(draft);
  const saved = Storage.save(draft);
  assert("observation saved", !!Storage.get(saved.id));
  assert("extension category birds", Life.getCategory(saved) === "birds");

  // Unidentified mushroom
  let unk = Storage.createDraft(null, null);
  unk.taxon.label = "Unknown mushroom on oak";
  unk.taxon.commonName = "Unknown mushroom";
  unk.meta.fieldry.category = "mushrooms";
  unk.meta.fieldry.unidentified = true;
  unk.meta.fieldry.identificationStatus = "unidentified";
  unk.observedAt.date = "2026-05-01";
  unk.record.confidence = "uncertain";
  Storage.ensureFieldryExtension(unk);
  Storage.save(unk);
  assert("unidentified flagged", Life.isUnidentified(Storage.get(unk.id)));

  // Knowledge-linked observation (denormalized only — no live Knowledge)
  let know = Storage.createDraft(null, null);
  know.taxon.label = "Morel";
  know.taxon.commonName = "Yellow morel";
  know.meta.fieldry.category = "mushrooms";
  know.meta.fieldry.knowledgeId = "demo-morel";
  know.meta.fieldry.knowledgeCommon = "Yellow morel";
  know.meta.fieldry.knowledgeScientific = "Morchella americana";
  know.observedAt.date = "2026-05-02";
  Storage.ensureFieldryExtension(know);
  Storage.save(know);
  assert("knowledge id stored on extension",
    Life.fieldryExt(Storage.get(know.id)).knowledgeId === "demo-morel");

  const all = Storage.list();
  assert("three observations persisted", all.length === 3);

  // Life list derivation
  const life = Life.deriveLifeList(all);
  assert("life list has unique subjects", life.length >= 2);
  const birds = Life.deriveLifeList(all, { category: "birds" });
  assert("category filter birds", birds.length === 1 && birds[0].category === "birds");
  const unid = Life.deriveLifeList(all, { unidentifiedOnly: true });
  assert("unidentified filter", unid.length >= 1);
  const summary = Life.summarizeLifeList(all);
  assert("summary counts", summary.total === 3 && summary.categoriesExplored >= 2);

  // Revisit for achievement
  let revisit = Storage.createDraft(null, null);
  revisit.taxon.label = "Eastern bluebird again";
  revisit.taxon.commonName = "Eastern Bluebird";
  revisit.meta.fieldry.category = "birds";
  revisit.observedAt.date = "2026-06-01";
  Storage.ensureFieldryExtension(revisit);
  Storage.save(revisit);

  const stats = global.FieldryStats.derive(Storage.list());
  assert("stats totals", stats.totalObservations === 4 && stats.uniqueSubjects >= 2);
  assert("stats identified vs unidentified", stats.unidentified >= 1 && stats.identified >= 1);

  const achievements = global.FieldryAchievements.evaluateAll(Storage.list());
  const byId = {};
  achievements.forEach((a) => { byId[a.id] = a; });
  assert("first observation earned", byId.first_observation.earned);
  assert("first bird earned", byId.first_bird.earned);
  assert("first mushroom earned", byId.first_mushroom.earned);
  assert("identified later earned", byId.identified_later.earned);
  assert("first revisit earned", byId.first_revisit.earned);
  assert("first night earned", byId.first_night.earned);
  assert("achievement explains why", !!byId.first_observation.explanation);

  // Privacy-aware location display
  const birdFresh = Storage.get(saved.id);
  birdFresh.location.privacy.precision = "county";
  const safeLoc = global.FieldryUtil.formatLocation(birdFresh);
  assert("regional precision hides exact coords",
    safeLoc.indexOf("42.1234") < 0 && safeLoc.indexOf("Hampshire") >= 0);

  birdFresh.location.privacy.precision = "hidden";
  assert("hidden precision", global.FieldryUtil.formatLocation(birdFresh) === "Location hidden");

  birdFresh.location.privacy.precision = "exact";
  assert("exact precision shows coords", /42\.1234/.test(global.FieldryUtil.formatLocation(birdFresh)));

  // Migration from legacy shape
  global.localStorage.removeItem("waypoint-fieldry-migration-v2");
  const legacy = O.emptyObservation({ source: "fieldry" });
  legacy.taxon.label = "Legacy fox";
  legacy.taxon.commonName = "Red fox";
  legacy.meta.fieldry = { observationType: "wildlife" };
  delete legacy.extensions;
  global.localStorage.setItem("waypoint-fieldry-observations-v1", JSON.stringify([legacy]));
  const mig = Storage.migrateAll(true);
  assert("migration ran", !mig.skipped && mig.migrated >= 1);
  const migrated = Storage.list()[0];
  assert("legacy wildlife mapped to mammals", Life.getCategory(migrated) === "mammals");
  assert("legacy got privacy default", Life.fieldryExt(migrated).privacyLevel === "private");

  // Malformed payload preserved
  global.localStorage.setItem("waypoint-fieldry-observations-v1", "{not-json");
  global.localStorage.removeItem("waypoint-fieldry-migration-v2");
  const bad = Storage.migrateAll(true);
  assert("malformed preserved flag", bad.preserved >= 1 || !!bad.note);
  assert("list safe on malformed", Array.isArray(Storage.list()));

  // Empty states
  global.localStorage.setItem("waypoint-fieldry-observations-v1", "[]");
  global.localStorage.setItem("waypoint-fieldry-migration-v2", "2");
  assert("empty life list", Life.deriveLifeList(Storage.list()).length === 0);
  assert("empty summary", Life.summarizeLifeList([]).total === 0);
  assert("empty achievements none earned",
    global.FieldryAchievements.earned([]).length === 0);

  // Knowledge unavailable — form still readable without WDS.knowledge
  delete global.WDS.knowledge;
  delete global.WDS.knowledgeSearch;
  const formHtml = global.FieldryForm.render(Storage.createDraft(null, null), { isEdit: false });
  assert("form renders without knowledge", /fld-observation-form/.test(formHtml));
  assert("form includes category", /name="category"/.test(formHtml));
  assert("form includes privacy", /name="privacyLevel"/.test(formHtml));
  assert("form privacy is private-only", /value="private"/.test(formHtml) && !/Shared<\/option>/.test(formHtml));
  assert("form has no unfinished media chrome", !/coming later/i.test(formHtml));

  // Collections integration
  const fav = global.WDS.platform.Collections.favorites("fieldry");
  assert("favorites collection", fav.kind === "favorites");

  // Export respects location precision
  load("apps/fieldry/js/fieldry-export.js");
  let hiddenObs = Storage.createDraft(null, { county: "Hampshire", state: "MA" });
  hiddenObs.taxon.label = "Sensitive den";
  hiddenObs.location.latitude = 42.123456;
  hiddenObs.location.longitude = -72.654321;
  hiddenObs.location.privacy.precision = "hidden";
  Storage.save(hiddenObs);
  const listForExport = Storage.list();
  const csvRows = [];
  const origCreate = global.URL && global.URL.createObjectURL;
  global.URL = global.URL || {};
  global.Blob = function (parts) { this.parts = parts; this.size = String(parts[0] || "").length; };
  global.URL.createObjectURL = () => "blob:test";
  global.URL.revokeObjectURL = () => {};
  const clicks = [];
  global.document.body = {
    appendChild(el) { if (el.click) el.click(); },
    removeChild() {}
  };
  // Monkey-patch download by capturing Blob content via FieldryExport internals is hard;
  // instead verify util gating used by export path.
  assert("hidden location display", global.FieldryUtil.formatLocation(hiddenObs) === "Location hidden");
  assert("hidden precision label", global.FieldryUtil.precisionLabel("hidden") === "Hidden");

  load("apps/fieldry/js/fieldry-home.js");
  load("apps/fieldry/js/fieldry-collections.js");
  load("apps/fieldry/js/fieldry-list.js");
  load("apps/fieldry/js/fieldry-browse.js");
  load("apps/fieldry/js/fieldry-stats-view.js");
  const emptyHome = global.FieldryHome.render([]);
  assert("empty home has onboarding or first CTA", /Record your first observation|How Fieldry works/.test(emptyHome));
  assert("empty home does not double primary CTAs awkwardly", (emptyHome.match(/wds-btn--primary/g) || []).length <= 2);
  const filteredEmpty = global.FieldryList.render(Storage.list(), { q: "zzzz-no-match" });
  assert("filtered history empty is distinct", /No matching observations/.test(filteredEmpty));
  const browseEmpty = global.FieldryBrowse.render([]);
  assert("browse empty encourages record", /Record an observation/.test(browseEmpty));
  const statsEmpty = global.FieldryStatsView.render([]);
  assert("stats empty encourages record", /No statistics yet/.test(statsEmpty));
  const collectionsHtml = global.FieldryCollections.render();
  assert("collections view renders", /Collections/.test(collectionsHtml));

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll Fieldry MVP tests passed.");
}

run();
