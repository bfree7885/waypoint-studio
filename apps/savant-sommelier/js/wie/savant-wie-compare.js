/**
 * Savant WIE — Comparison Engine (regions, grapes, styles, climate, properties).
 */
(function (global) {
  "use strict";

  function compareEntries(a, b) {
    if (!a || !b) {
      return { ok: false, why: "Select two catalog items to compare." };
    }
    var strengthsA = [];
    var strengthsB = [];
    var diffs = [];

    function pushDiff(label, va, vb) {
      if (va == null && vb == null) return;
      if (String(va) === String(vb)) {
        diffs.push(label + ": similar (" + (va || "—") + ").");
      } else {
        diffs.push(label + ": " + a.name + " → " + (va || "—") + "; " + b.name + " → " + (vb || "—") + ".");
        if (va) strengthsA.push(label + " (" + va + ")");
        if (vb) strengthsB.push(label + " (" + vb + ")");
      }
    }

    pushDiff("Style", a.style, b.style);
    pushDiff("Body", a.body, b.body);
    pushDiff("Acidity", a.acidity, b.acidity);
    pushDiff("Sweetness", a.sweetness, b.sweetness);
    pushDiff("Oak", a.oak, b.oak);
    pushDiff("Alcohol", a.alcohol, b.alcohol);

    if ((a.flavors || []).length || (b.flavors || []).length) {
      diffs.push("Flavor emphasis: " + a.name + " leans " + ((a.flavors || []).slice(0, 3).join(", ") || "—") +
        "; " + b.name + " leans " + ((b.flavors || []).slice(0, 3).join(", ") || "—") + ".");
    }

    var teach = null;
    if (/pinot/i.test(a.name) && /cabernet/i.test(b.name) || /cabernet/i.test(a.name) && /pinot/i.test(b.name)) {
      teach = SavantWIE.education && SavantWIE.education.forTopic("pinotVsCab");
    }

    return {
      ok: true,
      a: a,
      b: b,
      strengthsA: strengthsA.slice(0, 4),
      strengthsB: strengthsB.slice(0, 4),
      differences: diffs,
      why: a.name + " vs " + b.name + " is useful because contrasting acidity, body, and climate cues teaches faster than memorizing labels.",
      teach: teach,
      honesty: "Comparisons are educational trait contrasts — not quality rankings."
    };
  }

  function compareProperties(analysisA, analysisB) {
    if (!analysisA || !analysisB) {
      return { ok: false, why: "Analyze two properties before comparing." };
    }
    function metric(analysis, id) {
      var m = (analysis.metrics || []).find(function (x) { return x.id === id; });
      return m ? m.value : null;
    }
    var ids = ["gdd", "elevation", "slope", "aspect", "diseasePressure", "seasonLength", "hardinessZone"];
    var differences = ids.map(function (id) {
      return {
        id: id,
        a: metric(analysisA, id),
        b: metric(analysisB, id),
        why: (SavantVineyard && SavantVineyard.METRIC_WHY && SavantVineyard.METRIC_WHY[id]) || ""
      };
    });
    return {
      ok: true,
      differences: differences,
      why: "Property comparison highlights heat, frost, and disease tradeoffs — the practical language of vineyard consulting.",
      honesty: "Both sides may include educational estimates; treat deltas as teaching signals."
    };
  }

  function compareHorizons(future, yearA, yearB) {
    if (!future || !future.timeline) return { ok: false };
    var a = future.timeline.find(function (h) { return h.yearsAhead === yearA; });
    var b = future.timeline.find(function (h) { return h.yearsAhead === yearB; });
    if (!a || !b) return { ok: false };
    var changes = [];
    (a.all || []).forEach(function (g) {
      var other = (b.all || []).find(function (x) { return x.grapeId === g.grapeId; });
      if (!other) return;
      var delta = other.score - g.score;
      if (Math.abs(delta) >= 3) {
        changes.push({
          name: g.name,
          delta: delta,
          why: delta > 0
            ? g.name + " gains fit by " + delta + " points in the later scenario as heat accumulation rises."
            : g.name + " loses fit by " + Math.abs(delta) + " points as heat/disease pressure moves away from its window."
        });
      }
    });
    return {
      ok: true,
      from: a.label,
      to: b.label,
      warmingDeltaC: Math.round((b.warmingC - a.warmingC) * 100) / 100,
      changes: changes.sort(function (x, y) { return Math.abs(y.delta) - Math.abs(x.delta); }),
      honesty: "Horizon deltas use the educational warming heuristic — uncertainty grows with time."
    };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.compare = {
    compareEntries: compareEntries,
    compareProperties: compareProperties,
    compareHorizons: compareHorizons
  };
})(typeof window !== "undefined" ? window : globalThis);
