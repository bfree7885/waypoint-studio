/**
 * Sheds V3.2 — Inspect Facts (pure helpers).
 * Physical / land-cover facts only — never invents sheds, deer, or find probability.
 *
 * HUD hierarchy: Terrain (FACT) · Habitat / land cover (FACT) · Limits (LIMITATION)
 * Interpretation / suitability is intentionally omitted from the Inspect HUD.
 */
(function (global) {
  "use strict";

  var ASPECT_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  var ASPECT_FACING = {
    N: "north-facing",
    NE: "northeast-facing",
    E: "east-facing",
    SE: "southeast-facing",
    S: "south-facing",
    SW: "southwest-facing",
    W: "west-facing",
    NW: "northwest-facing"
  };

  var NO_INTEL_UNAVAILABLE =
    "Detailed terrain/habitat information isn't available for this location.";
  var NO_INTEL_FAILED =
    "Terrain and habitat details couldn't be retrieved for this location.";
  var LIMIT_WILDLIFE =
    "These are physical and land-cover facts at this point. They do not indicate that deer or shed antlers are present.";
  var LIMIT_NOT_OBS = "Inspect is not an observation of wildlife.";

  var BANNED_PHRASES = [
    "shed found",
    "antler here",
    "deer are here",
    "deer present",
    "bedding here",
    "bedding area",
    "feeding area",
    "deer trail",
    "deer movement",
    "wildlife movement",
    "find probability",
    "chance of finding",
    "why this may matter",
    "search potential",
    "habitat signal",
    "worth inspecting"
  ];

  function aspectCardinal(deg) {
    if (deg == null || !isFinite(deg)) return null;
    var ix = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return ASPECT_DIRS[ix];
  }

  function aspectFacingPhrase(cardinal) {
    if (!cardinal) return null;
    return ASPECT_FACING[cardinal] || null;
  }

  /**
   * Finite-difference slope/aspect from N/S/E/W elevations (meters) and step meters.
   * Same convention as sheds-likelihood-model slopeAspectAt.
   */
  function slopeAspectFromElevNeighbors(opts) {
    opts = opts || {};
    var c = opts.centerM;
    var n = opts.northM;
    var s = opts.southM;
    var e = opts.eastM;
    var w = opts.westM;
    var stepM = opts.stepM != null ? opts.stepM : 60;
    if (
      c == null ||
      n == null ||
      s == null ||
      e == null ||
      w == null ||
      !isFinite(c) ||
      !isFinite(n) ||
      !isFinite(s) ||
      !isFinite(e) ||
      !isFinite(w) ||
      !(stepM > 0)
    ) {
      return { slopeDeg: null, aspectDeg: null, source: "unavailable" };
    }
    var dzdy = (s - n) / (2 * stepM);
    var dzdx = (e - w) / (2 * stepM);
    var slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
    var slopeDeg = slopeRad * (180 / Math.PI);
    var aspectDeg = ((Math.atan2(-dzdx, dzdy) * 180) / Math.PI + 360) % 360;
    return {
      slopeDeg: Math.round(slopeDeg * 10) / 10,
      aspectDeg: Math.round(aspectDeg),
      elevM: c,
      source: "open-meteo-neighborhood",
      class: "DERIVED"
    };
  }

  /**
   * Physical geography only (Northern Hemisphere solar). Not animal behavior.
   * Kept for tests / later slices — not shown on the facts-only Inspect HUD.
   */
  function solarExposureNote(aspectDeg, lat) {
    if (aspectDeg == null || !isFinite(aspectDeg)) {
      return {
        available: false,
        label: null,
        note: null
      };
    }
    var northern = lat == null || !isFinite(lat) || lat >= 0;
    if (!northern) {
      return {
        available: true,
        label: "Aspect sampled",
        note:
          "Aspect is available. Solar interpretation here is tuned for Northern Hemisphere winters — treat carefully at southern latitudes.",
        class: "EDITORIAL_HEURISTIC"
      };
    }
    var sun = Math.cos(((aspectDeg - 180) * Math.PI) / 180);
    var label;
    var note;
    if (sun > 0.35) {
      label = "More south-facing";
      note =
        "South-facing slopes generally receive more solar energy in the Northern Hemisphere and may lose snow sooner. Physical geography only — not a claim that deer or sheds are present.";
    } else if (sun < -0.35) {
      label = "More north-facing";
      note =
        "North-facing slopes generally receive less direct winter sun in the Northern Hemisphere and may hold snow longer. Physical geography only — not bedding or wildlife presence.";
    } else {
      label = "Mixed / east–west aspect";
      note =
        "Aspect is neither strongly south- nor north-facing. Solar exposure differences are modest here.";
    }
    return {
      available: true,
      label: label,
      note: note,
      class: "EDITORIAL_HEURISTIC"
    };
  }

  function slopeClassLabel(slopeDeg) {
    if (slopeDeg == null || !isFinite(slopeDeg)) return null;
    if (slopeDeg < 2) return "nearly flat";
    if (slopeDeg < 12) return "moderate slope";
    if (slopeDeg < 25) return "steeper slope";
    return "steep terrain";
  }

  function formatElevationFt(elevM) {
    if (elevM == null || !isFinite(elevM)) return null;
    var ft = Math.round(elevM * 3.28084);
    var s = String(ft);
    if (s.length > 3) {
      s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return s + " ft";
  }

  function formatSlopeValue(slopeDeg) {
    if (slopeDeg == null || !isFinite(slopeDeg)) return null;
    var cls = slopeClassLabel(slopeDeg);
    var deg = String(slopeDeg);
    return cls ? deg + "° (" + cls + ")" : deg + "°";
  }

  function coverageLabel(parts) {
    parts = parts || {};
    var bits = 0;
    if (parts.elev) bits += 1;
    if (parts.aspectOrSlope) bits += 1;
    if (parts.habitat) bits += 1;
    if (bits >= 3) {
      return {
        id: "strong",
        label: "Strong supporting terrain signals",
        detail: "Elevation, slope/aspect, and land-cover samples are available for this point."
      };
    }
    if (bits === 2) {
      return {
        id: "moderate",
        label: "Moderate supporting signals",
        detail: "Some terrain or habitat inputs are available; others are missing."
      };
    }
    if (bits === 1) {
      return {
        id: "limited",
        label: "Limited habitat or terrain data",
        detail: "Only one of elevation, slope/aspect, or land-cover is available."
      };
    }
    return {
      id: "insufficient",
      label: "Insufficient information",
      detail: "Not enough terrain or habitat samples to interpret this point."
    };
  }

  function pushUnique(list, item) {
    if (!item) return;
    if (list.indexOf(item) === -1) list.push(item);
  }

  function textContainsBanned(text) {
    var lower = String(text || "").toLowerCase();
    return BANNED_PHRASES.some(function (p) {
      return lower.indexOf(p) !== -1;
    });
  }

  function labeledFact(label, status, valueText) {
    if (status === "loading") return label + ": loading…";
    if (status === "failed") return label + ": couldn't be retrieved";
    if (status === "unavailable") return label + ": unavailable";
    if (status === "undefined") return label + ": not defined on nearly flat ground";
    if (status === "ready" && valueText) return label + ": " + valueText;
    return null;
  }

  /**
   * Build a structured Inspect report for HUD rendering / tests.
   * Facts only — no walkability, solar, or habitat-suitability copy in the HUD.
   */
  function buildInspectReport(opts) {
    opts = opts || {};
    var lat = opts.lat;
    var lng = opts.lng;
    var elevM = opts.elevM;
    var elevStatus = opts.elevStatus || "idle";
    var terrainStatus = opts.terrainStatus || "idle";
    var terrainDerived = opts.terrainDerived || null;
    var gisSample = opts.gisSample || null;
    var packMeta = opts.packMeta || null;
    var fromYou = opts.fromYou || null;
    var fromSearch = opts.fromSearch || null;

    var facts = [];
    var limitation = [LIMIT_WILDLIFE, LIMIT_NOT_OBS];

    var elevKind = elevStatus;
    var elevLine = labeledFact("Elevation", elevStatus, formatElevationFt(elevM));
    if (elevStatus === "ready" && elevM != null && isFinite(elevM)) {
      facts.push("Elevation: " + formatElevationFt(elevM));
    }

    var slopeDeg =
      terrainDerived && terrainDerived.slopeDeg != null && isFinite(terrainDerived.slopeDeg)
        ? terrainDerived.slopeDeg
        : gisSample && gisSample.slopeDeg != null && isFinite(gisSample.slopeDeg)
          ? gisSample.slopeDeg
          : null;
    var aspectDeg =
      terrainDerived && terrainDerived.aspectDeg != null && isFinite(terrainDerived.aspectDeg)
        ? terrainDerived.aspectDeg
        : null;
    var slopeSource =
      terrainDerived && terrainDerived.slopeDeg != null && isFinite(terrainDerived.slopeDeg)
        ? terrainDerived.source
        : gisSample && gisSample.slopeDeg != null && isFinite(gisSample.slopeDeg)
          ? "gis-pack-slope"
          : null;

    var slopeKind;
    if (slopeDeg != null) slopeKind = "ready";
    else if (terrainStatus === "loading" && !(gisSample && gisSample.slopeDeg != null)) slopeKind = "loading";
    else if (terrainStatus === "failed" && !(gisSample && gisSample.slopeDeg != null)) slopeKind = "failed";
    else if (terrainStatus === "idle" && slopeDeg == null) slopeKind = "idle";
    else slopeKind = "unavailable";

    /* Aspect is poorly defined on near-flat ground — do not report 0° as north. */
    var aspectKind;
    var aspectUndefined = false;
    if (slopeDeg != null && slopeDeg < 2) {
      aspectDeg = null;
      aspectUndefined = true;
      aspectKind = "undefined";
    } else if (aspectDeg != null) {
      aspectKind = "ready";
    } else if (terrainStatus === "loading") {
      aspectKind = "loading";
    } else if (terrainStatus === "failed") {
      aspectKind = "failed";
    } else if (terrainStatus === "idle" && !terrainDerived) {
      aspectKind = "idle";
    } else {
      aspectKind = "unavailable";
    }

    var solar = solarExposureNote(aspectDeg, lat);
    var cardinal = aspectCardinal(aspectDeg);
    var facing = aspectFacingPhrase(cardinal);
    var slopeLabel = slopeClassLabel(slopeDeg);
    var slopeLine = labeledFact("Slope", slopeKind, formatSlopeValue(slopeDeg));
    var aspectLine = labeledFact("Aspect", aspectKind, facing);
    if (slopeKind === "ready") facts.push("Slope: " + formatSlopeValue(slopeDeg));
    if (aspectKind === "ready" && facing) facts.push("Aspect: " + facing);

    var terrainLines = [];
    if (elevLine) terrainLines.push(elevLine);
    if (slopeLine) terrainLines.push(slopeLine);
    if (aspectLine) terrainLines.push(aspectLine);

    var terrainKind = "none";
    var terrainFact = null;
    if (elevStatus === "loading" || terrainStatus === "loading") {
      terrainKind = "loading";
    }
    if (elevStatus === "ready" || slopeKind === "ready" || aspectKind === "ready") {
      terrainKind = "ready";
      terrainFact = terrainLines.join("\n");
    } else if (elevStatus === "failed" || terrainStatus === "failed") {
      terrainKind = "failed";
      terrainFact =
        terrainLines.length > 0
          ? terrainLines.join("\n")
          : "Terrain details couldn't be retrieved for this location.";
    } else if (elevStatus === "unavailable" || terrainStatus === "unavailable") {
      terrainKind = "unavailable";
      terrainFact =
        terrainLines.length > 0
          ? terrainLines.join("\n")
          : "Elevation, slope, and aspect aren't available for this location.";
    } else if (terrainLines.length) {
      terrainFact = terrainLines.join("\n");
      if (elevStatus === "loading" || terrainStatus === "loading") terrainKind = "loading";
    }

    var habitatUnavailable = !gisSample;
    var habitatFact = null;
    var habitatKind = "none";
    var coverLine = null;
    var edgeLine = null;
    if (gisSample) {
      var cover = gisSample.structureLabel || gisSample.structure || "Land cover";
      coverLine = "Land cover: " + cover;
      if (gisSample.edgeM != null && isFinite(gisSample.edgeM)) {
        edgeLine = "Land-cover edge: " + Math.round(gisSample.edgeM) + " m";
      }
      habitatFact = edgeLine ? coverLine + "\n" + edgeLine : coverLine;
      habitatKind = "ready";
      facts.push(coverLine);
      if (edgeLine) facts.push(edgeLine);
      var nlcdYear = packMeta && packMeta.nlcdYear ? packMeta.nlcdYear : null;
      var res = gisSample.resolutionNote || "~30 m";
      if (nlcdYear) {
        pushUnique(limitation, "Land cover: NLCD " + nlcdYear + " (" + res + ").");
      } else {
        pushUnique(limitation, "Land cover source: NLCD (" + res + ").");
      }
    } else {
      coverLine = "Land cover: unavailable for this location";
      habitatFact = coverLine;
      habitatKind = "unavailable";
      pushUnique(
        limitation,
        "No GIS habitat pack covers this point — land-cover classification unavailable."
      );
    }

    if (slopeSource === "open-meteo-neighborhood") {
      pushUnique(
        limitation,
        "Slope and aspect are derived from a neighborhood elevation sample (~60 m), not a surveyed contour."
      );
    } else if (slopeSource === "gis-pack-slope") {
      pushUnique(
        limitation,
        "Slope is from the bundled GIS pack (3DEP-derived). Aspect is unavailable without a neighborhood elevation sample."
      );
    }

    if (aspectUndefined && slopeKind === "ready") {
      pushUnique(limitation, "Aspect is not defined on nearly flat ground.");
    }

    var coverage = coverageLabel({
      elev: elevStatus === "ready" && elevM != null && isFinite(elevM),
      aspectOrSlope: slopeDeg != null || (aspectKind === "ready" && aspectDeg != null),
      habitat: !!gisSample
    });

    var hasTerrainIntel = terrainKind === "ready";
    var hasHabitatIntel = habitatKind === "ready";
    var failedIntel =
      !hasTerrainIntel &&
      !hasHabitatIntel &&
      (elevStatus === "failed" || terrainStatus === "failed");
    var noIntel = !hasTerrainIntel && !hasHabitatIntel && !failedIntel && terrainKind !== "loading";

    var report = {
      version: "3.2.2",
      factsOnly: true,
      lat: lat,
      lng: lng,
      elev: {
        status: elevStatus,
        meters: elevM,
        line: elevLine,
        ftLabel: formatElevationFt(elevM),
        kind: elevKind
      },
      terrain: {
        slopeDeg: slopeDeg,
        aspectDeg: aspectDeg,
        aspectCardinal: cardinal,
        aspectFacing: facing,
        aspectKind: aspectKind,
        slopeClass: slopeLabel,
        slopeSource: slopeSource,
        slopeKind: slopeKind,
        solar: solar,
        factLine: terrainFact,
        lines: terrainLines,
        kind: terrainKind,
        status: terrainStatus
      },
      habitat: {
        unavailable: habitatUnavailable,
        sample: gisSample,
        score: null,
        factLine: habitatFact,
        coverLine: coverLine,
        edgeLine: edgeLine,
        kind: habitatKind,
        bandLabel: null
      },
      relation: { fromYou: fromYou, fromSearch: fromSearch },
      facts: facts,
      why: [],
      limits: limitation,
      coverage: coverage,
      honesty: [LIMIT_WILDLIFE, LIMIT_NOT_OBS],
      noIntel: noIntel,
      failedIntel: failedIntel,
      class: {
        elev: "REAL",
        slopePack: "DERIVED",
        aspectNeighborhood: "DERIVED",
        habitatClass: "REAL",
        landCoverEdge: "DERIVED",
        solarNote: "EDITORIAL_HEURISTIC",
        why: "INTERPRETATION",
        limits: "LIMITATION"
      }
    };

    report.hudText = formatHudText(report);
    report.containsBannedLanguage = textContainsBanned(report.hudText);
    report.containsWildlifeInference = textContainsBanned(facts.join("\n"));
    report.containsInterpretation = /why this may matter|generally walkable|may slow walking|solar exposure|may hold snow|worth inspecting|habitat signal|search potential|suitability/i.test(
      report.hudText
    );
    return report;
  }

  function formatHudText(report) {
    var lines = [];
    if (report.lat != null && report.lng != null) {
      lines.push(Number(report.lat).toFixed(5) + ", " + Number(report.lng).toFixed(5));
    }
    if (report.relation) {
      if (report.relation.fromYou) lines.push(report.relation.fromYou);
      if (report.relation.fromSearch) lines.push(report.relation.fromSearch);
    }

    if (report.noIntel) {
      lines.push("");
      lines.push(NO_INTEL_UNAVAILABLE);
    } else if (report.failedIntel) {
      lines.push("");
      lines.push(NO_INTEL_FAILED);
    } else {
      if (report.terrain && report.terrain.factLine) {
        lines.push("");
        lines.push("Terrain");
        String(report.terrain.factLine)
          .split("\n")
          .forEach(function (row) {
            if (row) lines.push(row);
          });
      }
      if (report.habitat && report.habitat.factLine) {
        lines.push("");
        lines.push("Habitat");
        String(report.habitat.factLine)
          .split("\n")
          .forEach(function (row) {
            if (row) lines.push(row);
          });
      }
    }

    if (report.limits && report.limits.length) {
      lines.push("");
      lines.push("Limits");
      report.limits.forEach(function (L) {
        lines.push(L);
      });
    }
    return lines.join("\n").replace(/^\n+/, "");
  }

  /** Open-Meteo multi-point URL helper (lat,lng pairs). */
  function elevationNeighborhoodUrl(lat, lng, stepDeg) {
    stepDeg = stepDeg != null ? stepDeg : 0.00055; // ~60 m mid-latitudes
    var pts = [
      [lat, lng],
      [lat + stepDeg, lng],
      [lat - stepDeg, lng],
      [lat, lng + stepDeg],
      [lat, lng - stepDeg]
    ];
    var lats = pts.map(function (p) {
      return p[0].toFixed(5);
    });
    var lngs = pts.map(function (p) {
      return p[1].toFixed(5);
    });
    return {
      url:
        "https://api.open-meteo.com/v1/elevation?latitude=" +
        encodeURIComponent(lats.join(",")) +
        "&longitude=" +
        encodeURIComponent(lngs.join(",")),
      stepM: 60,
      order: ["center", "north", "south", "east", "west"]
    };
  }

  function terrainFromElevationArray(elevations, stepM) {
    elevations = elevations || [];
    return slopeAspectFromElevNeighbors({
      centerM: elevations[0],
      northM: elevations[1],
      southM: elevations[2],
      eastM: elevations[3],
      westM: elevations[4],
      stepM: stepM != null ? stepM : 60
    });
  }

  global.WaypointShedsInspectIntel = {
    aspectCardinal: aspectCardinal,
    aspectFacingPhrase: aspectFacingPhrase,
    slopeAspectFromElevNeighbors: slopeAspectFromElevNeighbors,
    slopeClassLabel: slopeClassLabel,
    formatElevationFt: formatElevationFt,
    formatSlopeValue: formatSlopeValue,
    solarExposureNote: solarExposureNote,
    coverageLabel: coverageLabel,
    buildInspectReport: buildInspectReport,
    formatHudText: formatHudText,
    elevationNeighborhoodUrl: elevationNeighborhoodUrl,
    terrainFromElevationArray: terrainFromElevationArray,
    NO_INTEL_UNAVAILABLE: NO_INTEL_UNAVAILABLE,
    NO_INTEL_FAILED: NO_INTEL_FAILED,
    LIMIT_WILDLIFE: LIMIT_WILDLIFE,
    LIMIT_NOT_OBS: LIMIT_NOT_OBS,
    VERSION: "3.2.2"
  };
})(typeof window !== "undefined" ? window : globalThis);
