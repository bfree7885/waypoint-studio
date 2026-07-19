/**
 * Steepleaf explainable recommendation foundation.
 * Always returns WHY. No social rankings.
 */
(function (global) {
  "use strict";

  function uniqueById(rows) {
    var seen = {};
    return rows.filter(function (r) {
      var id = r.entity.id;
      if (seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function similarTo(teaId, opts) {
    opts = opts || {};
    var G = global.WDS.steepleafGraph;
    var rows = [];
    G.neighbors(teaId, { types: ["similar-to", "shares-flavor-with", "recommended-after"] }).forEach(function (n) {
      if (n.entity.kind !== "tea") return;
      rows.push({
        entity: n.entity,
        reason: n.edge.why || "Connected in the Steepleaf knowledge graph.",
        relation: n.type,
        score: n.edge.weight || 0.5
      });
    });
    // Flavor overlap
    var myFlavors = G.neighbors(teaId, { types: ["has-flavor"] }).map(function (n) {
      return n.entity.id;
    });
    G.list("tea").forEach(function (tea) {
      if (tea.id === teaId) return;
      var theirs = G.neighbors(tea.id, { types: ["has-flavor"] }).map(function (n) {
        return n.entity.id;
      });
      var shared = myFlavors.filter(function (f) {
        return theirs.indexOf(f) !== -1;
      });
      if (shared.length) {
        rows.push({
          entity: tea,
          reason: "Shares flavor notes (" + shared.length + ") with your starting tea.",
          relation: "flavor-overlap",
          score: 0.4 + shared.length * 0.1
        });
      }
    });
    rows = uniqueById(rows).sort(function (a, b) {
      return b.score - a.score;
    });
    return rows.slice(0, opts.limit || 6);
  }

  function discover(lens, seedTeaId) {
    var G = global.WDS.steepleafGraph;
    var typeMap = {
      "more-oxidized": "more-oxidized-than",
      "lighter-roast": "lighter-roast-than",
      sweeter: "sweeter-than",
      "more-floral": "more-floral-than",
      "less-astringent": "less-astringent-than",
      "lower-caffeine": "lower-caffeine-than"
    };
    if (lens === "similar" || lens === "if-i-like-this" || lens === "you-may-enjoy") {
      return similarTo(seedTeaId, { limit: 6 });
    }
    if (typeMap[lens] && seedTeaId) {
      return G.neighbors(seedTeaId, { types: [typeMap[lens]] })
        .filter(function (n) {
          return n.direction === "out" && n.entity.kind === "tea";
        })
        .map(function (n) {
          return {
            entity: n.entity,
            reason: n.edge.why || ("Marked " + lens.replace(/-/g, " ") + " relative to the seed tea."),
            relation: n.type,
            score: n.edge.weight || 0.6
          };
        });
    }
    if (lens === "rare" || lens === "seasonal" || lens === "excellent-value") {
      var tag = lens === "excellent-value" ? "excellent-value" : lens;
      return G.list("tea")
        .filter(function (t) {
          var a = t.attributes || {};
          if (lens === "excellent-value") return a.valueHint === "excellent-value" || a.valueHint === "good-value";
          if (lens === "seasonal") return a.rarity === "seasonal";
          if (lens === "rare") return a.rarity === "rare" || a.rarity === "classic";
          return false;
        })
        .map(function (t) {
          return {
            entity: t,
            reason: "Catalog attribute marks this sample as " + tag.replace(/-/g, " ") + ".",
            relation: "attribute",
            score: 0.55
          };
        });
    }
    if (lens === "spring-greens") {
      return G.list("tea")
        .filter(function (t) {
          var types = G.neighbors(t.id, { types: ["belongs-to"], kind: "tea-type" });
          var seasons = G.neighbors(t.id, { types: ["in-season"] });
          return types.some(function (n) { return /green/i.test(n.entity.name); }) &&
            seasons.some(function (n) { return /spring/i.test(n.entity.name); });
        })
        .map(function (t) {
          return {
            entity: t,
            reason: "Green tea linked to spring harvest season in the sample graph.",
            relation: "seasonal-green",
            score: 0.7
          };
        });
    }
    if (lens === "low-bitterness") {
      return G.list("tea")
        .filter(function (t) {
          var b = (t.attributes || {}).bitterness || "";
          return b === "low" || b === "low-moderate";
        })
        .map(function (t) {
          return {
            entity: t,
            reason: "Sample profile lists bitterness as " + ((t.attributes || {}).bitterness || "low") + ".",
            relation: "attribute",
            score: 0.65
          };
        });
    }
    return [];
  }

  function underPrice(maxUsd, seedTeaId) {
    var Search = global.WDS.steepleafSearch;
    var rows = Search.search("", { kind: "tea", maxPrice: maxUsd });
    return rows
      .filter(function (r) {
        return !seedTeaId || r.entity.id !== seedTeaId;
      })
      .slice(0, 8)
      .map(function (r) {
        var offers = Search.offersFor(r.entity.id).filter(function (o) {
          return o.offer.priceUsd != null && o.offer.priceUsd <= maxUsd;
        });
        var best = offers.sort(function (a, b) {
          return a.offer.priceUsd - b.offer.priceUsd;
        })[0];
        return {
          entity: r.entity,
          reason: best
            ? "Available from " + best.vendor.name + " at $" + best.offer.priceUsd + " / " + best.offer.sizeG + "g (sample offer)."
            : "Matches your price filter in sample vendor data.",
          relation: "sold-by",
          score: 0.6,
          offer: best || null
        };
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.steepleafRecommend = {
    similarTo: similarTo,
    discover: discover,
    underPrice: underPrice
  };
})(window);
