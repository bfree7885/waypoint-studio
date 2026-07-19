/**
 * Steepleaf graph-grounded AI answers (deterministic, educational).
 * Uses the knowledge graph — does not invent vendors, studies, or medical claims.
 */
(function (global) {
  "use strict";

  function unique(teaId) {
    var G = global.WDS.steepleafGraph;
    var tea = G.get(teaId);
    if (!tea) return { answer: "I could not find that tea in the sample graph.", citations: [] };
    var flavors = G.neighbors(teaId, { types: ["has-flavor"] }).map(function (n) { return n.entity.name; });
    var region = G.neighbors(teaId, { types: ["located-in"], kind: "region" })[0] ||
      G.neighbors(teaId, { types: ["located-in"] }).find(function (n) {
        return n.entity.kind === "province" || n.entity.kind === "country";
      });
    var process = G.neighbors(teaId, { types: ["processed-by"] }).map(function (n) { return n.entity.name; });
    var type = G.neighbors(teaId, { types: ["belongs-to"], kind: "tea-type" })[0];
    var bits = [];
    if (type) bits.push("It belongs to " + type.entity.name + ".");
    if (region) bits.push("It is linked to " + region.entity.name + ".");
    if (process.length) bits.push("Processing highlights: " + process.slice(0, 3).join(", ") + ".");
    if (flavors.length) bits.push("Flavor graph notes: " + flavors.slice(0, 4).join(", ") + ".");
    bits.push(tea.summary);
    return {
      answer: bits.join(" "),
      citations: [tea.id].concat(region ? [region.entity.id] : []).concat(type ? [type.entity.id] : []),
      honesty: "demo-graph"
    };
  }

  function different(aId, bId) {
    var G = global.WDS.steepleafGraph;
    var a = G.get(aId);
    var b = G.get(bId);
    if (!a || !b) return { answer: "Both teas must exist in the sample graph.", citations: [] };
    var path = G.path(aId, bId, 5);
    var comps = G.listEdges().filter(function (e) {
      return (e.from === aId && e.to === bId) || (e.from === bId && e.to === aId);
    });
    var lines = [a.name + " vs " + b.name + "."];
    comps.forEach(function (e) {
      if (e.why) lines.push(e.why);
      else lines.push("Linked by relationship: " + e.type + ".");
    });
    if (!comps.length) {
      lines.push("No direct comparison edge — contrasting type, region, and flavor neighbors instead.");
      var at = G.neighbors(aId, { types: ["belongs-to"], kind: "tea-type" })[0];
      var bt = G.neighbors(bId, { types: ["belongs-to"], kind: "tea-type" })[0];
      if (at && bt && at.entity.id !== bt.entity.id) {
        lines.push(a.name + " is " + at.entity.name + "; " + b.name + " is " + bt.entity.name + ".");
      }
    }
    if (path) lines.push("Graph path length: " + (path.length - 1) + " hops.");
    return { answer: lines.join(" "), citations: [aId, bId], honesty: "demo-graph" };
  }

  function answer(question, context) {
    context = context || {};
    var q = String(question || "").toLowerCase();
    var Rec = global.WDS.steepleafRecommend;
    var seed = context.teaId || "stl_tea-longjing-shifeng";

    if (/unique|what makes/.test(q)) return unique(seed);
    if (/different|vs|versus|compare/.test(q)) {
      return different(seed, context.otherTeaId || "stl_tea-tieguanyin-light");
    }
    if (/try next|recommend|you may enjoy|if i like/.test(q)) {
      var sims = Rec.similarTo(seed, { limit: 3 });
      if (!sims.length) return { answer: "No neighbors yet in the sample graph.", citations: [seed] };
      return {
        answer: sims.map(function (s) {
          return s.entity.name + " — " + s.reason;
        }).join(" "),
        citations: [seed].concat(sims.map(function (s) { return s.entity.id; })),
        honesty: "demo-graph"
      };
    }
    if (/under\s*\$?\s*20|under 20|cheap|value/.test(q)) {
      var deals = Rec.underPrice(20, seed);
      if (!deals.length) return { answer: "No sample offers at that price right now.", citations: [] };
      return {
        answer: deals.slice(0, 3).map(function (d) {
          return d.entity.name + " — " + d.reason;
        }).join(" "),
        citations: deals.slice(0, 3).map(function (d) { return d.entity.id; }),
        honesty: "demo-graph"
      };
    }
    if (/bitter|astringen/.test(q)) {
      var low = Rec.discover("low-bitterness");
      return {
        answer: low.slice(0, 3).map(function (d) {
          return d.entity.name + " — " + d.reason;
        }).join(" ") || "No low-bitterness samples matched.",
        citations: low.slice(0, 3).map(function (d) { return d.entity.id; }),
        honesty: "demo-graph"
      };
    }
    if (/spring|green/.test(q)) {
      var gre = Rec.discover("spring-greens");
      return {
        answer: gre.map(function (d) {
          return d.entity.name + " — " + d.reason;
        }).join(" ") || "No spring greens in the sample set.",
        citations: gre.map(function (d) { return d.entity.id; }),
        honesty: "demo-graph"
      };
    }
    if (/floral|sweeter|oxidized|roast|caffeine/.test(q)) {
      var lens = /floral/.test(q) ? "more-floral"
        : /sweet/.test(q) ? "sweeter"
        : /oxid/.test(q) ? "more-oxidized"
        : /roast/.test(q) ? "lighter-roast"
        : "lower-caffeine";
      var found = Rec.discover(lens, seed);
      return {
        answer: found.length
          ? found.map(function (d) { return d.entity.name + " — " + d.reason; }).join(" ")
          : "No comparison edge for that lens from the seed tea.",
        citations: [seed].concat(found.map(function (d) { return d.entity.id; })),
        honesty: "demo-graph"
      };
    }
    return {
      answer: "Ask about uniqueness, differences, what to try next, price under $20, low bitterness, or spring greens. Answers stay grounded in the sample knowledge graph.",
      citations: [],
      honesty: "demo-graph"
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.steepleafAI = {
    answer: answer,
    unique: unique,
    different: different
  };
})(window);
