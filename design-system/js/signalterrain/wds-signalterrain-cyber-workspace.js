/**
 * SignalTerrain Cyber Operations Workspace V1.0
 * Personal investigation environment — not a SOC, SIEM, or IR platform.
 * Content lives in the shared research store; layout prefs are separate.
 */
(function (global) {
  "use strict";

  var DEFAULT_PANEL_ORDER = [
    "brief",
    "recent-intel",
    "investigations",
    "reading-queue",
    "pinned",
    "collections",
    "timeline",
    "watchlists",
    "notes",
    "learning"
  ];

  function Util() {
    return global.WDS && global.WDS.signalTerrainUtil;
  }

  function Research() {
    return global.WDS && global.WDS.signalTerrainResearch;
  }

  function GraphApi() {
    return global.WDS && global.WDS.signalTerrainCyberGraph;
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

  function parseHash() {
    var u = Util();
    if (u && u.parseHash) {
      var raw = u.parseHash();
      return { panel: raw.panel || "dashboard", id: raw.id || null };
    }
    var h = String(global.location.hash || "").replace(/^#/, "");
    if (!h) return { panel: "dashboard", id: null };
    var parts = h.split("/");
    return { panel: parts[0] || "dashboard", id: parts[1] || null };
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

  function layoutKey() {
    var u = Util();
    return (u && u.STORAGE_KEYS && u.STORAGE_KEYS.workspaceLayout) || "st_cyber_workspace_layout_v01";
  }

  function readLayout() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(layoutKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeLayout(doc) {
    try {
      if (!global.localStorage) return false;
      global.localStorage.setItem(layoutKey(), JSON.stringify(doc));
      return true;
    } catch (e) {
      return false;
    }
  }

  function defaultLayout(panelsDoc) {
    var hidden = {};
    (panelsDoc.panels || []).forEach(function (p) {
      if (p.defaultVisible === false) hidden[p.id] = true;
    });
    return {
      version: 1,
      order: DEFAULT_PANEL_ORDER.slice(),
      hidden: hidden,
      updatedAt: new Date().toISOString()
    };
  }

  function ensureLayout(panelsDoc) {
    var layout = readLayout() || defaultLayout(panelsDoc);
    if (!layout.order || !layout.order.length) layout.order = DEFAULT_PANEL_ORDER.slice();
    layout.hidden = layout.hidden || {};
    return layout;
  }

  function tokenize(q) {
    return String(q || "")
      .toLowerCase()
      .split(/[^a-z0-9_+:.-]+/)
      .filter(function (t) {
        return t.length > 1;
      });
  }

  function parseSearchQuery(q) {
    var filters = { kind: null, status: null, difficulty: null, priority: null, type: null };
    var rest = [];
    String(q || "")
      .trim()
      .split(/\s+/)
      .forEach(function (tok) {
        var m = tok.match(/^(kind|status|difficulty|priority|type):(.+)$/i);
        if (m) {
          filters[m[1].toLowerCase()] = m[2].toLowerCase();
        } else if (tok) {
          rest.push(tok);
        }
      });
    return { filters: filters, text: rest.join(" ") };
  }

  function estimateReadingMinutes(text) {
    var words = String(text || "").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200) || 1);
  }

  function sortByUpdated(items) {
    return (items || []).slice().sort(function (a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
  }

  function recentIntel(graph, limit) {
    limit = limit || 8;
    if (!graph || !graph.listEntities) return [];
    var scored = graph.listEntities().map(function (e) {
      var hist = (e.history || [])[0];
      return {
        entity: e,
        at: (hist && hist.at) || e.updatedAt || e.createdAt || ""
      };
    });
    scored.sort(function (a, b) {
      return String(b.at).localeCompare(String(a.at));
    });
    return scored.slice(0, limit);
  }

  function buildPersonalTimeline(R, limit) {
    limit = limit || 24;
    var events = [];
    R.list({}).forEach(function (it) {
      if (it.kind === "activity") {
        events.push({
          id: it.id,
          at: it.updatedAt || it.createdAt,
          title: it.title,
          detail: it.body || it.activityType || "",
          type: it.activityType || "activity",
          refId: (it.subjectIds || [])[0] || null
        });
        return;
      }
      if (it.kind === "note" || it.kind === "investigation" || it.kind === "queue-item" || it.kind === "bookmark" || it.kind === "collection" || it.kind === "watchlist" || it.kind === "timeline-pin") {
        events.push({
          id: "derived_" + it.id,
          at: it.updatedAt || it.createdAt,
          title: it.kind + ": " + it.title,
          detail: "Updated in your local workspace",
          type: it.kind,
          refId: it.id
        });
      }
      if (it.kind === "queue-item" && it.readingStatus === "done") {
        events.push({
          id: "read_" + it.id,
          at: it.updatedAt,
          title: "Completed reading: " + it.title,
          detail: "",
          type: "reading-completed",
          refId: it.id
        });
      }
    });
    events.sort(function (a, b) {
      return String(b.at || "").localeCompare(String(a.at || ""));
    });
    var seen = {};
    return events.filter(function (e) {
      var k = e.title + "|" + e.at;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    }).slice(0, limit);
  }

  function unifiedSearch(opts) {
    opts = opts || {};
    var parsed = parseSearchQuery(opts.query || "");
    var tokens = tokenize(parsed.text);
    var results = [];
    var graph = opts.graph;
    var knowledge = opts.knowledge;
    var R = opts.research;

    function push(type, id, title, snippet, meta) {
      results.push({
        type: type,
        id: id,
        title: title,
        snippet: snippet || "",
        meta: meta || {}
      });
    }

    function textMatch(blob) {
      if (!tokens.length) return true;
      var b = String(blob || "").toLowerCase();
      return tokens.every(function (t) {
        return b.indexOf(t) >= 0;
      });
    }

    if (R) {
      R.list({}).forEach(function (it) {
        if (parsed.filters.kind && it.kind !== parsed.filters.kind) return;
        if (parsed.filters.status && String(it.investigationStatus || it.readingStatus || "").toLowerCase() !== parsed.filters.status) return;
        if (parsed.filters.difficulty && String(it.difficulty || "").toLowerCase() !== parsed.filters.difficulty) return;
        if (parsed.filters.priority && String(it.priority || "").toLowerCase() !== parsed.filters.priority) return;
        if (parsed.filters.type && parsed.filters.type !== "workspace" && parsed.filters.type !== it.kind) return;
        var blob = [it.title, it.body, it.query, (it.tags || []).join(" "), it.kind].join(" ");
        if (!textMatch(blob) && tokens.length) return;
        if (!tokens.length && !parsed.filters.kind && !parsed.filters.status) return;
        push(it.kind, it.id, it.title, (it.body || it.query || "").slice(0, 160), {
          status: it.investigationStatus || it.readingStatus || null
        });
      });
    }

    if (graph && graph.listEntities && (!parsed.filters.type || parsed.filters.type === "intelligence" || parsed.filters.type === "entity")) {
      if (!parsed.filters.kind || parsed.filters.kind.indexOf("investigation") === -1) {
        graph.listEntities().forEach(function (e) {
          if (parsed.filters.kind && parsed.filters.kind !== e.kind && parsed.filters.kind !== "entity") return;
          var blob = [e.title, e.summary, e.kind, e.id].join(" ");
          if (!textMatch(blob)) return;
          push("intelligence", e.id, e.title, e.summary || e.kind, { kind: e.kind });
        });
      }
    }

    if (knowledge && knowledge.search && (!parsed.filters.type || parsed.filters.type === "knowledge" || parsed.filters.type === "playbook" || parsed.filters.type === "article")) {
      var kOpts = { limit: 40 };
      if (parsed.filters.type === "playbook") kOpts.types = ["playbook"];
      else if (parsed.filters.type === "article") kOpts.types = ["article"];
      var kHits = knowledge.search(parsed.text || opts.query || "", kOpts) || [];
      kHits.slice(0, 40).forEach(function (h) {
        push(h.contentType || "knowledge", h.id, h.title, h.summary || h.snippet || "", {});
      });
    }

    return results.slice(0, 80);
  }

  function renderMarkdownLite(md) {
    var lines = String(md || "").split(/\n/);
    var html = "";
    var inList = false;
    lines.forEach(function (line) {
      var check = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
      var bullet = line.match(/^\s*[-*]\s+(.*)$/);
      var heading = line.match(/^##\s+(.*)$/);
      var heading3 = line.match(/^###\s+(.*)$/);
      if (check) {
        if (!inList) {
          html += "<ul class=\"st-ws-checklist\">";
          inList = true;
        }
        html +=
          "<li" +
          (check[1] !== " " ? ' class="is-done"' : "") +
          ">" +
          esc(check[2]) +
          "</li>";
        return;
      }
      if (bullet) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += "<li>" + esc(bullet[1]) + "</li>";
        return;
      }
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (heading) {
        html += "<h3>" + esc(heading[1]) + "</h3>";
        return;
      }
      if (heading3) {
        html += "<h4>" + esc(heading3[1]) + "</h4>";
        return;
      }
      if (!line.trim()) {
        html += "<p></p>";
        return;
      }
      html += "<p>" + esc(line).replace(/`([^`]+)`/g, "<code>$1</code>") + "</p>";
    });
    if (inList) html += "</ul>";
    return html;
  }

  function mountWorkspace(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Opening Cyber Operations Workspace…</p>';

    var base = options.base || "../../design-system/signalterrain/intelligence/cyber/";
    var wsBase = options.workspaceBase || base + "workspace/";
    var knowBase = options.knowledgeBase || base + "knowledge/";
    var G = GraphApi();
    var R = Research();
    if (!G || !R) {
      root.innerHTML = '<p role="alert">Graph and research runtimes are required for the workspace.</p>';
      root.removeAttribute("aria-busy");
      return Promise.resolve();
    }

    var state = {
      searchQ: "",
      queueDifficulty: "all",
      queueStatus: "all",
      noteDraft: "",
      layout: null,
      panelsDoc: null,
      templates: null,
      graph: null,
      knowledge: null
    };

    var teaching =
      options.allowSamples ||
      /(?:\?|&)teaching=1(?:&|$)/.test(String(global.location && global.location.search));
    var liveGraphUrl = options.liveGraphUrl || "../../../data/cyber/graph.json";
    var graphLoad = teaching
      ? G.loadBundle(base + "samples/cyber-intelligence.sample.json")
      : G.loadBundle(liveGraphUrl).catch(function () {
          return G.loadBundle(base + "samples/cyber-intelligence.sample.json").then(function (packed) {
            packed._fallbackTeaching = true;
            return packed;
          });
        });

    return Promise.all([
      graphLoad,
      loadJson(wsBase + "panels.json"),
      loadJson(wsBase + "investigation-templates.json"),
      teaching
        ? loadJson(wsBase + "samples/workspace.seed.json")
        : Promise.resolve({ items: [] }),
      teaching
        ? loadJson(base + "samples/research-workspace.sample.json").catch(function () {
            return { items: [] };
          })
        : Promise.resolve({ items: [] }),
      loadJson(knowBase + "encyclopedia/index.json").catch(function () {
        return { articles: [] };
      }),
      loadJson(knowBase + "playbooks/index.json").catch(function () {
        return { playbooks: [] };
      }),
      loadJson(knowBase + "incidents/index.json").catch(function () {
        return { incidents: [] };
      }),
      loadJson(knowBase + "learning-paths.json").catch(function () {
        return { paths: [] };
      })
    ]).then(function (parts) {
      state.graph = parts[0].graph;
      state.panelsDoc = parts[1];
      state.templates = parts[2];
      state.layout = ensureLayout(state.panelsDoc);

      var seed = (parts[4].items || []).concat(parts[3].items || []);
      R.loadSeed(seed);

      var Knowledge = global.WDS && global.WDS.signalTerrainCyberKnowledge;
      if (Knowledge && Knowledge.createIndex) {
        state.knowledge = Knowledge.createIndex({
          encyclopedia: parts[5],
          playbooks: parts[6],
          incidents: parts[7],
          learningPaths: parts[8],
          graph: state.graph
        });
      }

      function panelMeta(id) {
        return (
          (state.panelsDoc.panels || []).filter(function (p) {
            return p.id === id;
          })[0] || { id: id, label: id }
        );
      }

      function nav() {
        var route = parseHash();
        var panels = [
          ["dashboard", "Dashboard"],
          ["investigations", "Investigations"],
          ["watchlists", "Watchlists"],
          ["notes", "Notes"],
          ["collections", "Collections"],
          ["queue", "Reading Queue"],
          ["search", "Search"],
          ["timeline", "Timeline"]
        ];
        return (
          '<nav class="st-cyber-nav" aria-label="Cyber Operations Workspace">' +
          "<ul>" +
          panels
            .map(function (p) {
              var cur = route.panel === p[0] || (p[0] === "investigations" && route.panel === "investigation");
              return (
                "<li><a href=\"#" +
                p[0] +
                "\"" +
                (cur ? ' aria-current="page"' : "") +
                ">" +
                esc(p[1]) +
                "</a></li>"
              );
            })
            .join("") +
          "</ul></nav>"
        );
      }

      function entityLink(id) {
        var e = state.graph.get(id);
        var label = e ? e.title : id;
        return (
          '<a class="st-ws-ref" href="explorer.html#entity/' +
          encodeURIComponent(id) +
          '">' +
          esc(label) +
          "</a>"
        );
      }

      function saveLayout() {
        state.layout.updatedAt = new Date().toISOString();
        writeLayout(state.layout);
      }

      function movePanel(id, dir) {
        var order = state.layout.order.slice();
        var i = order.indexOf(id);
        if (i < 0) return;
        var j = i + dir;
        if (j < 0 || j >= order.length) return;
        var tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
        state.layout.order = order;
        saveLayout();
        paint();
      }

      function togglePanel(id) {
        state.layout.hidden[id] = !state.layout.hidden[id];
        saveLayout();
        paint();
      }

      function renderDashPanel(id) {
        if (state.layout.hidden[id]) return "";
        var meta = panelMeta(id);
        var body = "";
        if (id === "brief") {
          body =
            '<p class="st-ws-panel-lead">Calm daily attention with transparent priority — not an alert flood.</p>' +
            '<p><a class="wds-btn wds-btn--primary" href="brief.html">Open today’s brief</a> · <a href="advisor.html">Adaptive advisor</a></p>';
        } else if (id === "recent-intel") {
          var recent = recentIntel(state.graph, 6);
          body =
            "<ul class=\"st-cyber-list\">" +
            recent
              .map(function (r) {
                return (
                  "<li><strong>" +
                  esc(r.entity.title) +
                  "</strong> <span class=\"st-ws-meta\">" +
                  esc(r.entity.kind) +
                  (r.at ? " · " + esc(r.at.slice(0, 10)) : "") +
                  "</span><br/>" +
                  entityLink(r.entity.id) +
                  "</li>"
                );
              })
              .join("") +
            "</ul>";
        } else if (id === "investigations") {
          var invs = sortByUpdated(R.list({ kind: "investigation" })).slice(0, 5);
          body =
            "<ul class=\"st-cyber-list\">" +
            invs
              .map(function (inv) {
                return (
                  "<li><a href=\"#investigation/" +
                  encodeURIComponent(inv.id) +
                  "\">" +
                  esc(inv.title) +
                  "</a> <span class=\"st-ws-meta\">" +
                  esc(inv.investigationStatus || "open") +
                  "</span></li>"
                );
              })
              .join("") +
            "</ul>" +
            '<p><button type="button" class="wds-btn wds-btn--ghost" data-goto="investigations">All investigations</button></p>';
        } else if (id === "reading-queue") {
          var q = sortByUpdated(R.list({ kind: "queue-item" })).slice(0, 5);
          body =
            "<ul class=\"st-cyber-list\">" +
            q
              .map(function (item) {
                return (
                  "<li><strong>" +
                  esc(item.title) +
                  "</strong> <span class=\"st-ws-meta\">" +
                  esc(item.readingStatus || "unread") +
                  " · " +
                  esc(String(item.estimateMinutes || "?")) +
                  " min · " +
                  esc(item.difficulty || "") +
                  "</span></li>"
                );
              })
              .join("") +
            "</ul>" +
            '<p><button type="button" class="wds-btn wds-btn--ghost" data-goto="queue">Open reading queue</button></p>';
        } else if (id === "pinned") {
          var pins = R.list({ kind: "timeline-pin" }).concat(R.list({ kind: "bookmark" })).slice(0, 8);
          body =
            "<ul class=\"st-cyber-list\">" +
            pins
              .map(function (p) {
                var sid = (p.subjectIds || [])[0];
                return (
                  "<li>" +
                  esc(p.title) +
                  (sid ? " · " + entityLink(sid) : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>";
        } else if (id === "collections") {
          var cols = R.list({ kind: "collection" }).slice(0, 6);
          body =
            "<ul class=\"st-cyber-list\">" +
            cols
              .map(function (c) {
                return (
                  "<li><a href=\"#collections/" +
                  encodeURIComponent(c.id) +
                  "\">" +
                  esc(c.title) +
                  "</a> <span class=\"st-ws-meta\">" +
                  (c.memberIds || []).length +
                  " members</span></li>"
                );
              })
              .join("") +
            "</ul>";
        } else if (id === "timeline") {
          var tl = buildPersonalTimeline(R, 6);
          body =
            "<ul class=\"st-cyber-list\">" +
            tl
              .map(function (e) {
                return (
                  "<li><span class=\"st-ws-meta\">" +
                  esc((e.at || "").slice(0, 16).replace("T", " ")) +
                  "</span><br/><strong>" +
                  esc(e.title) +
                  "</strong></li>"
                );
              })
              .join("") +
            "</ul>" +
            '<p><button type="button" class="wds-btn wds-btn--ghost" data-goto="timeline">Full personal timeline</button></p>';
        } else if (id === "watchlists") {
          var watches = R.list({ kind: "watchlist" });
          var entities = state.graph.listEntities();
          var hitBlocks = watches
            .map(function (w) {
              var hits = R.matchWatchlist(w, entities).slice(0, 3);
              if (!hits.length) {
                return (
                  "<li><strong>" +
                  esc(w.title) +
                  "</strong><br/><span class=\"st-ws-meta\">No matches in the current sample — watchlist is ready.</span></li>"
                );
              }
              return (
                "<li><strong>" +
                esc(w.title) +
                "</strong><ul>" +
                hits
                  .map(function (h) {
                    return "<li>" + entityLink(h.entityId) + " — " + esc(h.explanation) + "</li>";
                  })
                  .join("") +
                "</ul></li>"
              );
            })
            .join("");
          body = "<ul class=\"st-cyber-list\">" + hitBlocks + "</ul>";
        } else if (id === "notes") {
          var notes = sortByUpdated(R.list({ kind: "note" })).slice(0, 5);
          body =
            "<ul class=\"st-cyber-list\">" +
            notes
              .map(function (n) {
                return (
                  "<li><a href=\"#notes/" +
                  encodeURIComponent(n.id) +
                  "\">" +
                  esc(n.title) +
                  "</a></li>"
                );
              })
              .join("") +
            "</ul>";
        } else if (id === "learning") {
          var paths = (state.knowledge && state.knowledge.paths) || [];
          body =
            "<ul class=\"st-cyber-list\">" +
            paths
              .slice(0, 5)
              .map(function (p) {
                return (
                  "<li><a href=\"knowledge.html#paths/" +
                  encodeURIComponent(p.id) +
                  "\">" +
                  esc(p.title || p.id) +
                  "</a></li>"
                );
              })
              .join("") +
            "</ul>" +
            '<p class="st-ws-meta">Progress is personal — open paths in Defensive Knowledge.</p>';
        } else {
          body = "<p class=\"st-ws-meta\">Panel not configured.</p>";
        }

        return (
          '<section class="st-ws-panel" data-panel-id="' +
          esc(id) +
          '" aria-labelledby="st-ws-h-' +
          esc(id) +
          '">' +
          '<div class="st-ws-panel-chrome">' +
          '<h2 id="st-ws-h-' +
          esc(id) +
          '">' +
          esc(meta.label) +
          "</h2>" +
          '<div class="st-ws-panel-actions">' +
          '<button type="button" class="wds-btn wds-btn--ghost" data-panel-up="' +
          esc(id) +
          '" aria-label="Move ' +
          esc(meta.label) +
          ' up">↑</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost" data-panel-down="' +
          esc(id) +
          '" aria-label="Move ' +
          esc(meta.label) +
          ' down">↓</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost" data-panel-hide="' +
          esc(id) +
          '" aria-label="Hide ' +
          esc(meta.label) +
          '">Hide</button>' +
          "</div></div>" +
          (meta.description ? '<p class="st-ws-panel-lead">' + esc(meta.description) + "</p>" : "") +
          body +
          "</section>"
        );
      }

      function viewDashboard() {
        var hiddenList = (state.layout.order || [])
          .filter(function (id) {
            return state.layout.hidden[id];
          })
          .map(function (id) {
            return (
              '<button type="button" class="wds-btn wds-btn--ghost" data-panel-show="' +
              esc(id) +
              '">Show ' +
              esc(panelMeta(id).label) +
              "</button>"
            );
          })
          .join(" ");

        return (
          '<header class="st-demo-header">' +
          "<h1>Cyber Operations Workspace</h1>" +
          '<p class="st-lead">A calm digital field notebook for cybersecurity literacy — investigate, organize, and remember. Not a SOC or SIEM.</p>' +
          '<p class="st-badge">Local-first · Shared research store · Educational only</p>' +
          "</header>" +
          '<div class="st-ws-customize" aria-label="Customize dashboard">' +
          "<p><strong>Customize panels</strong> — move or hide independently. Layout stays on this device.</p>" +
          (hiddenList ? "<p>" + hiddenList + "</p>" : "") +
          "</div>" +
          '<div class="st-ws-dashboard">' +
          state.layout.order
            .map(function (id) {
              return renderDashPanel(id);
            })
            .join("") +
          "</div>"
        );
      }

      function viewInvestigationsList() {
        var invs = sortByUpdated(R.list({ kind: "investigation" }));
        var tplBtns = ((state.templates && state.templates.templates) || [])
          .map(function (t) {
            return (
              '<button type="button" class="wds-btn wds-btn--ghost" data-tpl="' +
              esc(t.id) +
              '">' +
              esc(t.title) +
              "</button>"
            );
          })
          .join(" ");
        return (
          "<header class=\"st-demo-header\"><h1>Investigations</h1>" +
          '<p class="st-lead">Topic notebooks with notes, tasks, citations, and graph links.</p></header>' +
          '<div class="st-ws-toolbar"><span>Start from template:</span> ' +
          tplBtns +
          "</div>" +
          "<ul class=\"st-cyber-list\">" +
          invs
            .map(function (inv) {
              return (
                "<li><a href=\"#investigation/" +
                encodeURIComponent(inv.id) +
                "\"><strong>" +
                esc(inv.title) +
                "</strong></a> <span class=\"st-ws-meta\">" +
                esc(inv.investigationStatus || "open") +
                " · " +
                (inv.tasks || []).filter(function (t) {
                  return t.done;
                }).length +
                "/" +
                (inv.tasks || []).length +
                " tasks</span>" +
                "<p>" +
                esc((inv.body || "").slice(0, 140)) +
                "</p></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function viewInvestigation(id) {
        var inv = R.get(id);
        if (!inv) return '<p role="alert">Investigation not found.</p>';
        var subjects = (inv.subjectIds || [])
          .map(function (sid) {
            return "<li>" + entityLink(sid) + "</li>";
          })
          .join("");
        var notes = R.list({ kind: "note" }).filter(function (n) {
          return (n.relatedInvestigationIds || []).indexOf(inv.id) >= 0 || (n.subjectIds || []).some(function (s) {
            return (inv.subjectIds || []).indexOf(s) >= 0;
          });
        });
        var tasks = (inv.tasks || [])
          .map(function (t) {
            return (
              "<li><label><input type=\"checkbox\" data-task-inv=\"" +
              esc(inv.id) +
              "\" data-task-id=\"" +
              esc(t.id) +
              "\"" +
              (t.done ? " checked" : "") +
              "/> " +
              esc(t.text) +
              "</label></li>"
            );
          })
          .join("");
        return (
          '<p><a href="#investigations">← Investigations</a></p>' +
          "<header class=\"st-demo-header\"><h1>" +
          esc(inv.title) +
          "</h1>" +
          '<p class="st-ws-meta">Status: ' +
          esc(inv.investigationStatus || "open") +
          "</p></header>" +
          '<div class="st-ws-md">' +
          renderMarkdownLite(inv.body) +
          "</div>" +
          "<h2>Tasks</h2><ul class=\"st-ws-checklist\">" +
          tasks +
          "</ul>" +
          "<h2>Related intelligence</h2><ul class=\"st-cyber-list\">" +
          (subjects || "<li class=\"st-ws-meta\">No linked entities yet.</li>") +
          "</ul>" +
          "<h2>Notes</h2><ul class=\"st-cyber-list\">" +
          (notes
            .map(function (n) {
              return (
                "<li><a href=\"#notes/" +
                encodeURIComponent(n.id) +
                "\">" +
                esc(n.title) +
                "</a></li>"
              );
            })
            .join("") || "<li class=\"st-ws-meta\">No linked notes.</li>") +
          "</ul>" +
          "<h2>Citations</h2><ul class=\"st-cyber-list\">" +
          ((inv.citationIds || [])
            .map(function (cid) {
              var c = R.get(cid);
              return "<li>" + esc(c ? c.title : cid) + (c && c.url ? " · " + esc(c.url) : "") + "</li>";
            })
            .join("") || "<li class=\"st-ws-meta\">None yet.</li>") +
          "</ul>" +
          '<p class="st-ws-meta">Attachments: future-ready (' +
          (inv.attachmentRefs || []).length +
          " refs). Export of collections planned later.</p>" +
          '<div class="st-ws-toolbar">' +
          '<button type="button" class="wds-btn wds-btn--ghost" data-inv-status="' +
          esc(inv.id) +
          '" data-status="paused">Mark paused</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost" data-inv-status="' +
          esc(inv.id) +
          '" data-status="completed">Mark completed</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost" data-inv-status="' +
          esc(inv.id) +
          '" data-status="open">Reopen</button>' +
          "</div>"
        );
      }

      function viewWatchlists() {
        var watches = R.list({ kind: "watchlist" });
        var entities = state.graph.listEntities();
        return (
          "<header class=\"st-demo-header\"><h1>Watchlists</h1>" +
          '<p class="st-lead">Reusable watches on products, vendors, campaigns, and topics — with explainable matches. Not live detection.</p></header>' +
          '<form id="st-ws-watch-form" class="st-ws-form">' +
          "<label>Title <input name=\"title\" required maxlength=\"200\"/></label>" +
          "<label>Kinds (comma) <input name=\"kinds\" placeholder=\"affected-software, threat-campaign\"/></label>" +
          "<label>Target ids (comma) <input name=\"targets\" placeholder=\"cy_software-log4j\"/></label>" +
          "<label>Query <input name=\"query\" placeholder=\"optional text\"/></label>" +
          '<button type="submit" class="wds-btn wds-btn--primary">Create watchlist</button>' +
          "</form>" +
          watches
            .map(function (w) {
              var hits = R.matchWatchlist(w, entities);
              return (
                '<section class="st-ws-panel"><h2>' +
                esc(w.title) +
                "</h2><p>" +
                esc(w.body || "") +
                "</p><p class=\"st-ws-meta\">Kinds: " +
                esc((w.watchKinds || []).join(", ") || "—") +
                " · Targets: " +
                esc((w.watchTargetIds || []).join(", ") || "—") +
                "</p><h3>Matches in current intelligence</h3><ul class=\"st-cyber-list\">" +
                (hits
                  .map(function (h) {
                    return (
                      "<li>" +
                      entityLink(h.entityId) +
                      "<br/><span class=\"st-ws-meta\">" +
                      esc(h.explanation) +
                      "</span></li>"
                    );
                  })
                  .join("") || "<li class=\"st-ws-meta\">No matches right now.</li>") +
                "</ul></section>"
              );
            })
            .join("")
        );
      }

      function viewNotes(id) {
        if (id) {
          var note = R.get(id);
          if (!note) return '<p role="alert">Note not found.</p>';
          var backlinks = (note.subjectIds || [])
            .map(function (sid) {
              return "<li>" + entityLink(sid) + "</li>";
            })
            .join("");
          var versions = (note.versions || [])
            .slice()
            .reverse()
            .map(function (v) {
              return (
                "<li><span class=\"st-ws-meta\">" +
                esc((v.at || "").slice(0, 19)) +
                "</span><pre class=\"st-ws-pre\">" +
                esc(v.body) +
                "</pre></li>"
              );
            })
            .join("");
          return (
            '<p><a href="#notes">← Notes</a></p>' +
            "<header class=\"st-demo-header\"><h1>" +
            esc(note.title) +
            "</h1></header>" +
            '<div class="st-ws-md">' +
            renderMarkdownLite(note.body) +
            "</div>" +
            "<h2>Linked intelligence</h2><ul class=\"st-cyber-list\">" +
            (backlinks || "<li class=\"st-ws-meta\">None — add subject ids when editing.</li>") +
            "</ul>" +
            "<h2>Checklist</h2><ul class=\"st-ws-checklist\">" +
            ((note.checklist || [])
              .map(function (c) {
                return "<li class=\"" + (c.done ? "is-done" : "") + "\">" + esc(c.text) + "</li>";
              })
              .join("") || "<li class=\"st-ws-meta\">None</li>") +
            "</ul>" +
            "<h2>Version history</h2><ul class=\"st-cyber-list\">" +
            (versions || "<li class=\"st-ws-meta\">No prior versions.</li>") +
            "</ul>" +
            '<form id="st-ws-note-edit" class="st-ws-form" data-note-id="' +
            esc(note.id) +
            '">' +
            "<label>Title <input name=\"title\" value=\"" +
            esc(note.title) +
            "\"/></label>" +
            "<label>Body (Markdown) <textarea name=\"body\" rows=\"8\">" +
            esc(note.body || "") +
            "</textarea></label>" +
            "<label>Link entity ids (comma) <input name=\"subjects\" value=\"" +
            esc((note.subjectIds || []).join(", ")) +
            "\"/></label>" +
            '<button type="submit" class="wds-btn wds-btn--primary">Save note (new version)</button>' +
            "</form>"
          );
        }
        var notes = sortByUpdated(R.list({ kind: "note" }));
        return (
          "<header class=\"st-demo-header\"><h1>Notes</h1>" +
          '<p class="st-lead">Private Markdown notes with graph links, tags, checklists, citations, and version history.</p></header>' +
          '<form id="st-ws-note-new" class="st-ws-form">' +
          "<label>Title <input name=\"title\" required/></label>" +
          "<label>Body <textarea name=\"body\" rows=\"5\" placeholder=\"Markdown supported\"></textarea></label>" +
          "<label>Subject ids <input name=\"subjects\" placeholder=\"cy_…\"/></label>" +
          '<button type="submit" class="wds-btn wds-btn--primary">Add note</button>' +
          "</form>" +
          "<ul class=\"st-cyber-list\">" +
          notes
            .map(function (n) {
              return (
                "<li><a href=\"#notes/" +
                encodeURIComponent(n.id) +
                "\">" +
                esc(n.title) +
                "</a> <span class=\"st-ws-meta\">" +
                esc((n.updatedAt || "").slice(0, 10)) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function viewCollections(id) {
        if (id) {
          var col = R.get(id);
          if (!col) return '<p role="alert">Collection not found.</p>';
          return (
            '<p><a href="#collections">← Collections</a></p>' +
            "<header class=\"st-demo-header\"><h1>" +
            esc(col.title) +
            "</h1></header>" +
            "<ul class=\"st-cyber-list\">" +
            ((col.memberIds || [])
              .map(function (mid) {
                var item = R.get(mid);
                var ent = state.graph.get(mid);
                if (item) {
                  return (
                    "<li><span class=\"st-ws-meta\">" +
                    esc(item.kind) +
                    "</span> " +
                    esc(item.title) +
                    " <code>" +
                    esc(mid) +
                    "</code></li>"
                  );
                }
                if (ent) {
                  return "<li><span class=\"st-ws-meta\">intelligence</span> " + entityLink(mid) + "</li>";
                }
                return "<li><code>" + esc(mid) + "</code></li>";
              })
              .join("") || "<li class=\"st-ws-meta\">Empty collection.</li>") +
            "</ul>" +
            '<p class="st-ws-meta">Export is planned for a future block — models are shared and portable-ready.</p>'
          );
        }
        var cols = R.list({ kind: "collection" });
        return (
          "<header class=\"st-demo-header\"><h1>Collections</h1>" +
          '<p class="st-lead">Organize articles, advisories, notes, and investigations without forking the graph.</p></header>' +
          '<form id="st-ws-col-form" class="st-ws-form">' +
          "<label>Title <input name=\"title\" required/></label>" +
          "<label>Member ids (comma) <input name=\"members\" placeholder=\"cy_…, rw_…\"/></label>" +
          '<button type="submit" class="wds-btn wds-btn--primary">Create collection</button>' +
          "</form>" +
          "<ul class=\"st-cyber-list\">" +
          cols
            .map(function (c) {
              return (
                "<li><a href=\"#collections/" +
                encodeURIComponent(c.id) +
                "\">" +
                esc(c.title) +
                "</a> <span class=\"st-ws-meta\">" +
                (c.memberIds || []).length +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function viewQueue() {
        var items = sortByUpdated(R.list({ kind: "queue-item" })).filter(function (it) {
          if (state.queueStatus !== "all" && (it.readingStatus || "unread") !== state.queueStatus) return false;
          if (state.queueDifficulty !== "all" && (it.difficulty || "") !== state.queueDifficulty) return false;
          return true;
        });
        return (
          "<header class=\"st-demo-header\"><h1>Reading Queue</h1>" +
          '<p class="st-lead">Structured reading with time estimates, difficulty, and investigation links.</p></header>' +
          '<form id="st-ws-queue-filter" class="st-ws-filters">' +
          "<label>Status <select name=\"status\">" +
          ["all", "unread", "reading", "done", "deferred"]
            .map(function (s) {
              return (
                "<option value=\"" +
                s +
                "\"" +
                (state.queueStatus === s ? " selected" : "") +
                ">" +
                s +
                "</option>"
              );
            })
            .join("") +
          "</select></label>" +
          "<label>Difficulty <select name=\"difficulty\">" +
          ["all", "intro", "intermediate", "advanced"]
            .map(function (s) {
              return (
                "<option value=\"" +
                s +
                "\"" +
                (state.queueDifficulty === s ? " selected" : "") +
                ">" +
                s +
                "</option>"
              );
            })
            .join("") +
          "</select></label>" +
          '<button type="submit" class="wds-btn wds-btn--ghost">Filter</button></form>' +
          '<form id="st-ws-queue-add" class="st-ws-form">' +
          "<label>Title <input name=\"title\" required/></label>" +
          "<label>Minutes <input name=\"minutes\" type=\"number\" min=\"1\" value=\"15\"/></label>" +
          "<label>Difficulty <select name=\"difficulty\"><option>intro</option><option>intermediate</option><option>advanced</option></select></label>" +
          "<label>Priority <select name=\"priority\"><option>normal</option><option>high</option><option>low</option></select></label>" +
          "<label>Subject ids <input name=\"subjects\"/></label>" +
          '<button type="submit" class="wds-btn wds-btn--primary">Add to queue</button></form>' +
          "<ul class=\"st-cyber-list\">" +
          items
            .map(function (it) {
              return (
                "<li><strong>" +
                esc(it.title) +
                "</strong> <span class=\"st-ws-meta\">" +
                esc(it.readingStatus || "unread") +
                " · " +
                esc(String(it.estimateMinutes || "?")) +
                " min · " +
                esc(it.difficulty || "") +
                " · " +
                esc(it.priority || "") +
                "</span>" +
                (it.body ? "<p>" + esc(it.body) + "</p>" : "") +
                '<div class="st-ws-toolbar">' +
                '<button type="button" class="wds-btn wds-btn--ghost" data-queue-status="' +
                esc(it.id) +
                '" data-status="reading">Reading</button>' +
                '<button type="button" class="wds-btn wds-btn--ghost" data-queue-status="' +
                esc(it.id) +
                '" data-status="done">Done</button>' +
                '<button type="button" class="wds-btn wds-btn--ghost" data-queue-status="' +
                esc(it.id) +
                '" data-status="deferred">Defer</button>' +
                "</div></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function viewSearch() {
        var saved = R.list({ kind: "saved-search" });
        var results =
          state.searchQ.trim().length > 0
            ? unifiedSearch({
                query: state.searchQ,
                graph: state.graph,
                knowledge: state.knowledge,
                research: R
              })
            : [];
        return (
          "<header class=\"st-demo-header\"><h1>Workspace Search</h1>" +
          '<p class="st-lead">Search intelligence, knowledge, investigations, notes, collections, playbooks, queue, bookmarks, and watchlists.</p></header>' +
          '<form id="st-ws-search" class="st-ws-form">' +
          "<label>Query <input name=\"q\" value=\"" +
          esc(state.searchQ) +
          "\" placeholder=\"log4j · kind:investigation status:open · type:playbook\"/></label>" +
          '<button type="submit" class="wds-btn wds-btn--primary">Search</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost" id="st-ws-save-search">Save search</button>' +
          "</form>" +
          "<h2>Saved searches</h2><ul class=\"st-cyber-list\">" +
          (saved
            .map(function (s) {
              return (
                "<li><button type=\"button\" class=\"st-summary-bullet\" data-run-saved=\"" +
                esc(s.query || "") +
                "\">" +
                esc(s.title) +
                "</button> <code>" +
                esc(s.query || "") +
                "</code></li>"
              );
            })
            .join("") || "<li class=\"st-ws-meta\">None saved yet.</li>") +
          "</ul>" +
          "<h2>Results (" +
          results.length +
          ")</h2><ul class=\"st-cyber-list\">" +
          (results
            .map(function (r) {
              return (
                "<li><span class=\"st-ws-meta\">" +
                esc(r.type) +
                "</span> <strong>" +
                esc(r.title) +
                "</strong> <code>" +
                esc(r.id) +
                "</code>" +
                (r.snippet ? "<p>" + esc(r.snippet) + "</p>" : "") +
                "</li>"
              );
            })
            .join("") ||
            (state.searchQ
              ? "<li class=\"st-ws-meta\">No matches.</li>"
              : "<li class=\"st-ws-meta\">Enter a query to search.</li>")) +
          "</ul>"
        );
      }

      function viewTimeline() {
        var events = buildPersonalTimeline(R, 40);
        return (
          "<header class=\"st-demo-header\"><h1>Personal Timeline</h1>" +
          '<p class="st-lead">Your learning journey: notes, reading, investigations, bookmarks, and watchlist activity — not a global firehose.</p></header>' +
          "<ul class=\"st-cyber-list\">" +
          events
            .map(function (e) {
              return (
                "<li><span class=\"st-ws-meta\">" +
                esc((e.at || "").replace("T", " ").slice(0, 16)) +
                " · " +
                esc(e.type) +
                "</span><br/><strong>" +
                esc(e.title) +
                "</strong>" +
                (e.detail ? "<p>" + esc(e.detail) + "</p>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function body() {
        var route = parseHash();
        if (route.panel === "investigation") return viewInvestigation(route.id);
        if (route.panel === "investigations") return viewInvestigationsList();
        if (route.panel === "watchlists") return viewWatchlists();
        if (route.panel === "notes") return viewNotes(route.id);
        if (route.panel === "collections") return viewCollections(route.id);
        if (route.panel === "queue") return viewQueue();
        if (route.panel === "search") return viewSearch();
        if (route.panel === "timeline") return viewTimeline();
        return viewDashboard();
      }

      function paint() {
        root.innerHTML =
          '<div class="st-ws st-demo">' +
          nav() +
          '<div id="st-ws-body">' +
          body() +
          "</div>" +
          '<p class="st-disclaimer">Educational defensive workspace. No scanning, no offense, no SOC/SIEM claims. Content stays in the shared local research store.</p>' +
          "</div>";

        root.querySelectorAll("[data-goto]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            setHash(btn.getAttribute("data-goto"));
          });
        });
        root.querySelectorAll("[data-panel-up]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            movePanel(btn.getAttribute("data-panel-up"), -1);
          });
        });
        root.querySelectorAll("[data-panel-down]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            movePanel(btn.getAttribute("data-panel-down"), 1);
          });
        });
        root.querySelectorAll("[data-panel-hide]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            togglePanel(btn.getAttribute("data-panel-hide"));
          });
        });
        root.querySelectorAll("[data-panel-show]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            togglePanel(btn.getAttribute("data-panel-show"));
          });
        });
        root.querySelectorAll("[data-tpl]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var tid = btn.getAttribute("data-tpl");
            var tpl = ((state.templates && state.templates.templates) || []).filter(function (t) {
              return t.id === tid;
            })[0];
            if (!tpl) return;
            var inv = R.createInvestigation(tpl.title, {
              tags: tpl.tags,
              subjectIds: tpl.seedSubjectIds,
              tasks: (tpl.tasks || []).map(function (t) {
                return { id: t.id, text: t.text, done: !!t.done };
              }),
              body: "Started from template **" + tpl.title + "**."
            });
            setHash("investigation", inv.id);
          });
        });
        root.querySelectorAll("[data-task-inv]").forEach(function (input) {
          input.addEventListener("change", function () {
            var inv = R.get(input.getAttribute("data-task-inv"));
            if (!inv) return;
            var tasks = (inv.tasks || []).map(function (t) {
              if (t.id === input.getAttribute("data-task-id")) {
                return Object.assign({}, t, { done: !!input.checked });
              }
              return t;
            });
            R.upsert(Object.assign({}, inv, { tasks: tasks }));
            R.recordActivity("investigation-updated", "Updated tasks: " + inv.title, {
              subjectIds: [inv.id]
            });
            paint();
          });
        });
        root.querySelectorAll("[data-inv-status]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var inv = R.get(btn.getAttribute("data-inv-status"));
            if (!inv) return;
            R.upsert(
              Object.assign({}, inv, {
                investigationStatus: btn.getAttribute("data-status")
              })
            );
            R.recordActivity("investigation-updated", "Status → " + btn.getAttribute("data-status") + ": " + inv.title, {
              subjectIds: [inv.id]
            });
            paint();
          });
        });
        var watchForm = root.querySelector("#st-ws-watch-form");
        if (watchForm) {
          watchForm.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(watchForm);
            var kinds = String(fd.get("kinds") || "")
              .split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean);
            var targets = String(fd.get("targets") || "")
              .split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean);
            R.createWatchlist(String(fd.get("title") || "Watchlist"), {
              watchKinds: kinds,
              watchTargetIds: targets,
              subjectIds: targets,
              query: String(fd.get("query") || "") || null
            });
            paint();
          });
        }
        var noteNew = root.querySelector("#st-ws-note-new");
        if (noteNew) {
          noteNew.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(noteNew);
            var subjects = String(fd.get("subjects") || "")
              .split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean);
            var note = R.upsert({
              id: "rw_local_note_" + Date.now().toString(36),
              kind: "note",
              title: String(fd.get("title") || "Note"),
              body: String(fd.get("body") || ""),
              subjectIds: subjects,
              domain: "cyber",
              private: true,
              versions: []
            });
            R.recordActivity("note-updated", "Created note: " + note.title, { subjectIds: [note.id] });
            setHash("notes", note.id);
          });
        }
        var noteEdit = root.querySelector("#st-ws-note-edit");
        if (noteEdit) {
          noteEdit.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(noteEdit);
            var id = noteEdit.getAttribute("data-note-id");
            var subjects = String(fd.get("subjects") || "")
              .split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean);
            R.updateNote(id, String(fd.get("body") || ""), String(fd.get("title") || "Note"));
            R.linkNoteToSubjects(id, subjects);
            var note = R.get(id);
            if (note) R.upsert(Object.assign({}, note, { subjectIds: subjects }));
            paint();
          });
        }
        var colForm = root.querySelector("#st-ws-col-form");
        if (colForm) {
          colForm.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(colForm);
            var members = String(fd.get("members") || "")
              .split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean);
            var id =
              "rw_col_" +
              String(fd.get("title") || "collection")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 32) +
              "_" +
              Date.now().toString(36);
            R.ensureCollection(id, String(fd.get("title")), members);
            R.recordActivity("collection-updated", "Created collection: " + fd.get("title"), {
              subjectIds: [id]
            });
            setHash("collections", id);
          });
        }
        var qFilter = root.querySelector("#st-ws-queue-filter");
        if (qFilter) {
          qFilter.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(qFilter);
            state.queueStatus = String(fd.get("status") || "all");
            state.queueDifficulty = String(fd.get("difficulty") || "all");
            paint();
          });
        }
        var qAdd = root.querySelector("#st-ws-queue-add");
        if (qAdd) {
          qAdd.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(qAdd);
            var subjects = String(fd.get("subjects") || "")
              .split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean);
            R.addQueueItem(String(fd.get("title")), {
              estimateMinutes: parseInt(fd.get("minutes"), 10) || 15,
              difficulty: String(fd.get("difficulty") || "intro"),
              priority: String(fd.get("priority") || "normal"),
              subjectIds: subjects
            });
            paint();
          });
        }
        root.querySelectorAll("[data-queue-status]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var status = btn.getAttribute("data-status");
            R.setReadingStatus(btn.getAttribute("data-queue-status"), status);
            if (status === "done") {
              var it = R.get(btn.getAttribute("data-queue-status"));
              if (it) {
                R.recordActivity("reading-completed", "Completed reading: " + it.title, {
                  subjectIds: [it.id]
                });
              }
            }
            paint();
          });
        });
        var searchForm = root.querySelector("#st-ws-search");
        if (searchForm) {
          searchForm.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(searchForm);
            state.searchQ = String(fd.get("q") || "");
            paint();
          });
        }
        var saveSearch = root.querySelector("#st-ws-save-search");
        if (saveSearch) {
          saveSearch.addEventListener("click", function () {
            if (!state.searchQ.trim()) return;
            R.upsert({
              id: "rw_local_search_" + Date.now().toString(36),
              kind: "saved-search",
              title: "Search: " + state.searchQ.slice(0, 40),
              query: state.searchQ,
              domain: "cyber",
              tags: ["workspace"]
            });
            paint();
          });
        }
        root.querySelectorAll("[data-run-saved]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.searchQ = btn.getAttribute("data-run-saved") || "";
            setHash("search");
            paint();
          });
        });

        root.removeAttribute("aria-busy");
        var heading = root.querySelector("#st-ws-body h1");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          try {
            heading.focus({ preventScroll: false });
          } catch (e) {
            /* ignore */
          }
        }
      }

      global.addEventListener("hashchange", paint);
      paint();
      return {
        layout: state.layout,
        unifiedSearch: unifiedSearch,
        buildPersonalTimeline: buildPersonalTimeline
      };
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberWorkspace = {
    mountWorkspace: mountWorkspace,
    unifiedSearch: unifiedSearch,
    buildPersonalTimeline: buildPersonalTimeline,
    recentIntel: recentIntel,
    estimateReadingMinutes: estimateReadingMinutes,
    renderMarkdownLite: renderMarkdownLite,
    parseSearchQuery: parseSearchQuery
  };
})(typeof window !== "undefined" ? window : globalThis);
