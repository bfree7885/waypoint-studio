/**
 * Savant WIE — Personal Palate Engine.
 * Learns preference weights from ratings, favorites, purchases, wishlist, notes.
 */
(function (global) {
  "use strict";

  var STYLE_HINTS = {
    acidity: ["acid", "crisp", "bright", "zing", "tart", "fresh", "mineral"],
    oak: ["oak", "vanilla", "toast", "butter", "barrel"],
    sweet: ["sweet", "off-dry", "honey", "residual", "dessert"],
    tannin: ["tannin", "astringent", "grippy", "structured", "chewy"],
    alcohol: ["hot", "high alcohol", "boozy", "powerful"],
    body_light: ["light", "delicate", "elegant", "ethereal"],
    body_full: ["full", "rich", "dense", "powerful", "opulent"]
  };

  function bump(map, key, weight) {
    if (!key) return;
    var k = String(key).toLowerCase().trim();
    if (!k) return;
    map[k] = (map[k] || 0) + weight;
  }

  function topKeys(map, n) {
    return Object.keys(map)
      .map(function (k) { return { key: k, weight: map[k] }; })
      .sort(function (a, b) { return b.weight - a.weight; })
      .slice(0, n || 5);
  }

  function noteHits(text, keys) {
    var t = String(text || "").toLowerCase();
    if (!t) return 0;
    var n = 0;
    keys.forEach(function (k) {
      if (t.indexOf(k) !== -1) n += 1;
    });
    return n;
  }

  function buildPalate(signals, catalog) {
    signals = signals || (global.SavantWIE.signals && SavantWIE.signals.collect()) || { wines: [], rated: [], favorites: [], wishlist: [], purchased: [], counts: {} };
    catalog = catalog || { entries: [] };
    var grapes = {};
    var regions = {};
    var countries = {};
    var producers = {};
    var styles = {};
    var bodies = {};
    var pairings = {};
    var prices = [];
    var traitScores = {
      acidity: 0,
      oak: 0,
      sweet: 0,
      tannin: 0,
      alcohol: 0,
      body_light: 0,
      body_full: 0
    };
    var avoidTraits = {
      sweet: 0,
      oak: 0,
      alcohol: 0,
      tannin: 0
    };

    function absorbWine(w, weight) {
      bump(grapes, w.varietal, weight);
      bump(regions, w.region, weight);
      bump(countries, w.country, weight);
      bump(producers, w.wineryName, weight);
      bump(styles, w.style, weight);
      (w.foodPairings || []).forEach(function (p) { bump(pairings, p, weight * 0.6); });
      if (w.purchasePrice != null && isFinite(Number(w.purchasePrice))) {
        prices.push(Number(w.purchasePrice));
      }
      var blob = [w.notes, w.tastingNotes, w.style, w.varietal].join(" ");
      Object.keys(STYLE_HINTS).forEach(function (trait) {
        var hits = noteHits(blob, STYLE_HINTS[trait]);
        if (hits) traitScores[trait] += hits * weight;
      });
      // Enrich from catalog grape match
      var entry = (catalog.entries || []).find(function (e) {
        return e.kind === "grape" && w.varietal &&
          String(e.name).toLowerCase() === String(w.varietal).toLowerCase();
      });
      if (entry) {
        bump(bodies, entry.body, weight);
        if (entry.acidity) bump(styles, "acidity:" + entry.acidity, weight * 0.5);
        if (entry.oak) bump(styles, "oak:" + entry.oak, weight * 0.4);
        if (entry.sweetness) bump(styles, "sweetness:" + entry.sweetness, weight * 0.4);
        if (entry.alcohol) bump(styles, "alcohol:" + entry.alcohol, weight * 0.3);
      }
    }

    (signals.favorites || []).forEach(function (w) { absorbWine(w, 3); });
    (signals.rated || []).forEach(function (w) {
      var r = Number(w.rating);
      var weight = r >= 90 ? 3 : r >= 80 ? 2 : r >= 70 ? 1 : 0.2;
      absorbWine(w, weight);
      if (r < 70) {
        var blob = [w.notes, w.tastingNotes, w.style].join(" ");
        ["sweet", "oak", "alcohol", "tannin"].forEach(function (trait) {
          if (noteHits(blob, STYLE_HINTS[trait] || STYLE_HINTS.sweet)) avoidTraits[trait] += 2;
        });
        if (w.varietal) bump(avoidTraits, "grape:" + String(w.varietal).toLowerCase(), 1);
      }
    });
    (signals.purchased || []).forEach(function (w) { absorbWine(w, 1.2); });
    (signals.wishlist || []).forEach(function (item) {
      bump(grapes, item.varietal || item.grape, 1.5);
      bump(regions, item.region, 1.5);
      bump(producers, item.producer || item.wineryName, 1.5);
      if (item.name) bump(grapes, item.name, 0.8);
    });
    // Repeat purchase signal: same producer/varietal multiple times
    var producerCounts = {};
    (signals.wines || []).forEach(function (w) {
      if (w.wineryName) producerCounts[w.wineryName] = (producerCounts[w.wineryName] || 0) + 1;
    });
    Object.keys(producerCounts).forEach(function (p) {
      if (producerCounts[p] >= 2) bump(producers, p, producerCounts[p]);
    });

    var avgPrice = prices.length
      ? Math.round((prices.reduce(function (a, b) { return a + b; }, 0) / prices.length) * 100) / 100
      : null;

    var enjoyed = [];
    var rarely = [];
    topKeys(traitScores, 6).forEach(function (t) {
      if (t.weight <= 0) return;
      var label = {
        acidity: "High / bright acidity",
        oak: "Oak-influenced wines",
        sweet: "Residual sugar / off-dry styles",
        tannin: "Structured tannins",
        alcohol: "Higher alcohol presence",
        body_light: "Lighter body / elegant frames",
        body_full: "Fuller body / richer frames"
      }[t.key] || t.key;
      enjoyed.push({ trait: t.key, label: label, weight: t.weight });
    });
    Object.keys(avoidTraits).forEach(function (k) {
      if (avoidTraits[k] >= 2 && String(k).indexOf("grape:") !== 0) {
        rarely.push({
          trait: k,
          label: {
            sweet: "High residual sugar",
            oak: "Heavy oak",
            alcohol: "Very high alcohol",
            tannin: "Aggressive tannins"
          }[k] || k,
          weight: avoidTraits[k]
        });
      }
    });

    var confidence = signals.counts && signals.counts.rated >= 5
      ? "moderate"
      : signals.counts && (signals.counts.favorites + signals.counts.rated) >= 2
        ? "emerging"
        : "low";

    return {
      version: "1.0.0",
      builtAt: new Date().toISOString(),
      confidence: confidence,
      honesty: confidence === "low"
        ? "Palate profile is thin until you rate, favorite, or buy a few bottles — recommendations stay educational."
        : "Palate profile is inferred from your local cellar signals. It improves as you rate and note wines.",
      topGrapes: topKeys(grapes, 6),
      topRegions: topKeys(regions, 6),
      topCountries: topKeys(countries, 5),
      topProducers: topKeys(producers, 5),
      topStyles: topKeys(styles, 8),
      topBodies: topKeys(bodies, 4),
      topPairings: topKeys(pairings, 6),
      preferredPrice: avgPrice,
      priceSamples: prices.length,
      enjoyedTraits: enjoyed,
      rarelyEnjoyed: rarely.sort(function (a, b) { return b.weight - a.weight; }).slice(0, 5),
      signalCounts: signals.counts || {},
      raw: { grapes: grapes, regions: regions, countries: countries, producers: producers, styles: styles, traitScores: traitScores, avoidTraits: avoidTraits }
    };
  }

  function affinityForEntry(palate, entry) {
    if (!palate || !entry) return { score: 0, reasons: [] };
    var score = 0;
    var reasons = [];
    var name = String(entry.name || "").toLowerCase();
    (palate.topGrapes || []).forEach(function (g, i) {
      if (name.indexOf(g.key) !== -1 || (entry.tags || []).some(function (t) { return String(t).toLowerCase().indexOf(g.key) !== -1; })) {
        var w = 12 - i;
        score += w;
        reasons.push("Aligns with grape affinity for " + g.key + " from wines you favor.");
      }
    });
    (palate.topRegions || []).forEach(function (r, i) {
      if ((entry.regionHints || []).some(function (h) { return String(h).toLowerCase().indexOf(r.key) !== -1; }) ||
          name.indexOf(r.key) !== -1) {
        score += 10 - i;
        reasons.push("Neighbors your preferred region signal: " + r.key + ".");
      }
    });
    (entry.flavors || []).forEach(function (f) {
      var fl = String(f).toLowerCase();
      if ((palate.enjoyedTraits || []).some(function (t) { return t.trait === "acidity" && /citrus|mineral|bright|tart/.test(fl); })) {
        score += 3;
        reasons.push("Flavor cue (“" + f + "”) overlaps bright/acid profiles you tend to enjoy.");
      }
    });
    if (entry.acidity && /high/.test(String(entry.acidity)) && (palate.enjoyedTraits || []).some(function (t) { return t.trait === "acidity"; })) {
      score += 6;
      reasons.push("High acidity matches a pattern in your notes and favorites.");
    }
    if (entry.oak && /often|heavy/.test(String(entry.oak)) && (palate.rarelyEnjoyed || []).some(function (t) { return t.trait === "oak"; })) {
      score -= 8;
      reasons.push("Oak emphasis conflicts with wines you rated lower for heavy oak.");
    }
    if (entry.sweetness && /sweet|off/.test(String(entry.sweetness)) && (palate.rarelyEnjoyed || []).some(function (t) { return t.trait === "sweet"; })) {
      score -= 8;
      reasons.push("Sweetness profile conflicts with your lower-rated sweeter wines.");
    }
    if (palate.preferredPrice != null && entry.typicalPrice && /everyday|broad|varies/.test(String(entry.typicalPrice))) {
      score += 2;
      reasons.push("Price band is flexible relative to your ~$" + palate.preferredPrice + " average spend.");
    }
    // Dedupe reasons
    var seen = {};
    reasons = reasons.filter(function (r) {
      if (seen[r]) return false;
      seen[r] = true;
      return true;
    }).slice(0, 4);
    return { score: score, reasons: reasons };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.palate = {
    buildPalate: buildPalate,
    affinityForEntry: affinityForEntry,
    topKeys: topKeys
  };
})(typeof window !== "undefined" ? window : globalThis);
