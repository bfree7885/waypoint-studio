/**
 * Steepleaf fielded search over the knowledge graph.
 */
(function (global) {
  "use strict";

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function offersFor(teaId) {
    var G = global.WDS && global.WDS.steepleafGraph;
    if (!G) return [];
    return G.neighbors(teaId, { types: ["sold-by"] }).map(function (n) {
      return {
        vendor: n.entity,
        offer: n.edge.attributes || {},
        why: n.edge.why
      };
    });
  }

  function matchesFilters(entity, f) {
    f = f || {};
    if (f.kind && f.kind !== "any" && entity.kind !== f.kind) return false;
    if (f.teaType && entity.kind === "tea") {
      var G = global.WDS.steepleafGraph;
      var types = G.neighbors(entity.id, { types: ["belongs-to"], kind: "tea-type" });
      if (!types.some(function (n) { return n.entity.id === f.teaType || n.entity.name === f.teaType; }))
        return false;
    }
    if (f.country || f.region || f.estate || f.producer || f.cultivar) {
      var G2 = global.WDS.steepleafGraph;
      var place = G2.neighbors(entity.id);
      var ids = place.map(function (n) { return n.entity.id; });
      var names = place.map(function (n) { return norm(n.entity.name); });
      function hit(val, kindHint) {
        if (!val || val === "any") return true;
        var v = norm(val);
        return ids.indexOf(val) !== -1 || names.indexOf(v) !== -1 ||
          place.some(function (n) {
            return (!kindHint || n.entity.kind === kindHint) &&
              (n.entity.id === val || norm(n.entity.name).indexOf(v) !== -1);
          });
      }
      if (!hit(f.country, "country")) return false;
      if (!hit(f.region, "region") && !hit(f.region, "province")) return false;
      if (!hit(f.estate, "estate") && !hit(f.estate, "garden")) return false;
      if (!hit(f.producer, "producer")) return false;
      if (!hit(f.cultivar, "cultivar")) return false;
    }
    if (f.flavor && f.flavor !== "any") {
      var fl = global.WDS.steepleafGraph.neighbors(entity.id, { types: ["has-flavor"] });
      var fv = norm(f.flavor);
      if (!fl.some(function (n) {
        return n.entity.id === f.flavor || norm(n.entity.name).indexOf(fv) !== -1 ||
          (n.entity.tags || []).some(function (t) { return norm(t) === fv; });
      })) return false;
    }
    if (f.processing && f.processing !== "any") {
      var pr = global.WDS.steepleafGraph.neighbors(entity.id, { types: ["processed-by"] });
      var pv = norm(f.processing);
      if (!pr.some(function (n) {
        return n.entity.id === f.processing || norm(n.entity.name).indexOf(pv) !== -1;
      })) return false;
    }
    if (f.brewing && f.brewing !== "any") {
      var br = global.WDS.steepleafGraph.neighbors(entity.id, { types: ["best-brewed-using"] });
      var bv = norm(f.brewing);
      if (!br.some(function (n) {
        return n.entity.id === f.brewing || norm(n.entity.name).indexOf(bv) !== -1;
      })) return false;
    }
    if (f.health && f.health !== "any") {
      var ht = global.WDS.steepleafGraph.neighbors(entity.id, { types: ["related-health"] });
      var hv = norm(f.health);
      if (!ht.some(function (n) {
        return norm(n.entity.name).indexOf(hv) !== -1;
      })) return false;
    }
    if (f.history && f.history !== "any") {
      var hi = global.WDS.steepleafGraph.neighbors(entity.id, { types: ["related-history", "part-of-tradition"] });
      var hiv = norm(f.history);
      if (!hi.some(function (n) {
        return norm(n.entity.name + " " + n.entity.summary).indexOf(hiv) !== -1;
      })) return false;
    }
    if (entity.kind === "tea" && (f.maxPrice != null || f.availability || f.vendor)) {
      var offers = offersFor(entity.id);
      if (f.vendor && f.vendor !== "any") {
        offers = offers.filter(function (o) {
          return o.vendor.id === f.vendor || norm(o.vendor.name).indexOf(norm(f.vendor)) !== -1;
        });
      }
      if (f.availability && f.availability !== "any") {
        offers = offers.filter(function (o) {
          return (o.offer.availability || "") === f.availability;
        });
      }
      if (f.maxPrice != null && f.maxPrice !== "") {
        var max = Number(f.maxPrice);
        offers = offers.filter(function (o) {
          return o.offer.priceUsd != null && o.offer.priceUsd <= max;
        });
      }
      if (!offers.length) return false;
    }
    if (f.tag) {
      var tags = entity.tags || [];
      if (tags.indexOf(f.tag) === -1 && norm(entity.searchText || "").indexOf(norm(f.tag)) === -1)
        return false;
    }
    return true;
  }

  function scoreText(entity, q) {
    if (!q) return 1;
    var blob = norm(
      [entity.name, (entity.aka || []).join(" "), entity.summary, entity.searchText, (entity.tags || []).join(" ")].join(" ")
    );
    var terms = q.split(/\s+/).filter(Boolean);
    var score = 0;
    terms.forEach(function (t) {
      if (norm(entity.name).indexOf(t) !== -1) score += 8;
      else if (blob.indexOf(t) !== -1) score += 3;
    });
    return score;
  }

  function search(query, filters) {
    var G = global.WDS && global.WDS.steepleafGraph;
    if (!G) return [];
    var q = norm(query);
    var f = filters || {};
    var pool = G.list(f.kind && f.kind !== "any" ? f.kind : null);
    return pool
      .map(function (e) {
        return { entity: e, textScore: scoreText(e, q) };
      })
      .filter(function (row) {
        if (q && row.textScore <= 0) return false;
        return matchesFilters(row.entity, f);
      })
      .sort(function (a, b) {
        return b.textScore - a.textScore || a.entity.name.localeCompare(b.entity.name);
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.steepleafSearch = {
    search: search,
    matchesFilters: matchesFilters,
    offersFor: offersFor
  };
})(window);
