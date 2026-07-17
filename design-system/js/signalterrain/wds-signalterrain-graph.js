/**
 * SignalTerrain Living Knowledge Graph — explorer, search, timelines.
 * Educational samples only. No scanners or live threat feeds.
 */
(function (global) {
  "use strict";

  var graph = null;
  var byId = {};
  var typeAliases = {};
  var canonicalTypes = [];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function indexGraph(g) {
    byId = {};
    (g.topics || []).forEach(function (t) {
      byId[t.id] = t;
    });
    graph = g;
    return g;
  }

  function loadTypes(url) {
    url = url || "../../design-system/signalterrain/relationship-types.json";
    return fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) return { types: [], aliases: {} };
        return r.json();
      })
      .then(function (data) {
        canonicalTypes = data.types || [];
        typeAliases = data.aliases || {};
        return data;
      })
      .catch(function () {
        canonicalTypes = [];
        typeAliases = {};
        return { types: [], aliases: {} };
      });
  }

  function resolveType(type) {
    if (!type) return type;
    return typeAliases[type] || type;
  }

  function load(url) {
    url = url || "../../design-system/signalterrain/samples/living-graph.json";
    return fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("Could not load living graph (" + r.status + ")");
        return r.json();
      })
      .then(indexGraph);
  }

  function getTopic(id) {
    return byId[id] || null;
  }

  function listTopics() {
    return (graph && graph.topics) || [];
  }

  function listEdges() {
    return (graph && graph.edges) || [];
  }

  function neighbors(id, opts) {
    opts = opts || {};
    var typeFilter = opts.types && opts.types.length ? opts.types : null;
    var confFilter = opts.confidence && opts.confidence.length ? opts.confidence : null;
    var out = [];
    listEdges().forEach(function (e) {
      var type = resolveType(e.type);
      if (typeFilter && typeFilter.indexOf(type) === -1 && typeFilter.indexOf(e.type) === -1) return;
      if (confFilter && confFilter.indexOf(e.confidence) === -1) return;
      if (e.from === id && byId[e.to]) {
        out.push({ edge: e, type: type, topic: byId[e.to], direction: "out" });
      } else if (e.to === id && byId[e.from]) {
        out.push({ edge: e, type: type, topic: byId[e.from], direction: "in" });
      }
    });
    return out;
  }

  function tokenize(q) {
    return String(q || "")
      .toLowerCase()
      .split(/[^a-z0-9_+.-]+/)
      .filter(function (t) {
        return t.length > 1;
      });
  }

  function fieldBlob(topic) {
    var parts = [
      topic.id,
      topic.title,
      topic.summary,
      topic.overview,
      topic.kind,
      topic.workspace,
      topic.technicalExplanation,
      topic.historicalContext,
      (topic.tags || []).join(" "),
      (topic.knownFacts || []).join(" "),
      (topic.unknowns || []).join(" "),
      (topic.questionsWorthInvestigating || []).join(" "),
      topic.waypointAnalysis && topic.waypointAnalysis.text
    ];
    (topic.timeline || []).forEach(function (ev) {
      parts.push(ev.text, ev.kind, ev.at);
    });
    return parts
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  /**
   * Fielded graph search (lexical + kind/tag boosts).
   * Embedding-based semantic search is future work — documented in KNOWLEDGE-GRAPH.md.
   */
  function search(query, opts) {
    opts = opts || {};
    var tokens = tokenize(query);
    if (!tokens.length) return [];
    var limit = opts.limit || 24;
    var scored = [];

    listTopics().forEach(function (topic) {
      var blob = fieldBlob(topic);
      var score = 0;
      tokens.forEach(function (tok) {
        if (topic.title && topic.title.toLowerCase().indexOf(tok) !== -1) score += 8;
        if (topic.kind && topic.kind.indexOf(tok) !== -1) score += 6;
        if (topic.id && topic.id.indexOf(tok) !== -1) score += 5;
        if ((topic.tags || []).some(function (t) {
          return t.toLowerCase().indexOf(tok) !== -1;
        }))
          score += 4;
        if (blob.indexOf(tok) !== -1) score += 2;
      });
      if (score > 0) {
        scored.push({ kind: "topic", score: score, topic: topic });
      }
    });

    listEdges().forEach(function (e) {
      var blob = [e.type, resolveType(e.type), e.label, e.notes, e.confidence].join(" ").toLowerCase();
      var score = 0;
      tokens.forEach(function (tok) {
        if (blob.indexOf(tok) !== -1) score += 3;
      });
      if (score > 0 && byId[e.from] && byId[e.to]) {
        scored.push({
          kind: "relationship",
          score: score,
          edge: e,
          from: byId[e.from],
          to: byId[e.to]
        });
      }
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    return scored.slice(0, limit);
  }

  function renderTimeline(topic) {
    var events = topic.timeline || [];
    if (!events.length) return '<p class="st-muted">No timeline entries yet.</p>';
    return (
      '<ol class="st-timeline">' +
      events
        .map(function (ev) {
          return (
            "<li>" +
            '<span class="st-timeline-at">' +
            esc(ev.at) +
            (ev.kind ? " · " + esc(ev.kind) : "") +
            "</span>" +
            '<span class="st-timeline-text">' +
            esc(ev.text) +
            "</span>" +
            (ev.sourceLabel
              ? '<span class="st-timeline-src">' + esc(ev.sourceLabel) + "</span>"
              : "") +
            "</li>"
          );
        })
        .join("") +
      "</ol>"
    );
  }

  function renderAnalysis(topic) {
    var q = (topic.questionsWorthInvestigating || [])
      .map(function (x) {
        return "<li>" + esc(x) + "</li>";
      })
      .join("");
    var facts = (topic.knownFacts || [])
      .map(function (x) {
        return "<li>" + esc(x) + "</li>";
      })
      .join("");
    var unk = (topic.unknowns || [])
      .map(function (x) {
        return "<li>" + esc(x) + "</li>";
      })
      .join("");
    return (
      '<div class="st-analysis">' +
      "<h3>Observed facts</h3><ul>" +
      (facts || "<li>None listed</li>") +
      "</ul>" +
      (topic.technicalExplanation
        ? "<h3>Technical explanation</h3><p>" + esc(topic.technicalExplanation) + "</p>"
        : "") +
      (topic.historicalContext
        ? "<h3>Historical context</h3><p>" + esc(topic.historicalContext) + "</p>"
        : "") +
      "<h3>Waypoint Analysis</h3><p>" +
      esc(topic.waypointAnalysis && topic.waypointAnalysis.text) +
      "</p>" +
      '<p class="st-muted">Editorial: ' +
      esc(topic.waypointAnalysis && topic.waypointAnalysis.editorialStatus) +
      " · Confidence: " +
      esc(
        (topic.confidence && (topic.confidence.trustLabel || topic.confidence.level)) ||
          "unknown"
      ) +
      "</p>" +
      "<h3>Unknowns</h3><ul>" +
      unk +
      "</ul>" +
      (q ? "<h3>Questions worth investigating</h3><ul>" + q + "</ul>" : "") +
      "</div>"
    );
  }

  function mountExplorer(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Opening living knowledge graph…</p>';

    var state = {
      focusId: options.initialId || null,
      expanded: {},
      typeFilters: [],
      confFilters: [],
      searchQ: "",
      panel: "graph"
    };

    return Promise.all([load(options.url), loadTypes(options.typesUrl)]).then(function () {
      if (!state.focusId && listTopics().length) {
        state.focusId = "st_cve-sample-2024-0001";
        if (!getTopic(state.focusId)) state.focusId = listTopics()[0].id;
      }
      state.expanded[state.focusId] = true;

      function visibleNodes() {
        var ids = {};
        ids[state.focusId] = true;
        Object.keys(state.expanded).forEach(function (id) {
          if (!state.expanded[id]) return;
          ids[id] = true;
          neighbors(id, {
            types: state.typeFilters,
            confidence: state.confFilters
          }).forEach(function (n) {
            ids[n.topic.id] = true;
          });
        });
        return Object.keys(ids)
          .map(getTopic)
          .filter(Boolean);
      }

      function visibleEdges() {
        var ids = {};
        visibleNodes().forEach(function (t) {
          ids[t.id] = true;
        });
        return listEdges().filter(function (e) {
          var type = resolveType(e.type);
          if (state.typeFilters.length && state.typeFilters.indexOf(type) === -1) return false;
          if (state.confFilters.length && state.confFilters.indexOf(e.confidence) === -1)
            return false;
          return ids[e.from] && ids[e.to];
        });
      }

      function paint() {
        var focus = getTopic(state.focusId);
        var nodes = visibleNodes();
        var edges = visibleEdges();
        var searchHits =
          state.searchQ.trim().length > 1 ? search(state.searchQ, { limit: 12 }) : [];

        var presentTypes = {};
        listEdges().forEach(function (e) {
          presentTypes[resolveType(e.type)] = true;
        });
        var typeOptions = (canonicalTypes.length ? canonicalTypes : [{ id: "related_to", label: "Related to" }]).filter(
          function (t) {
            return presentTypes[t.id];
          }
        );
        if (!typeOptions.length) {
          typeOptions = Object.keys(presentTypes).map(function (id) {
            return { id: id, label: id };
          });
        }

        root.innerHTML =
          '<div class="st-explorer">' +
          '<header class="st-demo-header">' +
          "<h1>Knowledge graph</h1>" +
          '<p class="st-lead">Everything is connected. Expand neighbors calmly — samples only.</p>' +
          (graph.meta && graph.meta.disclaimer
            ? '<p class="st-badge">' + esc(graph.meta.disclaimer) + "</p>"
            : "") +
          "</header>" +
          '<div class="st-explorer-toolbar">' +
          '<label class="st-search-label">Search ' +
          '<input type="search" class="st-search" placeholder="Topics, CVEs, vendors, research…" value="' +
          esc(state.searchQ) +
          '" />' +
          '<button type="button" class="st-chip" data-run-search>Find</button></label>' +
          '<div class="st-filter-block">' +
          "<span>Relationship types</span>" +
          '<div class="st-chip-row">' +
          typeOptions
            .map(function (t) {
              var on = state.typeFilters.indexOf(t.id) !== -1;
              return (
                '<button type="button" class="st-chip' +
                (on ? " is-active" : "") +
                '" data-type-filter="' +
                esc(t.id) +
                '">' +
                esc(t.label) +
                "</button>"
              );
            })
            .join("") +
          '<button type="button" class="st-chip st-chip-clear" data-clear-types>All types</button>' +
          "</div></div>" +
          '<div class="st-filter-block">' +
          "<span>Edge confidence</span>" +
          '<div class="st-chip-row">' +
          ["high", "moderate", "low", "speculative"]
            .map(function (c) {
              var on = state.confFilters.indexOf(c) !== -1;
              return (
                '<button type="button" class="st-chip' +
                (on ? " is-active" : "") +
                '" data-conf-filter="' +
                esc(c) +
                '">' +
                esc(c) +
                "</button>"
              );
            })
            .join("") +
          '<button type="button" class="st-chip st-chip-clear" data-clear-conf>All confidence</button>' +
          "</div></div>" +
          "</div>" +
          (searchHits.length
            ? '<div class="st-search-results"><h2>Search</h2><ul>' +
              searchHits
                .map(function (hit) {
                  if (hit.kind === "topic") {
                    return (
                      "<li><button type=\"button\" data-focus=\"" +
                      esc(hit.topic.id) +
                      '">' +
                      esc(hit.topic.title) +
                      '</button> <span class="st-muted">' +
                      esc(hit.topic.kind) +
                      "</span></li>"
                    );
                  }
                  return (
                    "<li><span class=\"st-muted\">rel</span> " +
                    esc(hit.from.title) +
                    " → " +
                    esc(hit.to.title) +
                    " <button type=\"button\" data-focus=\"" +
                    esc(hit.to.id) +
                    '">open</button></li>'
                  );
                })
                .join("") +
              "</ul></div>"
            : "") +
          '<div class="st-explorer-grid">' +
          '<section class="st-graph-panel" aria-label="Graph neighbors">' +
          "<h2>Visible topics (" +
          nodes.length +
          ")</h2>" +
          '<ul class="st-graph-nodes">' +
          nodes
            .map(function (t) {
              var focused = t.id === state.focusId;
              var expanded = !!state.expanded[t.id];
              var nCount = neighbors(t.id, {
                types: state.typeFilters,
                confidence: state.confFilters
              }).length;
              return (
                '<li class="' +
                (focused ? "is-focus" : "") +
                '">' +
                '<button type="button" class="st-node-title" data-focus="' +
                esc(t.id) +
                '">' +
                esc(t.title) +
                "</button>" +
                '<span class="st-muted">' +
                esc(t.kind) +
                " · " +
                esc(
                  (t.confidence && (t.confidence.trustLabel || t.confidence.level)) ||
                    "unknown"
                ) +
                "</span>" +
                '<div class="st-node-actions">' +
                '<button type="button" data-expand="' +
                esc(t.id) +
                '">' +
                (expanded ? "Collapse" : "Expand") +
                " (" +
                nCount +
                ")</button>" +
                "</div></li>"
              );
            })
            .join("") +
          "</ul>" +
          "<h2>Visible relationships (" +
          edges.length +
          ")</h2>" +
          '<ul class="st-graph-edges">' +
          edges
            .map(function (e) {
              return (
                "<li><strong>" +
                esc(resolveType(e.type)) +
                "</strong> · " +
                esc(e.label) +
                ' <span class="st-muted">(' +
                esc(e.confidence) +
                ")</span><br />" +
                '<button type="button" data-focus="' +
                esc(e.from) +
                '">' +
                esc(byId[e.from].title) +
                "</button> → " +
                '<button type="button" data-focus="' +
                esc(e.to) +
                '">' +
                esc(byId[e.to].title) +
                "</button></li>"
              );
            })
            .join("") +
          "</ul></section>" +
          '<section class="st-topic-detail" aria-label="Topic detail">' +
          (focus
            ? '<p class="st-detail-eyebrow">' +
              esc(focus.workspace) +
              " · " +
              esc(focus.kind) +
              "</p>" +
              "<h2>" +
              esc(focus.title) +
              "</h2>" +
              '<p class="st-detail-summary">' +
              esc(focus.summary) +
              "</p>" +
              "<h3>Overview</h3><p>" +
              esc(focus.overview) +
              "</p>" +
              "<h3>Living timeline</h3>" +
              renderTimeline(focus) +
              renderAnalysis(focus) +
              "<h3>Connections</h3><ul class=\"st-rel-list\">" +
              neighbors(focus.id, {
                types: state.typeFilters,
                confidence: state.confFilters
              })
                .map(function (n) {
                  return (
                    "<li><button type=\"button\" class=\"st-rel-link\" data-focus=\"" +
                    esc(n.topic.id) +
                    '">' +
                    esc(n.topic.title) +
                    '</button><span class="st-rel-type">' +
                    esc(n.type) +
                    " · " +
                    esc(n.edge.label) +
                    " · " +
                    esc(n.edge.confidence) +
                    "</span></li>"
                  );
                })
                .join("") +
              "</ul>" +
              (focus.meta && focus.meta.disclaimer
                ? '<p class="st-disclaimer">' + esc(focus.meta.disclaimer) + "</p>"
                : "")
            : '<p class="st-empty">Select a topic.</p>') +
          "</section></div></div>";

        var searchInput = root.querySelector(".st-search");
        var runSearch = function () {
          if (!searchInput) return;
          state.searchQ = searchInput.value;
          paint();
        };
        if (searchInput) {
          searchInput.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter") {
              ev.preventDefault();
              runSearch();
            }
          });
        }
        var searchBtn = root.querySelector("[data-run-search]");
        if (searchBtn) searchBtn.addEventListener("click", runSearch);

        root.querySelectorAll("[data-type-filter]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-type-filter");
            var i = state.typeFilters.indexOf(id);
            if (i === -1) state.typeFilters.push(id);
            else state.typeFilters.splice(i, 1);
            paint();
          });
        });
        root.querySelectorAll("[data-conf-filter]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-conf-filter");
            var i = state.confFilters.indexOf(id);
            if (i === -1) state.confFilters.push(id);
            else state.confFilters.splice(i, 1);
            paint();
          });
        });
        var clearTypes = root.querySelector("[data-clear-types]");
        if (clearTypes)
          clearTypes.addEventListener("click", function () {
            state.typeFilters = [];
            paint();
          });
        var clearConf = root.querySelector("[data-clear-conf]");
        if (clearConf)
          clearConf.addEventListener("click", function () {
            state.confFilters = [];
            paint();
          });

        root.querySelectorAll("[data-focus]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.focusId = btn.getAttribute("data-focus");
            state.expanded[state.focusId] = true;
            paint();
          });
        });
        root.querySelectorAll("[data-expand]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-expand");
            state.expanded[id] = !state.expanded[id];
            paint();
          });
        });
      }

      root.removeAttribute("aria-busy");
      paint();
      return graph;
    }).catch(function (err) {
      root.removeAttribute("aria-busy");
      root.innerHTML =
        '<p class="st-error">Could not open the knowledge graph. ' +
        esc(err && err.message) +
        "</p>";
      throw err;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainGraph = {
    load: load,
    loadTypes: loadTypes,
    resolveType: resolveType,
    getTopic: getTopic,
    listTopics: listTopics,
    listEdges: listEdges,
    neighbors: neighbors,
    search: search,
    renderTimeline: renderTimeline,
    renderAnalysis: renderAnalysis,
    mountExplorer: mountExplorer
  };
})(window);
