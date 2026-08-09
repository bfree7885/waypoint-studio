/**
 * SignalTerrain Cyber Terrain Map & Intelligence Explorer V0.1
 * Consumes shared cyber graph — does not duplicate traversal business logic.
 * Educational, defensive, explainable, privacy-first.
 */
(function (global) {
  "use strict";

  var TIMELINE_PAGE = 12;
  var LAYER_CACHE_KEY = "cyber_map_layers";

  function Util() {
    return global.WDS && global.WDS.signalTerrainUtil;
  }

  function esc(s) {
    var u = Util();
    if (u && u.esc) return u.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadJson(url) {
    var u = Util();
    if (u && u.loadJson) return u.loadJson(url);
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function GraphApi() {
    return global.WDS && global.WDS.signalTerrainCyberGraph;
  }

  function Research() {
    return global.WDS && global.WDS.signalTerrainResearch;
  }

  function parseHash() {
    var u = Util();
    var raw =
      u && u.parseHash
        ? u.parseHash()
        : (function () {
            var h = String(global.location.hash || "").replace(/^#/, "");
            if (!h) return { panel: null, id: null };
            var parts = h.split("/");
            return { panel: parts[0] || null, id: parts[1] || null };
          })();
    var panel = raw.panel || "overview";
    if (panel === "product" || panel === "campaign" || panel === "entity") {
      return { panel: panel, detail: panel, id: raw.id || null };
    }
    return { panel: panel, detail: null, id: raw.id || null };
  }

  function setHash(panel, id) {
    var u = Util();
    if (u && u.setHash) {
      u.setHash(panel, id);
      return;
    }
    var next = id ? panel + "/" + id : panel;
    if (String(global.location.hash || "").replace(/^#/, "") !== next) {
      global.location.hash = next;
    }
  }

  function eventKindFromEntity(e) {
    var blob = ((e.title || "") + " " + (e.summary || "") + " " + ((e.history && e.history[0] && e.history[0].summary) || "")).toLowerCase();
    if (/disclos/.test(blob)) return "disclosure";
    if (/advisory|kev|cisa/.test(blob)) return "public-advisory";
    if (/patch|ms17|fix|update released/.test(blob)) return "patch-release";
    if (/exploit|wannacry|ransomware|campaign/.test(blob) && /exploit|wave|campaign|ransomware/.test(blob))
      return "known-exploitation";
    if (/mitigat/.test(blob)) return "mitigation-update";
    if (/affect|product|software/.test(blob)) return "additional-affected-products";
    return "historical-milestone";
  }

  function eventAt(e) {
    if (e.externalIds && e.externalIds.at) return e.externalIds.at;
    if (e.history && e.history[0] && e.history[0].at) return e.history[0].at;
    return e.updatedAt || e.createdAt || "";
  }

  function collectTimeline(graph) {
    var events = graph.byKind("timeline-event").map(function (e) {
      return {
        id: e.id,
        title: e.title,
        summary: e.summary,
        at: eventAt(e),
        eventKind: eventKindFromEntity(e),
        severity: e.severity || "info",
        regions: e.regions || [],
        industries: e.industries || [],
        subjectId: (e.externalIds && e.externalIds.subjectId) || null,
        entity: e,
        citations: e.citations || [],
        confidence: e.confidence || "moderate",
        updatedAt: e.updatedAt
      };
    });
    // Also surface history rows on high-signal entities as secondary milestones
    ["cve", "patch", "threat-campaign", "vendor-advisory"].forEach(function (kind) {
      graph.byKind(kind).forEach(function (e) {
        (e.history || []).forEach(function (h, idx) {
          events.push({
            id: e.id + "#h" + idx,
            title: e.title + " — " + (h.summary || "update"),
            summary: h.summary || e.summary,
            at: h.at || "",
            eventKind: eventKindFromEntity({ title: h.summary || "", summary: e.kind }),
            severity: e.severity || "info",
            regions: e.regions || [],
            industries: e.industries || [],
            subjectId: e.id,
            entity: e,
            citations: e.citations || [],
            confidence: e.confidence || "moderate",
            updatedAt: e.updatedAt,
            derived: true
          });
        });
      });
    });
    events.sort(function (a, b) {
      return String(b.at).localeCompare(String(a.at));
    });
    return events;
  }

  function explainEdge(edge, fromEnt, toEnt) {
    return {
      whyConnected:
        "Connected because the shared cyber graph records a “" +
        edge.type +
        "” relationship" +
        (edge.note ? " — " + edge.note : "") +
        ".",
      originated:
        edge.id ||
        "Bundle relationship in cyber-intelligence sample (authoritative relationships[]).",
      updatedAt: (fromEnt && fromEnt.updatedAt) || (toEnt && toEnt.updatedAt) || null,
      confidence: edge.confidence || "moderate",
      sources: []
        .concat((fromEnt && fromEnt.citations) || [])
        .concat((toEnt && toEnt.citations) || [])
        .slice(0, 6),
      from: fromEnt && { id: fromEnt.id, title: fromEnt.title, kind: fromEnt.kind },
      to: toEnt && { id: toEnt.id, title: toEnt.title, kind: toEnt.kind },
      type: edge.type
    };
  }

  function projectLonLat(lon, lat, width, height) {
    // Equirectangular — efficient SVG placement, not a cartographic claim
    var x = ((Number(lon) + 180) / 360) * width;
    var y = ((90 - Number(lat)) / 180) * height;
    return { x: x, y: y };
  }

  function filterTimeline(events, filters) {
    filters = filters || {};
    return events.filter(function (ev) {
      if (filters.severity && filters.severity !== "all" && ev.severity !== filters.severity) return false;
      if (filters.eventKind && filters.eventKind !== "all" && ev.eventKind !== filters.eventKind)
        return false;
      if (filters.region && filters.region !== "all") {
        if ((ev.regions || []).indexOf(filters.region) === -1 && filters.region !== "global")
          return false;
      }
      if (filters.industry && filters.industry !== "all") {
        if ((ev.industries || []).indexOf(filters.industry) === -1) return false;
      }
      if (filters.vendorNeedle) {
        var blob = (ev.title + " " + ev.summary + " " + (ev.entity && ev.entity.title)).toLowerCase();
        if (blob.indexOf(filters.vendorNeedle.toLowerCase()) === -1) return false;
      }
      if (filters.techNeedle) {
        var blob2 = (ev.title + " " + ev.summary).toLowerCase();
        if (blob2.indexOf(filters.techNeedle.toLowerCase()) === -1) return false;
      }
      if (filters.from && ev.at && ev.at < filters.from) return false;
      if (filters.to && ev.at && ev.at > filters.to) return false;
      return true;
    });
  }

  function researchActionsHtml(entityId, title) {
    var R = Research();
    var booked = R && R.isBookmarked(entityId);
    return (
      '<div class="st-x-research-actions">' +
      '<button type="button" class="st-chip" data-bookmark="' +
      esc(entityId) +
      '" data-title="' +
      esc(title) +
      '">' +
      (booked ? "Remove bookmark" : "Bookmark") +
      "</button> " +
      '<button type="button" class="st-chip" data-collect="' +
      esc(entityId) +
      '" data-title="' +
      esc(title) +
      '">Add to collection</button> ' +
      '<button type="button" class="st-chip" data-pin="' +
      esc(entityId) +
      '" data-title="' +
      esc(title) +
      '">Pin to timeline</button> ' +
      '<button type="button" class="st-chip" data-note="' +
      esc(entityId) +
      '" data-title="' +
      esc(title) +
      '">Add note</button>' +
      "</div>"
    );
  }

  function renderExplainability(entity) {
    if (!entity) return "";
    var x = entity.explainability || {};
    return (
      '<div class="st-x-explain">' +
      "<h3>Explainability</h3>" +
      "<p><strong>What is it?</strong> " +
      esc(x.whatIsIt || entity.summary || "") +
      "</p>" +
      "<p><strong>Why it matters?</strong> " +
      esc(x.whyItMatters || "") +
      "</p>" +
      "<p><strong>Who is affected?</strong> " +
      esc(x.whoIsAffected || "") +
      "</p>" +
      "<p><strong>Known facts</strong></p><ul>" +
      (x.knownFacts || [])
        .map(function (f) {
          return "<li>" + esc(f) + "</li>";
        })
        .join("") +
      "</ul>" +
      "<p><strong>Uncertain / unknown</strong></p><ul>" +
      (x.unknown || [])
        .concat(x.uncertain ? [x.uncertain] : [])
        .map(function (f) {
          return "<li>" + esc(f) + "</li>";
        })
        .join("") +
      "</ul>" +
      "<p class=\"st-muted\">Updated " +
      esc(entity.updatedAt || "—") +
      " · Confidence " +
      esc(entity.confidence || "—") +
      "</p>" +
      (entity.citations && entity.citations.length
        ? "<p><strong>Sources</strong></p><ul>" +
          entity.citations
            .map(function (c) {
              return (
                "<li>" +
                (c.url
                  ? '<a href="' + esc(c.url) + '">' + esc(c.label) + "</a>"
                  : esc(c.label)) +
                " <span class=\"st-muted\">(" +
                esc(c.kind) +
                ")</span></li>"
              );
            })
            .join("") +
          "</ul>"
        : "") +
      "</div>"
    );
  }

  function renderEdgeExplain(ex) {
    return (
      '<div class="st-x-edge-explain">' +
      "<h4>Why is this connected?</h4>" +
      "<p>" +
      esc(ex.whyConnected) +
      "</p>" +
      "<p><strong>Origin:</strong> " +
      esc(ex.originated) +
      "</p>" +
      "<p><strong>Confidence:</strong> " +
      esc(ex.confidence) +
      "</p>" +
      "<p><strong>Updated:</strong> " +
      esc(ex.updatedAt || "see linked entities") +
      "</p>" +
      (ex.sources.length
        ? "<p><strong>Supporting sources</strong></p><ul>" +
          ex.sources
            .map(function (c) {
              return "<li>" + esc(c.label) + "</li>";
            })
            .join("") +
          "</ul>"
        : "<p class=\"st-muted\">No citation rows on the linked entities for this edge.</p>") +
      "</div>"
    );
  }

  function productDetailHtml(graph, entity) {
    var neighbors = graph.neighbors(entity.id, { bidirectional: true });
    var advisories = neighbors.filter(function (n) {
      return n.entity && (n.entity.kind === "vendor-advisory" || n.edge.type === "linked_advisory");
    });
    var vulns = neighbors.filter(function (n) {
      return n.entity && (n.entity.kind === "cve" || n.entity.kind === "vulnerability");
    });
    var mitigations = neighbors.filter(function (n) {
      return n.entity && (n.entity.kind === "mitigation" || n.entity.kind === "patch");
    });
    var related = neighbors.filter(function (n) {
      return n.entity && n.entity.kind === "affected-software" && n.entity.id !== entity.id;
    });
    return (
      '<article class="st-x-detail">' +
      "<h2>" +
      esc(entity.title) +
      "</h2>" +
      '<p class="st-badge">Product explorer</p>' +
      researchActionsHtml(entity.id, entity.title) +
      "<h3>Overview</h3><p>" +
      esc(entity.summary) +
      "</p>" +
      "<h3>Current Advisories</h3>" +
      (advisories.length
        ? "<ul>" +
          advisories
            .map(function (n) {
              return (
                "<li><button type=\"button\" data-goto-entity=\"" +
                esc(n.entity.id) +
                '">' +
                esc(n.entity.title) +
                "</button> · " +
                esc(n.edge.type) +
                "</li>"
              );
            })
            .join("") +
          "</ul>"
        : '<p class="st-muted">No advisory links in this neighborhood.</p>') +
      "<h3>Historical Vulnerabilities</h3>" +
      (vulns.length
        ? "<ul>" +
          vulns
            .map(function (n) {
              return (
                "<li><button type=\"button\" data-goto-entity=\"" +
                esc(n.entity.id) +
                '">' +
                esc(n.entity.title) +
                "</button></li>"
              );
            })
            .join("") +
          "</ul>"
        : '<p class="st-muted">No vulnerability links in this neighborhood.</p>') +
      "<h3>Known Mitigations</h3>" +
      (mitigations.length
        ? "<ul>" +
          mitigations
            .map(function (n) {
              return "<li>" + esc(n.entity.title) + " (" + esc(n.entity.kind) + ")</li>";
            })
            .join("") +
          "</ul>"
        : '<p class="st-muted">No mitigation/patch neighbors yet.</p>') +
      "<h3>Vendor Guidance</h3><p class=\"st-muted\">See citations and advisory neighbors — guidance stays attributed.</p>" +
      "<h3>Timeline</h3><ul>" +
      (entity.history || [])
        .map(function (h) {
          return "<li><strong>" + esc(h.at) + "</strong> — " + esc(h.summary) + "</li>";
        })
        .join("") +
      "</ul>" +
      "<h3>Related Products</h3>" +
      (related.length
        ? "<ul>" +
          related
            .map(function (n) {
              return (
                '<li><button type="button" data-goto-panel="product/' +
                esc(n.entity.id) +
                '">' +
                esc(n.entity.title) +
                "</button></li>"
              );
            })
            .join("") +
          "</ul>"
        : '<p class="st-muted">No sibling product edges in this neighborhood.</p>') +
      "<h3>Related Technologies</h3><p class=\"st-muted\">Aliases: " +
      esc((entity.aliases || []).join(", ") || "—") +
      "</p>" +
      "<h3>Learning Resources</h3>" +
      renderExplainability(entity) +
      "</article>"
    );
  }

  function campaignDetailHtml(graph, entity) {
    var neighbors = graph.neighbors(entity.id, { bidirectional: true });
    var malware = neighbors.filter(function (n) {
      return (
        n.entity &&
        (n.entity.kind === "malware-family" ||
          n.entity.kind === "ransomware-family" ||
          n.entity.kind === "threat")
      );
    });
    var techniques = neighbors.filter(function (n) {
      return n.entity && n.entity.kind === "exploit-technique";
    });
    var industries = neighbors.filter(function (n) {
      return n.entity && n.entity.kind === "industry";
    });
    var mitigations = neighbors.filter(function (n) {
      return n.entity && (n.entity.kind === "mitigation" || n.entity.kind === "patch");
    });
    var x = entity.explainability || {};
    return (
      '<article class="st-x-detail">' +
      "<h2>" +
      esc(entity.title) +
      "</h2>" +
      '<p class="st-badge">Threat campaign explorer</p>' +
      researchActionsHtml(entity.id, entity.title) +
      "<h3>Summary</h3><p>" +
      esc(entity.summary) +
      "</p>" +
      "<h3>Facts</h3><ul>" +
      (x.knownFacts || [])
        .map(function (f) {
          return "<li>" + esc(f) + "</li>";
        })
        .join("") +
      "</ul>" +
      "<h3>Analysis (owner / interpretive)</h3><p>" +
      esc((entity.ownerAnalysis && entity.ownerAnalysis.text) || "No separate owner analysis on this entity.") +
      "</p>" +
      "<p class=\"st-muted\">Analysis is labeled separately from Known Facts.</p>" +
      "<h3>Timeline</h3><ul>" +
      (entity.history || [])
        .map(function (h) {
          return "<li><strong>" + esc(h.at) + "</strong> — " + esc(h.summary) + "</li>";
        })
        .join("") +
      "</ul>" +
      "<h3>Associated malware</h3>" +
      (malware.length
        ? "<ul>" +
          malware
            .map(function (n) {
              return "<li>" + esc(n.entity.title) + "</li>";
            })
            .join("") +
          "</ul>"
        : '<p class="st-muted">None linked in this neighborhood.</p>') +
      "<h3>Known techniques</h3>" +
      (techniques.length
        ? "<ul>" +
          techniques
            .map(function (n) {
              return "<li>" + esc(n.entity.title) + "</li>";
            })
            .join("") +
          "</ul>"
        : '<p class="st-muted">None linked in this neighborhood.</p>') +
      "<h3>Targeted industries</h3>" +
      (industries.length
        ? "<ul>" +
          industries
            .map(function (n) {
              return "<li>" + esc(n.entity.title) + "</li>";
            })
            .join("") +
          "</ul>"
        : "<p>" + esc((entity.industries || []).join(", ") || "Not asserted beyond citations.") + "</p>") +
      "<h3>Regions</h3><p>" +
      esc((entity.regions || []).join(", ") || "global (coarse)") +
      " — awareness only, never precise victims.</p>" +
      "<h3>Public reporting / References</h3>" +
      renderExplainability(entity) +
      "<h3>Mitigations</h3>" +
      (mitigations.length
        ? "<ul>" +
          mitigations
            .map(function (n) {
              return "<li>" + esc(n.entity.title) + "</li>";
            })
            .join("") +
          "</ul>"
        : '<p class="st-muted">See related patches in the relationship graph.</p>') +
      "<h3>Confidence assessment</h3><p>" +
      esc(entity.confidence || "moderate") +
      " — confidence stays separate from severity.</p>" +
      "</article>"
    );
  }

  function mountExplorer(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Opening Cyber Intelligence Explorer…</p>';

    var base = options.base || "../../design-system/signalterrain/intelligence/cyber/";
    var explorerBase = options.explorerBase || base + "explorer/";
    var G = GraphApi();
    var R = Research();
    if (!G) {
      root.innerHTML = '<p role="alert">Cyber graph runtime failed to load.</p>';
      root.removeAttribute("aria-busy");
      return Promise.resolve();
    }

    var teaching =
      options.allowSamples ||
      /(?:\?|&)teaching=1(?:&|$)/.test(String(global.location && global.location.search));
    var liveGraphUrl = options.liveGraphUrl || "../../../data/cyber/graph.json";
    var graphUrl = teaching
      ? base + "samples/cyber-intelligence.sample.json"
      : liveGraphUrl;

    var state = {
      panel: "overview",
      focusId: options.initialId || (teaching ? "cy_cve-2021-44228" : ""),
      expanded: {},
      typeFilters: [],
      timelineFilters: {
        severity: "all",
        eventKind: "all",
        region: "all",
        industry: "all",
        vendorNeedle: "",
        techNeedle: "",
        from: "",
        to: ""
      },
      timelineOffset: 0,
      mapLayersEnabled: {},
      mapLoaded: false,
      mapDoc: null,
      selectedEdgeId: null,
      relKinds: [],
      teaching: teaching
    };

    return Promise.all([
      G.loadBundle(graphUrl),
      loadJson(explorerBase + "navigation.json"),
      loadJson(base + "relationship-kinds.json"),
      teaching
        ? loadJson(base + "samples/research-workspace.sample.json").catch(function () {
            return { items: [] };
          })
        : Promise.resolve({ items: [] })
    ]).then(function (parts) {
      var loaded = parts[0];
      var nav = parts[1];
      var relDoc = parts[2];
      var researchSample = parts[3];
      var graph = loaded.graph;
      state.relKinds = relDoc.kinds || [];
      if (R) R.loadSeed(researchSample.items || []);
      if (!state.focusId || !graph.get(state.focusId)) {
        var preferred =
          graph.byKind("kev-entry")[0] ||
          graph.byKind("vulnerability")[0] ||
          graph.listEntities()[0];
        state.focusId = preferred ? preferred.id : "";
      }
      if (state.focusId) state.expanded[state.focusId] = true;

      // Restore expanded cache if present
      if (R) {
        var cached = R.cacheGet("cyber_explorer_expanded");
        if (cached && cached.value) state.expanded = Object.assign({}, state.expanded, cached.value);
      }

      function visibleNodeIds() {
        var ids = {};
        ids[state.focusId] = true;
        Object.keys(state.expanded).forEach(function (id) {
          if (!state.expanded[id]) return;
          ids[id] = true;
          graph.neighbors(id, { bidirectional: true }).forEach(function (n) {
            if (!n.entity) return;
            if (state.typeFilters.length && state.typeFilters.indexOf(n.edge.type) === -1) return;
            ids[n.entity.id] = true;
          });
        });
        return ids;
      }

      function visibleNodes() {
        var ids = visibleNodeIds();
        return Object.keys(ids)
          .map(function (id) {
            return graph.get(id);
          })
          .filter(Boolean);
      }

      function visibleEdges() {
        var ids = visibleNodeIds();
        return (graph.relationships || []).filter(function (e) {
          if (state.typeFilters.length && state.typeFilters.indexOf(e.type) === -1) return false;
          return ids[e.from] && ids[e.to];
        });
      }

      function ensureMap() {
        if (state.mapDoc) return Promise.resolve(state.mapDoc);
        if (R) {
          var cached = R.cacheGet(LAYER_CACHE_KEY);
          if (cached && cached.value) {
            state.mapDoc = cached.value;
            state.mapLoaded = true;
            return Promise.resolve(state.mapDoc);
          }
        }
        return loadJson(explorerBase + "map-layers.json").then(function (doc) {
          state.mapDoc = doc;
          state.mapLoaded = true;
          if (R) R.cacheSet(LAYER_CACHE_KEY, doc);
          (doc.layers || []).forEach(function (layer) {
            if (state.mapLayersEnabled[layer.id] == null) state.mapLayersEnabled[layer.id] = true;
          });
          return doc;
        });
      }

      function bindResearch(container) {
        container.querySelectorAll("[data-bookmark]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (!R) return;
            R.toggleBookmark(btn.getAttribute("data-bookmark"), btn.getAttribute("data-title"));
            paint();
          });
        });
        container.querySelectorAll("[data-collect]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (!R) return;
            var id = btn.getAttribute("data-collect");
            R.ensureCollection("rw_local_collection_explorer", "Explorer saved", [id]);
            R.addToCollection("rw_local_collection_explorer", id);
            paint();
          });
        });
        container.querySelectorAll("[data-pin]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (!R) return;
            R.pinTimeline(btn.getAttribute("data-pin"), btn.getAttribute("data-title"));
            paint();
          });
        });
        container.querySelectorAll("[data-note]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (!R) return;
            var body = global.prompt("Private note (stored locally):", "");
            if (body == null) return;
            R.addNote(btn.getAttribute("data-note"), body, "Note · " + btn.getAttribute("data-title"));
            paint();
          });
        });
      }

      function renderNav() {
        var route = parseHash();
        state.panel = route.panel;
        return (
          '<nav class="st-cyber-nav st-x-nav" aria-label="Intelligence Explorer">' +
          "<ul>" +
          (nav.panels || [])
            .map(function (p) {
              var current =
                route.panel === p.id ||
                (route.detail === "product" && p.id === "products") ||
                (route.detail === "campaign" && p.id === "campaigns");
              return (
                "<li><a href=\"#" +
                esc(p.id) +
                '"' +
                (current ? ' aria-current="page"' : "") +
                ">" +
                esc(p.label) +
                "</a></li>"
              );
            })
            .join("") +
          "</ul></nav>"
        );
      }

      function renderOverview() {
        var kinds = graph.listKinds();
        var chain = graph.traverseAttentionChain("cy_cve-2021-44228");
        return (
          "<h2>Cyber Terrain — Overview</h2>" +
          '<p class="st-lead">What is happening, where (coarsely), who is affected, how events relate, what changed, and what to learn next.</p>' +
          '<p class="st-badge">Educational map of relationships — not a news feed, not fear theater.</p>' +
          "<p>Entity kinds in graph: " +
          esc(JSON.stringify(kinds)) +
          "</p>" +
          "<h3>Example attention chain (shared graph API)</h3><ol>" +
          ((chain.steps || [])
            .map(function (s) {
              return "<li>" + esc(s.role) + ": " + esc(s.entity.title) + "</li>";
            })
            .join("") || "<li>Unavailable</li>") +
          "</ol>" +
          "<p><button type=\"button\" class=\"st-chip\" data-goto-panel=\"graph\">Open relationship graph</button> " +
          '<button type="button" class="st-chip" data-goto-panel="timeline">Open timeline</button> ' +
          '<button type="button" class="st-chip" data-goto-panel="map">Open world map</button></p>'
        );
      }

      function renderGraph() {
        var nodes = visibleNodes();
        var edges = visibleEdges();
        var focus = graph.get(state.focusId);
        var focusNeighbors = graph.neighbors(state.focusId, { bidirectional: true });
        var typeOpts = state.relKinds.filter(function (k) {
          return (graph.relationships || []).some(function (e) {
            return e.type === k.id;
          });
        });
        var selectedEdge =
          edges.filter(function (e) {
            return e.id === state.selectedEdgeId;
          })[0] || edges[0];
        var edgeExplain = selectedEdge
          ? explainEdge(selectedEdge, graph.get(selectedEdge.from), graph.get(selectedEdge.to))
          : null;

        return (
          "<h2>Relationship Graph</h2>" +
          '<p class="st-muted">Incremental expansion via shared neighbors() — no duplicated traversal rules.</p>' +
          '<div class="st-explorer-toolbar">' +
          '<div class="st-filter-block"><span>Relationship types</span><div class="st-chip-row">' +
          typeOpts
            .map(function (t) {
              var on = state.typeFilters.indexOf(t.id) !== -1;
              return (
                '<button type="button" class="st-chip' +
                (on ? " is-active" : "") +
                '" data-type-filter="' +
                esc(t.id) +
                '">' +
                esc(t.id) +
                "</button>"
              );
            })
            .join("") +
          '<button type="button" class="st-chip" data-clear-types>All types</button></div></div></div>' +
          '<div class="st-explorer-grid">' +
          '<section class="st-graph-panel"><h3>Visible entities (' +
          nodes.length +
          ")</h3><ul class=\"st-graph-nodes\">" +
          nodes
            .map(function (t) {
              var nCount = graph.neighbors(t.id, { bidirectional: true }).length;
              return (
                '<li class="' +
                (t.id === state.focusId ? "is-focus" : "") +
                '">' +
                '<button type="button" class="st-node-title" data-focus="' +
                esc(t.id) +
                '">' +
                esc(t.title) +
                "</button>" +
                ' <span class="st-muted">' +
                esc(t.kind) +
                "</span> " +
                '<button type="button" data-expand="' +
                esc(t.id) +
                '">' +
                (state.expanded[t.id] ? "Collapse" : "Expand") +
                " (" +
                nCount +
                ")</button></li>"
              );
            })
            .join("") +
          "</ul>" +
          "<h3>Visible relationships (" +
          edges.length +
          ')</h3><ul class="st-graph-edges">' +
          edges
            .map(function (e) {
              var a = graph.get(e.from);
              var b = graph.get(e.to);
              return (
                "<li><button type=\"button\" data-select-edge=\"" +
                esc(e.id) +
                '"><strong>' +
                esc(e.type) +
                "</strong></button> · " +
                esc(a && a.title) +
                " → " +
                esc(b && b.title) +
                ' <span class="st-muted">(' +
                esc(e.confidence || "moderate") +
                ")</span></li>"
              );
            })
            .join("") +
          "</ul></section>" +
          '<section class="st-graph-panel"><h3>Focus</h3>' +
          (focus
            ? "<h4>" +
              esc(focus.title) +
              "</h4><p>" +
              esc(focus.summary) +
              "</p>" +
              researchActionsHtml(focus.id, focus.title) +
              "<h4>Every visible relationship from focus</h4><ul>" +
              focusNeighbors
                .map(function (n) {
                  if (!n.entity) return "";
                  var ex = explainEdge(n.edge, focus, n.entity);
                  return (
                    "<li><strong>" +
                    esc(n.edge.type) +
                    "</strong> (" +
                    esc(n.direction) +
                    ") → " +
                    '<button type="button" data-focus="' +
                    esc(n.entity.id) +
                    '">' +
                    esc(n.entity.title) +
                    "</button>" +
                    renderEdgeExplain(ex) +
                    "</li>"
                  );
                })
                .join("") +
              "</ul>" +
              renderExplainability(focus)
            : "<p>Select a node.</p>") +
          (edgeExplain ? "<h4>Selected edge</h4>" + renderEdgeExplain(edgeExplain) : "") +
          "</section></div>"
        );
      }

      function renderTimeline() {
        var all = collectTimeline(graph);
        var filtered = filterTimeline(all, state.timelineFilters);
        var slice = filtered.slice(state.timelineOffset, state.timelineOffset + TIMELINE_PAGE);
        var industries = {};
        all.forEach(function (ev) {
          (ev.industries || []).forEach(function (i) {
            industries[i] = true;
          });
        });
        return (
          "<h2>Timeline Explorer</h2>" +
          '<p class="st-muted">Virtualized window of ' +
          TIMELINE_PAGE +
          " events · " +
          filtered.length +
          " match filters.</p>" +
          '<form class="st-x-filters" id="st-x-timeline-filters">' +
          "<label>Severity <select name=\"severity\">" +
          ["all", "info", "notice", "elevated", "critical"]
            .map(function (s) {
              return (
                '<option value="' +
                s +
                '"' +
                (state.timelineFilters.severity === s ? " selected" : "") +
                ">" +
                s +
                "</option>"
              );
            })
            .join("") +
          "</select></label> " +
          "<label>Event kind <select name=\"eventKind\">" +
          [
            "all",
            "disclosure",
            "public-advisory",
            "patch-release",
            "known-exploitation",
            "mitigation-update",
            "additional-affected-products",
            "historical-milestone"
          ]
            .map(function (s) {
              return (
                '<option value="' +
                s +
                '"' +
                (state.timelineFilters.eventKind === s ? " selected" : "") +
                ">" +
                s +
                "</option>"
              );
            })
            .join("") +
          "</select></label> " +
          "<label>Region <select name=\"region\">" +
          ["all", "global", "north-america", "europe", "asia-pacific"]
            .map(function (s) {
              return (
                '<option value="' +
                s +
                '"' +
                (state.timelineFilters.region === s ? " selected" : "") +
                ">" +
                s +
                "</option>"
              );
            })
            .join("") +
          "</select></label> " +
          "<label>Industry <select name=\"industry\"><option value=\"all\">all</option>" +
          Object.keys(industries)
            .map(function (i) {
              return (
                '<option value="' +
                esc(i) +
                '"' +
                (state.timelineFilters.industry === i ? " selected" : "") +
                ">" +
                esc(i) +
                "</option>"
              );
            })
            .join("") +
          "</select></label> " +
          '<label>Vendor <input name="vendorNeedle" value="' +
          esc(state.timelineFilters.vendorNeedle) +
          '" /></label> ' +
          '<label>Technology <input name="techNeedle" value="' +
          esc(state.timelineFilters.techNeedle) +
          '" /></label> ' +
          '<label>From <input name="from" placeholder="YYYY" value="' +
          esc(state.timelineFilters.from) +
          '" /></label> ' +
          '<label>To <input name="to" placeholder="YYYY" value="' +
          esc(state.timelineFilters.to) +
          '" /></label> ' +
          '<button type="submit" class="st-chip">Apply filters</button></form>' +
          '<ol class="st-timeline">' +
          slice
            .map(function (ev) {
              return (
                "<li>" +
                '<span class="st-timeline-at">' +
                esc(ev.at) +
                " · " +
                esc(ev.eventKind) +
                "</span>" +
                '<span class="st-timeline-text">' +
                esc(ev.title) +
                "</span>" +
                (ev.subjectId
                  ? ' <button type="button" data-goto-entity="' +
                    esc(ev.subjectId) +
                    '">Open subject</button>'
                  : "") +
                ' <span class="st-muted">conf ' +
                esc(ev.confidence) +
                "</span></li>"
              );
            })
            .join("") +
          "</ol>" +
          (filtered.length > state.timelineOffset + TIMELINE_PAGE
            ? '<button type="button" class="st-chip" data-timeline-more>Load more</button>'
            : '<p class="st-muted">End of filtered window.</p>')
        );
      }

      function renderMap(doc) {
        var width = 720;
        var height = 360;
        var markers = [];
        (doc.layers || []).forEach(function (layer) {
          if (!state.mapLayersEnabled[layer.id]) return;
          (layer.markers || []).forEach(function (m) {
            markers.push(Object.assign({ layerId: layer.id, layerLabel: layer.label }, m));
          });
        });
        return (
          "<h2>World Map — geographic awareness</h2>" +
          '<p class="st-badge">' +
          esc(doc.meta.disclaimer) +
          "</p>" +
          '<p class="st-muted">Independent layers · coarse precision only · never precise victims.</p>' +
          '<div class="st-chip-row">' +
          (doc.layers || [])
            .map(function (layer) {
              var on = !!state.mapLayersEnabled[layer.id];
              return (
                '<button type="button" class="st-chip' +
                (on ? " is-active" : "") +
                '" data-toggle-layer="' +
                esc(layer.id) +
                '">' +
                esc(layer.label) +
                "</button>"
              );
            })
            .join("") +
          "</div>" +
          '<div class="st-x-map" role="img" aria-label="Educational world awareness map">' +
          '<svg viewBox="0 0 ' +
          width +
          " " +
          height +
          '" width="100%" height="auto">' +
          '<rect width="' +
          width +
          '" height="' +
          height +
          '" fill="#e8e4da"/>' +
          '<path fill="#d5d0c4" d="M80,80 h200 v120 h-200 z M320,60 h180 v100 h-180 z M540,100 h120 v140 h-120 z M100,240 h160 v80 h-160 z M340,220 h200 v90 h-200 z"/>' +
          markers
            .map(function (m) {
              var p = projectLonLat(m.lon, m.lat, width, height);
              return (
                '<g class="st-x-marker">' +
                '<circle cx="' +
                p.x +
                '" cy="' +
                p.y +
                '" r="7" fill="#3a5348" opacity="0.85"/>' +
                '<title>' +
                esc(m.label) +
                " (" +
                esc(m.precision) +
                ")</title></g>"
              );
            })
            .join("") +
          "</svg></div>" +
          "<h3>Markers (" +
          markers.length +
          ")</h3><ul class=\"st-cyber-list\">" +
          markers
            .map(function (m) {
              return (
                "<li><strong>" +
                esc(m.label) +
                "</strong> <span class=\"st-muted\">" +
                esc(m.kind) +
                " · " +
                esc(m.precision) +
                " · " +
                esc(m.confidence) +
                "</span><p>" +
                esc(m.summary) +
                "</p>" +
                (m.subjectIds || [])
                  .map(function (id) {
                    return (
                      '<button type="button" data-goto-entity="' +
                      esc(id) +
                      '">' +
                      esc(id) +
                      "</button> "
                    );
                  })
                  .join("") +
                "</li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function listPanel(title, kinds, detailPrefix) {
        var items = [];
        kinds.forEach(function (k) {
          items = items.concat(graph.byKind(k));
        });
        return (
          "<h2>" +
          esc(title) +
          "</h2><ul class=\"st-cyber-list\">" +
          items
            .map(function (e) {
              var href =
                detailPrefix === "product"
                  ? "product/" + e.id
                  : detailPrefix === "campaign"
                    ? "campaign/" + e.id
                    : "entity/" + e.id;
              return (
                "<li><button type=\"button\" data-goto-panel=\"" +
                esc(href) +
                '"><strong>' +
                esc(e.title) +
                "</strong></button> <span class=\"st-badge\">" +
                esc(e.kind) +
                "</span><p>" +
                esc(e.summary) +
                "</p></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function renderResearch() {
        var items = R ? R.list({ domain: "cyber" }) : [];
        return (
          "<h2>Research workspace</h2>" +
          '<p class="st-muted">Shared SignalTerrain research components — bookmarks, notes, pins, citations. Local-first.</p>' +
          "<ul class=\"st-cyber-list\">" +
          items
            .map(function (it) {
              return (
                "<li><strong>" +
                esc(it.title) +
                "</strong> <span class=\"st-badge\">" +
                esc(it.kind) +
                (it.readingStatus ? " · " + esc(it.readingStatus) : "") +
                "</span>" +
                (it.body ? "<p>" + esc(it.body) + "</p>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function renderCollections() {
        var cols = R ? R.list({ kind: "collection" }) : [];
        return (
          "<h2>Saved Collections</h2><ul class=\"st-cyber-list\">" +
          cols
            .map(function (c) {
              return (
                "<li><strong>" +
                esc(c.title) +
                "</strong><p>Members: " +
                esc((c.memberIds || []).join(", ") || "—") +
                "</p></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function renderBody() {
        var route = parseHash();
        state.panel = route.panel;
        if (route.detail === "product" && route.id) {
          var prod = graph.get(route.id);
          return prod
            ? productDetailHtml(graph, prod)
            : '<p role="alert">Product not found.</p>';
        }
        if (route.detail === "campaign" && route.id) {
          var camp = graph.get(route.id);
          return camp
            ? campaignDetailHtml(graph, camp)
            : '<p role="alert">Campaign not found.</p>';
        }
        if (route.detail === "entity" && route.id) {
          var ent = graph.get(route.id);
          if (!ent) return '<p role="alert">Entity not found.</p>';
          if (ent.kind === "affected-software") return productDetailHtml(graph, ent);
          if (ent.kind === "threat-campaign") return campaignDetailHtml(graph, ent);
          return (
            "<h2>" +
            esc(ent.title) +
            "</h2><p>" +
            esc(ent.summary) +
            "</p>" +
            researchActionsHtml(ent.id, ent.title) +
            renderExplainability(ent) +
            '<p><button type="button" class="st-chip" data-focus="' +
            esc(ent.id) +
            '" data-goto-panel="graph">View in graph</button></p>'
          );
        }
        if (state.panel === "overview") return renderOverview();
        if (state.panel === "graph") return renderGraph();
        if (state.panel === "timeline") return renderTimeline();
        if (state.panel === "map") {
          if (!state.mapDoc) {
            return '<p class="st-loading">Loading map layers…</p>';
          }
          return renderMap(state.mapDoc);
        }
        if (state.panel === "organizations")
          return listPanel("Organizations & publishers", ["source", "vendor-advisory"], "entity");
        if (state.panel === "products")
          return listPanel("Products", ["affected-software", "affected-hardware"], "product");
        if (state.panel === "vulnerabilities")
          return listPanel("Vulnerabilities", ["cve", "vulnerability", "kev-entry"], "entity");
        if (state.panel === "campaigns")
          return listPanel("Threat Campaigns", ["threat-campaign"], "campaign");
        if (state.panel === "research") return renderResearch();
        if (state.panel === "collections") return renderCollections();
        return "<p>Unknown panel.</p>";
      }

      function paint() {
        var modeBadge = state.teaching
          ? '<p class="st-badge" role="status">Teaching samples only — not live intelligence. <a href="live.html">Open live intelligence</a>.</p>'
          : '<p class="st-badge" role="status">Live public intelligence graph · local-first research. Teaching samples stay on <a href="teaching.html">teaching.html</a>.</p>';
        root.innerHTML =
          '<div class="st-x-explorer">' +
          '<header class="st-demo-header">' +
          "<h1>Cyber Intelligence Explorer</h1>" +
          '<p class="st-lead">Explore relationships, timelines, and coarse geographic awareness — calmly.</p>' +
          modeBadge +
          "</header>" +
          renderNav() +
          '<div class="st-x-body" id="st-x-body">' +
          renderBody() +
          "</div></div>";

        bindResearch(root);

        root.querySelectorAll("[data-goto-panel]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            setHash(btn.getAttribute("data-goto-panel"));
          });
        });
        root.querySelectorAll("[data-goto-entity]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-goto-entity");
            var e = graph.get(id);
            if (e && e.kind === "affected-software") setHash("product/" + id);
            else if (e && e.kind === "threat-campaign") setHash("campaign/" + id);
            else setHash("entity/" + id);
          });
        });
        root.querySelectorAll("[data-focus]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.focusId = btn.getAttribute("data-focus");
            state.expanded[state.focusId] = true;
            if (R) R.cacheSet("cyber_explorer_expanded", state.expanded);
            if (state.panel !== "graph") setHash("graph");
            else paint();
          });
        });
        root.querySelectorAll("[data-expand]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-expand");
            state.expanded[id] = !state.expanded[id];
            if (R) R.cacheSet("cyber_explorer_expanded", state.expanded);
            paint();
          });
        });
        root.querySelectorAll("[data-type-filter]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var t = btn.getAttribute("data-type-filter");
            var i = state.typeFilters.indexOf(t);
            if (i === -1) state.typeFilters.push(t);
            else state.typeFilters.splice(i, 1);
            paint();
          });
        });
        var clearTypes = root.querySelector("[data-clear-types]");
        if (clearTypes)
          clearTypes.addEventListener("click", function () {
            state.typeFilters = [];
            paint();
          });
        root.querySelectorAll("[data-select-edge]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.selectedEdgeId = btn.getAttribute("data-select-edge");
            paint();
          });
        });
        var form = root.querySelector("#st-x-timeline-filters");
        if (form) {
          form.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(form);
            state.timelineFilters = {
              severity: fd.get("severity") || "all",
              eventKind: fd.get("eventKind") || "all",
              region: fd.get("region") || "all",
              industry: fd.get("industry") || "all",
              vendorNeedle: fd.get("vendorNeedle") || "",
              techNeedle: fd.get("techNeedle") || "",
              from: fd.get("from") || "",
              to: fd.get("to") || ""
            };
            state.timelineOffset = 0;
            paint();
          });
        }
        var more = root.querySelector("[data-timeline-more]");
        if (more)
          more.addEventListener("click", function () {
            state.timelineOffset += TIMELINE_PAGE;
            paint();
          });
        root.querySelectorAll("[data-toggle-layer]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-toggle-layer");
            state.mapLayersEnabled[id] = !state.mapLayersEnabled[id];
            paint();
          });
        });

        root.removeAttribute("aria-busy");
      }

      function onHash() {
        var route = parseHash();
        if (route.panel === "map" && !state.mapDoc) {
          paint();
          ensureMap().then(paint);
          return;
        }
        paint();
      }

      global.addEventListener("hashchange", onHash);
      onHash();
      return { graph: graph, state: state };
    })
      .catch(function (err) {
        root.innerHTML =
          '<p role="alert">Could not open the explorer against live intelligence. ' +
          String((err && err.message) || "Live graph unavailable.") +
          ' Sample data was not substituted. <a href="live.html">Live intelligence</a> · ' +
          '<a href="teaching.html">Teaching samples</a> · ' +
          '<button type="button" onclick="location.reload()">Retry</button></p>';
        root.removeAttribute("aria-busy");
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberExplorer = {
    mountExplorer: mountExplorer,
    collectTimeline: collectTimeline,
    filterTimeline: filterTimeline,
    explainEdge: explainEdge,
    eventKindFromEntity: eventKindFromEntity,
    projectLonLat: projectLonLat
  };
})(typeof window !== "undefined" ? window : globalThis);
