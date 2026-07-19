/**
 * Steepleaf Knowledge Graph — load, index, neighbors, path helpers.
 * Educational samples only. No social graph. No marketplace checkout.
 */
(function (global) {
  "use strict";

  var graph = null;
  var byId = {};
  var typeAliases = {};
  var kindsIndex = {};

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function indexGraph(g) {
    byId = {};
    (g.entities || []).forEach(function (e) {
      byId[e.id] = e;
    });
    graph = g;
    return g;
  }

  function loadJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Could not load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function load(opts) {
    opts = opts || {};
    var base = opts.base || "../../design-system/steepleaf/";
    return Promise.all([
      loadJson(base + "samples/demo-graph.json"),
      loadJson(base + "relationship-types.json").catch(function () {
        return { types: [], aliases: {} };
      }),
      loadJson(base + "entity-kinds.json").catch(function () {
        return { kinds: [] };
      })
    ]).then(function (parts) {
      typeAliases = parts[1].aliases || {};
      kindsIndex = {};
      (parts[2].kinds || []).forEach(function (k) {
        kindsIndex[k.id] = k;
      });
      return indexGraph(parts[0]);
    });
  }

  function resolveType(type) {
    return typeAliases[type] || type;
  }

  function get(id) {
    return byId[id] || null;
  }

  function list(kind) {
    var all = (graph && graph.entities) || [];
    if (!kind) return all.slice();
    return all.filter(function (e) {
      return e.kind === kind;
    });
  }

  function listEdges() {
    return (graph && graph.edges) || [];
  }

  function neighbors(id, opts) {
    opts = opts || {};
    var typeFilter = opts.types && opts.types.length ? opts.types.map(resolveType) : null;
    var out = [];
    listEdges().forEach(function (edge) {
      var typ = resolveType(edge.type);
      if (typeFilter && typeFilter.indexOf(typ) === -1) return;
      var other = null;
      var direction = null;
      if (edge.from === id) {
        other = edge.to;
        direction = "out";
      } else if (edge.to === id) {
        other = edge.from;
        direction = "in";
      } else return;
      var entity = byId[other];
      if (!entity) return;
      if (opts.kind && entity.kind !== opts.kind) return;
      out.push({ edge: edge, entity: entity, direction: direction, type: typ });
    });
    out.sort(function (a, b) {
      return (b.edge.weight || 0) - (a.edge.weight || 0);
    });
    return out;
  }

  function path(fromId, toId, maxDepth) {
    maxDepth = maxDepth || 4;
    if (fromId === toId) return [fromId];
    var queue = [[fromId]];
    var seen = {};
    seen[fromId] = true;
    while (queue.length) {
      var cur = queue.shift();
      if (cur.length > maxDepth) continue;
      var last = cur[cur.length - 1];
      var neigh = neighbors(last);
      for (var i = 0; i < neigh.length; i++) {
        var nid = neigh[i].entity.id;
        if (seen[nid]) continue;
        var next = cur.concat([nid]);
        if (nid === toId) return next;
        seen[nid] = true;
        queue.push(next);
      }
    }
    return null;
  }

  function honesty() {
    return (graph && graph.meta) || { honesty: "demo", status: "sample" };
  }

  global.WDS = global.WDS || {};
  global.WDS.steepleafGraph = {
    load: load,
    get: get,
    list: list,
    listEdges: listEdges,
    neighbors: neighbors,
    path: path,
    resolveType: resolveType,
    honesty: honesty,
    kindsIndex: function () {
      return kindsIndex;
    },
    esc: esc,
    _indexGraph: indexGraph
  };
})(window);
