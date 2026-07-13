#!/usr/bin/env node
/**
 * ForageCast property profiles + land companion tests
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FC = path.join(ROOT, "apps/foragecast");

let n = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  n += 1;
}

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(FC, rel), "utf8"), sandbox, { filename: rel });
}

const store = {};
const sandbox = {
  window: {},
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  Date,
  Math,
  console,
  URLSearchParams: globalThis.URLSearchParams,
  indexedDB: undefined,
  Image: undefined,
  document: undefined
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

load("js/foragecast-profile.js", sandbox);
load("js/foragecast-today.js", sandbox);

const Profile = sandbox.ForageCastProfile;
const Today = sandbox.ForageCastToday;
const catalog = JSON.parse(fs.readFileSync(path.join(FC, "data/property-catalog.json"), "utf8"));

assert("needs wizard on empty profile", Profile.needsWizard(Profile.defaultProperty()));

const rich = Profile.defaultProperty();
rich.name = "Ridge Hollow";
rich.locationLabel = "Pike County, PA";
rich.usdaZone = "6a";
rich.acreage = "3";
rich.goals = ["orchard-management", "grow-food"];
rich.landTypes = ["woodland", "meadow"];
rich.orchard = [
  { id: "t1", species: "apple", quantity: 6, age: "established", notes: "Honeycrisp" },
  { id: "t2", species: "pear", quantity: 2, age: "young", notes: "" }
];
rich.berries = ["blueberries", "blackberries"];
rich.gardenTypes = ["raised-beds"];
rich.infrastructure = ["mushroom-logs", "compost", "apiary"];
rich.water = ["pond"];
rich.wildlife = ["pollinator-gardens"];
rich.wizardCompleted = true;

const saved = Profile.saveProperty(rich, catalog);
assert("derived apple-trees", saved.features.indexOf("apple-trees") >= 0);
assert("derived pear-trees", saved.features.indexOf("pear-trees") >= 0);
assert("derived vegetable-garden", saved.features.indexOf("vegetable-garden") >= 0);
assert("derived wild-edges from woodland", saved.features.indexOf("wild-edges") >= 0);
assert("derived beehives from apiary", saved.features.indexOf("beehives") >= 0);
assert("configured after save", Profile.isConfigured(saved));
assert("intent synced from goals", Profile.loadIntent().priorities.indexOf("orchard-management") >= 0);

const sum = Profile.summarize(saved, catalog);
assert("summary counts trees", sum.orchardTreeCount === 8);
assert("summary includes 6× Apple", sum.labels.some((l) => /6× Apple/.test(l)));

const plan = Today.buildPlan({
  property: Profile.loadProperty(),
  intent: Profile.loadIntent(),
  platform: {
    calendar: { season: "summer" },
    modules: { weather: { daily: [{ precipitationSum: 20, temperatureMax: 28, temperatureMin: 14 }] } }
  },
  now: new Date("2026-07-12T12:00:00Z"),
  limit: 8
});
assert("plan uses orchard actions", plan.actions.some((a) => a.pillar === "orchard" || /apple|peach|blueberry|orchard|Skip/i.test(a.title)));
assert("only derived features", plan.actions.every((a) => {
  if (!a.features || !a.features.length) return true;
  return a.features.some((f) => saved.features.indexOf(f) >= 0);
}));

// v1 migration
store[Profile.PROFILE_KEY] = JSON.stringify({
  version: 1,
  name: "Old",
  features: ["apple-trees", "vegetable-garden"],
  notes: ""
});
const migrated = Profile.loadProperty();
assert("migrates to v2", migrated.version === 2);
assert("migrates orchard apple", migrated.orchard.some((t) => t.species === "apple"));
assert("migrates garden", migrated.gardenTypes.indexOf("vegetable-garden") >= 0);

assert("catalog has orchard species", catalog.orchardSpecies.length >= 10);
assert("catalog has land types", catalog.landTypes.length >= 10);
assert("catalog has wildlife", catalog.wildlife.length >= 5);
assert("wizard page exists", fs.existsSync(path.join(FC, "property-setup.html")));
assert("overview scripts exist", fs.existsSync(path.join(FC, "js/foragecast-property-overview.js")));
assert("wizard scripts exist", fs.existsSync(path.join(FC, "js/foragecast-property-wizard.js")));

const emptyPlan = Today.buildPlan({
  property: Profile.defaultProperty(),
  intent: { priorities: ["forage"] },
  now: new Date("2026-07-12T12:00:00Z")
});
assert("setup CTA points to wizard", emptyPlan.actions.some((a) => a.href === "property-setup.html"));

console.log("\nAll ForageCast property profile tests passed (" + n + ").");
