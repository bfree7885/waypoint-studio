/**
 * Global Signals Citizen Impact — category sections (sample/demo).
 * Translates geopolitics into everyday literacy. Does not invent live claims.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var CONFIDENCE_ALLOWED = ["Observed", "High", "Medium", "Low", "Unknown"];
  var HORIZON_ALLOWED = ["Immediate", "Days", "Weeks", "Months", "Long-term"];
  var REQUIRED_SECTIONS = [
    "food",
    "fuel",
    "utilities",
    "housing",
    "travel",
    "healthcare",
    "insurance",
    "technology"
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Normalize confidence. Invalid/missing → Unknown. Never invent Observed. */
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

  function normalizeStringList(value) {
    if (!value) return [];
    if (!Array.isArray(value)) value = [value];
    return value
      .map(function (v) {
        return String(v == null ? "" : v).trim();
      })
      .filter(Boolean);
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

  function normalizeCauseChain(rawChain) {
    if (!Array.isArray(rawChain)) return [];
    return rawChain
      .map(function (step) {
        if (!step || typeof step !== "object") return null;
        var label = String(step.label || "").trim();
        if (!label) return null;
        return {
          entityId: String(step.entityId || "").trim() || null,
          label: label,
          type: String(step.type || step.kind || "unknown").trim() || "unknown",
          confidence: normalizeConfidence(step.confidence, { predicted: true }),
          timeframe: normalizeTimeHorizon(step.timeframe || step.horizon),
          explanation: String(step.explanation || "").trim()
        };
      })
      .filter(Boolean);
  }

  function normalizeEvidence(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(function (item) {
        if (!item || typeof item !== "object") return null;
        var id = String(item.id || "").trim();
        var label = String(item.label || "").trim();
        if (!id && !label) return null;
        return {
          id: id || null,
          label: label || "Evidence label unavailable",
          url: item.url || null,
          kind: String(item.kind || "citation").trim() || "citation"
        };
      })
      .filter(Boolean);
  }

  function normalizeStatement(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    if (!id) return null;
    return {
      id: id,
      whatChanged: String(raw.whatChanged || raw.what || "").trim(),
      why: String(raw.why || "").trim(),
      causedBy: String(raw.causedBy || raw.whatCausedIt || "").trim(),
      confidence: normalizeConfidence(raw.confidence, { predicted: true }),
      timeHorizon: normalizeTimeHorizon(raw.timeHorizon || raw.horizon),
      entityIds: normalizeStringList(raw.entityIds),
      relatedArticleIds: normalizeStringList(raw.relatedArticleIds || raw.articleIds),
      evidence: normalizeEvidence(raw.evidence),
      causeChain: normalizeCauseChain(raw.causeChain || raw.likelyImpactPath)
    };
  }

  function normalizeSection(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim().toLowerCase();
    if (!id) return null;
    var statements = Array.isArray(raw.statements)
      ? raw.statements.map(normalizeStatement).filter(Boolean)
      : [];
    return {
      id: id,
      label: String(raw.label || id).trim() || id,
      blurb: String(raw.blurb || raw.summary || "").trim(),
      graphNodeId: String(raw.graphNodeId || ("gsci_" + id)).trim(),
      statements: statements
    };
  }

  function indexEntities(list) {
    var map = Object.create(null);
    if (!Array.isArray(list)) return map;
    list.forEach(function (e) {
      if (!e || !e.id) return;
      map[e.id] = {
        id: e.id,
        type: String(e.type || "unknown").trim() || "unknown",
        label: String(e.label || e.id).trim() || e.id
      };
    });
    return map;
  }

  function normalizeBundle(raw) {
    raw = raw || {};
    var sections = Array.isArray(raw.sections)
      ? raw.sections.map(normalizeSection).filter(Boolean)
      : [];
    var byId = Object.create(null);
    sections.forEach(function (s) {
      byId[s.id] = s;
    });
    var order = Array.isArray(raw.sectionOrder) && raw.sectionOrder.length
      ? raw.sectionOrder.map(function (id) {
          return String(id).trim().toLowerCase();
        })
      : REQUIRED_SECTIONS.slice();
    var ordered = order
      .map(function (id) {
        return (
          byId[id] || {
            id: id,
            label: id.charAt(0).toUpperCase() + id.slice(1),
            blurb: "",
            statements: []
          }
        );
      })
      .filter(function (s) {
        return REQUIRED_SECTIONS.indexOf(s.id) !== -1;
      });
    // Include any extra known sections after required order (ignored for V1 UI)
    return {
      version: String(raw.version || "").trim() || null,
      mode: raw.mode || null,
      modeLabel: raw.modeLabel || null,
      honesty: raw.honesty || null,
      linkage: raw.linkage || null,
      entities: indexEntities(raw.entities),
      sections: ordered
    };
  }

  function renderBanner(bundle) {
    if (!bundle || bundle.mode !== "sample-demo") return "";
    var label = bundle.modeLabel || "Sample / demo dataset";
    var honesty =
      (bundle.honesty && bundle.honesty.banner) ||
      "Sample / demo dataset — not a live citizen-impact feed.";
    return (
      '<div class="gsc-banner" role="status">' +
      '<p class="gsc-badge">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(honesty) +
      "</p>" +
      "</div>"
    );
  }

  function renderField(title, body, opts) {
    opts = opts || {};
    var empty = !body || !String(body).trim();
    var note = opts.note
      ? '<p class="gsc-note">' + esc(opts.note) + "</p>"
      : "";
    return (
      '<div class="gsc-field">' +
      "<h4>" +
      esc(title) +
      "</h4>" +
      note +
      "<p" +
      (empty ? ' class="gsc-empty-inline"' : "") +
      ">" +
      esc(empty ? opts.empty || "Unavailable" : body) +
      "</p>" +
      "</div>"
    );
  }

  function renderCauseChain(chain) {
    if (!chain || !chain.length) {
      return '<p class="gsc-empty-inline">Cause chain not tagged for this statement.</p>';
    }
    var items = chain
      .map(function (step, i) {
        return (
          '<li class="gsc-chain__step" data-type="' +
          esc(step.type) +
          '"' +
          (step.entityId ? ' data-entity-id="' + esc(step.entityId) + '"' : "") +
          ">" +
          '<div class="gsc-chain__node">' +
          '<span class="gsc-chain__label">' +
          esc(step.label) +
          "</span>" +
          (step.entityId
            ? '<code class="gsc-id" title="Entity id">' + esc(step.entityId) + "</code>"
            : "") +
          '<span class="gsc-badge gsc-badge--confidence" data-confidence="' +
          esc(step.confidence) +
          '">' +
          esc(step.confidence) +
          "</span>" +
          '<span class="gsc-badge">' +
          esc(step.timeframe) +
          "</span>" +
          "</div>" +
          (step.explanation
            ? '<p class="gsc-chain__explain">' + esc(step.explanation) + "</p>"
            : "") +
          (i < chain.length - 1
            ? '<span class="gsc-chain__arrow" aria-hidden="true">↓</span>'
            : "") +
          "</li>"
        );
      })
      .join("");
    return (
      '<ol class="gsc-chain" aria-label="Cause chain">' + items + "</ol>"
    );
  }

  function renderEvidence(list) {
    if (!list || !list.length) {
      return '<p class="gsc-empty-inline">Evidence not tagged.</p>';
    }
    return (
      '<ul class="gsc-evidence">' +
      list
        .map(function (item) {
          var label = esc(item.label);
          var link = isSafeHttpUrl(item.url)
            ? '<a href="' +
              esc(item.url) +
              '" rel="noopener noreferrer" target="_blank">' +
              label +
              "</a>"
            : label;
          return (
            "<li>" +
            link +
            (item.id
              ? ' <code class="gsc-id" title="Evidence id">' + esc(item.id) + "</code>"
              : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderEntityChips(ids, entityMap) {
    if (!ids || !ids.length) {
      return '<p class="gsc-empty-inline">No entity ids tagged.</p>';
    }
    entityMap = entityMap || {};
    return (
      '<ul class="gsc-chips" aria-label="Related entities">' +
      ids
        .map(function (id) {
          var ent = entityMap[id];
          var label = ent ? ent.label : id;
          return (
            "<li>" +
            '<span class="gsc-chip__label">' +
            esc(label) +
            "</span>" +
            ' <code class="gsc-id">' +
            esc(id) +
            "</code>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderArticleLinks(ids) {
    if (!ids || !ids.length) {
      return '<p class="gsc-empty-inline">No related articles tagged.</p>';
    }
    return (
      '<ul class="gsc-related">' +
      ids
        .map(function (id) {
          return (
            "<li><a href=\"../articles/?id=" +
            encodeURIComponent(id) +
            '">' +
            esc(id) +
            "</a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderStatement(statement, entityMap) {
    return (
      '<article class="gsc-statement" data-gsc-id="' +
      esc(statement.id) +
      '" id="' +
      esc(statement.id) +
      '">' +
      '<header class="gsc-statement__head">' +
      '<p class="gsc-statement__meta">' +
      '<span class="gsc-badge gsc-badge--confidence" data-confidence="' +
      esc(statement.confidence) +
      '">Confidence · ' +
      esc(statement.confidence) +
      "</span>" +
      '<span class="gsc-badge">Horizon · ' +
      esc(statement.timeHorizon) +
      "</span>" +
      '<code class="gsc-id" title="Statement id">' +
      esc(statement.id) +
      "</code>" +
      "</p>" +
      "</header>" +
      renderField("What changed?", statement.whatChanged, {
        note: "Reported / sample facts — not live news",
        empty: "What changed is unavailable."
      }) +
      renderField("Why?", statement.why, {
        note: "Analysis · interpretation, not established fact",
        empty: "Why is unavailable. We will not invent one."
      }) +
      renderField("What caused it?", statement.causedBy, {
        empty: "Cause summary unavailable."
      }) +
      '<div class="gsc-field">' +
      "<h4>How confident are we?</h4>" +
      '<p><span class="gsc-badge gsc-badge--confidence" data-confidence="' +
      esc(statement.confidence) +
      '">' +
      esc(statement.confidence) +
      "</span></p>" +
      '<p class="gsc-note">Downstream / predicted impacts never use Observed.</p>' +
      "</div>" +
      '<div class="gsc-field">' +
      "<h4>Expected time horizon</h4>" +
      '<p><span class="gsc-badge">' +
      esc(statement.timeHorizon) +
      "</span></p>" +
      "</div>" +
      '<div class="gsc-field">' +
      "<h4>Cause chain</h4>" +
      '<p class="gsc-note">Structured relationship path — not a full graph UI. Predicted hops never use Observed.</p>' +
      renderCauseChain(statement.causeChain) +
      "</div>" +
      '<div class="gsc-field">' +
      "<h4>Evidence</h4>" +
      renderEvidence(statement.evidence) +
      "</div>" +
      '<div class="gsc-field">' +
      "<h4>Related entities</h4>" +
      renderEntityChips(statement.entityIds, entityMap) +
      "</div>" +
      '<div class="gsc-field">' +
      "<h4>Related articles</h4>" +
      renderArticleLinks(statement.relatedArticleIds) +
      "</div>" +
      "</article>"
    );
  }

  function renderSection(section, entityMap) {
    var body;
    if (!section.statements.length) {
      body =
        '<p class="gsc-empty" role="status">No material sample statements for this category yet. Empty is honest — we will not invent household impacts.</p>';
    } else {
      body = section.statements
        .map(function (st) {
          return renderStatement(st, entityMap);
        })
        .join("");
    }
    return (
      '<section class="gsc-section" id="section-' +
      esc(section.id) +
      '" data-gsc-section="' +
      esc(section.id) +
      '" aria-labelledby="gsc-h-' +
      esc(section.id) +
      '">' +
      '<header class="gsc-section__head">' +
      '<h2 id="gsc-h-' +
      esc(section.id) +
      '">' +
      esc(section.label) +
      "</h2>" +
      (section.blurb ? "<p class=\"gsc-section__blurb\">" + esc(section.blurb) + "</p>" : "") +
      sectionGraphCta(section) +
      "</header>" +
      body +
      "</section>"
    );
  }

  function renderToc(sections) {
    return (
      '<nav class="gsc-toc" aria-label="Citizen impact categories">' +
      "<p class=\"gsc-toc__label\">Categories</p>" +
      "<ul>" +
      sections
        .map(function (s) {
          return (
            '<li><a href="#section-' +
            esc(s.id) +
            '">' +
            esc(s.label) +
            "</a></li>"
          );
        })
        .join("") +
      "</ul></nav>"
    );
  }

  function citizenGraphFocusId(section) {
    if (!section) return "";
    if (section.graphNodeId) return String(section.graphNodeId).trim();
    var gl = GS.graphLinks;
    if (gl && gl.citizenFocusId) return gl.citizenFocusId(section.id);
    return section.id ? "gsci_" + section.id : "";
  }

  function sectionGraphCta(section) {
    var focusId = citizenGraphFocusId(section);
    if (!focusId) return "";
    var gl = GS.graphLinks;
    var href =
      gl && gl.focusUrl
        ? gl.focusUrl(focusId, { base: "../relationship-graph/" })
        : "../relationship-graph/?focus=" + encodeURIComponent(focusId);
    return (
      '<p class="gsc-section__graph">' +
      '<a class="gs-cta" href="' +
      esc(href) +
      '" data-gs-graph-focus="' +
      esc(focusId) +
      '">Open in Relationship Graph</a></p>'
    );
  }

  function renderLinkageNote(linkage) {
    if (!linkage) return "";
    var explorer =
      linkage.relationshipExplorerStatus ||
      "Primary exploration uses the Relationship Graph; Cascade Explorer remains available for linear paths.";
    return (
      '<aside class="gsc-linkage" aria-label="Relationship linkage">' +
      "<p><strong>Relationship model.</strong> Statements use stable entity ids (<code>gsn_*</code>), evidence ids, and cause chains aligned with Articles confidence and horizon vocabulary. Category nodes use <code>gsci_*</code> in the Relationship Graph.</p>" +
      "<p>" +
      esc(explorer) +
      "</p>" +
      '<p class="gsc-linkage__links">' +
      '<a class="gs-cta" href="../relationship-graph/">Explore in Relationship Graph</a>' +
      ' · <a href="../relationships/">Cascade Explorer</a>' +
      ' · <a href="../articles/">Articles</a>' +
      "</p>" +
      "</aside>"
    );
  }

  function resolveDataUrl(configured, depth) {
    if (configured) return configured;
    var prefix = "";
    for (var i = 0; i < (depth || 3); i++) prefix += "../";
    return prefix + "data/global-signals/citizen-impact/citizen-impact.json";
  }

  async function loadCitizenImpact(opts) {
    opts = opts || {};
    var url = resolveDataUrl(opts.dataUrl, opts.depth);
    var res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    return normalizeBundle(data);
  }

  async function mount(root, opts) {
    if (!root) return null;
    opts = opts || {};
    root.setAttribute("aria-busy", "true");
    root.setAttribute("data-gsc-state", "loading");
    root.innerHTML = '<p class="gsc-loading">Loading Citizen Impact…</p>';

    try {
      var bundle = await loadCitizenImpact(opts);
      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gsc-state", "ready");
      var count = bundle.sections.reduce(function (n, s) {
        return n + s.statements.length;
      }, 0);
      root.innerHTML =
        renderBanner(bundle) +
        renderLinkageNote(bundle.linkage) +
        '<p class="gsc-hub-count">' +
        bundle.sections.length +
        " categories · " +
        count +
        " demo statement" +
        (count === 1 ? "" : "s") +
        " · sample / demo</p>" +
        renderToc(bundle.sections) +
        '<div class="gsc-sections">' +
        bundle.sections
          .map(function (s) {
            return renderSection(s, bundle.entities);
          })
          .join("") +
        "</div>";
      return bundle;
    } catch (err) {
      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gsc-state", "error");
      root.innerHTML =
        '<div class="gsc-error" role="alert">' +
        "<p>Citizen Impact unavailable. Empty is honest — we will not invent household impacts.</p>" +
        "</div>";
      return { error: err, sections: [] };
    }
  }

  GS.citizenImpact = {
    mount: mount,
    loadCitizenImpact: loadCitizenImpact,
    normalizeBundle: normalizeBundle,
    normalizeSection: normalizeSection,
    normalizeStatement: normalizeStatement,
    normalizeCauseChain: normalizeCauseChain,
    normalizeEvidence: normalizeEvidence,
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    renderSection: renderSection,
    renderStatement: renderStatement,
    renderCauseChain: renderCauseChain,
    renderBanner: renderBanner,
    isSafeHttpUrl: isSafeHttpUrl,
    CONFIDENCE_ALLOWED: CONFIDENCE_ALLOWED,
    HORIZON_ALLOWED: HORIZON_ALLOWED,
    REQUIRED_SECTIONS: REQUIRED_SECTIONS
  };
})(typeof window !== "undefined" ? window : globalThis);
