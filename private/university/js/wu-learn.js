/**
 * Waypoint University — Learning Engine (Work Block 3).
 * Understanding stages, profile, gaps, recommendations, bridges, timeline, project intelligence.
 * Derived insights are cached; no grades, no gamification.
 */
(function (global) {
  "use strict";

  function Schema() {
    return global.WU && global.WU.Schema;
  }

  function daysSince(iso) {
    if (!iso) return 9999;
    return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  }

  function bodyLen(n) {
    return String((n && n.body) || "").trim().length;
  }

  function stageIndex(id) {
    var stages = Schema().UNDERSTANDING_STAGES || [];
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].id === id) return i;
    }
    return 0;
  }

  function stageLabel(id) {
    var stages = Schema().UNDERSTANDING_STAGES || [];
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].id === id) return stages[i].label;
    }
    return id || "Discovered";
  }

  /**
   * Infer understanding stage from use — never a grade.
   * Manual override on node.learning.stageManual wins.
   */
  function inferStage(node, graphIndex) {
    if (!node) return "discovered";
    if (node.learning && node.learning.stageManual) return node.learning.stageManual;
    if (node.kind === "path" || node.kind === "capture") return "discovered";

    var deg = (graphIndex && graphIndex.adj[node.id] || []).length;
    var opens = (node.learning && node.learning.openCount) || 0;
    var len = bodyLen(node);
    var adj = (graphIndex && graphIndex.adj[node.id]) || [];
    var typeCount = Object.create(null);
    adj.forEach(function (e) {
      typeCount[e.type] = (typeCount[e.type] || 0) + 1;
    });

    var hasExample = !!(typeCount["has-example"] || typeCount["example-of"]);
    var hasApply = !!(typeCount["used-in"] || typeCount["uses"] || typeCount["implements"] || typeCount["implemented-by"]);
    var hasDefine = !!(typeCount["defines"] || typeCount["defined-by"]);
    var hasTeach = !!(typeCount["answered-by"] || typeCount["questions"]);
    var projects = (node.projects || []).length;
    var annotations = (node.annotations || []).length;
    var researchDone = node.research && (node.research.stage === "conclusions" || node.research.stage === "follow-up");
    var conf = node.learning && node.learning.confidence != null ? Number(node.learning.confidence) : null;
    var interdisciplinary = false;
    if (graphIndex && projects >= 1) {
      adj.forEach(function (e) {
        var other = graphIndex.nodeMap[e.otherId];
        if (!other || !(other.projects || []).length) return;
        (other.projects || []).forEach(function (p) {
          if ((node.projects || []).indexOf(p) < 0) interdisciplinary = true;
        });
      });
    }

    var score = 0;
    if (len > 20 || opens >= 1) score = Math.max(score, 1); // exploring
    if (len > 120 || opens >= 3 || annotations >= 1 || hasExample) score = Math.max(score, 2); // practicing
    if (hasApply || projects >= 1 || (node.research && node.research.stage && node.research.stage !== "capture"))
      score = Math.max(score, 3); // applying
    if (deg >= 3 || interdisciplinary || (typeCount["studied-with"] || 0) + (typeCount["relates-to"] || 0) >= 3)
      score = Math.max(score, 4); // connecting
    if (hasDefine || hasTeach || researchDone || annotations >= 3) score = Math.max(score, 5); // teaching
    if ((conf != null && conf >= 4 && deg >= 4 && len > 200) || (opens >= 8 && deg >= 5 && researchDone))
      score = Math.max(score, 6); // mastering

    var stages = Schema().UNDERSTANDING_STAGES || [];
    return (stages[score] && stages[score].id) || "discovered";
  }

  function effectiveStage(node, graphIndex) {
    return inferStage(node, graphIndex);
  }

  /** Build / refresh cache of derived learning insights */
  var _cache = { fingerprint: null, builtAt: 0, data: null };

  function fingerprint(graphIndex, meta) {
    meta = meta || {};
    var last = meta.lastWriteAt || "";
    var edgeN = (graphIndex && graphIndex.edges && graphIndex.edges.length) || 0;
    var nodeN = (graphIndex && graphIndex.nodeCount) || 0;
    return nodeN + ":" + edgeN + ":" + last;
  }

  function nodesList(graphIndex) {
    return Object.keys(graphIndex.nodeMap).map(function (id) {
      return graphIndex.nodeMap[id];
    });
  }

  function buildProfile(graphIndex, meta) {
    meta = meta || {};
    var nodes = nodesList(graphIndex).filter(function (n) {
      return n.kind !== "path" && n.kind !== "capture";
    });
    var byStage = Object.create(null);
    (Schema().UNDERSTANDING_STAGES || []).forEach(function (s) {
      byStage[s.id] = [];
    });

    var focusCounts = Object.create(null);
    var projectActivity = Object.create(null);
    var improving = [];
    var neglected = [];
    var revisited = [];
    var depthSum = 0;
    var breadthProjects = Object.create(null);
    var interLinks = 0;
    var momentumRecent = 0;
    var confidenceVals = [];

    var now = Date.now();
    nodes.forEach(function (n) {
      var stage = effectiveStage(n, graphIndex);
      if (!byStage[stage]) byStage[stage] = [];
      byStage[stage].push(n);
      depthSum += stageIndex(stage);

      (n.projects || []).forEach(function (p) {
        breadthProjects[p] = (breadthProjects[p] || 0) + 1;
        projectActivity[p] = (projectActivity[p] || 0) + 1;
        if (daysSince(n.updatedAt) < 14) focusCounts[p] = (focusCounts[p] || 0) + 1;
      });

      var opens = (n.learning && n.learning.openCount) || 0;
      if (opens >= 4) revisited.push(n);
      if (daysSince(n.updatedAt) < 21 && stageIndex(stage) >= 2) improving.push(n);
      if (daysSince(n.lastOpenedAt || n.updatedAt) > 40 && stageIndex(stage) >= 1) neglected.push(n);
      if (daysSince(n.updatedAt) < 7 || daysSince(n.createdAt) < 7) momentumRecent++;
      if (n.learning && n.learning.confidence != null) confidenceVals.push(Number(n.learning.confidence));

      var adj = graphIndex.adj[n.id] || [];
      var myP = n.projects || [];
      if (myP.length) {
        adj.forEach(function (e) {
          var o = graphIndex.nodeMap[e.otherId];
          if (!o) return;
          (o.projects || []).forEach(function (p) {
            if (myP.indexOf(p) < 0) interLinks++;
          });
        });
      }
    });

    function topKeys(map, limit) {
      return Object.keys(map)
        .map(function (k) {
          return { id: k, count: map[k], label: Schema().projectLabel(k) };
        })
        .sort(function (a, b) {
          return b.count - a.count;
        })
        .slice(0, limit || 6);
    }

    var avgConf =
      confidenceVals.length > 0
        ? confidenceVals.reduce(function (a, b) {
            return a + b;
          }, 0) / confidenceVals.length
        : null;

    improving.sort(function (a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
    neglected.sort(function (a, b) {
      return daysSince(b.lastOpenedAt || b.updatedAt) - daysSince(a.lastOpenedAt || a.updatedAt);
    });
    revisited.sort(function (a, b) {
      return ((b.learning && b.learning.openCount) || 0) - ((a.learning && a.learning.openCount) || 0);
    });

    return {
      nodeCount: nodes.length,
      byStage: byStage,
      stageCounts: Object.keys(byStage).map(function (id) {
        return { id: id, label: stageLabel(id), count: byStage[id].length };
      }),
      currentFocus: topKeys(focusCounts, 5),
      improving: improving.slice(0, 8),
      neglected: neglected.slice(0, 8),
      revisited: revisited.slice(0, 8),
      depth: nodes.length ? depthSum / nodes.length : 0,
      breadth: Object.keys(breadthProjects).length,
      breadthProjects: topKeys(breadthProjects, 8),
      interdisciplinaryLinks: Math.floor(interLinks / 2),
      momentum: momentumRecent,
      knowledgeConfidence: avgConf,
      goals: (meta.learningGoals || []).slice(0, 12)
    };
  }

  function findLearningGaps(graphIndex) {
    var opportunities = [];
    var nodes = nodesList(graphIndex);

    // Prerequisites referenced but thin / missing study
    var missingPrereq = [];
    nodes.forEach(function (n) {
      (graphIndex.adj[n.id] || []).forEach(function (e) {
        if (e.type !== "learn-before" || !e.outbound) return;
        var pre = graphIndex.nodeMap[e.otherId];
        if (!pre) return;
        if (bodyLen(pre) < 40 || stageIndex(effectiveStage(pre, graphIndex)) <= 1) {
          missingPrereq.push({
            id: pre.id,
            node: pre,
            why: "Prerequisite of “" + n.title + "” still lightly documented"
          });
        }
      });
    });
    if (missingPrereq.length) {
      opportunities.push({
        id: "missing-prerequisites",
        title: "Prerequisite concepts to strengthen",
        blurb: "Building these will unlock deeper understanding of what depends on them.",
        items: uniqueByNode(missingPrereq).slice(0, 10)
      });
    }

    // Weak supporting knowledge: high degree, short body
    var weakSupport = nodes
      .filter(function (n) {
        if (n.kind === "path" || n.kind === "capture") return false;
        var deg = (graphIndex.adj[n.id] || []).length;
        return deg >= 3 && bodyLen(n) < 80;
      })
      .map(function (n) {
        return {
          id: n.id,
          node: n,
          why: "Often connected, but the note itself is still thin"
        };
      });
    if (weakSupport.length) {
      opportunities.push({
        id: "weak-support",
        title: "Topics with weak supporting knowledge",
        blurb: "A short definition or example here will strengthen many neighbors.",
        items: weakSupport.slice(0, 10)
      });
    }

    // Frequently referenced without definition
    var undef = [];
    nodes.forEach(function (n) {
      if (n.kind === "definition") return;
      var mentioned = (graphIndex.adj[n.id] || []).filter(function (e) {
        return e.type === "mentions" || e.type === "mentioned-in" || e.type === "references" || e.type === "referenced-by";
      }).length;
      var hasDef = (graphIndex.adj[n.id] || []).some(function (e) {
        var o = graphIndex.nodeMap[e.otherId];
        return o && (o.kind === "definition" || e.type === "defines" || e.type === "defined-by");
      });
      if (mentioned >= 2 && !hasDef && bodyLen(n) < 60) {
        undef.push({
          id: n.id,
          node: n,
          why: "Referenced often without a clear definition nearby"
        });
      }
    });
    if (undef.length) {
      opportunities.push({
        id: "undefined-references",
        title: "Ideas ready for a definition",
        blurb: "Naming and defining these will make the graph clearer.",
        items: undef.slice(0, 10)
      });
    }

    // Disconnected clusters: nodes with degree 0 that share a project with connected work
    var isolated = nodes
      .filter(function (n) {
        return (
          n.kind !== "path" &&
          n.kind !== "capture" &&
          (graphIndex.adj[n.id] || []).length === 0 &&
          (n.projects || []).length > 0
        );
      })
      .map(function (n) {
        return {
          id: n.id,
          node: n,
          why: "In a project lane but not linked to neighbors yet"
        };
      });
    if (isolated.length) {
      opportunities.push({
        id: "disconnected-clusters",
        title: "Disconnected knowledge in project lanes",
        blurb: "A single link can fold these into the living map.",
        items: isolated.slice(0, 10)
      });
    }

    // Searched but rarely documented
    var searchedThin = nodes
      .filter(function (n) {
        var hits = (n.learning && n.learning.searchHits) || 0;
        return hits >= 2 && bodyLen(n) < 50;
      })
      .map(function (n) {
        return {
          id: n.id,
          node: n,
          why: "Appears in search often — a good candidate to flesh out"
        };
      });
    if (searchedThin.length) {
      opportunities.push({
        id: "searched-undocumented",
        title: "Often sought, lightly written",
        blurb: "Your curiosity is pointing here — a few sentences will help future-you.",
        items: searchedThin.slice(0, 10)
      });
    }

    return opportunities;
  }

  function uniqueByNode(items) {
    var seen = Object.create(null);
    var out = [];
    items.forEach(function (it) {
      var id = it.id || (it.node && it.node.id);
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push(it);
    });
    return out;
  }

  function recommendNext(graphIndex, meta, limit) {
    limit = limit || 5;
    meta = meta || {};
    var scored = [];
    var nodes = nodesList(graphIndex);
    var focusProjects = Object.create(null);
    ((meta.recentViews || []).slice(0, 10) || []).forEach(function (id) {
      var n = graphIndex.nodeMap[id];
      if (!n) return;
      (n.projects || []).forEach(function (p) {
        focusProjects[p] = (focusProjects[p] || 0) + 2;
      });
    });
    nodes.forEach(function (n) {
      if (daysSince(n.updatedAt) < 10) {
        (n.projects || []).forEach(function (p) {
          focusProjects[p] = (focusProjects[p] || 0) + 1;
        });
      }
    });

    // Open questions on active projects
    nodes.forEach(function (n) {
      if (n.kind !== "question") return;
      var st = (n.question && n.question.status) || "open";
      if (st !== "open" && st !== "investigating") return;
      var boost = 4;
      (n.projects || []).forEach(function (p) {
        if (focusProjects[p]) boost += 3;
      });
      scored.push({
        id: n.id,
        node: n,
        score: boost,
        why: "Open question" + ((n.projects || [])[0] ? " in " + Schema().projectLabel(n.projects[0]) : "") + " — resolving it deepens the map"
      });
    });

    // Prerequisites to strengthen
    findLearningGaps(graphIndex).forEach(function (g) {
      if (g.id !== "missing-prerequisites" && g.id !== "weak-support") return;
      (g.items || []).slice(0, 4).forEach(function (it) {
        scored.push({
          id: it.id,
          node: it.node,
          score: g.id === "missing-prerequisites" ? 7 : 5,
          why: it.why
        });
      });
    });

    // Continue research mid-flow
    nodes.forEach(function (n) {
      var stage = n.research && n.research.stage;
      if (!stage || stage === "conclusions" || stage === "follow-up") return;
      scored.push({
        id: n.id,
        node: n,
        score: 6,
        why: "Research mid-stream (“" + stage + "”) — a natural next step"
      });
    });

    // Queue / focus
    nodes.forEach(function (n) {
      if (n.queue && n.queue.focusToday) {
        scored.push({
          id: n.id,
          node: n,
          score: 9,
          why: "Pinned as today’s focus"
        });
      } else if (n.queue && n.queue.reading) {
        scored.push({
          id: n.id,
          node: n,
          score: 5,
          why: "Waiting in your reading queue"
        });
      }
    });

    // Goals match titles/tags
    (meta.learningGoals || []).forEach(function (goal) {
      var g = String(goal || "").toLowerCase();
      if (!g) return;
      nodes.forEach(function (n) {
        var blob = (n.title + " " + (n.tags || []).join(" ")).toLowerCase();
        if (blob.indexOf(g) >= 0 || g.indexOf(String(n.title || "").toLowerCase()) >= 0) {
          scored.push({
            id: n.id,
            node: n,
            score: 6,
            why: "Aligns with your learning goal: “" + goal + "”"
          });
        }
      });
    });

    // Bridge seeds
    crossDisciplinary(graphIndex)
      .slice(0, 3)
      .forEach(function (b) {
        if (b.seedNode) {
          scored.push({
            id: b.seedNode.id,
            node: b.seedNode,
            score: 4,
            why: "Bridge opportunity: " + b.label
          });
        }
      });

    var seen = Object.create(null);
    return scored
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .filter(function (s) {
        if (!s.node || seen[s.id]) return false;
        seen[s.id] = true;
        return true;
      })
      .slice(0, limit);
  }

  function crossDisciplinary(graphIndex) {
    var bridges = Schema().DISCIPLINE_BRIDGES || [];
    var out = [];
    bridges.forEach(function (bridge) {
      var left = [];
      var right = [];
      (bridge.left || []).forEach(function (pid) {
        ((graphIndex.byProject && graphIndex.byProject[pid]) || []).forEach(function (id) {
          left.push(graphIndex.nodeMap[id]);
        });
      });
      (bridge.right || []).forEach(function (pid) {
        ((graphIndex.byProject && graphIndex.byProject[pid]) || []).forEach(function (id) {
          right.push(graphIndex.nodeMap[id]);
        });
      });
      left = left.filter(Boolean);
      right = right.filter(Boolean);
      if (!left.length || !right.length) return;

      var cross = 0;
      var seed = null;
      left.slice(0, 40).forEach(function (a) {
        var adj = graphIndex.adj[a.id] || [];
        right.slice(0, 40).forEach(function (b) {
          var linked = adj.some(function (e) {
            return e.otherId === b.id;
          });
          if (linked) cross++;
          else if (!seed) seed = a;
        });
      });

      out.push({
        id: bridge.id,
        label: bridge.label,
        blurb: bridge.blurb,
        leftCount: left.length,
        rightCount: right.length,
        crossLinks: cross,
        opportunity: cross < 2,
        seedNode: seed || left[0] || right[0],
        why:
          cross < 2
            ? "You have work on both sides with few links — a promising place to discover connections"
            : "Already bridging these fields (" + cross + " links)"
      });
    });

    // Also: nodes spanning multiple projects
    var multi = nodesList(graphIndex)
      .filter(function (n) {
        return (n.projects || []).length >= 2;
      })
      .slice(0, 12)
      .map(function (n) {
        return {
          id: "multi-" + n.id,
          label: n.title,
          blurb: (n.projects || []).map(Schema().projectLabel).join(" · "),
          leftCount: 1,
          rightCount: 1,
          crossLinks: 1,
          opportunity: false,
          seedNode: n,
          why: "Already sits across disciplines — a natural hinge in your knowledge"
        };
      });

    return out
      .concat(multi)
      .sort(function (a, b) {
        return (b.opportunity ? 1 : 0) - (a.opportunity ? 1 : 0) || b.leftCount + b.rightCount - (a.leftCount + a.rightCount);
      });
  }

  function buildTimeline(graphIndex, limit) {
    limit = limit || 60;
    var events = [];
    nodesList(graphIndex).forEach(function (n) {
      if (n.kind === "path") return;
      events.push({
        at: n.createdAt,
        type: "learned",
        title: "Added “" + n.title + "”",
        detail: Schema().kindLabel(n.kind),
        nodeId: n.id
      });
      if (n.kind === "question" && n.question && n.question.status === "answered") {
        events.push({
          at: n.updatedAt,
          type: "answered",
          title: "Answered “" + n.title + "”",
          detail: "Question resolved",
          nodeId: n.id
        });
      }
      if (Schema().isSourceKind(n.kind) && n.source && n.source.readingStatus === "finished") {
        events.push({
          at: n.updatedAt,
          type: "finished",
          title: "Finished “" + n.title + "”",
          detail: Schema().kindLabel(n.kind),
          nodeId: n.id
        });
      }
      if (n.research && n.research.stage === "conclusions") {
        events.push({
          at: n.updatedAt,
          type: "research",
          title: "Research concluded: “" + n.title + "”",
          detail: "Conclusions recorded",
          nodeId: n.id
        });
      }
      if (n.kind === "project" || ((n.projects || []).length && n.kind === "idea" && daysSince(n.createdAt) < 3)) {
        /* project starts surfaced via first project-tagged items */
      }
      if ((n.projects || []).length && n.createdAt === n.updatedAt) {
        events.push({
          at: n.createdAt,
          type: "project",
          title: "Linked to " + Schema().projectLabel(n.projects[0]),
          detail: n.title,
          nodeId: n.id
        });
      }
    });

    (graphIndex.edges || []).forEach(function (e) {
      if (e.broken) return;
      var from = graphIndex.nodeMap[e.fromId];
      var to = graphIndex.nodeMap[e.toId];
      if (!from || !to) return;
      var major =
        e.type === "builds-upon" ||
        e.type === "contradicts" ||
        e.type === "future-research" ||
        e.type === "studied-with";
      if (!major) return;
      events.push({
        at: e.createdAt,
        type: "discovery",
        title: Schema().relationLabel(e.type) + ": “" + from.title + "” → “" + to.title + "”",
        detail: "New connection",
        nodeId: from.id
      });
    });

    events.sort(function (a, b) {
      return String(b.at || "").localeCompare(String(a.at || ""));
    });

    // Dedupe near-identical
    var seen = Object.create(null);
    var out = [];
    events.forEach(function (ev) {
      var k = ev.type + ":" + ev.nodeId + ":" + String(ev.at || "").slice(0, 10);
      if (seen[k]) return;
      seen[k] = true;
      out.push(ev);
    });
    return out.slice(0, limit);
  }

  function projectIntelligence(projectId, graphIndex) {
    var ids = (graphIndex.byProject && graphIndex.byProject[projectId]) || [];
    var items = ids.map(function (id) {
      return graphIndex.nodeMap[id];
    }).filter(Boolean);

    var related = items.slice().sort(function (a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
    var sources = items.filter(function (n) {
      return Schema().isSourceKind(n.kind);
    });
    var questions = items.filter(function (n) {
      return (
        n.kind === "question" &&
        (!n.question || n.question.status === "open" || n.question.status === "investigating")
      );
    });
    var research = items.filter(function (n) {
      return n.research && n.research.stage;
    });
    var recent = related.filter(function (n) {
      return daysSince(n.updatedAt) < 21;
    }).slice(0, 8);

    var missing = [];
    items.forEach(function (n) {
      (graphIndex.adj[n.id] || []).forEach(function (e) {
        if (e.type !== "learn-before" || !e.outbound) return;
        var pre = graphIndex.nodeMap[e.otherId];
        if (!pre) return;
        if ((pre.projects || []).indexOf(projectId) < 0 || bodyLen(pre) < 40) {
          missing.push({
            id: pre.id,
            node: pre,
            why: "Prerequisite for “" + n.title + "”"
          });
        }
      });
    });
    missing = uniqueByNode(missing).slice(0, 8);

    var disciplines = Object.create(null);
    items.forEach(function (n) {
      (graphIndex.adj[n.id] || []).forEach(function (e) {
        var o = graphIndex.nodeMap[e.otherId];
        if (!o) return;
        (o.projects || []).forEach(function (p) {
          if (p !== projectId) disciplines[p] = (disciplines[p] || 0) + 1;
        });
      });
    });

    var bridges = crossDisciplinary(graphIndex).filter(function (b) {
      var left = (Schema().DISCIPLINE_BRIDGES || []).filter(function (x) {
        return x.id === b.id;
      })[0];
      if (!left) return (b.blurb || "").indexOf(Schema().projectLabel(projectId)) >= 0;
      return (
        (left.left || []).indexOf(projectId) >= 0 ||
        (left.right || []).indexOf(projectId) >= 0
      );
    });

    return {
      projectId: projectId,
      label: Schema().projectLabel(projectId),
      related: related.slice(0, 40),
      missing: missing,
      references: sources.slice(0, 20),
      questions: questions.slice(0, 20),
      recent: recent,
      research: research.slice(0, 15),
      connectedDisciplines: Object.keys(disciplines)
        .map(function (p) {
          return { id: p, label: Schema().projectLabel(p), count: disciplines[p] };
        })
        .sort(function (a, b) {
          return b.count - a.count;
        })
        .slice(0, 8),
      bridges: bridges.slice(0, 4)
    };
  }

  function understandingMap(graphIndex) {
    var profile = buildProfile(graphIndex, {});
    return {
      stages: (Schema().UNDERSTANDING_STAGES || []).map(function (s) {
        return {
          id: s.id,
          label: s.label,
          blurb: s.blurb,
          items: (profile.byStage[s.id] || []).slice(0, 24)
        };
      }),
      total: profile.nodeCount
    };
  }

  function buildInsights(graphIndex, meta) {
    meta = meta || {};
    var fp = fingerprint(graphIndex, meta);
    if (_cache.fingerprint === fp && _cache.data) return _cache.data;
    var t0 = Date.now();
    var data = {
      profile: buildProfile(graphIndex, meta),
      gaps: findLearningGaps(graphIndex),
      next: recommendNext(graphIndex, meta, 5),
      bridges: crossDisciplinary(graphIndex).slice(0, 10),
      timeline: buildTimeline(graphIndex, 80),
      map: understandingMap(graphIndex),
      builtAt: Date.now(),
      elapsedMs: 0
    };
    data.elapsedMs = Date.now() - t0;
    _cache = { fingerprint: fp, builtAt: data.builtAt, data: data };
    return data;
  }

  function invalidate() {
    _cache = { fingerprint: null, builtAt: 0, data: null };
  }

  global.WU = global.WU || {};
  global.WU.Learn = {
    inferStage: inferStage,
    effectiveStage: effectiveStage,
    stageLabel: stageLabel,
    stageIndex: stageIndex,
    buildProfile: buildProfile,
    findLearningGaps: findLearningGaps,
    recommendNext: recommendNext,
    crossDisciplinary: crossDisciplinary,
    buildTimeline: buildTimeline,
    projectIntelligence: projectIntelligence,
    understandingMap: understandingMap,
    buildInsights: buildInsights,
    invalidate: invalidate,
    daysSince: daysSince
  };
})(typeof window !== "undefined" ? window : globalThis);
