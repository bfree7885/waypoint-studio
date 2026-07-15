/**
 * Sheds — transparent shed search-priority model (whitetail-focused v0.1).
 * Deterministic. Explainable. Never claims "probability of finding an antler."
 *
 * Scores are relative search priority for the active map region only.
 */
(function (global) {
  "use strict";

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
    var w = (prefs && prefs.weights && prefs.weights[key]) || "balanced";
    return WEIGHT_SCALE[w] != null ? WEIGHT_SCALE[w] : 1;
  }

  /** Northern hemisphere whitetail shed timing heuristic — uncertain by design. */
  function seasonProfile(date, lat) {
    date = date || new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var doy = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
    var northern = !(typeof lat === "number" && lat < 0);
    // Rough peak Feb–Mar mid-latitudes; earlier south / later north — soft bands only.
    var peakCenter = northern ? (lat > 45 ? 75 : lat > 38 ? 55 : 40) : 220;
    var dist = Math.min(Math.abs(doy - peakCenter), Math.abs(doy - peakCenter + 365), Math.abs(doy - peakCenter - 365));
    var seasonScore = clamp(1 - dist / 70, 0.12, 1);
    var phase = "off-peak";
    if (dist <= 20) phase = "peak";
    else if (dist <= 45) phase = "shoulder";
    else if (northern && (month === 12 || month <= 4)) phase = "early-to-late window";
    return {
      score: seasonScore,
      phase: phase,
      source: "seasonal-rule",
      note: "Timing varies by animal, nutrition, weather, and local conditions. This is a regional heuristic, not a forecast of sheds on the ground."
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
    return { slope: slopeDeg, aspect: aspect, elev: c, source: "map-derived" };
  }

  function slopePreferenceScore(slopeDeg, weight) {
    if (slopeDeg == null || weight <= 0) return { score: 0.5, label: "slope unused" };
    // Gentle to moderate often preferred for winter travel / findability; steep less.
    var ideal = 8;
    var score = clamp(1 - Math.abs(slopeDeg - ideal) / 28, 0.05, 1);
    if (slopeDeg > 35) score *= 0.45;
    return { score: score, label: slopeDeg < 5 ? "flat" : slopeDeg < 15 ? "gentle" : slopeDeg < 28 ? "moderate" : "steep" };
  }

  function aspectPreferenceScore(aspect, weight) {
    if (aspect == null || weight <= 0) return { score: 0.5, label: "aspect unused" };
    // Soft preference for sunnier (S–SW in northern hemisphere) winter bedding edges — not universal.
    var sun = Math.cos((aspect - 200) * Math.PI / 180);
    var score = clamp(0.55 + 0.35 * sun, 0.15, 1);
    return { score: score, label: sun > 0.25 ? "more sun-exposed" : sun < -0.25 ? "more shaded" : "mixed aspect" };
  }

  function kernel(distM, radiusM) {
    if (distM >= radiusM) return 0;
    var t = distM / radiusM;
    return (1 - t) * (1 - t);
  }

  function observationInfluence(lat, lng, observations, prefs) {
    observations = observations || [];
    var parts = {
      feeding: 0,
      bedding: 0,
      corridors: 0,
      deerSign: 0,
      fences: 0,
      searchPenalty: 0,
      shedBoost: 0,
      beddingCluster: 0,
      reasons: []
    };
    var beddingNearby = 0;
    var i;
    for (i = 0; i < observations.length; i++) {
      var o = observations[i];
      if (!o || !o.location) continue;
      var d = haversineM(lat, lng, o.location.lat, o.location.lng);
      var t = o.type;
      if (t === "feeding_area") {
        var f = kernel(d, 900) * weightOf(prefs, "feeding");
        if (f > parts.feeding) parts.feeding = f;
      } else if (t === "bedding_area" || t === "winter_concentration") {
        var b = kernel(d, 800) * weightOf(prefs, "bedding");
        if (b > parts.bedding) parts.bedding = b;
        if (d < 350) beddingNearby += 1;
      } else if (t === "trail_crossing") {
        var c = kernel(d, 700) * weightOf(prefs, "corridors");
        if (c > parts.corridors) parts.corridors = c;
      } else if (t === "fence_crossing") {
        var fc = kernel(d, 550) * weightOf(prefs, "fences");
        if (fc > parts.fences) parts.fences = fc;
      } else if (t === "deer_sign" || t === "deer_seen") {
        var freshness = 1;
        // Prefer fresher notes when confidence is confirmed
        if (o.confidence === "confirmed") freshness = 1.12;
        if (o.confidence === "uncertain") freshness = 0.9;
        var s = kernel(d, 1000) * weightOf(prefs, "deerSign") * (t === "deer_seen" ? 0.85 : 1) * freshness;
        if (s > parts.deerSign) parts.deerSign = s;
      } else if (t === "shed_found") {
        // Local interest increase — never a guarantee of additional sheds
        var sb = kernel(d, 650) * 0.55;
        if (sb > parts.shedBoost) parts.shedBoost = sb;
      } else if (t === "search_completed") {
        var p = kernel(d, 450) * weightOf(prefs, "searchHistory");
        if (p > parts.searchPenalty) parts.searchPenalty = p;
      } else if (t === "habitat_note") {
        var e = kernel(d, 700) * weightOf(prefs, "edges") * 0.55;
        if (e > parts.corridors) parts.corridors = Math.max(parts.corridors, e);
      }
    }
    if (beddingNearby >= 2) {
      parts.beddingCluster = clamp(0.15 * (beddingNearby - 1), 0, 0.35);
      parts.bedding = clamp(parts.bedding + parts.beddingCluster, 0, 1.2);
    }
    return parts;
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
    opts = opts || {};
    var prefs = opts.prefs || { weights: {} };
    var season = seasonProfile(opts.date, opts.lat);
    var wSeason = weightOf(prefs, "season");
    var terrain = opts.terrain || { slope: null, aspect: null, source: "unavailable" };
    var slope = slopePreferenceScore(terrain.slope, weightOf(prefs, "slope"));
    var aspect = aspectPreferenceScore(terrain.aspect, weightOf(prefs, "aspect"));
    var obs = observationInfluence(opts.lat, opts.lng, opts.observations, prefs);

    // Habitat edges / land cover: unavailable unless caller supplies a score (never invent cover).
    var edgeScore = 0.5;
    var edgeSource = "unavailable";
    if (typeof opts.edgeHint === "number") {
      edgeScore = clamp(opts.edgeHint, 0, 1);
      edgeSource = "estimated";
    }

    var snowFactor = 1;
    var snowSource = "unavailable";
    if (opts.weather && typeof opts.weather.snowInfluence === "number") {
      snowFactor = clamp(opts.weather.snowInfluence, 0.55, 1.15);
      snowSource = opts.weather.source || "weather-provider";
    }

    var base =
      0.26 * season.score * wSeason +
      0.15 * slope.score * weightOf(prefs, "slope") +
      0.11 * aspect.score * weightOf(prefs, "aspect") +
      0.09 * edgeScore * weightOf(prefs, "edges") +
      0.11 * obs.feeding +
      0.10 * obs.bedding +
      0.08 * obs.corridors +
      0.07 * obs.deerSign +
      0.06 * obs.fences +
      0.05 * obs.shedBoost;

    var searchW = weightOf(prefs, "searchHistory");
    var afterSearch = base * (1 - 0.55 * obs.searchPenalty * (searchW > 0 ? 1 : 0));
    afterSearch *= (weightOf(prefs, "snow") > 0 ? snowFactor : 1);

    // Coverage marks from sessions (partial/thorough) — reduce planner priority only
    var coverageFactor = 1;
    var coverageLevel = opts.coverageLevel || null;
    if (opts.coverageFactor != null && isFinite(opts.coverageFactor)) {
      coverageFactor = clamp(opts.coverageFactor, 0.2, 1.15);
    }
    afterSearch *= coverageFactor;

    var priority = clamp(afterSearch, 0, 1.35);
    // Normalize soft ceiling
    priority = clamp(priority / 1.2, 0, 1);

    var band = "lower";
    if (priority >= 0.72) band = "higher";
    else if (priority >= 0.45) band = "moderate";

    var inputs = {
      season: season.source,
      terrain: terrain.source,
      observations: (opts.observations && opts.observations.length) ? "user-observation" : "unavailable",
      weather: snowSource,
      landCover: edgeSource
    };

    return {
      priority: priority,
      band: band,
      parts: {
        season: season.score * wSeason,
        slope: slope.score,
        aspect: aspect.score,
        feeding: obs.feeding,
        bedding: obs.bedding,
        corridors: obs.corridors,
        deerSign: obs.deerSign,
        fences: obs.fences,
        shedBoost: obs.shedBoost,
        searchPenalty: obs.searchPenalty,
        snowFactor: snowFactor,
        coverageFactor: coverageFactor
      },
      labels: {
        seasonPhase: season.phase,
        slope: slope.label,
        aspect: aspect.label,
        coverageLevel: coverageLevel
      },
      sources: inputs,
      seasonNote: season.note,
      contributionBreakdown: [
        { key: "season", label: "Season timing", value: season.score * wSeason },
        { key: "slope", label: "Slope", value: slope.score * weightOf(prefs, "slope") },
        { key: "aspect", label: "Aspect / sun", value: aspect.score * weightOf(prefs, "aspect") },
        { key: "feeding", label: "Feeding notes", value: obs.feeding },
        { key: "bedding", label: "Bedding / cover", value: obs.bedding },
        { key: "sign", label: "Deer sign", value: obs.deerSign },
        { key: "sheds", label: "Prior shed finds nearby", value: obs.shedBoost },
        { key: "search", label: "Search-history reduction", value: obs.searchPenalty },
        { key: "coverage", label: "Coverage mark factor", value: coverageFactor }
      ]
    };
  }

  function explain(result, extras) {
    extras = extras || {};
    if (!result) return "No model result for this cell.";
    var lines = [];
    var bandLabel = result.band === "higher" ? "Higher modeled search priority"
      : result.band === "moderate" ? "Moderate modeled search priority"
        : "Lower modeled search priority";
    lines.push(bandLabel + ".");

    var reasons = [];
    if (result.parts.feeding > 0.25) reasons.push("near a recorded feeding area");
    if (result.parts.bedding > 0.25) reasons.push("near recorded bedding or winter cover notes");
    if (result.parts.corridors > 0.25) reasons.push("near travel / corridor notes");
    if (result.parts.fences > 0.2) reasons.push("near a fence-crossing note");
    if (result.parts.deerSign > 0.25) reasons.push("near recent deer sign or sightings");
    if (result.parts.shedBoost > 0.15) reasons.push("near a prior shed find (raises interest, not a guarantee)");
    if (result.parts.searchPenalty > 0.25) reasons.push("reduced because of nearby “search completed” notes");
    if (result.parts.coverageFactor != null && result.parts.coverageFactor < 0.9) {
      reasons.push("reduced by on-map search coverage marks");
    }
    if (result.labels.aspect && result.sources.terrain === "map-derived") {
      reasons.push(result.labels.aspect + " terrain (" + result.labels.slope + " slope)");
    }
    if (result.labels.seasonPhase) {
      reasons.push("season heuristic is “" + result.labels.seasonPhase + "”");
    }
    if (!reasons.length) {
      lines.push("Based mainly on season timing and terrain settings; few local observations influence this cell.");
    } else {
      lines.push(reasons.slice(0, 4).join("; ") + ".");
    }
    if (result.sources.terrain === "unavailable") {
      lines.push("Limited confidence for slope/aspect because elevation samples are unavailable.");
    }
    if (result.sources.landCover === "unavailable") {
      lines.push("Land-cover layers are not loaded; habitat-edge influence is generalized or off.");
    }
    lines.push("This is relative search guidance for whitetail shed walking — not a map of antlers.");
    if (extras.coverage && extras.coverage.label) {
      lines.push(extras.coverage.label + " (data coverage, not find certainty).");
    }
    return lines.join(" ");
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

    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var lat = north - (r + 0.5) * (north - south) / rows;
        var lng = west + (c + 0.5) * (east - west) / cols;
        var terrain = elev
          ? slopeAspectAt(elev, r, c, rows, cols, cellM)
          : { slope: null, aspect: null, source: "unavailable" };
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
      disclaimer: "Relative search priority for the visible area only. Not a probability of finding sheds."
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
    weightOf: weightOf
  };
})(window);
