#!/usr/bin/env node
/**
 * ForageCast land companion — profile + Today planner tests
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
  URLSearchParams: globalThis.URLSearchParams
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

load("js/foragecast-profile.js", sandbox);
load("js/foragecast-today.js", sandbox);

const Profile = sandbox.ForageCastProfile;
const Today = sandbox.ForageCastToday;

assert("profile defaults empty features", Profile.loadProperty().features.length === 0);
Profile.saveProperty({ features: ["apple-trees", "vegetable-garden", "compost"], name: "Ridge" });
Profile.saveIntent({ priorities: ["orchard-management", "grow-food"] });
assert("property persisted", Profile.loadProperty().features.indexOf("apple-trees") >= 0);
assert("intent persisted", Profile.loadIntent().priorities.indexOf("orchard-management") >= 0);

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

assert("plan has actions", plan.actions.length >= 3 && plan.actions.length <= 10);
assert("skip watering appears when rain expected", plan.actions.some((a) => /skip watering|Skip watering|Skip orchard/i.test(a.title)));
assert("only property features", plan.actions.every((a) => {
  if (!a.features || !a.features.length) return true;
  return a.features.some((f) => Profile.loadProperty().features.indexOf(f) >= 0);
}));
assert("mission present", /Understand the season/i.test(plan.mission));

const emptyPlan = Today.buildPlan({
  property: { features: [] },
  intent: { priorities: ["forage"] },
  now: new Date("2026-07-12T12:00:00Z")
});
assert("unconfigured suggests property setup", emptyPlan.actions.some((a) => a.id === "setup-property"));

const pillars = JSON.parse(fs.readFileSync(path.join(FC, "data/pillars.json"), "utf8"));
assert("six content pillars + today", pillars.pillars.length >= 6);
assert("property features catalog", pillars.propertyFeatures.length >= 10);
assert("intents catalog", pillars.intents.length >= 6);

const nav = JSON.parse(fs.readFileSync(path.join(ROOT, "design-system/ecosystem/nav-registry.json"), "utf8"));
const fc = nav.apps.find((a) => a.id === "foragecast");
assert("nav Today feature", fc.features.some((f) => f.id === "today"));
assert("nav Property feature", fc.features.some((f) => f.id === "property"));
assert("nav Orchard feature", fc.features.some((f) => f.id === "orchard"));
assert("no separate Leafturn app", !nav.apps.some((a) => /leafturn/i.test(a.id + a.title)));

assert("property page exists", fs.existsSync(path.join(FC, "property.html")));
assert("pillar page exists", fs.existsSync(path.join(FC, "pillar.html")));
assert("foraging page exists", fs.existsSync(path.join(FC, "foraging.html")));

console.log("\nAll ForageCast land companion tests passed (" + n + ").");
