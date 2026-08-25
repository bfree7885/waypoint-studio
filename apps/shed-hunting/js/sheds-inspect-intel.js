/**
 * Sheds V3.2 — Inspect Field Intelligence (pure helpers).
 * Decision support only — never invents sheds, deer, or find probability.
 *
 * HUD hierarchy: Terrain (FACT) · Habitat (FACT) · Why this may matter (INTERPRETATION) · Limits (LIMITATION)
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
    "This describes terrain and habitat suitability. It does not indicate that deer or shed antlers are present.";
  var LIMIT_NOT_OBS =
    "Modeled suitability is not an observation of wildlife.";

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
    "find probability",
    "chance of finding"
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

  /**
   * Build a structured Inspect report for HUD rendering / tests.
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
    var habitatScore = opts.habitatScore || null;
    var packMeta = opts.packMeta || null;
    var fromYou = opts.fromYou || null;
    var fromSearch = opts.fromSearch || null;

    var facts = [];
    var interpretation = [];
    var limitation = [LIMIT_WILDLIFE, LIMIT_NOT_OBS];

    var elevLine = null;
    if (elevStatus === "loading") elevLine = "Elevation: loading…";
    else if (elevStatus === "ready" && elevM != null && isFinite(elevM)) {
      elevLine = "Elevation: " + formatElevationFt(elevM) + " (network sample)";
    } else if (elevStatus === "failed") elevLine = "Elevation: couldn't be retrieved";
    else if (elevStatus === "unavailable") elevLine = "Elevation: unavailable";
    else if (elevStatus === "idle") elevLine = null;

    var slopeDeg =
      terrainDerived && terrainDerived.slopeDeg != null
        ? terrainDerived.slopeDeg
        : gisSample && gisSample.slopeDeg != null
          ? gisSample.slopeDeg
          : null;
    var aspectDeg = terrainDerived && terrainDerived.aspectDeg != null ? terrainDerived.aspectDeg : null;
    var slopeSource =
      terrainDerived && terrainDerived.slopeDeg != null
        ? terrainDerived.source
        : gisSample && gisSample.slopeDeg != null
          ? "gis-pack-slope"
          : null;

    /* Aspect is poorly defined on near-flat ground — do not claim solar exposure. */
    if (slopeDeg != null && slopeDeg < 2) {
      aspectDeg = null;
    }

    var solar = solarExposureNote(aspectDeg, lat);
    var cardinal = aspectCardinal(aspectDeg);
    var facing = aspectFacingPhrase(cardinal);
    var slopeLabel = slopeClassLabel(slopeDeg);

    var terrainBits = [];
    if (elevStatus === "ready" && elevM != null && isFinite(elevM)) {
      terrainBits.push(formatElevationFt(elevM));
    }
    if (slopeLabel) terrainBits.push(slopeLabel);
    if (facing) terrainBits.push(facing);

    var terrainFact = null;
    var terrainKind = "none";
    if (elevStatus === "loading" || terrainStatus === "loading") {
      terrainFact = "Loading terrain…";
      terrainKind = "loading";
    } else if (terrainBits.length) {
      terrainFact = terrainBits.join(" · ");
      terrainKind = "ready";
      facts.push("Terrain: " + terrainFact);
    } else if (elevStatus === "failed" || terrainStatus === "failed") {
      terrainFact = "Terrain details couldn't be retrieved for this location.";
      terrainKind = "failed";
    } else if (elevStatus === "unavailable" || terrainStatus === "unavailable") {
      terrainFact = "Elevation, slope, and aspect aren't available for this location.";
      terrainKind = "unavailable";
    }

    if (slopeDeg != null && slopeDeg >= 12) {
      interpretation.push("Steeper terrain may slow walking.");
    } else if (slopeDeg != null && slopeDeg >= 2 && slopeDeg < 12) {
      interpretation.push("Moderate slope is generally walkable.");
    }

    if (solar.available && facing) {
      var facingSentence =
        facing.charAt(0).toUpperCase() + facing.slice(1) + " terrain ";
      if (solar.label === "More south-facing") {
        interpretation.push(facingSentence + "receives relatively strong afternoon solar exposure.");
      } else if (solar.label === "More north-facing") {
        interpretation.push(facingSentence + "receives less direct winter sun and may hold snow longer.");
      } else if (solar.label === "Mixed / east–west aspect") {
        interpretation.push("East–west aspect means solar exposure differences are modest here.");
      } else if (solar.note) {
        interpretation.push(solar.note);
      }
    }

    var habitatUnavailable = !gisSample;
    var habitatFact = null;
    var habitatKind = "none";
    if (gisSample) {
      var cover = gisSample.structureLabel || gisSample.structure || "Land cover";
      var nearEdge = gisSample.edgeM != null && gisSample.edgeM <= 90;
      if (nearEdge && gisSample.edgeM === 0) {
        habitatFact = cover + " at a habitat transition";
      } else if (nearEdge) {
        habitatFact = cover + " near a habitat transition (~" + Math.round(gisSample.edgeM) + " m)";
      } else {
        habitatFact = cover;
      }
      habitatKind = "ready";
      facts.push("Habitat: " + habitatFact);
      if (nearEdge) {
        interpretation.push("The nearby habitat transition may make this area worth inspecting.");
      }
      var nlcdYear = packMeta && packMeta.nlcdYear ? packMeta.nlcdYear : null;
      var res = gisSample.resolutionNote || "~30 m";
      if (nlcdYear) {
        pushUnique(limitation, "Land cover: NLCD " + nlcdYear + " (" + res + ").");
      } else {
        pushUnique(limitation, "Land cover source: NLCD (" + res + ").");
      }
    } else {
      habitatFact = "Detailed habitat information isn't available for this location.";
      habitatKind = "unavailable";
      pushUnique(
        limitation,
        "No GIS habitat pack covers this point — land-cover guidance unavailable."
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

    var coverage = coverageLabel({
      elev: elevStatus === "ready" && elevM != null,
      aspectOrSlope: slopeDeg != null || aspectDeg != null,
      habitat: !!gisSample
    });

    var hasTerrainIntel = terrainKind === "ready";
    var hasHabitatIntel = habitatKind === "ready";
    var failedIntel =
      !hasTerrainIntel &&
      !hasHabitatIntel &&
      (elevStatus === "failed" || terrainStatus === "failed");
    var noIntel = !hasTerrainIntel && !hasHabitatIntel && !failedIntel && terrainKind !== "loading";

    if (!interpretation.length && hasTerrainIntel && !hasHabitatIntel) {
      /* Facts only — do not invent landscape meaning. */
    }

    var report = {
      version: "3.2.1",
      lat: lat,
      lng: lng,
      elev: { status: elevStatus, meters: elevM, line: elevLine, ftLabel: formatElevationFt(elevM) },
      terrain: {
        slopeDeg: slopeDeg,
        aspectDeg: aspectDeg,
        aspectCardinal: cardinal,
        aspectFacing: facing,
        slopeClass: slopeLabel,
        slopeSource: slopeSource,
        solar: solar,
        factLine: terrainFact,
        kind: terrainKind,
        status: terrainStatus
      },
      habitat: {
        unavailable: habitatUnavailable,
        sample: gisSample,
        score: habitatScore,
        factLine: habitatFact,
        kind: habitatKind,
        bandLabel:
          habitatScore && habitatScore.band ? habitatScore.band.label : habitatUnavailable
            ? "Habitat data unavailable for this area"
            : null
      },
      relation: { fromYou: fromYou, fromSearch: fromSearch },
      facts: facts,
      why: interpretation,
      limits: limitation,
      coverage: coverage,
      honesty: [LIMIT_WILDLIFE, LIMIT_NOT_OBS],
      noIntel: noIntel,
      failedIntel: failedIntel,
      class: {
        elev: "REAL",
        slopePack: "DERIVED",
        aspectNeighborhood: "DERIVED",
        habitatScore: "EDITORIAL_HEURISTIC",
        solarNote: "EDITORIAL_HEURISTIC",
        why: "INTERPRETATION",
        limits: "LIMITATION"
      }
    };

    report.hudText = formatHudText(report);
    report.containsBannedLanguage = textContainsBanned(report.hudText);
    report.containsWildlifeInference = textContainsBanned(
      facts.concat(interpretation).join("\n")
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
        lines.push(report.terrain.factLine);
      }
      if (report.habitat && report.habitat.factLine) {
        lines.push("");
        lines.push("Habitat");
        lines.push(report.habitat.factLine);
      }
    }

    if (report.why && report.why.length && !report.noIntel && !report.failedIntel) {
      lines.push("");
      lines.push("Why this may matter");
      report.why.forEach(function (w) {
        lines.push(w);
      });
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
    solarExposureNote: solarExposureNote,
    coverageLabel: coverageLabel,
    buildInspectReport: buildInspectReport,
    formatHudText: formatHudText,
    elevationNeighborhoodUrl: elevationNeighborhoodUrl,
    terrainFromElevationArray: terrainFromElevationArray,
    NO_INTEL_UNAVAILABLE: NO_INTEL_UNAVAILABLE,
    NO_INTEL_FAILED: NO_INTEL_FAILED,
    LIMIT_WILDLIFE: LIMIT_WILDLIFE,
    VERSION: "3.2.1"
  };
})(typeof window !== "undefined" ? window : globalThis);
