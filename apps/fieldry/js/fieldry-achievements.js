/**
 * Fieldry achievements — calm discovery milestones derived from observations.
 * No scarcity games, rankings, or streak pressure.
 */
(function (global) {
  "use strict";

  var LL = function () { return global.WaypointFieldryLifeList; };

  var DEFINITIONS = [
    {
      id: "first_observation",
      title: "First Observation",
      description: "You recorded your first encounter with the natural world.",
      evaluate: function (ctx) { return ctx.total >= 1; },
      explain: function () { return "Earned when you saved your first observation."; }
    },
    {
      id: "first_bird",
      title: "First Bird",
      description: "You recorded a bird observation.",
      evaluate: function (ctx) { return (ctx.byCategory.birds || 0) >= 1; },
      explain: function () { return "Earned from your first bird category record."; }
    },
    {
      id: "first_mushroom",
      title: "First Mushroom",
      description: "You recorded a mushroom encounter.",
      evaluate: function (ctx) { return (ctx.byCategory.mushrooms || 0) >= 1; },
      explain: function () { return "Earned from your first mushroom category record."; }
    },
    {
      id: "first_rock_or_mineral",
      title: "First Rock or Mineral",
      description: "You recorded geology underfoot.",
      evaluate: function (ctx) {
        return (ctx.byCategory.rocks || 0) + (ctx.byCategory.minerals || 0) >= 1;
      },
      explain: function () { return "Earned from a rock or mineral observation."; }
    },
    {
      id: "five_categories",
      title: "Five Categories Explored",
      description: "Curiosity across different parts of the natural world.",
      evaluate: function (ctx) { return ctx.categoriesExplored >= 5; },
      explain: function (ctx) {
        return "Earned after exploring " + ctx.categoriesExplored + " categories.";
      }
    },
    {
      id: "first_revisit",
      title: "First Revisit",
      description: "You returned to a subject you had already observed.",
      evaluate: function (ctx) { return ctx.repeatSubjects >= 1; },
      explain: function () { return "Earned when any subject appears more than once."; }
    },
    {
      id: "four_seasons",
      title: "Four Seasons Observer",
      description: "You recorded observations across all four seasons.",
      evaluate: function (ctx) { return ctx.seasonsObserved >= 4; },
      explain: function (ctx) {
        return "Earned after recording in " + ctx.seasonsObserved + " seasons.";
      }
    },
    {
      id: "identified_later",
      title: "Identified Later",
      description: "You recorded something unidentified — room to learn later.",
      evaluate: function (ctx) { return ctx.unidentifiedCount >= 1; },
      explain: function () { return "Earned by saving an unidentified observation."; }
    },
    {
      id: "ten_unique_trees",
      title: "Ten Unique Trees",
      description: "A personal grove of distinct trees you have encountered.",
      evaluate: function (ctx) { return ctx.uniqueTrees >= 10; },
      explain: function (ctx) {
        return "Earned with " + ctx.uniqueTrees + " unique tree subjects.";
      }
    },
    {
      id: "first_night",
      title: "First Night Observation",
      description: "You recorded an encounter after dusk.",
      evaluate: function (ctx) { return ctx.nightObservations >= 1; },
      explain: function () { return "Earned from an observation recorded between 20:00 and 05:00."; }
    }
  ];

  function seasonOf(dateStr, seasonHint) {
    if (seasonHint) {
      var s = String(seasonHint).toLowerCase();
      if (s.indexOf("spring") >= 0) return "spring";
      if (s.indexOf("summer") >= 0) return "summer";
      if (s.indexOf("fall") >= 0 || s.indexOf("autumn") >= 0) return "fall";
      if (s.indexOf("winter") >= 0) return "winter";
    }
    if (!dateStr || dateStr.length < 7) return null;
    var m = Number(dateStr.slice(5, 7));
    if (m === 12 || m <= 2) return "winter";
    if (m <= 5) return "spring";
    if (m <= 8) return "summer";
    return "fall";
  }

  function isNightTime(timeStr) {
    if (!timeStr) return false;
    var h = Number(String(timeStr).split(":")[0]);
    if (!isFinite(h)) return false;
    return h >= 20 || h < 5;
  }

  function buildContext(observations) {
    var Life = LL();
    var summary = Life.summarizeLifeList(observations);
    var byCategory = {};
    summary.byCategory.forEach(function (c) { byCategory[c.id] = c.count; });
    var life = Life.deriveLifeList(observations);
    var seasons = {};
    var unidentifiedCount = 0;
    var nightObservations = 0;
    var uniqueTrees = 0;
    var repeatSubjects = 0;

    life.forEach(function (e) {
      if (e.count > 1) repeatSubjects += 1;
      if (e.category === "trees") uniqueTrees += 1;
    });

    (observations || []).forEach(function (obs) {
      var season = seasonOf(
        obs.observedAt && obs.observedAt.date,
        obs.context && obs.context.season
      );
      if (season) seasons[season] = true;
      if (isNightTime(obs.observedAt && obs.observedAt.time)) nightObservations += 1;
    });

    unidentifiedCount = (observations || []).filter(function (o) {
      return Life.isUnidentified(o);
    }).length;

    return {
      total: summary.total,
      byCategory: byCategory,
      categoriesExplored: summary.categoriesExplored,
      uniqueSubjects: life.length,
      repeatSubjects: repeatSubjects,
      seasonsObserved: Object.keys(seasons).length,
      unidentifiedCount: unidentifiedCount,
      uniqueTrees: uniqueTrees,
      nightObservations: nightObservations
    };
  }

  function evaluateAll(observations) {
    var ctx = buildContext(observations);
    return DEFINITIONS.map(function (def) {
      var earned = !!def.evaluate(ctx);
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        earned: earned,
        explanation: earned ? def.explain(ctx) : null
      };
    });
  }

  function earned(observations) {
    return evaluateAll(observations).filter(function (a) { return a.earned; });
  }

  global.FieldryAchievements = {
    DEFINITIONS: DEFINITIONS,
    buildContext: buildContext,
    evaluateAll: evaluateAll,
    earned: earned
  };
})(typeof window !== "undefined" ? window : global);
