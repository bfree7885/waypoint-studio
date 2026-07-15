/**
 * Sheds — search-priority grid wrapper.
 * Scoring delegates to Whitetail Biological Model v1.0 when loaded.
 * Deterministic. Explainable. Never claims "probability of finding an antler."
 */
(function (global) {
  "use strict";

  var Bio = null;

  function getBio() {
    if (!Bio) Bio = global.WaypointShedsBiological || null;
    return Bio;
  }

  var WEIGHT_SCALE = {
    off: 0,
    low: 0.45,
    balanced: 1,
    strong: 1.65
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function haversineM(aLat, aLng, bLat, bLng) {
    var B = getBio();
    if (B && B.haversineM) return B.haversineM(aLat, aLng, bLat, bLng);
    var R = 6371000;
    var toRad = Math.PI / 180;
    var dLat = (bLat - aLat) * toRad;
    var dLng = (bLng - aLng) * toRad;
    var lat1 = aLat * toRad;
    var lat2 = bLat * toRad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function weightOf(prefs, key) {
    var B = getBio();
    if (B && B.weightOf) return B.weightOf(prefs, key);
    var w = (prefs && prefs.weights && prefs.weights[key]) || "balanced";
    return WEIGHT_SCALE[w] != null ? WEIGHT_SCALE[w] : 1;
  }

  function seasonProfile(date, lat) {
    var B = getBio();
    if (B && B.seasonProfile) return B.seasonProfile(date, lat);
    return {
      score: 0.5,
      phase: "unknown",
      source: "unavailable",
      note: "Biological model not loaded."
    };
  }

  function elevationIndex(grid, row, col, rows, cols) {
    if (!grid || !grid.length) return null;
    var i = row * cols + col;
    if (i < 0 || i >= grid.length) return null;
    var e = grid[i];
    return typeof e === "number" && isFinite(e) ? e : null;
  }

  function slopeAspectAt(grid, row, col, rows, cols, cellM) {
    var c = elevationIndex(grid, row, col, rows, cols);
    var n = elevationIndex(grid, row - 1, col, rows, cols);
    var s = elevationIndex(grid, row + 1, col, rows, cols);
    var w = elevationIndex(grid, row, col - 1, rows, cols);
    var e = elevationIndex(grid, row, col + 1, rows, cols);
    if (c == null || n == null || s == null || w == null || e == null) {
      return { slope: null, aspect: null, source: "unavailable" };
    }
    var dzdy = (s - n) / (2 * cellM);
    var dzdx = (e - w) / (2 * cellM);
    var slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
    var slopeDeg = slopeRad * 180 / Math.PI;
    var aspect = (Math.atan2(-dzdx, dzdy) * 180 / Math.PI + 360) % 360;
    var terrain = { slope: slopeDeg, aspect: aspect, elev: c, source: "map-derived" };
    var B = getBio();
    if (B && B.terrainMorphologyAt) {
      terrain.morphology = B.terrainMorphologyAt(grid, row, col, rows, cols);
    }
    return terrain;
  }

  function coverageFrom(inputs) {
    var present = 0;
    var total = 0;
    var keys = ["season", "terrain", "observations", "weather"];
    keys.forEach(function (k) {
      total += 1;
      if (inputs[k] && inputs[k] !== "unavailable") present += 1;
    });
    var ratio = present / total;
    if (ratio >= 0.75) return { level: "strong", label: "Stronger input coverage" };
    if (ratio >= 0.45) return { level: "moderate", label: "Moderate input coverage" };
    return { level: "limited", label: "Limited input coverage" };
  }

  function scoreCell(opts) {
    var B = getBio();
    if (!B || !B.scoreCell) {
      return {
        priority: 0.35,
        band: "lower",
        parts: {},
        labels: {},
        sources: { season: "unavailable", terrain: "unavailable", observations: "unavailable", weather: "unavailable", landCover: "unavailable" },
        explanation: "Biological model unavailable."
      };
    }
    return B.scoreCell(opts);
  }

  function explain(result, extras) {
    extras = extras || {};
    var B = getBio();
    var text = B && B.explain ? B.explain(result) : (result && result.explanation) || "No model result.";
    if (extras.coverage && extras.coverage.label) {
      text += " " + extras.coverage.label + " (data coverage, not find certainty).";
    }
    return text;
  }

  function buildGrid(bounds, rows, cols, context) {
    context = context || {};
    rows = rows || 20;
    cols = cols || 20;
    var west = bounds.getWest();
    var east = bounds.getEast();
    var south = bounds.getSouth();
    var north = bounds.getNorth();
    var elev = context.elevations || null;
    var midLat = (south + north) / 2;
    var cellM = haversineM(midLat, west, midLat, west + (east - west) / cols) || 80;
    var cells = [];
    var r;
    var c;
    var Sessions = context.sessions || global.WaypointShedsSessions;
    var covMap = Sessions && Sessions.coverageMap ? Sessions.coverageMap() : null;
    var coverageProbe = {
      season: "seasonal-rule",
      terrain: elev ? "map-derived" : "unavailable",
      observations: (context.observations && context.observations.length) ? "user-observation" : "unavailable",
      weather: (context.weather && context.weather.source) || "unavailable"
    };
    var coverage = coverageFrom(coverageProbe);
    var B = getBio();

    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var lat = north - (r + 0.5) * (north - south) / rows;
        var lng = west + (c + 0.5) * (east - west) / cols;
        var terrain = elev
          ? slopeAspectAt(elev, r, c, rows, cols, cellM)
          : { slope: null, aspect: null, morphology: { source: "unavailable" }, source: "unavailable" };
        var covLevel = null;
        var covFactor = 1;
        if (covMap && Sessions && Sessions.cellKey) {
          var hit = covMap[Sessions.cellKey(lat, lng)];
          if (hit) {
            covLevel = hit.level;
            covFactor = Sessions.coveragePenaltyFactor(hit.level);
          }
        }
        var scored = scoreCell({
          lat: lat,
          lng: lng,
          date: context.date,
          prefs: context.prefs,
          observations: context.observations,
          terrain: terrain,
          weather: context.weather,
          edgeHint: context.edgeHint,
          coverageLevel: covLevel,
          coverageFactor: covFactor
        });
        cells.push({
          row: r,
          col: c,
          lat: lat,
          lng: lng,
          priority: scored.priority,
          band: scored.band,
          coverageLevel: covLevel,
          result: scored
        });
      }
    }

    return {
      rows: rows,
      cols: cols,
      bounds: { west: west, east: east, south: south, north: north },
      cellMetersApprox: Math.round(cellM),
      coverage: coverage,
      cells: cells,
      speciesId: "odocoileus-virginianus",
      modelVersion: B ? B.MODEL_VERSION : null,
      disclaimer: "Relative search priority from Whitetail Biological Model v1.0 for the visible area only. Not a probability of finding sheds."
    };
  }

  function bandLabel(band) {
    if (band === "higher") return "Higher search priority";
    if (band === "moderate") return "Moderate search priority";
    return "Lower search priority";
  }

  global.WaypointShedsLikelihood = {
    WEIGHT_SCALE: WEIGHT_SCALE,
    seasonProfile: seasonProfile,
    scoreCell: scoreCell,
    explain: explain,
    buildGrid: buildGrid,
    coverageFrom: coverageFrom,
    bandLabel: bandLabel,
    haversineM: haversineM,
    weightOf: weightOf,
    slopeAspectAt: slopeAspectAt
  };
})(typeof window !== "undefined" ? window : globalThis);
