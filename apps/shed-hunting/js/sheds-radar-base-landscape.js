/**
 * Sheds RADAR P1 — continuous static base landscape scorer.
 *
 * Geographic / search-practicality foundation only.
 * NOT find probability. NOT deer-behavior claims.
 * No DOM, network, weather, Search Area, observations, or access inputs.
 *
 * Spec: docs/sheds/SHEDS-RADAR-P1.md
 */
(function (global) {
  "use strict";

  var VERSION = "radar-base-landscape-1.0";

  /** Component weights — model parameters, not scientific constants. */
  var W_LAND = 0.8;
  var W_SLOPE = 0.2;

  /** Edge proximity window (m). Pack edge is forest↔non-forest Chebyshev×cellSize. */
  var EDGE_NEAR_M = 90;

  /**
   * Max transition boost added to cover base when edgeM == 0 on searchable structure.
   * Decays linearly to 0 at EDGE_NEAR_M.
   */
  var TRANSITION_MAX_BOOST = 0.3;

  /**
   * Flatter searchable-vegetation bases (searchability / geography — not deer preference).
   * Developed values are overridden by NLCD intensity when available.
   */
  var COVER_BASE = Object.freeze({
    forest: 0.44,
    open: 0.43,
    wetland: 0.43,
    agriculture: 0.4,
    developed: 0.08,
    water: 0,
    other: 0.22,
    unknown: 0.22
  });

  /** NLCD developed intensity (search practicality). */
  var DEVELOPED_NLCD = Object.freeze({
    21: 0.1,
    22: 0.09,
    23: 0.06,
    24: 0.05
  });

  var SEARCHABLE = Object.freeze({
    forest: 1,
    open: 1,
    agriculture: 1,
    wetland: 1
  });

  /** Coarse slope context — walkability / search practicality at ~90 m. */
  var SLOPE_CONTEXT = Object.freeze({
    flat: 0.5,
    moderate: 0.65,
    steeper: 0.45,
    verySteep: 0.2
  });

  /** Display-only labels — never the analytical store. */
  var DISPLAY_LOWER = 0.34;
  var DISPLAY_MODERATE = 0.62;

  function finiteNum(n) {
    return typeof n === "number" && isFinite(n);
  }

  function clamp01(n) {
    if (!finiteNum(n)) return null;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return Math.round(n * 10000) / 10000;
  }

  function isSearchable(structure) {
    return !!(structure && SEARCHABLE[structure]);
  }

  function coverBaseFor(structure, nlcd) {
    if (structure === "water") return COVER_BASE.water;
    if (structure === "developed") {
      if (finiteNum(nlcd) && DEVELOPED_NLCD[nlcd] != null) return DEVELOPED_NLCD[nlcd];
      return COVER_BASE.developed;
    }
    if (structure && COVER_BASE[structure] != null) return COVER_BASE[structure];
    return COVER_BASE.unknown;
  }

  function structurePhrase(structure) {
    if (structure === "forest") return "Wooded land";
    if (structure === "open") return "Open / shrub / grass land";
    if (structure === "agriculture") return "Agricultural land";
    if (structure === "wetland") return "Wetland land cover";
    if (structure === "developed") return "Developed land — reduced for search practicality";
    if (structure === "water") return "Open water — not treated as searchable ground";
    if (structure === "other") return "Other / barren land cover";
    return "Land cover unavailable or unknown";
  }

  function transitionBoost(structure, edgeM) {
    if (!isSearchable(structure)) {
      return { boost: 0, eligible: false, reason: null };
    }
    if (!finiteNum(edgeM) || edgeM < 0) {
      return { boost: 0, eligible: true, reason: null };
    }
    if (edgeM > EDGE_NEAR_M) {
      return { boost: 0, eligible: true, reason: null };
    }
    var boost = TRANSITION_MAX_BOOST * (1 - edgeM / EDGE_NEAR_M);
    boost = Math.round(boost * 10000) / 10000;
    return {
      boost: boost,
      eligible: true,
      reason:
        "Land-cover transition nearby (~" +
        Math.round(edgeM) +
        " m) — pack forest↔non-forest distance; not proven forest/open"
    };
  }

  function slopeContext(slopeDeg) {
    if (!finiteNum(slopeDeg)) {
      return {
        available: false,
        value: null,
        band: null,
        why: "Slope unavailable — not treated as low landscape interest."
      };
    }
    var s = slopeDeg;
    var value;
    var band;
    var why;
    if (s < 2) {
      value = SLOPE_CONTEXT.flat;
      band = "flat";
      why = "Nearly flat terrain (~" + Math.round(s) + "°) — coarse search-terrain context";
    } else if (s < 12) {
      value = SLOPE_CONTEXT.moderate;
      band = "moderate";
      why = "Moderate slope (~" + Math.round(s) + "°) — coarse search-terrain context";
    } else if (s < 25) {
      value = SLOPE_CONTEXT.steeper;
      band = "steeper";
      why = "Steeper slope (~" + Math.round(s) + "°) — reduced search practicality";
    } else {
      value = SLOPE_CONTEXT.verySteep;
      band = "very_steep";
      why = "Very steep terrain (~" + Math.round(s) + "°) — limited search practicality";
    }
    return { available: true, value: value, band: band, why: why, slopeDeg: s };
  }

  function displayLabel(score) {
    if (!finiteNum(score)) return null;
    if (score < DISPLAY_LOWER) return "Lower";
    if (score < DISPLAY_MODERATE) return "Moderate";
    return "Stronger";
  }

  /**
   * Score one pack sample. Pure / deterministic.
   * @param {object} sample GisPack.sample result (or equivalent)
   */
  function scoreSample(sample) {
    if (!sample || !sample.structure) {
      return {
        version: VERSION,
        status: "unsupported",
        score: null,
        displayLabel: null,
        components: {
          landCover: null,
          transition: null,
          landCombined: null,
          slope: null
        },
        inputs: {
          nlcd: null,
          structure: null,
          edgeM: null,
          slopeDeg: null
        },
        factors: [
          {
            id: "unsupported",
            label: "Landscape data",
            value: "unavailable",
            detail: "No land-cover sample for this location."
          }
        ],
        confidence: {
          landCover: "none",
          terrain: "none",
          overall: "none"
        },
        flags: {
          water: false,
          developed: false,
          missingSlope: true,
          unsupported: true,
          searchable: false
        },
        weights: { land: W_LAND, slope: W_SLOPE }
      };
    }

    var structure = sample.structure;
    var nlcd = sample.nlcd != null ? sample.nlcd : null;
    var edgeM = sample.edgeM != null ? sample.edgeM : null;
    var slopeDeg = sample.slopeDeg != null ? sample.slopeDeg : null;

    var cover = coverBaseFor(structure, nlcd);
    var trans = transitionBoost(structure, edgeM);
    var landCombined = clamp01(cover + trans.boost);
    var slope = slopeContext(slopeDeg);

    var score;
    var status = "ready";
    if (structure === "water") {
      // Open water is non-searchable ground — slope must not resurrect interest.
      score = 0;
    } else if (slope.available) {
      score = clamp01(W_LAND * landCombined + W_SLOPE * slope.value);
    } else {
      // Missing slope ≠ low: use land component alone.
      score = landCombined;
      status = "partial";
    }

    var factors = [];
    factors.push({
      id: "land_cover",
      label: "Land cover",
      value: structure,
      detail: structurePhrase(structure)
    });
    if (trans.boost > 0.02 && trans.reason) {
      factors.push({
        id: "transition",
        label: "Land-cover transition",
        value: "~" + Math.round(edgeM) + " m",
        detail: trans.reason
      });
    }
    if (slope.available) {
      factors.push({
        id: "slope",
        label: "Slope context",
        value: Math.round(slope.slopeDeg) + "°",
        detail: slope.why
      });
    } else {
      factors.push({
        id: "slope_missing",
        label: "Slope context",
        value: "unavailable",
        detail: slope.why
      });
    }
    factors.push({
      id: "relative_landscape",
      label: "Relative landscape interest",
      value: displayLabel(score),
      detail: "Continuous geographic foundation — not an encounter claim."
    });

    var landConf = "moderate";
    var terrConf = slope.available ? "moderate" : "limited";
    var overall =
      status === "partial" ? "limited" : landConf === "moderate" && terrConf === "moderate" ? "moderate" : "limited";

    return {
      version: VERSION,
      status: status,
      score: score,
      displayLabel: displayLabel(score),
      components: {
        landCover: cover,
        transition: trans.boost,
        landCombined: landCombined,
        slope: slope.available ? slope.value : null
      },
      inputs: {
        nlcd: nlcd,
        structure: structure,
        structureLabel: sample.structureLabel || null,
        edgeM: edgeM,
        slopeDeg: slopeDeg
      },
      factors: factors,
      confidence: {
        landCover: landConf,
        terrain: terrConf,
        overall: overall
      },
      flags: {
        water: structure === "water",
        developed: structure === "developed",
        missingSlope: !slope.available,
        unsupported: false,
        searchable: !!isSearchable(structure),
        transitionApplied: trans.boost > 0
      },
      weights: { land: W_LAND, slope: W_SLOPE },
      slopeBand: slope.band
    };
  }

  /**
   * Assert excluded domains are not accepted as scoring inputs.
   * Used by tests — scoring ignores these even if present on opts.
   */
  function scorePoint(opts) {
    opts = opts || {};
    // Intentionally ignore: observations, weather, aspect, featureKind, sgl, roads, ownership.
    return scoreSample(opts.sample || opts);
  }

  var api = {
    VERSION: VERSION,
    W_LAND: W_LAND,
    W_SLOPE: W_SLOPE,
    EDGE_NEAR_M: EDGE_NEAR_M,
    TRANSITION_MAX_BOOST: TRANSITION_MAX_BOOST,
    COVER_BASE: COVER_BASE,
    DEVELOPED_NLCD: DEVELOPED_NLCD,
    SLOPE_CONTEXT: SLOPE_CONTEXT,
    DISPLAY_LOWER: DISPLAY_LOWER,
    DISPLAY_MODERATE: DISPLAY_MODERATE,
    scoreSample: scoreSample,
    scorePoint: scorePoint,
    displayLabel: displayLabel,
    isSearchable: isSearchable,
    clamp01: clamp01
  };

  global.WaypointShedsRadarBaseLandscape = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
