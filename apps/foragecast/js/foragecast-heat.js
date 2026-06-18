/**
 * ForageCast — heat zone labels, legend, and "Why here?" copy
 */
(function (global) {
  "use strict";

  var HEAT_DISCLAIMER =
    "Prediction zones are educational estimates based on season, habitat, terrain, and weather signals.";

  var LEVEL_COPY = {
    high: {
      band: "Stronger signal",
      legend: "Stronger signal",
      desc: "Season, moisture, and habitat loosely align"
    },
    moderate: {
      band: "Mixed signal",
      legend: "Worth a patient walk",
      desc: "Some factors support looking; others lag"
    },
    low: {
      band: "Weaker signal",
      legend: "Unlikely this week",
      desc: "Timing or moisture may be limiting"
    }
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function bandLabel(level) {
    return (LEVEL_COPY[level] && LEVEL_COPY[level].band) || "Mixed signal";
  }

  function defaultLegend() {
    return [
      { level: "high", label: LEVEL_COPY.high.legend, desc: LEVEL_COPY.high.desc },
      { level: "moderate", label: LEVEL_COPY.moderate.legend, desc: LEVEL_COPY.moderate.desc },
      { level: "low", label: LEVEL_COPY.low.legend, desc: LEVEL_COPY.low.desc }
    ];
  }

  function buildSnapshot(species, zones, conditions, legend) {
    if (!global.ForageCastModel || !species || !zones || !conditions) return null;
    var prediction = global.ForageCastModel.computeCountyPrediction(species, zones, conditions);
    var zoneResults = prediction.zoneResults.map(function (zr) {
      var zone = zones.find(function (z) { return z.id === zr.zoneId; });
      return Object.assign({}, zr, { zone: zone });
    });
    return {
      species: species,
      conditions: conditions,
      prediction: prediction,
      zoneResults: zoneResults,
      legend: legend || defaultLegend(),
      topZoneId: zoneResults[0] ? zoneResults[0].zoneId : null
    };
  }

  function mapMetaTitle(snapshot, location) {
    if (!snapshot || !snapshot.species) return "Terrain readiness";
    var region = location && location.name
      ? location.name + ", " + (location.stateCode || location.state)
      : (snapshot.conditions.region && snapshot.conditions.region.county) || "your region";
    return snapshot.species.name + " readiness · " + region;
  }

  function mapMetaSubtitle(snapshot) {
    if (!snapshot || !snapshot.conditions) return "";
    var week = snapshot.conditions.weekOf ? "Week of " + snapshot.conditions.weekOf : "";
    var season = snapshot.conditions.seasonNote || "";
    return [week, season].filter(Boolean).join(" · ");
  }

  function zoneFactorReason(key, value, zone, conditions, factorLabels) {
    var label = (factorLabels && factorLabels[key]) || key;
    var region = (conditions.region && conditions.region.county) || "the county";

    if (key === "elevation") {
      return value >= 0.55
        ? label + ": " + zone.elevation + " matches what this species tends to favor in " + region + "."
        : label + ": " + zone.elevation + " may be outside the best band for this week.";
    }
    if (key === "slopeAspect") {
      return value >= 0.55
        ? label + ": " + zone.aspect + " — aspect shapes how fast this slope dries."
        : label + ": " + zone.aspect + " — warmer or faster-drying than ideal right now.";
    }
    if (key === "soilMoisture" || key === "recentRainfall") {
      return value >= 0.55
        ? label + ": recent moisture in " + region + " favors this kind of terrain."
        : label + ": drier pattern this week — check shaded draws before ridge tops.";
    }
    if (key === "treeAssociation" || key === "landCover") {
      return value >= 0.55
        ? label + ": " + zone.habitat + "."
        : label + ": host trees or cover here are a weaker match for now.";
    }
    if (key === "seasonTiming") {
      return value >= 0.55
        ? label + ": still inside the seasonal window for " + (conditions.region && conditions.region.county || "your area") + "."
        : label + ": peak timing may be passing or not here yet.";
    }
    if (key === "temperature") {
      return value >= 0.55
        ? label + ": temperatures are in a reasonable range for activity."
        : label + ": warmth or a cool snap may be slowing things down.";
    }
    return label + ": contributes to this week's rough estimate.";
  }

  function zoneWhyHere(zone, zoneResult, species, conditions, factorLabels) {
    if (!zone || !zoneResult || !species) {
      return {
        headline: "Why here?",
        intro: "Tap a zone on the map to see what shapes this estimate.",
        reasons: []
      };
    }

    var factors = zoneResult.factors || {};
    var entries = Object.keys(factors).map(function (key) {
      return { key: key, value: factors[key], weight: species.factorWeights[key] || 0 };
    });
    entries.sort(function (a, b) {
      return (b.value * b.weight) - (a.value * a.weight);
    });

    var reasons = entries.slice(0, 3).map(function (entry) {
      return zoneFactorReason(entry.key, entry.value, zone, conditions, factorLabels);
    });

    var region = (conditions.region && conditions.region.county) || "your region";

    return {
      headline: "Why " + zone.name + "?",
      intro: bandLabel(zoneResult.level) + " for " + species.name + " in " + region + " — a reading guide, not a guarantee.",
      reasons: reasons
    };
  }

  function renderWhyHere(why) {
    if (!why) return "";
    var list = (why.reasons || []).map(function (r) {
      return "<li>" + escapeHtml(r) + "</li>";
    }).join("");

    return (
      '<div class="fc-heat-why">' +
        '<h4 class="fc-heat-why__title">' + escapeHtml(why.headline) + "</h4>" +
        '<p class="fc-heat-why__intro">' + escapeHtml(why.intro) + "</p>" +
        (list ? '<ul class="fc-heat-why__list">' + list + "</ul>" : "") +
      "</div>"
    );
  }

  function renderLegend(items) {
    return (
      '<ul class="fc-heat-legend" aria-label="Heat map legend">' +
        (items || defaultLegend()).map(function (item) {
          return (
            '<li class="fc-heat-legend__item fc-heat-legend__item--' + escapeHtml(item.level) + '">' +
              '<span class="fc-heat-legend__swatch" aria-hidden="true"></span>' +
              '<div class="fc-heat-legend__text">' +
                "<strong>" + escapeHtml(item.label) + "</strong>" +
                "<span>" + escapeHtml(item.desc) + "</span>" +
              "</div>" +
            "</li>"
          );
        }).join("") +
      "</ul>"
    );
  }

  function renderDisclaimer(extra) {
    return (
      '<p class="fc-heat-disclaimer">' + escapeHtml(HEAT_DISCLAIMER) +
      (extra ? " " + escapeHtml(extra) : "") +
      "</p>"
    );
  }

  function renderMapHeader(snapshot, location) {
    return (
      '<div class="fc-heat-meta">' +
        '<p class="fc-heat-meta__label">What this map shows</p>' +
        '<p class="fc-heat-meta__title" id="fc-map-title">' + escapeHtml(mapMetaTitle(snapshot, location)) + "</p>" +
        (mapMetaSubtitle(snapshot)
          ? '<p class="fc-heat-meta__sub">' + escapeHtml(mapMetaSubtitle(snapshot)) + "</p>"
          : "") +
        '<p class="fc-heat-meta__explain">Schematic terrain bands — where conditions may favor looking this week, not exact harvest spots.</p>' +
      "</div>"
    );
  }

  global.ForageCastHeat = {
    HEAT_DISCLAIMER: HEAT_DISCLAIMER,
    bandLabel: bandLabel,
    defaultLegend: defaultLegend,
    buildSnapshot: buildSnapshot,
    mapMetaTitle: mapMetaTitle,
    mapMetaSubtitle: mapMetaSubtitle,
    zoneWhyHere: zoneWhyHere,
    renderWhyHere: renderWhyHere,
    renderLegend: renderLegend,
    renderDisclaimer: renderDisclaimer,
    renderMapHeader: renderMapHeader
  };
})(window);
