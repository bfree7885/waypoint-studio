#!/usr/bin/env node
/**
 * Scenes Sprint 1 — four-pillar foundation + Photo Coach SoT checks
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  passed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

// --- Landing: four pillars ---
const landing = read("apps/waypoint-scenes/index.html");
assert("landing exists", exists("apps/waypoint-scenes/index.html"));
assert("landing mission", /Observe\.\s*Discover\.\s*Understand\./.test(landing));
assert("landing tagline", /Capture what you find\.\s*Learn why it matters\./.test(landing));
assert("pillar LEARN", /LEARN/.test(landing) && /Photo Coach/.test(landing));
assert("pillar CREATE", /CREATE/.test(landing) && /Living Scenes/.test(landing));
assert("pillar REMEMBER", /REMEMBER/.test(landing) && /Outdoor Journals/.test(landing));
assert("pillar EXPLORE", /EXPLORE/.test(landing) && /Hidden Landscapes/.test(landing));
assert("LEARN routes to photo-coach", /href="\.\.\/photo-coach\/"/.test(landing));
assert("CREATE routes to create/", /href="create\/"/.test(landing));
assert("REMEMBER routes to remember/", /href="remember\/"/.test(landing));
assert("EXPLORE routes to explore/", /href="explore\/"/.test(landing));
assert("landing has no Coach host", !/id="mode-coach"/.test(landing));
assert("landing has no Grade UI", !/\bGrade\b/.test(landing) && !/\bAssignment\b/.test(landing));
assert("legacy coach query redirects", /mode"\) === "coach"/.test(landing) || /mode.*?coach/.test(landing));

// --- Foundation pages ---
const remember = read("apps/waypoint-scenes/remember/index.html");
assert("remember foundation note", /Foundation in progress/.test(remember));
assert("remember disabled CTA", /disabled/.test(remember) && /not available yet/i.test(remember));
assert("remember intended outputs", /Hiking journals/.test(remember) && /Year in Nature/.test(remember));
assert("remember no fake upload", !/type="file"/.test(remember));

const explore = read("apps/waypoint-scenes/explore/index.html");
assert("explore lists ways of seeing", /Infrared/i.test(explore) && /Polarization/i.test(explore));
assert("explore links live studio", /hidden-landscapes\//.test(explore));

const create = read("apps/waypoint-scenes/create/index.html");
assert("create is Living Scenes", /Living Scenes/.test(create) && /CREATE/.test(create));
assert("create has no mode-coach host", !/id="mode-coach"/.test(create));
assert("create coach query redirects", /mode"\) === "coach"/.test(create) || /photo-coach\//.test(create));
assert("create upload is real", /id="file-input"/.test(create));

// --- Canonical Photo Coach ---
const coach = read("apps/photo-coach/index.html");
assert("photo-coach is SoT page", /Photo Coach/.test(coach));
assert("photo-coach links back to Scenes", /waypoint-scenes\//.test(coach));
assert("photo-coach no Grade heading", !/>\s*Grade\s*</.test(coach) && !/\bAssignment\b/.test(coach));
assert("photo-coach no Homework/Lesson labels", !/\bHomework\b/.test(coach) && !/\bLesson\b/.test(coach));
assert("photo-coach upload controls present", /id="coach-file-input"/.test(coach) && /id="coach-drop-zone"/.test(coach));

// --- Redirects ---
assert("apps/scenes redirects", /waypoint-scenes\//.test(read("apps/scenes/index.html")));
assert("scenes/ redirects", /waypoint-scenes\//.test(read("scenes/index.html")));
assert("living-scenes redirects to create", /waypoint-scenes\/create\//.test(read("apps/scenes/living-scenes/index.html")));
assert("scene-builder redirects to create", /waypoint-scenes\/create\//.test(read("apps/scenes/scene-builder/index.html")));

// --- Nav ---
const nav = read("design-system/js/platform/wds-app-nav-config.js");
assert("nav Scenes route", /"route":\s*"apps\/waypoint-scenes\/"/.test(nav));
assert("nav Photo Coach feature", /"href":\s*"apps\/photo-coach\/"/.test(nav));
assert("nav Outdoor Journals", /outdoor-journals/.test(nav) && /remember\//.test(nav));
const registry = read("design-system/ecosystem/nav-registry.json");
assert("nav-registry Scenes route", /"route":\s*"apps\/waypoint-scenes\/"/.test(registry));

// --- Consumer tip aliases in schema / analysis ---
const schema = read("apps/waypoint-scenes/js/photo-coach-schema.js");
assert("schema nextObservation", /nextObservation/.test(schema));
assert("schema fieldSuggestion", /fieldSuggestion/.test(schema));

const demo = read("apps/waypoint-scenes/js/photo-coach-analysis-demo.js");
assert("demo sets nextObservation", /nextObservation:\s*tip/.test(demo));
assert("demo sets fieldSuggestion", /fieldSuggestion:\s*tip/.test(demo));

const profile = read("apps/waypoint-scenes/js/photo-coach-profile.js");
assert("profile markSuggestionTried", /markSuggestionTried/.test(profile));

const coachJs = read("apps/waypoint-scenes/js/photo-coach.js");
assert("renderReadingCard present", /function renderReadingCard/.test(coachJs));
assert("no Complete assignment CTA string", !/Complete assignment/i.test(coachJs));
assert("tip prefers nextObservation", /c\.nextObservation/.test(coachJs));

const shoot = read("apps/waypoint-scenes/js/photo-coach-shoot.js");
assert("filmstrip uses frame index not letter grade UI", /String\(idx \+ 1\)/.test(shoot));
assert("shoot summary no letter grade badge", !/pc-shoot-summary__letter/.test(shoot));

// --- Mobile / a11y landmarks on landing ---
assert("landing skip link", /Skip to content/.test(landing));
assert("landing main landmark", /id="main"/.test(landing));
assert("landing pillars nav", /class="sf-pillars"/.test(landing));
assert("foundation CSS present", exists("apps/waypoint-scenes/css/scenes-foundation.css"));
const css = read("apps/waypoint-scenes/css/scenes-foundation.css");
assert("foundation uses Scenes accents", /--sf-violet|--sf-aurora|--sf-midnight/.test(css) || /violet|aurora|midnight/.test(css));
assert("reduced-motion considered", /prefers-reduced-motion/.test(css));

console.log("\nScenes Sprint 1 foundation checks:", passed, "passed");
