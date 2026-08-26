#!/usr/bin/env node
/**
 * RC2 Sprint 2 — production smoke suite for critical Studio surfaces.
 *
 * Usage:
 *   node automation/smoke-production-rc2.mjs
 *   WAYPOINT_PROD_URL=https://waypointstudio.org node automation/smoke-production-rc2.mjs
 */
const PROD = (process.env.WAYPOINT_PROD_URL || "https://waypointstudio.org").replace(/\/$/, "");

const SURFACES = [
  { name: "Home", path: "/", mustInclude: ["Waypoint Studio", "Dashboard"] },
  { name: "Dashboard", path: "/apps/dashboard/", mustInclude: ["Dashboard"] },
  { name: "Scenes", path: "/apps/scenes/", mustInclude: ["Scenes"] },
  { name: "Sheds", path: "/apps/shed-hunting/", mustInclude: ["Shed"] },
  { name: "ForageCast", path: "/apps/foragecast/", mustInclude: ["Forage"] },
  { name: "Fieldry", path: "/apps/fieldry/", mustInclude: ["Fieldry"] },
  { name: "Steepleaf", path: "/apps/steepleaf/", mustInclude: ["Steepleaf", "Tea"] },
  { name: "Steepleaf Explore", path: "/apps/steepleaf/explore/", mustInclude: ["Steepleaf"] },
  { name: "Side Trails", path: "/side-trails/", mustInclude: ["Waypoint Deck"] },
  { name: "Waypoint Deck", path: "/side-trails/waypoint-deck/", mustInclude: ["Deck"] },
  { name: "Savant", path: "/apps/savant-sommelier/", mustInclude: ["Savant"] },
  { name: "Volunteer", path: "/apps/waypoint-volunteer/", mustInclude: ["Volunteer"] },
  { name: "Landscape Interpretation", path: "/apps/landscape-interpretation/", mustInclude: ["Landscape"] },
  { name: "LI Learn", path: "/apps/landscape-interpretation/learn.html", mustInclude: ["Learn", "Landscape"] },
  { name: "Contact", path: "/contact.html", mustInclude: ["Contact"] },
  { name: "Support", path: "/support.html", mustInclude: ["Support"] },
  { name: "Map", path: "/map/", mustInclude: ["map", "shed"] },
];

async function check(surface) {
  const url = `${PROD}${surface.path}`;
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "WaypointStudio-RC2-Smoke/1.0" },
  });
  const text = await res.text();
  const build = (text.match(/name=["']waypoint-build["']\s+content=["']([^"']+)["']/i) || [])[1] || null;
  const missing = (surface.mustInclude || []).filter((s) => !text.toLowerCase().includes(s.toLowerCase()));
  const ok = res.status >= 200 && res.status < 400 && missing.length === 0;
  return {
    name: surface.name,
    path: surface.path,
    status: res.status,
    build,
    ok,
    missing,
    finalUrl: res.url,
  };
}

async function main() {
  const expected = (process.env.EXPECTED_SHORT || process.env.EXPECTED_SHA || "").trim().slice(0, 7);
  const results = [];
  for (const surface of SURFACES) {
    try {
      results.push(await check(surface));
    } catch (err) {
      results.push({ name: surface.name, path: surface.path, ok: false, error: String(err) });
    }
  }
  const failed = results.filter((r) => !r.ok);
  const builds = [...new Set(results.map((r) => r.build).filter(Boolean))];
  let fingerprintOk = true;
  if (expected) {
    const mismatched = results.filter((r) => r.build && r.build !== "local" && r.build !== expected);
    if (mismatched.length) {
      fingerprintOk = false;
      failed.push(...mismatched.map((r) => ({ ...r, ok: false, missing: [`build ${r.build} != ${expected}`] })));
    }
  }
  console.log(JSON.stringify({ prod: PROD, expected: expected || null, builds, fingerprintOk, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  if (failed.length) {
    console.error(`FAIL ${failed.length}/${results.length}`);
    process.exit(1);
  }
  console.log(`OK ${results.length}/${results.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
