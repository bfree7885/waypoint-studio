#!/usr/bin/env node
/**
 * Sheds V2.0 Phase 1 — Search Priority Today model foundation tests.
 * Controlled fixtures only; no live weather APIs.
 *
 * Aligns with apps/shed-hunting/js/sheds-search-priority-today.js
 * and docs/sheds/SHEDS-V2-0-PHASE1-SEARCH-PRIORITY-TODAY.md
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const modulePath = path.join(root, "apps/shed-hunting/js/sheds-search-priority-today.js");

assert.ok(fs.existsSync(modulePath), "model module must exist");

const sandbox = { console, window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(modulePath, "utf8"), sandbox);
const API = sandbox.window.WaypointShedsSearchPriorityToday;
assert.ok(API && typeof API.evaluateArea === "function", "API must export evaluateArea");
assert.ok(typeof API.evaluateCell === "function", "API must export evaluateCell");

const FORBIDDEN = [
  /\bhotspot\b/i,
  /\blikely shed\b/i,
  /\bshed probability\b/i,
  /\bchance of finding\b/i,
  /\bsheds? (are|is) here\b/i,
  /\b\d{1,3}%\s*(chance|probability|likely)/i,
];

function assertNoForbiddenLanguage(payload, label) {
  const text = JSON.stringify(payload);
  for (const re of FORBIDDEN) {
    assert.equal(re.test(text), false, `${label} must not contain ${re}`);
  }
  assert.equal(API.containsBannedLanguage(text), false, `${label} honesty helper`);
}

function byId(area) {
  const out = {};
  for (const row of area.results || []) {
    const ev = row.evaluation;
    out[row.id] = {
      status: ev.status,
      score: ev.score,
      band: ev.band,
      base: ev.base,
      modifiers: (ev.modifiers || []).map((m) => m.id),
      modifierObjs: ev.modifiers || [],
      reasons: ev.reasons || [],
      limited: ev.limited,
      evaluation: ev,
    };
  }
  return out;
}

function ordering(area) {
  return [...(area.results || [])]
    .filter((r) => r.evaluation.status === "ready" && typeof r.evaluation.score === "number")
    .sort((a, b) => {
      const ds = b.evaluation.score - a.evaluation.score;
      if (ds !== 0) return ds;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((r) => r.id);
}

/** Three-zone terrain fixture: north steep, south transition, east bench. */
const SPATIAL_AREA = [
  {
    id: "north_steep",
    terrainPriority: "Moderate",
    aspectCardinal: "N",
    slopeDeg: 18,
    featureKind: "steep",
  },
  {
    id: "south_transition",
    terrainPriority: "Moderate",
    aspectCardinal: "S",
    slopeDeg: 9,
    featureKind: "transition",
  },
  {
    id: "east_bench",
    terrainPriority: "Moderate",
    aspectCardinal: "E",
    slopeDeg: 3,
    featureKind: "bench",
  },
];

const GIS_AREA = [
  {
    id: "gis_stronger_south",
    gisBand: "stronger",
    aspectCardinal: "S",
    slopeDeg: 8,
    featureKind: "transition",
  },
  {
    id: "gis_some_north",
    gisBand: "some",
    aspectCardinal: "N",
    slopeDeg: 12,
    featureKind: "steep",
  },
  {
    id: "gis_limited_east",
    gisBand: "limited",
    aspectCardinal: "E",
    slopeDeg: 4,
    featureKind: "bench",
  },
];

const COND_FREEZE_THAW = {
  freezeThawStatus: "freeze_thaw",
  tempTrendStatus: "warming",
  snowCoverStatus: "none",
  seasonCategory: "peak_drop",
};

const COND_LIMITING_SNOW = {
  freezeThawStatus: "none",
  tempTrendStatus: "cooling",
  snowCoverStatus: "limiting",
  seasonCategory: "peak_drop",
};

const COND_NEUTRAL = {
  freezeThawStatus: "none",
  tempTrendStatus: "little_change",
  snowCoverStatus: "none",
  seasonCategory: "peak_drop",
};

console.log("A. GIS-backed Search Area + usable conditions");
{
  const result = API.evaluateArea({ cells: GIS_AREA, conditions: COND_FREEZE_THAW });
  assert.equal(result.readyCount, 3);
  const map = byId(result);
  assert.equal(map.gis_stronger_south.status, "ready");
  assert.equal(map.gis_stronger_south.base.source, "gis");
  assert.ok(map.gis_stronger_south.score > map.gis_some_north.score);
  assert.ok(map.gis_stronger_south.modifiers.includes("solar_searchability"));
  assert.equal(map.gis_some_north.modifiers.includes("solar_searchability"), false);
  assertNoForbiddenLanguage(result, "A");
  console.log("  ok", ordering(result).join(" > "));
}

console.log("B. Terrain-only Search Area + usable conditions");
{
  const result = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_FREEZE_THAW });
  assert.equal(result.readyCount, 3);
  const map = byId(result);
  assert.equal(map.south_transition.base.source, "terrain");
  assert.equal(map.south_transition.score, 2); // base 1 + solar 1
  assert.equal(map.north_steep.score, 1);
  assert.equal(map.east_bench.score, 1);
  assert.ok(map.south_transition.modifiers.includes("solar_searchability"));
  assertNoForbiddenLanguage(result, "B");
  console.log("  ok", ordering(result).join(" > "));
}

console.log("C. Insufficient spatial data");
{
  const result = API.evaluateArea({
    cells: [
      { id: "empty_a" },
      { id: "empty_b", gisBand: null, terrainPriority: null },
    ],
    conditions: COND_FREEZE_THAW,
  });
  assert.equal(result.readyCount, 0);
  for (const row of result.results) {
    assert.equal(row.evaluation.status, "insufficient_spatial");
    assert.equal(row.evaluation.score, null);
    assert.equal(row.evaluation.band, null);
  }
  assertNoForbiddenLanguage(result, "C");
  console.log("  ok insufficient_spatial");
}

console.log("D. Weather/condition unavailable");
{
  const result = API.evaluateArea({ cells: SPATIAL_AREA, conditions: null });
  assert.equal(result.readyCount, 3);
  const map = byId(result);
  for (const id of Object.keys(map)) {
    assert.equal(map[id].modifiers.length, 0);
    assert.equal(map[id].score, map[id].base.score);
    assert.equal(map[id].limited, true);
    assert.equal(map[id].evaluation.flags.conditionsAvailable, false);
  }
  // Relative order is alphabetical ties when scores equal
  assert.deepEqual(ordering(result), ["east_bench", "north_steep", "south_transition"]);
  assertNoForbiddenLanguage(result, "D");
  console.log("  ok base-only under unavailable conditions");
}

console.log("E. Partial condition data (snow only)");
{
  const result = API.evaluateArea({
    cells: SPATIAL_AREA,
    conditions: { snowCoverStatus: "limiting" },
  });
  assert.equal(result.readyCount, 3);
  const map = byId(result);
  assert.ok(map.north_steep.modifiers.includes("snow_practicality"));
  assert.ok(map.east_bench.modifiers.includes("snow_practicality"));
  assert.equal(map.north_steep.score, 0); // base 1 - 1
  assert.equal(map.east_bench.score, 2); // base 1 + 1
  assert.equal(map.south_transition.modifiers.includes("solar_searchability"), false);
  assert.ok(map.south_transition.modifiers.includes("snow_practicality")); // transition is BENCHISH
  assert.equal(map.north_steep.limited, true, "snow-only snapshot is partial condition inputs");
  assert.equal(map.north_steep.evaluation.flags.conditionsLimited, true);
  assertNoForbiddenLanguage(result, "E");
  console.log("  ok partial snow-only modifiers");
}

console.log("F. Determinism — identical inputs → identical outputs");
{
  const a = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_FREEZE_THAW });
  const b = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_FREEZE_THAW });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(API.orderingKey(a), API.orderingKey(b));
  console.log("  ok");
}

console.log("G. Relevant condition change alters relative spatial ordering");
{
  const setA = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_NEUTRAL });
  const setB = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_FREEZE_THAW });
  const orderA = ordering(setA);
  const orderB = ordering(setB);
  assert.notDeepEqual(orderA, orderB);
  const mapA = byId(setA);
  const mapB = byId(setB);
  assert.equal(mapA.south_transition.score, mapA.north_steep.score);
  assert.ok(mapB.south_transition.score > mapB.north_steep.score);
  console.log(
    "  CONDITION SET A (neutral):",
    orderA.map((id) => `${id}=${mapA[id].score}/${mapA[id].band}`).join(", ")
  );
  console.log(
    "  CONDITION SET B (freeze_thaw):",
    orderB.map((id) => `${id}=${mapB[id].score}/${mapB[id].band}`).join(", ")
  );
  console.log(
    "  WHY: freeze/thaw + southish aspect raises south_transition via solar_searchability; north/east unchanged."
  );
}

console.log("H. Non-spatial/global condition does not inflate every cell equally");
{
  const base = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_NEUTRAL });
  const seasonOnly = API.evaluateArea({
    cells: SPATIAL_AREA,
    conditions: { ...COND_NEUTRAL, seasonCategory: "late_season" },
  });
  for (const id of ["north_steep", "south_transition", "east_bench"]) {
    assert.equal(
      byId(base)[id].score,
      byId(seasonOnly)[id].score,
      `season-only must not change score for ${id}`
    );
  }
  const snow = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_LIMITING_SNOW });
  const deltas = SPATIAL_AREA.map(
    (z) => byId(snow)[z.id].score - byId(base)[z.id].score
  );
  const allSame = deltas.every((d) => d === deltas[0]);
  assert.equal(allSame, false, "snow must not apply identical delta to every cell");
  assert.ok(deltas.some((d) => d !== 0), "snow must change at least one cell");
  console.log("  ok deltas under limiting snow:", deltas.join(", "));
}

console.log("I. Reasons correspond to modifiers actually applied");
{
  const result = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_FREEZE_THAW });
  for (const row of result.results) {
    const ev = row.evaluation;
    for (const mod of ev.modifiers) {
      assert.equal(typeof mod.delta, "number");
      assert.ok(mod.reason && mod.reason.length > 0);
      assert.ok(
        ev.reasons.includes(mod.reason),
        `${row.id} reasons must include modifier reason for ${mod.id}`
      );
    }
    const sum = ev.base.score + ev.modifiers.reduce((s, m) => s + m.delta, 0);
    // clampScore may round; unclamped sum for these fixtures stays in [0,3]
    assert.equal(ev.score, sum);
  }
  console.log("  ok");
}

console.log("J. No probability / find-certainty semantics in output");
{
  const samples = [
    API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_FREEZE_THAW }),
    API.evaluateArea({ cells: GIS_AREA, conditions: COND_LIMITING_SNOW }),
    API.evaluateArea({ cells: [], conditions: COND_NEUTRAL }),
    API.bandFromScore(2),
    API.BANDS,
  ];
  for (const sample of samples) assertNoForbiddenLanguage(sample, "J");
  for (const band of API.BANDS) {
    assert.match(String(band), /interest/);
    assert.equal(/\bprobability\b/i.test(band), false);
  }
  console.log("  ok");
}

console.log("K. Limited flag is condition-input honesty, not spatial gaps");
{
  const full = COND_FREEZE_THAW;
  const noAspect = API.evaluateCell({
    cell: { gisBand: "some", slopeDeg: 8, featureKind: "transition" },
    conditions: full,
  });
  assert.equal(noAspect.limited, false, "complete conditions + null aspect are not limited");
  assert.equal(noAspect.flags.conditionsLimited, false);
  assert.equal(noAspect.modifiers.some((m) => m.id === "solar_searchability"), false);

  const flat = API.evaluateCell({
    cell: {
      gisBand: "some",
      aspectCardinal: "S",
      slopeDeg: 1,
      featureKind: "bench",
    },
    conditions: full,
  });
  assert.equal(flat.limited, false, "complete conditions + unusable slope are not limited");
  assert.equal(flat.flags.conditionsLimited, false);
  assert.equal(flat.modifiers.some((m) => m.id === "solar_searchability"), false);

  const snowOnly = API.evaluateCell({
    cell: SPATIAL_AREA[0],
    conditions: { snowCoverStatus: "limiting" },
  });
  assert.equal(snowOnly.limited, true, "snow-only snapshot must report limited");
  assert.equal(snowOnly.flags.conditionsLimited, true);
  assert.ok(snowOnly.modifiers.some((m) => m.id === "snow_practicality"));

  const noKind = API.evaluateCell({
    cell: { terrainPriority: "Moderate", aspectCardinal: "N", slopeDeg: 18 },
    conditions: COND_LIMITING_SNOW,
  });
  assert.equal(noKind.limited, false, "complete conditions + missing feature kind are not limited");
  assert.equal(noKind.modifiers.length, 0);

  console.log("  ok");
}

console.log("\n=== CONTROLLED A/B DEMONSTRATION (TODAY changes WHERE) ===");
{
  const setA = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_NEUTRAL });
  const setB = API.evaluateArea({ cells: SPATIAL_AREA, conditions: COND_FREEZE_THAW });
  const mapA = byId(setA);
  const mapB = byId(setB);
  console.log("CONDITION SET A — neutral (no freeze/thaw, little_change, snow none)");
  for (const id of ["north_steep", "south_transition", "east_bench"]) {
    console.log(
      `  ${id} → score ${mapA[id].score}, band ${mapA[id].band}, modifiers [${mapA[id].modifiers.join(", ") || "none"}]`
    );
  }
  console.log("CONDITION SET B — freeze/thaw + warming");
  for (const id of ["north_steep", "south_transition", "east_bench"]) {
    console.log(
      `  ${id} → score ${mapB[id].score}, band ${mapB[id].band}, modifiers [${mapB[id].modifiers.join(", ") || "none"}]`
    );
  }
  console.log("WHY ordering changed: solar_searchability boosts southish aspect under freeze/thaw;");
  console.log("  north_steep and east_bench stay at base; south_transition becomes relatively stronger.");
  assert.ok(mapB.south_transition.score > mapB.north_steep.score);
  assert.ok(mapB.south_transition.score > mapB.east_bench.score);
  assert.notEqual(API.orderingKey(setA), API.orderingKey(setB));
}

console.log("\nAll Sheds V2.0 Phase 1 Search Priority Today tests passed.");
