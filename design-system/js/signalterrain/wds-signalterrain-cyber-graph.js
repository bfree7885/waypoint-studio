/**
 * SignalTerrain Cyber Awareness — relationship graph helpers.
 * Educational traversal only. No scanning, no offense.
 */
(function (global) {
  "use strict";

  function indexEntities(entities) {
    var map = {};
    (entities || []).forEach(function (e) {
      map[e.id] = e;
    });
    return map;
  }

  function indexRels(rels) {
    return rels || [];
  }

  function createGraph(bundle) {
    bundle = bundle || {};
    var entities = bundle.entities || [];
    var relationships = bundle.relationships || [];
    var byId = indexEntities(entities);
    var rels = indexRels(relationships);

    function get(id) {
      return byId[id] || null;
    }

    function neighbors(id, options) {
      options = options || {};
      var out = [];
      rels.forEach(function (r) {
        if (r.from === id) {
          out.push({ edge: r, direction: "out", entity: byId[r.to] || null });
        } else if (r.to === id && options.bidirectional !== false) {
          out.push({ edge: r, direction: "in", entity: byId[r.from] || null });
        }
      });
      if (options.type) {
        out = out.filter(function (n) {
          return n.edge.type === options.type;
        });
      }
      return out;
    }

    /**
     * Breadth-first path search (short educational chains).
     */
    function findPath(fromId, toId, maxDepth) {
      maxDepth = maxDepth == null ? 6 : maxDepth;
      if (!byId[fromId] || !byId[toId]) return null;
      if (fromId === toId) return [fromId];
      var queue = [[fromId]];
      var seen = {};
      seen[fromId] = true;
      while (queue.length) {
        var path = queue.shift();
        if (path.length > maxDepth) continue;
        var last = path[path.length - 1];
        var ns = neighbors(last, { bidirectional: true });
        for (var i = 0; i < ns.length; i++) {
          var next = ns[i].entity && ns[i].entity.id;
          if (!next || seen[next]) continue;
          var nextPath = path.concat([next]);
          if (next === toId) return nextPath;
          seen[next] = true;
          queue.push(nextPath);
        }
      }
      return null;
    }

    /**
     * Canonical educational chain:
     * CVE → software → advisory → patch → exploitation → priority subject
     */
    function traverseAttentionChain(cveId) {
      var cve = get(cveId);
      if (!cve) return { ok: false, reason: "CVE not found" };
      var steps = [{ role: "cve", entity: cve }];
      var soft = neighbors(cveId, { type: "affects" }).filter(function (n) {
        return n.direction === "out";
      })[0];
      if (soft && soft.entity) steps.push({ role: "affected-software", entity: soft.entity });
      var adv = neighbors(cveId, { type: "linked_advisory" })
        .concat(neighbors(cveId, { type: "documented_in" }))
        .filter(function (n) {
          return n.entity && (n.entity.kind === "vendor-advisory" || n.entity.kind === "reference");
        })[0];
      if (adv && adv.entity) steps.push({ role: "advisory", entity: adv.entity });
      var patch = neighbors(cveId, { type: "fixes" })
        .filter(function (n) {
          return n.direction === "in" && n.entity && n.entity.kind === "patch";
        })[0];
      if (patch && patch.entity) steps.push({ role: "patch", entity: patch.entity });
      var exploited = neighbors(cveId, { type: "exploited_in" })[0];
      if (exploited && exploited.entity) {
        steps.push({ role: "known-exploitation", entity: exploited.entity });
      }
      return { ok: true, steps: steps, pathIds: steps.map(function (s) { return s.entity.id; }) };
    }

    function byKind(kind) {
      return entities.filter(function (e) {
        return e.kind === kind;
      });
    }

    function listKinds() {
      var set = {};
      entities.forEach(function (e) {
        set[e.kind] = (set[e.kind] || 0) + 1;
      });
      return set;
    }

    return {
      entities: entities,
      relationships: rels,
      get: get,
      neighbors: neighbors,
      findPath: findPath,
      traverseAttentionChain: traverseAttentionChain,
      byKind: byKind,
      listKinds: listKinds
    };
  }

  function loadBundle(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load cyber bundle (" + r.status + ")");
      return r.json();
    }).then(function (bundle) {
      return { bundle: bundle, graph: createGraph(bundle) };
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberGraph = {
    createGraph: createGraph,
    loadBundle: loadBundle
  };
})(typeof window !== "undefined" ? window : globalThis);
