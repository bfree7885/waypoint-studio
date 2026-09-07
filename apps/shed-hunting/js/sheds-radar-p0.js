/**
 * Sheds RADAR P0 — viewport-scoped relative search-interest surface (architecture proof).
 *
 * Pure / deterministic. Reuses WaypointShedsSearchPriorityToday per cell.
 * NOT shed/find probability. NOT production launch. Pike pack AOI only.
 *
 * Spec: docs/sheds/SHEDS-RADAR-P0.md
 */
(function (global) {
  "use strict";

  var VERSION = "radar-p0.1";
  var TARGET_CELL_M = 90;
  var TARGET_SPAN_M = 4500;
  var MAX_DIM = 56;
  var MAX_CELLS = 3136;
  var MIN_ZOOM = 11;

  /**
   * Controlled condition frames for the P0 proof.
   * Frame A: cold / snow-limiting — no solar trigger.
   * Frame B: warming / thaw — solar_searchability on southish aspect.
   */
  var FRAMES = Object.freeze({
    A: Object.freeze({
      id: "A",
      label: "Neutral / Cold",
      shortLabel: "Cold",
      conditions: Object.freeze({
        snowCoverStatus: "limiting",
        freezeThawStatus: null,
        tempTrendStatus: "cooling",
        seasonCategory: "late_winter"
      })
    }),
    B: Object.freeze({
      id: "B",
      label: "Warming / Thaw",
      shortLabel: "Thaw",
      conditions: Object.freeze({
        snowCoverStatus: "light",
        freezeThawStatus: "freeze_thaw",
        tempTrendStatus: "warming",
        seasonCategory: "late_winter"
      })
    })
  });

  /** Phase 1 base score mapping (documented): GIS band → 0|1|2 */
  var GIS_BASE = Object.freeze({
    stronger: 2,
    some: 1,
    limited: 0
  });

  function finiteNum(n) {
    return typeof n === "number" && isFinite(n);
  }

  function metersPerDegLng(lat) {
    return 111320 * Math.cos(((finiteNum(lat) ? lat : 40) * Math.PI) / 180);
  }

  function intersectBounds(a, b) {
    if (!a || !b) return null;
    var west = Math.max(a.west, b.west);
    var east = Math.min(a.east, b.east);
    var south = Math.max(a.south, b.south);
    var north = Math.min(a.north, b.north);
    if (!(east > west) || !(north > south)) return null;
    return { west: west, east: east, south: south, north: north };
  }

  function clampSpan(bounds, maxSpanM) {
    if (!bounds) return null;
    maxSpanM = maxSpanM != null ? maxSpanM : TARGET_SPAN_M;
    var lat = (bounds.north + bounds.south) / 2;
    var lng = (bounds.east + bounds.west) / 2;
    var spanLatM = Math.abs(bounds.north - bounds.south) * 111320;
    var spanLngM = Math.abs(bounds.east - bounds.west) * metersPerDegLng(lat);
    var halfLat = (Math.min(spanLatM, maxSpanM) / 111320) / 2;
    var halfLng = (Math.min(spanLngM, maxSpanM) / metersPerDegLng(lat)) / 2;
    return {
      north: lat + halfLat,
      south: lat - halfLat,
      west: lng - halfLng,
      east: lng + halfLng
    };
  }

  function dimsForBounds(bounds, cellM) {
    cellM = cellM || TARGET_CELL_M;
    var lat = (bounds.north + bounds.south) / 2;
    var spanLatM = Math.abs(bounds.north - bounds.south) * 111320;
    var spanLngM = Math.abs(bounds.east - bounds.west) * metersPerDegLng(lat);
    var rows = Math.max(4, Math.min(MAX_DIM, Math.round(spanLatM / cellM)));
    var cols = Math.max(4, Math.min(MAX_DIM, Math.round(spanLngM / cellM)));
    while (rows * cols > MAX_CELLS) {
      if (rows >= cols) rows -= 1;
      else cols -= 1;
    }
    var cellLatM = spanLatM / rows;
    var cellLngM = spanLngM / cols;
    return {
      rows: rows,
      cols: cols,
      cellSizeMApprox: Math.round(((cellLatM + cellLngM) / 2) * 10) / 10
    };
  }

  function viewportAnalysisBounds(mapBounds, packBounds, opts) {
    opts = opts || {};
    var maxSpan = opts.maxSpanM != null ? opts.maxSpanM : TARGET_SPAN_M;
    var mb = mapBounds;
    if (mb && typeof mb.getWest === "function") {
      mb = {
        west: mb.getWest(),
        east: mb.getEast(),
        south: mb.getSouth(),
        north: mb.getNorth()
      };
    }
    if (!packBounds) return { ok: false, reason: "no_pack", bounds: null };
    if (!mb) return { ok: false, reason: "no_viewport", bounds: null };
    var clipped = intersectBounds(mb, packBounds);
    if (!clipped) return { ok: false, reason: "outside_pack", bounds: null };
    var windowed = clampSpan(clipped, maxSpan);
    // Re-clip after centering clamp so we never leave pack.
    windowed = intersectBounds(windowed, packBounds);
    if (!windowed) return { ok: false, reason: "outside_pack", bounds: null };
    return { ok: true, reason: "ready", bounds: windowed };
  }

  function cacheKey(bounds, rows, cols, packId) {
    if (!bounds) return "";
    return [
      packId || "nopack",
      Number(bounds.west).toFixed(4),
      Number(bounds.south).toFixed(4),
      Number(bounds.east).toFixed(4),
      Number(bounds.north).toFixed(4),
      rows || 0,
      cols || 0,
      TARGET_CELL_M
    ].join("|");
  }

  function getModel() {
    return global.WaypointShedsSearchPriorityToday || null;
  }

  function getHabitatGis() {
    return global.WaypointShedsHabitatGis || null;
  }

  function getGisPack() {
    return global.WaypointShedsGisPack || null;
  }

  function getSearchPriority() {
    return global.WaypointShedsSearchPriority || null;
  }

  /**
   * Build BASE landscape field from pack GIS only (no conditions, no aspect yet).
   * Observations intentionally excluded.
   */
  function buildBaseField(opts) {
    opts = opts || {};
    var pack = opts.pack;
    var bounds = opts.bounds;
    var HabitatGis = opts.HabitatGis || getHabitatGis();
    var GisPack = opts.GisPack || getGisPack();
    if (!pack || !bounds || !HabitatGis || !GisPack) {
      return {
        ok: false,
        reason: "missing_inputs",
        field: null
      };
    }
    var dims = opts.rows && opts.cols
      ? {
          rows: opts.rows,
          cols: opts.cols,
          cellSizeMApprox: opts.cellSizeMApprox || TARGET_CELL_M
        }
      : dimsForBounds(bounds, opts.cellM || TARGET_CELL_M);
    var rows = dims.rows;
    var cols = dims.cols;
    var cells = [];
    var scored = 0;
    var r;
    var c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var u = (c + 0.5) / cols;
        var v = (r + 0.5) / rows;
        var lat = bounds.north - v * (bounds.north - bounds.south);
        var lng = bounds.west + u * (bounds.east - bounds.west);
        var inPack = GisPack.inBounds(pack, lat, lng);
        var sample = inPack ? GisPack.sample(pack, lat, lng) : null;
        var scoredPt =
          sample && HabitatGis.scorePoint
            ? HabitatGis.scorePoint({
                sample: sample,
                lat: lat,
                lng: lng,
                includeObservations: false
              })
            : null;
        var gisBand =
          scoredPt && scoredPt.band && !scoredPt.unavailable ? scoredPt.band.id : null;
        if (!(gisBand === "stronger" || gisBand === "some" || gisBand === "limited")) {
          gisBand = null;
        }
        if (gisBand) scored += 1;
        cells.push({
          row: r,
          col: c,
          lat: lat,
          lng: lng,
          outsideArea: !inPack || !gisBand,
          gisBand: gisBand,
          slopeDeg: sample && sample.slopeDeg != null ? sample.slopeDeg : null,
          edgeM: sample && sample.edgeM != null ? sample.edgeM : null,
          structure: sample && sample.structure ? sample.structure : null,
          structureLabel: sample && sample.structureLabel ? sample.structureLabel : null,
          nlcd: sample && sample.nlcd != null ? sample.nlcd : null,
          aspectCardinal: null,
          featureKind: null,
          elevM: null,
          baseScore: gisBand != null ? GIS_BASE[gisBand] : null
        });
      }
    }
    if (!scored) {
      return {
        ok: false,
        reason: "insufficient_spatial",
        field: null
      };
    }
    return {
      ok: true,
      reason: "ready",
      field: {
        version: VERSION,
        packId: pack.packId,
        bounds: bounds,
        rows: rows,
        cols: cols,
        cellSizeMApprox: dims.cellSizeMApprox,
        cells: cells,
        scoredCount: scored,
        terrainEnriched: false,
        elevFetchCount: 0,
        key: cacheKey(bounds, rows, cols, pack.packId)
      }
    };
  }

  /**
   * Enrich base field with elevation-derived aspect / featureKind.
   * elevations: halo array of (rows+2)*(cols+2) matching SearchPriority.haloLatLngs order.
   * Mutates a shallow-copied field (cells cloned) — does not mutate input.
   */
  function enrichWithTerrain(baseField, elevations, opts) {
    opts = opts || {};
    var SP = opts.SearchPriority || getSearchPriority();
    if (!baseField || !baseField.cells || !baseField.cells.length) {
      return { ok: false, reason: "no_base", field: null, elevUsed: false };
    }
    var rows = baseField.rows;
    var cols = baseField.cols;
    var haloRows = rows + 2;
    var haloCols = cols + 2;
    var cells = baseField.cells.map(function (c) {
      return Object.assign({}, c);
    });
    var out = Object.assign({}, baseField, {
      cells: cells,
      terrainEnriched: false,
      elevFetchCount: (baseField.elevFetchCount || 0) + (opts.countedFetch ? 1 : 0)
    });

    if (!elevations || !elevations.length || !SP || !SP.evaluateGrid) {
      return { ok: true, reason: "terrain_skipped", field: out, elevUsed: false };
    }
    if (elevations.length < haloRows * haloCols) {
      return { ok: true, reason: "terrain_incomplete", field: out, elevUsed: false };
    }

    var terrainGrid = SP.evaluateGrid({
      zoom: opts.zoom != null ? opts.zoom : 13,
      rows: rows,
      cols: cols,
      bounds: baseField.bounds,
      elevations: elevations
    });
    if (!terrainGrid || terrainGrid.status !== "ready" || !terrainGrid.cells) {
      return { ok: true, reason: "terrain_unavailable", field: out, elevUsed: true };
    }

    var i;
    for (i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var t = terrainGrid.cells[i];
      if (!t || t.outsideArea || t.status !== "ready") continue;
      if (t.aspectCardinal) cell.aspectCardinal = t.aspectCardinal;
      if (t.featureKind) cell.featureKind = t.featureKind;
      if (t.slopeDeg != null && cell.slopeDeg == null) cell.slopeDeg = t.slopeDeg;
      if (t.elevM != null) cell.elevM = t.elevM;
    }
    out.terrainEnriched = true;
    out.terrainStatus = terrainGrid.status;
    return { ok: true, reason: "ready", field: out, elevUsed: true, terrainGrid: terrainGrid };
  }

  function modelCellFromBase(cell) {
    if (!cell || cell.outsideArea || !cell.gisBand) return null;
    return {
      id: "radar-" + cell.row + "-" + cell.col,
      row: cell.row,
      col: cell.col,
      lat: cell.lat,
      lng: cell.lng,
      gisBand: cell.gisBand,
      slopeDeg: cell.slopeDeg,
      aspectCardinal: cell.aspectCardinal || null,
      featureKind: cell.featureKind || null
    };
  }

  /**
   * Apply condition frame via Phase 1 evaluateCell. Returns paint grid for heat layer.
   */
  function applyFrame(baseField, frameOrId, opts) {
    opts = opts || {};
    var Model = opts.Model || getModel();
    var frame =
      typeof frameOrId === "string"
        ? FRAMES[frameOrId]
        : frameOrId && frameOrId.id
          ? FRAMES[frameOrId.id] || frameOrId
          : null;
    if (!baseField || !baseField.cells) {
      return emptyRadarGrid("No base landscape field.");
    }
    if (!frame || !frame.conditions) {
      return emptyRadarGrid("Unknown condition frame.");
    }
    if (!Model || !Model.evaluateCell) {
      return emptyRadarGrid("Search Priority Today model unavailable.");
    }

    var conditions = frame.conditions;
    var cells = [];
    var changedBySolar = 0;
    var changedBySnow = 0;
    var ready = 0;
    var i;
    for (i = 0; i < baseField.cells.length; i++) {
      var src = baseField.cells[i];
      var adapted = modelCellFromBase(src);
      if (!adapted) {
        cells.push({
          row: src.row,
          col: src.col,
          lat: src.lat,
          lng: src.lng,
          outsideArea: true,
          band: null,
          priority: 0,
          score: null,
          interest: null,
          status: "insufficient_spatial",
          gisBand: src.gisBand,
          slopeDeg: src.slopeDeg,
          aspectCardinal: src.aspectCardinal,
          featureKind: src.featureKind,
          edgeM: src.edgeM,
          structure: src.structure,
          structureLabel: src.structureLabel,
          factors: []
        });
        continue;
      }
      var ev = Model.evaluateCell({ cell: adapted, conditions: conditions });
      var mods = (ev && ev.modifiers) || [];
      var j;
      for (j = 0; j < mods.length; j++) {
        if (mods[j].id === "solar_searchability") changedBySolar += 1;
        if (mods[j].id === "snow_practicality") changedBySnow += 1;
      }
      var score = ev && ev.status === "ready" ? ev.score : null;
      var band = ev && ev.status === "ready" ? ev.band : null;
      if (ev && ev.status === "ready") ready += 1;
      cells.push({
        row: src.row,
        col: src.col,
        lat: src.lat,
        lng: src.lng,
        outsideArea: !(ev && ev.status === "ready"),
        band: band,
        // Continuous 0–1 for bilinear display only (score is 0–3 relative interest).
        priority: score != null ? score / 3 : 0,
        score: score,
        interest: ev || null,
        status: ev ? ev.status : "insufficient_spatial",
        gisBand: src.gisBand,
        slopeDeg: src.slopeDeg,
        aspectCardinal: src.aspectCardinal,
        featureKind: src.featureKind,
        edgeM: src.edgeM,
        structure: src.structure,
        structureLabel: src.structureLabel,
        baseScore: src.baseScore,
        factors: explainFactors(src, ev)
      });
    }

    return {
      ok: ready > 0,
      reason: ready > 0 ? "ready" : "insufficient_spatial",
      grid: {
        cells: cells,
        rows: baseField.rows,
        cols: baseField.cols,
        bounds: baseField.bounds,
        renderMode: "radar-interest",
        smoothDisplay: true,
        modelVersion: VERSION,
        frameId: frame.id,
        frameLabel: frame.label,
        habitatEmpty: ready === 0,
        unavailable: ready === 0,
        disclaimer:
          "Relative Search Interest — smoothed display; analysis ≈" +
          Math.round(baseField.cellSizeMApprox) +
          " m. Not find probability.",
        coverage: {
          level: ready ? "moderate" : "limited",
          label: ready
            ? "Relative Search Interest · " + frame.label
            : "Limited radar coverage"
        },
        cellMetersApprox: baseField.cellSizeMApprox,
        packId: baseField.packId,
        baseKey: baseField.key,
        terrainEnriched: !!baseField.terrainEnriched,
        stats: {
          ready: ready,
          solarModifiers: changedBySolar,
          snowModifiers: changedBySnow
        }
      },
      frame: frame,
      baseKey: baseField.key
    };
  }

  function explainFactors(src, ev) {
    var factors = [];
    if (src && src.gisBand) {
      factors.push({
        id: "base_gis",
        label: "Base habitat GIS band",
        value: src.gisBand,
        detail:
          (src.structureLabel || src.structure || "structure") +
          (src.edgeM != null ? " · edge ~" + Math.round(src.edgeM) + " m" : "")
      });
    }
    if (src && src.slopeDeg != null) {
      factors.push({
        id: "slope",
        label: "Slope",
        value: Math.round(src.slopeDeg) + "°",
        detail: "From pack / elevation-derived terrain"
      });
    }
    if (src && src.aspectCardinal) {
      factors.push({
        id: "aspect",
        label: "Aspect",
        value: src.aspectCardinal,
        detail: "Elevation-derived cardinal aspect"
      });
    } else {
      factors.push({
        id: "aspect_missing",
        label: "Aspect",
        value: "unavailable",
        detail: "No aspect — solar_searchability not applied"
      });
    }
    if (src && src.featureKind) {
      factors.push({
        id: "feature",
        label: "Terrain feature",
        value: src.featureKind,
        detail: "Elevation-derived feature kind"
      });
    }
    if (ev && ev.modifiers) {
      var i;
      for (i = 0; i < ev.modifiers.length; i++) {
        factors.push({
          id: ev.modifiers[i].id,
          label: ev.modifiers[i].id,
          value: (ev.modifiers[i].delta > 0 ? "+" : "") + ev.modifiers[i].delta,
          detail: ev.modifiers[i].reason
        });
      }
    }
    if (ev && ev.status === "ready" && ev.score != null) {
      factors.push({
        id: "relative_score",
        label: "Relative interest score",
        value: String(ev.score),
        detail: "0–3 relative scale — not probability"
      });
    }
    return factors;
  }

  function emptyRadarGrid(message) {
    return {
      ok: false,
      reason: "empty",
      grid: {
        cells: [],
        rows: 0,
        cols: 0,
        bounds: { west: 0, east: 0, south: 0, north: 0 },
        renderMode: "radar-interest",
        smoothDisplay: true,
        modelVersion: VERSION,
        habitatEmpty: true,
        unavailable: true,
        disclaimer: message || "Radar surface unavailable.",
        coverage: { level: "limited", label: message || "Limited coverage" },
        cellMetersApprox: TARGET_CELL_M
      }
    };
  }

  function explainAt(grid, latlng) {
    if (!grid || !grid.cells || !grid.cells.length || !latlng) return null;
    var best = null;
    var bestD = Infinity;
    var i;
    for (i = 0; i < grid.cells.length; i++) {
      var c = grid.cells[i];
      if (!c || c.outsideArea) continue;
      var d = Math.pow(c.lat - latlng.lat, 2) + Math.pow(c.lng - latlng.lng, 2);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (!best) return null;
    return {
      cell: best,
      frameId: grid.frameId || null,
      frameLabel: grid.frameLabel || null,
      cellMetersApprox: grid.cellMetersApprox,
      factors: best.factors || [],
      score: best.score,
      band: best.band,
      disclaimer:
        "Relative Search Interest at analysis ≈" +
        Math.round(grid.cellMetersApprox || TARGET_CELL_M) +
        " m — smoothed display is visual only."
    };
  }

  /**
   * Compare two paint grids on identical geography; report which cells changed.
   */
  function diffFrames(gridA, gridB) {
    var a = (gridA && gridA.cells) || [];
    var b = (gridB && gridB.cells) || [];
    var n = Math.min(a.length, b.length);
    var changed = 0;
    var unchanged = 0;
    var solarOnly = 0;
    var i;
    for (i = 0; i < n; i++) {
      var ca = a[i];
      var cb = b[i];
      if (!ca || !cb || ca.outsideArea || cb.outsideArea) continue;
      if (ca.score === cb.score) {
        unchanged += 1;
      } else {
        changed += 1;
        var modsB = (cb.interest && cb.interest.modifiers) || [];
        var hasSolar = modsB.some(function (m) {
          return m.id === "solar_searchability";
        });
        var modsA = (ca.interest && ca.interest.modifiers) || [];
        var hadSolar = modsA.some(function (m) {
          return m.id === "solar_searchability";
        });
        if (hasSolar && !hadSolar) solarOnly += 1;
      }
    }
    return {
      changed: changed,
      unchanged: unchanged,
      solarGained: solarOnly,
      uniformBoost: changed > 0 && unchanged === 0 && a.length === b.length
    };
  }

  function packDemoCenter(pack) {
    if (!pack || !pack.bounds) return null;
    var b = pack.bounds;
    return {
      lat: (b.north + b.south) / 2,
      lng: (b.east + b.west) / 2,
      zoom: 13
    };
  }

  var api = {
    VERSION: VERSION,
    TARGET_CELL_M: TARGET_CELL_M,
    TARGET_SPAN_M: TARGET_SPAN_M,
    MAX_DIM: MAX_DIM,
    MAX_CELLS: MAX_CELLS,
    MIN_ZOOM: MIN_ZOOM,
    FRAMES: FRAMES,
    GIS_BASE: GIS_BASE,
    viewportAnalysisBounds: viewportAnalysisBounds,
    dimsForBounds: dimsForBounds,
    cacheKey: cacheKey,
    buildBaseField: buildBaseField,
    enrichWithTerrain: enrichWithTerrain,
    applyFrame: applyFrame,
    explainAt: explainAt,
    diffFrames: diffFrames,
    emptyRadarGrid: emptyRadarGrid,
    packDemoCenter: packDemoCenter,
    intersectBounds: intersectBounds,
    clampSpan: clampSpan
  };

  global.WaypointShedsRadarP0 = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
