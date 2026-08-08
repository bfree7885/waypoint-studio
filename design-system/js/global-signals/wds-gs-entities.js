/**
 * Global Signals — shared Entity System shell.
 * One layout for countries, industries, articles, citizen-impact, and graph entities.
 * Does not invent missing sections; empty states are honest.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var CONFIDENCE_ALLOWED = ["Observed", "High", "Medium", "Low", "Unknown"];
  var HORIZON_ALLOWED = ["Immediate", "Days", "Weeks", "Months", "Long-term"];

  var SECTION_DEFS = [
    { id: "overview", title: "Overview" },
    { id: "waypoints-take", title: "Waypoint’s Take" },
    { id: "relationship-graph", title: "Relationship Graph" },
    { id: "related-articles", title: "Related Articles" },
    { id: "dependencies", title: "Dependencies" },
    { id: "dependent-entities", title: "Dependent Entities" },
    { id: "current-risks", title: "Current Risks" },
    { id: "time-horizon", title: "Time Horizon" },
    { id: "confidence", title: "Confidence" }
  ];

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
    var compact = String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");
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
    return mapped[compact] || "Unknown";
  }

  function typeLabel(type) {
    var labels = {
      country: "Country",
      industry: "Industry",
      article: "Article",
      "citizen-impact": "Citizen Impact",
      port: "Port",
      company: "Company",
      commodity: "Commodity",
      policy: "Policy",
      conflict: "Conflict",
      tariff: "Tariff",
      weather: "Weather"
    };
    return labels[type] || String(type || "Entity");
  }

  function resolveDataUrl(dataUrl, depth) {
    if (dataUrl) return dataUrl;
    var d = typeof depth === "number" ? depth : 3;
    var prefix = "";
    for (var i = 0; i < d; i++) prefix += "../";
    return prefix + "data/global-signals/entities/entities.json";
  }

  function graphFocusHref(focusId, depth) {
    var d = typeof depth === "number" ? depth : 5;
    var prefix = "";
    for (var i = 0; i < d - 2; i++) prefix += "../";
    // Prefer Relationship Explorer cascade UX; focus= is the Entity System contract.
    if (!focusId) return prefix + "relationships/";
    return (
      prefix +
      "relationships/?focus=" +
      encodeURIComponent(focusId) +
      "&entity=" +
      encodeURIComponent(focusId)
    );
  }

  function entityHref(type, slug, depth) {
    var d = typeof depth === "number" ? depth : 5;
    var prefix = "";
    for (var i = 0; i < d - 2; i++) prefix += "../";
    return prefix + "entities/" + encodeURIComponent(type) + "/" + encodeURIComponent(slug) + "/";
  }

  function articleHref(id, depth) {
    var d = typeof depth === "number" ? depth : 5;
    var prefix = "";
    for (var i = 0; i < d - 2; i++) prefix += "../";
    return prefix + "articles/?id=" + encodeURIComponent(id);
  }

  function normalizeLink(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var name = String(raw.name || raw.label || raw.headline || "").trim();
    if (!id && !name) return null;
    return {
      id: id || null,
      type: String(raw.type || "").trim() || null,
      slug: String(raw.slug || "").trim() || null,
      name: name || id,
      relation: String(raw.relation || raw.relationType || "").trim(),
      why: String(raw.why || raw.detail || raw.summary || "").trim(),
      confidence: normalizeConfidence(raw.confidence, { predicted: true }),
      timeHorizon: normalizeTimeHorizon(raw.timeHorizon || raw.horizon),
      href: String(raw.href || "").trim() || null
    };
  }

  function normalizeEntity(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var type = String(raw.type || "").trim();
    var slug = String(raw.slug || "").trim();
    if (!id || !type || !slug) return null;
    var take = raw.waypointsTake || raw.waypointTake || {};
    if (typeof take === "string") take = { analysis: take };
    var overview = raw.overview || {};
    if (typeof overview === "string") overview = { text: overview };

    return {
      id: id,
      type: type,
      slug: slug,
      name: String(raw.name || raw.label || slug).trim(),
      summary: String(raw.summary || "").trim(),
      moduleIds: raw.moduleIds || {},
      overview: {
        text: String(overview.text || raw.summary || "").trim(),
        confidence: normalizeConfidence(overview.confidence || raw.confidence),
        timeHorizon: normalizeTimeHorizon(overview.timeHorizon || raw.timeHorizon),
        events: Array.isArray(overview.events) ? overview.events : []
      },
      relatedArticles: Array.isArray(raw.relatedArticles)
        ? raw.relatedArticles
            .map(function (a) {
              if (typeof a === "string") return { id: a, headline: a };
              return {
                id: String(a.id || "").trim(),
                headline: String(a.headline || a.id || "").trim()
              };
            })
            .filter(function (a) {
              return a.id;
            })
        : [],
      waypointsTake: {
        whyItMatters: String(take.whyItMatters || "").trim(),
        analysis: String(take.analysis || "").trim()
      },
      relationshipGraph: raw.relationshipGraph || {},
      dependencies: (raw.dependencies || []).map(normalizeLink).filter(Boolean),
      dependentEntities: (raw.dependentEntities || raw.dependentIndustries || [])
        .map(normalizeLink)
        .filter(Boolean),
      currentRisks: Array.isArray(raw.currentRisks)
        ? raw.currentRisks
            .map(function (r) {
              if (!r || typeof r !== "object") return null;
              var title = String(r.title || r.label || "").trim();
              if (!title) return null;
              return {
                title: title,
                summary: String(r.summary || r.detail || "").trim(),
                confidence: normalizeConfidence(r.confidence, { predicted: true }),
                timeHorizon: normalizeTimeHorizon(r.timeHorizon || r.horizon),
                label: String(r.label || "").trim()
              };
            })
            .filter(Boolean)
        : [],
      citizenImpacts: Array.isArray(raw.citizenImpacts) ? raw.citizenImpacts : [],
      aliases: raw.aliases || {},
      confidence: normalizeConfidence(raw.confidence || overview.confidence),
      timeHorizon: normalizeTimeHorizon(raw.timeHorizon || overview.timeHorizon),
      provenance: raw.provenance || {}
    };
  }

  function normalizeBundle(data) {
    data = data || {};
    var entities = (data.entities || []).map(normalizeEntity).filter(Boolean);
    var byKey = {};
    entities.forEach(function (e) {
      byKey[e.type + "::" + e.slug] = e;
      byKey[e.id] = e;
    });
    return {
      version: data.version || "",
      mode: data.mode || "sample-demo",
      modeLabel: data.modeLabel || "Sample / demo",
      honesty: data.honesty || {},
      types: data.types || [],
      counts: data.counts || {},
      crossLinks: data.crossLinks || {},
      entities: entities,
      byKey: byKey
    };
  }

  function metaPills(entity) {
    return (
      '<div class="gse-meta-row" aria-label="Entity metadata">' +
      '<span class="gse-pill"><strong>Type</strong> ' +
      esc(typeLabel(entity.type)) +
      "</span>" +
      '<span class="gse-pill"><strong>ID</strong> ' +
      esc(entity.id) +
      "</span>" +
      '<span class="gse-pill"><strong>Confidence</strong> ' +
      esc(entity.confidence) +
      "</span>" +
      '<span class="gse-pill"><strong>Horizon</strong> ' +
      esc(entity.timeHorizon) +
      "</span>" +
      "</div>"
    );
  }

  function renderToc() {
    return (
      '<nav class="gse-toc" aria-label="Entity sections">' +
      "<h2>On this page</h2>" +
      "<ol>" +
      SECTION_DEFS.map(function (s) {
        return (
          '<li><a href="#gse-' +
          esc(s.id) +
          '">' +
          esc(s.title) +
          "</a></li>"
        );
      }).join("") +
      "</ol></nav>"
    );
  }

  function renderLinkList(items, emptyMsg, depth) {
    if (!items || !items.length) {
      return '<p class="gse-empty-inline" role="status">' + esc(emptyMsg) + "</p>";
    }
    return (
      '<ul class="gse-list">' +
      items
        .map(function (item) {
          var href =
            item.href ||
            (item.type && item.slug ? entityHref(item.type, item.slug, depth) : null);
          var title = href
            ? '<a href="' + esc(href) + '">' + esc(item.name) + "</a>"
            : esc(item.name);
          return (
            '<li class="gse-card">' +
            "<h3>" +
            title +
            "</h3>" +
            (item.relation
              ? '<p class="gse-note">' + esc(item.relation) + "</p>"
              : "") +
            (item.why ? "<p>" + esc(item.why) + "</p>" : "") +
            '<p class="gse-note">Confidence: ' +
            esc(item.confidence) +
            " · Horizon: " +
            esc(item.timeHorizon) +
            "</p>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderDetail(entity, bundle, depth) {
    var banner =
      (bundle.honesty && bundle.honesty.banner) ||
      "Sample / demo entity — not a live intelligence feed.";
    var focusId =
      (entity.relationshipGraph && entity.relationshipGraph.entityId) ||
      entity.moduleIds.graph ||
      (String(entity.id).indexOf("gsn_") === 0 ? entity.id : null);
    var graphHref =
      (entity.relationshipGraph && entity.relationshipGraph.href) ||
      graphFocusHref(focusId, depth);
    var graphNote =
      (entity.relationshipGraph && entity.relationshipGraph.note) ||
      (focusId
        ? "Opens Relationship Explorer focused on this entity (?focus=)."
        : "No graph focus id mapped yet — explorer remains available.");

    var take = entity.waypointsTake || {};
    var takeEmpty = !take.whyItMatters && !take.analysis;

    var articlesHtml;
    if (!entity.relatedArticles.length) {
      articlesHtml =
        '<p class="gse-empty-inline" role="status">No related articles tagged for this entity.</p>';
    } else {
      articlesHtml =
        '<ul class="gse-list">' +
        entity.relatedArticles
          .map(function (a) {
            return (
              '<li class="gse-card"><h3><a href="' +
              esc(articleHref(a.id, depth)) +
              '">' +
              esc(a.headline || a.id) +
              "</a></h3>" +
              '<p class="gse-note">' +
              esc(a.id) +
              "</p></li>"
            );
          })
          .join("") +
        "</ul>";
    }

    var risksHtml;
    if (!entity.currentRisks.length) {
      risksHtml =
        '<p class="gse-empty-inline" role="status">No current risks tagged. Empty means unknown — not “no risk.”</p>';
    } else {
      risksHtml =
        '<ul class="gse-list">' +
        entity.currentRisks
          .map(function (r) {
            return (
              '<li class="gse-card"><h3>' +
              esc(r.title) +
              "</h3>" +
              (r.summary ? "<p>" + esc(r.summary) + "</p>" : "") +
              '<p class="gse-note">Confidence: ' +
              esc(r.confidence) +
              " · Horizon: " +
              esc(r.timeHorizon) +
              (r.label ? " · " + esc(r.label) : "") +
              "</p></li>"
            );
          })
          .join("") +
        "</ul>";
    }

    var aliasBits = [];
    if (entity.aliases.countryPath) {
      aliasBits.push(
        '<a href="' + esc(entity.aliases.countryPath) + '">Country Intelligence page</a>'
      );
    }
    if (entity.aliases.industryPath) {
      aliasBits.push(
        '<a href="' + esc(entity.aliases.industryPath) + '">Industry Intelligence page</a>'
      );
    }
    if (entity.aliases.articlesPath) {
      aliasBits.push(
        '<a href="' + esc(entity.aliases.articlesPath) + '">Articles feed entry</a>'
      );
    }
    if (entity.aliases.citizenImpactPath) {
      aliasBits.push(
        '<a href="' + esc(entity.aliases.citizenImpactPath) + '">Citizen Impact board</a>'
      );
    }

    return (
      '<div class="gse-detail" data-gse-id="' +
      esc(entity.id) +
      '">' +
      '<p class="gse-banner" role="note"><strong>' +
      esc(bundle.modeLabel || "Sample / demo") +
      "</strong> — " +
      esc(banner) +
      "</p>" +
      '<header class="gse-detail__head">' +
      '<p class="gse-eyebrow">' +
      esc(typeLabel(entity.type)) +
      " entity</p>" +
      "<h1>" +
      esc(entity.name) +
      "</h1>" +
      (entity.summary ? "<p>" + esc(entity.summary) + "</p>" : "") +
      metaPills(entity) +
      (aliasBits.length
        ? '<p class="gse-alias">Also available as: ' + aliasBits.join(" · ") + "</p>"
        : "") +
      "</header>" +
      renderToc() +
      '<section class="gse-section" id="gse-overview" aria-labelledby="gse-overview-title">' +
      '<h2 id="gse-overview-title">Overview</h2>' +
      (entity.overview.text
        ? '<p class="gse-prose">' + esc(entity.overview.text) + "</p>"
        : '<p class="gse-empty-inline" role="status">Overview not available for this entity.</p>') +
      "</section>" +
      '<section class="gse-section" id="gse-waypoints-take" aria-labelledby="gse-take-title">' +
      '<div class="gse-take' +
      (takeEmpty ? " gse-take--empty" : "") +
      '">' +
      '<h2 id="gse-take-title">Waypoint’s Take</h2>' +
      '<p class="gse-note">Analysis · not established fact</p>' +
      (takeEmpty
        ? '<p class="gse-empty-inline" role="status">No Waypoint’s Take yet for this entity. We will not invent analysis.</p>'
        : (take.whyItMatters
            ? "<p><strong>Why it matters.</strong> " + esc(take.whyItMatters) + "</p>"
            : "") +
          (take.analysis
            ? "<p><strong>Analysis.</strong> " + esc(take.analysis) + "</p>"
            : "")) +
      "</div></section>" +
      '<section class="gse-section" id="gse-relationship-graph" aria-labelledby="gse-graph-title">' +
      '<h2 id="gse-graph-title">Relationship Graph</h2>' +
      '<div class="gse-graph-panel">' +
      '<p class="gse-prose">' +
      esc(graphNote) +
      "</p>" +
      (focusId
        ? '<p class="gse-note">Graph focus id: <code>' + esc(focusId) + "</code></p>"
        : '<p class="gse-note">No curated focus id — open the explorer without a preset focus.</p>') +
      '<p><a class="gs-cta gs-cta--primary" href="' +
      esc(graphHref) +
      '">' +
      (focusId ? "Open focused Relationship Explorer" : "Open Relationship Explorer") +
      "</a></p>" +
      "</div></section>" +
      '<section class="gse-section" id="gse-related-articles" aria-labelledby="gse-articles-title">' +
      '<h2 id="gse-articles-title">Related Articles</h2>' +
      articlesHtml +
      "</section>" +
      '<section class="gse-section" id="gse-dependencies" aria-labelledby="gse-deps-title">' +
      '<h2 id="gse-deps-title">Dependencies</h2>' +
      '<p class="gse-note">What this entity depends on (incoming links / tagged dependencies).</p>' +
      renderLinkList(
        entity.dependencies,
        "No dependencies tagged. Empty is honest — we will not invent links.",
        depth
      ) +
      "</section>" +
      '<section class="gse-section" id="gse-dependent-entities" aria-labelledby="gse-dependents-title">' +
      '<h2 id="gse-dependents-title">Dependent Entities</h2>' +
      '<p class="gse-note">What depends on this entity (downstream / related entities).</p>' +
      renderLinkList(
        entity.dependentEntities,
        "No dependent entities tagged yet.",
        depth
      ) +
      "</section>" +
      '<section class="gse-section" id="gse-current-risks" aria-labelledby="gse-risks-title">' +
      '<h2 id="gse-risks-title">Current Risks</h2>' +
      '<p class="gse-note">Risks are illustrative or curated — never Observed live news in this sample mode.</p>' +
      risksHtml +
      "</section>" +
      '<section class="gse-section" id="gse-time-horizon" aria-labelledby="gse-horizon-title">' +
      '<h2 id="gse-horizon-title">Time Horizon</h2>' +
      '<p class="gse-prose">Primary horizon for this entity overview: <strong>' +
      esc(entity.timeHorizon) +
      "</strong>.</p>" +
      '<p class="gse-note">Allowed values: ' +
      esc(HORIZON_ALLOWED.join(", ")) +
      ". Missing values normalize to Unknown.</p>" +
      "</section>" +
      '<section class="gse-section" id="gse-confidence" aria-labelledby="gse-confidence-title">' +
      '<h2 id="gse-confidence-title">Confidence</h2>' +
      '<p class="gse-prose">Primary confidence for this entity overview: <strong>' +
      esc(entity.confidence) +
      "</strong>.</p>" +
      '<p class="gse-note">Allowed values: ' +
      esc(CONFIDENCE_ALLOWED.join(", ")) +
      ". Predicted surfaces must never claim Observed.</p>" +
      "</section>" +
      "</div>"
    );
  }

  function renderIndex(bundle, typeFilter) {
    var banner =
      (bundle.honesty && bundle.honesty.banner) ||
      "Sample / demo entity registry — not a live feed.";
    var types = bundle.types && bundle.types.length ? bundle.types : [];
    var entities = bundle.entities;
    if (typeFilter) {
      entities = entities.filter(function (e) {
        return e.type === typeFilter;
      });
    }

    var typeCards = types
      .map(function (t) {
        var count = (bundle.counts && bundle.counts[t]) || 0;
        return (
          '<li><a class="gse-type-card" href="./' +
          esc(t) +
          '/"><strong>' +
          esc(typeLabel(t)) +
          "</strong><span>" +
          esc(String(count)) +
          " entities</span></a></li>"
        );
      })
      .join("");

    var entityCards = entities
      .map(function (e) {
        var href = typeFilter ? "./" + encodeURIComponent(e.slug) + "/" : "./" + encodeURIComponent(e.type) + "/" + encodeURIComponent(e.slug) + "/";
        return (
          '<li><a class="gse-entity-card" href="' +
          esc(href) +
          '"><strong>' +
          esc(e.name) +
          "</strong><span>" +
          esc(typeLabel(e.type)) +
          " · " +
          esc(e.id) +
          "</span></a></li>"
        );
      })
      .join("");

    return (
      '<div class="gse-index">' +
      '<p class="gse-banner" role="note"><strong>' +
      esc(bundle.modeLabel || "Sample / demo") +
      "</strong> — " +
      esc(banner) +
      "</p>" +
      '<header class="gse-index__head">' +
      '<p class="gse-eyebrow">Global Signals</p>' +
      "<h1>" +
      (typeFilter ? esc(typeLabel(typeFilter)) + " entities" : "Entity System") +
      "</h1>" +
      "<p>One shared layout for countries, industries, articles, citizen impact, and related graph entities. Empty sections stay empty.</p>" +
      '<p class="gse-hub-nav"><a class="gs-cta" href="../">← Global Signals</a>' +
      (typeFilter ? '<a class="gs-cta" href="../">← All entity types</a>' : "") +
      "</p>" +
      "</header>" +
      (!typeFilter && typeCards
        ? '<section class="gse-section" aria-labelledby="gse-types-title"><h2 id="gse-types-title">Entity types</h2><ul class="gse-type-grid">' +
          typeCards +
          "</ul></section>"
        : "") +
      '<section class="gse-section" aria-labelledby="gse-list-title"><h2 id="gse-list-title">' +
      (typeFilter ? esc(typeLabel(typeFilter)) + " list" : "All entities") +
      "</h2>" +
      (entityCards
        ? '<ul class="gse-entity-grid">' + entityCards + "</ul>"
        : '<p class="gse-empty" role="status">No entities in this view.</p>') +
      "</section></div>"
    );
  }

  async function loadEntities(opts) {
    opts = opts || {};
    var url = resolveDataUrl(opts.dataUrl, opts.depth);
    var res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return normalizeBundle(await res.json());
  }

  async function mount(root, opts) {
    if (!root) return null;
    opts = opts || {};
    var depth = typeof opts.depth === "number" ? opts.depth : 3;
    var type = opts.type || root.getAttribute("data-gse-type") || null;
    var slug = opts.slug || root.getAttribute("data-gse-slug") || null;

    root.setAttribute("aria-busy", "true");
    root.setAttribute("data-gse-state", "loading");
    root.innerHTML = '<p class="gse-empty" role="status">Loading entity…</p>';

    try {
      var bundle = await loadEntities(opts);
      root.setAttribute("aria-busy", "false");

      if (!bundle.entities.length) {
        root.setAttribute("data-gse-state", "empty");
        root.innerHTML =
          '<p class="gse-empty" role="status">Entity registry is empty. We will not invent entities.</p>';
        return bundle;
      }

      if (type && slug) {
        var entity = bundle.byKey[type + "::" + slug];
        if (!entity) {
          root.setAttribute("data-gse-state", "empty");
          root.innerHTML =
            '<p class="gse-empty" role="alert">Entity not found. <a href="../">Back to entities</a></p>';
          return bundle;
        }
        root.setAttribute("data-gse-state", "ready");
        root.innerHTML = renderDetail(entity, bundle, depth);
        try {
          document.title =
            entity.name + " — " + typeLabel(entity.type) + " · Global Signals";
        } catch (e) {}
        return bundle;
      }

      root.setAttribute("data-gse-state", "ready");
      root.innerHTML = renderIndex(bundle, type || null);
      return bundle;
    } catch (err) {
      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gse-state", "error");
      root.innerHTML =
        '<p class="gse-empty" role="alert">Entity registry could not be loaded. Empty is honest — we will not invent content.</p>';
      return { error: err, entities: [] };
    }
  }

  GS.entities = {
    mount: mount,
    loadEntities: loadEntities,
    normalizeBundle: normalizeBundle,
    normalizeEntity: normalizeEntity,
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    renderDetail: renderDetail,
    renderIndex: renderIndex,
    graphFocusHref: graphFocusHref,
    typeLabel: typeLabel,
    SECTION_DEFS: SECTION_DEFS,
    CONFIDENCE_ALLOWED: CONFIDENCE_ALLOWED,
    HORIZON_ALLOWED: HORIZON_ALLOWED
  };
})(typeof window !== "undefined" ? window : globalThis);
