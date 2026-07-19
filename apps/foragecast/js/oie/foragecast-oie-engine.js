/**
 * ForageCast Outdoor Intelligence Engine — orchestrator.
 * Separates observations → derived → scoring → confidence → explanations.
 * Caches derived packages; UI should call evaluate() rather than recompute ad hoc.
 */
(function (global) {
  "use strict";

  var CACHE_KEY = "foragecast.oie.cache.v1";
  var memory = {
    key: null,
    package: null,
    at: 0
  };

  function cacheKey(observations) {
    var loc = observations && observations.location;
    var cal = observations && observations.calendar;
    var w = observations && observations.weather;
    var d0 = w && w.daily && w.daily[0];
    return [
      loc && loc.lat,
      loc && loc.lng,
      cal && cal.weekOf,
      observations && observations.liveWeather,
      d0 && d0.precipMm,
      d0 && d0.tMax,
      d0 && d0.tMin
    ].join("|");
  }

  function readPreviousScores() {
    try {
      var raw = global.localStorage && localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeCache(pkg) {
    memory.package = pkg;
    memory.at = Date.now();
    memory.key = cacheKey(pkg.observations);
    try {
      if (global.localStorage) {
        var slim = {
          at: pkg.generatedAt,
          byId: {}
        };
        (pkg.scoredList || []).forEach(function (s) {
          slim.byId[s.speciesId] = { score: s.score, level: s.level };
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify(slim));
      }
    } catch (e) { /* ignore quota */ }
  }

  function evaluate(options) {
    options = options || {};
    var O = global.ForageCastOIE;
    if (!O || !O.observations || !O.derived || !O.scoring || !O.confidence || !O.explain) {
      throw new Error("ForageCast OIE layers are not loaded");
    }

    var observations = O.observations.collect(options.platform, options.conditions, options.location);
    var key = cacheKey(observations);
    var maxAge = options.maxAgeMs != null ? options.maxAgeMs : 3 * 60 * 1000;

    if (
      !options.force &&
      memory.package &&
      memory.key === key &&
      Date.now() - memory.at < maxAge
    ) {
      memory.package._fromCache = true;
      return memory.package;
    }

    var derived = O.derived.derive(observations);
    var scoredList = O.scoring.scoreAll(
      options.speciesList,
      derived,
      options.zones,
      options.conditions
    );

    var prev = readPreviousScores();
    var previousById = prev && prev.byId ? prev.byId : null;

    var narratives = O.explain.buildNarratives({
      speciesList: options.speciesList,
      scoredList: scoredList,
      derived: derived,
      observations: observations,
      previousById: previousById
    });

    // Attach full confidence objects onto opportunities (already embedded) and species cards
    var speciesCards = scoredList.map(function (scored) {
      var species = (options.speciesList || []).find(function (s) {
        return s.id === scored.speciesId;
      });
      var confidence = O.confidence.explainConfidence(
        scored,
        derived,
        previousById && previousById[scored.speciesId]
      );
      var momentum = O.explain.momentumFrom(scored, derived, confidence);
      var phase = global.ForageCastIntelligence && ForageCastIntelligence.seasonPhase
        ? ForageCastIntelligence.seasonPhase(species)
        : null;
      var spatial = O.map
        ? O.map.schematicSuitability(scored, options.zones, species)
        : null;

      return {
        id: scored.speciesId,
        name: scored.name,
        scientificName: species && species.scientificName,
        level: scored.level,
        readinessScore: scored.readinessScore,
        confidenceLabel: confidence.label.replace(/ confidence/i, ""),
        confidenceReason: (confidence.whyHigh[0] || confidence.whyLow[0] || ""),
        confidence: confidence,
        phase: phase,
        explanation: narratives.opportunities.find(function (o) {
          return o.speciesId === scored.speciesId;
        }).why,
        why: (scored.topDrivers[0] && (scored.topDrivers[0].label + " most influenced this score.")) ||
          confidence.whyHigh[0] ||
          confidence.whyLow[0],
        whyFactors: scored.topDrivers.map(function (d) {
          return d.label + " (value " + Math.round(d.value * 100) + "%, weight " +
            Math.round(d.weight * 100) + "%).";
        }),
        momentum: momentum,
        trend: {
          label: momentum.label,
          detail: momentum.why
        },
        preferredHabitat: species && (species.preferredHabitat ||
          (species.investigation && species.investigation.where)),
        lookAlikes: (species && species.lookAlikes) || [],
        ethicalHarvest: (species && species.ethicalHarvest) ||
          ((species && species.investigation && species.investigation.doNotDisturb) || []),
        identification: (species && species.lookForOutside) || [],
        href: "species.html?id=" + encodeURIComponent(scored.speciesId),
        scored: scored,
        spatial: spatial
      };
    });

    var pkg = {
      version: "2.0.0",
      generatedAt: new Date().toISOString(),
      _fromCache: false,
      observations: observations,
      derived: derived,
      scoredList: scoredList,
      species: speciesCards,
      opportunities: narratives.opportunities,
      briefing: narratives.briefing,
      forecast: narratives.forecast,
      insights: narratives.insights,
      momentumSummary: narratives.momentumSummary,
      mapFoundation: O.map ? O.map.describeFoundation() : null,
      honesty: derived.liveWeather
        ? "Scores are educational suitability — transparent weighted factors plus live-derived environment when available."
        : "Scores are educational suitability. Live weather unavailable — confidence stays cautious."
    };

    writeCache(pkg);
    return pkg;
  }

  function buildSummary(options) {
    var pkg = evaluate(options);
    var statements = [];
    pkg.opportunities.slice(0, 5).forEach(function (o) {
      statements.push({
        kind: "species",
        speciesId: o.speciesId,
        text: o.text,
        why: o.why,
        href: o.href,
        level: o.level
      });
    });
    (pkg.briefing.bullets || []).forEach(function (b) {
      statements.push({
        kind: "condition",
        text: b.text,
        why: b.why,
        tone: b.tone,
        level: b.tone === "caution" ? "low" : b.tone === "favorable" ? "high" : "moderate"
      });
    });

    var locName = (options.location && (options.location.name || options.location.county)) ||
      (options.conditions && options.conditions.region && options.conditions.region.county) ||
      "your area";

    return {
      title: "Today’s foraging summary",
      question: "What should I be looking for today, and why?",
      locationLabel: locName,
      liveWeather: pkg.derived.liveWeather,
      generatedAt: pkg.generatedAt,
      honesty: pkg.honesty,
      species: pkg.species,
      briefing: pkg.briefing,
      forecast: pkg.forecast,
      insights: pkg.insights,
      opportunities: pkg.opportunities,
      momentumSummary: pkg.momentumSummary,
      statements: statements,
      engine: pkg,
      topActions: options.todayPlan && options.todayPlan.actions
        ? options.todayPlan.actions.slice(0, 4)
        : [],
      mapFoundation: pkg.mapFoundation
    };
  }

  global.ForageCastOIE = global.ForageCastOIE || {};
  global.ForageCastOIE.engine = {
    evaluate: evaluate,
    buildSummary: buildSummary,
    clearMemory: function () {
      memory = { key: null, package: null, at: 0 };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
