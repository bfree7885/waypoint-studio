/**
 * Waypoint Scholar — Module 6 local research assistant.
 * Grounded only in the owner's graph. Never fabricates nodes or edges.
 * Confidence labels: known | likely | possible | unknown
 * Remote AI is off by default and must be explicitly enabled (future hook).
 */
(function (global) {
  "use strict";

  var CONFIDENCE = {
    known: { id: "known", label: "Known", blurb: "Directly present in your library or graph." },
    likely: { id: "likely", label: "Likely", blurb: "Strong overlap or shared structure — still verify." },
    possible: { id: "possible", label: "Possible", blurb: "Weak signal — treat as a lead, not a fact." },
    unknown: { id: "unknown", label: "Unknown", blurb: "Not evidenced in your library." }
  };

  var ACTIONS = [
    { id: "summarize", label: "Summarize this note" },
    { id: "compare", label: "Compare selected concepts" },
    { id: "contradictions", label: "Find contradictions" },
    { id: "evidence", label: "Find supporting evidence" },
    { id: "related", label: "Suggest related topics in library" },
    { id: "prerequisites", label: "Identify missing prerequisites" },
    { id: "explain", label: "Generate a concise explanation" },
    { id: "outline", label: "Create a study outline" },
    { id: "questions", label: "Generate research questions" },
    { id: "experiments", label: "Suggest future experiments" }
  ];

  var DASHBOARD_LANES = [
    { id: "photography", label: "Photography Research", projects: ["photography", "scenes"] },
    { id: "cyber", label: "Cyber Research", projects: ["cybersecurity", "signalterrain"] },
    { id: "linux", label: "Linux Research", projects: ["linux"] },
    { id: "gis", label: "GIS Research", projects: ["gis", "fieldry"] },
    { id: "waypoint-studio", label: "Waypoint Studio", projects: ["waypoint-studio", "dashboard", "university"] },
    { id: "ecology", label: "Ecology", projects: ["ecology", "foraging", "foragecast"] },
    { id: "ai", label: "Artificial Intelligence", projects: ["waypoint-studio", "signalterrain", "scenes"] },
    { id: "tea", label: "Tea", projects: ["tea", "steepleaf"] },
    { id: "wine", label: "Wine", projects: ["wine", "savant"] }
  ];

  var _cache = { fp: null, related: Object.create(null), gaps: null, builtAt: 0 };
  var _prefs = { remoteAiEnabled: false, assistEnabled: true };

  function Schema() {
    return global.WU && global.WU.Schema;
  }
  function Search() {
    return global.WU && global.WU.Search;
  }
  function Learn() {
    return global.WU && global.WU.Learn;
  }

  function daysSince(iso) {
    if (!iso) return 9999;
    return (Date.now() - new Date(iso).getTime()) / 86400000;
  }

  function tokens(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9+#.\-_/]+/g, " ")
      .split(/\s+/)
      .filter(function (t) {
        return t.length >= 3;
      });
  }

  function fingerprint(graphIndex, meta) {
    meta = meta || {};
    return (
      ((graphIndex && graphIndex.nodeCount) || 0) +
      ":" +
      ((graphIndex && graphIndex.edges && graphIndex.edges.length) || 0) +
      ":" +
      (meta.lastWriteAt || "")
    );
  }

  function setPrefs(p) {
    _prefs = Object.assign({}, _prefs, p || {});
    return _prefs;
  }
  function getPrefs() {
    return Object.assign({}, _prefs);
  }

  function cite(node, confidence, why) {
    return {
      id: node.id,
      node: node,
      confidence: confidence,
      why: why
    };
  }

  function overlapScore(a, b) {
    var ta = tokens((a.title || "") + " " + (a.body || "") + " " + (a.tags || []).join(" "));
    var tb = tokens((b.title || "") + " " + (b.body || "") + " " + (b.tags || []).join(" "));
    if (!ta.length || !tb.length) return 0;
    var set = Object.create(null);
    tb.forEach(function (t) {
      set[t] = true;
    });
    var hit = 0;
    ta.forEach(function (t) {
      if (set[t]) hit++;
    });
    return hit / Math.sqrt(ta.length * tb.length);
  }

  /**
   * Related knowledge for an opened note — graph-first, then textual overlap.
   */
  function relatedFor(node, graphIndex, opts) {
    opts = opts || {};
    if (!node || !graphIndex) {
      return emptyRelated();
    }
    var fp = fingerprint(graphIndex, opts.meta);
    var key = fp + ":" + node.id;
    if (_cache.fp === fp && _cache.related[key]) return _cache.related[key];

    var buckets = {
      notes: [],
      projects: [],
      sessions: [],
      questions: [],
      sources: [],
      paths: [],
      recent: [],
      elapsedMs: 0
    };
    var t0 = Date.now();
    var seen = Object.create(null);
    seen[node.id] = true;

    function push(bucket, item) {
      if (!item || !item.node || seen[item.node.id]) return;
      seen[item.node.id] = true;
      buckets[bucket].push(item);
    }

    (graphIndex.adj[node.id] || []).forEach(function (e) {
      var o = graphIndex.nodeMap[e.otherId];
      if (!o) return;
      var why = "Linked as “" + (Schema().relationLabel(e.type) || e.type) + "”";
      var conf = CONFIDENCE.known.id;
      if (o.kind === "question") push("questions", cite(o, conf, why));
      else if (o.kind === "session") push("sessions", cite(o, conf, why));
      else if (o.kind === "path") push("paths", cite(o, conf, why));
      else if (Schema().isSourceKind(o.kind)) push("sources", cite(o, conf, why));
      else push("notes", cite(o, conf, why));
    });

    (node.projects || []).forEach(function (pid) {
      buckets.projects.push({
        id: pid,
        label: Schema().projectLabel(pid),
        confidence: CONFIDENCE.known.id,
        why: "Tagged on this item"
      });
      ((graphIndex.byProject && graphIndex.byProject[pid]) || []).forEach(function (id) {
        var o = graphIndex.nodeMap[id];
        if (!o || o.id === node.id) return;
        var why = "Same project lane: " + Schema().projectLabel(pid);
        var conf = CONFIDENCE.likely.id;
        if (o.kind === "session") push("sessions", cite(o, conf, why));
        else if (o.kind === "question") push("questions", cite(o, conf, why));
        else if (Schema().isSourceKind(o.kind)) push("sources", cite(o, conf, why));
        else if (o.kind === "path") push("paths", cite(o, conf, why));
        else push("notes", cite(o, conf, why));
      });
    });

    if (node.pathId && graphIndex.nodeMap[node.pathId]) {
      push(
        "paths",
        cite(graphIndex.nodeMap[node.pathId], CONFIDENCE.known.id, "Assigned learning path")
      );
    }

    // Textual overlap candidates (capped)
    var scores = [];
    Object.keys(graphIndex.nodeMap).forEach(function (id) {
      if (seen[id]) return;
      var o = graphIndex.nodeMap[id];
      if (o.kind === "path" || o.kind === "capture") return;
      var s = overlapScore(node, o);
      if (s >= 0.08) scores.push({ o: o, s: s });
    });
    scores
      .sort(function (a, b) {
        return b.s - a.s;
      })
      .slice(0, 12)
      .forEach(function (row) {
        var conf = row.s >= 0.18 ? CONFIDENCE.likely.id : CONFIDENCE.possible.id;
        var why = "Shared vocabulary (overlap " + row.s.toFixed(2) + ")";
        if (row.o.kind === "question") push("questions", cite(row.o, conf, why));
        else if (Schema().isSourceKind(row.o.kind)) push("sources", cite(row.o, conf, why));
        else if (row.o.kind === "session") push("sessions", cite(row.o, conf, why));
        else push("notes", cite(row.o, conf, why));
      });

    Object.keys(graphIndex.nodeMap).forEach(function (id) {
      var o = graphIndex.nodeMap[id];
      if (!o || o.id === node.id) return;
      if (daysSince(o.updatedAt) < 21 && overlapScore(node, o) >= 0.06) {
        push(
          "recent",
          cite(o, CONFIDENCE.possible.id, "Recently updated and lexically near this topic")
        );
      }
    });

    ["notes", "sessions", "questions", "sources", "paths", "recent"].forEach(function (k) {
      buckets[k] = buckets[k].slice(0, 10);
    });
    buckets.projects = buckets.projects.slice(0, 8);
    buckets.elapsedMs = Date.now() - t0;
    _cache.fp = fp;
    _cache.related[key] = buckets;
    return buckets;
  }

  function emptyRelated() {
    return {
      notes: [],
      projects: [],
      sessions: [],
      questions: [],
      sources: [],
      paths: [],
      recent: [],
      elapsedMs: 0
    };
  }

  function knowledgeGaps(graphIndex) {
    var fp = fingerprint(graphIndex, {});
    if (_cache.fp === fp && _cache.gaps) return _cache.gaps;
    var t0 = Date.now();
    var nodes = Object.keys(graphIndex.nodeMap).map(function (id) {
      return graphIndex.nodeMap[id];
    });
    var out = [];

    // Referenced titles / high degree with thin body
    var thinHubs = nodes
      .filter(function (n) {
        if (n.kind === "path" || n.kind === "capture") return false;
        var deg = (graphIndex.adj[n.id] || []).length;
        return deg >= 2 && String(n.body || "").trim().length < 60;
      })
      .map(function (n) {
        return {
          id: n.id,
          node: n,
          confidence: CONFIDENCE.likely.id,
          why: "Connected often but lightly documented — a definition would strengthen neighbors."
        };
      });
    if (thinHubs.length) {
      out.push({
        id: "thin-hubs",
        title: "Topics ready for deeper notes",
        blurb: "Opportunity to flesh out ideas your graph already relies on.",
        items: thinHubs.slice(0, 10)
      });
    }

    // Mentions without definitions
    var undef = [];
    nodes.forEach(function (n) {
      var mentions = (graphIndex.adj[n.id] || []).filter(function (e) {
        return e.type === "mentions" || e.type === "referenced-by" || e.type === "references";
      }).length;
      var hasDef = (graphIndex.adj[n.id] || []).some(function (e) {
        var o = graphIndex.nodeMap[e.otherId];
        return o && (o.kind === "definition" || e.type === "defines" || e.type === "defined-by");
      });
      if (mentions >= 2 && !hasDef && String(n.body || "").length < 80) {
        undef.push({
          id: n.id,
          node: n,
          confidence: CONFIDENCE.possible.id,
          why: "Referenced without a clear definition in your library."
        });
      }
    });
    if (undef.length) {
      out.push({
        id: "undefined-refs",
        title: "Ideas mentioned without definitions",
        blurb: "Naming these clearly will reduce ambiguity later.",
        items: undef.slice(0, 10)
      });
    }

    // Projects with few sources / questions
    Schema().PROJECTS.forEach(function (p) {
      var ids = (graphIndex.byProject && graphIndex.byProject[p.id]) || [];
      if (ids.length < 2) return;
      var items = ids.map(function (id) {
        return graphIndex.nodeMap[id];
      }).filter(Boolean);
      var sources = items.filter(function (n) {
        return Schema().isSourceKind(n.kind);
      }).length;
      var qs = items.filter(function (n) {
        return n.kind === "question";
      }).length;
      if (items.length >= 4 && sources === 0) {
        out.push({
          id: "project-sources-" + p.id,
          title: "Project lane needs sources: " + p.label,
          blurb: "Activity exists, but no source objects are tagged yet.",
          items: items.slice(0, 5).map(function (n) {
            return {
              id: n.id,
              node: n,
              confidence: CONFIDENCE.likely.id,
              why: "In " + p.label + " without supporting sources"
            };
          })
        });
      }
      if (qs >= 2) {
        var open = items.filter(function (n) {
          return (
            n.kind === "question" &&
            (!n.question || n.question.status === "open" || n.question.status === "investigating")
          );
        });
        if (open.length >= 2) {
          out.push({
            id: "project-questions-" + p.id,
            title: "Open questions clustering in " + p.label,
            blurb: "Several unresolved questions — good place for a research session.",
            items: open.slice(0, 6).map(function (n) {
              return {
                id: n.id,
                node: n,
                confidence: CONFIDENCE.known.id,
                why: "Open question in this lane"
              };
            })
          });
        }
      }
    });

    // Paths with few children
    nodes
      .filter(function (n) {
        return n.kind === "path";
      })
      .forEach(function (p) {
        var kids = (graphIndex.edges || []).filter(function (e) {
          return !e.broken && e.type === "part-of" && e.toId === p.id;
        }).length;
        if (kids < 2) {
          out.push({
            id: "path-thin-" + p.id,
            title: "Learning path needs foundations: " + p.title,
            blurb: "Add foundational concepts when you are ready — no rush.",
            items: [
              {
                id: p.id,
                node: p,
                confidence: CONFIDENCE.known.id,
                why: "Path has few linked entries"
              }
            ]
          });
        }
      });

    // Questions with little evidence text / links
    nodes
      .filter(function (n) {
        return n.kind === "question";
      })
      .forEach(function (n) {
        var st = (n.question && n.question.status) || "open";
        if (st !== "open" && st !== "investigating" && st !== "partial") return;
        var ev = (n.question && n.question.evidence) || "";
        var deg = (graphIndex.adj[n.id] || []).length;
        if (!ev && deg < 2) {
          out.push({
            id: "q-evidence-" + n.id,
            title: "Question needs evidence: " + n.title,
            blurb: "Link sources or capture evidence when you find it.",
            items: [
              {
                id: n.id,
                node: n,
                confidence: CONFIDENCE.known.id,
                why: "Open with little linked evidence yet"
              }
            ]
          });
        }
      });

    var result = { opportunities: out.slice(0, 16), elapsedMs: Date.now() - t0 };
    _cache.gaps = result;
    _cache.fp = fp;
    return result;
  }

  function companionHints(node, graphIndex) {
    if (!node || !graphIndex || !_prefs.assistEnabled) return [];
    var hints = [];
    var rel = relatedFor(node, graphIndex);
    var old = Object.keys(graphIndex.nodeMap)
      .map(function (id) {
        return graphIndex.nodeMap[id];
      })
      .filter(function (o) {
        return o.id !== node.id && daysSince(o.updatedAt) > 60 && overlapScore(node, o) >= 0.1;
      })
      .sort(function (a, b) {
        return daysSince(b.updatedAt) - daysSince(a.updatedAt);
      })
      .slice(0, 3);
    old.forEach(function (o) {
      var months = Math.max(1, Math.round(daysSince(o.updatedAt) / 30));
      hints.push({
        confidence: CONFIDENCE.possible.id,
        text:
          "You have a note from about " +
          months +
          " month(s) ago related to this: “" +
          o.title +
          "”.",
        nodeId: o.id,
        why: "Lexical overlap with an older item"
      });
    });
    rel.projects.slice(0, 2).forEach(function (p) {
      if (p.why && p.why.indexOf("Tagged") === 0) return;
      hints.push({
        confidence: p.confidence,
        text: "This sits near your " + p.label + " work.",
        projectId: p.id,
        why: p.why
      });
    });
    rel.questions.slice(0, 2).forEach(function (q) {
      var st = (q.node.question && q.node.question.status) || "open";
      if (st === "answered") {
        hints.push({
          confidence: CONFIDENCE.likely.id,
          text: "A related question may already be answerable: “" + q.node.title + "”.",
          nodeId: q.id,
          why: q.why
        });
      } else {
        hints.push({
          confidence: q.confidence,
          text: "Open question nearby: “" + q.node.title + "”.",
          nodeId: q.id,
          why: q.why
        });
      }
    });
    if (daysSince(node.lastOpenedAt || node.updatedAt) > 400) {
      hints.push({
        confidence: CONFIDENCE.known.id,
        text: "This note has not been reviewed in a long time — rediscovery opportunity.",
        nodeId: node.id,
        why: "Stale open/update timestamp"
      });
    }
    return hints.slice(0, 5);
  }

  function memoryHints(graphIndex, focusNode) {
    var hints = companionHints(focusNode, graphIndex);
    Object.keys(graphIndex.nodeMap).forEach(function (id) {
      var n = graphIndex.nodeMap[id];
      if (n.kind !== "question") return;
      var st = (n.question && n.question.status) || "open";
      if (st !== "open" && st !== "investigating") return;
      if (focusNode && overlapScore(focusNode, n) >= 0.12) {
        hints.push({
          confidence: CONFIDENCE.possible.id,
          text: "Unanswered question may relate to today’s work: “" + n.title + "”.",
          nodeId: n.id,
          why: "Overlap with current focus"
        });
      }
    });
    return hints.slice(0, 8);
  }

  function summarizeLocal(node) {
    if (!node) {
      return {
        confidence: CONFIDENCE.unknown.id,
        text: "No note selected.",
        citations: []
      };
    }
    var body = String(node.body || "").trim();
    if (!body) {
      return {
        confidence: CONFIDENCE.known.id,
        text: "“" + node.title + "” has no body yet.",
        citations: [cite(node, CONFIDENCE.known.id, "Selected note")]
      };
    }
    var lines = body.split(/\n/).map(function (l) {
      return l.replace(/^#+\s*/, "").replace(/^[-*]\s+/, "").trim();
    }).filter(Boolean);
    var picks = [];
    lines.forEach(function (l) {
      if (picks.length >= 5) return;
      if (l.length < 24) return;
      picks.push(l.length > 180 ? l.slice(0, 177) + "…" : l);
    });
    if (!picks.length) picks = [body.slice(0, 240) + (body.length > 240 ? "…" : "")];
    return {
      confidence: CONFIDENCE.known.id,
      text: "Extractive summary of “" + node.title + "” (from your text only):\n\n- " + picks.join("\n- "),
      citations: [cite(node, CONFIDENCE.known.id, "Source note body")],
      note: "This is extractive, not generative. Remote AI is " + (_prefs.remoteAiEnabled ? "enabled" : "disabled") + "."
    };
  }

  function conciseExplanation(node, graphIndex) {
    var sum = summarizeLocal(node);
    var rel = relatedFor(node, graphIndex);
    var extras = [];
    if (rel.projects.length) {
      extras.push(
        "Appears in: " +
          rel.projects
            .slice(0, 3)
            .map(function (p) {
              return p.label;
            })
            .join(", ")
      );
    }
    if (rel.notes.length) {
      extras.push("Connected to " + rel.notes.length + " nearby notes in your library.");
    }
    return {
      confidence: CONFIDENCE.known.id,
      text: sum.text + (extras.length ? "\n\nContext from your graph:\n- " + extras.join("\n- ") : ""),
      citations: sum.citations.concat(rel.notes.slice(0, 3))
    };
  }

  function studyOutline(node, graphIndex) {
    var rel = relatedFor(node, graphIndex);
    var lines = ["# Study outline: " + node.title, "", "## 1. Core idea", "- Re-read the note body", ""];
    if (rel.paths.length) {
      lines.push("## 2. Learning path");
      rel.paths.forEach(function (p) {
        lines.push("- " + p.node.title + " (" + p.confidence + ")");
      });
      lines.push("");
    }
    lines.push("## 3. Related library notes");
    (rel.notes.length ? rel.notes : []).slice(0, 6).forEach(function (n) {
      lines.push("- " + n.node.title + " — " + n.why);
    });
    if (!rel.notes.length) lines.push("- (None linked yet)");
    lines.push("", "## 4. Questions to resolve");
    (rel.questions.length ? rel.questions : []).slice(0, 5).forEach(function (q) {
      lines.push("- " + q.node.title);
    });
    if (!rel.questions.length) lines.push("- Capture one open question");
    lines.push("", "## 5. Sources", "");
    (rel.sources.length ? rel.sources : []).slice(0, 5).forEach(function (s) {
      lines.push("- " + s.node.title);
    });
    if (!rel.sources.length) lines.push("- Add at least one source when ready");
    return {
      confidence: CONFIDENCE.likely.id,
      text: lines.join("\n"),
      citations: rel.notes.concat(rel.questions, rel.sources, rel.paths).slice(0, 12),
      note: "Outline structure is heuristic; content titles come from your library."
    };
  }

  function generateQuestions(node, graphIndex) {
    var rel = relatedFor(node, graphIndex);
    var qs = [
      "What would change if “" + node.title + "” were wrong?",
      "What evidence would increase confidence in “" + node.title + "”?",
      "Which prerequisite is still fuzzy for “" + node.title + "”?"
    ];
    rel.projects.slice(0, 2).forEach(function (p) {
      qs.push("How does “" + node.title + "” affect " + p.label + "?");
    });
    return {
      confidence: CONFIDENCE.possible.id,
      text:
        "Suggested research questions (not answers — prompts only):\n\n- " +
        qs.join("\n- ") +
        (rel.questions.length
          ? "\n\nAlready in your library:\n- " +
            rel.questions
              .slice(0, 4)
              .map(function (q) {
                return q.node.title;
              })
              .join("\n- ")
          : ""),
      citations: rel.questions.slice(0, 6).concat([cite(node, CONFIDENCE.known.id, "Focus note")]),
      note: "Prompts are generated locally from titles/projects. They are Possible, not Known findings."
    };
  }

  function suggestExperiments(node, graphIndex) {
    var rel = relatedFor(node, graphIndex);
    var lines = [
      "Try a small, reversible test related to “" + node.title + "”.",
      "Write a one-paragraph prediction, then compare with a source you trust.",
      "Link one contradicting viewpoint if you can find it."
    ];
    return {
      confidence: CONFIDENCE.possible.id,
      text: "Experiment prompts (Possible):\n\n- " + lines.join("\n- "),
      citations: [cite(node, CONFIDENCE.known.id, "Focus note")].concat(rel.sources.slice(0, 3)),
      note: "Not experimental results — prompts only."
    };
  }

  function findContradictions(node, graphIndex) {
    var hits = [];
    var neg = /\b(not|never|contradict|unlike|however|instead|vs\.?|versus|disagree)\b/i;
    (graphIndex.adj[node.id] || []).forEach(function (e) {
      if (e.type === "contradicts" || e.type === "contradicted-by") {
        var o = graphIndex.nodeMap[e.otherId];
        if (o) {
          hits.push(cite(o, CONFIDENCE.known.id, "Explicit “" + Schema().relationLabel(e.type) + "” link"));
        }
      }
    });
    Object.keys(graphIndex.nodeMap).forEach(function (id) {
      if (id === node.id) return;
      var o = graphIndex.nodeMap[id];
      if (overlapScore(node, o) < 0.12) return;
      if (neg.test(o.body || "") && neg.test(node.body || "")) {
        hits.push(
          cite(o, CONFIDENCE.possible.id, "Shared topic vocabulary and contrastive language in bodies")
        );
      }
    });
    // unique
    var seen = Object.create(null);
    hits = hits.filter(function (h) {
      if (seen[h.id]) return false;
      seen[h.id] = true;
      return true;
    }).slice(0, 10);
    return {
      confidence: hits.length ? CONFIDENCE.likely.id : CONFIDENCE.unknown.id,
      text: hits.length
        ? "Possible tensions grounded in your library:\n\n" +
          hits
            .map(function (h) {
              return "- [" + h.confidence + "] " + h.node.title + " — " + h.why;
            })
            .join("\n")
        : "No contradictions found in linked relations or contrastive wording. That is Unknown, not proof of consistency.",
      citations: hits
    };
  }

  function findEvidence(node, graphIndex) {
    var rel = relatedFor(node, graphIndex);
    var cites = rel.sources.concat(
      rel.notes.filter(function (n) {
        return (graphIndex.adj[node.id] || []).some(function (e) {
          return e.otherId === n.id && (e.type === "evidence-for" || e.type === "has-evidence" || e.type === "references");
        });
      })
    );
    return {
      confidence: cites.length ? CONFIDENCE.known.id : CONFIDENCE.unknown.id,
      text: cites.length
        ? "Supporting material already in your library:\n\n" +
          cites
            .slice(0, 10)
            .map(function (c) {
              return "- " + c.node.title + " — " + c.why + " [" + c.confidence + "]";
            })
            .join("\n")
        : "No linked sources/evidence objects found for this note yet (Unknown in-library).",
      citations: cites.slice(0, 10)
    };
  }

  function missingPrereqs(node, graphIndex) {
    var items = [];
    (graphIndex.adj[node.id] || []).forEach(function (e) {
      if (e.type !== "learn-before" || !e.outbound) return;
      var pre = graphIndex.nodeMap[e.otherId];
      if (!pre) return;
      if (String(pre.body || "").trim().length < 50) {
        items.push(cite(pre, CONFIDENCE.likely.id, "Marked prerequisite but thinly documented"));
      } else {
        items.push(cite(pre, CONFIDENCE.known.id, "Prerequisite link"));
      }
    });
    return {
      confidence: items.length ? CONFIDENCE.known.id : CONFIDENCE.unknown.id,
      text: items.length
        ? items
            .map(function (i) {
              return "- " + i.node.title + " — " + i.why + " [" + i.confidence + "]";
            })
            .join("\n")
        : "No prerequisite links found. Consider adding “Prerequisites” links if needed.",
      citations: items
    };
  }

  function compareNotes(nodes, graphIndex) {
    nodes = (nodes || []).filter(Boolean);
    if (nodes.length < 2) {
      return {
        confidence: CONFIDENCE.unknown.id,
        text: "Select at least two notes to compare.",
        citations: []
      };
    }
    var sharedTags = {};
    var sharedProjects = {};
    nodes.forEach(function (n) {
      (n.tags || []).forEach(function (t) {
        sharedTags[t] = (sharedTags[t] || 0) + 1;
      });
      (n.projects || []).forEach(function (p) {
        sharedProjects[p] = (sharedProjects[p] || 0) + 1;
      });
    });
    var commonTags = Object.keys(sharedTags).filter(function (t) {
      return sharedTags[t] >= 2;
    });
    var commonProjects = Object.keys(sharedProjects).filter(function (p) {
      return sharedProjects[p] >= 2;
    });
    var pairs = [];
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        pairs.push({
          a: nodes[i],
          b: nodes[j],
          score: overlapScore(nodes[i], nodes[j])
        });
      }
    }
    var conflicts = [];
    pairs.forEach(function (p) {
      var c = findContradictions(p.a, graphIndex);
      c.citations.forEach(function (x) {
        if (x.id === p.b.id) conflicts.push(p.a.title + " ↔ " + p.b.title + " (" + x.why + ")");
      });
    });
    var sources = [];
    nodes.forEach(function (n) {
      (graphIndex.adj[n.id] || []).forEach(function (e) {
        var o = graphIndex.nodeMap[e.otherId];
        if (o && Schema().isSourceKind(o.kind)) sources.push(o.title);
      });
    });
    var uniqSources = sources.filter(function (t, idx) {
      return sources.indexOf(t) === idx;
    });
    var uniqueObs = nodes.map(function (n) {
      return {
        title: n.title,
        aloneTags: (n.tags || []).filter(function (t) {
          return sharedTags[t] === 1;
        })
      };
    });
    var dupes = pairs
      .filter(function (p) {
        return p.score >= 0.35 || String(p.a.title).toLowerCase() === String(p.b.title).toLowerCase();
      })
      .map(function (p) {
        return p.a.title + " ≈ " + p.b.title + " (overlap " + p.score.toFixed(2) + ")";
      });

    var text = [
      "## Comparison (" + nodes.length + " notes)",
      "",
      "### Shared concepts / tags [known/likely]",
      commonTags.length ? "- " + commonTags.join(", ") : "- None shared",
      "",
      "### Shared projects [known]",
      commonProjects.length
        ? "- " +
          commonProjects
            .map(function (p) {
              return Schema().projectLabel(p);
            })
            .join(", ")
        : "- None shared",
      "",
      "### Shared / neighboring sources [known]",
      uniqSources.length ? "- " + uniqSources.slice(0, 12).join("\n- ") : "- None linked",
      "",
      "### Conflicting signals [possible]",
      conflicts.length ? "- " + conflicts.join("\n- ") : "- None detected in links/wording",
      "",
      "### Unique observations",
      uniqueObs
        .map(function (u) {
          return "- " + u.title + (u.aloneTags.length ? " — tags: " + u.aloneTags.join(", ") : "");
        })
        .join("\n"),
      "",
      "### Potential duplicates [possible]",
      dupes.length ? "- " + dupes.join("\n- ") : "- None flagged"
    ].join("\n");

    return {
      confidence: CONFIDENCE.likely.id,
      text: text,
      citations: nodes.map(function (n) {
        return cite(n, CONFIDENCE.known.id, "Compared note");
      })
    };
  }

  function synthesizeSources(nodes) {
    nodes = (nodes || []).filter(function (n) {
      return n && Schema().isSourceKind(n.kind);
    });
    if (nodes.length < 2) {
      return {
        confidence: CONFIDENCE.unknown.id,
        text: "Select at least two sources.",
        citations: []
      };
    }
    var agrees = [];
    var disagrees = [];
    var thin = [];
    var openQs = [];
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var s = overlapScore(nodes[i], nodes[j]);
        if (s >= 0.15) agrees.push(nodes[i].title + " ↔ " + nodes[j].title + " (overlap " + s.toFixed(2) + ")");
        var bi = (nodes[i].reliability && nodes[i].reliability.conflicts) || "";
        var bj = (nodes[j].reliability && nodes[j].reliability.conflicts) || "";
        if (bi || bj) disagrees.push(nodes[i].title + " / " + nodes[j].title + " — owner noted conflicts");
      }
      if (!String(nodes[i].body || "").trim() && !(nodes[i].reliability && nodes[i].reliability.evidence)) {
        thin.push(nodes[i].title);
      }
    }
    return {
      confidence: CONFIDENCE.likely.id,
      text: [
        "## Source synthesis",
        "",
        "### Where sources may agree [likely]",
        agrees.length ? "- " + agrees.join("\n- ") : "- Little lexical overlap",
        "",
        "### Disagreement / conflict notes [known if you recorded them]",
        disagrees.length ? "- " + disagrees.join("\n- ") : "- No conflict notes on reliability fields",
        "",
        "### Claims with little local notes [possible gap]",
        thin.length ? "- " + thin.join("\n- ") : "- All selected sources have some notes",
        "",
        "_Nuance preserved: overlap ≠ agreement. Reliability scores are your assessments, not truth._"
      ].join("\n"),
      citations: nodes.map(function (n) {
        return cite(n, CONFIDENCE.known.id, "Selected source");
      })
    };
  }

  function researchDashboard(laneId, graphIndex) {
    var lane = null;
    DASHBOARD_LANES.forEach(function (l) {
      if (l.id === laneId) lane = l;
    });
    if (!lane) lane = DASHBOARD_LANES[0];
    var items = [];
    var seen = Object.create(null);
    (lane.projects || []).forEach(function (pid) {
      ((graphIndex.byProject && graphIndex.byProject[pid]) || []).forEach(function (id) {
        if (seen[id]) return;
        seen[id] = true;
        var n = graphIndex.nodeMap[id];
        if (n) items.push(n);
      });
    });
    items.sort(function (a, b) {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
    return {
      lane: lane,
      activity: items.slice(0, 8),
      discoveries: items.filter(function (n) {
        return daysSince(n.createdAt) < 30;
      }).slice(0, 6),
      questions: items.filter(function (n) {
        return (
          n.kind === "question" &&
          (!n.question || n.question.status === "open" || n.question.status === "investigating")
        );
      }).slice(0, 8),
      sessions: items.filter(function (n) {
        return n.kind === "session";
      }).slice(0, 6),
      projects: (lane.projects || []).map(function (pid) {
        return { id: pid, label: Schema().projectLabel(pid) };
      }),
      reading: items.filter(function (n) {
        return Schema().isSourceKind(n.kind) && n.source && (n.source.readingStatus === "reading" || (n.queue && n.queue.reading));
      }).slice(0, 6)
    };
  }

  function naturalSearch(query, searchIndex, graphIndex) {
    var q = String(query || "").trim();
    var reasonsBase = [];
    var kind = null;
    var requireAll = null;
    var lower = q.toLowerCase();

    if (/^show everything related to\s+/i.test(q)) {
      q = q.replace(/^show everything related to\s+/i, "");
      reasonsBase.push("Interpreted as relatedness query");
    }
    if (/unresolved questions?/i.test(lower) || /open questions?/i.test(lower)) {
      kind = "question";
      reasonsBase.push("Filtered to questions");
      q = q.replace(/unresolved questions? about/gi, "").replace(/open questions? about/gi, "").replace(/show/gi, "").trim();
    }
    if (/research sessions?/i.test(lower)) {
      kind = "session";
      reasonsBase.push("Filtered to research sessions");
      q = q.replace(/research sessions? involving/gi, "").replace(/find/gi, "").trim();
    }
    var both = lower.match(/mentions? both\s+(.+)\s+and\s+(.+)/i);
    if (both) {
      requireAll = [both[1].trim(), both[2].trim()];
      reasonsBase.push("Requires both terms");
      q = requireAll.join(" ");
    }

    var hits = Search().search(searchIndex, q, { limit: 40, kind: kind });
    if (requireAll) {
      hits = hits.filter(function (h) {
        var blob = ((h.node.title || "") + " " + (h.node.body || "") + " " + (h.node.tags || []).join(" ")).toLowerCase();
        return requireAll.every(function (term) {
          return blob.indexOf(term.toLowerCase()) >= 0;
        });
      });
    }
    // Enrich with relatedness for "related to X"
    if (/related/i.test(lower) && hits[0] && graphIndex) {
      var extra = Search().relatedToResults(graphIndex, hits, 10);
      hits = hits.concat(extra);
    }
    return hits.map(function (h) {
      return {
        id: h.id,
        node: h.node,
        score: h.score,
        reasons: (h.reasons || []).concat(reasonsBase).slice(0, 6),
        confidence: CONFIDENCE.known.id
      };
    });
  }

  function runAction(actionId, ctx) {
    ctx = ctx || {};
    if (!_prefs.assistEnabled) {
      return {
        confidence: CONFIDENCE.unknown.id,
        text: "Research assistant is disabled in Settings.",
        citations: []
      };
    }
    // Remote AI is a future hook only. Module 6 never transmits content.
    // Local actions always run on-device even if the remote toggle is on.
    var node = ctx.node;
    var graphIndex = ctx.graphIndex;
    var nodes = ctx.nodes || (node ? [node] : []);
    var result;
    switch (actionId) {
      case "summarize":
        result = summarizeLocal(node);
        break;
      case "compare":
        result = compareNotes(nodes, graphIndex);
        break;
      case "contradictions":
        result = findContradictions(node, graphIndex);
        break;
      case "evidence":
        result = findEvidence(node, graphIndex);
        break;
      case "related":
        result = {
          confidence: CONFIDENCE.likely.id,
          text: formatRelated(relatedFor(node, graphIndex)),
          citations: flattenRelated(relatedFor(node, graphIndex))
        };
        break;
      case "prerequisites":
        result = missingPrereqs(node, graphIndex);
        break;
      case "explain":
        result = conciseExplanation(node, graphIndex);
        break;
      case "outline":
        result = studyOutline(node, graphIndex);
        break;
      case "questions":
        result = generateQuestions(node, graphIndex);
        break;
      case "experiments":
        result = suggestExperiments(node, graphIndex);
        break;
      default:
        result = {
          confidence: CONFIDENCE.unknown.id,
          text: "Unknown action.",
          citations: []
        };
    }
    result.privacy = "local-only";
    if (_prefs.remoteAiEnabled) {
      result.privacy =
        "local-only; remote AI toggle is on but no provider is configured — nothing was sent off-device";
    }
    return result;
  }

  function formatRelated(rel) {
    function block(title, arr) {
      if (!arr.length) return "";
      return (
        "### " +
        title +
        "\n" +
        arr
          .map(function (x) {
            var name = x.node ? x.node.title : x.label;
            return "- " + name + " — " + x.why + " [" + x.confidence + "]";
          })
          .join("\n") +
        "\n"
      );
    }
    return (
      "## Related knowledge (from your library)\n\n" +
      block("Notes", rel.notes) +
      block("Projects", rel.projects) +
      block("Sessions", rel.sessions) +
      block("Questions", rel.questions) +
      block("Sources", rel.sources) +
      block("Paths", rel.paths) +
      block("Recently near", rel.recent)
    );
  }

  function flattenRelated(rel) {
    return []
      .concat(rel.notes, rel.sessions, rel.questions, rel.sources, rel.paths, rel.recent)
      .slice(0, 20);
  }

  function invalidate() {
    _cache = { fp: null, related: Object.create(null), gaps: null, builtAt: 0 };
  }

  global.WU = global.WU || {};
  global.WU.Assist = {
    CONFIDENCE: CONFIDENCE,
    ACTIONS: ACTIONS,
    DASHBOARD_LANES: DASHBOARD_LANES,
    relatedFor: relatedFor,
    knowledgeGaps: knowledgeGaps,
    companionHints: companionHints,
    memoryHints: memoryHints,
    summarizeLocal: summarizeLocal,
    compareNotes: compareNotes,
    synthesizeSources: synthesizeSources,
    researchDashboard: researchDashboard,
    naturalSearch: naturalSearch,
    runAction: runAction,
    getPrefs: getPrefs,
    setPrefs: setPrefs,
    invalidate: invalidate
  };
})(typeof window !== "undefined" ? window : globalThis);
