/**
 * Waypoint University — Work Block 2 application shell.
 * Learning dashboard, graph neighborhood, health, research, sources.
 */
(function (global) {
  "use strict";

  var NAV = [
    ["home", "Home"],
    ["capture", "Quick Capture"],
    ["search", "Search"],
    ["graph", "Graph"],
    ["paths", "Learning Paths"],
    ["research", "Research"],
    ["sources", "Sources"],
    ["questions", "Questions"],
    ["projects", "Projects"],
    ["health", "Knowledge Health"],
    ["library", "Library"],
    ["settings", "Settings"]
  ];

  function Store() {
    return global.WU.Store;
  }
  function Schema() {
    return global.WU.Schema;
  }
  function Search() {
    return global.WU.Search;
  }
  function Md() {
    return global.WU.Markdown;
  }
  function Graph() {
    return global.WU.Graph;
  }
  function Health() {
    return global.WU.Health;
  }

  function esc(s) {
    return Md().esc(s);
  }

  function parseHash() {
    var h = String(global.location.hash || "").replace(/^#/, "");
    if (!h) return { panel: "home", id: null, mode: null };
    var parts = h.split("/");
    var panel = parts[0] || "home";
    if (panel === "item" || panel === "node") return { panel: "item", id: parts[1] || null, mode: parts[2] || "view" };
    if (panel === "new") return { panel: "new", id: parts[1] || "idea", mode: null };
    if (panel === "review") return { panel: "health", id: null, mode: null };
    return { panel: panel, id: parts[1] || null, mode: parts[2] || null };
  }

  function setHash() {
    global.location.hash = Array.prototype.slice.call(arguments).filter(Boolean).join("/");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(iso).slice(0, 16);
    }
  }

  function kindOptions(selected) {
    return Schema()
      .KINDS.map(function (k) {
        return (
          '<option value="' +
          esc(k.id) +
          '"' +
          (selected === k.id ? " selected" : "") +
          ">" +
          esc(k.label) +
          "</option>"
        );
      })
      .join("");
  }

  function projectOptions(selectedArr) {
    selectedArr = selectedArr || [];
    return Schema()
      .PROJECTS.map(function (p) {
        return (
          '<label class="wu-check"><input type="checkbox" name="project" value="' +
          esc(p.id) +
          '"' +
          (selectedArr.indexOf(p.id) >= 0 ? " checked" : "") +
          "/> " +
          esc(p.label) +
          "</label>"
        );
      })
      .join("");
  }

  function itemLink(n, extra) {
    if (!n) return "";
    return (
      "<li><a href=\"#item/" +
      encodeURIComponent(n.id) +
      "\"><strong>" +
      esc(n.title) +
      "</strong></a>" +
      '<span class="wu-meta">' +
      esc(Schema().kindLabel(n.kind)) +
      (extra ? " · " + esc(extra) : "") +
      "</span></li>"
    );
  }

  function listHtml(items, empty, mapExtra) {
    if (!items || !items.length) return '<p class="wu-empty">' + esc(empty) + "</p>";
    return (
      '<ul class="wu-list">' +
      items
        .map(function (n) {
          return itemLink(n, mapExtra ? mapExtra(n) : null);
        })
        .join("") +
      "</ul>"
    );
  }

  function mount(root) {
    if (!root) return;
    var state = {
      nodes: [],
      edges: [],
      index: null,
      graphIndex: null,
      recentIds: [],
      q: "",
      libraryKind: "all",
      libraryQuery: "",
      flash: "",
      ready: false,
      error: null,
      graphFocus: null,
      graphDepth: 2,
      graphTypes: null,
      projectFocus: null
    };

    function rebuild() {
      state.index = Search().buildIndex(state.nodes);
      state.graphIndex = Graph().buildIndex(state.nodes, state.edges);
      if (!state.graphFocus && state.nodes.length) {
        var fav = Graph().frequentlyConnected(state.graphIndex, 1)[0];
        state.graphFocus = (fav && fav.id) || state.nodes[0].id;
      }
    }

    function byUpdated(a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    }
    function byOpened(a, b) {
      return String(b.lastOpenedAt || "").localeCompare(String(a.lastOpenedAt || ""));
    }

    async function refresh() {
      state.nodes = await Store().listNodes();
      state.edges = await Store().listEdges();
      state.recentIds = await Store().recentViewIds();
      rebuild();
    }

    function nodeMap() {
      return state.graphIndex ? state.graphIndex.nodeMap : Object.create(null);
    }

    function navHtml() {
      var route = parseHash();
      return (
        '<nav class="wu-nav" aria-label="University">' +
        '<p class="wu-brand">Waypoint University</p>' +
        '<p class="wu-brand-sub">Private · thinking tool</p>' +
        "<ul>" +
        NAV.map(function (p) {
          var cur =
            route.panel === p[0] ||
            (route.panel === "item" && p[0] === "library") ||
            (route.panel === "new" && p[0] === "capture");
          return (
            "<li><a href=\"#" +
            p[0] +
            "\"" +
            (cur ? ' aria-current="page"' : "") +
            ">" +
            esc(p[1]) +
            "</a></li>"
          );
        }).join("") +
        '</ul><p class="wu-nav-foot"><button type="button" class="wu-linkish" id="wu-quick-open">⌘/Ctrl + K capture</button></p></nav>'
      );
    }

    function homePanel() {
      var map = nodeMap();
      var continueLearning = state.nodes
        .filter(function (n) {
          return n.lastOpenedAt && n.kind !== "capture";
        })
        .sort(byOpened)
        .slice(0, 6);
      var started = state.nodes
        .filter(function (n) {
          return n.kind !== "path" && n.kind !== "capture";
        })
        .sort(function (a, b) {
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        })
        .slice(0, 6);
      var health = Health().analyze(state.graphIndex);
      var gapIds = { "no-connections": 1, "incomplete-definitions": 1, "unanswered-questions": 1 };
      var gaps = [];
      var gapSeen = Object.create(null);
      health.opportunities.forEach(function (o) {
        if (!gapIds[o.id]) return;
        (o.items || []).forEach(function (n) {
          if (!n || !n.id || gapSeen[n.id] || n.kind === "edge") return;
          gapSeen[n.id] = true;
          gaps.push(n);
        });
      });
      gaps = gaps.slice(0, 6);
      var freq = Graph().frequentlyConnected(state.graphIndex, 6).map(function (x) {
        return x.node;
      });
      var questions = state.nodes
        .filter(function (n) {
          return (
            n.kind === "question" &&
            (!n.question || n.question.status === "open" || n.question.status === "investigating")
          );
        })
        .sort(byUpdated)
        .slice(0, 6);
      var recentConn = Graph().recentConnections(state.graphIndex, 6);
      var needsResearch = state.nodes
        .filter(function (n) {
          return (n.projects || []).length && (!n.research || !n.research.stage || n.research.stage !== "conclusions");
        })
        .filter(function (n) {
          return n.kind === "project" || (n.projects || []).length;
        })
        .sort(byUpdated)
        .slice(0, 6);
      var reading = state.nodes.filter(function (n) {
        return n.queue && n.queue.reading;
      }).slice(0, 6);
      var inbox = state.nodes.filter(function (n) {
        return n.queue && n.queue.researchInbox;
      }).slice(0, 6);
      var focus = state.nodes.filter(function (n) {
        return n.queue && n.queue.focusToday;
      }).slice(0, 6);

      return (
        '<header class="wu-hero">' +
        '<p class="wu-eyebrow">Active learning</p>' +
        '<h1 class="wu-title">What are you thinking about today?</h1>' +
        '<p class="wu-lead">Discover connections, notice gaps, and move research forward — calmly.</p>' +
        '<div class="wu-hero-actions">' +
        '<a class="wu-btn wu-btn--primary" href="#capture">Quick capture</a>' +
        '<a class="wu-btn" href="#graph">Explore graph</a>' +
        '<a class="wu-btn" href="#health">Knowledge health</a>' +
        "</div>" +
        '<p class="wu-meta">' +
        health.summary.nodes +
        " nodes · " +
        health.summary.edges +
        " links · " +
        health.summary.openQuestions +
        " open questions · " +
        health.summary.opportunities +
        " improvement opportunities</p></header>" +
        '<div class="wu-home-grid">' +
        '<section class="wu-card"><h2>Continue learning</h2>' +
        listHtml(continueLearning, "Open any item — it appears here.") +
        "</section>" +
        '<section class="wu-card"><h2>Topics started recently</h2>' +
        listHtml(started, "New topics will land here.") +
        "</section>" +
        '<section class="wu-card"><h2>Knowledge gaps</h2>' +
        listHtml(gaps, "No obvious gaps yet — keep linking.") +
        '<p><a href="#health">All opportunities →</a></p></section>' +
        '<section class="wu-card"><h2>Frequently connected</h2>' +
        listHtml(freq, "Link ideas to grow hubs.") +
        "</section>" +
        '<section class="wu-card"><h2>Open questions</h2>' +
        listHtml(questions, "Capture a question anytime.") +
        '<p><a href="#questions">Question desk →</a></p></section>' +
        '<section class="wu-card"><h2>Recently discovered connections</h2>' +
        (recentConn.length
          ? '<ul class="wu-list">' +
            recentConn
              .map(function (c) {
                return (
                  "<li><span class=\"wu-meta\">" +
                  esc(Schema().relationLabel(c.edge.type)) +
                  "</span><br/>" +
                  (c.from
                    ? '<a href="#item/' + encodeURIComponent(c.from.id) + '">' + esc(c.from.title) + "</a>"
                    : "?") +
                  " → " +
                  (c.to ? '<a href="#item/' + encodeURIComponent(c.to.id) + '">' + esc(c.to.title) + "</a>" : "?") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="wu-empty">New links will appear here.</p>') +
        "</section>" +
        '<section class="wu-card"><h2>Projects needing research</h2>' +
        listHtml(needsResearch, "Tag items with projects to fill this lane.") +
        "</section>" +
        '<section class="wu-card"><h2>Reading queue</h2>' +
        listHtml(reading, "Mark sources “In reading queue” while editing.") +
        "</section>" +
        '<section class="wu-card"><h2>Research inbox</h2>' +
        listHtml(inbox, "Flag captures for research follow-up.") +
        "</section>" +
        '<section class="wu-card"><h2>Today\'s focus</h2>' +
        listHtml(focus, "Pin today’s focus on any item.") +
        "</section>" +
        "</div>"
      );
    }

    function capturePanel() {
      return (
        "<h1 class=\"wu-title\">Quick capture</h1>" +
        '<p class="wu-lead">Get it down. Link later. Searchable immediately.</p>' +
        '<form id="wu-capture-form" class="wu-form">' +
        "<label>Type <select name=\"kind\">" +
        ["capture", "idea", "question", "observation", "research-note", "task"]
          .map(function (k) {
            return "<option value=\"" + k + "\">" + esc(Schema().kindLabel(k)) + "</option>";
          })
          .join("") +
        "</select></label>" +
        "<label>Title <input name=\"title\" required placeholder=\"What is this?\" autofocus/></label>" +
        "<label>Body (Markdown) <textarea name=\"body\" rows=\"8\"></textarea></label>" +
        "<label>Tags <input name=\"tags\" placeholder=\"comma-separated\"/></label>" +
        "<label><input type=\"checkbox\" name=\"inbox\"/> Add to research inbox</label>" +
        "<label><input type=\"checkbox\" name=\"focus\"/> Today's focus</label>" +
        '<fieldset><legend>Projects</legend><div class="wu-proj-grid">' +
        projectOptions([]) +
        "</div></fieldset>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Save capture</button></form>'
      );
    }

    function searchPanel() {
      var results = state.q ? Search().search(state.index, state.q, { limit: 40 }) : [];
      var related = state.q ? Search().relatedToResults(state.graphIndex, results, 8) : [];
      var recent = state.recentIds
        .map(function (id) {
          return nodeMap()[id];
        })
        .filter(Boolean)
        .slice(0, 6);
      var follow =
        results[0] && results[0].node
          ? Search().followUps(results[0].node, state.graphIndex, 6)
          : [];

      function resultList(arr) {
        return (
          '<ul class="wu-search-results">' +
          arr
            .map(function (r) {
              return (
                "<li><a href=\"#item/" +
                encodeURIComponent(r.id) +
                "\"><strong>" +
                esc(r.node.title) +
                "</strong></a>" +
                '<span class="wu-meta">' +
                esc(Schema().kindLabel(r.node.kind)) +
                (r.score != null ? " · score " + r.score : "") +
                "</span>" +
                '<ul class="wu-reasons">' +
                (r.reasons || [])
                  .map(function (x) {
                    return "<li>" + esc(x) + "</li>";
                  })
                  .join("") +
                "</ul></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      return (
        "<h1 class=\"wu-title\">Search</h1>" +
        '<form id="wu-search-form" class="wu-form wu-form--row">' +
        "<label class=\"wu-grow\">Query <input name=\"q\" value=\"" +
        esc(state.q) +
        "\" placeholder=\"Titles, body, tags, citations, projects…\" autofocus/></label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Search</button></form>' +
        (state.q
          ? '<p class="wu-meta">' +
            results.length +
            " direct hits · index " +
            state.index.count +
            "</p>" +
            (results.length ? resultList(results) : '<p class="wu-empty">No matches.</p>') +
            (related.length
              ? "<h2 class=\"wu-section\">Related &amp; connected</h2>" + resultList(related)
              : "") +
            (follow.length
              ? "<h2 class=\"wu-section\">Suggested follow-up reading</h2>" + resultList(follow)
              : "")
          : '<p class="wu-lead">Every result explains why it matched. Related topics appear from the graph and shared tags.</p>') +
        (recent.length
          ? "<h2 class=\"wu-section\">Recently viewed</h2>" + listHtml(recent, "")
          : "")
      );
    }

    function graphPanel() {
      var focusId = state.graphFocus || (parseHash().id && parseHash().panel === "graph" ? parseHash().id : null);
      if (parseHash().panel === "graph" && parseHash().id) focusId = parseHash().id;
      if (!focusId && state.nodes[0]) focusId = state.nodes[0].id;
      state.graphFocus = focusId;

      var types =
        state.graphTypes ||
        Schema().RELATION_TYPES.map(function (r) {
          return r.id;
        });
      var hood = Graph().neighborhood(state.graphIndex, focusId, {
        depth: state.graphDepth,
        maxNodes: 36,
        types: types
      });
      var laid = Graph().layout(hood, 720, 480);
      var focus = nodeMap()[focusId];

      var typeFilters = Schema()
        .RELATION_GROUPS.map(function (g) {
          var typesInGroup = Schema().RELATION_TYPES.filter(function (r) {
            return r.group === g.id;
          });
          var on = typesInGroup.some(function (r) {
            return types.indexOf(r.id) >= 0;
          });
          return (
            '<label class="wu-check"><input type="checkbox" name="gtype" value="' +
            esc(g.id) +
            '"' +
            (on ? " checked" : "") +
            "/> " +
            esc(g.label) +
            "</label>"
          );
        })
        .join("");

      return (
        "<h1 class=\"wu-title\">Knowledge graph</h1>" +
        '<p class="wu-lead">Explore nearby ideas. Expand carefully. Jump when curious.</p>' +
        '<form id="wu-graph-controls" class="wu-form wu-form--row">' +
        "<label class=\"wu-grow\">Focus <select name=\"focus\">" +
        state.nodes
          .slice()
          .sort(function (a, b) {
            return String(a.title).localeCompare(String(b.title));
          })
          .slice(0, 800)
          .map(function (n) {
            return (
              "<option value=\"" +
              esc(n.id) +
              "\"" +
              (n.id === focusId ? " selected" : "") +
              ">" +
              esc(n.title) +
              "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        "<label>Depth <select name=\"depth\">" +
        [1, 2, 3]
          .map(function (d) {
            return (
              "<option value=\"" +
              d +
              "\"" +
              (state.graphDepth === d ? " selected" : "") +
              ">" +
              d +
              "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Update</button></form>' +
        '<div class="wu-graph-filters"><span class="wu-meta">Relationship filters</span><div class="wu-proj-grid" id="wu-graph-type-filters">' +
        typeFilters +
        "</div>" +
        '<button type="button" class="wu-btn" id="wu-graph-apply-types">Apply filters</button></div>' +
        (focus
          ? '<p class="wu-meta">Centered on <strong>' +
            esc(focus.title) +
            "</strong> · " +
            hood.nodes.length +
            " nodes · " +
            hood.links.length +
            " edges · <a href=\"#item/" +
            encodeURIComponent(focus.id) +
            '">Open item</a></p>'
          : "") +
        '<div class="wu-graph-canvas" id="wu-graph-canvas">' +
        Graph().renderSvg(hood, laid) +
        "</div>"
      );
    }

    function healthPanel() {
      var report = Health().analyze(state.graphIndex);
      return (
        "<h1 class=\"wu-title\">Knowledge health</h1>" +
        '<p class="wu-lead">Opportunities to deepen understanding — not warnings.</p>' +
        '<p class="wu-meta">' +
        report.summary.nodes +
        " nodes · " +
        report.summary.edges +
        " links · " +
        report.summary.unconnected +
        " unconnected · " +
        report.summary.openQuestions +
        " open questions</p>" +
        report.opportunities
          .map(function (op) {
            return (
              '<section class="wu-card wu-health-card">' +
              "<h2>" +
              esc(op.title) +
              ' <span class="wu-badge">' +
              esc(String(op.count)) +
              "</span></h2>" +
              '<p class="wu-empty">' +
              esc(op.blurb) +
              "</p>" +
              listHtml(op.items.filter(function (i) {
                return i.kind !== "edge";
              }), "—") +
              "</section>"
            );
          })
          .join("") || '<p class="wu-empty">Your graph looks healthy. Keep capturing and linking.</p>'
      );
    }

    function questionsPanel() {
      var qs = state.nodes
        .filter(function (n) {
          return n.kind === "question";
        })
        .sort(byUpdated);
      return (
        "<h1 class=\"wu-title\">Open questions</h1>" +
        '<p class="wu-lead">Unresolved curiosity is first-class knowledge — linked to concepts, evidence, and experiments.</p>' +
        '<p><a class="wu-btn wu-btn--primary" href="#new/question">New question</a></p>' +
        '<ul class="wu-list">' +
        (qs.length
          ? qs
              .map(function (n) {
                var st = (n.question && n.question.status) || "open";
                var conf = n.question && n.question.confidence != null ? n.question.confidence + "/5" : "—";
                return (
                  "<li><a href=\"#item/" +
                  encodeURIComponent(n.id) +
                  "\"><strong>" +
                  esc(n.title) +
                  "</strong></a>" +
                  '<span class="wu-meta">' +
                  esc(st) +
                  " · confidence " +
                  esc(conf) +
                  " · " +
                  esc(fmtDate(n.updatedAt)) +
                  "</span></li>"
                );
              })
              .join("")
          : '<li class="wu-empty">No questions yet.</li>') +
        "</ul>"
      );
    }

    function researchPanel() {
      var stages = Schema().RESEARCH_STAGES;
      return (
        "<h1 class=\"wu-title\">Research workflow</h1>" +
        '<p class="wu-lead">Optional lane from idea → conclusions. Use what helps; skip what does not.</p>' +
        '<ol class="wu-workflow">' +
        stages
          .map(function (s, i) {
            var items = state.nodes.filter(function (n) {
              return n.research && n.research.stage === s.id;
            });
            return (
              "<li><strong>" +
              (i + 1) +
              ". " +
              esc(s.label) +
              "</strong>" +
              '<span class="wu-meta">' +
              items.length +
              " items</span>" +
              listHtml(items.slice(0, 5), "Empty stage") +
              "</li>"
            );
          })
          .join("") +
        "</ol>" +
        '<p><a class="wu-btn wu-btn--primary" href="#new/research-note">New research note</a> ' +
        '<a class="wu-btn" href="#capture">Capture into inbox</a></p>'
      );
    }

    function sourcesPanel() {
      var sources = state.nodes
        .filter(function (n) {
          return Schema().isSourceKind(n.kind);
        })
        .sort(byUpdated);
      return (
        "<h1 class=\"wu-title\">Sources</h1>" +
        '<p class="wu-lead">Books, papers, docs, videos, podcasts — with citation, reading status, and links into the graph.</p>' +
        '<p class="wu-actions">' +
        ["book", "paper", "article", "video", "podcast", "website", "manual"]
          .map(function (k) {
            return (
              '<a class="wu-btn" href="#new/' + k + '">' + esc(Schema().kindLabel(k)) + "</a>"
            );
          })
          .join(" ") +
        "</p>" +
        '<ul class="wu-list">' +
        (sources.length
          ? sources
              .map(function (n) {
                var rs = (n.source && n.source.readingStatus) || "—";
                return (
                  "<li><a href=\"#item/" +
                  encodeURIComponent(n.id) +
                  "\"><strong>" +
                  esc(n.title) +
                  "</strong></a>" +
                  '<span class="wu-meta">' +
                  esc(Schema().kindLabel(n.kind)) +
                  " · " +
                  esc(rs) +
                  (n.source && n.source.authors ? " · " + esc(n.source.authors) : "") +
                  "</span></li>"
                );
              })
              .join("")
          : '<li class="wu-empty">No sources yet.</li>') +
        "</ul>"
      );
    }

    function projectsPanel() {
      var focus = state.projectFocus || parseHash().id;
      var byProj = {};
      Schema().PROJECTS.forEach(function (p) {
        byProj[p.id] = [];
      });
      state.nodes.forEach(function (n) {
        (n.projects || []).forEach(function (pid) {
          if (!byProj[pid]) byProj[pid] = [];
          byProj[pid].push(n);
        });
      });

      if (focus && byProj[focus]) {
        var items = byProj[focus].slice().sort(byUpdated);
        var questions = items.filter(function (n) {
          return n.kind === "question";
        });
        var sources = items.filter(function (n) {
          return Schema().isSourceKind(n.kind);
        });
        return (
          '<p><a href="#projects">← All projects</a></p>' +
          "<h1 class=\"wu-title\">" +
          esc(Schema().projectLabel(focus)) +
          "</h1>" +
          '<p class="wu-lead">Living map of what you know in this lane.</p>' +
          '<p class="wu-meta">' +
          items.length +
          " items · " +
          questions.length +
          " questions · " +
          sources.length +
          " sources · <a href=\"#graph/" +
          encodeURIComponent(items[0] ? items[0].id : "") +
          '">Open graph near first item</a></p>' +
          "<h2 class=\"wu-section\">All knowledge</h2>" +
          listHtml(items, "Nothing tagged yet.") +
          "<h2 class=\"wu-section\">Questions</h2>" +
          listHtml(questions, "No questions in this project.") +
          "<h2 class=\"wu-section\">Sources</h2>" +
          listHtml(sources, "No sources tagged.")
        );
      }

      return (
        "<h1 class=\"wu-title\">Projects</h1>" +
        '<p class="wu-lead">Each project is a living map of related knowledge.</p>' +
        '<div class="wu-home-grid">' +
        Schema()
          .PROJECTS.map(function (p) {
            var items = byProj[p.id] || [];
            return (
              '<section class="wu-card"><h2><a href="#projects/' +
              encodeURIComponent(p.id) +
              '">' +
              esc(p.label) +
              "</a></h2>" +
              '<p class="wu-meta">' +
              items.length +
              " items</p>" +
              listHtml(items.slice(0, 5), "Nothing tagged yet.") +
              "</section>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function pathsPanel() {
      var paths = state.nodes
        .filter(function (n) {
          return n.kind === "path";
        })
        .sort(function (a, b) {
          return String(a.title).localeCompare(String(b.title));
        });
      var map = nodeMap();
      return (
        "<h1 class=\"wu-title\">Learning paths</h1>" +
        '<p class="wu-lead">Structured lanes — free to cross-link across disciplines.</p>' +
        '<ul class="wu-path-grid">' +
        paths
          .map(function (p) {
            var children = state.edges
              .filter(function (e) {
                return e.type === "part-of" && e.toId === p.id;
              })
              .map(function (e) {
                return map[e.fromId];
              })
              .filter(Boolean);
            return (
              "<li class=\"wu-card\"><h2><a href=\"#item/" +
              encodeURIComponent(p.id) +
              "\">" +
              esc(p.title) +
              "</a></h2>" +
              '<p class="wu-meta">' +
              children.length +
              " linked · <a href=\"#graph/" +
              encodeURIComponent(p.id) +
              '">Graph</a></p>' +
              listHtml(children.slice(0, 5), "Empty path — link with Part of…") +
              "</li>"
            );
          })
          .join("") +
        "</ul>"
      );
    }

    function libraryPanel() {
      var list = state.nodes.filter(function (n) {
        if (state.libraryKind !== "all" && n.kind !== state.libraryKind) return false;
        if (state.libraryQuery) {
          var blob = (n.title + " " + n.body + " " + (n.tags || []).join(" ")).toLowerCase();
          if (blob.indexOf(state.libraryQuery.toLowerCase()) < 0) return false;
        }
        return n.kind !== "path" || state.libraryKind === "path";
      });
      list.sort(byUpdated);
      return (
        "<h1 class=\"wu-title\">Library</h1>" +
        '<form id="wu-library-filter" class="wu-form wu-form--row">' +
        "<label>Kind <select name=\"kind\"><option value=\"all\">All</option>" +
        kindOptions(state.libraryKind === "all" ? "" : state.libraryKind) +
        "</select></label>" +
        "<label class=\"wu-grow\">Filter <input name=\"q\" value=\"" +
        esc(state.libraryQuery) +
        "\"/></label>" +
        '<button type="submit" class="wu-btn">Apply</button>' +
        '<a class="wu-btn wu-btn--primary" href="#new/concept">New</a></form>' +
        '<p class="wu-meta">' +
        list.length +
        " items</p>" +
        '<ul class="wu-list wu-list--dense">' +
        list
          .slice(0, 250)
          .map(function (n) {
            return itemLink(n, fmtDate(n.updatedAt));
          })
          .join("") +
        "</ul>"
      );
    }

    function settingsPanel() {
      return (
        "<h1 class=\"wu-title\">Settings</h1>" +
        '<div class="wu-card"><h2>Data</h2><p class="wu-meta">' +
        state.nodes.length +
        " nodes · " +
        state.edges.length +
        " edges · schema " +
        esc(Schema().SCHEMA) +
        "</p>" +
        '<p class="wu-actions"><button type="button" class="wu-btn wu-btn--primary" id="wu-export">Export JSON</button> ' +
        '<label class="wu-btn">Import JSON<input type="file" id="wu-import" accept="application/json,.json" hidden/></label></p>' +
        (state.flash ? '<p class="wu-flash">' + esc(state.flash) + "</p>" : "") +
        "</div>" +
        '<div class="wu-card"><h2>Block 2</h2><p>Interactive neighborhood graph, learning dashboard, knowledge health, research workflow, source fields, richer search.</p></div>'
      );
    }

    function editorForm(node, isNew) {
      node = node || Store().normalizeNode({ kind: "concept" });
      var isQ = node.kind === "question";
      var isSrc = Schema().isSourceKind(node.kind);
      return (
        '<form id="wu-edit-form" class="wu-form" data-id="' +
        esc(node.id) +
        '">' +
        "<label>Kind <select name=\"kind\">" +
        kindOptions(node.kind) +
        "</select></label>" +
        "<label>Title <input name=\"title\" required value=\"" +
        esc(node.title === "Untitled" && isNew ? "" : node.title) +
        "\"/></label>" +
        "<label>Summary <input name=\"summary\" value=\"" +
        esc(node.summary || "") +
        "\"/></label>" +
        "<label>Body (Markdown)<textarea name=\"body\" rows=\"14\" class=\"wu-editor\">" +
        esc(node.body || "") +
        "</textarea></label>" +
        "<label>Tags <input name=\"tags\" value=\"" +
        esc((node.tags || []).join(", ")) +
        "\"/></label>" +
        "<label>Source URL <input name=\"url\" value=\"" +
        esc(node.sourceUrl || "") +
        "\"/></label>" +
        (isQ
          ? "<fieldset><legend>Question</legend>" +
            "<label>Status <select name=\"qstatus\">" +
            Schema().QUESTION_STATUSES.map(function (s) {
              return (
                "<option value=\"" +
                s.id +
                "\"" +
                ((node.question && node.question.status) === s.id ? " selected" : "") +
                ">" +
                esc(s.label) +
                "</option>"
              );
            }).join("") +
            "</select></label>" +
            "<label>Confidence (0–5) <input name=\"qconf\" type=\"number\" min=\"0\" max=\"5\" value=\"" +
            esc(node.question && node.question.confidence != null ? node.question.confidence : "") +
            "\"/></label>" +
            "<label>Evidence <textarea name=\"qevidence\" rows=\"3\">" +
            esc((node.question && node.question.evidence) || "") +
            "</textarea></label>" +
            "<label>Resolution <textarea name=\"qresolution\" rows=\"2\">" +
            esc((node.question && node.question.resolution) || "") +
            "</textarea></label></fieldset>"
          : "") +
        (isSrc
          ? "<fieldset><legend>Source details</legend>" +
            "<label>Citation <input name=\"citation\" value=\"" +
            esc((node.source && node.source.citation) || "") +
            "\"/></label>" +
            "<label>Authors <input name=\"authors\" value=\"" +
            esc((node.source && node.source.authors) || "") +
            "\"/></label>" +
            "<label>Year <input name=\"year\" value=\"" +
            esc((node.source && node.source.year) || "") +
            "\"/></label>" +
            "<label>Reading status <select name=\"reading\"><option value=\"\">—</option>" +
            Schema().READING_STATUSES.map(function (s) {
              return (
                "<option value=\"" +
                s.id +
                "\"" +
                ((node.source && node.source.readingStatus) === s.id ? " selected" : "") +
                ">" +
                esc(s.label) +
                "</option>"
              );
            }).join("") +
            "</select></label>" +
            "<label>Source confidence (0–5) <input name=\"sconf\" type=\"number\" min=\"0\" max=\"5\" value=\"" +
            esc(node.source && node.source.confidence != null ? node.source.confidence : "") +
            "\"/></label></fieldset>"
          : "") +
        "<fieldset><legend>Research stage</legend>" +
        "<label>Stage <select name=\"rstage\"><option value=\"\">—</option>" +
        Schema().RESEARCH_STAGES.map(function (s) {
          return (
            "<option value=\"" +
            s.id +
            "\"" +
            ((node.research && node.research.stage) === s.id ? " selected" : "") +
            ">" +
            esc(s.label) +
            "</option>"
          );
        }).join("") +
        "</select></label>" +
        "<label>Next action <input name=\"rnext\" value=\"" +
        esc((node.research && node.research.nextAction) || "") +
        "\"/></label>" +
        "<label>Conclusions <textarea name=\"rconc\" rows=\"2\">" +
        esc((node.research && node.research.conclusions) || "") +
        "</textarea></label></fieldset>" +
        '<fieldset><legend>Queues</legend>' +
        "<label><input type=\"checkbox\" name=\"readingQ\"" +
        (node.queue && node.queue.reading ? " checked" : "") +
        "/> Reading queue</label>" +
        "<label><input type=\"checkbox\" name=\"inbox\"" +
        (node.queue && node.queue.researchInbox ? " checked" : "") +
        "/> Research inbox</label>" +
        "<label><input type=\"checkbox\" name=\"focus\"" +
        (node.queue && node.queue.focusToday ? " checked" : "") +
        "/> Today's focus</label></fieldset>" +
        '<fieldset><legend>Projects</legend><div class="wu-proj-grid">' +
        projectOptions(node.projects || []) +
        "</div></fieldset>" +
        "<label><input type=\"checkbox\" name=\"bookmarked\"" +
        (node.bookmarked ? " checked" : "") +
        "/> Bookmarked</label>" +
        '<div class="wu-actions"><button type="submit" class="wu-btn wu-btn--primary">Save</button> ' +
        (!isNew
          ? '<a class="wu-btn" href="#item/' + encodeURIComponent(node.id) + '">Cancel</a>'
          : '<a class="wu-btn" href="#home">Cancel</a>') +
        "</div></form>"
      );
    }

    function itemPanel(id, mode) {
      var node = state.nodes.filter(function (n) {
        return n.id === id;
      })[0];
      if (!node) return '<p class="wu-empty" role="alert">Item not found.</p>';
      if (mode === "edit") {
        return (
          '<p><a href="#item/' +
          encodeURIComponent(id) +
          '">← View</a></p><h1 class="wu-title">Edit</h1>' +
          editorForm(node, false)
        );
      }

      var map = nodeMap();
      var edges = state.edges.filter(function (e) {
        return e.fromId === id || e.toId === id;
      });
      var groups = {};
      edges.forEach(function (e) {
        var outbound = e.fromId === id;
        var type = e.type;
        var otherId = outbound ? e.toId : e.fromId;
        if (!outbound) {
          var rt = Schema().relationMeta(e.type);
          if (rt && rt.inverse) type = rt.inverse;
        }
        if (!groups[type]) groups[type] = [];
        groups[type].push({ edge: e, other: map[otherId] });
      });

      var follow = Search().followUps(node, state.graphIndex, 6);

      return (
        '<p class="wu-crumb"><a href="#library">Library</a> · ' +
        esc(Schema().kindLabel(node.kind)) +
        ' · <a href="#graph/' +
        encodeURIComponent(id) +
        '">Graph neighborhood</a></p>' +
        "<h1 class=\"wu-title\">" +
        esc(node.title) +
        (node.bookmarked ? " ★" : "") +
        "</h1>" +
        '<p class="wu-meta">Updated ' +
        esc(fmtDate(node.updatedAt)) +
        (node.question && node.question.status ? " · Q: " + node.question.status : "") +
        (node.research && node.research.stage ? " · Research: " + node.research.stage : "") +
        (node.source && node.source.readingStatus ? " · Reading: " + node.source.readingStatus : "") +
        "</p>" +
        ((node.projects || []).length
          ? '<p class="wu-meta">Projects using this: ' +
            node.projects
              .map(function (pid) {
                return (
                  '<a href="#projects/' +
                  encodeURIComponent(pid) +
                  '">' +
                  esc(Schema().projectLabel(pid)) +
                  "</a>"
                );
              })
              .join(" · ") +
            "</p>"
          : "") +
        (node.source && node.source.citation
          ? '<p class="wu-meta">Citation: ' + esc(node.source.citation) + "</p>"
          : "") +
        '<div class="wu-actions">' +
        '<a class="wu-btn wu-btn--primary" href="#item/' +
        encodeURIComponent(id) +
        '/edit">Edit</a> ' +
        '<button type="button" class="wu-btn" data-toggle-bookmark="' +
        esc(id) +
        '">' +
        (node.bookmarked ? "Unbookmark" : "Bookmark") +
        "</button> " +
        '<button type="button" class="wu-btn" data-del-node="' +
        esc(id) +
        '">Delete</button></div>' +
        (node.question && (node.question.evidence || node.question.resolution)
          ? '<div class="wu-card"><h2>Question status</h2><p class="wu-meta">Confidence: ' +
            esc(String(node.question.confidence != null ? node.question.confidence : "—")) +
            "</p>" +
            (node.question.evidence ? "<p><strong>Evidence</strong><br/>" + esc(node.question.evidence) + "</p>" : "") +
            (node.question.resolution
              ? "<p><strong>Resolution</strong><br/>" + esc(node.question.resolution) + "</p>"
              : "") +
            "</div>"
          : "") +
        '<article class="wu-prose">' +
        Md().render(node.body || "_No body yet._") +
        "</article>" +
        (follow.length
          ? '<section class="wu-card"><h2>Continue with</h2>' +
            listHtml(
              follow.map(function (f) {
                return f.node;
              }),
              ""
            ) +
            "</section>"
          : "") +
        '<section class="wu-card wu-connections"><h2>Connections</h2>' +
        (Object.keys(groups)
          .map(function (type) {
            return (
              "<section class=\"wu-link-group\"><h3>" +
              esc(Schema().relationLabel(type)) +
              "</h3><ul class=\"wu-list\">" +
              groups[type]
                .map(function (g) {
                  return (
                    "<li>" +
                    (g.other
                      ? '<a href="#item/' +
                        encodeURIComponent(g.other.id) +
                        '">' +
                        esc(g.other.title) +
                        "</a>"
                      : "<em>missing</em>") +
                    ' <button type="button" class="wu-linkish" data-del-edge="' +
                    esc(g.edge.id) +
                    '">Remove</button></li>'
                  );
                })
                .join("") +
              "</ul></section>"
            );
          })
          .join("") || '<p class="wu-empty">No links yet.</p>') +
        '<form id="wu-link-form" class="wu-form wu-form--row" data-from="' +
        esc(id) +
        '">' +
        "<label>Relation <select name=\"type\">" +
        Schema().LINK_PICKER.map(function (rid) {
          return (
            "<option value=\"" +
            esc(rid) +
            "\">" +
            esc(Schema().relationLabel(rid)) +
            "</option>"
          );
        }).join("") +
        "</select></label>" +
        "<label class=\"wu-grow\">Link to <input name=\"toQuery\" id=\"wu-link-query\" placeholder=\"Type to filter…\" list=\"wu-link-suggestions\"/>" +
        '<select name="to" id="wu-link-to">' +
        state.nodes
          .filter(function (n) {
            return n.id !== id;
          })
          .sort(function (a, b) {
            return String(a.title).localeCompare(String(b.title));
          })
          .slice(0, 500)
          .map(function (n) {
            return (
              "<option value=\"" +
              esc(n.id) +
              "\">" +
              esc(n.title) +
              " (" +
              esc(n.kind) +
              ")</option>"
            );
          })
          .join("") +
        "</select></label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Add link</button></form></section>'
      );
    }

    function newPanel(kind) {
      return (
        "<h1 class=\"wu-title\">New " +
        esc(Schema().kindLabel(kind || "concept")) +
        "</h1>" +
        editorForm(Store().normalizeNode({ kind: kind || "concept", title: "" }), true)
      );
    }

    function body() {
      var route = parseHash();
      if (route.panel === "home") return homePanel();
      if (route.panel === "capture") return capturePanel();
      if (route.panel === "search") return searchPanel();
      if (route.panel === "graph") return graphPanel();
      if (route.panel === "health") return healthPanel();
      if (route.panel === "paths") return pathsPanel();
      if (route.panel === "research") return researchPanel();
      if (route.panel === "sources") return sourcesPanel();
      if (route.panel === "questions") return questionsPanel();
      if (route.panel === "projects") {
        state.projectFocus = route.id;
        return projectsPanel();
      }
      if (route.panel === "library") return libraryPanel();
      if (route.panel === "settings") return settingsPanel();
      if (route.panel === "item") return itemPanel(route.id, route.mode);
      if (route.panel === "new") return newPanel(route.id);
      return homePanel();
    }

    function collectProjects(form) {
      return Array.prototype.slice
        .call(form.querySelectorAll('input[name="project"]:checked'))
        .map(function (el) {
          return el.value;
        });
    }

    function parseTags(s) {
      return String(s || "")
        .split(",")
        .map(function (t) {
          return t.trim();
        })
        .filter(Boolean);
    }

    function readEditorFields(form, existing) {
      var fd = new FormData(form);
      return Store().normalizeNode(
        Object.assign({}, existing || {}, {
          id: form.getAttribute("data-id"),
          kind: String(fd.get("kind") || "concept"),
          title: String(fd.get("title") || "").trim() || "Untitled",
          summary: String(fd.get("summary") || ""),
          body: String(fd.get("body") || ""),
          tags: parseTags(fd.get("tags")),
          sourceUrl: String(fd.get("url") || "") || null,
          projects: collectProjects(form),
          bookmarked: !!fd.get("bookmarked"),
          question: {
            status: String(fd.get("qstatus") || "") || null,
            confidence: fd.get("qconf") !== "" && fd.get("qconf") != null ? Number(fd.get("qconf")) : null,
            evidence: String(fd.get("qevidence") || "") || null,
            resolution: String(fd.get("qresolution") || "") || null
          },
          source: {
            citation: String(fd.get("citation") || "") || null,
            authors: String(fd.get("authors") || "") || null,
            year: String(fd.get("year") || "") || null,
            readingStatus: String(fd.get("reading") || "") || null,
            confidence: fd.get("sconf") !== "" && fd.get("sconf") != null ? Number(fd.get("sconf")) : null
          },
          research: {
            stage: String(fd.get("rstage") || "") || null,
            nextAction: String(fd.get("rnext") || "") || null,
            conclusions: String(fd.get("rconc") || "") || null
          },
          queue: {
            reading: !!fd.get("readingQ"),
            researchInbox: !!fd.get("inbox"),
            focusToday: !!fd.get("focus")
          }
        })
      );
    }

    async function paint() {
      if (!state.ready) {
        root.innerHTML = '<div class="wu-app"><p class="wu-boot">Opening your private knowledge store…</p></div>';
        return;
      }
      if (state.error) {
        root.innerHTML =
          '<div class="wu-app" role="alert"><h1>Could not open IndexedDB</h1><p>' +
          esc(String(state.error)) +
          "</p></div>";
        return;
      }
      root.innerHTML =
        '<div class="wu-app"><div class="wu-shell">' +
        navHtml() +
        '<main class="wu-main" id="wu-main">' +
        body() +
        "</main></div>" +
        '<p class="wu-disclaimer">Private thinking environment — not part of the public Waypoint Studio suite.</p></div>';
      bind();
      root.removeAttribute("aria-busy");
      var route = parseHash();
      if (route.panel === "item" && route.id && route.mode !== "edit") {
        Store().touchOpened(route.id).then(function () {
          /* silent */
        });
      }
      if (route.panel === "graph" && route.id) state.graphFocus = route.id;
    }

    function bind() {
      var capture = root.querySelector("#wu-capture-form");
      if (capture) {
        capture.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(capture);
          Store()
            .putNode({
              kind: String(fd.get("kind") || "capture"),
              title: String(fd.get("title") || "").trim(),
              body: String(fd.get("body") || ""),
              tags: parseTags(fd.get("tags")),
              projects: collectProjects(capture),
              queue: {
                researchInbox: !!fd.get("inbox"),
                focusToday: !!fd.get("focus"),
                reading: false
              },
              research: !!fd.get("inbox") ? { stage: "capture", nextAction: "Collect sources" } : null,
              capture: { via: "quick-capture", at: Store().nowIso() }
            })
            .then(function (n) {
              return refresh().then(function () {
                setHash("item", n.id);
              });
            });
        });
      }

      var search = root.querySelector("#wu-search-form");
      if (search) {
        search.addEventListener("submit", function (ev) {
          ev.preventDefault();
          state.q = String(new FormData(search).get("q") || "");
          paint();
        });
      }

      var lib = root.querySelector("#wu-library-filter");
      if (lib) {
        lib.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(lib);
          state.libraryKind = String(fd.get("kind") || "all");
          state.libraryQuery = String(fd.get("q") || "");
          paint();
        });
      }

      var gform = root.querySelector("#wu-graph-controls");
      if (gform) {
        gform.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(gform);
          state.graphFocus = String(fd.get("focus"));
          state.graphDepth = Number(fd.get("depth")) || 2;
          setHash("graph", state.graphFocus);
          paint();
        });
      }

      var applyTypes = root.querySelector("#wu-graph-apply-types");
      if (applyTypes) {
        applyTypes.addEventListener("click", function () {
          var groups = Array.prototype.slice
            .call(root.querySelectorAll('#wu-graph-type-filters input[name="gtype"]:checked'))
            .map(function (el) {
              return el.value;
            });
          var types = [];
          Schema().RELATION_TYPES.forEach(function (r) {
            if (groups.indexOf(r.group) >= 0) types.push(r.id);
          });
          state.graphTypes = types.length ? types : Schema().RELATION_TYPES.map(function (r) {
            return r.id;
          });
          paint();
        });
      }

      root.querySelectorAll(".wu-graph-node").forEach(function (g) {
        g.addEventListener("click", function () {
          var id = g.getAttribute("data-id");
          state.graphFocus = id;
          setHash("graph", id);
          paint();
        });
        g.addEventListener("dblclick", function () {
          setHash("item", g.getAttribute("data-id"));
        });
      });

      var edit = root.querySelector("#wu-edit-form");
      if (edit) {
        edit.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var id = edit.getAttribute("data-id");
          Store()
            .getNode(id)
            .then(function (existing) {
              return Store().putNode(readEditorFields(edit, existing));
            })
            .then(function (n) {
              return refresh().then(function () {
                setHash("item", n.id);
              });
            });
        });
      }

      var linkForm = root.querySelector("#wu-link-form");
      if (linkForm) {
        linkForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(linkForm);
          Store()
            .putEdge({
              fromId: linkForm.getAttribute("data-from"),
              toId: String(fd.get("to")),
              type: String(fd.get("type") || "relates-to")
            })
            .then(function () {
              return refresh().then(paint);
            });
        });
        var q = root.querySelector("#wu-link-query");
        var sel = root.querySelector("#wu-link-to");
        if (q && sel) {
          q.addEventListener("input", function () {
            var needle = q.value.toLowerCase();
            Array.prototype.forEach.call(sel.options, function (opt) {
              opt.hidden = needle && opt.text.toLowerCase().indexOf(needle) < 0;
            });
          });
        }
      }

      root.querySelectorAll("[data-del-edge]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          Store()
            .deleteEdge(btn.getAttribute("data-del-edge"))
            .then(function () {
              return refresh().then(paint);
            });
        });
      });

      root.querySelectorAll("[data-toggle-bookmark]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-toggle-bookmark");
          Store()
            .getNode(id)
            .then(function (n) {
              if (!n) return;
              n.bookmarked = !n.bookmarked;
              return Store().putNode(n, { skipRevision: true });
            })
            .then(function () {
              return refresh().then(paint);
            });
        });
      });

      root.querySelectorAll("[data-del-node]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!global.confirm("Delete this item and its connections?")) return;
          Store()
            .deleteNode(btn.getAttribute("data-del-node"))
            .then(function () {
              return refresh().then(function () {
                setHash("library");
              });
            });
        });
      });

      var exp = root.querySelector("#wu-export");
      if (exp) {
        exp.addEventListener("click", function () {
          Store()
            .exportBundle()
            .then(function (bundle) {
              var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
              var a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "waypoint-university-" + new Date().toISOString().slice(0, 10) + ".json";
              a.click();
              state.flash = "Backup downloaded.";
              paint();
            });
        });
      }

      var imp = root.querySelector("#wu-import");
      if (imp) {
        imp.addEventListener("change", function () {
          var file = imp.files && imp.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function () {
            try {
              var data = JSON.parse(String(reader.result || ""));
              Store()
                .importBundle(data, "merge")
                .then(function (res) {
                  state.flash = res.ok ? "Imported " + res.nodes + " nodes." : res.error || "Import failed.";
                  return refresh().then(paint);
                });
            } catch (e) {
              state.flash = "Import failed — invalid JSON.";
              paint();
            }
          };
          reader.readAsText(file);
        });
      }

      var quick = root.querySelector("#wu-quick-open");
      if (quick) {
        quick.addEventListener("click", function () {
          setHash("capture");
        });
      }
    }

    global.addEventListener("keydown", function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && String(ev.key).toLowerCase() === "k") {
        ev.preventDefault();
        setHash("capture");
      }
    });

    if (!global.location.hash) setHash("home");
    global.addEventListener("hashchange", paint);

    Store()
      .bootstrap()
      .then(refresh)
      .then(function () {
        state.ready = true;
        paint();
      })
      .catch(function (err) {
        state.ready = true;
        state.error = err && err.message ? err.message : String(err);
        paint();
      });
  }

  global.WU = global.WU || {};
  global.WU.App = { mount: mount, NAV: NAV };
})(typeof window !== "undefined" ? window : globalThis);
