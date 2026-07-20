/**
 * Waypoint Scholar — Module 4 research environment helpers.
 * Workspaces, sessions, field notes, reliability, project hubs, thinking-tool foundations.
 */
(function (global) {
  "use strict";

  function Schema() {
    return global.WU && global.WU.Schema;
  }

  function Learn() {
    return global.WU && global.WU.Learn;
  }

  function workspaceMeta(id) {
    var list = Schema().SCHOLAR_WORKSPACES || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0] || null;
  }

  function filterWorkspace(workspaceId, nodes) {
    var ws = workspaceMeta(workspaceId);
    if (!ws) return nodes || [];
    var allow = Object.create(null);
    (ws.kinds || []).forEach(function (k) {
      allow[k] = true;
    });
    return (nodes || [])
      .filter(function (n) {
        if (workspaceId === "projects") {
          return (n.projects || []).length > 0 || n.kind === "project";
        }
        if (workspaceId === "active") {
          return (
            allow[n.kind] ||
            (n.research && n.research.stage && n.research.stage !== "conclusions") ||
            (n.session && n.session.status === "active")
          );
        }
        if (workspaceId === "reading") {
          return Schema().isSourceKind(n.kind) || (n.queue && n.queue.reading);
        }
        return !!allow[n.kind];
      })
      .sort(function (a, b) {
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
  }

  function listSessions(nodes) {
    return (nodes || [])
      .filter(function (n) {
        return n.kind === "session";
      })
      .sort(function (a, b) {
        var as = (a.session && a.session.startedAt) || a.createdAt || "";
        var bs = (b.session && b.session.startedAt) || b.createdAt || "";
        return String(bs).localeCompare(String(as));
      });
  }

  function activeSession(nodes, activeId) {
    if (activeId) {
      for (var i = 0; i < (nodes || []).length; i++) {
        if (nodes[i].id === activeId) return nodes[i];
      }
    }
    return listSessions(nodes).filter(function (n) {
      return n.session && n.session.status === "active";
    })[0] || null;
  }

  function reliabilityFilled(r) {
    if (!r) return false;
    return (
      r.authority != null ||
      r.evidence != null ||
      r.bias != null ||
      r.recency != null ||
      r.confidence != null ||
      r.conflicts ||
      r.notes
    );
  }

  /** Compact personal reliability summary — not an objective score */
  function reliabilitySummary(node) {
    var r = (node && node.reliability) || {};
    if (!reliabilityFilled(r)) {
      return { assessed: false, blurb: "Not yet assessed", dims: [] };
    }
    var dims = (Schema().RELIABILITY_DIMENSIONS || []).map(function (d) {
      return { id: d.id, label: d.label, value: r[d.id] };
    });
    var parts = [];
    if (r.confidence != null) parts.push("confidence " + r.confidence + "/5");
    if (r.authority != null) parts.push("authority " + r.authority + "/5");
    if (r.bias != null) parts.push("bias concern " + r.bias + "/5");
    if (r.conflicts) parts.push("notes conflicting views");
    return {
      assessed: true,
      blurb: parts.join(" · ") || "Assessed",
      dims: dims,
      conflicts: r.conflicts || null,
      notes: r.notes || null
    };
  }

  function projectResearchHub(projectId, graphIndex) {
    var base =
      Learn() && Learn().projectIntelligence
        ? Learn().projectIntelligence(projectId, graphIndex)
        : {
            projectId: projectId,
            label: Schema().projectLabel(projectId),
            related: [],
            missing: [],
            references: [],
            questions: [],
            recent: [],
            research: [],
            connectedDisciplines: [],
            bridges: []
          };

    var ids = (graphIndex.byProject && graphIndex.byProject[projectId]) || [];
    var items = ids
      .map(function (id) {
        return graphIndex.nodeMap[id];
      })
      .filter(Boolean);

    var sessions = items.filter(function (n) {
      return n.kind === "session";
    });
    var fieldNotes = items.filter(function (n) {
      return n.kind === "field-note" || n.kind === "observation";
    });
    var experiments = items.filter(function (n) {
      return n.kind === "experiment" || n.kind === "hypothesis";
    });
    var ideas = items.filter(function (n) {
      return n.kind === "idea" || n.kind === "capture";
    });
    var decisions = items.filter(function (n) {
      return n.kind === "decision" || (n.thinking && n.thinking.tool === "decision-journal");
    });
    var maps = items.filter(function (n) {
      return n.kind === "concept-map" || n.kind === "argument";
    });

    return Object.assign({}, base, {
      sessions: sessions.sort(function (a, b) {
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      }),
      fieldNotes: fieldNotes,
      experiments: experiments,
      ideas: ideas,
      decisions: decisions,
      thinkingArtifacts: maps.concat(decisions).concat(experiments),
      notes: items.filter(function (n) {
        return n.kind === "research-note" || n.kind === "concept" || n.kind === "topic";
      })
    });
  }

  function sessionTimelineEvents(nodes) {
    var events = [];
    listSessions(nodes).forEach(function (n) {
      var st = n.session || {};
      if (st.startedAt) {
        events.push({
          at: st.startedAt,
          type: "session-start",
          title: "Session started: “" + n.title + "”",
          detail: st.purpose || Schema().workspaceLabel(st.workspace) || "Research",
          nodeId: n.id
        });
      }
      if (st.endedAt && st.status === "completed") {
        events.push({
          at: st.endedAt,
          type: "session",
          title: "Session completed: “" + n.title + "”",
          detail: st.discoveries ? String(st.discoveries).slice(0, 120) : "Research session",
          nodeId: n.id
        });
      }
    });
    (nodes || []).forEach(function (n) {
      if (n.kind !== "field-note") return;
      events.push({
        at: (n.field && n.field.capturedAt) || n.createdAt,
        type: "field",
        title: "Field note: “" + n.title + "”",
        detail: Schema().fieldContextLabel(n.field && n.field.context),
        nodeId: n.id
      });
    });
    return events;
  }

  function mergeTimeline(graphIndex, nodes, limit) {
    limit = limit || 80;
    var base = Learn() && Learn().buildTimeline ? Learn().buildTimeline(graphIndex, limit) : [];
    var extra = sessionTimelineEvents(nodes);
    return base
      .concat(extra)
      .sort(function (a, b) {
        return String(b.at || "").localeCompare(String(a.at || ""));
      })
      .slice(0, limit);
  }

  function thinkingCatalog() {
    return (Schema().THINKING_TOOLS || []).map(function (t) {
      return Object.assign({}, t);
    });
  }

  function createThinkingStub(toolId, title) {
    var tool = null;
    (Schema().THINKING_TOOLS || []).forEach(function (t) {
      if (t.id === toolId) tool = t;
    });
    if (!tool) return null;
    return {
      kind: tool.kind,
      title: title || tool.label,
      body: "# " + (title || tool.label) + "\n\n_Foundation stub — expand in later Scholar modules._\n",
      tags: ["thinking-tool", tool.id],
      thinking: {
        tool: tool.id,
        status: tool.id === "decision-journal" ? "draft" : "draft",
        claim: null,
        supports: null,
        objections: null,
        statement: null,
        hypothesisStatus: tool.id === "hypothesis" ? "proposed" : null,
        question: null,
        options: null,
        chosen: null,
        rationale: null,
        method: null,
        result: null,
        next: null,
        focusId: null,
        nodeIds: [],
        evidenceIds: [],
        decision: null,
        evidenceUsed: null,
        alternatives: null,
        expectedOutcome: null,
        confidence: null,
        reviewDate: null,
        laterObservations: null,
        supportingEvidence: null,
        contradictingEvidence: null,
        experiments: null
      }
    };
  }

  function workspaceStats(nodes) {
    return (Schema().SCHOLAR_WORKSPACES || []).map(function (ws) {
      return {
        id: ws.id,
        label: ws.label,
        blurb: ws.blurb,
        count: filterWorkspace(ws.id, nodes).length,
        primaryAction: ws.primaryAction
      };
    });
  }

  global.WU = global.WU || {};
  global.WU.Scholar = {
    workspaceMeta: workspaceMeta,
    filterWorkspace: filterWorkspace,
    listSessions: listSessions,
    activeSession: activeSession,
    reliabilitySummary: reliabilitySummary,
    reliabilityFilled: reliabilityFilled,
    projectResearchHub: projectResearchHub,
    sessionTimelineEvents: sessionTimelineEvents,
    mergeTimeline: mergeTimeline,
    thinkingCatalog: thinkingCatalog,
    createThinkingStub: createThinkingStub,
    workspaceStats: workspaceStats
  };
})(typeof window !== "undefined" ? window : globalThis);
