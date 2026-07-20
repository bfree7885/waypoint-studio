/**
 * Waypoint University — Module 6 application shell.
 * Intelligent research assistant grounded in the owner's library.
 */
(function (global) {
  "use strict";

  var NAV = [
    ["home", "Home"],
    ["knowledge", "Knowledge"],
    ["scholar", "Research"],
    ["assist", "Assist"],
    ["dashboards", "Dashboards"],
    ["write", "Write"],
    ["paths", "Learning Paths"],
    ["projects", "Projects"],
    ["sources", "Sources"],
    ["questions", "Questions"],
    ["decisions", "Decisions"],
    ["journal", "Journal"],
    ["graph", "Graph"],
    ["search", "Search"],
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
  function Learn() {
    return global.WU.Learn;
  }
  function Scholar() {
    return global.WU.Scholar;
  }
  function Assist() {
    return global.WU.Assist;
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
      learningGoals: [],
      lastWriteAt: "",
      insights: null,
      activeSessionId: null,
      scholarWorkspace: "active",
      q: "",
      libraryKind: "all",
      libraryQuery: "",
      flash: "",
      ready: false,
      error: null,
      graphFocus: null,
      graphDepth: 2,
      graphTypes: null,
      projectFocus: null,
      assistPrefs: { remoteAiEnabled: false, assistEnabled: true },
      assistAction: "summarize",
      assistFocusId: null,
      assistResult: null,
      dashboardLane: "waypoint-studio",
      compareIds: [],
      writeFocusId: null,
      synthIds: []
    };

    function rebuild() {
      state.index = Search().buildIndex(state.nodes);
      state.graphIndex = Graph().buildIndex(state.nodes, state.edges);
      if (!state.graphFocus && state.nodes.length) {
        var fav = Graph().frequentlyConnected(state.graphIndex, 1)[0];
        state.graphFocus = (fav && fav.id) || state.nodes[0].id;
      }
      state.insights = Learn().buildInsights(state.graphIndex, {
        lastWriteAt: state.lastWriteAt,
        recentViews: state.recentIds,
        learningGoals: state.learningGoals
      });
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
      state.learningGoals = await Store().getLearningGoals();
      state.lastWriteAt = await Store().getMeta("lastWriteAt", "");
      state.activeSessionId = await Store().getActiveSessionId();
      state.assistPrefs = await Store().getAssistPrefs();
      if (Assist() && Assist().setPrefs) Assist().setPrefs(state.assistPrefs);
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
        '<p class="wu-brand-sub">Private · Scholar</p>' +
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
      var continueLearning = state.nodes
        .filter(function (n) {
          return n.lastOpenedAt && n.kind !== "capture" && n.status !== "archived";
        })
        .sort(byOpened)
        .slice(0, 8);
      var recentKnowledge = state.nodes
        .filter(function (n) {
          return n.kind !== "path" && n.kind !== "capture" && n.status !== "archived";
        })
        .sort(byUpdated)
        .slice(0, 8);
      var questions = state.nodes
        .filter(function (n) {
          return (
            n.kind === "question" &&
            (!n.question ||
              n.question.status === "open" ||
              n.question.status === "investigating" ||
              n.question.status === "partial")
          );
        })
        .sort(byUpdated)
        .slice(0, 8);
      var focus = state.nodes.filter(function (n) {
        return n.queue && n.queue.focusToday && n.status !== "archived";
      }).slice(0, 8);
      var review = state.nodes
        .filter(function (n) {
          return n.review && n.review.enabled;
        })
        .sort(byUpdated)
        .slice(0, 8);
      var projects = Schema().PROJECTS.map(function (p) {
        var count = state.nodes.filter(function (n) {
          return (n.projects || []).indexOf(p.id) >= 0 && n.status !== "archived";
        }).length;
        return { id: p.id, label: p.label, count: count };
      })
        .filter(function (p) {
          return p.count > 0;
        })
        .sort(function (a, b) {
          return b.count - a.count;
        })
        .slice(0, 8);
      var active = Scholar().activeSession(state.nodes, state.activeSessionId);

      return (
        '<header class="wu-hero">' +
        '<p class="wu-eyebrow">Daily workspace</p>' +
        '<h1 class="wu-title">Continue where you left off</h1>' +
        '<p class="wu-lead">Capture, connect, and return — everything here is your real data.</p>' +
        (active
          ? '<p class="wu-meta">Active research session: <a href="#item/' +
            encodeURIComponent(active.id) +
            '">' +
            esc(active.title) +
            "</a> · <a href=\"#scholar/end\">End session</a></p>"
          : '<p class="wu-meta"><a href="#scholar/session">Start a research session</a></p>') +
        (state.assistPrefs.assistEnabled && continueLearning[0]
          ? companionStrip(continueLearning[0])
          : "") +
        "</header>" +
        '<section class="wu-card"><h2>Quick capture</h2>' +
        '<form id="wu-home-capture" class="wu-form">' +
        "<label>Type <select name=\"kind\">" +
        [
          ["concept", "Note / concept"],
          ["question", "Question"],
          ["idea", "Idea"],
          ["book", "Source (book)"],
          ["article", "Source (article)"],
          ["session", "Research session"],
          ["observation", "Observation"],
          ["journal", "Journal entry"],
          ["capture", "Quick note"]
        ]
          .map(function (pair) {
            return "<option value=\"" + pair[0] + "\">" + esc(pair[1]) + "</option>";
          })
          .join("") +
        "</select></label>" +
        "<label>Title <input name=\"title\" required placeholder=\"Spatial Computing\" autofocus/></label>" +
        "<label>Body (Markdown)<textarea name=\"body\" rows=\"5\" placeholder=\"Write freely…\"></textarea></label>" +
        "<label>Tags <input name=\"tags\" placeholder=\"spatial, vision\"/></label>" +
        '<fieldset><legend>Projects</legend><div class="wu-proj-grid">' +
        projectOptions([]) +
        "</div></fieldset>" +
        "<label><input type=\"checkbox\" name=\"focus\"/> Mark as current focus</label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Save</button></form></section>' +
        '<div class="wu-home-grid">' +
        '<section class="wu-card"><h2>Continue</h2>' +
        listHtml(continueLearning, "Open any item — it appears here.") +
        "</section>" +
        '<section class="wu-card"><h2>Current focus</h2>' +
        listHtml(focus, "Check “Mark as current focus” when capturing or editing.") +
        "</section>" +
        '<section class="wu-card"><h2>Open questions</h2>' +
        listHtml(questions, "Capture a question from Quick capture or Questions.") +
        '<p><a href="#questions">All questions →</a></p></section>' +
        '<section class="wu-card"><h2>Recent knowledge</h2>' +
        listHtml(recentKnowledge, "Create your first note above.") +
        '<p><a href="#knowledge">Knowledge library →</a></p></section>' +
        '<section class="wu-card"><h2>Active projects</h2>' +
        (projects.length
          ? '<ul class="wu-list">' +
            projects
              .map(function (p) {
                return (
                  "<li><a href=\"#projects/" +
                  encodeURIComponent(p.id) +
                  "\"><strong>" +
                  esc(p.label) +
                  "</strong></a>" +
                  '<span class="wu-meta">' +
                  p.count +
                  " items</span></li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="wu-empty">Tag notes with a project to grow hubs.</p>') +
        '<p><a href="#projects">All projects →</a></p></section>' +
        '<section class="wu-card"><h2>Review</h2>' +
        listHtml(review, "Enable review while editing an item.") +
        "</section>" +
        "</div>"
      );
    }

    function understandingPanel() {
      var insights = state.insights || Learn().buildInsights(state.graphIndex, {
        learningGoals: state.learningGoals,
        recentViews: state.recentIds,
        lastWriteAt: state.lastWriteAt
      });
      var map = insights.map;
      var profile = insights.profile;
      return (
        "<h1 class=\"wu-title\">Understanding map</h1>" +
        '<p class="wu-lead">Where each topic sits in your journey — descriptive stages, not grades. Movement comes from use.</p>' +
        '<p class="wu-meta">' +
        map.total +
        " topics · avg depth " +
        profile.depth.toFixed(2) +
        " · computed in " +
        (insights.elapsedMs || 0) +
        " ms</p>" +
        '<div class="wu-stage-grid">' +
        map.stages
          .map(function (s) {
            return (
              '<section class="wu-card wu-stage-card"><h2>' +
              esc(s.label) +
              ' <span class="wu-badge">' +
              ((profile.byStage[s.id] && profile.byStage[s.id].length) || 0) +
              "</span></h2>" +
              '<p class="wu-empty">' +
              esc(s.blurb) +
              "</p>" +
              listHtml(s.items, "Nothing here yet.") +
              "</section>"
            );
          })
          .join("") +
        "</div>" +
        '<section class="wu-card"><h2>Attention</h2>' +
        "<h3 class=\"wu-section\">Actively improving</h3>" +
        listHtml(profile.improving, "Keep studying — improvement shows here.") +
        "<h3 class=\"wu-section\">Receiving little attention</h3>" +
        listHtml(profile.neglected, "Nothing quiet right now.") +
        "<h3 class=\"wu-section\">Frequently revisited</h3>" +
        listHtml(profile.revisited, "Revisits accumulate as you return.") +
        "</section>"
      );
    }

    function nextPanel() {
      var insights = state.insights || Learn().buildInsights(state.graphIndex, {
        learningGoals: state.learningGoals,
        recentViews: state.recentIds,
        lastWriteAt: state.lastWriteAt
      });
      return (
        "<h1 class=\"wu-title\">Suggested next steps</h1>" +
        '<p class="wu-lead">A small set of logical moves — each with a reason. Never an endless feed.</p>' +
        '<ul class="wu-list wu-next-list">' +
        ((insights.next || []).length
          ? insights.next
              .map(function (s, i) {
                return (
                  "<li><span class=\"wu-badge\">" +
                  (i + 1) +
                  "</span> <a href=\"#item/" +
                  encodeURIComponent(s.id) +
                  "\"><strong>" +
                  esc(s.node.title) +
                  "</strong></a>" +
                  '<span class="wu-meta">' +
                  esc(Schema().kindLabel(s.node.kind)) +
                  " · " +
                  esc(Learn().stageLabel(Learn().effectiveStage(s.node, state.graphIndex))) +
                  "</span>" +
                  "<p>" +
                  esc(s.why) +
                  "</p></li>"
                );
              })
              .join("")
          : '<li class="wu-empty">No suggestions yet — capture ideas, open questions, or set goals in Settings.</li>') +
        "</ul>" +
        "<h2 class=\"wu-section\">Learning opportunities</h2>" +
        ((insights.gaps || [])
          .map(function (g) {
            return (
              '<section class="wu-card"><h3>' +
              esc(g.title) +
              "</h3><p class=\"wu-empty\">" +
              esc(g.blurb) +
              "</p><ul class=\"wu-list\">" +
              (g.items || [])
                .map(function (it) {
                  return (
                    "<li><a href=\"#item/" +
                    encodeURIComponent(it.id) +
                    "\"><strong>" +
                    esc(it.node.title) +
                    "</strong></a>" +
                    '<span class="wu-meta">' +
                    esc(it.why || "") +
                    "</span></li>"
                  );
                })
                .join("") +
              "</ul></section>"
            );
          })
          .join("") || '<p class="wu-empty">Your map looks balanced.</p>') +
        "<h2 class=\"wu-section\">Cross-disciplinary discovery</h2>" +
        '<div class="wu-home-grid">' +
        (insights.bridges || [])
          .slice(0, 6)
          .map(function (b) {
            return (
              '<section class="wu-card"><h3>' +
              esc(b.label) +
              "</h3><p class=\"wu-empty\">" +
              esc(b.blurb || b.why) +
              "</p><p class=\"wu-meta\">" +
              b.leftCount +
              " · " +
              b.rightCount +
              " items · " +
              b.crossLinks +
              " cross-links" +
              (b.opportunity ? " · opportunity" : "") +
              "</p>" +
              (b.seedNode
                ? '<p><a href="#item/' +
                  encodeURIComponent(b.seedNode.id) +
                  '">' +
                  esc(b.seedNode.title) +
                  "</a></p>"
                : "") +
              "</section>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function timelinePanel() {
      var events = Scholar().mergeTimeline(state.graphIndex, state.nodes, 80);
      var byYear = Object.create(null);
      events.forEach(function (ev) {
        var y = String(ev.at || "").slice(0, 4) || "—";
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(ev);
      });
      var years = Object.keys(byYear).sort(function (a, b) {
        return String(b).localeCompare(String(a));
      });
      return (
        "<h1 class=\"wu-title\">Learning timeline</h1>" +
        '<p class="wu-lead">Intellectual growth over time — sessions, discoveries, reading, field notes, answered questions.</p>' +
        (years.length
          ? years
              .map(function (y) {
                return (
                  "<h2 class=\"wu-section\">" +
                  esc(y) +
                  '</h2><ol class="wu-timeline">' +
                  byYear[y]
                    .map(function (ev) {
                      return (
                        "<li><time class=\"wu-meta\">" +
                        esc(fmtDate(ev.at)) +
                        "</time> <span class=\"wu-badge\">" +
                        esc(ev.type) +
                        "</span> " +
                        (ev.nodeId
                          ? '<a href="#item/' + encodeURIComponent(ev.nodeId) + '">' + esc(ev.title) + "</a>"
                          : esc(ev.title)) +
                        '<span class="wu-meta">' +
                        esc(ev.detail || "") +
                        "</span></li>"
                      );
                    })
                    .join("") +
                  "</ol>"
                );
              })
              .join("")
          : '<p class="wu-empty">Your timeline will fill as you capture, session, and connect.</p>')
      );
    }

    function readingPanel() {
      var sources = state.nodes
        .filter(function (n) {
          return Schema().isSourceKind(n.kind);
        })
        .sort(byUpdated);
      var withNotes = sources.filter(function (n) {
        return (n.annotations || []).length > 0;
      });
      var inProgress = sources.filter(function (n) {
        return n.source && (n.source.readingStatus === "reading" || (n.queue && n.queue.reading));
      });
      return (
        "<h1 class=\"wu-title\">Reading workspace</h1>" +
        '<p class="wu-lead">Deep reading with highlights, margin notes, definitions, and questions — lightweight now, ready for richer annotation later.</p>' +
        '<p class="wu-actions"><a class="wu-btn wu-btn--primary" href="#sources">Source library</a> ' +
        '<a class="wu-btn" href="#new/book">Add book</a> <a class="wu-btn" href="#new/paper">Add paper</a></p>' +
        "<h2 class=\"wu-section\">In progress</h2>" +
        listHtml(inProgress, "Mark a source as Reading or add it to the reading queue.") +
        "<h2 class=\"wu-section\">With annotations</h2>" +
        (withNotes.length
          ? '<ul class="wu-list">' +
            withNotes
              .map(function (n) {
                return (
                  "<li><a href=\"#item/" +
                  encodeURIComponent(n.id) +
                  "\"><strong>" +
                  esc(n.title) +
                  "</strong></a>" +
                  '<span class="wu-meta">' +
                  (n.annotations || []).length +
                  " notes · " +
                  esc(Schema().kindLabel(n.kind)) +
                  "</span></li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="wu-empty">Open a source and add a highlight or margin note.</p>') +
        "<h2 class=\"wu-section\">Personal reference library</h2>" +
        listHtml(sources.slice(0, 40), "Add books, papers, manuals, podcasts, videos, and courses.")
      );
    }

    function scholarPanel() {
      var route = parseHash();
      var mode = route.id || state.scholarWorkspace || "active";
      if (mode === "session") return scholarSessionForm();
      if (mode === "field") return scholarFieldForm();
      if (mode === "thinking") return scholarThinkingPanel();
      if (mode === "end") return scholarEndSessionForm();

      var known = Schema().SCHOLAR_WORKSPACES.some(function (w) {
        return w.id === mode;
      });
      if (!known) mode = "active";
      state.scholarWorkspace = mode;

      var active = Scholar().activeSession(state.nodes, state.activeSessionId);
      var stats = Scholar().workspaceStats(state.nodes);
      var items = Scholar().filterWorkspace(mode, state.nodes).slice(0, 40);
      var ws = Scholar().workspaceMeta(mode);

      return (
        '<header class="wu-hero wu-hero--scholar">' +
        '<p class="wu-eyebrow">Waypoint Scholar</p>' +
        '<h1 class="wu-title">Private research laboratory</h1>' +
        '<p class="wu-lead">Where curiosity becomes organized knowledge — calm, focused, and connected to everything you learn.</p>' +
        '<div class="wu-hero-actions">' +
        (active
          ? '<a class="wu-btn wu-btn--primary" href="#item/' +
            encodeURIComponent(active.id) +
            '">Resume session</a> <a class="wu-btn" href="#scholar/end">End session</a>'
          : '<a class="wu-btn wu-btn--primary" href="#scholar/session">Start research session</a>') +
        ' <a class="wu-btn" href="#scholar/field">Field note</a> <a class="wu-btn" href="#scholar/thinking">Thinking tools</a>' +
        "</div>" +
        (active
          ? '<p class="wu-meta">Active since ' +
            esc(fmtDate(active.session && active.session.startedAt)) +
            " · " +
            esc(active.title) +
            (active.session && active.session.purpose ? " — " + esc(active.session.purpose) : "") +
            "</p>"
          : "") +
        "</header>" +
        '<nav class="wu-workspace-nav" aria-label="Scholar workspaces"><ul>' +
        stats
          .map(function (s) {
            return (
              "<li><a href=\"#scholar/" +
              encodeURIComponent(s.id) +
              "\"" +
              (s.id === mode ? ' aria-current="page"' : "") +
              ">" +
              esc(s.label) +
              ' <span class="wu-badge">' +
              s.count +
              "</span></a></li>"
            );
          })
          .join("") +
        "</ul></nav>" +
        '<section class="wu-card">' +
        "<h2>" +
        esc(ws.label) +
        "</h2>" +
        '<p class="wu-empty">' +
        esc(ws.blurb) +
        "</p>" +
        (ws.primaryAction
          ? '<p><a class="wu-btn" href="' +
            esc(ws.primaryAction.href) +
            '">' +
            esc(ws.primaryAction.label) +
            "</a></p>"
          : "") +
        listHtml(
          items,
          "Nothing in this workspace yet — start a session or capture an idea."
        ) +
        "</section>"
      );
    }

    function scholarSessionForm() {
      return (
        '<p><a href="#scholar">← Scholar</a></p>' +
        "<h1 class=\"wu-title\">Start research session</h1>" +
        '<p class="wu-lead">Focused work on one topic. When you finish, discoveries join your learning timeline.</p>' +
        '<form id="wu-session-start" class="wu-form">' +
        "<label>Topic <input name=\"title\" required placeholder=\"What are you researching?\" autofocus/></label>" +
        "<label>Purpose <input name=\"purpose\" placeholder=\"Why this session?\"/></label>" +
        "<label>Opening notes (Markdown)<textarea name=\"body\" rows=\"6\"></textarea></label>" +
        '<fieldset><legend>Projects</legend><div class="wu-proj-grid">' +
        projectOptions([]) +
        "</div></fieldset>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Begin session</button></form>'
      );
    }

    function scholarEndSessionForm() {
      var active = Scholar().activeSession(state.nodes, state.activeSessionId);
      if (!active) {
        return (
          '<p><a href="#scholar">← Scholar</a></p><p class="wu-empty">No active session.</p>'
        );
      }
      return (
        '<p><a href="#scholar">← Scholar</a></p>' +
        "<h1 class=\"wu-title\">End session</h1>" +
        '<p class="wu-meta">' +
        esc(active.title) +
        " · started " +
        esc(fmtDate(active.session && active.session.startedAt)) +
        "</p>" +
        '<form id="wu-session-end" class="wu-form" data-id="' +
        esc(active.id) +
        '">' +
        "<label>Key discoveries <textarea name=\"discoveries\" rows=\"4\" placeholder=\"What clicked?\"></textarea></label>" +
        "<label>Ideas for future work <textarea name=\"future\" rows=\"3\"></textarea></label>" +
        "<label>Session notes (Markdown)<textarea name=\"body\" rows=\"8\">" +
        esc(active.body || "") +
        "</textarea></label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Complete session</button> ' +
        '<button type="submit" class="wu-btn" name=\"park\" value=\"1\">Park for later</button></form>'
      );
    }

    function scholarFieldForm() {
      return (
        '<p><a href="#scholar">← Scholar</a></p>' +
        "<h1 class=\"wu-title\">Field note</h1>" +
        '<p class="wu-lead">Capture observations from the world — effortless now, linkable later. Architecture ready for place and media.</p>' +
        '<form id="wu-field-form" class="wu-form">' +
        "<label>Context <select name=\"context\">" +
        Schema().FIELD_NOTE_CONTEXTS.map(function (c) {
          return "<option value=\"" + c.id + "\">" + esc(c.label) + "</option>";
        }).join("") +
        "</select></label>" +
        "<label>Title <input name=\"title\" required placeholder=\"What did you notice?\" autofocus/></label>" +
        "<label>Place <input name=\"place\" placeholder=\"Trail, cellar, lab, host…\"/></label>" +
        "<label>Conditions <input name=\"conditions\" placeholder=\"Weather, setup, constraints…\"/></label>" +
        "<label>Notes (Markdown)<textarea name=\"body\" rows=\"8\"></textarea></label>" +
        '<fieldset><legend>Projects</legend><div class="wu-proj-grid">' +
        projectOptions([]) +
        "</div></fieldset>" +
        "<label><input type=\"checkbox\" name=\"focus\"/> Today's focus</label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Save field note</button></form>'
      );
    }

    function scholarThinkingPanel() {
      var tools = Scholar().thinkingCatalog();
      var existing = state.nodes
        .filter(function (n) {
          return n.thinking && n.thinking.tool;
        })
        .sort(function (a, b) {
          return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
        })
        .slice(0, 20);
      return (
        '<p><a href="#scholar">← Scholar</a></p>' +
        "<h1 class=\"wu-title\">Thinking tools</h1>" +
        '<p class="wu-lead">Decision journal and hypothesis tracking are ready. Concept maps, argument maps, and experiment plans remain lightweight stubs.</p>' +
        '<div class="wu-home-grid">' +
        tools
          .map(function (t) {
            return (
              '<section class="wu-card"><h2>' +
              esc(t.label) +
              '</h2><p class="wu-empty">' +
              esc(t.blurb) +
              '</p><p class="wu-meta">Status: ' +
              esc(t.status) +
              '</p><button type="button" class="wu-btn" data-thinking-tool="' +
              esc(t.id) +
              '">Create stub</button></section>'
            );
          })
          .join("") +
        "</div>" +
        "<h2 class=\"wu-section\">Your thinking artifacts</h2>" +
        listHtml(existing, "Create a stub to begin — expand fields while editing.")
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
      var results = state.q
        ? Assist().naturalSearch(state.q, state.index, state.graphIndex)
        : [];
      var related = state.q ? Search().relatedToResults(state.graphIndex, results, 8) : [];
      var recent = state.recentIds
        .map(function (id) {
          return nodeMap()[id];
        })
        .filter(Boolean)
        .slice(0, 6);
      var focusNode = results[0] && results[0].node;
      var assist = focusNode ? Search().researchAssist(state.graphIndex, focusNode) : null;
      var follow = assist ? assist.followUps : [];

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
                " · " +
                esc(Learn().stageLabel(Learn().effectiveStage(r.node, state.graphIndex))) +
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
        '<p class="wu-lead">Natural language over your library — results explain why they matched. Examples: “Show everything related to spatial computing”, “Find notes mentioning both Linux and networking”, “Show unresolved questions about computer vision”.</p>' +
        '<form id="wu-search-form" class="wu-form wu-form--row">' +
        "<label class=\"wu-grow\">Query <input name=\"q\" value=\"" +
        esc(state.q) +
        "\" placeholder=\"Ask in plain language or keywords…\" autofocus/></label>" +
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
            (assist
              ? "<h2 class=\"wu-section\">Nearby concepts</h2>" +
                (assist.nearby.length ? resultList(assist.nearby) : '<p class="wu-empty">No neighbors yet.</p>') +
                "<h2 class=\"wu-section\">Frequently connected ideas</h2>" +
                (assist.frequent.length ? resultList(assist.frequent) : '<p class="wu-empty">—</p>') +
                "<h2 class=\"wu-section\">Suggested follow-up reading</h2>" +
                (follow.length ? resultList(follow) : '<p class="wu-empty">—</p>') +
                "<h2 class=\"wu-section\">Projects using this</h2>" +
                (assist.projects.length
                  ? "<p>" +
                    assist.projects
                      .map(function (p) {
                        return (
                          '<a href="#projects/' + encodeURIComponent(p.id) + '">' + esc(p.label) + "</a>"
                        );
                      })
                      .join(" · ") +
                    "</p>"
                  : '<p class="wu-empty">No project tags on the top hit.</p>') +
                "<h2 class=\"wu-section\">Questions involving this</h2>" +
                (assist.questions.length
                  ? resultList(assist.questions)
                  : '<p class="wu-empty">No open questions nearby.</p>')
              : "")
          : '<p class="wu-lead">Every result explains why it matched. Context expands from the top hit.</p>') +
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
        '<p class="wu-lead">Personal reference library — citation, reading status, graph links, and reliability assessment.</p>' +
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
                var rel = Scholar().reliabilitySummary(n);
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
                  (rel.assessed ? " · " + esc(rel.blurb) : "") +
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

      if (focus && byProj[focus] != null) {
        var intel = Scholar().projectResearchHub(focus, state.graphIndex);
        return (
          '<p><a href="#projects">← All projects</a></p>' +
          "<h1 class=\"wu-title\">" +
          esc(intel.label) +
          "</h1>" +
          '<p class="wu-lead">Project research hub — notes, sessions, questions, sources, experiments, and ideas in one living map.</p>' +
          '<p class="wu-meta">' +
          intel.related.length +
          " items · " +
          intel.sessions.length +
          " sessions · " +
          intel.questions.length +
          " open questions · " +
          intel.references.length +
          " sources" +
          (intel.related[0]
            ? ' · <a href="#graph/' + encodeURIComponent(intel.related[0].id) + '">Graph</a>'
            : "") +
          ' · <a href="#scholar/session">New session</a></p>' +
          (intel.connectedDisciplines.length
            ? '<p class="wu-meta">Connected disciplines: ' +
              intel.connectedDisciplines
                .map(function (d) {
                  return (
                    '<a href="#projects/' + encodeURIComponent(d.id) + '">' + esc(d.label) + "</a>"
                  );
                })
                .join(" · ") +
              "</p>"
            : "") +
          (intel.bridges.length
            ? '<section class="wu-card"><h2>Bridge opportunities</h2><ul class="wu-list">' +
              intel.bridges
                .map(function (b) {
                  return (
                    "<li><strong>" +
                    esc(b.label) +
                    "</strong><span class=\"wu-meta\">" +
                    esc(b.why) +
                    "</span></li>"
                  );
                })
                .join("") +
              "</ul></section>"
            : "") +
          "<h2 class=\"wu-section\">Research sessions</h2>" +
          listHtml(intel.sessions, "No sessions tagged to this project yet.") +
          "<h2 class=\"wu-section\">Missing knowledge</h2>" +
          (intel.missing.length
            ? '<ul class="wu-list">' +
              intel.missing
                .map(function (m) {
                  return (
                    "<li><a href=\"#item/" +
                    encodeURIComponent(m.id) +
                    "\"><strong>" +
                    esc(m.node.title) +
                    "</strong></a>" +
                    '<span class="wu-meta">' +
                    esc(m.why) +
                    "</span></li>"
                  );
                })
                .join("") +
              "</ul>"
            : '<p class="wu-empty">No obvious missing prerequisites.</p>') +
          "<h2 class=\"wu-section\">Open questions</h2>" +
          listHtml(intel.questions, "No open questions in this project.") +
          "<h2 class=\"wu-section\">Related notes &amp; concepts</h2>" +
          listHtml(intel.notes, "No notes yet.") +
          "<h2 class=\"wu-section\">Helpful references</h2>" +
          listHtml(intel.references, "No sources tagged yet.") +
          "<h2 class=\"wu-section\">Experiments &amp; hypotheses</h2>" +
          listHtml(intel.experiments, "None yet.") +
          "<h2 class=\"wu-section\">Field notes</h2>" +
          listHtml(intel.fieldNotes, "No field notes.") +
          "<h2 class=\"wu-section\">Ideas</h2>" +
          listHtml(intel.ideas, "No ideas tagged.") +
          "<h2 class=\"wu-section\">Recent discoveries</h2>" +
          listHtml(intel.recent, "Nothing recent.") +
          "<h2 class=\"wu-section\">All related knowledge</h2>" +
          listHtml(intel.related, "Nothing tagged yet.")
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
      var route = parseHash();
      var map = nodeMap();
      if (route.id) {
        var path = state.nodes.filter(function (n) {
          return n.id === route.id && n.kind === "path";
        })[0];
        if (!path) return '<p class="wu-empty">Path not found. <a href="#paths">Back</a></p>';
        var order = (path.meta && path.meta.order) || [];
        var children = state.edges
          .filter(function (e) {
            return e.type === "part-of" && e.toId === path.id;
          })
          .map(function (e) {
            return map[e.fromId];
          })
          .filter(Boolean);
        children.sort(function (a, b) {
          var ia = order.indexOf(a.id);
          var ib = order.indexOf(b.id);
          if (ia < 0 && ib < 0) return String(a.title).localeCompare(String(b.title));
          if (ia < 0) return 1;
          if (ib < 0) return -1;
          return ia - ib;
        });
        var qs = state.nodes.filter(function (n) {
          return n.kind === "question" && (n.pathId === path.id || (n.projects || []).some(function () {
            return false;
          }));
        });
        // questions linked via edges or same tags as path slug
        qs = state.nodes.filter(function (n) {
          if (n.kind !== "question") return false;
          return state.edges.some(function (e) {
            return (
              (e.fromId === n.id && e.toId === path.id) ||
              (e.toId === n.id && e.fromId === path.id)
            );
          });
        });
        return (
          '<p><a href="#paths">← Learning paths</a></p>' +
          "<h1 class=\"wu-title\">" +
          esc(path.title) +
          "</h1>" +
          '<p class="wu-lead">' +
          esc(path.summary || "Organize knowledge without grades.") +
          "</p>" +
          '<article class="wu-prose">' +
          Md().render(path.body || "") +
          "</article>" +
          '<p class="wu-actions"><a class="wu-btn" href="#item/' +
          encodeURIComponent(path.id) +
          '/edit">Edit path</a> <a class="wu-btn" href="#graph/' +
          encodeURIComponent(path.id) +
          '">Graph</a></p>' +
          "<h2 class=\"wu-section\">Entries (" +
          children.length +
          ")</h2>" +
          listHtml(children, "Add knowledge with the form below.") +
          '<form id="wu-path-add" class="wu-form wu-form--row" data-path="' +
          esc(path.id) +
          '">' +
          "<label class=\"wu-grow\">Add existing item <select name=\"node\">" +
          state.nodes
            .filter(function (n) {
              return n.kind !== "path" && n.id !== path.id;
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
          '<button type="submit" class="wu-btn wu-btn--primary">Add to path</button></form>' +
          "<h2 class=\"wu-section\">Related questions</h2>" +
          listHtml(qs, "Link questions to this path from an item’s Connections.") +
          (path.meta && path.meta.focusId
            ? '<p class="wu-meta">Current focus: <a href="#item/' +
              encodeURIComponent(path.meta.focusId) +
              '">' +
              esc((map[path.meta.focusId] && map[path.meta.focusId].title) || path.meta.focusId) +
              "</a></p>"
            : "")
        );
      }

      var paths = state.nodes
        .filter(function (n) {
          return n.kind === "path";
        })
        .sort(function (a, b) {
          return String(a.title).localeCompare(String(b.title));
        });
      return (
        "<h1 class=\"wu-title\">Learning paths</h1>" +
        '<p class="wu-lead">Organize knowledge into lanes — no grades, no mandatory curriculum.</p>' +
        '<p><a class="wu-btn wu-btn--primary" href="#new/path">New learning path</a></p>' +
        '<ul class="wu-path-grid">' +
        paths
          .map(function (p) {
            var children = state.edges.filter(function (e) {
              return e.type === "part-of" && e.toId === p.id;
            }).length;
            return (
              "<li class=\"wu-card\"><h2><a href=\"#paths/" +
              encodeURIComponent(p.id) +
              "\">" +
              esc(p.title) +
              "</a></h2>" +
              '<p class="wu-meta">' +
              children +
              " entries · " +
              (p.meta && p.meta.template ? "starter path · " : "") +
              '<a href="#item/' +
              encodeURIComponent(p.id) +
              '">Open</a></p>' +
              '<p class="wu-empty">' +
              esc(p.summary || "Add a description while editing.") +
              "</p></li>"
            );
          })
          .join("") +
        "</ul>"
      );
    }

    function journalPanel() {
      var entries = state.nodes
        .filter(function (n) {
          return n.kind === "journal";
        })
        .sort(function (a, b) {
          var da = (a.journal && a.journal.date) || a.createdAt || "";
          var db = (b.journal && b.journal.date) || b.createdAt || "";
          return String(db).localeCompare(String(da));
        });
      return (
        "<h1 class=\"wu-title\">Journal</h1>" +
        '<p class="wu-lead">Dated intellectual context — not a health tracker or social diary.</p>' +
        '<p><a class="wu-btn wu-btn--primary" href="#new/journal">New entry</a></p>' +
        '<ul class="wu-list">' +
        (entries.length
          ? entries
              .map(function (n) {
                return (
                  "<li><a href=\"#item/" +
                  encodeURIComponent(n.id) +
                  "\"><strong>" +
                  esc(n.title) +
                  "</strong></a>" +
                  '<span class="wu-meta">' +
                  esc((n.journal && n.journal.date) || fmtDate(n.createdAt)) +
                  ((n.tags || []).length ? " · " + esc(n.tags.join(", ")) : "") +
                  "</span></li>"
                );
              })
              .join("")
          : '<li class="wu-empty">Write your first journal entry to preserve context over time.</li>') +
        "</ul>"
      );
    }

    function knowledgePanel() {
      state.libraryKind = state.libraryKind || "all";
      return libraryPanel().replace(
        "<h1 class=\"wu-title\">Library</h1>",
        "<h1 class=\"wu-title\">Knowledge</h1>"
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
        '<div class="wu-card"><h2>Account &amp; privacy</h2>' +
        '<p class="wu-empty">Owner-only application. Sign-in is enforced by the local University server when you use <code>./start.sh</code>.</p>' +
        '<p class="wu-actions"><a class="wu-btn" href="/logout">Sign out</a></p>' +
        "<ul class=\"wu-list\">" +
        "<li><span class=\"wu-meta\">Data location</span><br/>Browser IndexedDB database <code>waypoint-university-v1</code> on this profile.</li>" +
        "<li><span class=\"wu-meta\">Public exposure</span><br/>Not in the Waypoint Studio directory. Pages deploy strips <code>private/</code>. robots.txt disallows /private/.</li>" +
        "<li><span class=\"wu-meta\">Remote subdomain</span><br/>university.waypointstudio.org is <strong>not</strong> configured in this stack yet — see ACCESS.md.</li>" +
        "</ul></div>" +
        '<div class="wu-card"><h2>Long-term learning goals</h2>' +
        '<form id="wu-goals-form" class="wu-form">' +
        "<label>Goals (one per line)<textarea name=\"goals\" rows=\"4\">" +
        esc((state.learningGoals || []).join("\n")) +
        "</textarea></label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Save goals</button></form></div>' +
        '<div class="wu-card"><h2>Backup &amp; export</h2><p class="wu-meta">' +
        state.nodes.length +
        " nodes · " +
        state.edges.length +
        " edges · schema " +
        esc(Schema().SCHEMA) +
        "</p>" +
        '<p class="wu-actions"><button type="button" class="wu-btn wu-btn--primary" id="wu-export">Export JSON backup</button> ' +
        '<button type="button" class="wu-btn" id="wu-export-md">Export Markdown</button> ' +
        '<label class="wu-btn">Import JSON<input type="file" id="wu-import" accept="application/json,.json" hidden/></label></p>' +
        '<p class="wu-empty">Export creates a download on this device. Nothing is uploaded. Restore by importing the JSON backup.</p>' +
        (state.flash ? '<p class="wu-flash">' + esc(state.flash) + "</p>" : "") +
        "</div>" +
        '<div class="wu-card"><h2>Research assistant &amp; privacy</h2>' +
        '<p class="wu-lead">No research content leaves this environment unless you explicitly enable a remote AI provider (none is configured in Module 6).</p>' +
        '<form id="wu-assist-prefs" class="wu-form">' +
        "<label><input type=\"checkbox\" name=\"assistEnabled\"" +
        (state.assistPrefs.assistEnabled !== false ? " checked" : "") +
        "/> Enable local research assistant (related knowledge, gaps, Assist actions)</label>" +
        "<label><input type=\"checkbox\" name=\"remoteAi\"" +
        (state.assistPrefs.remoteAiEnabled ? " checked" : "") +
        "/> Allow remote AI (future) — currently refuses to transmit; leave off</label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Save assistant prefs</button></form>' +
        '<ul class="wu-list">' +
        "<li><span class=\"wu-meta\">Could transmit externally</span><br/>Only a future remote AI provider, and only if you enable Remote AI. Export downloads stay on-device. Fonts may load from Google Fonts if the network is available (cosmetic).</li>" +
        "<li><span class=\"wu-meta\">Local-first</span><br/>Assist actions, search, dashboards, and relationship discovery run entirely in the browser against IndexedDB.</li>" +
        "</ul></div>" +
        '<div class="wu-card"><h2>Appearance</h2>' +
        '<p class="wu-empty">Calm light theme is fixed for deep study. System reduced-motion preferences are respected.</p></div>' +
        '<div class="wu-card"><h2>Module 6</h2><p>Local research assistant, decision journal, hypotheses, dashboards, writing workspace, compare &amp; synthesis. Schema ' +
        esc(Schema().SCHEMA) +
        ".</p></div>"
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
        "<label>Status <select name=\"status\">" +
        (Schema().NODE_STATUSES || [{ id: "active", label: "Active" }])
          .map(function (s) {
            return (
              "<option value=\"" +
              s.id +
              "\"" +
              ((node.status || "active") === s.id ? " selected" : "") +
              ">" +
              esc(s.label) +
              "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        "<label>Title <input name=\"title\" required value=\"" +
        esc(node.title === "Untitled" && isNew ? "" : node.title) +
        "\"/></label>" +
        "<label>Summary <input name=\"summary\" value=\"" +
        esc(node.summary || "") +
        "\"/></label>" +
        "<label>Body (Markdown)<textarea name=\"body\" rows=\"14\" class=\"wu-editor\" id=\"wu-body\">" +
        esc(node.body || "") +
        "</textarea></label>" +
        '<p class="wu-actions"><button type="button" class="wu-btn" id="wu-preview-toggle">Toggle preview</button> ' +
        '<span class="wu-meta" id="wu-draft-status">Edits autosave as drafts every few seconds</span></p>' +
        '<div id="wu-preview" class="wu-prose wu-preview" hidden></div>' +
        "<label>Learning path <select name=\"pathId\"><option value=\"\">—</option>" +
        state.nodes
          .filter(function (n) {
            return n.kind === "path";
          })
          .map(function (p) {
            return (
              "<option value=\"" +
              esc(p.id) +
              "\"" +
              (node.pathId === p.id ? " selected" : "") +
              ">" +
              esc(p.title) +
              "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        "<label>Tags <input name=\"tags\" value=\"" +
        esc((node.tags || []).join(", ")) +
        "\"/></label>" +
        (node.kind === "journal"
          ? "<label>Journal date <input name=\"jdate\" type=\"date\" value=\"" +
            esc((node.journal && node.journal.date) || "") +
            "\"/></label>"
          : "") +
        "<label><input type=\"checkbox\" name=\"reviewOn\"" +
        (node.review && node.review.enabled ? " checked" : "") +
        "/> Mark for later review</label>" +
        "<label>Review due <input name=\"reviewDue\" type=\"date\" value=\"" +
        esc(node.review && node.review.dueAt ? String(node.review.dueAt).slice(0, 10) : "") +
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
            "\"/></label></fieldset>" +
            "<fieldset><legend>Source reliability (personal)</legend>" +
            '<p class="wu-empty">Organize evidence without pretending certainty.</p>' +
            Schema().RELIABILITY_DIMENSIONS.map(function (d) {
              return (
                "<label>" +
                esc(d.label) +
                " (0–5) <input name=\"rel_" +
                d.id +
                "\" type=\"number\" min=\"0\" max=\"5\" value=\"" +
                esc(
                  node.reliability && node.reliability[d.id] != null ? node.reliability[d.id] : ""
                ) +
                "\"/></label>"
              );
            }).join("") +
            "<label>Conflicting viewpoints <textarea name=\"rel_conflicts\" rows=\"2\">" +
            esc((node.reliability && node.reliability.conflicts) || "") +
            "</textarea></label>" +
            "<label>Reliability notes <textarea name=\"rel_notes\" rows=\"2\">" +
            esc((node.reliability && node.reliability.notes) || "") +
            "</textarea></label></fieldset>"
          : "") +
        (node.kind === "session"
          ? "<fieldset><legend>Session</legend>" +
            "<label>Purpose <input name=\"spurpose\" value=\"" +
            esc((node.session && node.session.purpose) || "") +
            "\"/></label>" +
            "<label>Status <select name=\"sstatus\">" +
            Schema().SESSION_STATUSES.map(function (s) {
              return (
                "<option value=\"" +
                s.id +
                "\"" +
                ((node.session && node.session.status) === s.id ? " selected" : "") +
                ">" +
                esc(s.label) +
                "</option>"
              );
            }).join("") +
            "</select></label>" +
            "<label>Key discoveries <textarea name=\"sdisc\" rows=\"3\">" +
            esc((node.session && node.session.discoveries) || "") +
            "</textarea></label>" +
            "<label>Future work <textarea name=\"sfuture\" rows=\"2\">" +
            esc((node.session && node.session.futureWork) || "") +
            "</textarea></label></fieldset>"
          : "") +
        (node.kind === "field-note"
          ? "<fieldset><legend>Field context</legend>" +
            "<label>Context <select name=\"fcontext\">" +
            Schema().FIELD_NOTE_CONTEXTS.map(function (c) {
              return (
                "<option value=\"" +
                c.id +
                "\"" +
                ((node.field && node.field.context) === c.id ? " selected" : "") +
                ">" +
                esc(c.label) +
                "</option>"
              );
            }).join("") +
            "</select></label>" +
            "<label>Place <input name=\"fplace\" value=\"" +
            esc((node.field && node.field.place) || "") +
            "\"/></label>" +
            "<label>Conditions <input name=\"fcond\" value=\"" +
            esc((node.field && node.field.conditions) || "") +
            "\"/></label></fieldset>"
          : "") +
        (node.kind === "decision" || (node.thinking && node.thinking.tool === "decision-journal")
          ? "<fieldset><legend>Decision journal</legend>" +
            "<label>Status <select name=\"tstatus\">" +
            (Schema().DECISION_STATUSES || []).map(function (s) {
              return (
                "<option value=\"" +
                s.id +
                "\"" +
                ((node.thinking && node.thinking.status) === s.id ? " selected" : "") +
                ">" +
                esc(s.label) +
                "</option>"
              );
            }).join("") +
            "</select></label>" +
            "<label>Decision made <textarea name=\"tdecision\" rows=\"2\">" +
            esc((node.thinking && node.thinking.decision) || "") +
            "</textarea></label>" +
            "<label>Reasoning <textarea name=\"trationale\" rows=\"3\">" +
            esc((node.thinking && (node.thinking.rationale || node.thinking.chosen)) || "") +
            "</textarea></label>" +
            "<label>Evidence used <textarea name=\"tevidence\" rows=\"2\">" +
            esc((node.thinking && (node.thinking.evidenceUsed || node.thinking.supports)) || "") +
            "</textarea></label>" +
            "<label>Alternatives considered <textarea name=\"talts\" rows=\"2\">" +
            esc((node.thinking && (node.thinking.alternatives || node.thinking.options)) || "") +
            "</textarea></label>" +
            "<label>Expected outcome <textarea name=\"texpected\" rows=\"2\">" +
            esc((node.thinking && node.thinking.expectedOutcome) || "") +
            "</textarea></label>" +
            "<label>Confidence (0–5) <input name=\"tconf\" type=\"number\" min=\"0\" max=\"5\" value=\"" +
            esc(node.thinking && node.thinking.confidence != null ? node.thinking.confidence : "") +
            "\"/></label>" +
            "<label>Review date <input name=\"treview\" type=\"date\" value=\"" +
            esc((node.thinking && node.thinking.reviewDate) || "") +
            "\"/></label>" +
            "<label>Later observations <textarea name=\"tlater\" rows=\"3\">" +
            esc((node.thinking && node.thinking.laterObservations) || "") +
            "</textarea></label></fieldset>"
          : node.kind === "hypothesis" || (node.thinking && node.thinking.tool === "hypothesis")
          ? "<fieldset><legend>Hypothesis (provisional)</legend>" +
            "<label>Status <select name=\"thypstatus\">" +
            (Schema().HYPOTHESIS_STATUSES || []).map(function (s) {
              return (
                "<option value=\"" +
                s.id +
                "\"" +
                ((node.thinking && node.thinking.hypothesisStatus) === s.id ? " selected" : "") +
                ">" +
                esc(s.label) +
                "</option>"
              );
            }).join("") +
            "</select></label>" +
            "<label>Statement <textarea name=\"tclaim\" rows=\"3\">" +
            esc((node.thinking && (node.thinking.statement || node.thinking.claim)) || "") +
            "</textarea></label>" +
            "<label>Supporting evidence <textarea name=\"tsupporting\" rows=\"2\">" +
            esc((node.thinking && (node.thinking.supportingEvidence || node.thinking.supports)) || "") +
            "</textarea></label>" +
            "<label>Contradicting evidence <textarea name=\"tcontradict\" rows=\"2\">" +
            esc((node.thinking && (node.thinking.contradictingEvidence || node.thinking.objections)) || "") +
            "</textarea></label>" +
            "<label>Experiments <textarea name=\"texperiments\" rows=\"2\">" +
            esc((node.thinking && (node.thinking.experiments || node.thinking.method)) || "") +
            "</textarea></label>" +
            "<label>Confidence (0–5) <input name=\"tconf\" type=\"number\" min=\"0\" max=\"5\" value=\"" +
            esc(node.thinking && node.thinking.confidence != null ? node.thinking.confidence : "") +
            "\"/></label>" +
            "<label>Questions generated <textarea name=\"tnext\" rows=\"2\">" +
            esc((node.thinking && node.thinking.next) || "") +
            "</textarea></label>" +
            '<p class="wu-meta">Hypotheses are never treated as facts.</p></fieldset>'
          : node.thinking && node.thinking.tool
          ? "<fieldset><legend>Thinking tool · " +
            esc(node.thinking.tool) +
            "</legend>" +
            "<label>Status <input name=\"tstatus\" value=\"" +
            esc(node.thinking.status || "draft") +
            "\"/></label>" +
            "<label>Claim / statement <textarea name=\"tclaim\" rows=\"2\">" +
            esc(node.thinking.claim || node.thinking.statement || "") +
            "</textarea></label>" +
            "<label>Supports / options / method <textarea name=\"tsupports\" rows=\"2\">" +
            esc(node.thinking.supports || node.thinking.options || node.thinking.method || "") +
            "</textarea></label>" +
            "<label>Objections / rationale / result <textarea name=\"tobjections\" rows=\"2\">" +
            esc(node.thinking.objections || node.thinking.rationale || node.thinking.result || "") +
            "</textarea></label>" +
            "<label>Next <input name=\"tnext\" value=\"" +
            esc(node.thinking.next || "") +
            "\"/></label></fieldset>"
          : "") +
        "<fieldset><legend>Understanding</legend>" +
        "<label>Stage override <select name=\"stageManual\"><option value=\"\">Auto (from use)</option>" +
        Schema().UNDERSTANDING_STAGES.map(function (s) {
          return (
            "<option value=\"" +
            s.id +
            "\"" +
            ((node.learning && node.learning.stageManual) === s.id ? " selected" : "") +
            ">" +
            esc(s.label) +
            "</option>"
          );
        }).join("") +
        "</select></label>" +
        "<label>Knowledge confidence (0–5) <input name=\"lconf\" type=\"number\" min=\"0\" max=\"5\" value=\"" +
        esc(node.learning && node.learning.confidence != null ? node.learning.confidence : "") +
        "\"/></label>" +
        '<p class="wu-meta">Auto stage now: ' +
        esc(Learn().stageLabel(Learn().effectiveStage(node, state.graphIndex))) +
        " · opens " +
        esc(String((node.learning && node.learning.openCount) || 0)) +
        "</p></fieldset>" +
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
        '<div class="wu-item-layout">' +
        '<div class="wu-item-main">' +
        companionStrip(node) +
        '<p class="wu-crumb"><a href="#library">Library</a> · ' +
        esc(Schema().kindLabel(node.kind)) +
        ' · <a href="#graph/' +
        encodeURIComponent(id) +
        '">Graph neighborhood</a> · <a href="#assist">Assist</a> · <a href="#write/' +
        encodeURIComponent(id) +
        '">Write</a></p>' +
        "<h1 class=\"wu-title\">" +
        esc(node.title) +
        (node.bookmarked ? " ★" : "") +
        "</h1>" +
        '<p class="wu-meta">Updated ' +
        esc(fmtDate(node.updatedAt)) +
        " · " +
        esc(Learn().stageLabel(Learn().effectiveStage(node, state.graphIndex))) +
        (node.learning && node.learning.confidence != null
          ? " · confidence " + node.learning.confidence + "/5"
          : "") +
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
        (node.kind === "session" && node.session
          ? '<div class="wu-card"><h2>Research session</h2><p class="wu-meta">' +
            esc(node.session.status || "") +
            " · " +
            esc(fmtDate(node.session.startedAt)) +
            (node.session.endedAt ? " → " + esc(fmtDate(node.session.endedAt)) : " · in progress") +
            "</p>" +
            (node.session.purpose ? "<p><strong>Purpose</strong><br/>" + esc(node.session.purpose) + "</p>" : "") +
            (node.session.discoveries
              ? "<p><strong>Key discoveries</strong><br/>" + esc(node.session.discoveries) + "</p>"
              : "") +
            (node.session.futureWork
              ? "<p><strong>Future work</strong><br/>" + esc(node.session.futureWork) + "</p>"
              : "") +
            (node.session.status === "active"
              ? '<p><a class="wu-btn" href="#scholar/end">End session</a></p>'
              : "") +
            "</div>"
          : "") +
        (node.kind === "field-note" && node.field
          ? '<div class="wu-card"><h2>Field context</h2><p class="wu-meta">' +
            esc(Schema().fieldContextLabel(node.field.context)) +
            (node.field.place ? " · " + esc(node.field.place) : "") +
            (node.field.conditions ? " · " + esc(node.field.conditions) : "") +
            " · " +
            esc(fmtDate(node.field.capturedAt)) +
            "</p></div>"
          : "") +
        (Schema().isSourceKind(node.kind) && Scholar().reliabilityFilled(node.reliability)
          ? '<div class="wu-card"><h2>Source reliability</h2><p class="wu-meta">' +
            esc(Scholar().reliabilitySummary(node).blurb) +
            "</p>" +
            (node.reliability.conflicts
              ? "<p><strong>Conflicting viewpoints</strong><br/>" + esc(node.reliability.conflicts) + "</p>"
              : "") +
            "</div>"
          : "") +
        (node.kind === "decision" || (node.thinking && node.thinking.tool === "decision-journal")
          ? '<div class="wu-card"><h2>Decision journal</h2><p class="wu-meta">' +
            esc((node.thinking && node.thinking.status) || "draft") +
            (node.thinking && node.thinking.confidence != null
              ? " · confidence " + node.thinking.confidence
              : "") +
            (node.thinking && node.thinking.reviewDate
              ? " · review " + esc(node.thinking.reviewDate)
              : "") +
            "</p>" +
            (node.thinking && node.thinking.decision
              ? "<p><strong>Decision</strong><br/>" + esc(node.thinking.decision) + "</p>"
              : "") +
            (node.thinking && (node.thinking.rationale || node.thinking.chosen)
              ? "<p><strong>Reasoning</strong><br/>" +
                esc(node.thinking.rationale || node.thinking.chosen) +
                "</p>"
              : "") +
            (node.thinking && (node.thinking.evidenceUsed || node.thinking.supports)
              ? "<p><strong>Evidence</strong><br/>" +
                esc(node.thinking.evidenceUsed || node.thinking.supports) +
                "</p>"
              : "") +
            (node.thinking && (node.thinking.alternatives || node.thinking.options)
              ? "<p><strong>Alternatives</strong><br/>" +
                esc(node.thinking.alternatives || node.thinking.options) +
                "</p>"
              : "") +
            (node.thinking && node.thinking.expectedOutcome
              ? "<p><strong>Expected outcome</strong><br/>" + esc(node.thinking.expectedOutcome) + "</p>"
              : "") +
            (node.thinking && node.thinking.laterObservations
              ? "<p><strong>Later observations</strong><br/>" +
                esc(node.thinking.laterObservations) +
                "</p>"
              : "") +
            "</div>"
          : "") +
        (node.kind === "hypothesis" || (node.thinking && node.thinking.tool === "hypothesis")
          ? '<div class="wu-card"><h2>Hypothesis <span class="wu-meta">(not a fact)</span></h2><p class="wu-meta">' +
            esc((node.thinking && (node.thinking.hypothesisStatus || node.thinking.status)) || "proposed") +
            (node.thinking && node.thinking.confidence != null
              ? " · confidence " + node.thinking.confidence
              : "") +
            "</p>" +
            (node.thinking && (node.thinking.statement || node.thinking.claim)
              ? "<p><strong>Statement</strong><br/>" +
                esc(node.thinking.statement || node.thinking.claim) +
                "</p>"
              : "") +
            (node.thinking && (node.thinking.supportingEvidence || node.thinking.supports)
              ? "<p><strong>Supporting</strong><br/>" +
                esc(node.thinking.supportingEvidence || node.thinking.supports) +
                "</p>"
              : "") +
            (node.thinking && (node.thinking.contradictingEvidence || node.thinking.objections)
              ? "<p><strong>Contradicting</strong><br/>" +
                esc(node.thinking.contradictingEvidence || node.thinking.objections) +
                "</p>"
              : "") +
            (node.thinking && (node.thinking.experiments || node.thinking.method)
              ? "<p><strong>Experiments</strong><br/>" +
                esc(node.thinking.experiments || node.thinking.method) +
                "</p>"
              : "") +
            "</div>"
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
        '<section class="wu-card"><h2>Reading notes</h2>' +
        ((node.annotations || []).length
          ? '<ul class="wu-list">' +
            node.annotations
              .map(function (a) {
                return (
                  "<li><span class=\"wu-badge\">" +
                  esc(Schema().annotationLabel(a.type)) +
                  "</span> " +
                  (a.quote ? "<em>“" + esc(a.quote) + "”</em> — " : "") +
                  esc(a.text) +
                  ' <button type="button" class="wu-linkish" data-del-anno="' +
                  esc(a.id) +
                  '" data-node="' +
                  esc(id) +
                  '">Remove</button></li>'
                );
              })
              .join("") +
            "</ul>"
          : '<p class="wu-empty">No highlights or margin notes yet.</p>') +
        '<form id="wu-anno-form" class="wu-form" data-node="' +
        esc(id) +
        '">' +
        "<label>Type <select name=\"atype\">" +
        Schema().ANNOTATION_KINDS.map(function (k) {
          return "<option value=\"" + k.id + "\">" + esc(k.label) + "</option>";
        }).join("") +
        "</select></label>" +
        "<label>Quote (optional) <input name=\"quote\" placeholder=\"Passage…\"/></label>" +
        "<label>Note <textarea name=\"text\" rows=\"2\" required placeholder=\"Highlight meaning, definition, question…\"></textarea></label>" +
        '<button type="submit" class="wu-btn">Add note</button></form></section>' +
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
        '<button type="submit" class="wu-btn wu-btn--primary">Add link</button></form></section>' +
        "</div>" +
        relatedSidebar(node) +
        "</div>"
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


    function confBadge(id) {
      var c = (Assist().CONFIDENCE && Assist().CONFIDENCE[id]) || { label: id || "—", blurb: "" };
      return (
        '<span class="wu-conf wu-conf--' +
        esc(id || "unknown") +
        '" title="' +
        esc(c.blurb || "") +
        '">' +
        esc(c.label || id || "—") +
        "</span>"
      );
    }

    function citeList(citations) {
      citations = citations || [];
      if (!citations.length) return '<p class="wu-empty">No library citations for this response.</p>';
      return (
        '<ul class="wu-cite-list">' +
        citations
          .slice(0, 24)
          .map(function (c) {
            var n = c.node || (c.id && nodeMap()[c.id]);
            var title = n ? n.title : c.id || "Unknown";
            var id = (n && n.id) || c.id;
            return (
              "<li>" +
              confBadge(c.confidence) +
              " " +
              (id
                ? '<a href="#item/' + encodeURIComponent(id) + '">' + esc(title) + "</a>"
                : esc(title)) +
              (c.why ? '<span class="wu-meta"> — ' + esc(c.why) + "</span>" : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>"
      );
    }

    function relatedSidebar(node) {
      if (!node || !state.assistPrefs.assistEnabled) return "";
      var rel = Assist().relatedFor(node, state.graphIndex);
      function block(title, arr, isProject) {
        if (!arr || !arr.length) return "";
        return (
          "<h3>" +
          esc(title) +
          "</h3><ul class=\"wu-list wu-list--dense\">" +
          arr
            .slice(0, 6)
            .map(function (x) {
              if (isProject) {
                return (
                  "<li>" +
                  confBadge(x.confidence) +
                  ' <a href="#projects/' +
                  encodeURIComponent(x.id) +
                  '">' +
                  esc(x.label) +
                  "</a>" +
                  '<span class="wu-meta"> — ' +
                  esc(x.why) +
                  "</span></li>"
                );
              }
              var n = x.node || nodeMap()[x.id];
              if (!n) return "";
              return (
                "<li>" +
                confBadge(x.confidence) +
                ' <a href="#item/' +
                encodeURIComponent(n.id) +
                '">' +
                esc(n.title) +
                "</a>" +
                '<span class="wu-meta"> — ' +
                esc(x.why) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }
      return (
        '<aside class="wu-related" aria-label="Related knowledge">' +
        "<h2>Related in your library</h2>" +
        '<p class="wu-meta">Suggestions are grounded in links and overlap. Labels: Known · Likely · Possible · Unknown.</p>' +
        block("Notes", rel.notes) +
        block("Projects", rel.projects, true) +
        block("Sessions", rel.sessions) +
        block("Questions", rel.questions) +
        block("Sources", rel.sources) +
        block("Learning paths", rel.paths) +
        block("Recently near", rel.recent) +
        "</aside>"
      );
    }

    function companionStrip(node) {
      if (!node || !state.assistPrefs.assistEnabled || parseHash().mode === "edit") return "";
      var hints = Assist().companionHints(node, state.graphIndex);
      if (!hints.length) return "";
      return (
        '<div class="wu-companion" role="note">' +
        hints
          .map(function (h) {
            return (
              "<p>" +
              confBadge(h.confidence) +
              " " +
              esc(h.text) +
              (h.nodeId
                ? ' <a href="#item/' + encodeURIComponent(h.nodeId) + '">Open</a>'
                : "") +
              "</p>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function assistResultHtml(res) {
      if (!res) return "";
      return (
        '<div class="wu-assist-out">' +
        confBadge(res.confidence) +
        '<div class="wu-prose">' +
        Md().render(res.text || "") +
        "</div>" +
        "<h3>Citations</h3>" +
        citeList(res.citations) +
        (res.privacy
          ? '<p class="wu-meta">Privacy: ' + esc(res.privacy) + "</p>"
          : '<p class="wu-meta">Computed locally — nothing left this device.</p>') +
        "</div>"
      );
    }

    function assistPanel() {
      var focus =
        (state.assistFocusId && nodeMap()[state.assistFocusId]) ||
        (state.recentIds[0] && nodeMap()[state.recentIds[0]]) ||
        state.nodes.filter(function (n) {
          return n.status !== "archived";
        })[0];
      var gaps = state.assistPrefs.assistEnabled
        ? Assist().knowledgeGaps(state.graphIndex)
        : { opportunities: [], elapsedMs: 0 };
      var memory = focus
        ? Assist().memoryHints(state.graphIndex, focus)
        : [];
      return (
        '<p class="wu-eyebrow">Research assistant</p>' +
        "<h1 class=\"wu-title\">Assist</h1>" +
        '<p class="wu-lead">Grounded in your library. Never fabricates knowledge. Every answer carries confidence and citations.</p>' +
        (!state.assistPrefs.assistEnabled
          ? '<p class="wu-flash">Assistant is disabled in Settings.</p>'
          : "") +
        '<div class="wu-assist-layout">' +
        '<section class="wu-card">' +
        "<h2>Ask the library</h2>" +
        '<form id="wu-assist-form" class="wu-form">' +
        "<label>Focus note <select name=\"focus\">" +
        state.nodes
          .filter(function (n) {
            return n.status !== "archived";
          })
          .sort(function (a, b) {
            return String(a.title).localeCompare(String(b.title));
          })
          .slice(0, 400)
          .map(function (n) {
            return (
              '<option value="' +
              esc(n.id) +
              '"' +
              (focus && focus.id === n.id ? " selected" : "") +
              ">" +
              esc(n.title) +
              " (" +
              esc(n.kind) +
              ")</option>"
            );
          })
          .join("") +
        "</select></label>" +
        "<label>Action <select name=\"action\">" +
        Assist().ACTIONS.map(function (a) {
          return (
            '<option value="' +
            esc(a.id) +
            '"' +
            (state.assistAction === a.id ? " selected" : "") +
            ">" +
            esc(a.label) +
            "</option>"
          );
        }).join("") +
        "</select></label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Run locally</button></form>' +
        assistResultHtml(state.assistResult) +
        "</section>" +
        '<section class="wu-card">' +
        "<h2>Knowledge opportunities</h2>" +
        '<p class="wu-meta">Incomplete areas — framed as openings, not failures. Profiled in ' +
        esc(String(gaps.elapsedMs || 0)) +
        " ms.</p>" +
        (gaps.opportunities && gaps.opportunities.length
          ? gaps.opportunities
              .map(function (g) {
                return (
                  "<article class=\"wu-gap\"><h3>" +
                  esc(g.title) +
                  "</h3><p class=\"wu-meta\">" +
                  esc(g.blurb || "") +
                  "</p><ul class=\"wu-list wu-list--dense\">" +
                  (g.items || [])
                    .slice(0, 8)
                    .map(function (it) {
                      var n = it.node || (it.id && nodeMap()[it.id]);
                      return (
                        "<li>" +
                        confBadge(it.confidence) +
                        (n
                          ? ' <a href="#item/' +
                            encodeURIComponent(n.id) +
                            '">' +
                            esc(n.title) +
                            "</a>"
                          : "") +
                        '<span class="wu-meta"> — ' +
                        esc(it.why || "") +
                        "</span></li>"
                      );
                    })
                    .join("") +
                  "</ul></article>"
                );
              })
              .join("")
          : '<p class="wu-empty">No gaps detected yet — keep capturing and linking.</p>') +
        "</section></div>" +
        (memory.length
          ? '<section class="wu-card"><h2>Long-term memory</h2>' +
            memory
              .map(function (h) {
                return (
                  "<p>" +
                  confBadge(h.confidence) +
                  " " +
                  esc(h.text) +
                  (h.nodeId
                    ? ' <a href="#item/' + encodeURIComponent(h.nodeId) + '">Open</a>'
                    : "") +
                  "</p>"
                );
              })
              .join("") +
            "</section>"
          : "") +
        '<p class="wu-actions"><a class="wu-btn" href="#compare">Compare notes</a> ' +
        '<a class="wu-btn" href="#synthesize">Source synthesis</a> ' +
        '<a class="wu-btn" href="#write">Writing workspace</a></p>'
      );
    }

    function dashboardsPanel() {
      var laneId = parseHash().id || state.dashboardLane || "waypoint-studio";
      state.dashboardLane = laneId;
      var dash = Assist().researchDashboard(laneId, state.graphIndex);
      return (
        '<p class="wu-eyebrow">Research dashboards</p>' +
        "<h1 class=\"wu-title\">" +
        esc(dash.lane.label) +
        "</h1>" +
        '<p class="wu-lead">Calm summaries of current activity — not a noisy command center.</p>' +
        '<nav class="wu-workspace-nav" aria-label="Research domains"><ul>' +
        Assist().DASHBOARD_LANES.map(function (l) {
          return (
            "<li><a href=\"#dashboards/" +
            encodeURIComponent(l.id) +
            "\"" +
            (l.id === laneId ? ' aria-current="page"' : "") +
            ">" +
            esc(l.label) +
            "</a></li>"
          );
        }).join("") +
        "</ul></nav>" +
        '<div class="wu-home-grid">' +
        '<section class="wu-card"><h2>Current activity</h2>' +
        listHtml(dash.activity, "Nothing tagged to this lane yet.") +
        "</section>" +
        '<section class="wu-card"><h2>Recent discoveries</h2>' +
        listHtml(dash.discoveries, "No recent captures in this lane.") +
        "</section>" +
        '<section class="wu-card"><h2>Open questions</h2>' +
        listHtml(dash.questions, "No open questions here.") +
        "</section>" +
        '<section class="wu-card"><h2>Recent sessions</h2>' +
        listHtml(dash.sessions, "No sessions yet.") +
        "</section>" +
        '<section class="wu-card"><h2>Connected projects</h2><ul class="wu-list">' +
        (dash.projects.length
          ? dash.projects
              .map(function (p) {
                return (
                  '<li><a href="#projects/' +
                  encodeURIComponent(p.id) +
                  '">' +
                  esc(p.label) +
                  "</a></li>"
                );
              })
              .join("")
          : '<li class="wu-empty">—</li>') +
        "</ul></section>" +
        '<section class="wu-card"><h2>Priority reading</h2>' +
        listHtml(dash.reading, "Mark sources as reading or add to the reading queue.") +
        "</section></div>"
      );
    }

    function writePanel() {
      var id = parseHash().id || state.writeFocusId;
      var node =
        (id && nodeMap()[id]) ||
        state.nodes.filter(function (n) {
          return n.kind === "research-note" || n.kind === "concept" || n.kind === "journal";
        }).sort(byUpdated)[0];
      if (!node) {
        return (
          "<h1 class=\"wu-title\">Writing workspace</h1>" +
          '<p class="wu-lead">Create a note first, then return here for distraction-free drafting.</p>' +
          '<p><a class="wu-btn wu-btn--primary" href="#new/research-note">New research note</a></p>'
        );
      }
      state.writeFocusId = node.id;
      return (
        '<div class="wu-write">' +
        '<header class="wu-write-head">' +
        '<p class="wu-eyebrow">Distraction-free writing</p>' +
        "<h1 class=\"wu-title\">" +
        esc(node.title) +
        "</h1>" +
        '<p class="wu-meta"><a href="#item/' +
        encodeURIComponent(node.id) +
        '">Full view</a> · drafts autosave · related stays in the sidebar</p>' +
        '<form id="wu-write-pick" class="wu-form wu-form--row">' +
        "<label class=\"wu-grow\">Switch note <select name=\"nid\">" +
        state.nodes
          .filter(function (n) {
            return n.status !== "archived";
          })
          .sort(function (a, b) {
            return String(a.title).localeCompare(String(b.title));
          })
          .slice(0, 400)
          .map(function (n) {
            return (
              '<option value="' +
              esc(n.id) +
              '"' +
              (n.id === node.id ? " selected" : "") +
              ">" +
              esc(n.title) +
              "</option>"
            );
          })
          .join("") +
        '</select></label><button type="submit" class="wu-btn">Open</button></form></header>' +
        '<div class="wu-write-grid">' +
        '<div class="wu-write-main">' +
        editorForm(node, false).replace(
          'class="wu-editor" id="wu-body"',
          'class="wu-editor wu-editor--long" id="wu-body" rows="28"'
        ) +
        "</div>" +
        relatedSidebar(node) +
        "</div></div>"
      );
    }

    function comparePanel() {
      var selected = (state.compareIds || [])
        .map(function (id) {
          return nodeMap()[id];
        })
        .filter(Boolean);
      var res =
        selected.length >= 2 ? Assist().compareNotes(selected, state.graphIndex) : null;
      return (
        '<p><a href="#assist">← Assist</a></p>' +
        "<h1 class=\"wu-title\">Multi-note comparison</h1>" +
        '<p class="wu-lead">Common concepts, conflicts, shared sources, unique observations, possible duplicates.</p>' +
        '<form id="wu-compare-form" class="wu-form">' +
        "<label>Select notes (hold Ctrl/Cmd)<select name=\"ids\" multiple size=\"12\">" +
        state.nodes
          .filter(function (n) {
            return n.status !== "archived";
          })
          .sort(function (a, b) {
            return String(a.title).localeCompare(String(b.title));
          })
          .slice(0, 500)
          .map(function (n) {
            return (
              '<option value="' +
              esc(n.id) +
              '"' +
              (state.compareIds.indexOf(n.id) >= 0 ? " selected" : "") +
              ">" +
              esc(n.title) +
              " (" +
              esc(n.kind) +
              ")</option>"
            );
          })
          .join("") +
        "</select></label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Compare</button></form>' +
        (res ? assistResultHtml(res) : '<p class="wu-empty">Choose two or more notes.</p>')
      );
    }

    function synthesizePanel() {
      var selected = (state.synthIds || [])
        .map(function (id) {
          return nodeMap()[id];
        })
        .filter(Boolean);
      var res = selected.length >= 2 ? Assist().synthesizeSources(selected) : null;
      var sources = state.nodes.filter(function (n) {
        return Schema().isSourceKind(n.kind) && n.status !== "archived";
      });
      return (
        '<p><a href="#assist">← Assist</a></p>' +
        "<h1 class=\"wu-title\">Source synthesis</h1>" +
        '<p class="wu-lead">Where sources agree, disagree, and what remains unanswered — nuance preserved.</p>' +
        '<form id="wu-synth-form" class="wu-form">' +
        "<label>Sources<select name=\"ids\" multiple size=\"12\">" +
        sources
          .sort(function (a, b) {
            return String(a.title).localeCompare(String(b.title));
          })
          .slice(0, 400)
          .map(function (n) {
            return (
              '<option value="' +
              esc(n.id) +
              '"' +
              (state.synthIds.indexOf(n.id) >= 0 ? " selected" : "") +
              ">" +
              esc(n.title) +
              "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        '<button type="submit" class="wu-btn wu-btn--primary">Synthesize</button></form>' +
        (res ? assistResultHtml(res) : '<p class="wu-empty">Select at least two sources.</p>')
      );
    }

    function decisionsPanel() {
      var mode = parseHash().id || "all";
      var decisions = state.nodes
        .filter(function (n) {
          return n.kind === "decision" || (n.thinking && n.thinking.tool === "decision-journal");
        })
        .sort(byUpdated);
      var hyps = state.nodes
        .filter(function (n) {
          return n.kind === "hypothesis" || (n.thinking && n.thinking.tool === "hypothesis");
        })
        .sort(byUpdated);
      function decisionCard(n) {
        var t = n.thinking || {};
        return (
          '<article class="wu-card wu-decision">' +
          "<h3><a href=\"#item/" +
          encodeURIComponent(n.id) +
          '">' +
          esc(n.title) +
          "</a></h3>" +
          '<p class="wu-meta">Status ' +
          esc(t.status || "draft") +
          (t.confidence != null ? " · confidence " + t.confidence : "") +
          (t.reviewDate ? " · review " + esc(t.reviewDate) : "") +
          "</p>" +
          (t.decision ? "<p><strong>Decision</strong><br/>" + esc(t.decision) + "</p>" : "") +
          (t.rationale || t.chosen
            ? "<p><strong>Reasoning</strong><br/>" + esc(t.rationale || t.chosen) + "</p>"
            : "") +
          (t.evidenceUsed || t.supports
            ? "<p><strong>Evidence</strong><br/>" + esc(t.evidenceUsed || t.supports) + "</p>"
            : "") +
          (t.alternatives || t.options
            ? "<p><strong>Alternatives</strong><br/>" + esc(t.alternatives || t.options) + "</p>"
            : "") +
          (t.expectedOutcome
            ? "<p><strong>Expected outcome</strong><br/>" + esc(t.expectedOutcome) + "</p>"
            : "") +
          (t.laterObservations
            ? "<p><strong>Later observations</strong><br/>" + esc(t.laterObservations) + "</p>"
            : "") +
          "</article>"
        );
      }
      function hypCard(n) {
        var t = n.thinking || {};
        return (
          '<article class="wu-card wu-hypothesis">' +
          "<h3><a href=\"#item/" +
          encodeURIComponent(n.id) +
          '">' +
          esc(n.title) +
          "</a></h3>" +
          '<p class="wu-meta">Not a fact · status ' +
          esc(t.hypothesisStatus || t.status || "proposed") +
          (t.confidence != null ? " · confidence " + t.confidence : "") +
          "</p>" +
          (t.statement || t.claim
            ? "<p><strong>Statement</strong><br/>" + esc(t.statement || t.claim) + "</p>"
            : "") +
          (t.supportingEvidence || t.supports
            ? "<p><strong>Supporting</strong><br/>" + esc(t.supportingEvidence || t.supports) + "</p>"
            : "") +
          (t.contradictingEvidence || t.objections
            ? "<p><strong>Contradicting</strong><br/>" +
              esc(t.contradictingEvidence || t.objections) +
              "</p>"
            : "") +
          (t.experiments || t.method
            ? "<p><strong>Experiments</strong><br/>" + esc(t.experiments || t.method) + "</p>"
            : "") +
          "</article>"
        );
      }
      return (
        "<h1 class=\"wu-title\">Decisions &amp; hypotheses</h1>" +
        '<p class="wu-lead">Reflect without rewriting history. Hypotheses stay provisional.</p>' +
        '<nav class="wu-workspace-nav"><ul>' +
        [
          ["all", "All"],
          ["decisions", "Decisions"],
          ["hypotheses", "Hypotheses"]
        ]
          .map(function (p) {
            return (
              "<li><a href=\"#decisions/" +
              p[0] +
              "\"" +
              (mode === p[0] ? ' aria-current="page"' : "") +
              ">" +
              p[1] +
              "</a></li>"
            );
          })
          .join("") +
        '</ul></nav>' +
        '<p class="wu-actions"><button type="button" class="wu-btn wu-btn--primary" data-thinking-tool="decision-journal">New decision</button> ' +
        '<button type="button" class="wu-btn" data-thinking-tool="hypothesis">New hypothesis</button></p>' +
        (mode !== "hypotheses"
          ? "<h2 class=\"wu-section\">Decision journal</h2>" +
            (decisions.length
              ? decisions.map(decisionCard).join("")
              : '<p class="wu-empty">No decisions yet.</p>')
          : "") +
        (mode !== "decisions"
          ? "<h2 class=\"wu-section\">Hypotheses</h2>" +
            (hyps.length ? hyps.map(hypCard).join("") : '<p class="wu-empty">No hypotheses yet.</p>')
          : "")
      );
    }


    function body() {
      var route = parseHash();
      if (route.panel === "home") return homePanel();
      if (route.panel === "scholar" || route.panel === "research") return scholarPanel();
      if (route.panel === "assist") return assistPanel();
      if (route.panel === "dashboards") return dashboardsPanel();
      if (route.panel === "write") return writePanel();
      if (route.panel === "compare") return comparePanel();
      if (route.panel === "synthesize") return synthesizePanel();
      if (route.panel === "decisions") return decisionsPanel();
      if (route.panel === "knowledge" || route.panel === "library") return knowledgePanel();
      if (route.panel === "journal") return journalPanel();
      if (route.panel === "capture") return capturePanel();
      if (route.panel === "search") return searchPanel();
      if (route.panel === "graph") return graphPanel();
      if (route.panel === "understanding") return understandingPanel();
      if (route.panel === "next") return nextPanel();
      if (route.panel === "timeline") return timelinePanel();
      if (route.panel === "reading") return readingPanel();
      if (route.panel === "health") return healthPanel();
      if (route.panel === "paths") return pathsPanel();
      if (route.panel === "sources") return sourcesPanel();
      if (route.panel === "questions") return questionsPanel();
      if (route.panel === "projects") {
        state.projectFocus = route.id;
        return projectsPanel();
      }
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
          status: String(fd.get("status") || "active"),
          pathId: String(fd.get("pathId") || "") || null,
          review: {
            enabled: !!fd.get("reviewOn"),
            dueAt: String(fd.get("reviewDue") || "") || null,
            intervalDays: (existing && existing.review && existing.review.intervalDays) || null
          },
          journal: {
            date: String(fd.get("jdate") || "") || (existing && existing.journal && existing.journal.date) || null
          },
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
          },
          learning: {
            stageManual: String(fd.get("stageManual") || "") || null,
            confidence: fd.get("lconf") !== "" && fd.get("lconf") != null ? Number(fd.get("lconf")) : null,
            openCount: (existing && existing.learning && existing.learning.openCount) || 0,
            searchHits: (existing && existing.learning && existing.learning.searchHits) || 0,
            lastStudiedAt: (existing && existing.learning && existing.learning.lastStudiedAt) || null
          },
          session: Object.assign({}, (existing && existing.session) || {}, {
            purpose: fd.get("spurpose") != null ? String(fd.get("spurpose") || "") || null : (existing && existing.session && existing.session.purpose) || null,
            status: fd.get("sstatus") != null ? String(fd.get("sstatus") || "") || null : (existing && existing.session && existing.session.status) || null,
            discoveries: fd.get("sdisc") != null ? String(fd.get("sdisc") || "") || null : (existing && existing.session && existing.session.discoveries) || null,
            futureWork: fd.get("sfuture") != null ? String(fd.get("sfuture") || "") || null : (existing && existing.session && existing.session.futureWork) || null
          }),
          field: Object.assign({}, (existing && existing.field) || {}, {
            context: fd.get("fcontext") != null ? String(fd.get("fcontext") || "") || null : (existing && existing.field && existing.field.context) || null,
            place: fd.get("fplace") != null ? String(fd.get("fplace") || "") || null : (existing && existing.field && existing.field.place) || null,
            conditions: fd.get("fcond") != null ? String(fd.get("fcond") || "") || null : (existing && existing.field && existing.field.conditions) || null
          }),
          reliability: {
            authority: fd.get("rel_authority") !== "" && fd.get("rel_authority") != null ? Number(fd.get("rel_authority")) : (existing && existing.reliability && existing.reliability.authority) || null,
            evidence: fd.get("rel_evidence") !== "" && fd.get("rel_evidence") != null ? Number(fd.get("rel_evidence")) : (existing && existing.reliability && existing.reliability.evidence) || null,
            bias: fd.get("rel_bias") !== "" && fd.get("rel_bias") != null ? Number(fd.get("rel_bias")) : (existing && existing.reliability && existing.reliability.bias) || null,
            recency: fd.get("rel_recency") !== "" && fd.get("rel_recency") != null ? Number(fd.get("rel_recency")) : (existing && existing.reliability && existing.reliability.recency) || null,
            confidence: fd.get("rel_confidence") !== "" && fd.get("rel_confidence") != null ? Number(fd.get("rel_confidence")) : (existing && existing.reliability && existing.reliability.confidence) || null,
            conflicts: fd.get("rel_conflicts") != null ? String(fd.get("rel_conflicts") || "") || null : (existing && existing.reliability && existing.reliability.conflicts) || null,
            notes: fd.get("rel_notes") != null ? String(fd.get("rel_notes") || "") || null : (existing && existing.reliability && existing.reliability.notes) || null
          },
          thinking: Object.assign({}, (existing && existing.thinking) || {}, {
            status: fd.get("tstatus") != null ? String(fd.get("tstatus") || "") || null : (existing && existing.thinking && existing.thinking.status) || null,
            hypothesisStatus: fd.get("thypstatus") != null ? String(fd.get("thypstatus") || "") || null : (existing && existing.thinking && existing.thinking.hypothesisStatus) || null,
            claim: fd.get("tclaim") != null ? String(fd.get("tclaim") || "") || null : (existing && existing.thinking && existing.thinking.claim) || null,
            statement: fd.get("tclaim") != null ? String(fd.get("tclaim") || "") || null : (existing && existing.thinking && existing.thinking.statement) || null,
            decision: fd.get("tdecision") != null ? String(fd.get("tdecision") || "") || null : (existing && existing.thinking && existing.thinking.decision) || null,
            supports: fd.get("tsupports") != null ? String(fd.get("tsupports") || "") || null : (existing && existing.thinking && existing.thinking.supports) || null,
            options: fd.get("talts") != null ? String(fd.get("talts") || "") || null : fd.get("tsupports") != null ? String(fd.get("tsupports") || "") || null : (existing && existing.thinking && existing.thinking.options) || null,
            alternatives: fd.get("talts") != null ? String(fd.get("talts") || "") || null : (existing && existing.thinking && existing.thinking.alternatives) || null,
            method: fd.get("texperiments") != null ? String(fd.get("texperiments") || "") || null : fd.get("tsupports") != null ? String(fd.get("tsupports") || "") || null : (existing && existing.thinking && existing.thinking.method) || null,
            experiments: fd.get("texperiments") != null ? String(fd.get("texperiments") || "") || null : (existing && existing.thinking && existing.thinking.experiments) || null,
            objections: fd.get("tcontradict") != null ? String(fd.get("tcontradict") || "") || null : fd.get("tobjections") != null ? String(fd.get("tobjections") || "") || null : (existing && existing.thinking && existing.thinking.objections) || null,
            contradictingEvidence: fd.get("tcontradict") != null ? String(fd.get("tcontradict") || "") || null : (existing && existing.thinking && existing.thinking.contradictingEvidence) || null,
            supportingEvidence: fd.get("tsupporting") != null ? String(fd.get("tsupporting") || "") || null : (existing && existing.thinking && existing.thinking.supportingEvidence) || null,
            evidenceUsed: fd.get("tevidence") != null ? String(fd.get("tevidence") || "") || null : (existing && existing.thinking && existing.thinking.evidenceUsed) || null,
            rationale: fd.get("trationale") != null ? String(fd.get("trationale") || "") || null : fd.get("tobjections") != null ? String(fd.get("tobjections") || "") || null : (existing && existing.thinking && existing.thinking.rationale) || null,
            result: fd.get("tobjections") != null ? String(fd.get("tobjections") || "") || null : (existing && existing.thinking && existing.thinking.result) || null,
            expectedOutcome: fd.get("texpected") != null ? String(fd.get("texpected") || "") || null : (existing && existing.thinking && existing.thinking.expectedOutcome) || null,
            confidence: fd.get("tconf") != null && String(fd.get("tconf")) !== "" ? Number(fd.get("tconf")) : (existing && existing.thinking && existing.thinking.confidence),
            reviewDate: fd.get("treview") != null ? String(fd.get("treview") || "") || null : (existing && existing.thinking && existing.thinking.reviewDate) || null,
            laterObservations: fd.get("tlater") != null ? String(fd.get("tlater") || "") || null : (existing && existing.thinking && existing.thinking.laterObservations) || null,
            next: fd.get("tnext") != null ? String(fd.get("tnext") || "") || null : (existing && existing.thinking && existing.thinking.next) || null
          }),
          annotations: (existing && existing.annotations) || []
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

      var homeCap = root.querySelector("#wu-home-capture");
      if (homeCap) {
        homeCap.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(homeCap);
          var kind = String(fd.get("kind") || "concept");
          var payload = {
            kind: kind,
            title: String(fd.get("title") || "").trim(),
            body: String(fd.get("body") || ""),
            tags: parseTags(fd.get("tags")),
            projects: collectProjects(homeCap),
            status: "active",
            queue: {
              focusToday: !!fd.get("focus"),
              researchInbox: false,
              reading: false
            }
          };
          if (kind === "session") {
            Store()
              .startSession({
                title: payload.title,
                purpose: payload.body.slice(0, 200),
                body: payload.body,
                projects: payload.projects
              })
              .then(function (n) {
                return refresh().then(function () {
                  setHash("item", n.id);
                });
              });
            return;
          }
          if (kind === "question") {
            payload.question = { status: "open" };
          }
          if (kind === "journal") {
            payload.journal = { date: new Date().toISOString().slice(0, 10) };
          }
          Store()
            .putNode(payload)
            .then(function (n) {
              return Store().clearDraft("new").then(function () {
                return refresh().then(function () {
                  setHash("item", n.id);
                });
              });
            })
            .catch(function (err) {
              state.flash = "Save failed: " + (err && err.message ? err.message : String(err));
              paint();
            });
        });
      }

      var pathAdd = root.querySelector("#wu-path-add");
      if (pathAdd) {
        pathAdd.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(pathAdd);
          var pathId = pathAdd.getAttribute("data-path");
          var nodeId = String(fd.get("node") || "");
          Store()
            .putEdge({ fromId: nodeId, toId: pathId, type: "part-of" })
            .then(function () {
              return Store().getNode(pathId);
            })
            .then(function (path) {
              if (!path) return;
              path.meta = path.meta || {};
              path.meta.order = path.meta.order || [];
              if (path.meta.order.indexOf(nodeId) < 0) path.meta.order.push(nodeId);
              return Store().putNode(path, { skipRevision: true });
            })
            .then(function () {
              return refresh().then(paint);
            });
        });
      }

      var previewBtn = root.querySelector("#wu-preview-toggle");
      var preview = root.querySelector("#wu-preview");
      var bodyEl = root.querySelector("#wu-body");
      if (previewBtn && preview && bodyEl) {
        previewBtn.addEventListener("click", function () {
          var hidden = preview.hasAttribute("hidden");
          if (hidden) {
            preview.innerHTML = Md().render(bodyEl.value || "");
            preview.removeAttribute("hidden");
          } else {
            preview.setAttribute("hidden", "");
          }
        });
      }

      var edit = root.querySelector("#wu-edit-form");
      if (edit && bodyEl) {
        state._dirty = false;
        var draftTimer = null;
        function markDirty() {
          state._dirty = true;
          var st = root.querySelector("#wu-draft-status");
          if (st) st.textContent = "Unsaved changes…";
          clearTimeout(draftTimer);
          draftTimer = setTimeout(function () {
            var id = edit.getAttribute("data-id");
            Store()
              .saveDraft(id, {
                title: edit.title ? edit.querySelector('[name="title"]').value : "",
                body: bodyEl.value
              })
              .then(function () {
                if (st) st.textContent = "Draft saved locally " + new Date().toLocaleTimeString();
              });
          }, 2000);
        }
        edit.addEventListener("input", markDirty);
      }

      var search = root.querySelector("#wu-search-form");
      if (search) {
        search.addEventListener("submit", function (ev) {
          ev.preventDefault();
          state.q = String(new FormData(search).get("q") || "");
          var hits = state.q
            ? Assist().naturalSearch(state.q, state.index, state.graphIndex).slice(0, 12)
            : [];
          Store()
            .recordSearchHits(
              hits.map(function (h) {
                return h.id;
              })
            )
            .then(function () {
              return refresh().then(paint);
            })
            .catch(function () {
              paint();
            });
        });
      }

      var sessStart = root.querySelector("#wu-session-start");
      if (sessStart) {
        sessStart.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(sessStart);
          Store()
            .startSession({
              title: String(fd.get("title") || "").trim(),
              purpose: String(fd.get("purpose") || ""),
              body: String(fd.get("body") || ""),
              projects: collectProjects(sessStart),
              workspace: "active"
            })
            .then(function (n) {
              return refresh().then(function () {
                setHash("item", n.id);
              });
            });
        });
      }

      var sessEnd = root.querySelector("#wu-session-end");
      if (sessEnd) {
        sessEnd.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(sessEnd);
          var park = !!fd.get("park");
          Store()
            .endSession(sessEnd.getAttribute("data-id"), {
              status: park ? "abandoned" : "completed",
              discoveries: String(fd.get("discoveries") || ""),
              futureWork: String(fd.get("future") || ""),
              body: String(fd.get("body") || "")
            })
            .then(function (n) {
              return refresh().then(function () {
                setHash("item", n.id);
              });
            });
        });
      }

      var fieldForm = root.querySelector("#wu-field-form");
      if (fieldForm) {
        fieldForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(fieldForm);
          Store()
            .captureFieldNote({
              title: String(fd.get("title") || "").trim(),
              body: String(fd.get("body") || ""),
              context: String(fd.get("context") || "other"),
              place: String(fd.get("place") || ""),
              conditions: String(fd.get("conditions") || ""),
              projects: collectProjects(fieldForm),
              focus: !!fd.get("focus")
            })
            .then(function (n) {
              return refresh().then(function () {
                setHash("item", n.id);
              });
            });
        });
      }

      root.querySelectorAll("[data-thinking-tool]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var stub = Scholar().createThinkingStub(btn.getAttribute("data-thinking-tool"));
          if (!stub) return;
          Store()
            .putNode(stub)
            .then(function (n) {
              return refresh().then(function () {
                setHash("item", n.id, "edit");
              });
            });
        });
      });

      var search = root.querySelector("#wu-search-form");
      if (search) {
        search.addEventListener("submit", function (ev) {
          ev.preventDefault();
          state.q = String(new FormData(search).get("q") || "");
          var hits = state.q
            ? Assist().naturalSearch(state.q, state.index, state.graphIndex).slice(0, 12)
            : [];
          Store()
            .recordSearchHits(
              hits.map(function (h) {
                return h.id;
              })
            )
            .then(function () {
              return refresh().then(paint);
            })
            .catch(function () {
              paint();
            });
        });
      }

      var assistForm = root.querySelector("#wu-assist-form");
      if (assistForm) {
        assistForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(assistForm);
          state.assistFocusId = String(fd.get("focus") || "");
          state.assistAction = String(fd.get("action") || "summarize");
          var node = nodeMap()[state.assistFocusId];
          var compareNodes = state.compareIds
            .map(function (id) {
              return nodeMap()[id];
            })
            .filter(Boolean);
          state.assistResult = Assist().runAction(state.assistAction, {
            node: node,
            nodes: state.assistAction === "compare" ? compareNodes : node ? [node] : [],
            graphIndex: state.graphIndex
          });
          paint();
        });
      }

      var compareForm = root.querySelector("#wu-compare-form");
      if (compareForm) {
        compareForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var sel = compareForm.querySelector('[name="ids"]');
          state.compareIds = sel
            ? Array.prototype.slice.call(sel.selectedOptions).map(function (o) {
                return o.value;
              })
            : [];
          paint();
        });
      }

      var synthForm = root.querySelector("#wu-synth-form");
      if (synthForm) {
        synthForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var sel = synthForm.querySelector('[name="ids"]');
          state.synthIds = sel
            ? Array.prototype.slice.call(sel.selectedOptions).map(function (o) {
                return o.value;
              })
            : [];
          paint();
        });
      }

      var writePick = root.querySelector("#wu-write-pick");
      if (writePick) {
        writePick.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var nid = String(new FormData(writePick).get("nid") || "");
          state.writeFocusId = nid;
          setHash("write", nid);
        });
      }

      var assistPrefs = root.querySelector("#wu-assist-prefs");
      if (assistPrefs) {
        assistPrefs.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(assistPrefs);
          Store()
            .setAssistPrefs({
              assistEnabled: !!fd.get("assistEnabled"),
              remoteAiEnabled: !!fd.get("remoteAi")
            })
            .then(function () {
              state.flash = "Assistant preferences saved.";
              return refresh().then(paint);
            });
        });
      }

      var goals = root.querySelector("#wu-goals-form");
      if (goals) {
        goals.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var raw = String(new FormData(goals).get("goals") || "");
          var list = raw
            .split(/\n/)
            .map(function (g) {
              return g.trim();
            })
            .filter(Boolean);
          Store()
            .setLearningGoals(list)
            .then(function () {
              state.flash = "Goals saved.";
              return refresh().then(paint);
            });
        });
      }

      var anno = root.querySelector("#wu-anno-form");
      if (anno) {
        anno.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var fd = new FormData(anno);
          Store()
            .addAnnotation(anno.getAttribute("data-node"), {
              type: String(fd.get("atype") || "margin"),
              quote: String(fd.get("quote") || ""),
              text: String(fd.get("text") || "")
            })
            .then(function () {
              return refresh().then(paint);
            });
        });
      }

      root.querySelectorAll("[data-del-anno]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          Store()
            .removeAnnotation(btn.getAttribute("data-node"), btn.getAttribute("data-del-anno"))
            .then(function () {
              return refresh().then(paint);
            });
        });
      });

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
              state._dirty = false;
              return Store().clearDraft(id).then(function () {
                return refresh().then(function () {
                  setHash("item", n.id);
                });
              });
            })
            .catch(function (err) {
              state.flash = "Save failed — draft kept. " + (err && err.message ? err.message : "");
              paint();
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
              state.flash = "JSON backup downloaded to this device.";
              paint();
            })
            .catch(function (err) {
              state.flash = "Export failed: " + (err && err.message ? err.message : String(err));
              paint();
            });
        });
      }

      var expMd = root.querySelector("#wu-export-md");
      if (expMd) {
        expMd.addEventListener("click", function () {
          Store()
            .exportMarkdownArchive()
            .then(function (md) {
              var blob = new Blob([md], { type: "text/markdown" });
              var a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "waypoint-university-" + new Date().toISOString().slice(0, 10) + ".md";
              a.click();
              state.flash = "Markdown export downloaded.";
              paint();
            })
            .catch(function (err) {
              state.flash = "Markdown export failed: " + (err && err.message ? err.message : String(err));
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
        setHash("home");
      }
    });

    global.addEventListener("beforeunload", function (ev) {
      if (state._dirty) {
        ev.preventDefault();
        ev.returnValue = "";
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
