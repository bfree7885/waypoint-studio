/**
 * Savant WIE — Purchase Intelligence (habits + future buy coaching).
 */
(function (global) {
  "use strict";

  function analyze(signals, palate) {
    signals = signals || { purchased: [], seasons: [], wines: [] };
    palate = palate || {};
    var purchased = signals.purchased || [];
    var prices = purchased.map(function (w) { return Number(w.purchasePrice); }).filter(function (p) { return isFinite(p); });
    var avg = prices.length ? Math.round((prices.reduce(function (a, b) { return a + b; }, 0) / prices.length) * 100) / 100 : null;
    var min = prices.length ? Math.min.apply(null, prices) : null;
    var max = prices.length ? Math.max.apply(null, prices) : null;

    var producers = {};
    var regions = {};
    var grapes = {};
    purchased.forEach(function (w) {
      if (w.wineryName) producers[w.wineryName] = (producers[w.wineryName] || 0) + 1;
      if (w.region) regions[w.region] = (regions[w.region] || 0) + 1;
      if (w.varietal) grapes[w.varietal] = (grapes[w.varietal] || 0) + 1;
    });

    function top(map) {
      return Object.keys(map).map(function (k) { return { key: k, count: map[k] }; })
        .sort(function (a, b) { return b.count - a.count; }).slice(0, 5);
    }

    var seasonCounts = { spring: 0, summer: 0, fall: 0, winter: 0 };
    (signals.seasons || []).forEach(function (s) { if (seasonCounts[s] != null) seasonCounts[s] += 1; });

    var totalValue = (signals.wines || []).reduce(function (n, w) {
      var p = Number(w.purchasePrice);
      var q = Number(w.quantity) || 0;
      return n + (isFinite(p) ? p * q : 0);
    }, 0);

    var recommendations = [];
    if (avg != null) {
      recommendations.push({
        text: "Keep a teaching bottle near $" + avg + " and one exploration bottle ±20%.",
        why: "Anchoring to your average spend prevents both boredom and budget drift."
      });
    }
    var topGrape = top(grapes)[0];
    if (topGrape) {
      recommendations.push({
        text: "Next purchase: a neighboring grape to " + topGrape.key + " rather than another identical bottle.",
        why: "Repeat purchases deepen comfort; neighbors expand literacy."
      });
    }
    if ((palate.rarelyEnjoyed || []).some(function (t) { return t.trait === "oak"; })) {
      recommendations.push({
        text: "Prefer stainless or neutral oak bottlings when trying new whites.",
        why: "Your lower-rated heavily oaked notes suggest fruit/acid clarity teaches you more right now."
      });
    }
    if (!purchased.length) {
      recommendations.push({
        text: "Log purchase price and date on the next bottle you buy.",
        why: "Purchase intelligence needs a few priced rows before habits become visible."
      });
    }

    return {
      version: "1.0.0",
      honesty: "Purchase insights use only bottles you logged locally — no retailer tracking.",
      averageBottlePrice: avg,
      priceRange: min != null ? { min: min, max: max } : null,
      favoriteProducers: top(producers),
      favoriteRegions: top(regions),
      mostPurchasedGrapes: top(grapes),
      seasonalBuying: seasonCounts,
      estimatedCellarValue: Math.round(totalValue * 100) / 100,
      recommendations: recommendations
    };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.purchase = {
    analyze: analyze
  };
})(typeof window !== "undefined" ? window : globalThis);
