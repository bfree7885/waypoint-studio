/**
 * Sheds RADAR — viewport-scoped relative search-interest surface.
 *
 * P1: continuous static base landscape (WaypointShedsRadarBaseLandscape).
 * P2: live RadarConditionFrame + unit-scale selective modifiers (Today).
 * Controlled Frame A/B/neutral remain test/evidence fixtures only.
 *
 * Pure / deterministic. Reuses WaypointShedsSearchPriorityToday per cell.
 * NOT shed/find probability. NOT production launch. Pike pack AOI only.
 *
 * Spec: docs/sheds/SHEDS-RADAR-P2.md
 */
(function (global) {
  "use strict";

  var VERSION = "radar-p2.0";
  var TARGET_CELL_M = 90;
  var TARGET_SPAN_M = 4500;
  var MAX_DIM = 56;
  var MAX_CELLS = 3136;
  var MIN_ZOOM = 11;

  /**
   * Controlled condition frames for regression / evidence (not customer modes).
   * Frame A: cold / snow-limiting — steep snow attenuation only on unit path.
   * Frame B: warming / thaw — solar_searchability on southish aspect.
   * Frame N: neutral — no spatial modifiers.
   */
  var FRAMES = Object.freeze({
    A: Object.freeze({
      id: "A",
      label: "Cold / snow-limiting (fixture)",
      shortLabel: "Cold",
      conditions: Object.freeze({
        snowCoverStatus: "limiting",
        freezeThawStatus: "below_freezing",
        tempTrendStatus: "cooling",
        seasonCategory: "late_winter"
      })
    }),
    B: Object.freeze({
      id: "B",
      label: "Warming / Thaw (fixture)",
      shortLabel: "Thaw",
      conditions: Object.freeze({
        snowCoverStatus: "light",
        freezeThawStatus: "freeze_thaw",
        tempTrendStatus: "warming",
        seasonCategory: "late_winter"
      })
    }),
    N: Object.freeze({
      id: "N",
      label: "Neutral (fixture)",
      shortLabel: "Neutral",
      conditions: Object.freeze({
        snowCoverStatus: "none",
        freezeThawStatus: "above_freezing",
        tempTrendStatus: "little_change",
        seasonCategory: "late_winter"
      })
    })
  });

  /** Legacy P0 GIS band → 0|1|2 (kept for tests/docs; RADAR base no longer uses this). */
  var GIS_BASE = Object.freeze({
    stronger: 2,
    some: 1,
    limited: 0
  });

  function getBaseLandscape() {
    return global.WaypointShedsRadarBaseLandscape || null;
  }

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
   * Build STATIC base landscape field from pack GIS via RADAR P1 scorer.
   * Observations / aspect / weather intentionally excluded from score.
   */
  function buildBaseField(opts) {
    opts = opts || {};
    var pack = opts.pack;
    var bounds = opts.bounds;
    var BaseLandscape = opts.BaseLandscape || getBaseLandscape();
    var GisPack = opts.GisPack || getGisPack();
    if (!pack || !bounds || !BaseLandscape || !GisPack) {
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
        var landscape = BaseLandscape.scoreSample
          ? BaseLandscape.scoreSample(sample)
          : null;
        var readyLandscape =
          landscape &&
          landscape.score != null &&
          (landscape.status === "ready" || landscape.status === "partial");
        if (readyLandscape) scored += 1;
        cells.push({
          row: r,
          col: c,
          lat: lat,
          lng: lng,
          outsideArea: !inPack || !readyLandscape,
          /** Continuous P1 analytical base [0,1] — not GIS bands. */
          baseScore: readyLandscape ? landscape.score : null,
          landscapeScore: readyLandscape ? landscape.score : null,
          landscapeLabel: readyLandscape ? landscape.displayLabel : null,
          landscape: landscape || null,
          /** Legacy optional — not the RADAR foundation. */
          gisBand: null,
          slopeDeg: sample && sample.slopeDeg != null ? sample.slopeDeg : null,
          edgeM: sample && sample.edgeM != null ? sample.edgeM : null,
          structure: sample && sample.structure ? sample.structure : null,
          structureLabel: sample && sample.structureLabel ? sample.structureLabel : null,
          nlcd: sample && sample.nlcd != null ? sample.nlcd : null,
          aspectCardinal: sample && sample.aspectCardinal ? sample.aspectCardinal : null,
          featureKind: null,
          elevM: null
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
    var withAspect = 0;
    var ci;
    for (ci = 0; ci < cells.length; ci++) {
      if (cells[ci].aspectCardinal) withAspect += 1;
    }
    var packHasAspect =
      GisPack && typeof GisPack.hasAspectLayer === "function"
        ? GisPack.hasAspectLayer(pack)
        : !!(pack && pack.aspectCardinal);
    return {
      ok: true,
      reason: "ready",
      field: {
        version: VERSION,
        baseModel: BaseLandscape.VERSION || "radar-base-landscape",
        packId: pack.packId,
        bounds: bounds,
        rows: rows,
        cols: cols,
        cellSizeMApprox: dims.cellSizeMApprox,
        cells: cells,
        scoredCount: scored,
        /** Pack-backed aspect/slope — no live Open-Meteo elevation required. */
        terrainEnriched: !!(packHasAspect && withAspect > 0),
        terrainSource: packHasAspect ? "gis-pack" : "pending-elevation",
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
    if (!cell || cell.outsideArea || cell.landscapeScore == null) return null;
    return {
      id: "radar-" + cell.row + "-" + cell.col,
      row: cell.row,
      col: cell.col,
      lat: cell.lat,
      lng: cell.lng,
      landscapeScore: cell.landscapeScore,
      landscapeLabel: cell.landscapeLabel || "base_landscape",
      landscape: cell.landscape || null,
      structure: cell.structure || null,
      water: !!(
        cell.structure === "water" ||
        (cell.landscape && cell.landscape.flags && cell.landscape.flags.water)
      ),
      slopeDeg: cell.slopeDeg,
      aspectCardinal: cell.aspectCardinal || null,
      featureKind: cell.featureKind || null
    };
  }

  /**
   * Paint static P1 base only (no condition modifiers) for inspection / evidence.
   */
  function paintStaticBase(baseField) {
    if (!baseField || !baseField.cells) {
      return emptyRadarGrid("No base landscape field.");
    }
    var cells = [];
    var ready = 0;
    var i;
    for (i = 0; i < baseField.cells.length; i++) {
      var src = baseField.cells[i];
      var score = src.landscapeScore != null ? src.landscapeScore : src.baseScore;
      var ok = !src.outsideArea && score != null;
      if (ok) ready += 1;
      var BaseLandscape = getBaseLandscape();
      var label =
        src.landscapeLabel ||
        (BaseLandscape && BaseLandscape.displayLabel ? BaseLandscape.displayLabel(score) : null);
      cells.push({
        row: src.row,
        col: src.col,
        lat: src.lat,
        lng: src.lng,
        outsideArea: !ok,
        band: label
          ? label === "Stronger"
            ? "stronger_interest"
            : label === "Moderate"
              ? "moderate_interest"
              : "lower_interest"
          : null,
        priority: ok ? score : 0,
        score: ok ? score : null,
        scoreScale: "unit",
        interest: null,
        status: ok ? "ready" : "insufficient_spatial",
        gisBand: null,
        slopeDeg: src.slopeDeg,
        aspectCardinal: src.aspectCardinal,
        featureKind: src.featureKind,
        edgeM: src.edgeM,
        structure: src.structure,
        structureLabel: src.structureLabel,
        baseScore: src.baseScore,
        landscapeScore: src.landscapeScore,
        landscape: src.landscape,
        factors: explainFactors(src, null, null, baseField.terrainSource)
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
        frameId: "LANDSCAPE",
        frameLabel: "Landscape",
        surfaceMode: "landscape",
        habitatEmpty: ready === 0,
        unavailable: ready === 0,
        disclaimer:
          "Landscape — static relative search interest; analysis ≈" +
          Math.round(baseField.cellSizeMApprox) +
          " m. Not find probability.",
        coverage: {
          level: ready ? "moderate" : "limited",
          label: ready ? "Landscape · relative interest" : "Limited radar coverage"
        },
        cellMetersApprox: baseField.cellSizeMApprox,
        packId: baseField.packId,
        baseKey: baseField.key,
        terrainEnriched: !!baseField.terrainEnriched,
        terrainSource: baseField.terrainSource || null,
        conditionStatus: null,
        stats: { ready: ready, solarModifiers: 0, snowModifiers: 0 }
      },
      frame: { id: "LANDSCAPE", label: "Landscape" },
      baseKey: baseField.key
    };
  }

  function paintCellsFromConditions(baseField, conditions, meta) {
    meta = meta || {};
    var Model = meta.Model || getModel();
    if (!baseField || !baseField.cells) {
      return emptyRadarGrid("No base landscape field.");
    }
    if (!Model || !Model.evaluateCell) {
      return emptyRadarGrid("Search Priority Today model unavailable.");
    }
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
          gisBand: null,
          slopeDeg: src.slopeDeg,
          aspectCardinal: src.aspectCardinal,
          featureKind: src.featureKind,
          edgeM: src.edgeM,
          structure: src.structure,
          structureLabel: src.structureLabel,
          baseScore: src.baseScore,
          landscapeScore: src.landscapeScore,
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
      // Hard water lock even if a caller bypassed evaluateCell guard.
      if (adapted.water || src.landscapeScore === 0) {
        score = 0;
        if (ev && ev.status === "ready") {
          ev = Object.assign({}, ev, {
            score: 0,
            band: Model.bandFromUnitScore ? Model.bandFromUnitScore(0) : "lower_interest",
            modifiers: [],
            flags: Object.assign({}, ev.flags || {}, { waterLocked: true })
          });
        }
      }
      var band = ev && ev.status === "ready" ? ev.band : null;
      var unit =
        ev && ev.scoreScale === "unit"
          ? true
          : score != null && score <= 1.0001;
      if (ev && ev.status === "ready") ready += 1;
      cells.push({
        row: src.row,
        col: src.col,
        lat: src.lat,
        lng: src.lng,
        outsideArea: !(ev && ev.status === "ready"),
        band: band,
        priority: score != null ? (unit ? score : score / 3) : 0,
        score: score,
        scoreScale: unit ? "unit" : "tri",
        interest: ev || null,
        status: ev ? ev.status : "insufficient_spatial",
        gisBand: null,
        slopeDeg: src.slopeDeg,
        aspectCardinal: src.aspectCardinal,
        featureKind: src.featureKind,
        edgeM: src.edgeM,
        structure: src.structure,
        structureLabel: src.structureLabel,
        baseScore: src.baseScore,
        landscapeScore: src.landscapeScore,
        landscape: src.landscape,
        factors: explainFactors(src, ev, meta.conditionFrame || null, baseField.terrainSource)
      });
    }

    var frameId = meta.frameId || "TODAY";
    var frameLabel = meta.frameLabel || "Today";
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
        frameId: frameId,
        frameLabel: frameLabel,
        surfaceMode: meta.surfaceMode || "today",
        habitatEmpty: ready === 0,
        unavailable: ready === 0,
        disclaimer:
          meta.disclaimer ||
          ("Today — relative search interest; analysis ≈" +
            Math.round(baseField.cellSizeMApprox) +
            " m. Not find probability."),
        coverage: {
          level: ready ? "moderate" : "limited",
          label: ready
            ? "Relative Search Interest · " + frameLabel
            : "Limited radar coverage"
        },
        cellMetersApprox: baseField.cellSizeMApprox,
        packId: baseField.packId,
        baseKey: baseField.key,
        terrainEnriched: !!baseField.terrainEnriched,
        terrainSource: baseField.terrainSource || null,
        conditionStatus: meta.conditionStatus || null,
        conditionFrame: meta.conditionFrame || null,
        stats: {
          ready: ready,
          solarModifiers: changedBySolar,
          snowModifiers: changedBySnow
        }
      },
      frame: { id: frameId, label: frameLabel, conditions: conditions },
      baseKey: baseField.key
    };
  }

  /**
   * Apply controlled fixture frame (A/B/N) via Phase 1 evaluateCell.
   * Test/evidence only — not customer product modes.
   */
  function applyFrame(baseField, frameOrId, opts) {
    opts = opts || {};
    var frame =
      typeof frameOrId === "string"
        ? FRAMES[frameOrId]
        : frameOrId && frameOrId.id
          ? FRAMES[frameOrId.id] || frameOrId
          : null;
    if (!frame || !frame.conditions) {
      return emptyRadarGrid("Unknown condition frame.");
    }
    return paintCellsFromConditions(baseField, frame.conditions, {
      Model: opts.Model,
      frameId: frame.id,
      frameLabel: frame.label,
      surfaceMode: "fixture",
      disclaimer:
        "Relative Search Interest (fixture) — smoothed display; analysis ≈" +
        (baseField && baseField.cellSizeMApprox
          ? Math.round(baseField.cellSizeMApprox)
          : TARGET_CELL_M) +
        " m. Not find probability."
    });
  }

  /**
   * Apply live RadarConditionFrame (from Weather package adapter — no fetch here).
   */
  function applyConditionFrame(baseField, conditionFrame, opts) {
    opts = opts || {};
    var FrameApi = opts.ConditionFrame || global.WaypointShedsRadarConditionFrame;
    if (!conditionFrame) {
      return paintStaticBase(baseField);
    }
    if (FrameApi && typeof FrameApi.canDriveTodaySurface === "function") {
      if (!FrameApi.canDriveTodaySurface(conditionFrame)) {
        var landscape = paintStaticBase(baseField);
        if (landscape.grid) {
          landscape.grid.conditionStatus =
            FrameApi.statusMessage(conditionFrame, "today");
          landscape.grid.conditionFrame = conditionFrame;
          landscape.grid.fallbackReason = conditionFrame.freshness || "unavailable";
        }
        return landscape;
      }
    }
    var conditions =
      FrameApi && typeof FrameApi.toModelConditions === "function"
        ? FrameApi.toModelConditions(conditionFrame)
        : {
            freezeThawStatus: conditionFrame.freezeThawStatus,
            tempTrendStatus: conditionFrame.tempTrendStatus,
            snowCoverStatus: conditionFrame.snowCoverStatus,
            seasonCategory: conditionFrame.seasonCategory
          };
    return paintCellsFromConditions(baseField, conditions, {
      Model: opts.Model,
      frameId: "TODAY",
      frameLabel: "Today",
      surfaceMode: "today",
      conditionFrame: conditionFrame,
      conditionStatus:
        FrameApi && FrameApi.statusMessage
          ? FrameApi.statusMessage(conditionFrame, "today")
          : null
    });
  }

  function explainFactors(src, ev, conditionFrame, terrainSource) {
    var factors = [];
    var packTerrain = terrainSource === "gis-pack";
    if (src && src.landscape && src.landscape.factors && src.landscape.factors.length) {
      var lf = src.landscape.factors;
      var k;
      for (k = 0; k < lf.length; k++) {
        factors.push(
          Object.assign({}, lf[k], { group: lf[k].group || "landscape" })
        );
      }
    } else if (src && src.landscapeScore != null) {
      factors.push({
        id: "relative_landscape",
        label: "Relative landscape interest",
        value: src.landscapeLabel || String(src.landscapeScore),
        detail: "Continuous geographic foundation — not an encounter claim.",
        group: "landscape"
      });
      if (src.structure) {
        factors.push({
          id: "land_cover",
          label: "Land cover",
          value: src.structure,
          detail: src.structureLabel || src.structure,
          group: "landscape"
        });
      }
    }
    if (src && finiteNum(src.slopeDeg)) {
      factors.push({
        id: "slope",
        label: "Slope",
        value: String(src.slopeDeg) + "°",
        detail: packTerrain
          ? "USGS 3DEP–derived slope from the local GIS pack"
          : "Elevation-derived slope context",
        group: "landscape"
      });
    }
    if (src && src.aspectCardinal) {
      factors.push({
        id: "aspect",
        label: "Aspect",
        value: src.aspectCardinal,
        detail: packTerrain
          ? "USGS 3DEP–derived aspect from the local GIS pack — condition interactions only, not static base"
          : "Elevation-derived — used for condition interactions only, not static base",
        group: "landscape"
      });
    } else if (ev) {
      factors.push({
        id: "aspect_missing",
        label: "Aspect",
        value: "unavailable",
        detail: "No aspect — solar searchability not applied",
        group: "limitations"
      });
    }
    if (src && src.featureKind && ev) {
      factors.push({
        id: "feature",
        label: "Terrain feature",
        value: src.featureKind,
        detail: packTerrain
          ? "Derived from pack slope/aspect — condition interaction only, not static base score"
          : "Elevation-derived — condition interaction only, not static base score",
        group: "landscape"
      });
    }
    if (ev && ev.modifiers) {
      var i;
      for (i = 0; i < ev.modifiers.length; i++) {
        factors.push({
          id: ev.modifiers[i].id,
          label: ev.modifiers[i].id.replace(/_/g, " "),
          value: (ev.modifiers[i].delta > 0 ? "+" : "") + ev.modifiers[i].delta,
          detail: ev.modifiers[i].reason,
          group: "today"
        });
      }
    }
    if (conditionFrame && conditionFrame.limitations && conditionFrame.limitations.length) {
      var li;
      for (li = 0; li < conditionFrame.limitations.length; li++) {
        factors.push({
          id: "limitation_" + li,
          label: "Limitation",
          value: "noted",
          detail: conditionFrame.limitations[li],
          group: "limitations"
        });
      }
    }
    if (ev && ev.status === "ready" && ev.score != null) {
      factors.push({
        id: "relative_score",
        label: "Relative interest score",
        value: String(ev.score),
        detail:
          ev.scoreScale === "unit"
            ? "0–1 relative landscape + conditions — not an encounter claim"
            : "0–3 relative scale — not an encounter claim",
        group: "summary"
      });
    }
    return factors;
  }

  function bandDisplayLabel(band) {
    if (band === "stronger_interest") return "Stronger relative interest";
    if (band === "moderate_interest") return "Moderate relative interest";
    if (band === "lower_interest") return "Lower relative interest";
    return band || "Relative interest";
  }

  /**
   * Honest tap explanation distinguishing Landscape vs Today's conditions.
   */
  function formatExplainText(explain) {
    if (!explain) return "";
    var lines = [];
    var mode = explain.surfaceMode || "today";
    lines.push(mode === "landscape" ? "LANDSCAPE" : "TODAY");
    lines.push(bandDisplayLabel(explain.band));
    if (explain.conditionStatus) lines.push(explain.conditionStatus);
    lines.push("");
    var landscape = [];
    var today = [];
    var limits = [];
    var factors = explain.factors || [];
    var i;
    for (i = 0; i < factors.length; i++) {
      var f = factors[i];
      var bullet = "• " + (f.detail || f.label + ": " + f.value);
      if (f.group === "today") today.push(bullet);
      else if (f.group === "limitations") limits.push(bullet);
      else if (f.group === "summary") continue;
      else landscape.push(bullet);
    }
    if (landscape.length) {
      lines.push("Landscape:");
      lines = lines.concat(landscape);
      lines.push("");
    }
    if (mode !== "landscape" && today.length) {
      lines.push("Today's conditions:");
      lines = lines.concat(today);
      lines.push("");
    }
    if (limits.length) {
      lines.push("Limitations:");
      lines = lines.concat(limits);
      lines.push("");
    }
    lines.push(explain.disclaimer || "");
    return lines.join("\n");
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
      surfaceMode: grid.surfaceMode || (grid.frameId === "LANDSCAPE" ? "landscape" : "today"),
      conditionStatus: grid.conditionStatus || null,
      cellMetersApprox: grid.cellMetersApprox,
      factors: best.factors || [],
      score: best.score,
      band: best.band,
      disclaimer:
        "Relative search interest at analysis ≈" +
        Math.round(grid.cellMetersApprox || TARGET_CELL_M) +
        " m — smoothed display is visual only. Not find probability."
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
    applyConditionFrame: applyConditionFrame,
    paintStaticBase: paintStaticBase,
    paintCellsFromConditions: paintCellsFromConditions,
    explainAt: explainAt,
    formatExplainText: formatExplainText,
    bandDisplayLabel: bandDisplayLabel,
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
