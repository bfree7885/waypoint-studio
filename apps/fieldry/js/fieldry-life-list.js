/**
 * Fieldry life-list categories — observation taxonomy for the living Pokédex.
 * Personal collections only. No leaderboards.
 */
(function (global) {
  "use strict";

  var CATEGORIES = [
    { id: "plants", label: "Plants" },
    { id: "trees", label: "Trees" },
    { id: "birds", label: "Birds" },
    { id: "mammals", label: "Mammals" },
    { id: "reptiles", label: "Reptiles" },
    { id: "amphibians", label: "Amphibians" },
    { id: "fish", label: "Fish" },
    { id: "mushrooms", label: "Mushrooms" },
    { id: "insects", label: "Insects" },
    { id: "butterflies", label: "Butterflies" },
    { id: "dragonflies", label: "Dragonflies" },
    { id: "lichens", label: "Lichens" },
    { id: "rocks", label: "Rocks" },
    { id: "minerals", label: "Minerals" },
    { id: "weather", label: "Weather" },
    { id: "clouds", label: "Clouds" },
    { id: "other", label: "Other observations" }
  ];

  function summarizeLifeList(observations) {
    var counts = {};
    CATEGORIES.forEach(function (c) { counts[c.id] = 0; });
    (observations || []).forEach(function (obs) {
      var cat = (obs && obs.extensions && obs.extensions.fieldry && obs.extensions.fieldry.category) ||
        (obs && obs.record && obs.record.category) ||
        "other";
      if (!counts[cat] && counts[cat] !== 0) cat = "other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return {
      total: (observations || []).length,
      byCategory: CATEGORIES.map(function (c) {
        return { id: c.id, label: c.label, count: counts[c.id] || 0 };
      }),
      uniqueDays: null
    };
  }

  global.WaypointFieldryLifeList = {
    CATEGORIES: CATEGORIES,
    summarizeLifeList: summarizeLifeList
  };
})(window);
