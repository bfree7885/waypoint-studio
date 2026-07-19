/**
 * Savant WIE — Food Pairing Engine (explanatory, not static charts alone).
 */
(function (global) {
  "use strict";

  var RULES = [
    {
      id: "acid-cream",
      whenFood: [/cream|butter|alfredo|cheese sauce|rich sauce/i],
      whenWine: function (e) { return e && /high|medium-high/.test(String(e.acidity || "")); },
      why: "High acidity cuts through fat and refreshes the palate against rich cream sauces."
    },
    {
      id: "tannin-meat",
      whenFood: [/steak|grill|lamb|beef|bbq|char/i],
      whenWine: function (e) { return e && (e.style === "red" || /cabernet|nebbiolo|syrah|merlot/i.test(e.name || "")); },
      why: "Protein and fat soften perceived tannin; peppery or structured reds complement grilled meats."
    },
    {
      id: "sweet-spice",
      whenFood: [/spice|chili|curry|sichuan|hot/i],
      whenWine: function (e) { return e && (/off|sweet|riesling|gewürz/i.test([e.sweetness, e.name, (e.tags || []).join(" ")].join(" "))); },
      why: "A touch of residual sugar and aromatic fruit offset chile heat better than high-alcohol dry reds."
    },
    {
      id: "acid-fried",
      whenFood: [/fried|salt|fries|chip|tempura/i],
      whenWine: function (e) { return e && /high|medium-high/.test(String(e.acidity || "")) || /sparkling|champagne|prosecco/i.test(e.name || ""); },
      why: "Acidity (and bubbles) clean salt and oil — the classic fried-food refreshment lesson."
    },
    {
      id: "earthy-mushroom",
      whenFood: [/mushroom|truffle|forest|umami/i],
      whenWine: function (e) { return e && /pinot|nebbiolo|gamay|earth/i.test([e.name, (e.flavors || []).join(" ")].join(" ")); },
      why: "Earthy, red-fruit wines echo forest-floor and umami notes without overwhelming delicate mushrooms."
    },
    {
      id: "citrus-seafood",
      whenFood: [/fish|seafood|oyster|shrimp|salmon/i],
      whenWine: function (e) { return e && (e.style === "white" || e.style === "sparkling" || /riesling|chenin|chablis|chardonnay/i.test(e.name || "")); },
      why: "Bright citrus/mineral whites and lighter frames keep seafood tasting fresh rather than heavy."
    }
  ];

  function pairForFood(foodQuery, catalog, palate) {
    var q = String(foodQuery || "").trim();
    catalog = catalog || { entries: [] };
    if (!q) {
      return {
        query: q,
        matches: [],
        honesty: "Enter a dish or ingredient to generate explained pairings."
      };
    }

    var ruleHits = RULES.filter(function (r) {
      return r.whenFood.some(function (rx) { return rx.test(q); });
    });

    var matches = [];
    (catalog.entries || []).forEach(function (entry) {
      if (entry.kind !== "grape" && entry.kind !== "style") return;
      var reasons = [];
      ruleHits.forEach(function (rule) {
        if (rule.whenWine(entry)) reasons.push(rule.why);
      });
      (entry.foodPairing || []).forEach(function (fp) {
        if (String(fp).toLowerCase().indexOf(q.toLowerCase()) !== -1 || q.toLowerCase().indexOf(String(fp).toLowerCase()) !== -1) {
          reasons.push("Catalog pairing lists “" + fp + "” for " + entry.name + " — treat as a starting hypothesis, then taste.");
        }
      });
      if (palate && SavantWIE.palate) {
        var aff = SavantWIE.palate.affinityForEntry(palate, entry);
        if (aff.score > 8 && reasons.length) {
          reasons.push("Also aligns with your palate signals, so the pairing is more likely to feel personal.");
        }
      }
      if (reasons.length) {
        matches.push({
          entry: entry,
          why: reasons.slice(0, 3).join(" "),
          score: reasons.length * 10 + (affScore(palate, entry))
        });
      }
    });

    matches.sort(function (a, b) { return b.score - a.score; });

    if (!matches.length) {
      matches.push({
        entry: null,
        why: "No narrow rule fired — general guide: match intensity (delicate with delicate, rich with rich), then use acid to cut fat and sweetness to tame heat.",
        score: 0
      });
    }

    return {
      version: "1.0.0",
      query: q,
      honesty: "Pairings are explanatory heuristics, not absolute laws.",
      matches: matches.slice(0, 6),
      teach: microTeach(q)
    };
  }

  function affScore(palate, entry) {
    if (!palate || !SavantWIE.palate) return 0;
    return SavantWIE.palate.affinityForEntry(palate, entry).score || 0;
  }

  function microTeach(q) {
    if (/spice|chili|curry/i.test(q)) return "Why it matters: alcohol amplifies burn; sugar and aromatics soothe it.";
    if (/cream|butter|cheese/i.test(q)) return "Why acidity matters: it resets fat on the tongue so richness does not fatigue.";
    if (/steak|grill|beef/i.test(q)) return "Why tannin matters: protein binds tannin, softening bitterness while the wine keeps structure.";
    return "Why pairing works: weight, acid, salt, fat, spice, and aroma bridges — not rigid red/white rules.";
  }

  function pairForEntry(entry) {
    if (!entry) return [];
    return (entry.foodPairing || []).map(function (fp) {
      var fake = pairForFood(fp, { entries: [entry] }, null);
      return {
        food: fp,
        why: (fake.matches[0] && fake.matches[0].why) || ("Classic teaching pairing for " + entry.name + ".")
      };
    });
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.pairing = {
    RULES: RULES,
    pairForFood: pairForFood,
    pairForEntry: pairForEntry
  };
})(typeof window !== "undefined" ? window : globalThis);
