/**
 * Savant WIE — Smart Tasting Analysis (automatic preference patterns).
 */
(function (global) {
  "use strict";

  function analyze(palate, signals) {
    palate = palate || {};
    signals = signals || { rated: [], wines: [], counts: {} };
    var enjoyed = (palate.enjoyedTraits || []).map(function (t) {
      return { label: t.label, why: "Appears repeatedly in favorites, high ratings, or tasting notes." };
    });
    var rarely = (palate.rarelyEnjoyed || []).map(function (t) {
      return { label: t.label, why: "Shows up more often among lower-rated bottles or critical notes." };
    });

    // Pattern summaries from grapes/regions
    (palate.topGrapes || []).slice(0, 3).forEach(function (g) {
      enjoyed.push({
        label: "Affinity for " + g.key,
        why: "Weighted from ratings, favorites, and repeat cellar presence."
      });
    });

    var summary = [];
    if (enjoyed.length) {
      summary.push("You consistently enjoy: " + enjoyed.slice(0, 5).map(function (e) { return e.label; }).join("; ") + ".");
    } else {
      summary.push("Not enough tasting signal yet to lock patterns — rate a few bottles with short notes.");
    }
    if (rarely.length) {
      summary.push("You rarely enjoy: " + rarely.map(function (e) { return e.label; }).join("; ") + ".");
    }

    var noteCount = (signals.wines || []).filter(function (w) {
      return (w.notes && w.notes.length > 8) || (w.tastingNotes && String(w.tastingNotes).length > 8);
    }).length;

    return {
      version: "1.0.0",
      confidence: palate.confidence || "low",
      honesty: "Patterns are inferred locally from your cellar — not a lab sensory panel.",
      enjoyed: enjoyed.slice(0, 8),
      rarely: rarely.slice(0, 6),
      summary: summary,
      noteCoverage: noteCount,
      teach: noteCount < 3
        ? "Tip: after tasting, jot acidity, oak, and body in three words — the engine learns faster from concrete language."
        : "Your notes are feeding trait detection — keep contrasting bottles to sharpen the model."
    };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.tasting = {
    analyze: analyze
  };
})(typeof window !== "undefined" ? window : globalThis);
