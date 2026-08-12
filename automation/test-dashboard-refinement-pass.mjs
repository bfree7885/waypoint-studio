#!/usr/bin/env node
/**
 * Dashboard refinement pass gate — header flow, one-col ≤768, moon honesty, glow.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const pass = (m) => console.log("PASS", m);
const fail = (m) => {
  console.error("FAIL", m);
  failed += 1;
};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const css = read("design-system/css/wds-dashboard-rebuild.css");
const shell = read("design-system/css/wds-app-shell.css");

if (
  /max-width:\s*48rem[\s\S]*?position:\s*relative/m.test(shell) &&
  shell.includes('[data-product="dashboard"] .was-global')
) {
  pass("dashboard mobile header stays in document flow");
} else fail("mobile header still sticky / missing dashboard quiet rules");

if (
  /@media \(max-width:\s*48rem\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/m.test(css)
) {
  pass("≤768 one-column CSS");
} else fail("one-column CSS missing at 48rem");

if (css.includes("--wdb-r-glow-strength") && css.includes("ellipse 85% 60% at 0% 0%")) {
  pass("atmospheric corner luminous edges (not uniform neon)");
} else fail("glow refinement missing");

if (
  css.includes('data-category="conditions"') &&
  /conditions[\s\S]*?opacity:\s*0\.5/m.test(css)
) {
  pass("Conditions mobile art recomposed quieter");
} else fail("Conditions art mobile recomposition missing");

const sandbox = {
  console,
  location: { pathname: "/apps/dashboard/" },
  localStorage: {
    _d: {},
    getItem(k) {
      return this._d[k] ?? null;
    },
    setItem(k, v) {
      this._d[k] = String(v);
    },
    removeItem(k) {
      delete this._d[k];
    }
  },
  matchMedia(q) {
    return { matches: String(q).includes("48rem") };
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.WDS = {};
vm.runInNewContext(
  read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js"),
  sandbox
);
vm.runInNewContext(
  read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js"),
  sandbox
);
vm.runInNewContext(
  read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js"),
  sandbox
);
vm.runInNewContext(
  read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js"),
  sandbox
);

const Gfx = sandbox.WDS.dashboardRebuildGraphics;
const Workspace = sandbox.WDS.dashboardRebuildWorkspace;
const Prefs = sandbox.WDS.dashboardRebuildPrefs;
const Reg = sandbox.WDS.dashboardRebuildRegistry;

const phases = [
  "new",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full",
  "waning gibbous",
  "last quarter",
  "waning crescent"
];
const keys = new Set(phases.map((p) => Gfx.moonPhaseKey(p, 50)));
if (keys.size >= 7) pass("8-phase moon key set");
else fail("moon phases thin: " + [...keys]);

if (Gfx.moonPhaseKey(null, 30, 0.82) === "waning-crescent") pass("phaseValue waning honesty");
else fail("phaseValue waning failed");

const lit = Gfx.moonGeometry("last-quarter", 47);
if (lit && !lit.waxing && Math.abs(lit.lit - 0.47) < 0.001) pass("orientation + illuminated fraction");
else fail("moonGeometry orientation/illum failed");

const html = Gfx.render({
  kind: "moon",
  value: 47,
  phase: "last quarter",
  phaseValue: 0.75
});
if (html.includes("mask") && html.includes("#e8e4d8") && html.includes("#2a2438")) {
  pass("field-guide moon viz palette");
} else fail("moon viz palette missing");

const ws = Workspace.renderWorkspace({
  prefs: Object.assign({}, Prefs.defaults(), { gridColumns: 3 }),
  customize: false
});
if (ws.includes('data-columns="1"') && ws.includes("NOW OUTSIDE")) {
  pass("mobile forces 1-col + Conditions NOW OUTSIDE label");
} else fail("workspace mobile/label regression");

const fam = Reg.familyFor({ id: "ph-conditions", category: "conditions" });
if (fam && /NOW OUTSIDE/i.test(fam.label)) pass("Conditions family label NOW OUTSIDE");
else if (ws.includes("NOW OUTSIDE")) pass("Conditions family label present in workspace");
else fail("NOW OUTSIDE label missing");

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll refinement-pass gates passed.");
