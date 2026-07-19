/**
 * Savant WIE — Search Intelligence (synonyms, misspellings, related suggestions).
 */
(function (global) {
  "use strict";

  var SYNONYMS = {
    cab: "cabernet sauvignon",
    "cabernet": "cabernet sauvignon",
    "cab sauv": "cabernet sauvignon",
    pinot: "pinot noir",
    "pn": "pinot noir",
    chard: "chardonnay",
    riesling: "riesling",
    "zin": "zinfandel",
    bubbly: "sparkling",
    champagne: "sparkling",
    "côte-d'or": "burgundy",
    cote: "burgundy",
    "willamette": "willamette valley",
    moselle: "mosel",
    "syrah": "syrah",
    shiraz: "syrah"
  };

  var MISSPELLINGS = {
    cabernet: ["cabarnay", "cabernet sauvignion", "cabernet sauvignon"],
    chardonnay: ["chardonay", "chardone", "shardonnay"],
    riesling: ["riesling", "rieslin", "reisling", "rieseling"],
    burgundy: ["burgandy", "bourgogne"],
    bordeaux: ["bordeau", "bordox"],
    pinot: ["peeno", "pinot noir", "pinot noire"],
    merlot: ["merlot", "murlo", "merlot"],
    champagne: ["champaign", "champane"]
  };

  function normalize(q) {
    var s = String(q || "").toLowerCase().trim().replace(/\s+/g, " ");
    if (!s) return "";
    if (SYNONYMS[s]) return SYNONYMS[s];
    // fuzzy misspelling: if query close to known token
    var keys = Object.keys(MISSPELLINGS);
    for (var i = 0; i < keys.length; i++) {
      var canon = keys[i];
      var list = MISSPELLINGS[canon];
      for (var j = 0; j < list.length; j++) {
        if (list[j] === s || levenshtein(s, list[j]) <= 2) return SYNONYMS[canon] || canon;
      }
      if (levenshtein(s, canon) <= 2) return SYNONYMS[canon] || canon;
    }
    return s;
  }

  function levenshtein(a, b) {
    a = String(a); b = String(b);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var row = [];
    for (var j = 0; j <= b.length; j++) row[j] = j;
    for (var i = 1; i <= a.length; i++) {
      var prev = i - 1;
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, row[j] + 1, prev + cost);
        prev = row[j];
      }
      row = cur;
    }
    return row[b.length];
  }

  function search(catalog, query, options) {
    options = options || {};
    catalog = catalog || { entries: [] };
    var raw = String(query || "").trim();
    var norm = normalize(raw);
    var limit = options.limit != null ? options.limit : 20;

    var results = [];
    (catalog.entries || []).forEach(function (entry) {
      var blob = [
        entry.name, entry.kind, entry.style, entry.body, entry.unique,
        (entry.aka || []).join(" "),
        (entry.flavors || []).join(" "),
        (entry.countryHints || []).join(" "),
        (entry.regionHints || []).join(" "),
        (entry.tags || []).join(" "),
        entry.whyMatchTemplate
      ].join(" ").toLowerCase();
      var score = 0;
      if (!norm) score = 1;
      else if (String(entry.name).toLowerCase() === norm) score = 100;
      else if (String(entry.name).toLowerCase().indexOf(norm) !== -1) score = 80;
      else if (blob.indexOf(norm) !== -1) score = 50;
      else if (raw && blob.indexOf(raw.toLowerCase()) !== -1) score = 40;
      else {
        // token soft match
        norm.split(" ").forEach(function (tok) {
          if (tok.length > 2 && blob.indexOf(tok) !== -1) score += 15;
        });
      }
      if (score > 0) results.push({ entry: entry, score: score });
    });
    results.sort(function (a, b) { return b.score - a.score; });

    var suggestions = [];
    if (norm && norm !== raw.toLowerCase()) {
      suggestions.push({ type: "normalized", text: norm, why: "Interpreted “" + raw + "” as “" + norm + "” via synonym/spelling intelligence." });
    }
    var hit = results[0] && results[0].entry;
    if (hit) {
      (hit.similar || []).slice(0, 3).forEach(function (id) {
        var e = (catalog.entries || []).find(function (x) { return x.id === id; });
        if (e) suggestions.push({ type: "related", text: e.name, why: "Related to " + hit.name + " for continued exploration." });
      });
      (hit.regionHints || []).slice(0, 2).forEach(function (r) {
        suggestions.push({ type: "related-region", text: r, why: "Region often discussed with " + hit.name + "." });
      });
    }
    if (!results.length && raw) {
      suggestions.push({ type: "suggested", text: "Riesling", why: "No direct hits — try an anchor grape to restart discovery." });
      suggestions.push({ type: "suggested", text: "Burgundy", why: "Or browse a classic region to learn climate contrast." });
    }

    return {
      version: "1.0.0",
      query: raw,
      normalized: norm,
      results: results.slice(0, limit),
      suggestions: suggestions.slice(0, 8),
      honesty: "Search expands synonyms and gentle misspellings — it does not invent bottles you do not have."
    };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.search = {
    SYNONYMS: SYNONYMS,
    normalize: normalize,
    search: search,
    levenshtein: levenshtein
  };
})(typeof window !== "undefined" ? window : globalThis);
