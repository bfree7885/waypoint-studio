/**
 * Global Signals — Story Mode
 * Assembles intelligence briefings from curated story seeds + relationship graph
 * + linked industries / countries / citizen-impact / articles.
 * No AI / LLM. Never invents edges, takes, confidence, or evidence.
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

  var SECTION_TITLES = {
    whatHappened: "What happened",
    whyItMatters: "Why it matters",
    industries: "Industries affected",
    countries: "Countries affected",
    citizenImpacts: "Citizen impacts",
    articles: "Related articles",
    relationshipGraph: "Relationship graph",
    confidence: "Confidence",
    evidence: "Evidence"
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

  function normalizeStoryDef(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    if (!id) return null;
    var order = Array.isArray(raw.sectionOrder) && raw.sectionOrder.length
      ? raw.sectionOrder.slice()
      : Object.keys(SECTION_TITLES);
    return {
      id: id,
      slug: String(raw.slug || id).trim(),
      title: String(raw.title || "").trim() || "Untitled story",
      dek: String(raw.dek || "").trim(),
      entryLabels: Array.isArray(raw.entryLabels) ? raw.entryLabels.slice() : [],
      seedEntityIds: Array.isArray(raw.seedEntityIds) ? raw.seedEntityIds.slice() : [],
      preferredCascadeId: raw.preferredCascadeId || null,
      linkedIndustryIds: Array.isArray(raw.linkedIndustryIds) ? raw.linkedIndustryIds.slice() : [],
      linkedCountryIds: Array.isArray(raw.linkedCountryIds) ? raw.linkedCountryIds.slice() : [],
      linkedCitizenSections: Array.isArray(raw.linkedCitizenSections)
        ? raw.linkedCitizenSections.slice()
        : [],
      linkedArticleIds: Array.isArray(raw.linkedArticleIds) ? raw.linkedArticleIds.slice() : [],
      sectionOrder: order,
      provenance: raw.provenance || null
    };
  }

  function normalizeSeeds(raw) {
    raw = raw || {};
    var stories = (raw.stories || []).map(normalizeStoryDef).filter(Boolean);
    var byId = {};
    var bySlug = {};
    stories.forEach(function (s) {
      byId[s.id] = s;
      bySlug[s.slug] = s;
    });
    return {
      version: raw.version || null,
      mode: raw.mode || "sample-demo",
      modeLabel: raw.modeLabel || null,
      honesty: raw.honesty || null,
      defaultStoryId: raw.defaultStoryId || (stories[0] && stories[0].id) || null,
      stories: stories,
      byId: byId,
      bySlug: bySlug,
      articleStoryMap:
        raw.articleStoryMap && typeof raw.articleStoryMap === "object" ? raw.articleStoryMap : {},
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

  function traverse(graph, story) {
    if (!graph || !story) {
      return { pathFound: false, steps: [], edgeIds: [], cascade: null, method: null };
    }
    var seedId = (story.seedEntityIds || [])[0];
    if (!seedId || !graph.entityById[seedId]) {
      return { pathFound: false, steps: [], edgeIds: [], cascade: null, method: null };
    }

    if (story.preferredCascadeId && graph.cascadeById[story.preferredCascadeId]) {
      var preferred = buildStepsFromCascade(graph, graph.cascadeById[story.preferredCascadeId]);
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

  /**
   * Resolve a story definition by id, slug, article id, or entry label.
   * Never invents a story.
   */
  function resolveStory(key, seeds) {
    seeds = seeds || normalizeSeeds({});
    var empty = { status: "no-match", key: key || null, story: null };
    if (key == null || String(key).trim() === "") {
      if (seeds.defaultStoryId && seeds.byId[seeds.defaultStoryId]) {
        return {
          status: "matched",
          key: seeds.defaultStoryId,
          story: seeds.byId[seeds.defaultStoryId],
          matchKind: "default"
        };
      }
      return { status: "empty-key", key: null, story: null };
    }
    var raw = String(key).trim();
    if (seeds.byId[raw]) {
      return { status: "matched", key: raw, story: seeds.byId[raw], matchKind: "id" };
    }
    if (seeds.bySlug[raw]) {
      return { status: "matched", key: raw, story: seeds.bySlug[raw], matchKind: "slug" };
    }
    if (seeds.articleStoryMap[raw] && seeds.byId[seeds.articleStoryMap[raw]]) {
      return {
        status: "matched",
        key: raw,
        story: seeds.byId[seeds.articleStoryMap[raw]],
        matchKind: "article-map"
      };
    }
    var nq = normalizeQuery(raw);
    for (var i = 0; i < seeds.stories.length; i++) {
      var s = seeds.stories[i];
      if (normalizeQuery(s.title) === nq || normalizeQuery(s.slug) === nq) {
        return { status: "matched", key: raw, story: s, matchKind: "title-or-slug" };
      }
      for (var L = 0; L < s.entryLabels.length; L++) {
        if (normalizeQuery(s.entryLabels[L]) === nq) {
          return { status: "matched", key: raw, story: s, matchKind: "entry-label" };
        }
      }
    }
    return empty;
  }

  function assembleStory(ctx) {
    var resolved = ctx.resolved;
    var graph = ctx.graph;
    var seeds = ctx.seeds;
    var linked = ctx.linked;
    var routes = (seeds && seeds.routes) || {};

    var base = {
      status: resolved ? resolved.status : "no-match",
      invented: false,
      story: null,
      matchKind: resolved ? resolved.matchKind : null,
      pathFound: false,
      title: null,
      dek: null,
      sections: [],
      sectionMap: {},
      confidence: "Unknown",
      timeHorizon: "Unknown",
      traversalMethod: null,
      cascadeId: null,
      relationshipChain: [],
      honestyGaps: [],
      deepLinks: [],
      storyList: (seeds && seeds.stories) || []
    };

    if (!resolved || resolved.status === "empty-key") {
      base.honestyGaps.push("Choose a curated story to assemble a briefing.");
      return base;
    }
    if (resolved.status !== "matched" || !resolved.story) {
      base.honestyGaps.push(
        "No curated story matches that id. Story Mode will not invent a narrative."
      );
      return base;
    }

    var story = resolved.story;
    base.story = story;
    base.title = story.title;
    base.dek = story.dek;
    base.status = "assembled";

    var traversal = traverse(graph, story);
    base.pathFound = Boolean(traversal.pathFound);
    base.traversalMethod = traversal.method;
    base.cascadeId = traversal.cascade ? traversal.cascade.id : null;
    base.relationshipChain = traversal.steps || [];

    var edges = (traversal.steps || [])
      .filter(function (s) {
        return s.kind === "edge" && s.relationship;
      })
      .map(function (s) {
        return s.relationship;
      });
    base.confidence = weakestConfidence(edges);
    base.timeHorizon = furthestHorizon(edges);

    var missingIndustryIds = [];
    var industries = uniqueById(
      story.linkedIndustryIds
        .map(function (id) {
          var ind = linked.industryById[id];
          if (!ind) missingIndustryIds.push(id);
          return ind;
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

    var missingCountryIds = [];
    var countries = uniqueById(
      story.linkedCountryIds
        .map(function (id) {
          var c = linked.countryById[id];
          if (!c) missingCountryIds.push(id);
          return c;
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

    var missingArticleIds = [];
    var articles = uniqueById(
      story.linkedArticleIds
        .map(function (id) {
          var a = linked.articleById[id];
          if (!a) missingArticleIds.push(id);
          return a;
        })
        .filter(Boolean)
    ).map(function (a) {
      return {
        id: a.id,
        headline: a.headline,
        factualSummary: a.factualSummary || "",
        href: routes.articles ? routes.articles + "?id=" + encodeURIComponent(a.id) : null,
        storyHref: routes.story
          ? routes.story + "?id=" + encodeURIComponent(story.id)
          : null
      };
    });

    var citizenImpacts = [];
    var seenCi = {};
    var missingCitizenSections = [];
    story.linkedCitizenSections.forEach(function (sid) {
      var section = linked.sectionById[sid];
      if (!section) {
        missingCitizenSections.push(sid);
        return;
      }
      (section.statements || []).forEach(function (st) {
        if (!st || !st.id || seenCi[st.id]) return;
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

    // What happened — only structured sources (article facts, cascade summary, entity summary, first edge why)
    var whatParts = [];
    if (articles[0] && articles[0].factualSummary) {
      whatParts.push(articles[0].factualSummary);
    } else if (traversal.cascade && traversal.cascade.summary) {
      whatParts.push(traversal.cascade.summary);
    } else if (traversal.steps[0] && traversal.steps[0].entity && traversal.steps[0].entity.summary) {
      whatParts.push(traversal.steps[0].entity.summary);
    }
    if (edges[0] && edges[0].why) {
      whatParts.push(edges[0].why);
    }
    var whatHappened = {
      id: "whatHappened",
      title: SECTION_TITLES.whatHappened,
      status: whatParts.length ? "present" : "missing",
      body: whatParts.length ? whatParts.join(" ") : null,
      items: []
    };

    // Why it matters — Waypoint Take from linked article or industry only
    var whyTake = null;
    var whySource = null;
    if (articles[0]) {
      var fullArt = linked.articleById[articles[0].id];
      if (
        fullArt &&
        fullArt.waypointsTake &&
        (fullArt.waypointsTake.whyItMatters || fullArt.waypointsTake.analysis)
      ) {
        whyTake = {
          whyItMatters: fullArt.waypointsTake.whyItMatters || null,
          analysis: fullArt.waypointsTake.analysis || null
        };
        whySource = { kind: "article", id: fullArt.id, label: fullArt.headline };
      }
    }
    if (!whyTake) {
      for (var ti = 0; ti < industries.length; ti++) {
        var full = linked.industryById[industries[ti].id];
        if (full && full.waypointsTake && (full.waypointsTake.whyItMatters || full.waypointsTake.analysis)) {
          whyTake = {
            whyItMatters: full.waypointsTake.whyItMatters || null,
            analysis: full.waypointsTake.analysis || null
          };
          whySource = { kind: "industry", id: full.id, label: full.name };
          break;
        }
      }
    }
    var whyItMatters = {
      id: "whyItMatters",
      title: SECTION_TITLES.whyItMatters,
      status: whyTake ? "present" : "missing",
      take: whyTake,
      source: whySource,
      body: null,
      items: []
    };

    var industriesSection = {
      id: "industries",
      title: SECTION_TITLES.industries,
      status: industries.length ? "present" : "missing",
      items: industries,
      body: null
    };

    var countriesSection = {
      id: "countries",
      title: SECTION_TITLES.countries,
      status: countries.length ? "present" : "missing",
      items: countries,
      body: null
    };

    var citizenSection = {
      id: "citizenImpacts",
      title: SECTION_TITLES.citizenImpacts,
      status: citizenImpacts.length ? "present" : "missing",
      items: citizenImpacts,
      body: null
    };

    var articlesSection = {
      id: "articles",
      title: SECTION_TITLES.articles,
      status: articles.length ? "present" : "missing",
      items: articles,
      body: null
    };

    var seedId = (story.seedEntityIds || [])[0] || null;
    var explorerHref = routes.relationships && seedId
      ? routes.relationships + "?entity=" + encodeURIComponent(seedId)
      : routes.relationships || null;
    var graphHref = routes.relationshipGraph || null;
    var relationshipGraph = {
      id: "relationshipGraph",
      title: SECTION_TITLES.relationshipGraph,
      status: traversal.pathFound || explorerHref || graphHref ? "present" : "missing",
      body: traversal.cascade
        ? traversal.cascade.title || traversal.cascade.summary
        : traversal.pathFound
          ? "Structured path from seed entity (no curated cascade title)."
          : null,
      chain: traversal.steps || [],
      explorerHref: explorerHref,
      graphHref: graphHref,
      items: []
    };

    var confidenceSection = {
      id: "confidence",
      title: SECTION_TITLES.confidence,
      status: edges.length ? "present" : "missing",
      confidence: base.confidence,
      timeHorizon: base.timeHorizon,
      method: traversal.method,
      body:
        edges.length
          ? "Briefing confidence is the weakest hop on the traversed path (" +
            base.confidence +
            "). Furthest time horizon is " +
            base.timeHorizon +
            "."
          : null,
      items: edges.map(function (rel) {
        return {
          id: rel.id,
          confidence: rel.confidence,
          timeHorizon: rel.timeHorizon,
          why: rel.why
        };
      })
    };

    var evidenceSection = {
      id: "evidence",
      title: SECTION_TITLES.evidence,
      status: edges.length ? "present" : "missing",
      items: edges.map(function (rel) {
        return {
          id: rel.id,
          relationshipId: rel.id,
          confidence: rel.confidence,
          timeHorizon: rel.timeHorizon,
          evidence: rel.evidence
        };
      }),
      body: null
    };

    var sectionMap = {
      whatHappened: whatHappened,
      whyItMatters: whyItMatters,
      industries: industriesSection,
      countries: countriesSection,
      citizenImpacts: citizenSection,
      articles: articlesSection,
      relationshipGraph: relationshipGraph,
      confidence: confidenceSection,
      evidence: evidenceSection
    };

    var honestyGaps = [];
    if (!traversal.pathFound) {
      honestyGaps.push(
        "No traversable relationship path from the story seed. Empty is honest — we will not fabricate dependencies."
      );
    }
    if (whatHappened.status === "missing") {
      honestyGaps.push("What happened: no article factual summary, cascade summary, or seed summary available.");
    }
    if (whyItMatters.status === "missing") {
      honestyGaps.push(
        "Why it matters: no Waypoint's Take on linked article or industry records."
      );
    }
    if (!industries.length) {
      honestyGaps.push("No linked industry records resolved for this story.");
    }
    missingIndustryIds.forEach(function (id) {
      honestyGaps.push("Linked industry id missing from dataset: " + id);
    });
    if (!countries.length) {
      honestyGaps.push("No linked country records resolved for this story.");
    }
    missingCountryIds.forEach(function (id) {
      honestyGaps.push("Linked country id missing from dataset: " + id);
    });
    if (!citizenImpacts.length) {
      honestyGaps.push("No linked citizen-impact statements for this story.");
    }
    missingCitizenSections.forEach(function (id) {
      honestyGaps.push("Linked citizen-impact section missing: " + id);
    });
    if (!articles.length) {
      honestyGaps.push("No linked articles for this story.");
    }
    missingArticleIds.forEach(function (id) {
      honestyGaps.push("Linked article id missing from dataset: " + id);
    });
    if ((traversal.missingEdges || []).length) {
      honestyGaps.push(
        "Cascade references missing edges: " + traversal.missingEdges.join(", ")
      );
    }

    var order = story.sectionOrder || Object.keys(SECTION_TITLES);
    var sections = order
      .map(function (id) {
        return sectionMap[id];
      })
      .filter(Boolean);

    var deepLinks = [];
    function addLink(label, href, group) {
      if (!href) return;
      deepLinks.push({ label: label, href: href, group: group });
    }
    if (explorerHref) addLink("Open path in Relationship Explorer", explorerHref, "graph");
    if (graphHref) addLink("Relationship Graph module", graphHref, "graph");
    if (routes.explain && seedId) {
      addLink("Explain This (related)", routes.explain, "explain");
    }
    industries.forEach(function (ind) {
      if (ind.href) addLink(ind.name + " (Industry)", ind.href, "industry");
    });
    countries.forEach(function (c) {
      if (c.href) addLink(c.name + " (Country)", c.href, "country");
    });
    if (routes.citizenImpact) {
      if (story.linkedCitizenSections.length) {
        story.linkedCitizenSections.forEach(function (s) {
          addLink("Citizen Impact · " + s, routes.citizenImpact + "#" + s, "citizen");
        });
      } else {
        addLink("Citizen Impact", routes.citizenImpact, "citizen");
      }
    }
    articles.forEach(function (a) {
      if (a.href) addLink(a.headline || a.id, a.href, "article");
    });

    base.sections = sections;
    base.sectionMap = sectionMap;
    base.honestyGaps = honestyGaps;
    base.deepLinks = deepLinks;
    base.industries = industries;
    base.countries = countries;
    base.citizenImpacts = citizenImpacts;
    base.articles = articles;
    return base;
  }

  function assemble(key, store) {
    var seeds = store.seeds;
    var resolved = resolveStory(key, seeds);
    return assembleStory({
      resolved: resolved,
      graph: store.graph,
      seeds: seeds,
      linked: store.linked
    });
  }

  function renderBanner(seeds, graph) {
    var label = (seeds && seeds.modeLabel) || (graph && graph.modeLabel) || "Sample / demo";
    var honesty =
      (seeds && seeds.honesty && seeds.honesty.banner) ||
      (graph && graph.honesty && graph.honesty.banner) ||
      "Story Mode uses structured Global Signals data only — not AI invention.";
    return (
      '<div class="gsm-banner" role="status">' +
      '<p class="gsm-badge">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(honesty) +
      "</p></div>"
    );
  }

  function renderEvidenceLine(ev) {
    if (!ev) return '<p class="gsm-muted">Evidence unavailable</p>';
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
      '<p class="gsm-evidence"><span class="gsm-badge gsm-badge--evidence">' +
      kind +
      "</span>" +
      link +
      (ev.notes ? " · " + esc(ev.notes) : "") +
      "</p>"
    );
  }

  function renderChain(steps) {
    if (!steps || !steps.length) {
      return '<p class="gsm-muted">No relationship chain available.</p>';
    }
    var items = steps
      .map(function (step) {
        if (step.kind === "root") {
          return (
            '<li class="gsm-chain__step gsm-chain__step--root">' +
            '<div class="gsm-node">' +
            '<p class="gsm-node__meta"><span class="gsm-badge">' +
            esc(typeLabel(step.entity.type)) +
            '</span><span class="gsm-badge">Seed</span></p>' +
            '<h3 class="gsm-node__label">' +
            esc(step.entity.label) +
            "</h3>" +
            (step.entity.summary
              ? '<p class="gsm-node__summary">' + esc(step.entity.summary) + "</p>"
              : "") +
            "</div></li>"
          );
        }
        var rel = step.relationship;
        return (
          '<li class="gsm-chain__step">' +
          '<span class="gsm-chain__arrow" aria-hidden="true">↓</span>' +
          '<div class="gsm-edge" data-confidence="' +
          esc(rel.confidence) +
          '">' +
          '<div class="gsm-node">' +
          '<p class="gsm-node__meta"><span class="gsm-badge">' +
          esc(typeLabel(step.entity.type)) +
          '</span><span class="gsm-badge">' +
          esc(String(rel.relationType).replace(/_/g, " ")) +
          "</span></p>" +
          '<h3 class="gsm-node__label">' +
          esc(step.entity.label) +
          "</h3></div>" +
          '<dl class="gsm-facets">' +
          "<div><dt>Why</dt><dd>" +
          esc(rel.why || "Why unavailable for this relationship.") +
          "</dd></div>" +
          '<div><dt>Confidence</dt><dd><span class="gsm-badge gsm-badge--confidence" data-confidence="' +
          esc(rel.confidence) +
          '">' +
          esc(rel.confidence) +
          "</span></dd></div>" +
          "<div><dt>Time horizon</dt><dd><span class=\"gsm-badge\">" +
          esc(rel.timeHorizon) +
          "</span></dd></div>" +
          "</dl></div></li>"
        );
      })
      .join("");
    return '<ol class="gsm-chain" aria-label="Relationship path">' + items + "</ol>";
  }

  function renderSection(section) {
    if (!section) return "";
    var id = section.id;
    var headingId = "gsm-sec-" + id;
    var inner = "";

    if (id === "whatHappened") {
      inner = section.body
        ? "<p>" + esc(section.body) + "</p>"
        : '<p class="gsm-empty" role="status">No structured “what happened” text is available for this story.</p>';
    } else if (id === "whyItMatters") {
      if (section.take) {
        inner =
          (section.source
            ? '<p class="gsm-muted">From structured ' +
              esc(section.source.kind) +
              " record · " +
              esc(section.source.label) +
              " (" +
              esc(section.source.id) +
              ")</p>"
            : "") +
          (section.take.whyItMatters
            ? "<p><strong>Why it matters.</strong> " + esc(section.take.whyItMatters) + "</p>"
            : "") +
          (section.take.analysis
            ? "<p><strong>Analysis.</strong> " + esc(section.take.analysis) + "</p>"
            : "");
      } else {
        inner =
          '<p class="gsm-empty" role="status">No Waypoint\'s Take is present on linked structured records. We will not invent one.</p>';
      }
    } else if (id === "industries" || id === "countries") {
      if (section.items && section.items.length) {
        inner =
          '<ul class="gsm-linklist">' +
          section.items
            .map(function (item) {
              return (
                "<li>" +
                (item.href
                  ? '<a href="' + esc(item.href) + '">' + esc(item.name) + "</a>"
                  : esc(item.name)) +
                (item.summary ? '<p class="gsm-muted">' + esc(item.summary) + "</p>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>";
      } else {
        inner =
          '<p class="gsm-empty" role="status">No linked ' +
          (id === "industries" ? "industry" : "country") +
          " records for this story.</p>";
      }
    } else if (id === "citizenImpacts") {
      if (section.items && section.items.length) {
        inner =
          '<ul class="gsm-linklist">' +
          section.items
            .map(function (ci) {
              return (
                "<li>" +
                (ci.href
                  ? '<a href="' + esc(ci.href) + '">' + esc(ci.sectionLabel) + "</a>"
                  : esc(ci.sectionLabel)) +
                ' <span class="gsm-badge gsm-badge--confidence" data-confidence="' +
                esc(ci.confidence) +
                '">' +
                esc(ci.confidence) +
                '</span> <span class="gsm-badge">' +
                esc(ci.timeHorizon) +
                "</span>" +
                (ci.whatChanged ? '<p class="gsm-muted">' + esc(ci.whatChanged) + "</p>" : "") +
                (ci.why ? '<p class="gsm-muted">' + esc(ci.why) + "</p>" : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>";
      } else {
        inner =
          '<p class="gsm-empty" role="status">No linked citizen-impact statements for this story.</p>';
      }
    } else if (id === "articles") {
      if (section.items && section.items.length) {
        inner =
          '<ul class="gsm-linklist">' +
          section.items
            .map(function (a) {
              return (
                "<li>" +
                (a.href
                  ? '<a href="' + esc(a.href) + '">' + esc(a.headline || a.id) + "</a>"
                  : esc(a.headline || a.id)) +
                (a.factualSummary
                  ? '<p class="gsm-muted">' + esc(a.factualSummary) + "</p>"
                  : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>";
      } else {
        inner =
          '<p class="gsm-empty" role="status">No linked articles for this story.</p>';
      }
    } else if (id === "relationshipGraph") {
      inner =
        (section.body ? "<p>" + esc(section.body) + "</p>" : "") +
        renderChain(section.chain) +
        '<p class="gsm-module-links">' +
        (section.explorerHref
          ? '<a class="gs-cta gs-cta--primary" href="' +
            esc(section.explorerHref) +
            '">Open in Relationship Explorer</a>'
          : "") +
        (section.graphHref
          ? '<a class="gs-cta" href="' + esc(section.graphHref) + '">Relationship Graph</a>'
          : "") +
        "</p>";
    } else if (id === "confidence") {
      inner =
        '<div class="gsm-meta" aria-label="Briefing confidence">' +
        '<span class="gsm-badge gsm-badge--confidence" data-confidence="' +
        esc(section.confidence || "Unknown") +
        '">Weakest hop · ' +
        esc(section.confidence || "Unknown") +
        "</span>" +
        '<span class="gsm-badge">Horizon · ' +
        esc(section.timeHorizon || "Unknown") +
        "</span>" +
        (section.method
          ? '<span class="gsm-badge">Path · ' + esc(section.method) + "</span>"
          : "") +
        "</div>" +
        (section.body ? "<p>" + esc(section.body) + "</p>" : "") +
        (section.items && section.items.length
          ? '<ul class="gsm-linklist">' +
            section.items
              .map(function (row) {
                return (
                  "<li><span class=\"gsm-badge\">" +
                  esc(row.id) +
                  '</span> <span class="gsm-badge gsm-badge--confidence" data-confidence="' +
                  esc(row.confidence) +
                  '">' +
                  esc(row.confidence) +
                  "</span> <span class=\"gsm-badge\">" +
                  esc(row.timeHorizon) +
                  "</span>" +
                  (row.why ? '<p class="gsm-muted">' + esc(row.why) + "</p>" : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="gsm-empty" role="status">No hop confidence available — path missing.</p>');
    } else if (id === "evidence") {
      if (section.items && section.items.length) {
        inner =
          '<ul class="gsm-linklist">' +
          section.items
            .map(function (row) {
              return (
                "<li><span class=\"gsm-badge\">" +
                esc(row.relationshipId) +
                "</span>" +
                renderEvidenceLine(row.evidence) +
                "</li>"
              );
            })
            .join("") +
          "</ul>";
      } else {
        inner = '<p class="gsm-empty" role="status">No edge evidence on this path.</p>';
      }
    } else {
      inner = '<p class="gsm-muted">Section unavailable.</p>';
    }

    return (
      '<section class="gsm-section' +
      (id === "whyItMatters" ? " gsm-section--take" : "") +
      '" id="' +
      esc(headingId) +
      '" aria-labelledby="' +
      esc(headingId) +
      '-title" data-gsm-section="' +
      esc(id) +
      '" data-gsm-status="' +
      esc(section.status) +
      '">' +
      '<h2 id="' +
      esc(headingId) +
      '-title">' +
      esc(section.title) +
      "</h2>" +
      inner +
      "</section>"
    );
  }

  function renderBriefing(result) {
    if (!result) return "";
    if (result.status === "empty-key") {
      return (
        '<div class="gsm-briefing" data-gsm-state="idle" role="status">' +
        "<p>Choose a curated story below to assemble a briefing.</p></div>"
      );
    }
    if (result.status === "no-match") {
      return (
        '<div class="gsm-briefing" data-gsm-state="no-match" role="status">' +
        "<h2>No curated story</h2>" +
        '<p class="gsm-empty">' +
        esc((result.honestyGaps || [])[0] || "Story Mode will not invent a narrative.") +
        "</p></div>"
      );
    }

    var toc =
      '<nav class="gsm-toc" aria-label="Briefing sections"><ol>' +
      (result.sections || [])
        .map(function (s) {
          return (
            '<li><a href="#gsm-sec-' +
            esc(s.id) +
            '">' +
            esc(s.title) +
            '</a> <span class="gsm-toc__status" data-status="' +
            esc(s.status) +
            '">' +
            esc(s.status) +
            "</span></li>"
          );
        })
        .join("") +
      "</ol></nav>";

    var head =
      '<header class="gsm-briefing__head">' +
      '<p class="gsm-eyebrow">Intelligence briefing</p>' +
      "<h2>" +
      esc(result.title || "Untitled story") +
      "</h2>" +
      (result.dek ? '<p class="gsm-dek">' + esc(result.dek) + "</p>" : "") +
      '<div class="gsm-meta" aria-label="Briefing meta">' +
      '<span class="gsm-badge gsm-badge--confidence" data-confidence="' +
      esc(result.confidence) +
      '">Confidence · ' +
      esc(result.confidence) +
      "</span>" +
      '<span class="gsm-badge">Horizon · ' +
      esc(result.timeHorizon) +
      "</span>" +
      (result.traversalMethod
        ? '<span class="gsm-badge">Path · ' + esc(result.traversalMethod) + "</span>"
        : "") +
      (result.story && result.story.id
        ? '<span class="gsm-badge">' + esc(result.story.id) + "</span>"
        : "") +
      "</div></header>";

    var body = (result.sections || []).map(renderSection).join("");

    var gaps =
      result.honestyGaps && result.honestyGaps.length
        ? '<aside class="gsm-gaps" aria-label="Honest gaps"><h2>Honest gaps</h2><ul>' +
          result.honestyGaps
            .map(function (g) {
              return "<li>" + esc(g) + "</li>";
            })
            .join("") +
          "</ul></aside>"
        : "";

    var explore =
      result.deepLinks && result.deepLinks.length
        ? '<section class="gsm-section" aria-labelledby="gsm-explore"><h2 id="gsm-explore">Explore modules</h2><ul class="gsm-deeplinks">' +
          result.deepLinks
            .map(function (l) {
              return (
                '<li><a href="' + esc(l.href) + '">' + esc(l.label) + "</a></li>"
              );
            })
            .join("") +
          "</ul></section>"
        : "";

    return (
      '<div class="gsm-briefing" data-gsm-state="assembled" data-gsm-story="' +
      esc((result.story && result.story.id) || "") +
      '">' +
      head +
      toc +
      body +
      explore +
      gaps +
      "</div>"
    );
  }

  function renderShell(store, lastResult) {
    var stories = (store.seeds.stories || [])
      .map(function (s) {
        var active =
          lastResult && lastResult.story && lastResult.story.id === s.id ? "true" : "false";
        return (
          '<li><button type="button" class="gsm-story-btn" data-gsm-story="' +
          esc(s.id) +
          '" aria-pressed="' +
          active +
          '">' +
          "<span>" +
          esc(s.title) +
          "</span>" +
          (s.dek ? '<small>' + esc(s.dek) + "</small>" : "") +
          "</button></li>"
        );
      })
      .join("");

    return (
      renderBanner(store.seeds, store.graph) +
      '<section class="gsm-picker" aria-label="Curated stories">' +
      "<h2>Curated briefings</h2>" +
      '<p class="gsm-muted">Each story references existing entity, edge, and article IDs. Assembly traverses the graph — it does not generate claims.</p>' +
      "<ul>" +
      stories +
      "</ul></section>" +
      '<div data-gsm-output aria-live="polite">' +
      renderBriefing(lastResult || { status: "empty-key" }) +
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
    var relUrl =
      options.relationshipsUrl || "../../../data/global-signals/relationships/relationships.json";
    var seedsUrl = options.seedsUrl || "../../../data/global-signals/story/story-seeds.json";
    var industriesUrl =
      options.industriesUrl || "../../../data/global-signals/industries/industries.json";
    var countriesUrl =
      options.countriesUrl || "../../../data/global-signals/countries/countries.json";
    var citizenUrl =
      options.citizenImpactUrl || "../../../data/global-signals/citizen-impact/citizen-impact.json";
    var articlesUrl = options.articlesUrl || "../../../data/global-signals/articles/articles.json";

    el.setAttribute("data-gsm-state", "loading");
    el.innerHTML = '<p class="gsm-loading" role="status">Loading Story Mode…</p>';

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

        var lastResult = { status: "empty-key" };
        el.setAttribute("data-gsm-state", "ready");

        function run(key, pushQuery) {
          var result = assemble(key, store);
          lastResult = result;
          if (pushQuery !== false) {
            var id = result.story && result.story.id ? result.story.id : key || "";
            setQueryParam("id", id || "");
          }
          el.innerHTML = renderShell(store, lastResult);
          return result;
        }

        el.addEventListener("click", function (ev) {
          var btn = ev.target.closest("[data-gsm-story]");
          if (!btn || !el.contains(btn)) return;
          ev.preventDefault();
          run(btn.getAttribute("data-gsm-story") || "", true);
        });

        var initial =
          queryParam("id") ||
          queryParam("story") ||
          options.initialStoryId ||
          store.seeds.defaultStoryId ||
          "";
        run(initial, false);

        return {
          store: store,
          assemble: function (key) {
            return run(key, true);
          },
          getLastResult: function () {
            return lastResult;
          }
        };
      })
      .catch(function (err) {
        el.setAttribute("data-gsm-state", "error");
        el.innerHTML =
          '<div class="gsm-briefing" data-gsm-state="error" role="alert">' +
          "<h2>Could not load Story Mode</h2>" +
          "<p>" +
          esc(err && err.message ? err.message : "Unknown error") +
          "</p>" +
          '<p class="gsm-empty">We will not invent a briefing while data is unavailable.</p></div>';
        return null;
      });
  }

  GS.story = {
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    normalizeQuery: normalizeQuery,
    normalizeGraph: normalizeGraph,
    normalizeSeeds: normalizeSeeds,
    normalizeStoryDef: normalizeStoryDef,
    typeLabel: typeLabel,
    resolveStory: resolveStory,
    traverse: traverse,
    traverseForward: traverseForward,
    assembleStory: assembleStory,
    assemble: assemble,
    indexLinked: indexLinked,
    weakestConfidence: weakestConfidence,
    furthestHorizon: furthestHorizon,
    renderBriefing: renderBriefing,
    SECTION_TITLES: SECTION_TITLES,
    mount: mount
  };
})(typeof window !== "undefined" ? window : globalThis);
