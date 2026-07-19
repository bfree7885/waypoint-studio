/**
 * Waypoint University — fast in-memory search with match reasons (Block 2).
 */
(function (global) {
  "use strict";

  var STOP = {
    a: 1, an: 1, the: 1, and: 1, or: 1, of: 1, to: 1, in: 1, on: 1, for: 1, is: 1, are: 1, was: 1, be: 1, as: 1, at: 1, by: 1, it: 1, this: 1, that: 1, with: 1, from: 1
  };

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9+#.\-_/]+/g, " ")
      .split(/\s+/)
      .filter(function (t) {
        return t.length >= 2 && !STOP[t];
      });
  }

  function buildIndex(nodes) {
    var inv = Object.create(null);
    var docs = Object.create(null);
    (nodes || []).forEach(function (n) {
      if (!n || !n.id) return;
      docs[n.id] = n;
      function add(field, weight, text) {
        tokenize(text).forEach(function (term) {
          if (!inv[term]) inv[term] = [];
          inv[term].push({ id: n.id, field: field, weight: weight });
        });
      }
      add("title", 8, n.title);
      add("summary", 5, n.summary);
      add("body", 2, n.body);
      add("kind", 3, n.kind);
      (n.tags || []).forEach(function (t) {
        add("tag", 6, t);
      });
      (n.categories || []).forEach(function (c) {
        add("category", 4, c);
      });
      (n.projects || []).forEach(function (p) {
        add("project", 4, p);
      });
      if (n.sourceUrl) add("url", 3, n.sourceUrl);
      if (n.source) {
        add("citation", 5, n.source.citation);
        add("authors", 4, n.source.authors);
        add("year", 2, n.source.year);
      }
      if (n.question && n.question.evidence) add("evidence", 3, n.question.evidence);
      if (n.research && n.research.stage) add("research-stage", 2, n.research.stage);
    });
    return { inv: inv, docs: docs, builtAt: Date.now(), count: Object.keys(docs).length };
  }

  function search(index, query, opts) {
    opts = opts || {};
    var limit = opts.limit || 40;
    var kind = opts.kind || null;
    var q = String(query || "").trim();
    if (!q || !index) return [];

    var terms = tokenize(q);
    var phrase = q.toLowerCase();
    var scores = Object.create(null);
    var reasons = Object.create(null);

    function bump(id, pts, reason) {
      scores[id] = (scores[id] || 0) + pts;
      if (!reasons[id]) reasons[id] = [];
      if (reasons[id].indexOf(reason) < 0) reasons[id].push(reason);
    }

    Object.keys(index.docs).forEach(function (id) {
      var n = index.docs[id];
      if (kind && n.kind !== kind) return;
      var title = String(n.title || "").toLowerCase();
      var body = String(n.body || "").toLowerCase();
      if (title.indexOf(phrase) >= 0) bump(id, 20, 'Title contains "' + q + '"');
      else if (body.indexOf(phrase) >= 0) bump(id, 8, 'Body contains "' + q + '"');
    });

    terms.forEach(function (term) {
      var hits = index.inv[term] || [];
      hits.forEach(function (h) {
        var n = index.docs[h.id];
        if (!n) return;
        if (kind && n.kind !== kind) return;
        bump(h.id, h.weight, 'Matched ' + h.field + ': "' + term + '"');
      });
    });

    return Object.keys(scores)
      .map(function (id) {
        return {
          id: id,
          node: index.docs[id],
          score: scores[id],
          reasons: reasons[id].slice(0, 5)
        };
      })
      .sort(function (a, b) {
        return b.score - a.score || String(b.node.updatedAt || "").localeCompare(String(a.node.updatedAt || ""));
      })
      .slice(0, limit);
  }

  /**
   * Related nodes via shared tags/projects or graph neighbors of top hits.
   */
  function relatedToResults(graphIndex, hits, limit) {
    limit = limit || 8;
    if (!hits || !hits.length || !graphIndex) return [];
    var exclude = Object.create(null);
    hits.forEach(function (h) {
      exclude[h.id] = true;
    });
    var scores = Object.create(null);
    var why = Object.create(null);

    function bump(id, pts, reason) {
      if (exclude[id] || !graphIndex.nodeMap[id]) return;
      scores[id] = (scores[id] || 0) + pts;
      if (!why[id]) why[id] = [];
      if (why[id].indexOf(reason) < 0) why[id].push(reason);
    }

    hits.slice(0, 5).forEach(function (h) {
      var n = h.node;
      (graphIndex.adj[h.id] || []).forEach(function (edge) {
        bump(edge.otherId, 6, "Connected to “" + n.title + "”");
      });
      (n.tags || []).forEach(function (tag) {
        ((graphIndex.byTag && graphIndex.byTag[tag]) || []).forEach(function (id) {
          bump(id, 3, 'Shared tag “' + tag + '”');
        });
      });
      (n.projects || []).forEach(function (p) {
        ((graphIndex.byProject && graphIndex.byProject[p]) || []).forEach(function (id) {
          bump(id, 2, "Same project lane");
        });
      });
    });

    return Object.keys(scores)
      .map(function (id) {
        return {
          id: id,
          node: graphIndex.nodeMap[id],
          score: scores[id],
          reasons: why[id].slice(0, 3)
        };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, limit);
  }

  function followUps(node, graphIndex, limit) {
    limit = limit || 6;
    if (!node || !graphIndex) return [];
    var out = [];
    var seen = Object.create(null);
    (graphIndex.adj[node.id] || []).forEach(function (e) {
      if (seen[e.otherId]) return;
      if (e.type === "continue-with" || e.type === "learn-before" || e.type === "future-research" || e.type === "relates-to") {
        seen[e.otherId] = true;
        var other = graphIndex.nodeMap[e.otherId];
        if (other) {
          out.push({
            id: other.id,
            node: other,
            reasons: ["Follow via “" + (global.WU.Schema.relationLabel(e.type) || e.type) + "”"]
          });
        }
      }
    });
    return out.slice(0, limit);
  }

  /**
   * Research-assistant context for a focus node or top search hit.
   */
  function researchAssist(graphIndex, node, opts) {
    opts = opts || {};
    if (!graphIndex || !node) {
      return {
        nearby: [],
        frequent: [],
        followUps: [],
        projects: [],
        questions: [],
        reasons: []
      };
    }
    var nearby = [];
    var seen = Object.create(null);
    (graphIndex.adj[node.id] || []).forEach(function (e) {
      if (seen[e.otherId]) return;
      seen[e.otherId] = true;
      var o = graphIndex.nodeMap[e.otherId];
      if (!o) return;
      nearby.push({
        id: o.id,
        node: o,
        reasons: [global.WU.Schema.relationLabel(e.type) || e.type]
      });
    });
    nearby = nearby.slice(0, opts.nearbyLimit || 8);

    var frequent = [];
    if (global.WU.Graph && global.WU.Graph.frequentlyConnected) {
      frequent = global.WU.Graph.frequentlyConnected(graphIndex, 6)
        .filter(function (x) {
          return x.id !== node.id;
        })
        .map(function (x) {
          return {
            id: x.id,
            node: x.node,
            reasons: ["Frequently connected hub (degree " + x.degree + ")"]
          };
        });
    }

    var projects = (node.projects || []).map(function (pid) {
      return { id: pid, label: global.WU.Schema.projectLabel(pid) };
    });

    var questions = [];
    (graphIndex.adj[node.id] || []).forEach(function (e) {
      var o = graphIndex.nodeMap[e.otherId];
      if (!o || o.kind !== "question") return;
      var st = (o.question && o.question.status) || "open";
      if (st === "answered" || st === "parked") return;
      questions.push({
        id: o.id,
        node: o,
        reasons: ["Open question linked via “" + (global.WU.Schema.relationLabel(e.type) || e.type) + "”"]
      });
    });
    (node.projects || []).forEach(function (p) {
      ((graphIndex.byProject && graphIndex.byProject[p]) || []).forEach(function (id) {
        var o = graphIndex.nodeMap[id];
        if (!o || o.kind !== "question") return;
        if (questions.some(function (q) {
          return q.id === o.id;
        }))
          return;
        var st = (o.question && o.question.status) || "open";
        if (st === "open" || st === "investigating") {
          questions.push({
            id: o.id,
            node: o,
            reasons: ["Same project lane"]
          });
        }
      });
    });

    return {
      nearby: nearby,
      frequent: frequent.slice(0, 6),
      followUps: followUps(node, graphIndex, 6),
      projects: projects,
      questions: questions.slice(0, 8),
      reasons: ["Context built from graph neighbors, hubs, projects, and open questions"]
    };
  }

  global.WU = global.WU || {};
  global.WU.Search = {
    tokenize: tokenize,
    buildIndex: buildIndex,
    search: search,
    relatedToResults: relatedToResults,
    followUps: followUps,
    researchAssist: researchAssist
  };
})(typeof window !== "undefined" ? window : globalThis);
