/**
 * Global Signals — Explain This
 * Structured question → entity matching + relationship traversal.
 * No AI / LLM. Answers only from graph + linked records.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var CONFIDENCE_RANK = {
    Unknown: 0,
    Low: 1,
    Medium: 2,
    High: 3,
    Observed: 4
  };

  var HORIZON_RANK = {
    Unknown: 0,
    Immediate: 1,
    Days: 2,
    Weeks: 3,
    Months: 4,
    "Long-term": 5
  };

  var TYPE_LABELS = {
    country: "Country",
    industry: "Industry",
    commodity: "Commodity",
    port: "Port",
    company: "Company",
    conflict: "Conflict",
    tariff: "Tariff",
    policy: "Policy",
    weather: "Weather Event"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeConfidence(value, opts) {
    opts = opts || {};
    if (value == null || value === "") return "Unknown";
    var lower = String(value).trim().toLowerCase();
    if (lower === "moderate") return "Medium";
    if (lower === "speculative") return "Low";
    var mapped = {
      observed: "Observed",
      high: "High",
      medium: "Medium",
      low: "Low",
      unknown: "Unknown"
    };
    var out = mapped[lower];
    if (!out) return "Unknown";
    if (opts.predicted && out === "Observed") return "Unknown";
    return out;
  }

  function normalizeTimeHorizon(value) {
    if (value == null || value === "") return "Unknown";
    var lower = String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");
    if (lower === "long term") return "Long-term";
    var mapped = {
      immediate: "Immediate",
      days: "Days",
      day: "Days",
      weeks: "Weeks",
      week: "Weeks",
      months: "Months",
      month: "Months",
      "long-term": "Long-term",
      longterm: "Long-term"
    };
    return mapped[lower] || "Unknown";
  }

  function typeLabel(type) {
    var key = String(type || "")
      .trim()
      .toLowerCase();
    if (key === "weather_event" || key === "weather-event") key = "weather";
    return TYPE_LABELS[key] || (key ? key : "Unknown");
  }

  function isSafeHttpUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
      var u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function normalizeQuery(q) {
    return String(q || "")
      .toLowerCase()
      .replace(/[^\w\s/-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeEvidence(raw) {
    if (!raw || typeof raw !== "object") {
      return {
        kind: "unavailable",
        label: "Evidence unavailable",
        url: null,
        notes: ""
      };
    }
    return {
      kind: String(raw.kind || raw.mode || "sample-demo").trim() || "sample-demo",
      label: String(raw.label || raw.title || "").trim() || "Evidence label unavailable",
      url: raw.url || null,
      notes: String(raw.notes || "").trim()
    };
  }

  function normalizeEntity(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    if (!id) return null;
    var type = String(raw.type || "")
      .trim()
      .toLowerCase();
    if (type === "weather_event" || type === "weather-event") type = "weather";
    return {
      id: id,
      type: type || "unknown",
      label: String(raw.label || "").trim() || "Untitled entity",
      summary: String(raw.summary || "").trim(),
      selectable: Boolean(raw.selectable),
      provenance: raw.provenance || null
    };
  }

  function normalizeRelationship(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var from = String(raw.from || "").trim();
    var to = String(raw.to || "").trim();
    if (!id || !from || !to) return null;
    return {
      id: id,
      from: from,
      to: to,
      relationType: String(raw.relationType || raw.type || "affects").trim() || "affects",
      why: String(raw.why || raw.explanation || "").trim(),
      confidence: normalizeConfidence(raw.confidence, { predicted: true }),
      timeHorizon: normalizeTimeHorizon(raw.timeHorizon || raw.timeframe || raw.timeDelay),
      evidence: normalizeEvidence(raw.evidence || raw.sources),
      provenance: raw.provenance || null
    };
  }

  function normalizeCascade(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var rootId = String(raw.rootId || raw.root || "").trim();
    if (!id || !rootId) return null;
    var edgeIds = Array.isArray(raw.edgeIds)
      ? raw.edgeIds
          .map(function (e) {
            return String(e || "").trim();
          })
          .filter(Boolean)
      : [];
    return {
      id: id,
      rootId: rootId,
      title: String(raw.title || "").trim(),
      summary: String(raw.summary || "").trim(),
      edgeIds: edgeIds,
      provenance: raw.provenance || null
    };
  }

  function normalizeGraph(data) {
    data = data || {};
    var entities = (data.entities || []).map(normalizeEntity).filter(Boolean);
    var relationships = (data.relationships || []).map(normalizeRelationship).filter(Boolean);
    var cascades = (data.cascades || []).map(normalizeCascade).filter(Boolean);
    var entityById = {};
    entities.forEach(function (e) {
      entityById[e.id] = e;
    });
    var relationshipById = {};
    var outEdges = {};
    relationships.forEach(function (r) {
      relationshipById[r.id] = r;
      if (!outEdges[r.from]) outEdges[r.from] = [];
      outEdges[r.from].push(r);
    });
    var cascadeById = {};
    cascades.forEach(function (c) {
      cascadeById[c.id] = c;
    });
    return {
      version: data.version || null,
      mode: data.mode || null,
      modeLabel: data.modeLabel || null,
      honesty: data.honesty || null,
      entities: entities,
      relationships: relationships,
      cascades: cascades,
      entityById: entityById,
      relationshipById: relationshipById,
      cascadeById: cascadeById,
      outEdges: outEdges,
      extensions: data.extensions || null
    };
  }

  function normalizeSeeds(raw) {
    raw = raw || {};
    return {
      version: raw.version || null,
      mode: raw.mode || "sample-demo",
      modeLabel: raw.modeLabel || null,
      honesty: raw.honesty || null,
      examplePrompts: Array.isArray(raw.examplePrompts) ? raw.examplePrompts.slice() : [],
      questions: Array.isArray(raw.questions) ? raw.questions : [],
      entityAliases: raw.entityAliases && typeof raw.entityAliases === "object" ? raw.entityAliases : {},
      entityCrosswalk:
        raw.entityCrosswalk && typeof raw.entityCrosswalk === "object" ? raw.entityCrosswalk : {},
      routes: raw.routes || {}
    };
  }

  function indexLinked(bundle) {
    var industries = Array.isArray(bundle.industries && bundle.industries.industries)
      ? bundle.industries.industries
      : [];
    var countries = Array.isArray(bundle.countries && bundle.countries.countries)
      ? bundle.countries.countries
      : [];
    var articles = Array.isArray(bundle.articles && bundle.articles.articles)
      ? bundle.articles.articles
      : [];
    var citizen = bundle.citizenImpact || {};
    var sections = Array.isArray(citizen.sections) ? citizen.sections : [];

    var industryById = {};
    industries.forEach(function (i) {
      if (i && i.id) industryById[i.id] = i;
    });
    var countryById = {};
    var countryBySlug = {};
    countries.forEach(function (c) {
      if (!c) return;
      if (c.id) countryById[c.id] = c;
      if (c.slug) countryBySlug[c.slug] = c;
    });
    var articleById = {};
    articles.forEach(function (a) {
      if (a && a.id) articleById[a.id] = a;
    });
    var sectionById = {};
    sections.forEach(function (s) {
      if (s && s.id) sectionById[s.id] = s;
    });

    return {
      industryById: industryById,
      countryById: countryById,
      countryBySlug: countryBySlug,
      articleById: articleById,
      sectionById: sectionById,
      industries: industries,
      countries: countries,
      articles: articles,
      sections: sections
    };
  }

  /**
   * Structured matcher — curated prompts, then keywords, then aliases/labels.
   * Never invents seeds.
   */
  function matchQuestion(query, seeds, graph) {
    var q = normalizeQuery(query);
    var empty = {
      status: "no-match",
      query: query,
      normalizedQuery: q,
      questionId: null,
      seedEntityIds: [],
      preferredCascadeId: null,
      matchKind: null,
      linkedIndustryIds: [],
      linkedCountryIds: [],
      linkedCitizenSections: [],
      linkedArticleIds: []
    };
    if (!q) {
      empty.status = "empty-query";
      return empty;
    }

    seeds = seeds || normalizeSeeds({});
    graph = graph || normalizeGraph({});

    // 1) Exact curated prompt match
    for (var i = 0; i < seeds.questions.length; i++) {
      var qd = seeds.questions[i];
      var prompts = qd.prompts || [];
      for (var p = 0; p < prompts.length; p++) {
        if (normalizeQuery(prompts[p]) === q) {
          return {
            status: "matched",
            query: query,
            normalizedQuery: q,
            questionId: qd.id,
            seedEntityIds: (qd.seedEntityIds || []).slice(),
            preferredCascadeId: qd.preferredCascadeId || null,
            matchKind: "curated-prompt",
            linkedIndustryIds: (qd.linkedIndustryIds || []).slice(),
            linkedCountryIds: (qd.linkedCountryIds || []).slice(),
            linkedCitizenSections: (qd.linkedCitizenSections || []).slice(),
            linkedArticleIds: (qd.linkedArticleIds || []).slice()
          };
        }
      }
    }

    // 2) Keyword hit on curated questions (longest keyword first)
    var keywordHits = [];
    for (var k = 0; k < seeds.questions.length; k++) {
      var qk = seeds.questions[k];
      var kws = qk.keywords || [];
      for (var w = 0; w < kws.length; w++) {
        var kw = normalizeQuery(kws[w]);
        if (kw && q.indexOf(kw) !== -1) {
          keywordHits.push({ question: qk, keyword: kw, len: kw.length });
        }
      }
    }
    keywordHits.sort(function (a, b) {
      return b.len - a.len;
    });
    if (keywordHits.length) {
      var hit = keywordHits[0].question;
      return {
        status: "matched",
        query: query,
        normalizedQuery: q,
        questionId: hit.id,
        seedEntityIds: (hit.seedEntityIds || []).slice(),
        preferredCascadeId: hit.preferredCascadeId || null,
        matchKind: "keyword",
        matchedKeyword: keywordHits[0].keyword,
        linkedIndustryIds: (hit.linkedIndustryIds || []).slice(),
        linkedCountryIds: (hit.linkedCountryIds || []).slice(),
        linkedCitizenSections: (hit.linkedCitizenSections || []).slice(),
        linkedArticleIds: (hit.linkedArticleIds || []).slice()
      };
    }

    // 3) Alias map (longest alias first)
    var aliases = Object.keys(seeds.entityAliases || {}).sort(function (a, b) {
      return b.length - a.length;
    });
    for (var a = 0; a < aliases.length; a++) {
      var alias = normalizeQuery(aliases[a]);
      if (alias && q.indexOf(alias) !== -1) {
        var eid = seeds.entityAliases[aliases[a]];
        if (graph.entityById[eid]) {
          var xw = seeds.entityCrosswalk[eid] || {};
          return {
            status: "matched",
            query: query,
            normalizedQuery: q,
            questionId: null,
            seedEntityIds: [eid],
            preferredCascadeId: null,
            matchKind: "alias",
            matchedAlias: aliases[a],
            linkedIndustryIds: (xw.industryIds || []).slice(),
            linkedCountryIds: (xw.countryIds || []).slice(),
            linkedCitizenSections: (xw.citizenSections || []).slice(),
            linkedArticleIds: (xw.articleIds || []).slice()
          };
        }
      }
    }

    // 4) Entity label contains match
    var labelHits = [];
    for (var e = 0; e < graph.entities.length; e++) {
      var ent = graph.entities[e];
      var label = normalizeQuery(ent.label);
      if (label.length >= 4 && (q.indexOf(label) !== -1 || label.indexOf(q) !== -1)) {
        labelHits.push(ent);
      }
    }
    if (labelHits.length === 1) {
      var le = labelHits[0];
      var lx = seeds.entityCrosswalk[le.id] || {};
      return {
        status: "matched",
        query: query,
        normalizedQuery: q,
        questionId: null,
        seedEntityIds: [le.id],
        preferredCascadeId: null,
        matchKind: "entity-label",
        linkedIndustryIds: (lx.industryIds || []).slice(),
        linkedCountryIds: (lx.countryIds || []).slice(),
        linkedCitizenSections: (lx.citizenSections || []).slice(),
        linkedArticleIds: (lx.articleIds || []).slice()
      };
    }

    return empty;
  }

  function findCascadeForRoot(graph, rootId) {
    if (!graph || !rootId) return null;
    for (var i = 0; i < graph.cascades.length; i++) {
      if (graph.cascades[i].rootId === rootId) return graph.cascades[i];
    }
    return null;
  }

  function buildStepsFromCascade(graph, cascade) {
    if (!graph || !cascade) return { steps: [], edgeIds: [], missingEdges: [] };
    var steps = [];
    var missingEdges = [];
    var root = graph.entityById[cascade.rootId];
    if (!root) return { steps: [], edgeIds: [], missingEdges: ["missing-root"] };
    steps.push({ kind: "root", entity: root, relationship: null });
    for (var i = 0; i < cascade.edgeIds.length; i++) {
      var rel = graph.relationshipById[cascade.edgeIds[i]];
      if (!rel) {
        missingEdges.push(cascade.edgeIds[i]);
        continue;
      }
      var target = graph.entityById[rel.to];
      if (!target) {
        missingEdges.push(cascade.edgeIds[i] + ":missing-to");
        continue;
      }
      steps.push({ kind: "edge", entity: target, relationship: rel });
    }
    return { steps: steps, edgeIds: cascade.edgeIds.slice(), missingEdges: missingEdges, cascade: cascade };
  }

  /**
   * BFS forward traversal — only existing edges. No invention.
   */
  function traverseForward(graph, seedId, maxDepth) {
    maxDepth = maxDepth == null ? 4 : maxDepth;
    var root = graph.entityById[seedId];
    if (!root) return { steps: [], edgeIds: [], pathFound: false };
    var queue = [{ id: seedId, depth: 0, pathEdges: [] }];
    var visited = {};
    visited[seedId] = true;
    var best = null;
    while (queue.length) {
      var cur = queue.shift();
      var outs = graph.outEdges[cur.id] || [];
      if (!outs.length && cur.pathEdges.length) {
        if (!best || cur.pathEdges.length > best.pathEdges.length) best = cur;
        continue;
      }
      for (var i = 0; i < outs.length; i++) {
        var rel = outs[i];
        if (visited[rel.to]) continue;
        var nextEdges = cur.pathEdges.concat([rel.id]);
        var next = { id: rel.to, depth: cur.depth + 1, pathEdges: nextEdges };
        if (cur.depth + 1 >= maxDepth || !(graph.outEdges[rel.to] || []).length) {
          if (!best || nextEdges.length > best.pathEdges.length) best = next;
        }
        if (cur.depth + 1 < maxDepth) {
          visited[rel.to] = true;
          queue.push(next);
        }
      }
    }
    if (!best || !best.pathEdges.length) {
      return {
        steps: [{ kind: "root", entity: root, relationship: null }],
        edgeIds: [],
        pathFound: false
      };
    }
    var steps = [{ kind: "root", entity: root, relationship: null }];
    for (var e = 0; e < best.pathEdges.length; e++) {
      var r = graph.relationshipById[best.pathEdges[e]];
      if (!r) continue;
      var t = graph.entityById[r.to];
      if (!t) continue;
      steps.push({ kind: "edge", entity: t, relationship: r });
    }
    return { steps: steps, edgeIds: best.pathEdges.slice(), pathFound: steps.length > 1 };
  }

  function traverse(graph, match) {
    if (!graph || !match || match.status !== "matched") {
      return { pathFound: false, steps: [], edgeIds: [], cascade: null, method: null };
    }
    var seedId = (match.seedEntityIds || [])[0];
    if (!seedId || !graph.entityById[seedId]) {
      return { pathFound: false, steps: [], edgeIds: [], cascade: null, method: null };
    }

    if (match.preferredCascadeId && graph.cascadeById[match.preferredCascadeId]) {
      var preferred = buildStepsFromCascade(graph, graph.cascadeById[match.preferredCascadeId]);
      if (preferred.steps.length > 1) {
        return {
          pathFound: true,
          steps: preferred.steps,
          edgeIds: preferred.edgeIds,
          cascade: preferred.cascade,
          method: "preferred-cascade",
          missingEdges: preferred.missingEdges
        };
      }
    }

    var byRoot = findCascadeForRoot(graph, seedId);
    if (byRoot) {
      var built = buildStepsFromCascade(graph, byRoot);
      if (built.steps.length > 1) {
        return {
          pathFound: true,
          steps: built.steps,
          edgeIds: built.edgeIds,
          cascade: built.cascade,
          method: "root-cascade",
          missingEdges: built.missingEdges
        };
      }
    }

    var walked = traverseForward(graph, seedId, 4);
    return {
      pathFound: walked.pathFound,
      steps: walked.steps,
      edgeIds: walked.edgeIds,
      cascade: null,
      method: walked.pathFound ? "bfs-forward" : "seed-only"
    };
  }

  function weakestConfidence(edges) {
    var minRank = Infinity;
    var label = "Unknown";
    for (var i = 0; i < edges.length; i++) {
      var c = normalizeConfidence(edges[i].confidence, { predicted: true });
      var rank = CONFIDENCE_RANK[c];
      if (rank == null) rank = 0;
      if (rank < minRank) {
        minRank = rank;
        label = c;
      }
    }
    return edges.length ? label : "Unknown";
  }

  function furthestHorizon(edges) {
    var maxRank = -1;
    var label = "Unknown";
    for (var i = 0; i < edges.length; i++) {
      var h = normalizeTimeHorizon(edges[i].timeHorizon);
      var rank = HORIZON_RANK[h];
      if (rank == null) rank = 0;
      if (rank > maxRank) {
        maxRank = rank;
        label = h;
      }
    }
    return edges.length ? label : "Unknown";
  }

  function uniqueById(items) {
    var seen = {};
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.id || seen[it.id]) continue;
      seen[it.id] = true;
      out.push(it);
    }
    return out;
  }

  function assembleExplanation(ctx) {
    var match = ctx.match;
    var traversal = ctx.traversal;
    var graph = ctx.graph;
    var seeds = ctx.seeds;
    var linked = ctx.linked;
    var routes = (seeds && seeds.routes) || {};

    var emptyBase = {
      status: match ? match.status : "no-match",
      match: match || null,
      pathFound: false,
      summary: null,
      waypointsTake: null,
      waypointsTakeSource: null,
      relationshipChain: [],
      industries: [],
      countries: [],
      citizenImpacts: [],
      articles: [],
      confidence: "Unknown",
      timeHorizon: "Unknown",
      evidence: [],
      deepLinks: [],
      honestyGaps: [],
      invented: false
    };

    if (!match || match.status === "empty-query") {
      emptyBase.honestyGaps.push("Enter a question to explain.");
      return emptyBase;
    }
    if (match.status === "no-match") {
      emptyBase.summary =
        "No structured match for that question in the Global Signals graph or curated question map.";
      emptyBase.honestyGaps.push(
        "Explain This did not invent an answer. Try an example prompt, or name a known entity (e.g. Taiwan, drought, steel tariff)."
      );
      return emptyBase;
    }

    if (!traversal || !traversal.pathFound) {
      var seedOnly = (match.seedEntityIds || [])
        .map(function (id) {
          return graph.entityById[id];
        })
        .filter(Boolean);
      emptyBase.status = "no-path";
      emptyBase.match = match;
      emptyBase.relationshipChain = seedOnly.map(function (e) {
        return { kind: "root", entity: e, relationship: null };
      });
      emptyBase.summary =
        "Matched " +
        (seedOnly[0] ? seedOnly[0].label : "an entity") +
        ", but the relationship graph has no traversable path from that seed yet.";
      emptyBase.honestyGaps.push(
        "No curated cascade or outbound edges from the seed. Empty is honest — we will not fabricate dependencies."
      );
      emptyBase.deepLinks = buildDeepLinks(match, seedOnly, routes, linked);
      return emptyBase;
    }

    var edges = traversal.steps
      .filter(function (s) {
        return s.kind === "edge" && s.relationship;
      })
      .map(function (s) {
        return s.relationship;
      });

    var labels = traversal.steps.map(function (s) {
      return s.entity.label;
    });

    var summaryParts = [];
    if (traversal.cascade && traversal.cascade.summary) {
      summaryParts.push(traversal.cascade.summary);
    } else {
      summaryParts.push("Structured path: " + labels.join(" → ") + ".");
    }
    if (edges[0] && edges[0].why) {
      summaryParts.push(edges[0].why);
    }
    if (edges.length > 1 && edges[edges.length - 1].why) {
      summaryParts.push("Downstream: " + edges[edges.length - 1].why);
    }

    // Industries / countries / citizen from match + crosswalk + path entities
    var industryIds = (match.linkedIndustryIds || []).slice();
    var countryIds = (match.linkedCountryIds || []).slice();
    var citizenSections = (match.linkedCitizenSections || []).slice();
    var articleIds = (match.linkedArticleIds || []).slice();

    traversal.steps.forEach(function (step) {
      var xw = (seeds.entityCrosswalk && seeds.entityCrosswalk[step.entity.id]) || {};
      (xw.industryIds || []).forEach(function (id) {
        industryIds.push(id);
      });
      (xw.countryIds || []).forEach(function (id) {
        countryIds.push(id);
      });
      (xw.citizenSections || []).forEach(function (id) {
        citizenSections.push(id);
      });
      (xw.articleIds || []).forEach(function (id) {
        articleIds.push(id);
      });
      if (step.entity.type === "country") {
        var slugGuess = step.entity.id.replace(/^gsn_/, "").replace(/_/g, "-");
        var bySlug = linked.countryBySlug[slugGuess];
        if (bySlug) countryIds.push(bySlug.id);
      }
    });

    var industries = uniqueById(
      industryIds
        .map(function (id) {
          return linked.industryById[id];
        })
        .filter(Boolean)
    ).map(function (ind) {
      return {
        id: ind.id,
        slug: ind.slug,
        name: ind.name,
        summary: ind.summary || "",
        href: routes.industries ? routes.industries + (ind.slug ? ind.slug + "/" : "") : null
      };
    });

    var countries = uniqueById(
      countryIds
        .map(function (id) {
          return linked.countryById[id];
        })
        .filter(Boolean)
    ).map(function (c) {
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        summary: c.summary || "",
        href: routes.countries ? routes.countries + (c.slug ? c.slug + "/" : "") : null
      };
    });

    // Waypoint's Take — only if present on a linked industry record
    var waypointsTake = null;
    var waypointsTakeSource = null;
    for (var ti = 0; ti < industries.length; ti++) {
      var full = linked.industryById[industries[ti].id];
      if (full && full.waypointsTake && (full.waypointsTake.whyItMatters || full.waypointsTake.analysis)) {
        waypointsTake = {
          whyItMatters: full.waypointsTake.whyItMatters || null,
          analysis: full.waypointsTake.analysis || null
        };
        waypointsTakeSource = { kind: "industry", id: full.id, name: full.name };
        break;
      }
    }

    var citizenImpacts = [];
    var seenCi = {};
    citizenSections.forEach(function (sid) {
      var section = linked.sectionById[sid];
      if (!section) return;
      (section.statements || []).forEach(function (st) {
        if (!st || !st.id || seenCi[st.id]) return;
        // Prefer statements whose entityIds intersect the path
        var pathIds = {};
        traversal.steps.forEach(function (s) {
          pathIds[s.entity.id] = true;
        });
        var ents = st.entityIds || [];
        var overlap = ents.some(function (id) {
          return pathIds[id];
        });
        if (ents.length && !overlap && match.questionId) {
          // curated question may still surface section statements
          overlap = true;
        }
        if (!overlap && ents.length) return;
        seenCi[st.id] = true;
        citizenImpacts.push({
          id: st.id,
          sectionId: section.id,
          sectionLabel: section.label,
          whatChanged: st.whatChanged || null,
          why: st.why || null,
          confidence: normalizeConfidence(st.confidence, { predicted: true }),
          timeHorizon: normalizeTimeHorizon(st.timeHorizon),
          href: routes.citizenImpact ? routes.citizenImpact + "#" + section.id : null
        });
      });
      // Also surface industry citizenImpacts from linked industries
    });
    industries.forEach(function (indLite) {
      var fullInd = linked.industryById[indLite.id];
      (fullInd && fullInd.citizenImpacts ? fullInd.citizenImpacts : []).forEach(function (ci) {
        var cid = ci.id || indLite.id + ":" + (ci.label || "");
        if (seenCi[cid]) return;
        seenCi[cid] = true;
        citizenImpacts.push({
          id: cid,
          sectionId: null,
          sectionLabel: ci.label || "Citizen impact",
          whatChanged: null,
          why: ci.detail || null,
          confidence: normalizeConfidence(ci.confidence, { predicted: true }),
          timeHorizon: normalizeTimeHorizon(ci.horizon || ci.timeHorizon),
          href: routes.citizenImpact || null,
          source: "industry-record"
        });
      });
    });

    var articles = uniqueById(
      articleIds
        .map(function (id) {
          return linked.articleById[id];
        })
        .filter(Boolean)
    ).map(function (a) {
      return {
        id: a.id,
        headline: a.headline,
        href: routes.articles ? routes.articles + "?id=" + encodeURIComponent(a.id) : null
      };
    });

    var evidence = edges.map(function (rel) {
      return {
        relationshipId: rel.id,
        confidence: rel.confidence,
        timeHorizon: rel.timeHorizon,
        evidence: rel.evidence
      };
    });

    var honestyGaps = [];
    if (!waypointsTake) {
      honestyGaps.push("Waypoint's Take is unavailable for this path — no structured Take on linked industry records.");
    }
    if (!industries.length) {
      honestyGaps.push("No linked industry records for this path.");
    }
    if (!countries.length) {
      honestyGaps.push("No linked country records for this path.");
    }
    if (!citizenImpacts.length) {
      honestyGaps.push("No linked citizen-impact statements for this path.");
    }
    if (!articles.length) {
      honestyGaps.push("No linked articles for this path.");
    }

    var seedEntities = traversal.steps.filter(function (s) {
      return s.kind === "root";
    }).map(function (s) {
      return s.entity;
    });

    return {
      status: "explained",
      match: match,
      pathFound: true,
      traversalMethod: traversal.method,
      cascadeId: traversal.cascade ? traversal.cascade.id : null,
      summary: summaryParts.join(" "),
      waypointsTake: waypointsTake,
      waypointsTakeSource: waypointsTakeSource,
      relationshipChain: traversal.steps,
      industries: industries,
      countries: countries,
      citizenImpacts: citizenImpacts,
      articles: articles,
      confidence: weakestConfidence(edges),
      timeHorizon: furthestHorizon(edges),
      evidence: evidence,
      deepLinks: buildDeepLinks(match, seedEntities.concat(
        traversal.steps.map(function (s) {
          return s.entity;
        })
      ), routes, linked, industries, countries, articles),
      honestyGaps: honestyGaps,
      invented: false
    };
  }

  function buildDeepLinks(match, entities, routes, linked, industries, countries, articles) {
    var links = [];
    var seen = {};
    function add(label, href, group) {
      if (!href || seen[href + label]) return;
      seen[href + label] = true;
      links.push({ label: label, href: href, group: group });
    }

    var seed = (match && match.seedEntityIds && match.seedEntityIds[0]) || (entities[0] && entities[0].id);
    if (routes.relationships && seed) {
      add("Open in Relationship Explorer", routes.relationships + "?entity=" + encodeURIComponent(seed), "graph");
    }
    if (routes.relationshipGraph) {
      add("Relationship Graph", routes.relationshipGraph, "graph");
    }
    (industries || []).forEach(function (ind) {
      if (ind.href) add(ind.name + " (Industry)", ind.href, "industry");
    });
    (countries || []).forEach(function (c) {
      if (c.href) add(c.name + " (Country)", c.href, "country");
    });
    if (routes.citizenImpact) {
      var sections = (match && match.linkedCitizenSections) || [];
      if (sections.length) {
        sections.forEach(function (s) {
          add("Citizen Impact · " + s, routes.citizenImpact + "#" + s, "citizen");
        });
      } else {
        add("Citizen Impact", routes.citizenImpact, "citizen");
      }
    }
    (articles || []).forEach(function (a) {
      if (a.href) add(a.headline || a.id, a.href, "article");
    });
    if (routes.articles && !(articles || []).length) {
      add("Articles", routes.articles, "article");
    }
    return links;
  }

  function explain(query, store) {
    var graph = store.graph;
    var seeds = store.seeds;
    var linked = store.linked;
    var match = matchQuestion(query, seeds, graph);
    var traversal =
      match.status === "matched" ? traverse(graph, match) : { pathFound: false, steps: [], method: null };
    return assembleExplanation({
      match: match,
      traversal: traversal,
      graph: graph,
      seeds: seeds,
      linked: linked
    });
  }

  function renderBanner(seeds, graph) {
    var label = (seeds && seeds.modeLabel) || (graph && graph.modeLabel) || "Sample / demo";
    var honesty =
      (seeds && seeds.honesty && seeds.honesty.banner) ||
      (graph && graph.honesty && graph.honesty.banner) ||
      "Answers come only from structured Global Signals data — not AI invention.";
    return (
      '<div class="gse-banner" role="status">' +
      '<p class="gse-badge">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(honesty) +
      "</p></div>"
    );
  }

  function renderEvidenceLine(ev) {
    if (!ev) return '<p class="gse-muted">Evidence unavailable</p>';
    var kind = ev.kind === "sample-demo" ? "Sample / demo" : esc(ev.kind);
    var link = "";
    if (isSafeHttpUrl(ev.url)) {
      link =
        ' <a href="' +
        esc(ev.url) +
        '" rel="noopener noreferrer" target="_blank">' +
        esc(ev.label) +
        "</a>";
    } else {
      link = " " + esc(ev.label);
    }
    return (
      '<p class="gse-evidence"><span class="gse-badge gse-badge--evidence">' +
      kind +
      "</span>" +
      link +
      (ev.notes ? " · " + esc(ev.notes) : "") +
      "</p>"
    );
  }

  function renderChain(steps) {
    if (!steps || !steps.length) {
      return '<p class="gse-muted">No relationship chain available.</p>';
    }
    var items = steps
      .map(function (step) {
        if (step.kind === "root") {
          return (
            '<li class="gse-chain__step gse-chain__step--root">' +
            '<div class="gse-node">' +
            '<p class="gse-node__meta"><span class="gse-badge">' +
            esc(typeLabel(step.entity.type)) +
            '</span><span class="gse-badge">Seed</span></p>' +
            '<h3 class="gse-node__label">' +
            esc(step.entity.label) +
            "</h3>" +
            (step.entity.summary
              ? '<p class="gse-node__summary">' + esc(step.entity.summary) + "</p>"
              : "") +
            "</div></li>"
          );
        }
        var rel = step.relationship;
        return (
          '<li class="gse-chain__step">' +
          '<span class="gse-chain__arrow" aria-hidden="true">↓</span>' +
          '<div class="gse-edge" data-confidence="' +
          esc(rel.confidence) +
          '">' +
          '<div class="gse-node">' +
          '<p class="gse-node__meta"><span class="gse-badge">' +
          esc(typeLabel(step.entity.type)) +
          '</span><span class="gse-badge">' +
          esc(String(rel.relationType).replace(/_/g, " ")) +
          "</span></p>" +
          '<h3 class="gse-node__label">' +
          esc(step.entity.label) +
          "</h3></div>" +
          '<dl class="gse-facets">' +
          "<div><dt>Why</dt><dd>" +
          esc(rel.why || "Why unavailable for this relationship.") +
          "</dd></div>" +
          '<div><dt>Confidence</dt><dd><span class="gse-badge gse-badge--confidence" data-confidence="' +
          esc(rel.confidence) +
          '">' +
          esc(rel.confidence) +
          "</span></dd></div>" +
          "<div><dt>Time horizon</dt><dd><span class=\"gse-badge\">" +
          esc(rel.timeHorizon) +
          "</span></dd></div>" +
          "<div><dt>Evidence</dt><dd>" +
          renderEvidenceLine(rel.evidence) +
          "</dd></div>" +
          "</dl></div></li>"
        );
      })
      .join("");
    return '<ol class="gse-chain" aria-label="Relationship chain">' + items + "</ol>";
  }

  function renderListSection(title, itemsHtml, emptyMsg) {
    return (
      '<section class="gse-section" aria-labelledby="gse-' +
      esc(title.toLowerCase().replace(/\s+/g, "-")) +
      '">' +
      '<h2 id="gse-' +
      esc(title.toLowerCase().replace(/\s+/g, "-")) +
      '">' +
      esc(title) +
      "</h2>" +
      (itemsHtml || '<p class="gse-empty" role="status">' + esc(emptyMsg) + "</p>") +
      "</section>"
    );
  }

  function renderExplanation(result) {
    if (!result) return "";
    if (result.status === "empty-query") {
      return (
        '<div class="gse-result" data-gse-state="idle" role="status">' +
        "<p>Ask a question, or choose an example prompt below.</p></div>"
      );
    }
    if (result.status === "no-match") {
      return (
        '<div class="gse-result" data-gse-state="no-match" role="status">' +
        "<h2>No structured match</h2>" +
        "<p>" +
        esc(result.summary) +
        "</p>" +
        '<p class="gse-empty">' +
        esc((result.honestyGaps || [])[0] || "") +
        "</p></div>"
      );
    }

    var meta =
      '<div class="gse-meta" aria-label="Explanation confidence">' +
      '<span class="gse-badge gse-badge--confidence" data-confidence="' +
      esc(result.confidence) +
      '">Confidence · ' +
      esc(result.confidence) +
      "</span>" +
      '<span class="gse-badge">Horizon · ' +
      esc(result.timeHorizon) +
      "</span>" +
      (result.traversalMethod
        ? '<span class="gse-badge">Path · ' + esc(result.traversalMethod) + "</span>"
        : "") +
      (result.match && result.match.matchKind
        ? '<span class="gse-badge">Match · ' + esc(result.match.matchKind) + "</span>"
        : "") +
      "</div>";

    var summaryHtml =
      '<section class="gse-section" aria-labelledby="gse-summary">' +
      '<h2 id="gse-summary">Summary</h2>' +
      "<p>" +
      esc(result.summary || "Summary unavailable.") +
      "</p></section>";

    var takeHtml;
    if (result.waypointsTake) {
      takeHtml =
        '<section class="gse-section gse-take" aria-labelledby="gse-take">' +
        '<h2 id="gse-take">Waypoint\'s Take</h2>' +
        (result.waypointsTakeSource
          ? '<p class="gse-muted">From structured industry record · ' +
            esc(result.waypointsTakeSource.name) +
            " (" +
            esc(result.waypointsTakeSource.id) +
            ")</p>"
          : "") +
        (result.waypointsTake.whyItMatters
          ? "<p><strong>Why it matters.</strong> " + esc(result.waypointsTake.whyItMatters) + "</p>"
          : "") +
        (result.waypointsTake.analysis
          ? "<p><strong>Analysis.</strong> " + esc(result.waypointsTake.analysis) + "</p>"
          : "") +
        "</section>";
    } else {
      takeHtml = renderListSection(
        "Waypoint's Take",
        null,
        "No Waypoint's Take is present on linked structured records for this path. We will not invent one."
      );
    }

    var chainHtml =
      '<section class="gse-section" aria-labelledby="gse-chain">' +
      '<h2 id="gse-chain">Relationship chain</h2>' +
      (result.pathFound
        ? renderChain(result.relationshipChain)
        : '<p class="gse-empty" role="status">' +
          esc((result.honestyGaps && result.honestyGaps[0]) || "No path in the graph.") +
          "</p>") +
      "</section>";

    var indHtml = result.industries.length
      ? '<ul class="gse-linklist">' +
        result.industries
          .map(function (ind) {
            return (
              "<li>" +
              (ind.href
                ? '<a href="' + esc(ind.href) + '">' + esc(ind.name) + "</a>"
                : esc(ind.name)) +
              (ind.summary ? '<p class="gse-muted">' + esc(ind.summary) + "</p>" : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>"
      : null;

    var ctyHtml = result.countries.length
      ? '<ul class="gse-linklist">' +
        result.countries
          .map(function (c) {
            return (
              "<li>" +
              (c.href ? '<a href="' + esc(c.href) + '">' + esc(c.name) + "</a>" : esc(c.name)) +
              (c.summary ? '<p class="gse-muted">' + esc(c.summary) + "</p>" : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>"
      : null;

    var ciHtml = result.citizenImpacts.length
      ? '<ul class="gse-linklist">' +
        result.citizenImpacts
          .map(function (ci) {
            return (
              "<li>" +
              (ci.href
                ? '<a href="' + esc(ci.href) + '">' + esc(ci.sectionLabel) + "</a>"
                : esc(ci.sectionLabel)) +
              ' <span class="gse-badge gse-badge--confidence" data-confidence="' +
              esc(ci.confidence) +
              '">' +
              esc(ci.confidence) +
              "</span> <span class=\"gse-badge\">" +
              esc(ci.timeHorizon) +
              "</span>" +
              (ci.why ? '<p class="gse-muted">' + esc(ci.why) + "</p>" : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>"
      : null;

    var evHtml = result.evidence.length
      ? '<ul class="gse-linklist">' +
        result.evidence
          .map(function (row) {
            return (
              "<li><span class=\"gse-badge\">" +
              esc(row.relationshipId) +
              "</span>" +
              renderEvidenceLine(row.evidence) +
              "</li>"
            );
          })
          .join("") +
        "</ul>"
      : null;

    var linksHtml = result.deepLinks.length
      ? '<ul class="gse-deeplinks">' +
        result.deepLinks
          .map(function (l) {
            return (
              '<li><a href="' +
              esc(l.href) +
              '">' +
              esc(l.label) +
              "</a></li>"
            );
          })
          .join("") +
        "</ul>"
      : null;

    var gaps =
      result.honestyGaps && result.honestyGaps.length
        ? '<aside class="gse-gaps" aria-label="Honest gaps"><h2>Honest gaps</h2><ul>' +
          result.honestyGaps
            .map(function (g) {
              return "<li>" + esc(g) + "</li>";
            })
            .join("") +
          "</ul></aside>"
        : "";

    return (
      '<div class="gse-result" data-gse-state="' +
      esc(result.status) +
      '">' +
      meta +
      summaryHtml +
      takeHtml +
      chainHtml +
      renderListSection(
        "Industries",
        indHtml,
        "No linked industry records for this path."
      ) +
      renderListSection(
        "Countries",
        ctyHtml,
        "No linked country records for this path."
      ) +
      renderListSection(
        "Citizen impacts",
        ciHtml,
        "No linked citizen-impact statements for this path."
      ) +
      renderListSection("Evidence", evHtml, "No edge evidence on this path.") +
      renderListSection("Explore further", linksHtml, "No deep links available.") +
      gaps +
      "</div>"
    );
  }

  function renderShell(store, lastResult) {
    var examples = (store.seeds.examplePrompts || [])
      .map(function (p) {
        return (
          '<li><button type="button" class="gse-example" data-gse-example="' +
          esc(p) +
          '">' +
          esc(p) +
          "</button></li>"
        );
      })
      .join("");

    return (
      renderBanner(store.seeds, store.graph) +
      '<form class="gse-form" data-gse-form>' +
      '<label class="gse-field" for="gse-question"><span>Your question</span>' +
      '<input id="gse-question" name="question" type="search" autocomplete="off" spellcheck="true" ' +
      'placeholder="e.g. Why does Taiwan matter?" data-gse-input /></label>' +
      '<div class="gse-form__actions">' +
      '<button type="submit" class="gs-cta gs-cta--primary">Explain</button>' +
      '<button type="button" class="gs-cta" data-gse-clear>Clear</button>' +
      "</div></form>" +
      '<section class="gse-examples" aria-label="Example prompts">' +
      "<h2>Try an example</h2>" +
      "<ul>" +
      examples +
      "</ul></section>" +
      '<div data-gse-output aria-live="polite">' +
      renderExplanation(lastResult || { status: "empty-query" }) +
      "</div>"
    );
  }

  function queryParam(name) {
    try {
      return new URLSearchParams(global.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function setQueryParam(name, value) {
    try {
      var url = new URL(global.location.href);
      if (value) url.searchParams.set(name, value);
      else url.searchParams.delete(name);
      global.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function fetchJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("Failed to load " + url + " (" + res.status + ")");
      return res.json();
    });
  }

  function mount(el, options) {
    if (!el) return null;
    options = options || {};
    var relUrl = options.relationshipsUrl || "../../../data/global-signals/relationships/relationships.json";
    var seedsUrl = options.seedsUrl || "../../../data/global-signals/explain/question-seeds.json";
    var industriesUrl = options.industriesUrl || "../../../data/global-signals/industries/industries.json";
    var countriesUrl = options.countriesUrl || "../../../data/global-signals/countries/countries.json";
    var citizenUrl =
      options.citizenImpactUrl || "../../../data/global-signals/citizen-impact/citizen-impact.json";
    var articlesUrl = options.articlesUrl || "../../../data/global-signals/articles/articles.json";

    el.setAttribute("data-gse-state", "loading");
    el.innerHTML = '<p class="gse-loading" role="status">Loading Explain This…</p>';

    return Promise.all([
      fetchJson(relUrl),
      fetchJson(seedsUrl),
      fetchJson(industriesUrl).catch(function () {
        return { industries: [] };
      }),
      fetchJson(countriesUrl).catch(function () {
        return { countries: [] };
      }),
      fetchJson(citizenUrl).catch(function () {
        return { sections: [] };
      }),
      fetchJson(articlesUrl).catch(function () {
        return { articles: [] };
      })
    ])
      .then(function (parts) {
        var store = {
          graph: normalizeGraph(parts[0]),
          seeds: normalizeSeeds(parts[1]),
          industries: parts[2],
          countries: parts[3],
          citizenImpact: parts[4],
          articles: parts[5]
        };
        store.linked = indexLinked(store);

        var lastResult = { status: "empty-query" };
        el.setAttribute("data-gse-state", "ready");
        el.innerHTML = renderShell(store, lastResult);

        function run(q, pushQuery) {
          var result = explain(q, store);
          lastResult = result;
          if (pushQuery !== false) setQueryParam("q", q || "");
          var out = el.querySelector("[data-gse-output]");
          if (out) out.innerHTML = renderExplanation(result);
          var input = el.querySelector("[data-gse-input]");
          if (input && q != null) input.value = q;
          return result;
        }

        el.addEventListener("submit", function (ev) {
          var form = ev.target.closest("[data-gse-form]");
          if (!form) return;
          ev.preventDefault();
          var input = form.querySelector("[data-gse-input]");
          run(input ? input.value : "", true);
        });

        el.addEventListener("click", function (ev) {
          var ex = ev.target.closest("[data-gse-example]");
          if (ex) {
            ev.preventDefault();
            run(ex.getAttribute("data-gse-example") || "", true);
            return;
          }
          var clear = ev.target.closest("[data-gse-clear]");
          if (clear) {
            ev.preventDefault();
            run("", true);
          }
        });

        var initial = queryParam("q") || options.initialQuery || "";
        if (initial) run(initial, false);

        return {
          store: store,
          explain: function (q) {
            return run(q, true);
          },
          getLastResult: function () {
            return lastResult;
          }
        };
      })
      .catch(function (err) {
        el.setAttribute("data-gse-state", "error");
        el.innerHTML =
          '<div class="gse-result" data-gse-state="error" role="alert">' +
          "<h2>Could not load Explain This</h2>" +
          "<p>" +
          esc(err && err.message ? err.message : "Unknown error") +
          "</p>" +
          "<p class=\"gse-empty\">We will not invent an explanation while data is unavailable.</p></div>";
        return null;
      });
  }

  GS.explain = {
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    normalizeQuery: normalizeQuery,
    normalizeGraph: normalizeGraph,
    normalizeSeeds: normalizeSeeds,
    normalizeRelationship: normalizeRelationship,
    normalizeEntity: normalizeEntity,
    typeLabel: typeLabel,
    matchQuestion: matchQuestion,
    traverse: traverse,
    traverseForward: traverseForward,
    assembleExplanation: assembleExplanation,
    explain: explain,
    indexLinked: indexLinked,
    weakestConfidence: weakestConfidence,
    furthestHorizon: furthestHorizon,
    renderExplanation: renderExplanation,
    mount: mount
  };
})(typeof window !== "undefined" ? window : globalThis);
