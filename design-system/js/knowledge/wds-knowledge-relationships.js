/**
 * Waypoint Knowledge Platform — relationships graph
 */
(function (global) {
  "use strict";

  var graphCache = null;
  var config = { base: "knowledge/" };

  function configure(options) {
    options = options || {};
    if (options.base) config.base = String(options.base).replace(/\/?$/, "/");
  }

  function ingest(data) {
    graphCache = data || { edges: [] };
    return graphCache;
  }

  function load() {
    if (graphCache) return Promise.resolve(graphCache);
    return fetch(config.base + "relationships.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Knowledge relationships missing");
        return res.json();
      })
      .then(function (data) {
        graphCache = data;
        return data;
      });
  }

  function edgesFor(id, options) {
    options = options || {};
    return load().then(function (graph) {
      return (graph.edges || []).filter(function (e) {
        if (options.type && e.type !== options.type) return false;
        if (options.direction === "out") return e.from === id;
        if (options.direction === "in") return e.to === id;
        return e.from === id || e.to === id;
      });
    });
  }

  /**
   * Walk neighborhood around an id (1 hop by default).
   */
  function related(id, options) {
    options = options || {};
    var depth = options.depth != null ? options.depth : 1;
    var K = global.WDS && global.WDS.knowledge;

    return edgesFor(id, options).then(function (edges) {
      var neighborIds = {};
      edges.forEach(function (e) {
        if (e.from !== id) neighborIds[e.from] = true;
        if (e.to !== id) neighborIds[e.to] = true;
      });

      var ids = Object.keys(neighborIds);
      var loadNeighbors = K
        ? Promise.all(ids.map(function (nid) { return K.get(nid); }))
        : Promise.resolve(ids.map(function (nid) { return { id: nid }; }));

      return loadNeighbors.then(function (neighbors) {
        var byId = {};
        neighbors.forEach(function (n) {
          if (n) byId[n.id] = n;
        });
        return {
          id: id,
          depth: depth,
          edges: edges,
          neighbors: ids.map(function (nid) {
            return {
              id: nid,
              entry: byId[nid] || null,
              via: edges.filter(function (e) {
                return e.from === nid || e.to === nid;
              })
            };
          })
        };
      });
    });
  }

  /**
   * Trace a path demonstrating ecology chains (BFS, short).
   */
  function path(fromId, toId, options) {
    options = options || {};
    var maxDepth = options.maxDepth != null ? options.maxDepth : 4;
    return load().then(function (graph) {
      var edges = graph.edges || [];
      var queue = [{ id: fromId, path: [fromId], edgePath: [] }];
      var seen = {};
      seen[fromId] = true;

      while (queue.length) {
        var cur = queue.shift();
        if (cur.id === toId) {
          return { found: true, nodes: cur.path, edges: cur.edgePath };
        }
        if (cur.path.length > maxDepth) continue;
        edges.forEach(function (e) {
          var next = null;
          if (e.from === cur.id) next = e.to;
          else if (e.to === cur.id && options.undirected !== false) next = e.from;
          if (!next || seen[next]) return;
          seen[next] = true;
          queue.push({
            id: next,
            path: cur.path.concat([next]),
            edgePath: cur.edgePath.concat([e])
          });
        });
      }
      return { found: false, nodes: [], edges: [] };
    });
  }

  function attach() {
    global.WDS = global.WDS || {};
    global.WDS.knowledgeRelationships = {
      configure: configure,
      ingest: ingest,
      load: load,
      edgesFor: edgesFor,
      related: related,
      path: path
    };
    if (global.WDS.knowledge) {
      global.WDS.knowledge.related = related;
      global.WDS.knowledge.path = path;
    }
  }

  attach();
})(typeof window !== "undefined" ? window : global);
