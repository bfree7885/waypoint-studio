/**
 * Savant WIE — Recommendation Engine (multi-signal, always explains WHY).
 */
(function (global) {
  "use strict";

  function recommend(palate, catalog, options) {
    options = options || {};
    catalog = catalog || { entries: [] };
    palate = palate || { confidence: "low", topGrapes: [], honesty: "" };
    var limit = options.limit != null ? options.limit : 6;
    var ownedNames = (options.ownedNames || []).map(function (n) { return String(n).toLowerCase(); });

    var scored = (catalog.entries || []).map(function (entry) {
      var aff = SavantWIE.palate.affinityForEntry(palate, entry);
      var why = aff.reasons.slice();
      if (!why.length) {
        why.push(entry.whyMatchTemplate || ("Educational match for " + entry.name + " based on style and place cues."));
      }
      if (palate.confidence === "low") {
        why.unshift("Limited personal history — this is a teaching recommendation, not a locked-in preference.");
      }
      return {
        entry: entry,
        score: aff.score,
        why: why.join(" "),
        reasons: why,
        confidence: palate.confidence
      };
    }).filter(function (r) {
      if (ownedNames.indexOf(String(r.entry.name).toLowerCase()) !== -1) return false;
      return true;
    }).sort(function (a, b) { return b.score - a.score; });

    // If palate is empty, surface diverse educational anchors with why
    if (palate.confidence === "low" || scored.every(function (s) { return s.score <= 0; })) {
      scored = (catalog.entries || []).filter(function (e) { return e.kind === "grape" || e.kind === "style" || e.kind === "region"; })
        .slice(0, limit)
        .map(function (entry) {
          return {
            entry: entry,
            score: 1,
            why: "Starter discovery: " + (entry.whyMatchTemplate || entry.unique),
            reasons: [entry.whyMatchTemplate || entry.unique],
            confidence: "educational"
          };
        });
    }

    return {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      honesty: "Recommendations combine palate signals with educational catalog traits — never ratings alone.",
      items: scored.slice(0, limit)
    };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.recommend = {
    recommend: recommend
  };
})(typeof window !== "undefined" ? window : globalThis);
