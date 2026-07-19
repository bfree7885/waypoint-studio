/**
 * Savant WIE — Guided Discovery (nearby styles, regions, grapes, value/premium, unexpected).
 */
(function (global) {
  "use strict";

  var NEIGHBOR_REGIONS = {
    burgundy: ["Willamette Valley", "Central Otago", "Baden"],
    bordeaux: ["Napa Valley", "Maipo", "Coonawarra"],
    mosel: ["Finger Lakes", "Alsace", "Clare Valley"],
    "napa valley": ["Bordeaux", "Sonoma", "Maipo"],
    alsace: ["Mosel", "Finger Lakes", "Clare Valley"]
  };

  var NEIGHBOR_GRAPES = {
    "pinot noir": ["Gamay", "Nebbiolo"],
    "cabernet sauvignon": ["Merlot", "Cabernet Franc"],
    riesling: ["Chenin Blanc", "Gewürztraminer"],
    chardonnay: ["Chenin Blanc", "Riesling"],
    merlot: ["Cabernet Franc", "Cabernet Sauvignon"]
  };

  function findByName(catalog, name) {
    var n = String(name).toLowerCase();
    return (catalog.entries || []).find(function (e) {
      return String(e.name).toLowerCase() === n || (e.aka || []).some(function (a) { return String(a).toLowerCase() === n; });
    });
  }

  function guided(palate, catalog) {
    palate = palate || {};
    catalog = catalog || { entries: [] };
    var suggestions = [];

    function push(kind, title, why, entry) {
      suggestions.push({ kind: kind, title: title, why: why, entryId: entry && entry.id || null, entry: entry || null });
    }

    (palate.topGrapes || []).slice(0, 2).forEach(function (g) {
      var neighbors = NEIGHBOR_GRAPES[g.key] || [];
      neighbors.forEach(function (n) {
        var e = findByName(catalog, n);
        push("related-grape", n, "Related grape to your affinity for " + g.key + " — expands knowledge without abandoning what you already like.", e);
      });
      var self = findByName(catalog, g.key);
      if (self && self.similar) {
        self.similar.slice(0, 2).forEach(function (id) {
          var e = (catalog.entries || []).find(function (x) { return x.id === id; });
          if (e) push("nearby-style", e.name, "Nearby style to " + self.name + ": " + (e.whyMatchTemplate || e.unique), e);
        });
      }
    });

    (palate.topRegions || []).slice(0, 2).forEach(function (r) {
      var neighbors = NEIGHBOR_REGIONS[r.key] || [];
      neighbors.forEach(function (n) {
        var e = findByName(catalog, n);
        push("neighboring-region", n, "Neighboring climate/style conversation to " + r.key + " — useful for guided exploration.", e);
      });
    });

    (palate.topProducers || []).slice(0, 1).forEach(function (p) {
      push("alternative-producer", "Explore peers of " + p.key, "You return to " + p.key + "; try producers in the same region who work in a related register — keeps curiosity moving.", null);
    });

    if (palate.preferredPrice != null) {
      push("higher-value", "Value alternatives near $" + palate.preferredPrice, "Look for bottles that echo your preferred acidity/body at or below your average spend — stretch knowledge, not necessarily budget.", null);
      push("premium", "Occasional premium step-up", "A slightly higher price can buy older vines or cooler sites — useful when you want a teaching bottle, not a default.", null);
    }

    // Unexpected: cool if warm-heavy palate, etc.
    var warmHeavy = (palate.topGrapes || []).some(function (g) {
      return /cabernet|merlot|syrah|zinfandel/.test(g.key);
    });
    if (warmHeavy) {
      var riesling = findByName(catalog, "Riesling");
      push("unexpected", "Riesling", "Unexpected discovery: if your cellar leans warm reds, a high-acid Riesling teaches contrast — residual sugar optional, freshness required.", riesling);
    } else {
      var cab = findByName(catalog, "Cabernet Sauvignon");
      push("unexpected", "Cabernet Sauvignon", "Unexpected discovery: structured Cabernet is a useful contrast lesson if your lean is toward lighter or cooler styles.", cab);
    }

    // Dedupe by title
    var seen = {};
    suggestions = suggestions.filter(function (s) {
      var k = s.kind + ":" + s.title;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    }).slice(0, 10);

    return {
      version: "1.0.0",
      honesty: "Guided discovery expands knowledge gently — suggestions explain the pedagogical reason, not a sales rank.",
      suggestions: suggestions
    };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.discovery = {
    guided: guided,
    NEIGHBOR_REGIONS: NEIGHBOR_REGIONS,
    NEIGHBOR_GRAPES: NEIGHBOR_GRAPES
  };
})(typeof window !== "undefined" ? window : globalThis);
