/**
 * Sheds V2.0 Phase 1 — Search Priority Today (pure model foundation).
 *
 * Relative search interest inside a Search Area from:
 *   base spatial priority (GIS band OR V1.3 terrain priority)
 *   + condition × spatial modifiers
 *
 * NOT wired to production map rendering.
 * NOT shed/find probability. No network. Deterministic.
 *
 * Spec: docs/sheds/SHEDS-V2-0-PHASE1-SEARCH-PRIORITY-TODAY.md
 */
(function (global) {
  "use strict";

  var VERSION = "2.0.0-phase1";

  var BANDS = Object.freeze([
    "stronger_interest",
    "moderate_interest",
    "lower_interest"
  ]);

  var SOUTHISH = { S: 1, SE: 1, SW: 1 };
  var BENCHISH = { bench: 1, gentle: 1, transition: 1 };
  var STEEPISH = { steep: 1 };

  var BANNED_RE =
    /shed probability|find probability|chance of finding|hotspot|likely shed|sheds are here|deer are here|\d+\s*%|0\.\d{2}\s*probability/i;

  function finiteNum(n) {
    return typeof n === "number" && isFinite(n);
  }

  function baseScoreFromGis(bandId) {
    if (bandId === "stronger") return 2;
    if (bandId === "some") return 1;
    if (bandId === "limited") return 0;
    return null;
  }

  function baseScoreFromTerrain(priority) {
    if (priority === "Higher") return 2;
    if (priority === "Moderate") return 1;
    if (priority === "Lower") return 0;
    return null;
  }

  function bandFromScore(score) {
    if (!finiteNum(score)) return null;
    // Relative communication bands on the 0–3 relative score — not probability.
    // Base Moderate/some (1) → moderate; Higher/stronger (2) or boosted → stronger; 0 → lower.
    if (score >= 2) return "stronger_interest";
    if (score >= 1) return "moderate_interest";
    return "lower_interest";
  }

  function normalizeConditions(raw) {
    raw = raw || {};
    var snow = raw.snowCoverStatus || raw.snowStatus || null;
    var ft = raw.freezeThawStatus || null;
    var trend = raw.tempTrendStatus || null;
    var season = raw.seasonCategory || null;
    var known = {
      snow: snow != null && snow !== "unavailable" && snow !== "unknown",
      freezeThaw: ft != null && ft !== "insufficient" && ft !== "unknown",
      tempTrend: trend != null && trend !== "unknown",
      season: season != null && season !== "unknown"
    };
    return {
      snowCoverStatus: known.snow ? snow : null,
      freezeThawStatus: known.freezeThaw ? ft : null,
      tempTrendStatus: known.tempTrend ? trend : null,
      seasonCategory: known.season ? season : null,
      available: !!(known.snow || known.freezeThaw || known.tempTrend || known.season),
      known: known
    };
  }

  /**
   * Continuous unit-scale band labels for RADAR P1 landscape base (display only).
   * Thresholds align with HabitatGis band cuts for familiar language — not the store.
   */
  function bandFromUnitScore(score) {
    if (!finiteNum(score)) return null;
    if (score >= 0.62) return "stronger_interest";
    if (score >= 0.34) return "moderate_interest";
    return "lower_interest";
  }

  function clampUnitScore(n) {
    if (!finiteNum(n)) return null;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return Math.round(n * 10000) / 10000;
  }

  /**
   * Legacy tri-scale (0–3 Search Area path) still uses model Δ ±1.
   * RADAR continuous unit path (P2) uses fixed ±0.20 deltas and removes the
   * positive snow bench boost (attenuation-only on steep terrain).
   */
  var UNIT_MODIFIER_SCALE = 1 / 3; // retained for docs/tests naming; unit path uses UNIT_*_DELTA
  var UNIT_SOLAR_DELTA = 0.2;
  var UNIT_SNOW_STEEP_DELTA = -0.2;

  function resolveBase(cell) {
    cell = cell || {};
    // RADAR P1 continuous static landscape — preferred when present.
    if (finiteNum(cell.landscapeScore) && cell.landscapeScore >= 0 && cell.landscapeScore <= 1) {
      return {
        source: "radar_landscape",
        label: cell.landscapeLabel || "base_landscape",
        score: cell.landscapeScore,
        scale: "unit"
      };
    }
    var gisBand = cell.gisBand || null;
    var gisScore = baseScoreFromGis(gisBand);
    if (gisScore != null) {
      return {
        source: "gis",
        label: gisBand,
        score: gisScore,
        scale: "tri"
      };
    }
    var terrain = cell.terrainPriority || cell.priority || null;
    var tScore = baseScoreFromTerrain(terrain);
    if (tScore != null) {
      return {
        source: "terrain",
        label: terrain,
        score: tScore,
        scale: "tri"
      };
    }
    return { source: "none", label: null, score: null, scale: null };
  }

  function isSouthish(cardinal) {
    return !!(cardinal && SOUTHISH[cardinal]);
  }

  /**
   * Condition × spatial modifiers. Each must change relative WHERE.
   * @param {object} cell
   * @param {object} conditions normalized
   * @param {{ scale?: 'unit'|'tri' }} [opts]
   *   unit = RADAR continuous landscape (P2 deltas)
   *   tri  = legacy Search Area Phase 1 (±1, including positive snow on benches)
   * Returns { modifiers, limited }.
   */
  function collectModifiers(cell, conditions, opts) {
    var modifiers = [];
    var limited = false;
    cell = cell || {};
    conditions = conditions || {};
    opts = opts || {};
    var unitPath = opts.scale === "unit";

    if (!conditions.available) {
      return { modifiers: modifiers, limited: true };
    }

    var aspect = cell.aspectCardinal || null;
    var kind = (cell.feature && cell.feature.kind) || cell.featureKind || null;
    var slope = finiteNum(cell.slopeDeg) ? cell.slopeDeg : null;

    // solar_searchability: freeze/thaw or warming × southish aspect
    var solarTrigger =
      conditions.freezeThawStatus === "freeze_thaw" ||
      conditions.tempTrendStatus === "warming";
    if (solarTrigger) {
      if (!aspect || slope == null || slope < 2) {
        limited = true;
      } else if (isSouthish(aspect)) {
        modifiers.push({
          id: "solar_searchability",
          delta: unitPath ? UNIT_SOLAR_DELTA : 1,
          reason: unitPath
            ? "Warming or thawing conditions interact with this southerly exposure (searchability, not a find claim)."
            : "Sun-facing ground can become more searchable sooner during thaw or warming (searchability, not a find claim)."
        });
      }
    }

    // snow_practicality
    // RADAR unit path: steep eligibility from pack slopeDeg using the same
    // STEEP_PENALTY (22°) as SearchPriority featureKind==="steep" slope gates.
    // Legacy tri-scale still uses featureKind (incl. bench boost).
    var snow = conditions.snowCoverStatus;
    var RADAR_STEEP_SLOPE_DEG = 22;
    if (snow === "limiting" || snow === "deep") {
      var steepFromPack =
        unitPath && slope != null && slope >= RADAR_STEEP_SLOPE_DEG;
      var steepFromKind = !!(kind && STEEPISH[kind]);
      if (unitPath) {
        if (slope == null && !kind) {
          limited = true;
        } else if (steepFromKind || steepFromPack) {
          modifiers.push({
            id: "snow_practicality",
            delta: UNIT_SNOW_STEEP_DELTA,
            reason:
              "Deeper snow can make this steeper terrain less practical to search."
          });
        }
      } else if (!kind) {
        limited = true;
      } else if (STEEPISH[kind]) {
        modifiers.push({
          id: "snow_practicality",
          delta: -1,
          reason:
            "Limiting snow on steep ground usually reduces practical search effort versus gentler structure nearby."
        });
      } else if (BENCHISH[kind]) {
        // Legacy tri-scale only: positive relative boost on benches.
        // RADAR unit path deliberately omits this (gentler ground stays unsuppressed).
        modifiers.push({
          id: "snow_practicality",
          delta: 1,
          reason:
            "Gentler benches/transitions are relatively more practical to search when snow is limiting."
        });
      }
    } else if (snow == null) {
      // unknown snow — do not invent practicality shifts
      if (conditions.known && conditions.known.snow === false) limited = true;
    }

    return { modifiers: modifiers, limited: limited };
  }

  function clampScore(n) {
    if (!finiteNum(n)) return null;
    if (n < 0) return 0;
    if (n > 3) return 3;
    return Math.round(n * 100) / 100;
  }

  /**
   * Evaluate one cell/zone.
   *
   * @param {object} opts
   * @param {object} opts.cell
   * @param {object} [opts.conditions] derived condition snapshot fields
   */
  function evaluateCell(opts) {
    opts = opts || {};
    var cell = opts.cell || {};
    var conditions = normalizeConditions(opts.conditions);
    var base = resolveBase(cell);

    if (base.score == null) {
      return {
        version: VERSION,
        status: "insufficient_spatial",
        band: null,
        score: null,
        base: base,
        modifiers: [],
        reasons: ["Insufficient spatial priority (no GIS band or terrain priority)."],
        inputsUsed: [],
        limited: true,
        flags: {
          insufficientSpatial: true,
          conditionsAvailable: conditions.available
        }
      };
    }

    var unitScale = base.scale === "unit";

    // Water / non-searchable landscape must stay cold — never resurrect via additives.
    if (
      unitScale &&
      (base.score === 0 ||
        cell.structure === "water" ||
        (cell.landscape && cell.landscape.flags && cell.landscape.flags.water) ||
        cell.water === true)
    ) {
      return {
        version: VERSION,
        status: "ready",
        band: bandFromUnitScore(0),
        score: 0,
        scoreScale: "unit",
        base: base,
        modifiers: [],
        reasons: [
          "Base RADAR base landscape: " + (base.label || "water") + ".",
          "Water and non-searchable ground stay at zero relative interest — conditions do not raise them."
        ],
        inputsUsed: ["base:" + base.source, "guard:water_non_searchable"],
        limited: false,
        flags: {
          insufficientSpatial: false,
          conditionsAvailable: conditions.available,
          conditionsLimited: false,
          waterLocked: true
        }
      };
    }

    var collected = collectModifiers(cell, conditions, { scale: unitScale ? "unit" : "tri" });

    // Developed stays suppressed on RADAR unit path — do not apply positive condition lifts.
    if (
      unitScale &&
      (cell.structure === "developed" ||
        (cell.landscape && cell.landscape.flags && cell.landscape.flags.developed))
    ) {
      collected = {
        modifiers: (collected.modifiers || []).filter(function (m) {
          return !(m.delta > 0);
        }),
        limited: collected.limited
      };
    }
    var score = base.score;
    var reasons = [];
    var inputsUsed = ["base:" + base.source];
    var basePhrase =
      base.source === "radar_landscape"
        ? "RADAR base landscape"
        : base.source === "gis"
          ? "habitat GIS band"
          : "terrain priority";
    reasons.push("Base " + basePhrase + ": " + base.label + ".");

    var scaledModifiers = [];
    var i;
    for (i = 0; i < collected.modifiers.length; i++) {
      var mod = collected.modifiers[i];
      // Unit path already emits absolute ±0.20; tri path emits ±1.
      var appliedDelta = mod.delta;
      score += appliedDelta;
      scaledModifiers.push({
        id: mod.id,
        delta: appliedDelta,
        reason: mod.reason,
        modelDelta: unitScale
          ? mod.id === "solar_searchability"
            ? 1
            : mod.id === "snow_practicality"
              ? appliedDelta < 0
                ? -1
                : 1
              : mod.delta
          : mod.delta
      });
      reasons.push(mod.reason);
      inputsUsed.push("modifier:" + mod.id);
    }

    if (conditions.available) {
      if (conditions.freezeThawStatus) inputsUsed.push("condition:freezeThaw");
      if (conditions.tempTrendStatus) inputsUsed.push("condition:tempTrend");
      if (conditions.snowCoverStatus) inputsUsed.push("condition:snowCover");
      if (conditions.seasonCategory) inputsUsed.push("condition:season");
    }

    score = unitScale ? clampUnitScore(score) : clampScore(score);
    var band = unitScale ? bandFromUnitScore(score) : bandFromScore(score);

    return {
      version: VERSION,
      status: "ready",
      band: band,
      score: score,
      scoreScale: unitScale ? "unit" : "tri",
      base: base,
      modifiers: scaledModifiers,
      reasons: reasons,
      inputsUsed: inputsUsed,
      limited: collected.limited || !conditions.available,
      flags: {
        insufficientSpatial: false,
        conditionsAvailable: conditions.available,
        conditionsLimited: collected.limited || !conditions.available
      }
    };
  }

  /**
   * Evaluate many cells (Search Area). Pure / deterministic.
   */
  function evaluateArea(opts) {
    opts = opts || {};
    var cells = opts.cells || [];
    var conditions = opts.conditions || null;
    var results = [];
    var i;
    for (i = 0; i < cells.length; i++) {
      var cell = cells[i] || {};
      var ev = evaluateCell({ cell: cell, conditions: conditions });
      results.push({
        id: cell.id != null ? cell.id : String(i),
        evaluation: ev
      });
    }
    return {
      version: VERSION,
      results: results,
      readyCount: results.filter(function (r) {
        return r.evaluation.status === "ready";
      }).length
    };
  }

  function orderingKey(areaResult) {
    return (areaResult.results || [])
      .map(function (r) {
        return r.id + ":" + (r.evaluation.score != null ? r.evaluation.score : "x");
      })
      .join("|");
  }

  function containsBannedLanguage(text) {
    return BANNED_RE.test(String(text || ""));
  }

  function assertHonestOutput(ev) {
    var blob = JSON.stringify(ev || {});
    return !containsBannedLanguage(blob);
  }

  var api = {
    VERSION: VERSION,
    BANDS: BANDS,
    UNIT_MODIFIER_SCALE: UNIT_MODIFIER_SCALE,
    UNIT_SOLAR_DELTA: UNIT_SOLAR_DELTA,
    UNIT_SNOW_STEEP_DELTA: UNIT_SNOW_STEEP_DELTA,
    evaluateCell: evaluateCell,
    evaluateArea: evaluateArea,
    orderingKey: orderingKey,
    bandFromScore: bandFromScore,
    bandFromUnitScore: bandFromUnitScore,
    normalizeConditions: normalizeConditions,
    collectModifiers: collectModifiers,
    containsBannedLanguage: containsBannedLanguage,
    assertHonestOutput: assertHonestOutput
  };

  global.WaypointShedsSearchPriorityToday = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
