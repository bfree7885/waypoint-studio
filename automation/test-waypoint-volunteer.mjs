#!/usr/bin/env node
/**
 * Waypoint Volunteer Foundation V0.1 — contract smoke tests.
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

for (const d of ["docs/WAYPOINT-VOLUNTEER.md", "docs/WAYPOINT-VOLUNTEER-INTEGRATIONS.md"]) {
  ok(existsSync(join(root, d)), `doc ${d}`);
}

ok(existsSync(join(root, "apps/waypoint-volunteer/index.html")), "foundation app");
ok(existsSync(join(root, "apps/waypoint-volunteer/discover.html")), "discover prototype");
ok(
  existsSync(join(root, "design-system/js/volunteer/wds-volunteer-discover.js")),
  "discover runtime"
);

const index = readJson("index.json");
ok(index.meta?.tagline?.includes("good"), "tagline");
ok(index.notInScopeV01?.some((x) => /management/i.test(x)), "not management");
ok(index.notInScopeV01?.some((x) => /streak/i.test(x)), "not gamification");

const cats = readJson("categories.json");
ok(cats.categories?.length >= 15, "category breadth");
ok(cats.categories.some((c) => c.id === "citizen-science"), "citizen science category");

const skills = readJson("skills.json");
ok(skills.skills?.some((s) => s.id === "amateur-radio"), "radio skill");
ok(skills.skills?.some((s) => s.id === "habitat-restoration"), "habitat skill");

const orgSchema = readJson("schema-organization-v0.1.json");
for (const f of ["name", "description", "website", "mission", "categories", "serviceArea"]) {
  ok(!!orgSchema.properties[f], `org field ${f}`);
}

const oppSchema = readJson("schema-opportunity-v0.1.json");
for (const f of [
  "title",
  "organizationId",
  "setting",
  "schedule",
  "estimatedDuration",
  "physicalEffort",
  "weatherSensitive",
  "familyFriendly",
  "requiredSkills",
  "suggestedClothing",
  "suggestedEquipment",
]) {
  ok(!!oppSchema.properties[f], `opp field ${f}`);
}

const bundle = readJson("samples/demo-bundle.json");
ok(bundle.organizations?.length >= 5, "sample orgs");
ok(bundle.opportunities?.length >= 6, "sample opportunities");
const orgIds = new Set(bundle.organizations.map((o) => o.id));
ok(
  bundle.opportunities.every((o) => orgIds.has(o.organizationId)),
  "opportunities reference orgs"
);
ok(
  bundle.opportunities.every((o) => o.meta?.status === "sample"),
  "opportunities labeled sample"
);

const skillIds = new Set(skills.skills.map((s) => s.id));
const catIds = new Set(cats.categories.map((c) => c.id));
for (const o of bundle.opportunities) {
  ok(
    (o.requiredSkills || []).every((s) => skillIds.has(s)),
    `skills valid on ${o.id}`
  );
  ok(
    (o.categories || []).every((c) => catIds.has(c)),
    `categories valid on ${o.id}`
  );
}

const doc = readFileSync(join(root, "docs/WAYPOINT-VOLUNTEER.md"), "utf8");
ok(/What good can I do today/i.test(doc), "mission question");
ok(/NOT.*volunteer management|Not\*\* a volunteer management/i.test(doc), "not management");

const integ = readFileSync(join(root, "docs/WAYPOINT-VOLUNTEER-INTEGRATIONS.md"), "utf8");
ok(/Today Outside/i.test(integ), "today outside");
ok(/Fieldry/i.test(integ) && /SignalTerrain/i.test(integ), "app bridges");

const code = readFileSync(
  join(root, "design-system/js/volunteer/wds-volunteer-discover.js"),
  "utf8"
);
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
ok(typeof sandbox.window.WDS.volunteerDiscover.mountDiscover === "function", "mount API");

const reg = JSON.parse(
  readFileSync(join(root, "design-system/ecosystem/product-registry.json"), "utf8")
);
ok(reg.portfolio.foundations.includes("waypoint-volunteer"), "in foundations");
ok(!!reg.products["waypoint-volunteer"], "product registry entry");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nWaypoint Volunteer Foundation V0.1 contracts OK");
