/**
 * SignalTerrain Topics — foundation graph helpers (demo + future workspaces).
 * Loads sample demo-graph.json; does not invent live intelligence.
 */
(function (global) {
  "use strict";

  var graph = null;
  var byId = {};

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

  function load(url) {
    url = url || "../../design-system/signalterrain/samples/demo-graph.json";
    return fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("Could not load topic graph (" + r.status + ")");
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

  function listByWorkspace(workspace) {
    return listTopics().filter(function (t) {
      return t.workspace === workspace;
    });
  }

  function neighbors(id) {
    var out = [];
    listEdges().forEach(function (e) {
      if (e.from === id && byId[e.to]) {
        out.push({ edge: e, topic: byId[e.to], direction: "out" });
      } else if (e.to === id && byId[e.from]) {
        out.push({ edge: e, topic: byId[e.from], direction: "in" });
      }
    });
    return out;
  }

  function renderTopicCard(topic, opts) {
    opts = opts || {};
    var selected = opts.selectedId === topic.id;
    var conf = (topic.confidence && (topic.confidence.trustLabel || topic.confidence.level)) || "unknown";
    return (
      '<button type="button" class="st-topic-card' +
      (selected ? " is-selected" : "") +
      '" data-topic-id="' +
      esc(topic.id) +
      '" aria-pressed="' +
      (selected ? "true" : "false") +
      '">' +
      '<span class="st-topic-workspace">' +
      esc(topic.workspace) +
      "</span>" +
      '<span class="st-topic-title">' +
      esc(topic.title) +
      "</span>" +
      '<span class="st-topic-summary">' +
      esc(topic.summary) +
      "</span>" +
      '<span class="st-topic-meta">Confidence: ' +
      esc(conf) +
      " · " +
      esc(topic.meta && topic.meta.status) +
      "</span>" +
      "</button>"
    );
  }

  function renderDetail(topic) {
    if (!topic) {
      return '<p class="st-empty">Select a topic to see overview, analysis, and connections.</p>';
    }
    var n = neighbors(topic.id);
    var facts = (topic.knownFacts || [])
      .map(function (f) {
        return "<li>" + esc(f) + "</li>";
      })
      .join("");
    var unknowns = (topic.unknowns || [])
      .map(function (u) {
        return "<li>" + esc(u) + "</li>";
      })
      .join("");
    var watch = (topic.watchFor || [])
      .map(function (w) {
        return "<li>" + esc(w) + "</li>";
      })
      .join("");
    var rel = n
      .map(function (item) {
        return (
          "<li>" +
          '<button type="button" class="st-rel-link" data-topic-id="' +
          esc(item.topic.id) +
          '">' +
          esc(item.topic.title) +
          "</button>" +
          '<span class="st-rel-type">' +
          esc(item.edge.type) +
          " · " +
          esc(item.edge.label) +
          " · " +
          esc(item.edge.confidence) +
          "</span>" +
          "</li>"
        );
      })
      .join("");

    return (
      '<article class="st-detail" aria-live="polite">' +
      '<p class="st-detail-eyebrow">' +
      esc(topic.workspace) +
      " · " +
      esc(topic.kind) +
      "</p>" +
      "<h2>" +
      esc(topic.title) +
      "</h2>" +
      '<p class="st-detail-summary">' +
      esc(topic.summary) +
      "</p>" +
      "<h3>Overview</h3>" +
      "<p>" +
      esc(topic.overview) +
      "</p>" +
      "<h3>Waypoint Analysis</h3>" +
      "<p>" +
      esc(topic.waypointAnalysis && topic.waypointAnalysis.text) +
      "</p>" +
      '<p class="st-detail-meta">Editorial: ' +
      esc(topic.waypointAnalysis && topic.waypointAnalysis.editorialStatus) +
      " · Verification: " +
      esc(topic.verification && topic.verification.status) +
      "</p>" +
      "<h3>Known facts</h3>" +
      "<ul>" +
      (facts || "<li>None listed</li>") +
      "</ul>" +
      "<h3>Unknowns</h3>" +
      "<ul>" +
      unknowns +
      "</ul>" +
      (watch
        ? "<h3>Things to watch</h3><ul>" + watch + "</ul>"
        : "") +
      "<h3>Related topics</h3>" +
      (rel
        ? '<ul class="st-rel-list">' + rel + "</ul>"
        : "<p>No relationships in the demo graph.</p>") +
      (topic.meta && topic.meta.disclaimer
        ? '<p class="st-disclaimer">' + esc(topic.meta.disclaimer) + "</p>"
        : "") +
      "</article>"
    );
  }

  function mountDemo(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Loading topic foundation…</p>';

    return load(options.url).then(function (g) {
      var selectedId = options.initialId || (g.topics[0] && g.topics[0].id);
      function paint() {
        var filters = ["all", "rf", "cyber", "infrastructure", "research"];
        var filter = root.getAttribute("data-filter") || "all";
        var topics = listTopics().filter(function (t) {
          return filter === "all" || t.workspace === filter;
        });
        var selected = getTopic(selectedId);
        root.innerHTML =
          '<div class="st-demo">' +
          '<header class="st-demo-header">' +
          "<h1>Topics</h1>" +
          '<p class="st-lead">Everything becomes a topic. Sample graph — not live intelligence.</p>' +
          (g.meta && g.meta.disclaimer
            ? '<p class="st-badge">' + esc(g.meta.disclaimer) + "</p>"
            : "") +
          "</header>" +
          '<div class="st-filters" role="tablist" aria-label="Workspace filter">' +
          filters
            .map(function (f) {
              var on = filter === f;
              return (
                '<button type="button" role="tab" class="st-filter' +
                (on ? " is-active" : "") +
                '" data-filter="' +
                f +
                '" aria-selected="' +
                on +
                '">' +
                (f === "all" ? "All" : f) +
                "</button>"
              );
            })
            .join("") +
          "</div>" +
          '<div class="st-demo-grid">' +
          '<div class="st-topic-list" role="list">' +
          topics
            .map(function (t) {
              return renderTopicCard(t, { selectedId: selectedId });
            })
            .join("") +
          "</div>" +
          '<div class="st-topic-detail">' +
          renderDetail(selected) +
          "</div>" +
          "</div>" +
          "</div>";

        root.querySelectorAll("[data-filter]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            root.setAttribute("data-filter", btn.getAttribute("data-filter"));
            paint();
          });
        });
        root.querySelectorAll("[data-topic-id]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            selectedId = btn.getAttribute("data-topic-id");
            paint();
          });
        });
      }
      root.removeAttribute("aria-busy");
      paint();
      return g;
    }).catch(function (err) {
      root.removeAttribute("aria-busy");
      root.innerHTML =
        '<p class="st-error">Could not open the topic foundation. ' +
        esc(err && err.message) +
        "</p>";
      throw err;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainTopics = {
    load: load,
    getTopic: getTopic,
    listTopics: listTopics,
    listEdges: listEdges,
    listByWorkspace: listByWorkspace,
    neighbors: neighbors,
    renderTopicCard: renderTopicCard,
    renderDetail: renderDetail,
    mountDemo: mountDemo
  };
})(window);
