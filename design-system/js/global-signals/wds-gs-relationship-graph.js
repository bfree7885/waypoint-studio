/**
 * Global Signals Relationship Graph — primary expand-on-click graph.
 * Radial-from-focus (desktop) + stacked expand panels (mobile).
 * No force-directed layout. No AI-invented edges. Sample/demo labeled.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var CONFIDENCE_ALLOWED = ["Observed", "High", "Medium", "Low", "Unknown"];
  var HORIZON_ALLOWED = ["Immediate", "Days", "Weeks", "Months", "Long-term"];
  var TYPE_LABELS = {
    country: "Country",
    industry: "Industry",
    commodity: "Commodity",
    port: "Port",
    company: "Company",
    conflict: "Conflict",
    tariff: "Tariff",
    policy: "Policy",
    weather: "Weather Event",
    citizen_impact: "Citizen Impact"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeConfidence(value, opts) {
    opts = opts || {};
    if (value == null || value === "") return "Unknown";
    var lower = String(value).trim().toLowerCase();
    if (lower === "moderate") return "Medium";
    if (lower === "speculative") return "Low";
    var mapped = {
      observed: "Observed",
      high: "High",
      medium: "Medium",
      low: "Low",
      unknown: "Unknown"
    };
    var out = mapped[lower];
    if (!out) return "Unknown";
    if (opts.predicted && out === "Observed") return "Unknown";
    return out;
  }

  function normalizeTimeHorizon(value) {
    if (value == null || value === "") return "Unknown";
    var lower = String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");
    if (lower === "long term") return "Long-term";
    var mapped = {
      immediate: "Immediate",
      days: "Days",
      day: "Days",
      weeks: "Weeks",
      week: "Weeks",
      months: "Months",
      month: "Months",
      "long-term": "Long-term",
      longterm: "Long-term"
    };
    return mapped[lower] || "Unknown";
  }

  function isSafeHttpUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
      var u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function typeLabel(type) {
    var key = String(type || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_");
    if (key === "weather_event") key = "weather";
    if (key === "citizenimpact") key = "citizen_impact";
    return TYPE_LABELS[key] || (key ? key : "Unknown");
  }

  function normalizeEvidence(raw) {
    if (!raw || typeof raw !== "object") {
      return {
        kind: "unavailable",
        label: "Evidence unavailable",
        url: null,
        notes: ""
      };
    }
    var kind = String(raw.kind || raw.mode || "sample-demo").trim() || "sample-demo";
    return {
      kind: kind,
      label: String(raw.label || raw.title || "").trim() || "Evidence label unavailable",
      url: raw.url || null,
      notes: String(raw.notes || "").trim()
    };
  }

  function normalizeNode(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    if (!id) return null;
    var type = String(raw.type || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_");
    if (type === "weather_event") type = "weather";
    if (type === "citizenimpact") type = "citizen_impact";
    return {
      id: id,
      type: type || "unknown",
      label: String(raw.label || "").trim() || "Untitled node",
      summary: String(raw.summary || "").trim(),
      focusable: raw.focusable !== false,
      sources: Array.isArray(raw.sources) ? raw.sources.slice() : []
    };
  }

  function normalizeEdge(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var from = String(raw.from || "").trim();
    var to = String(raw.to || "").trim();
    if (!id || !from || !to) return null;
    return {
      id: id,
      from: from,
      to: to,
      relationType: String(raw.relationType || raw.type || "affects").trim() || "affects",
      why: String(raw.why || raw.explanation || "").trim(),
      confidence: normalizeConfidence(raw.confidence, { predicted: true }),
      timeHorizon: normalizeTimeHorizon(raw.timeHorizon || raw.timeframe || raw.horizon),
      evidence: normalizeEvidence(raw.evidence || raw.sources),
      sources: Array.isArray(raw.sources) ? raw.sources.slice() : []
    };
  }

  function normalizeBundle(data) {
    data = data || {};
    var nodes = (data.nodes || data.entities || []).map(normalizeNode).filter(Boolean);
    var edges = (data.edges || data.relationships || []).map(normalizeEdge).filter(Boolean);
    var byId = {};
    nodes.forEach(function (n) {
      byId[n.id] = n;
    });
    var edgeById = {};
    var adj = {};
    nodes.forEach(function (n) {
      adj[n.id] = [];
    });
    edges.forEach(function (e) {
      edgeById[e.id] = e;
      if (!adj[e.from]) adj[e.from] = [];
      if (!adj[e.to]) adj[e.to] = [];
      adj[e.from].push({ edgeId: e.id, neighborId: e.to, direction: "out" });
      adj[e.to].push({ edgeId: e.id, neighborId: e.from, direction: "in" });
    });
    return {
      version: data.version || null,
      mode: data.mode || null,
      modeLabel: data.modeLabel || null,
      honesty: data.honesty || null,
      layout: data.layout || { approach: "radial-from-focus", forceDirected: false },
      entityTypes: data.entityTypes || Object.keys(TYPE_LABELS),
      defaultFocusId: data.defaultFocusId || null,
      focusSeeds: Array.isArray(data.focusSeeds) ? data.focusSeeds.slice() : [],
      sourceDatasets: data.sourceDatasets || [],
      nodes: nodes,
      edges: edges,
      nodeById: byId,
      edgeById: edgeById,
      adjacency: adj
    };
  }

  function neighborsOf(bundle, nodeId, typeFilter) {
    if (!bundle || !nodeId) return [];
    var list = bundle.adjacency[nodeId] || [];
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var key = item.neighborId + "|" + item.edgeId;
      if (seen[key]) continue;
      seen[key] = true;
      var node = bundle.nodeById[item.neighborId];
      var edge = bundle.edgeById[item.edgeId];
      if (!node || !edge) continue;
      if (typeFilter && typeFilter !== "all" && node.type !== typeFilter) continue;
      out.push({ node: node, edge: edge, direction: item.direction });
    }
    out.sort(function (a, b) {
      return a.node.label.localeCompare(b.node.label);
    });
    return out;
  }

  function queryFocus() {
    try {
      return new URLSearchParams(global.location.search).get("focus");
    } catch (e) {
      return null;
    }
  }

  function setQueryFocus(id) {
    try {
      var url = new URL(global.location.href);
      if (id) url.searchParams.set("focus", id);
      else url.searchParams.delete("focus");
      global.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function renderBanner(data) {
    if (!data) return "";
    var label = data.modeLabel || "Sample / demo dataset";
    var honesty =
      (data.honesty && data.honesty.banner) ||
      "Sample / demo relationship graph — curated edges only.";
    return (
      '<div class="gsg-banner" role="status">' +
      '<p class="gsg-badge">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(honesty) +
      "</p>" +
      '<p class="gsg-note">Layout: radial-from-focus · not force-directed · expand on demand</p>' +
      "</div>"
    );
  }

  function renderEvidence(ev) {
    if (!ev) {
      return '<p class="gsg-evidence">Evidence unavailable</p>';
    }
    var link = "";
    if (isSafeHttpUrl(ev.url)) {
      link =
        ' <a href="' +
        esc(ev.url) +
        '" rel="noopener noreferrer" target="_blank">' +
        esc(ev.label) +
        "</a>";
    } else {
      link = " " + esc(ev.label);
    }
    var kind =
      ev.kind === "sample-demo"
        ? "Sample / demo"
        : ev.kind === "curated-baseline"
          ? "Curated baseline"
          : ev.kind === "unavailable"
            ? "Unavailable"
            : esc(ev.kind);
    return (
      '<p class="gsg-evidence"><span class="gsg-badge gsg-badge--evidence">' +
      kind +
      "</span>" +
      link +
      (ev.notes ? " · " + esc(ev.notes) : "") +
      "</p>"
    );
  }

  function renderEdgeFacets(edge) {
    var why = edge.why || "Why unavailable for this relationship.";
    return (
      '<dl class="gsg-edge__facets">' +
      "<div><dt>Why connected</dt><dd>" +
      esc(why) +
      "</dd></div>" +
      '<div><dt>Confidence</dt><dd><span class="gsg-badge gsg-badge--confidence" data-confidence="' +
      esc(edge.confidence) +
      '">' +
      esc(edge.confidence) +
      "</span></dd></div>" +
      "<div><dt>Time horizon</dt><dd><span class=\"gsg-badge\">" +
      esc(edge.timeHorizon) +
      "</span></dd></div>" +
      "<div><dt>Evidence</dt><dd>" +
      renderEvidence(edge.evidence) +
      "</dd></div>" +
      "</dl>"
    );
  }

  function seedOptions(bundle, typeFilter) {
    var seeds = (bundle.focusSeeds || []).filter(function (id) {
      return bundle.nodeById[id];
    });
    if (!seeds.length) {
      seeds = bundle.nodes
        .filter(function (n) {
          return n.focusable;
        })
        .map(function (n) {
          return n.id;
        })
        .slice(0, 24);
    }
    return seeds
      .map(function (id) {
        return bundle.nodeById[id];
      })
      .filter(function (n) {
        if (!n) return false;
        if (typeFilter && typeFilter !== "all" && n.type !== typeFilter) return false;
        return true;
      });
  }

  function renderPicker(bundle, state) {
    var types = ["all"].concat(
      (bundle.entityTypes || Object.keys(TYPE_LABELS)).filter(function (t) {
        return TYPE_LABELS[t];
      })
    );
    var typeOptions = types
      .map(function (t) {
        var label = t === "all" ? "All types" : typeLabel(t);
        return (
          '<option value="' +
          esc(t) +
          '"' +
          (t === state.typeFilter ? " selected" : "") +
          ">" +
          esc(label) +
          "</option>"
        );
      })
      .join("");

    var seeds = seedOptions(bundle, state.typeFilter);
    var entityOptions =
      '<option value="">' +
      (seeds.length ? "Choose a focus node…" : "No focus seeds for this filter") +
      "</option>" +
      seeds
        .map(function (n) {
          return (
            '<option value="' +
            esc(n.id) +
            '"' +
            (n.id === state.focusId ? " selected" : "") +
            ">" +
            esc(n.label) +
            " · " +
            esc(typeLabel(n.type)) +
            "</option>"
          );
        })
        .join("");

    var chips = seeds
      .slice(0, 16)
      .map(function (n) {
        var current = n.id === state.focusId;
        return (
          '<li><button type="button" class="gsg-chip' +
          (current ? " gsg-chip--active" : "") +
          '" data-gsg-focus="' +
          esc(n.id) +
          '" aria-pressed="' +
          (current ? "true" : "false") +
          '">' +
          esc(n.label) +
          '<span class="gsg-chip__type">' +
          esc(typeLabel(n.type)) +
          "</span></button></li>"
        );
      })
      .join("");

    return (
      '<section class="gsg-picker" aria-label="Focus node picker">' +
      '<div class="gsg-picker__controls">' +
      '<label class="gsg-field"><span>Node type</span>' +
      '<select data-gsg-type>' +
      typeOptions +
      "</select></label>" +
      '<label class="gsg-field"><span>Focus</span>' +
      '<select data-gsg-focus-select>' +
      entityOptions +
      "</select></label>" +
      "</div>" +
      '<ul class="gsg-chip-list" role="list">' +
      (chips || '<li class="gsg-empty-inline">No focus seeds for this type.</li>') +
      "</ul></section>"
    );
  }

  function visibleGraph(bundle, state) {
    var focusId = state.focusId;
    var expanded = state.expandedIds || {};
    var visibleNodes = {};
    var visibleEdges = {};
    if (!focusId || !bundle.nodeById[focusId]) {
      return { nodes: [], edges: [], positions: {} };
    }
    visibleNodes[focusId] = bundle.nodeById[focusId];

    function reveal(nodeId) {
      var nbrs = neighborsOf(bundle, nodeId, null);
      for (var i = 0; i < nbrs.length; i++) {
        var n = nbrs[i];
        if (state.typeFilter && state.typeFilter !== "all" && n.node.type !== state.typeFilter) {
          // still allow edges to non-matching if already visible; skip new
          continue;
        }
        visibleNodes[n.node.id] = n.node;
        visibleEdges[n.edge.id] = n.edge;
      }
    }

    // Always reveal focus neighbors (first hop)
    reveal(focusId);
    Object.keys(expanded).forEach(function (id) {
      if (expanded[id] && bundle.nodeById[id]) reveal(id);
    });

    // Radial positions: focus center; others on rings by BFS depth from focus
    var depth = {};
    depth[focusId] = 0;
    var queue = [focusId];
    while (queue.length) {
      var cur = queue.shift();
      var links = neighborsOf(bundle, cur, null);
      for (var j = 0; j < links.length; j++) {
        var nid = links[j].node.id;
        if (!visibleNodes[nid]) continue;
        if (depth[nid] == null) {
          depth[nid] = depth[cur] + 1;
          queue.push(nid);
        }
      }
    }

    var byDepth = {};
    Object.keys(visibleNodes).forEach(function (id) {
      var d = depth[id] == null ? 1 : depth[id];
      if (!byDepth[d]) byDepth[d] = [];
      byDepth[d].push(id);
    });

    var positions = {};
    var cx = 320;
    var cy = 280;
    positions[focusId] = { x: cx, y: cy, depth: 0 };
    Object.keys(byDepth).forEach(function (dStr) {
      var d = Number(dStr);
      if (d === 0) return;
      var ids = byDepth[d].slice().sort();
      var radius = 110 + (d - 1) * 95;
      for (var k = 0; k < ids.length; k++) {
        var angle = -Math.PI / 2 + (2 * Math.PI * k) / Math.max(ids.length, 1);
        // slight ring stagger for readability when many nodes
        if (ids.length > 10) {
          angle += (d % 2 === 0 ? 0.08 : -0.08);
        }
        positions[ids[k]] = {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          depth: d
        };
      }
    });

    return {
      nodes: Object.keys(visibleNodes).map(function (id) {
        return visibleNodes[id];
      }),
      edges: Object.keys(visibleEdges).map(function (id) {
        return visibleEdges[id];
      }),
      positions: positions,
      depth: depth
    };
  }

  function renderSvg(bundle, state) {
    var vg = visibleGraph(bundle, state);
    if (!state.focusId) return "";
    var edgeLines = vg.edges
      .map(function (e) {
        var a = vg.positions[e.from];
        var b = vg.positions[e.to];
        if (!a || !b) return "";
        var selected = state.selectedEdgeId === e.id;
        return (
          '<g class="gsg-svg-edge' +
          (selected ? " gsg-svg-edge--selected" : "") +
          '" data-gsg-edge="' +
          esc(e.id) +
          '">' +
          '<line x1="' +
          a.x +
          '" y1="' +
          a.y +
          '" x2="' +
          b.x +
          '" y2="' +
          b.y +
          '" />' +
          '<circle class="gsg-svg-edge-hit" cx="' +
          (a.x + b.x) / 2 +
          '" cy="' +
          (a.y + b.y) / 2 +
          '" r="10" data-gsg-edge="' +
          esc(e.id) +
          '" tabindex="0" role="button" aria-label="Edge ' +
          esc(e.relationType.replace(/_/g, " ")) +
          ": " +
          esc((bundle.nodeById[e.from] || {}).label || e.from) +
          " to " +
          esc((bundle.nodeById[e.to] || {}).label || e.to) +
          '" />' +
          "</g>"
        );
      })
      .join("");

    var nodeEls = vg.nodes
      .map(function (n) {
        var p = vg.positions[n.id];
        if (!p) return "";
        var isFocus = n.id === state.focusId;
        var isExpanded = !!state.expandedIds[n.id];
        var label = n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label;
        return (
          '<g class="gsg-svg-node' +
          (isFocus ? " gsg-svg-node--focus" : "") +
          (isExpanded ? " gsg-svg-node--expanded" : "") +
          '" data-gsg-node="' +
          esc(n.id) +
          '" transform="translate(' +
          p.x +
          "," +
          p.y +
          ')">' +
          '<circle r="' +
          (isFocus ? 28 : 20) +
          '" />' +
          '<text class="gsg-svg-node__type" y="-26">' +
          esc(typeLabel(n.type)) +
          "</text>" +
          '<text class="gsg-svg-node__label" y="5">' +
          esc(label) +
          "</text>" +
          '<title>' +
          esc(n.label) +
          " — " +
          esc(typeLabel(n.type)) +
          ". Activate to expand nearby relationships.</title>" +
          "</g>"
        );
      })
      .join("");

    return (
      '<div class="gsg-canvas-wrap" aria-hidden="false">' +
      '<svg class="gsg-canvas" viewBox="0 0 640 560" role="img" aria-label="Relationship graph radial layout. Use the neighbor list for full keyboard access.">' +
      "<desc>Structured radial-from-focus graph. Focus node at center; neighbors on rings. Not force-directed.</desc>" +
      edgeLines +
      nodeEls +
      "</svg></div>"
    );
  }

  function renderStack(bundle, state) {
    if (!state.focusId || !bundle.nodeById[state.focusId]) {
      return (
        '<div class="gsg-panel gsg-panel--idle" data-gsg-state="idle">' +
        "<h2>Select a focus node</h2>" +
        "<p>Click any node to expand nearby relationships. Every edge shows why, confidence, time horizon, and evidence.</p>" +
        '<p class="gsg-note">Structured expand-on-click — not a force-directed spaghetti graph.</p>' +
        "</div>"
      );
    }

    var focus = bundle.nodeById[state.focusId];
    var nbrs = neighborsOf(bundle, state.focusId, state.typeFilter);
    var expandedBlocks = "";

    Object.keys(state.expandedIds).forEach(function (id) {
      if (!state.expandedIds[id] || id === state.focusId) return;
      var node = bundle.nodeById[id];
      if (!node) return;
      var local = neighborsOf(bundle, id, state.typeFilter);
      expandedBlocks +=
        '<section class="gsg-expand-block" aria-labelledby="gsg-exp-' +
        esc(id) +
        '">' +
        '<div class="gsg-expand-block__head">' +
        '<h3 id="gsg-exp-' +
        esc(id) +
        '">' +
        esc(node.label) +
        " · expanded</h3>" +
        '<button type="button" class="gsg-btn" data-gsg-collapse="' +
        esc(id) +
        '">Collapse</button></div>' +
        renderNeighborList(bundle, state, local, id) +
        "</section>";
    });

    return (
      '<div class="gsg-panel" data-gsg-state="graph">' +
      '<header class="gsg-panel__head">' +
      '<p class="gsg-badge">' +
      esc(typeLabel(focus.type)) +
      "</p>" +
      "<h2>" +
      esc(focus.label) +
      "</h2>" +
      (focus.summary ? "<p>" + esc(focus.summary) + "</p>" : "") +
      '<p class="gsg-note">' +
      nbrs.length +
      " nearby relationship" +
      (nbrs.length === 1 ? "" : "s") +
      " · click a neighbor to expand further or inspect an edge</p>" +
      '<div class="gsg-panel__actions">' +
      '<button type="button" class="gsg-btn gsg-btn--primary" data-gsg-expand="' +
      esc(focus.id) +
      '" aria-pressed="' +
      (state.expandedIds[focus.id] ? "true" : "false") +
      '">' +
      (state.expandedIds[focus.id] ? "Focus already expanded" : "Expand nearby") +
      "</button>" +
      (Object.keys(state.expandedIds).length
        ? '<button type="button" class="gsg-btn" data-gsg-collapse-all>Collapse all expansions</button>'
        : "") +
      "</div></header>" +
      renderSvg(bundle, state) +
      '<section class="gsg-stack" aria-label="Nearby relationships list">' +
      "<h3 class=\"gsg-stack__title\">Nearby relationships</h3>" +
      renderNeighborList(bundle, state, nbrs, state.focusId) +
      expandedBlocks +
      "</section>" +
      renderSelectedEdge(bundle, state) +
      "</div>"
    );
  }

  function renderNeighborList(bundle, state, nbrs, fromId) {
    if (!nbrs.length) {
      return (
        '<p class="gsg-empty" role="status">No curated nearby relationships for this filter. Empty is honest — we will not invent edges.</p>'
      );
    }
    return (
      '<ul class="gsg-neighbor-list" role="list">' +
      nbrs
        .map(function (item) {
          var n = item.node;
          var e = item.edge;
          var expanded = !!state.expandedIds[n.id];
          var edgeSelected = state.selectedEdgeId === e.id;
          return (
            '<li class="gsg-neighbor' +
            (edgeSelected ? " gsg-neighbor--selected" : "") +
            '">' +
            '<div class="gsg-neighbor__main">' +
            '<button type="button" class="gsg-neighbor__node" data-gsg-node="' +
            esc(n.id) +
            '" aria-expanded="' +
            (expanded ? "true" : "false") +
            '">' +
            '<span class="gsg-badge">' +
            esc(typeLabel(n.type)) +
            "</span>" +
            '<span class="gsg-neighbor__label">' +
            esc(n.label) +
            "</span>" +
            '<span class="gsg-neighbor__hint">' +
            (expanded ? "Expanded" : "Click to expand") +
            "</span></button>" +
            '<button type="button" class="gsg-neighbor__edge" data-gsg-edge="' +
            esc(e.id) +
            '" aria-pressed="' +
            (edgeSelected ? "true" : "false") +
            '">' +
            esc(e.relationType.replace(/_/g, " ")) +
            " · " +
            esc(e.confidence) +
            " · " +
            esc(e.timeHorizon) +
            "</button></div>" +
            (edgeSelected ? renderEdgeFacets(e) : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderSelectedEdge(bundle, state) {
    if (!state.selectedEdgeId) {
      return (
        '<aside class="gsg-edge-detail gsg-edge-detail--idle" aria-live="polite">' +
        "<p>Select an edge to read why it is connected, confidence, time horizon, and evidence.</p>" +
        "</aside>"
      );
    }
    var edge = bundle.edgeById[state.selectedEdgeId];
    if (!edge) {
      return (
        '<aside class="gsg-edge-detail" role="status"><p>Edge not found.</p></aside>'
      );
    }
    var from = bundle.nodeById[edge.from];
    var to = bundle.nodeById[edge.to];
    return (
      '<aside class="gsg-edge-detail" aria-live="polite">' +
      "<h3>Edge detail</h3>" +
      '<p class="gsg-edge-detail__path">' +
      esc(from ? from.label : edge.from) +
      " → " +
      esc(to ? to.label : edge.to) +
      "</p>" +
      '<p class="gsg-badge">' +
      esc(edge.relationType.replace(/_/g, " ")) +
      "</p>" +
      renderEdgeFacets(edge) +
      "</aside>"
    );
  }

  function resolveDataUrl(configured, depth) {
    if (configured) return configured;
    var prefix = "";
    for (var i = 0; i < (depth || 3); i++) prefix += "../";
    return prefix + "data/global-signals/relationship-graph/graph.json";
  }

  async function loadGraph(opts) {
    opts = opts || {};
    var url = resolveDataUrl(opts.dataUrl, opts.depth);
    var res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    return normalizeBundle(data);
  }

  function paint(root, bundle, state) {
    root.innerHTML =
      renderBanner(bundle) +
      renderPicker(bundle, state) +
      '<div data-gsg-result>' +
      renderStack(bundle, state) +
      "</div>";
    bindInteractions(root, bundle, state);
  }

  function expandNode(state, id) {
    state.expandedIds = state.expandedIds || {};
    state.expandedIds[id] = true;
  }

  function collapseNode(state, id) {
    if (!state.expandedIds) return;
    delete state.expandedIds[id];
  }

  function bindInteractions(root, bundle, state) {
    var typeSelect = root.querySelector("[data-gsg-type]");
    var focusSelect = root.querySelector("[data-gsg-focus-select]");

    if (typeSelect) {
      typeSelect.addEventListener("change", function () {
        state.typeFilter = typeSelect.value || "all";
        paint(root, bundle, state);
      });
    }

    if (focusSelect) {
      focusSelect.addEventListener("change", function () {
        state.focusId = focusSelect.value || null;
        state.expandedIds = {};
        state.selectedEdgeId = null;
        if (state.focusId) expandNode(state, state.focusId);
        setQueryFocus(state.focusId);
        paint(root, bundle, state);
        updateTitle(bundle, state);
      });
    }

    root.querySelectorAll("[data-gsg-focus]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.focusId = btn.getAttribute("data-gsg-focus");
        state.expandedIds = {};
        state.selectedEdgeId = null;
        expandNode(state, state.focusId);
        setQueryFocus(state.focusId);
        paint(root, bundle, state);
        updateTitle(bundle, state);
      });
    });

    root.querySelectorAll("[data-gsg-node]").forEach(function (el) {
      function activate() {
        var id = el.getAttribute("data-gsg-node");
        if (!id || !bundle.nodeById[id]) return;
        if (state.focusId === id) {
          if (state.expandedIds[id]) collapseNode(state, id);
          else expandNode(state, id);
        } else if (state.expandedIds[id]) {
          // already expanded — promote to focus for readability
          state.focusId = id;
          state.expandedIds = {};
          expandNode(state, id);
          setQueryFocus(id);
        } else {
          expandNode(state, id);
        }
        paint(root, bundle, state);
        updateTitle(bundle, state);
      }
      el.addEventListener("click", activate);
      el.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          activate();
        }
      });
      if (el.tagName === "G") {
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "button");
        el.setAttribute(
          "aria-label",
          (bundle.nodeById[el.getAttribute("data-gsg-node")] || {}).label +
            " node. Activate to expand nearby relationships."
        );
      }
    });

    root.querySelectorAll("[data-gsg-edge]").forEach(function (el) {
      function activate() {
        var id = el.getAttribute("data-gsg-edge");
        state.selectedEdgeId = state.selectedEdgeId === id ? null : id;
        paint(root, bundle, state);
      }
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        activate();
      });
      el.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          activate();
        }
      });
    });

    root.querySelectorAll("[data-gsg-expand]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        expandNode(state, btn.getAttribute("data-gsg-expand"));
        paint(root, bundle, state);
      });
    });

    root.querySelectorAll("[data-gsg-collapse]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        collapseNode(state, btn.getAttribute("data-gsg-collapse"));
        paint(root, bundle, state);
      });
    });

    var collapseAll = root.querySelector("[data-gsg-collapse-all]");
    if (collapseAll) {
      collapseAll.addEventListener("click", function () {
        state.expandedIds = {};
        if (state.focusId) expandNode(state, state.focusId);
        paint(root, bundle, state);
      });
    }
  }

  function updateTitle(bundle, state) {
    try {
      if (state.focusId && bundle.nodeById[state.focusId]) {
        document.title =
          bundle.nodeById[state.focusId].label +
          " · Relationship Graph · Global Signals";
      }
    } catch (e) {}
  }

  async function mount(root, opts) {
    if (!root) return null;
    opts = opts || {};
    root.setAttribute("aria-busy", "true");
    root.setAttribute("data-gsg-state", "loading");
    root.innerHTML = '<p class="gsg-loading" role="status">Loading Relationship Graph…</p>';

    try {
      var bundle = await loadGraph(opts);
      root.setAttribute("aria-busy", "false");

      if (!bundle.nodes.length) {
        root.setAttribute("data-gsg-state", "empty");
        root.innerHTML =
          renderBanner(bundle) +
          '<p class="gsg-empty" role="status">Graph nodes will appear here as curated relationships are added. Empty is honest.</p>';
        return bundle;
      }

      var focusId = opts.focus != null ? opts.focus : queryFocus();
      if (!focusId) focusId = bundle.defaultFocusId;
      if (focusId && !bundle.nodeById[focusId]) focusId = null;

      var state = {
        focusId: focusId,
        typeFilter: opts.typeFilter || "all",
        expandedIds: {},
        selectedEdgeId: null
      };
      if (state.focusId) expandNode(state, state.focusId);

      root.setAttribute("data-gsg-state", "ready");
      paint(root, bundle, state);
      updateTitle(bundle, state);
      return bundle;
    } catch (err) {
      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gsg-state", "error");
      root.innerHTML =
        '<div class="gsg-error" role="alert">' +
        "<p>Relationship graph data unavailable. Empty is honest — we will not invent edges.</p>" +
        "</div>";
      return { error: err, nodes: [], edges: [] };
    }
  }

  GS.relationshipGraph = {
    mount: mount,
    loadGraph: loadGraph,
    normalizeBundle: normalizeBundle,
    normalizeNode: normalizeNode,
    normalizeEdge: normalizeEdge,
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    normalizeEvidence: normalizeEvidence,
    typeLabel: typeLabel,
    neighborsOf: neighborsOf,
    visibleGraph: visibleGraph,
    renderBanner: renderBanner,
    renderEvidence: renderEvidence,
    renderEdgeFacets: renderEdgeFacets,
    isSafeHttpUrl: isSafeHttpUrl,
    CONFIDENCE_ALLOWED: CONFIDENCE_ALLOWED,
    HORIZON_ALLOWED: HORIZON_ALLOWED,
    TYPE_LABELS: TYPE_LABELS
  };
})(typeof window !== "undefined" ? window : globalThis);
