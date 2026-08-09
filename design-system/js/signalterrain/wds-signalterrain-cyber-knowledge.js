/**
 * SignalTerrain Defensive Knowledge Platform V0.1
 * Encyclopedia, playbooks, incidents, learning paths, unified search.
 * Consumes shared cyber graph — does not duplicate entity models.
 * Educational and defensive only.
 */
(function (global) {
  "use strict";

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

  function tokenize(q) {
    return String(q || "")
      .toLowerCase()
      .split(/[^a-z0-9_+.:-]+/)
      .filter(function (t) {
        return t.length > 1;
      });
  }

  function createIndex(bundle) {
    bundle = bundle || {};
    var articles = (bundle.encyclopedia && bundle.encyclopedia.articles) || [];
    var playbooks = (bundle.playbooks && bundle.playbooks.playbooks) || [];
    var incidents = (bundle.incidents && bundle.incidents.incidents) || [];
    var paths = (bundle.learningPaths && bundle.learningPaths.paths) || [];
    var graph = bundle.graph || null;

    function getArticle(id) {
      return articles.filter(function (a) {
        return a.id === id;
      })[0] || null;
    }
    function getPlaybook(id) {
      return playbooks.filter(function (p) {
        return p.id === id;
      })[0] || null;
    }
    function getIncident(id) {
      return incidents.filter(function (i) {
        return i.id === id;
      })[0] || null;
    }
    function getPath(id) {
      return paths.filter(function (p) {
        return p.id === id;
      })[0] || null;
    }

    /**
     * Cross-link engine: knowledge objects + shared graph neighbors.
     */
    function crossLinks(ref) {
      ref = ref || {};
      var out = {
        products: [],
        vendors: [],
        cves: [],
        advisories: [],
        playbooks: [],
        articles: [],
        research: [],
        timelineEvents: [],
        graphNeighbors: []
      };

      var subjectIds = ref.subjectIds || ref.relatedSubjectIds || [];
      (ref.relatedArticleIds || []).forEach(function (id) {
        var a = getArticle(id);
        if (a) out.articles.push({ id: a.id, title: a.title, kind: "article" });
      });
      (ref.relatedPlaybookIds || []).forEach(function (id) {
        var p = getPlaybook(id);
        if (p) out.playbooks.push({ id: p.id, title: p.title, kind: "playbook" });
      });

      if (graph) {
        subjectIds.forEach(function (sid) {
          var ent = graph.get(sid);
          if (!ent) return;
          if (ent.kind === "affected-software" || ent.kind === "affected-hardware") {
            out.products.push({ id: ent.id, title: ent.title, kind: ent.kind });
          } else if (ent.kind === "cve" || ent.kind === "vulnerability") {
            out.cves.push({ id: ent.id, title: ent.title, kind: ent.kind });
          } else if (ent.kind === "vendor-advisory") {
            out.advisories.push({ id: ent.id, title: ent.title, kind: ent.kind });
          } else if (ent.kind === "timeline-event") {
            out.timelineEvents.push({ id: ent.id, title: ent.title, kind: ent.kind });
          } else if (ent.kind === "source") {
            out.vendors.push({ id: ent.id, title: ent.title, kind: ent.kind });
          }
          graph.neighbors(sid, { bidirectional: true }).forEach(function (n) {
            if (!n.entity) return;
            out.graphNeighbors.push({
              id: n.entity.id,
              title: n.entity.title,
              kind: n.entity.kind,
              edgeType: n.edge.type,
              direction: n.direction,
              why:
                "Connected in the shared cyber graph via “" +
                n.edge.type +
                "” (" +
                (n.edge.confidence || "moderate") +
                ")."
            });
            if (n.entity.kind === "vendor-advisory" && !out.advisories.some(function (x) { return x.id === n.entity.id; })) {
              out.advisories.push({ id: n.entity.id, title: n.entity.title, kind: n.entity.kind });
            }
            if ((n.entity.kind === "cve" || n.entity.kind === "vulnerability") && !out.cves.some(function (x) { return x.id === n.entity.id; })) {
              out.cves.push({ id: n.entity.id, title: n.entity.title, kind: n.entity.kind });
            }
            if (n.entity.kind === "affected-software" && !out.products.some(function (x) { return x.id === n.entity.id; })) {
              out.products.push({ id: n.entity.id, title: n.entity.title, kind: n.entity.kind });
            }
            if (n.entity.kind === "timeline-event" && !out.timelineEvents.some(function (x) { return x.id === n.entity.id; })) {
              out.timelineEvents.push({ id: n.entity.id, title: n.entity.title, kind: n.entity.kind });
            }
          });
        });
      }

      // Research bookmarks/notes tied to subjects
      var R = Research();
      if (R) {
        subjectIds.forEach(function (sid) {
          R.list({ subjectId: sid }).forEach(function (it) {
            out.research.push({ id: it.id, title: it.title, kind: it.kind });
          });
        });
      }

      // Reverse: playbooks/articles that mention these subjects
      playbooks.forEach(function (pb) {
        var hit = (pb.relatedSubjectIds || []).some(function (s) {
          return subjectIds.indexOf(s) >= 0;
        });
        if (hit && !out.playbooks.some(function (x) { return x.id === pb.id; })) {
          out.playbooks.push({ id: pb.id, title: pb.title, kind: "playbook" });
        }
      });
      articles.forEach(function (a) {
        var hit = (a.subjectIds || []).some(function (s) {
          return subjectIds.indexOf(s) >= 0;
        });
        if (hit && !out.articles.some(function (x) { return x.id === a.id; })) {
          out.articles.push({ id: a.id, title: a.title, kind: "article" });
        }
      });

      return out;
    }

    function blobOf(obj) {
      return [
        obj.id,
        obj.title,
        obj.summary,
        obj.purpose,
        obj.background,
        obj.history,
        obj.howItWorks,
        obj.whyItMatters,
        (obj.tags || []).join(" "),
        (obj.subjectIds || []).join(" "),
        (obj.practices || []).join(" "),
        (obj.lessonsLearned || []).join(" "),
        obj.kind
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    }

    /**
     * Unified search across knowledge + optional intelligence entities.
     */
    function search(query, opts) {
      opts = opts || {};
      var tokens = tokenize(query);
      var types = opts.types || null;
      var tag = opts.tag || null;
      var limit = opts.limit || 40;
      var hits = [];

      function scoreObj(obj, contentType) {
        if (types && types.indexOf(contentType) === -1) return;
        if (tag && !(obj.tags || []).some(function (t) { return t === tag; })) return;
        var blob = blobOf(obj);
        var score = 0;
        if (!tokens.length) {
          score = 1;
        } else {
          tokens.forEach(function (tok) {
            if (obj.title && obj.title.toLowerCase().indexOf(tok) >= 0) score += 8;
            if (obj.id && obj.id.indexOf(tok) >= 0) score += 6;
            if (blob.indexOf(tok) >= 0) score += 2;
            if ((obj.tags || []).some(function (t) { return t.indexOf(tok) >= 0; })) score += 4;
          });
        }
        if (score > 0) {
          hits.push({
            contentType: contentType,
            score: score,
            id: obj.id,
            title: obj.title,
            summary: obj.summary || obj.purpose || obj.background || "",
            tags: obj.tags || [],
            subjectIds: obj.subjectIds || obj.relatedSubjectIds || []
          });
        }
      }

      articles.forEach(function (a) {
        scoreObj(a, "article");
      });
      playbooks.forEach(function (p) {
        scoreObj(p, "playbook");
      });
      incidents.forEach(function (i) {
        scoreObj(i, "incident");
      });
      paths.forEach(function (p) {
        scoreObj(p, "learning-path");
      });

      if (graph && (!types || types.indexOf("entity") >= 0 || types.indexOf("intelligence") >= 0)) {
        (graph.entities || []).forEach(function (e) {
          var fake = {
            id: e.id,
            title: e.title,
            summary: e.summary,
            tags: e.aliases || [],
            kind: e.kind,
            subjectIds: [e.id]
          };
          var blob = blobOf(fake);
          var score = 0;
          tokens.forEach(function (tok) {
            if (e.title && e.title.toLowerCase().indexOf(tok) >= 0) score += 7;
            if (e.kind && e.kind.indexOf(tok) >= 0) score += 5;
            if (blob.indexOf(tok) >= 0) score += 2;
          });
          if (!tokens.length) score = 0;
          if (score > 0) {
            hits.push({
              contentType: "intelligence",
              score: score,
              id: e.id,
              title: e.title,
              summary: e.summary,
              tags: [e.kind],
              subjectIds: [e.id]
            });
          }
        });
      }

      // Relationship search: "related:affects" or edge type token
      if (graph && /related:|rel:/.test(String(query || "").toLowerCase())) {
        var m = String(query).toLowerCase().match(/(?:related|rel):([a-z_]+)/);
        var edgeType = m && m[1];
        if (edgeType) {
          (graph.relationships || []).forEach(function (edge) {
            if (edge.type !== edgeType) return;
            var a = graph.get(edge.from);
            var b = graph.get(edge.to);
            if (!a || !b) return;
            hits.push({
              contentType: "relationship",
              score: 9,
              id: edge.id,
              title: a.title + " —" + edge.type + "→ " + b.title,
              summary: edge.note || "Shared graph relationship",
              tags: [edge.type],
              subjectIds: [a.id, b.id]
            });
          });
        }
      }

      hits.sort(function (a, b) {
        return b.score - a.score;
      });
      return hits.slice(0, limit);
    }

    /**
     * Visual knowledge map: nodes from articles + linked entities, edges from relatedArticleIds + graph.
     */
    function knowledgeMap(focusId, opts) {
      opts = opts || {};
      var depth = opts.depth == null ? 1 : opts.depth;
      var nodes = {};
      var edges = [];

      function addNode(id, label, kind, source) {
        if (!nodes[id]) nodes[id] = { id: id, label: label, kind: kind, source: source };
      }

      var focus =
        getArticle(focusId) ||
        getPlaybook(focusId) ||
        getIncident(focusId) ||
        (graph && graph.get(focusId)) ||
        null;
      if (!focus) {
        // Default map: concepts + a few campaigns
        articles.slice(0, 12).forEach(function (a) {
          addNode(a.id, a.title, a.kind, "article");
          (a.relatedArticleIds || []).forEach(function (rid) {
            var b = getArticle(rid);
            if (b) {
              addNode(b.id, b.title, b.kind, "article");
              edges.push({ from: a.id, to: b.id, type: "related_article" });
            }
          });
          (a.subjectIds || []).forEach(function (sid) {
            var ent = graph && graph.get(sid);
            if (ent) {
              addNode(ent.id, ent.title, ent.kind, "intelligence");
              edges.push({ from: a.id, to: ent.id, type: "subject" });
            }
          });
        });
        return { nodes: Object.keys(nodes).map(function (k) { return nodes[k]; }), edges: edges, focusId: null };
      }

      var focusKind = focus.kind || "entity";
      var focusSource = getArticle(focusId)
        ? "article"
        : getPlaybook(focusId)
          ? "playbook"
          : getIncident(focusId)
            ? "incident"
            : "intelligence";
      addNode(focusId, focus.title, focusKind, focusSource);

      var links = crossLinks(focus);
      (links.articles || []).forEach(function (a) {
        addNode(a.id, a.title, "article", "article");
        edges.push({ from: focusId, to: a.id, type: "related_article" });
      });
      (links.playbooks || []).forEach(function (p) {
        addNode(p.id, p.title, "playbook", "playbook");
        edges.push({ from: focusId, to: p.id, type: "related_playbook" });
      });
      (links.graphNeighbors || []).slice(0, 24).forEach(function (n) {
        addNode(n.id, n.title, n.kind, "intelligence");
        edges.push({ from: focusId, to: n.id, type: n.edgeType || "graph", why: n.why });
      });
      (links.cves || []).forEach(function (c) {
        addNode(c.id, c.title, c.kind, "intelligence");
      });
      (links.products || []).forEach(function (p) {
        addNode(p.id, p.title, p.kind, "intelligence");
      });

      if (depth > 1 && graph) {
        Object.keys(nodes).forEach(function (nid) {
          if (nid === focusId) return;
          if (String(nid).indexOf("cy_") !== 0) return;
          graph.neighbors(nid, { bidirectional: true }).slice(0, 4).forEach(function (n) {
            if (!n.entity) return;
            addNode(n.entity.id, n.entity.title, n.entity.kind, "intelligence");
            edges.push({ from: nid, to: n.entity.id, type: n.edge.type });
          });
        });
      }

      return {
        nodes: Object.keys(nodes).map(function (k) {
          return nodes[k];
        }),
        edges: edges,
        focusId: focusId
      };
    }

    return {
      articles: articles,
      playbooks: playbooks,
      incidents: incidents,
      paths: paths,
      graph: graph,
      getArticle: getArticle,
      getPlaybook: getPlaybook,
      getIncident: getIncident,
      getPath: getPath,
      crossLinks: crossLinks,
      search: search,
      knowledgeMap: knowledgeMap
    };
  }

  function parseHash() {
    var u = Util();
    if (u && u.parseHash) {
      var raw = u.parseHash();
      return { panel: raw.panel || "overview", id: raw.id || null };
    }
    var h = String(global.location.hash || "").replace(/^#/, "");
    if (!h) return { panel: "overview", id: null };
    var parts = h.split("/");
    return { panel: parts[0], id: parts[1] || null };
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

  function mountKnowledge(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="st-loading">Opening Defensive Knowledge Platform…</p>';

    var base = options.base || "../../design-system/signalterrain/intelligence/cyber/";
    var knowBase = options.knowledgeBase || base + "knowledge/";
    var G = GraphApi();
    if (!G) {
      root.innerHTML = '<p role="alert">Cyber graph runtime required.</p>';
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

    var state = { searchQ: "", filterType: "all", index: null, teaching: teaching };

    return Promise.all([
      G.loadBundle(graphUrl),
      loadJson(knowBase + "encyclopedia/index.json"),
      loadJson(knowBase + "playbooks/index.json"),
      loadJson(knowBase + "incidents/index.json"),
      loadJson(knowBase + "learning-paths.json"),
      teaching
        ? loadJson(base + "samples/research-workspace.sample.json").catch(function () {
            return { items: [] };
          })
        : Promise.resolve({ items: [] })
    ]).then(function (parts) {
      var loaded = parts[0];
      var graph = loaded.graph;
      if (Research()) Research().loadSeed((parts[5] && parts[5].items) || []);

      state.index = createIndex({
        encyclopedia: parts[1],
        playbooks: parts[2],
        incidents: parts[3],
        learningPaths: parts[4],
        graph: graph
      });

      function nav() {
        var route = parseHash();
        var panels = [
          ["overview", "Overview"],
          ["encyclopedia", "Encyclopedia"],
          ["playbooks", "Playbooks"],
          ["incidents", "Incident Library"],
          ["paths", "Learning Paths"],
          ["map", "Knowledge Map"],
          ["search", "Search"]
        ];
        return (
          '<nav class="st-cyber-nav" aria-label="Knowledge platform">' +
          "<ul>" +
          panels
            .map(function (p) {
              return (
                "<li><a href=\"#" +
                p[0] +
                '"' +
                (route.panel === p[0] ||
                (route.panel === "article" && p[0] === "encyclopedia") ||
                (route.panel === "playbook" && p[0] === "playbooks") ||
                (route.panel === "incident" && p[0] === "incidents") ||
                (route.panel === "path" && p[0] === "paths")
                  ? ' aria-current="page"'
                  : "") +
                ">" +
                p[1] +
                "</a></li>"
              );
            })
            .join("") +
          "</ul></nav>"
        );
      }

      function renderLinks(links) {
        if (!links) return "";
        function list(title, arr, panel) {
          if (!arr || !arr.length) return "";
          return (
            "<h4>" +
            esc(title) +
            "</h4><ul>" +
            arr
              .slice(0, 12)
              .map(function (x) {
                var goto =
                  panel ||
                  (String(x.id).indexOf("enc_") === 0
                    ? "article"
                    : String(x.id).indexOf("pb_") === 0
                      ? "playbook"
                      : String(x.id).indexOf("inc_") === 0
                        ? "incident"
                        : String(x.id).indexOf("cy_") === 0
                          ? "entity"
                          : null);
                return (
                  "<li>" +
                  (goto
                    ? '<button type="button" data-goto="' +
                      esc(goto + "/" + x.id) +
                      '">' +
                      esc(x.title) +
                      "</button>"
                    : esc(x.title)) +
                  ' <span class="st-muted">' +
                  esc(x.kind || "") +
                  "</span>" +
                  (x.why ? "<p class=\"st-muted\">" + esc(x.why) + "</p>" : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>"
          );
        }
        return (
          '<div class="st-k-links"><h3>Connected knowledge</h3>' +
          list("Articles", links.articles, "article") +
          list("Playbooks", links.playbooks, "playbook") +
          list("Products", links.products, "entity") +
          list("CVEs", links.cves, "entity") +
          list("Advisories", links.advisories, "entity") +
          list("Timeline", links.timelineEvents, "entity") +
          list("Graph neighbors", links.graphNeighbors, "entity") +
          list("Research", links.research, null) +
          "</div>"
        );
      }

      function researchBtn(subjectId, title) {
        var R = Research();
        var booked = R && subjectId && R.isBookmarked(subjectId);
        return (
          '<div class="st-x-research-actions">' +
          (subjectId
            ? '<button type="button" class="st-chip" data-bookmark="' +
              esc(subjectId) +
              '" data-title="' +
              esc(title) +
              '">' +
              (booked ? "Remove bookmark" : "Bookmark") +
              "</button> "
            : "") +
          "</div>"
        );
      }

      function renderArticle(a) {
        var links = state.index.crossLinks(a);
        return (
          '<article class="st-k-detail"><h2>' +
          esc(a.title) +
          '</h2><p class="st-badge">' +
          esc(a.kind) +
          " · " +
          esc(a.learningLevel) +
          " · reviewed " +
          esc(a.lastReviewed) +
          "</p>" +
          researchBtn(a.subjectIds && a.subjectIds[0], a.title) +
          "<h3>Summary</h3><p>" +
          esc(a.summary) +
          "</p>" +
          "<h3>History</h3><p>" +
          esc(a.history || "") +
          "</p>" +
          "<h3>How it works</h3><p>" +
          esc(a.howItWorks || "") +
          "</p>" +
          "<h3>Why it matters</h3><p>" +
          esc(a.whyItMatters || "") +
          "</p>" +
          "<h3>Timeline</h3><ul>" +
          (a.timeline || [])
            .map(function (t) {
              return "<li><strong>" + esc(t.at) + "</strong> — " + esc(t.text) + "</li>";
            })
            .join("") +
          "</ul>" +
          "<h3>Citations</h3><ul>" +
          (a.citations || [])
            .map(function (c) {
              return (
                "<li>" +
                (c.url ? '<a href="' + esc(c.url) + '">' + esc(c.label) + "</a>" : esc(c.label)) +
                "</li>"
              );
            })
            .join("") +
          "</ul>" +
          renderLinks(links) +
          "</article>"
        );
      }

      function renderPlaybook(p) {
        var links = state.index.crossLinks(p);
        return (
          '<article class="st-k-detail"><h2>' +
          esc(p.title) +
          '</h2><p class="st-badge">Defensive playbook · v' +
          esc(p.version) +
          "</p>" +
          "<h3>Purpose</h3><p>" +
          esc(p.purpose) +
          "</p>" +
          "<h3>When to use</h3><p>" +
          esc(p.whenToUse) +
          "</p>" +
          "<h3>Prerequisites</h3><ul>" +
          (p.prerequisites || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul>" +
          "<h3>Recommended practices</h3><ul>" +
          (p.practices || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul>" +
          "<h3>Common mistakes</h3><ul>" +
          (p.commonMistakes || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul>" +
          "<h3>Version history</h3><ul>" +
          (p.versionHistory || [])
            .map(function (v) {
              return "<li>" + esc(v.version) + " · " + esc(v.at) + " — " + esc(v.note) + "</li>";
            })
            .join("") +
          "</ul>" +
          renderLinks(links) +
          "</article>"
        );
      }

      function renderIncident(inc) {
        var links = state.index.crossLinks(inc);
        return (
          '<article class="st-k-detail"><h2>' +
          esc(inc.title) +
          '</h2><p class="st-badge">' +
          esc(inc.kind) +
          "</p>" +
          researchBtn(inc.subjectIds && inc.subjectIds[0], inc.title) +
          "<h3>Background</h3><p>" +
          esc(inc.background) +
          "</p>" +
          "<h3>Timeline</h3><ul>" +
          (inc.timeline || [])
            .map(function (t) {
              return "<li><strong>" + esc(t.at) + "</strong> — " + esc(t.text) + "</li>";
            })
            .join("") +
          "</ul>" +
          "<h3>Affected technologies</h3><ul>" +
          (inc.affectedTechnologies || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul>" +
          "<h3>Lessons learned</h3><ul>" +
          (inc.lessonsLearned || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul>" +
          "<h3>Mitigations</h3><ul>" +
          (inc.mitigations || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul>" +
          "<h3>Long-term impact</h3><p>" +
          esc(inc.longTermImpact || "") +
          "</p>" +
          "<h3>Related incidents</h3><ul>" +
          (inc.relatedIncidentIds || [])
            .map(function (id) {
              var r = state.index.getIncident(id);
              return r
                ? '<li><button type="button" data-goto="incident/' +
                    esc(id) +
                    '">' +
                    esc(r.title) +
                    "</button></li>"
                : "";
            })
            .join("") +
          "</ul>" +
          renderLinks(links) +
          "</article>"
        );
      }

      function renderPath(path) {
        return (
          '<article class="st-k-detail"><h2>' +
          esc(path.title) +
          '</h2><p class="st-badge">' +
          esc(path.difficulty) +
          " · ~" +
          esc(String(path.estimatedHours)) +
          " hours</p><p>" +
          esc(path.summary) +
          "</p>" +
          "<h3>Prerequisites</h3><ul>" +
          (path.prerequisites || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          (path.prerequisites && path.prerequisites.length ? "" : "<li class=\"st-muted\">None</li>") +
          "</ul>" +
          "<h3>Steps</h3><ol>" +
          (path.steps || [])
            .map(function (s) {
              var goto =
                s.refType === "article"
                  ? "article/" + s.refId
                  : s.refType === "playbook"
                    ? "playbook/" + s.refId
                    : s.refType === "incident"
                      ? "incident/" + s.refId
                      : "entity/" + s.refId;
              return (
                "<li><button type=\"button\" data-goto=\"" +
                esc(goto) +
                '">' +
                esc(s.title) +
                "</button> <span class=\"st-muted\">~" +
                esc(String(s.minutes || "?")) +
                " min · " +
                esc(s.refType) +
                "</span></li>"
              );
            })
            .join("") +
          "</ol></article>"
        );
      }

      function renderMap() {
        var route = parseHash();
        var focus = route.id || "enc_cve-log4shell";
        var map = state.index.knowledgeMap(focus, { depth: 1 });
        return (
          "<h2>Visual knowledge map</h2>" +
          '<p class="st-muted">Explore relationships among concepts, technologies, threats, and mitigations — shared graph + knowledge links.</p>' +
          "<p>Focus: <strong>" +
          esc(focus) +
          "</strong> · " +
          map.nodes.length +
          " nodes · " +
          map.edges.length +
          " edges</p>" +
          '<div class="st-explorer-grid"><section class="st-graph-panel"><h3>Nodes</h3><ul class="st-graph-nodes">' +
          map.nodes
            .map(function (n) {
              var panel =
                n.source === "article"
                  ? "article"
                  : n.source === "playbook"
                    ? "playbook"
                    : n.source === "incident"
                      ? "incident"
                      : "entity";
              return (
                '<li class="' +
                (n.id === focus ? "is-focus" : "") +
                '"><button type="button" data-goto="' +
                esc(panel + "/" + n.id) +
                '">' +
                esc(n.label) +
                '</button> <span class="st-muted">' +
                esc(n.kind) +
                " · " +
                esc(n.source) +
                "</span> " +
                (n.source === "article" || n.id.indexOf("enc_") === 0
                  ? '<button type="button" data-map-focus="' + esc(n.id) + '">Map</button>'
                  : n.id.indexOf("cy_") === 0
                    ? '<button type="button" data-map-focus="' + esc(n.id) + '">Map</button>'
                    : "") +
                "</li>"
              );
            })
            .join("") +
          '</ul></section><section class="st-graph-panel"><h3>Edges</h3><ul class="st-graph-edges">' +
          map.edges
            .map(function (e) {
              return (
                "<li><strong>" +
                esc(e.type) +
                "</strong> · " +
                esc(e.from) +
                " → " +
                esc(e.to) +
                (e.why ? "<p class=\"st-muted\">" + esc(e.why) + "</p>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul></section></div>"
        );
      }

      function renderSearch() {
        var types = state.filterType === "all" ? null : [state.filterType];
        var hits =
          state.searchQ.trim().length > 1
            ? state.index.search(state.searchQ, { types: types, limit: 30 })
            : [];
        var R = Research();
        var saved = R ? R.list({ kind: "saved-search" }) : [];
        return (
          "<h2>Search & discovery</h2>" +
          '<form id="st-k-search" class="st-explorer-toolbar">' +
          '<label class="st-search-label">Query <input class="st-search" name="q" value="' +
          esc(state.searchQ) +
          '" placeholder="articles, playbooks, CVEs, related:affects…" /></label> ' +
          "<label>Type <select name=\"type\">" +
          ["all", "article", "playbook", "incident", "learning-path", "intelligence", "relationship"]
            .map(function (t) {
              return (
                '<option value="' +
                t +
                '"' +
                (state.filterType === t ? " selected" : "") +
                ">" +
                t +
                "</option>"
              );
            })
            .join("") +
          "</select></label> " +
          '<button type="submit" class="st-chip">Search</button> ' +
          '<button type="button" class="st-chip" id="st-k-save-search">Save search</button></form>' +
          "<h3>Saved searches</h3><ul>" +
          (saved.length
            ? saved
                .map(function (s) {
                  return (
                    '<li><button type="button" data-run-saved="' +
                    esc(s.query || s.title) +
                    '">' +
                    esc(s.title) +
                    "</button></li>"
                  );
                })
                .join("")
            : '<li class="st-muted">None yet — save a query to keep it local.</li>') +
          "</ul>" +
          "<h3>Results (" +
          hits.length +
          ")</h3><ul class=\"st-cyber-list\">" +
          hits
            .map(function (h) {
              var panel =
                h.contentType === "article"
                  ? "article"
                  : h.contentType === "playbook"
                    ? "playbook"
                    : h.contentType === "incident"
                      ? "incident"
                      : h.contentType === "learning-path"
                        ? "path"
                        : h.contentType === "intelligence"
                          ? "entity"
                          : null;
              return (
                "<li><span class=\"st-badge\">" +
                esc(h.contentType) +
                "</span> " +
                (panel
                  ? '<button type="button" data-goto="' +
                    esc(panel + "/" + h.id) +
                    '"><strong>' +
                    esc(h.title) +
                    "</strong></button>"
                  : "<strong>" + esc(h.title) + "</strong>") +
                "<p>" +
                esc(h.summary) +
                "</p></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function listBlock(title, items, panel) {
        return (
          "<h2>" +
          esc(title) +
          "</h2><ul class=\"st-cyber-list\">" +
          items
            .map(function (it) {
              return (
                "<li><button type=\"button\" data-goto=\"" +
                esc(panel + "/" + it.id) +
                '"><strong>' +
                esc(it.title) +
                "</strong></button> <span class=\"st-badge\">" +
                esc(it.kind || it.difficulty || "") +
                "</span><p>" +
                esc(it.summary || it.purpose || it.background || "") +
                "</p></li>"
              );
            })
            .join("") +
          "</ul>"
        );
      }

      function body() {
        var route = parseHash();
        if (route.panel === "article" && route.id) {
          var a = state.index.getArticle(route.id);
          return a ? renderArticle(a) : '<p role="alert">Article not found.</p>';
        }
        if (route.panel === "playbook" && route.id) {
          var p = state.index.getPlaybook(route.id);
          return p ? renderPlaybook(p) : '<p role="alert">Playbook not found.</p>';
        }
        if (route.panel === "incident" && route.id) {
          var i = state.index.getIncident(route.id);
          return i ? renderIncident(i) : '<p role="alert">Incident not found.</p>';
        }
        if (route.panel === "path" && route.id) {
          var path = state.index.getPath(route.id);
          return path ? renderPath(path) : '<p role="alert">Path not found.</p>';
        }
        if (route.panel === "entity" && route.id) {
          var ent = graph.get(route.id);
          if (!ent) return '<p role="alert">Entity not found in shared graph.</p>';
          var links = state.index.crossLinks({ subjectIds: [ent.id], title: ent.title });
          return (
            "<h2>" +
            esc(ent.title) +
            '</h2><p class="st-badge">Shared graph entity · ' +
            esc(ent.kind) +
            "</p><p>" +
            esc(ent.summary) +
            "</p>" +
            researchBtn(ent.id, ent.title) +
            renderLinks(links) +
            '<p><a href="explorer.html#entity/' +
            esc(ent.id) +
            '">Open in Intelligence Explorer</a></p>'
          );
        }
        if (route.panel === "encyclopedia") return listBlock("Cyber Encyclopedia", state.index.articles, "article");
        if (route.panel === "playbooks") return listBlock("Defensive Playbooks", state.index.playbooks, "playbook");
        if (route.panel === "incidents") return listBlock("Historical Incident Library", state.index.incidents, "incident");
        if (route.panel === "paths") return listBlock("Learning Paths", state.index.paths, "path");
        if (route.panel === "map") return renderMap();
        if (route.panel === "search") return renderSearch();
        return (
          "<h2>Defensive Knowledge Platform</h2>" +
          '<p class="st-lead">Intelligence fades. Knowledge compounds.</p>' +
          '<p class="st-badge">Educational reference · shared graph · no offensive content</p>' +
          "<p>Move between today’s intelligence and lasting explanations — concepts, playbooks, incidents, and learning paths interconnected through the same <code>cy_*</code> subjects.</p>" +
          "<ul>" +
          "<li>" +
          state.index.articles.length +
          " encyclopedia articles</li>" +
          "<li>" +
          state.index.playbooks.length +
          " defensive playbooks</li>" +
          "<li>" +
          state.index.incidents.length +
          " incident records</li>" +
          "<li>" +
          state.index.paths.length +
          " learning paths</li></ul>" +
          '<p><button type="button" class="st-chip" data-goto="encyclopedia">Browse encyclopedia</button> ' +
          '<button type="button" class="st-chip" data-goto="map/enc_cve-log4shell">Open Log4Shell knowledge map</button> ' +
          '<button type="button" class="st-chip" data-goto="search">Search</button></p>'
        );
      }

      function paint() {
        var modeBadge = state.teaching
          ? '<p class="st-badge" role="status">Teaching sample graph — encyclopedia/playbooks remain educational. <a href="live.html">Live intelligence</a>.</p>'
          : '<p class="st-badge" role="status">Live intelligence graph · curated defensive literacy (encyclopedia, playbooks, learning paths). Not a SOC feed.</p>';
        root.innerHTML =
          '<div class="st-knowledge">' +
          '<header class="st-demo-header">' +
          "<h1>Defensive Knowledge</h1>" +
          '<p class="st-lead">What is this? How does it work? How do professionals defend?</p>' +
          modeBadge +
          "</header>" +
          nav() +
          '<div id="st-k-body">' +
          body() +
          "</div></div>";

        root.querySelectorAll("[data-goto]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            setHash(btn.getAttribute("data-goto"));
          });
        });
        root.querySelectorAll("[data-map-focus]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            setHash("map/" + btn.getAttribute("data-map-focus"));
          });
        });
        root.querySelectorAll("[data-bookmark]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (!Research()) return;
            Research().toggleBookmark(btn.getAttribute("data-bookmark"), btn.getAttribute("data-title"));
            paint();
          });
        });
        var form = root.querySelector("#st-k-search");
        if (form) {
          form.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var fd = new FormData(form);
            state.searchQ = fd.get("q") || "";
            state.filterType = fd.get("type") || "all";
            paint();
          });
        }
        var save = root.querySelector("#st-k-save-search");
        if (save) {
          save.addEventListener("click", function () {
            if (!Research() || !state.searchQ.trim()) return;
            Research().upsert({
              id: "rw_local_search_" + Date.now().toString(36),
              kind: "saved-search",
              title: "Search: " + state.searchQ.slice(0, 40),
              query: state.searchQ,
              domain: "cyber",
              tags: ["knowledge"]
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
      }

      global.addEventListener("hashchange", paint);
      paint();
      return state.index;
    })
      .catch(function (err) {
        root.innerHTML =
          '<p role="alert">Could not open defensive knowledge against live intelligence. ' +
          String((err && err.message) || "Live graph unavailable.") +
          ' Sample data was not substituted. <a href="live.html">Live intelligence</a> · ' +
          '<a href="teaching.html">Teaching samples</a> · ' +
          '<button type="button" onclick="location.reload()">Retry</button></p>';
        root.removeAttribute("aria-busy");
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberKnowledge = {
    createIndex: createIndex,
    mountKnowledge: mountKnowledge,
    tokenize: tokenize
  };
})(typeof window !== "undefined" ? window : globalThis);
