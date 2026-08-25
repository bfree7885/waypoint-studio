/**
 * Sheds V3.2 — Inspect Field Intelligence (pure helpers).
 * Decision support only — never invents sheds, deer, or find probability.
 */
(function (global) {
  "use strict";

  var ASPECT_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  function aspectCardinal(deg) {
    if (deg == null || !isFinite(deg)) return null;
    var ix = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return ASPECT_DIRS[ix];
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
    // Facing south ≈ 180°
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

  function coverageLabel(parts) {
    parts = parts || {};
    var bits = 0;
    var max = 3;
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

  /**
   * Build a structured Inspect report for HUD rendering / tests.
   */
  function buildInspectReport(opts) {
    opts = opts || {};
    var lat = opts.lat;
    var lng = opts.lng;
    var elevM = opts.elevM;
    var elevStatus = opts.elevStatus || "idle";
    var terrainDerived = opts.terrainDerived || null;
    var gisSample = opts.gisSample || null;
    var habitatScore = opts.habitatScore || null;
    var packMeta = opts.packMeta || null;
    var fromYou = opts.fromYou || null;
    var fromSearch = opts.fromSearch || null;

    var why = [];
    var limits = [
      "This is habitat/terrain suitability context — not a shed prediction.",
      "No claim that deer, trails, bedding, or antlers are present."
    ];

    var elevLine = null;
    if (elevStatus === "loading") elevLine = "Elevation: loading…";
    else if (elevStatus === "ready" && elevM != null && isFinite(elevM)) {
      elevLine =
        "Elevation: ~" +
        Math.round(elevM) +
        " m (" +
        Math.round(elevM * 3.28084) +
        " ft) — network sample";
    } else if (elevStatus === "unavailable") elevLine = "Elevation: unavailable";
    else elevLine = "Elevation: not requested";

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

    if (slopeDeg != null) {
      if (slopeDeg < 2) why.push("Nearly flat terrain (~" + slopeDeg + "°).");
      else if (slopeDeg < 12) why.push("Moderate slope (~" + slopeDeg + "°) — generally walkable.");
      else if (slopeDeg < 25) why.push("Steeper slope (~" + slopeDeg + "°) — slower walking.");
      else why.push("Steep terrain (~" + slopeDeg + "°) — limited walkability.");
    }

    var solar = solarExposureNote(aspectDeg, lat);
    if (solar.available && solar.label) {
      why.push(solar.label + " (" + (aspectCardinal(aspectDeg) || "?") + ").");
    }

    var habitatUnavailable = !gisSample;
    if (gisSample) {
      why.push(
        (gisSample.structureLabel || gisSample.structure || "Land cover") +
          (gisSample.edgeM != null && gisSample.edgeM <= 90
            ? " · habitat transition nearby (~" + Math.round(gisSample.edgeM) + " m)"
            : "")
      );
      if (gisSample.resolutionNote) {
        limits.push("Land-cover resolution: " + gisSample.resolutionNote + ".");
      }
      if (packMeta && packMeta.nlcdYear) {
        limits.push("Land-cover vintage: NLCD " + packMeta.nlcdYear + ".");
      } else {
        limits.push("Land-cover vintage: see GIS pack provenance (NLCD).");
      }
    } else {
      limits.push("No GIS habitat pack covers this point — land-cover guidance unavailable.");
    }

    if (habitatScore && !habitatScore.unavailable && habitatScore.band) {
      why.push("Search potential band: " + habitatScore.band.label + " (heuristic).");
      (habitatScore.limitations || []).forEach(function (L) {
        if (limits.indexOf(L) === -1) limits.push(L);
      });
    }

    var coverage = coverageLabel({
      elev: elevStatus === "ready" && elevM != null,
      aspectOrSlope: slopeDeg != null || aspectDeg != null,
      habitat: !!gisSample
    });

    var bannedPhrases = [
      "shed found",
      "antler here",
      "deer are here",
      "bedding here",
      "find probability",
      "chance of finding"
    ];

    var report = {
      version: "3.2.0",
      lat: lat,
      lng: lng,
      elev: { status: elevStatus, meters: elevM, line: elevLine },
      terrain: {
        slopeDeg: slopeDeg,
        aspectDeg: aspectDeg,
        aspectCardinal: aspectCardinal(aspectDeg),
        slopeSource: slopeSource,
        solar: solar
      },
      habitat: {
        unavailable: habitatUnavailable,
        sample: gisSample,
        score: habitatScore,
        bandLabel:
          habitatScore && habitatScore.band ? habitatScore.band.label : habitatUnavailable
            ? "Habitat data unavailable for this area"
            : null
      },
      relation: { fromYou: fromYou, fromSearch: fromSearch },
      why: why,
      limits: limits,
      coverage: coverage,
      honesty: [
        "Context only — not habitat proof from satellite pixels alone.",
        "Modeled suitability ≠ observed wildlife."
      ],
      class: {
        elev: "REAL",
        slopePack: "DERIVED",
        aspectNeighborhood: "DERIVED",
        habitatScore: "EDITORIAL_HEURISTIC",
        solarNote: "EDITORIAL_HEURISTIC"
      }
    };

    report.hudText = formatHudText(report);
    report.containsBannedLanguage = bannedPhrases.some(function (p) {
      return report.hudText.toLowerCase().indexOf(p) !== -1;
    });
    return report;
  }

  function formatHudText(report) {
    var lines = [];
    if (report.lat != null && report.lng != null) {
      lines.push(Number(report.lat).toFixed(5) + ", " + Number(report.lng).toFixed(5));
    }
    if (report.elev && report.elev.line) lines.push(report.elev.line);
    if (report.terrain) {
      if (report.terrain.slopeDeg != null) {
        lines.push(
          "Slope: ~" +
            report.terrain.slopeDeg +
            "°" +
            (report.terrain.slopeSource ? " (" + report.terrain.slopeSource + ")" : "")
        );
      }
      if (report.terrain.aspectDeg != null) {
        lines.push(
          "Aspect: " +
            report.terrain.aspectDeg +
            "° " +
            (report.terrain.aspectCardinal || "") +
            (report.terrain.solar && report.terrain.solar.label
              ? " — " + report.terrain.solar.label
              : "")
        );
      }
    }
    if (report.habitat) {
      if (report.habitat.unavailable) {
        lines.push("Habitat: unavailable (no GIS pack for this point)");
      } else if (report.habitat.sample) {
        var s = report.habitat.sample;
        lines.push(
          "Land cover: " +
            (s.structureLabel || s.structure) +
            (s.nlcd != null ? " (NLCD " + s.nlcd + ")" : "")
        );
        if (s.edgeM != null) lines.push("Habitat transition: ~" + Math.round(s.edgeM) + " m");
        if (report.habitat.bandLabel) lines.push("Search potential: " + report.habitat.bandLabel);
      }
    }
    if (report.relation) {
      if (report.relation.fromYou) lines.push(report.relation.fromYou);
      if (report.relation.fromSearch) lines.push(report.relation.fromSearch);
    }
    if (report.coverage) lines.push("Evidence: " + report.coverage.label);
    if (report.why && report.why.length) {
      lines.push("Why this area may matter:");
      report.why.slice(0, 4).forEach(function (w) {
        lines.push("· " + w);
      });
    }
    if (report.terrain && report.terrain.solar && report.terrain.solar.note) {
      lines.push(report.terrain.solar.note);
    }
    if (report.limits && report.limits.length) {
      lines.push("Limits:");
      report.limits.slice(0, 4).forEach(function (L) {
        lines.push("· " + L);
      });
    }
    (report.honesty || []).forEach(function (h) {
      lines.push(h);
    });
    return lines.join("\n");
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
    slopeAspectFromElevNeighbors: slopeAspectFromElevNeighbors,
    solarExposureNote: solarExposureNote,
    coverageLabel: coverageLabel,
    buildInspectReport: buildInspectReport,
    formatHudText: formatHudText,
    elevationNeighborhoodUrl: elevationNeighborhoodUrl,
    terrainFromElevationArray: terrainFromElevationArray,
    VERSION: "3.2.0"
  };
})(typeof window !== "undefined" ? window : globalThis);
