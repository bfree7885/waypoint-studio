/**
 * Waypoint University — graph index, neighborhood expansion, readable SVG layout.
 */
(function (global) {
  "use strict";

  function Schema() {
    return global.WU && global.WU.Schema;
  }

  function Md() {
    return global.WU && global.WU.Markdown;
  }

  function esc(s) {
    return Md() ? Md().esc(s) : String(s == null ? "" : s);
  }

  /**
   * Build adjacency for O(1) neighbor lookups.
   * adj[id] = [{ otherId, edgeId, type, outbound }]
   */
  function buildIndex(nodes, edges) {
    var nodeMap = Object.create(null);
    var byTag = Object.create(null);
    var byProject = Object.create(null);
    (nodes || []).forEach(function (n) {
      if (n && n.id) nodeMap[n.id] = n;
    });
    var adj = Object.create(null);
    Object.keys(nodeMap).forEach(function (id) {
      adj[id] = [];
      var n = nodeMap[id];
      (n.tags || []).forEach(function (tag) {
        if (!byTag[tag]) byTag[tag] = [];
        byTag[tag].push(id);
      });
      (n.projects || []).forEach(function (p) {
        if (!byProject[p]) byProject[p] = [];
        byProject[p].push(id);
      });
    });
    var edgeList = [];
    (edges || []).forEach(function (e) {
      if (!e || !e.fromId || !e.toId) return;
      if (!nodeMap[e.fromId] || !nodeMap[e.toId]) {
        edgeList.push(Object.assign({}, e, { broken: true }));
        return;
      }
      edgeList.push(e);
      if (!adj[e.fromId]) adj[e.fromId] = [];
      if (!adj[e.toId]) adj[e.toId] = [];
      adj[e.fromId].push({ otherId: e.toId, edgeId: e.id, type: e.type, outbound: true });
      adj[e.toId].push({ otherId: e.fromId, edgeId: e.id, type: e.type, outbound: false });
    });
    return {
      nodeMap: nodeMap,
      adj: adj,
      edges: edgeList,
      byTag: byTag,
      byProject: byProject,
      nodeCount: Object.keys(nodeMap).length
    };
  }

  function degree(index, id) {
    return (index.adj[id] || []).length;
  }

  /**
   * BFS neighborhood with optional type filter and depth/size caps.
   */
  function neighborhood(index, focusId, opts) {
    opts = opts || {};
    var depth = opts.depth != null ? opts.depth : 2;
    var maxNodes = opts.maxNodes != null ? opts.maxNodes : 36;
    var allow = null;
    if (opts.types) {
      allow = Object.create(null);
      if (Array.isArray(opts.types)) {
        opts.types.forEach(function (t) {
          allow[t] = true;
        });
      } else {
        Object.keys(opts.types).forEach(function (t) {
          if (opts.types[t]) allow[t] = true;
        });
      }
    }

    var nodes = [];
    var links = [];
    var seen = Object.create(null);
    var linkSeen = Object.create(null);
    if (!index.nodeMap[focusId]) {
      return { nodes: nodes, links: links, focusId: focusId, truncated: false };
    }

    var queue = [{ id: focusId, d: 0 }];
    seen[focusId] = 0;
    nodes.push({ id: focusId, depth: 0, node: index.nodeMap[focusId] });

    while (queue.length && nodes.length < maxNodes) {
      var cur = queue.shift();
      if (cur.d >= depth) continue;
      var neigh = index.adj[cur.id] || [];
      for (var i = 0; i < neigh.length; i++) {
        var n = neigh[i];
        if (allow && !allow[n.type]) continue;
        var lk = n.edgeId;
        if (!linkSeen[lk]) {
          linkSeen[lk] = true;
          links.push({
            id: n.edgeId,
            source: n.outbound ? cur.id : n.otherId,
            target: n.outbound ? n.otherId : cur.id,
            type: n.type,
            outboundFromFocusHop: n.outbound
          });
        }
        if (seen[n.otherId] == null) {
          if (nodes.length >= maxNodes) continue;
          seen[n.otherId] = cur.d + 1;
          nodes.push({
            id: n.otherId,
            depth: cur.d + 1,
            node: index.nodeMap[n.otherId]
          });
          queue.push({ id: n.otherId, d: cur.d + 1 });
        }
      }
    }

    // Keep links only between visible nodes
    var vis = Object.create(null);
    nodes.forEach(function (n) {
      vis[n.id] = true;
    });
    links = links.filter(function (l) {
      return vis[l.source] && vis[l.target];
    });

    return {
      nodes: nodes,
      links: links,
      focusId: focusId,
      truncated: Object.keys(seen).length >= maxNodes
    };
  }

  /**
   * Deterministic radial layout — focus center, rings by depth.
   * Readable over force-directed chaos for study.
   */
  function layout(neighborhood, width, height) {
    width = width || 720;
    height = height || 480;
    var cx = width / 2;
    var cy = height / 2;
    var pos = Object.create(null);
    var byDepth = {};
    neighborhood.nodes.forEach(function (n) {
      if (!byDepth[n.depth]) byDepth[n.depth] = [];
      byDepth[n.depth].push(n);
    });

    Object.keys(byDepth).forEach(function (dStr) {
      var d = Number(dStr);
      var ring = byDepth[d];
      if (d === 0) {
        pos[ring[0].id] = { x: cx, y: cy };
        return;
      }
      var radius = Math.min(width, height) * (0.18 + d * 0.22);
      ring.forEach(function (n, i) {
        var angle = (Math.PI * 2 * i) / ring.length - Math.PI / 2;
        pos[n.id] = {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius
        };
      });
    });

    return { positions: pos, width: width, height: height };
  }

  function groupColor(type) {
    var meta = Schema().relationMeta(type);
    var g = (meta && meta.group) || "related";
    var map = {
      related: "#5c6560",
      structure: "#2f5c48",
      application: "#3d5a80",
      evidence: "#6b5b3e",
      citation: "#4a5568",
      inquiry: "#6b4f7a",
      tension: "#7a3e3e"
    };
    return map[g] || "#5c6560";
  }

  function renderSvg(neighborhood, layoutResult, opts) {
    opts = opts || {};
    var w = layoutResult.width;
    var h = layoutResult.height;
    var pos = layoutResult.positions;
    var focusId = neighborhood.focusId;
    var parts = [];
    parts.push(
      '<svg class="wu-graph-svg" viewBox="0 0 ' +
        w +
        " " +
        h +
        '" width="100%" height="' +
        Math.min(h, 520) +
        '" role="img" aria-label="Knowledge neighborhood graph">'
    );
    parts.push('<rect width="100%" height="100%" fill="#fafbfa"/>');

    neighborhood.links.forEach(function (l) {
      var a = pos[l.source];
      var b = pos[l.target];
      if (!a || !b) return;
      parts.push(
        '<line x1="' +
          a.x.toFixed(1) +
          '" y1="' +
          a.y.toFixed(1) +
          '" x2="' +
          b.x.toFixed(1) +
          '" y2="' +
          b.y.toFixed(1) +
          '" stroke="' +
          groupColor(l.type) +
          '" stroke-opacity="0.45" stroke-width="1.5">' +
          "<title>" +
          esc(Schema().relationLabel(l.type)) +
          "</title></line>"
      );
    });

    neighborhood.nodes.forEach(function (n) {
      var p = pos[n.id];
      if (!p) return;
      var isFocus = n.id === focusId;
      var r = isFocus ? 14 : n.depth === 1 ? 10 : 7;
      var title = (n.node && n.node.title) || n.id;
      var short =
        title.length > 22 ? title.slice(0, 20) + "…" : title;
      parts.push(
        '<g class="wu-graph-node" data-id="' +
          esc(n.id) +
          '" style="cursor:pointer">' +
          '<circle cx="' +
          p.x.toFixed(1) +
          '" cy="' +
          p.y.toFixed(1) +
          '" r="' +
          r +
          '" fill="' +
          (isFocus ? "#2f5c48" : "#ffffff") +
          '" stroke="' +
          (isFocus ? "#2f5c48" : "#9aab9f") +
          '" stroke-width="2"/>' +
          '<text x="' +
          p.x.toFixed(1) +
          '" y="' +
          (p.y + r + 14).toFixed(1) +
          '" text-anchor="middle" font-size="11" fill="#1c1f1d" font-family="IBM Plex Sans, sans-serif">' +
          esc(short) +
          "</text>" +
          "<title>" +
          esc(title) +
          " (" +
          esc(Schema().kindLabel(n.node && n.node.kind)) +
          ")</title></g>"
      );
    });

    parts.push("</svg>");
    if (neighborhood.truncated) {
      parts.push(
        '<p class="wu-meta">Showing a readable neighborhood (capped). Expand depth or jump to a node to explore further.</p>'
      );
    }
    return parts.join("");
  }

  /** Top connected topics by degree */
  function frequentlyConnected(index, limit) {
    limit = limit || 8;
    return Object.keys(index.nodeMap)
      .map(function (id) {
        return { id: id, node: index.nodeMap[id], degree: degree(index, id) };
      })
      .filter(function (x) {
        return x.degree > 0 && x.node.kind !== "path";
      })
      .sort(function (a, b) {
        return b.degree - a.degree;
      })
      .slice(0, limit);
  }

  /** Recently created edges with node titles */
  function recentConnections(index, limit) {
    limit = limit || 8;
    return (index.edges || [])
      .filter(function (e) {
        return !e.broken;
      })
      .slice()
      .sort(function (a, b) {
        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      })
      .slice(0, limit)
      .map(function (e) {
        return {
          edge: e,
          from: index.nodeMap[e.fromId],
          to: index.nodeMap[e.toId]
        };
      });
  }

  global.WU = global.WU || {};
  global.WU.Graph = {
    buildIndex: buildIndex,
    degree: degree,
    neighborhood: neighborhood,
    layout: layout,
    renderSvg: renderSvg,
    frequentlyConnected: frequentlyConnected,
    recentConnections: recentConnections,
    groupColor: groupColor
  };
})(typeof window !== "undefined" ? window : globalThis);
