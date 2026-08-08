/**
 * Global Signals Relationship Explorer — cascading "What depends on this?"
 * Loads labeled sample/demo JSON. Not a graph canvas. No AI.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var CONFIDENCE_ALLOWED = ["Observed", "High", "Medium", "Low", "Unknown"];
  var HORIZON_ALLOWED = ["Immediate", "Days", "Weeks", "Months", "Long-term"];
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

  function isSafeHttpUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
      var u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function typeLabel(type) {
    var key = String(type || "").trim().toLowerCase();
    if (key === "weather_event" || key === "weather-event") key = "weather";
    return TYPE_LABELS[key] || (key ? key : "Unknown");
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
    var kind = String(raw.kind || raw.mode || "sample-demo").trim() || "sample-demo";
    return {
      kind: kind,
      label: String(raw.label || raw.title || "").trim() || "Evidence label unavailable",
      url: raw.url || null,
      notes: String(raw.notes || "").trim()
    };
  }

  function normalizeEntity(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    if (!id) return null;
    var type = String(raw.type || "").trim().toLowerCase();
    if (type === "weather_event" || type === "weather-event") type = "weather";
    return {
      id: id,
      type: type || "unknown",
      label: String(raw.label || "").trim() || "Untitled entity",
      summary: String(raw.summary || "").trim(),
      selectable: Boolean(raw.selectable)
    };
  }

  function normalizeRelationship(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var from = String(raw.from || "").trim();
    var to = String(raw.to || "").trim();
    if (!id || !from || !to) return null;
    // Relationship hops are dependency/influence steps — never Observed
    return {
      id: id,
      from: from,
      to: to,
      relationType: String(raw.relationType || raw.type || "affects").trim() || "affects",
      why: String(raw.why || raw.explanation || "").trim(),
      confidence: normalizeConfidence(raw.confidence, { predicted: true }),
      timeHorizon: normalizeTimeHorizon(raw.timeHorizon || raw.timeframe || raw.timeDelay),
      evidence: normalizeEvidence(raw.evidence || raw.sources)
    };
  }

  function normalizeCascade(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var rootId = String(raw.rootId || raw.root || "").trim();
    if (!id || !rootId) return null;
    var edgeIds = Array.isArray(raw.edgeIds)
      ? raw.edgeIds.map(function (e) {
          return String(e || "").trim();
        }).filter(Boolean)
      : [];
    return {
      id: id,
      rootId: rootId,
      title: String(raw.title || "").trim(),
      summary: String(raw.summary || "").trim(),
      edgeIds: edgeIds
    };
  }

  function normalizeBundle(data) {
    data = data || {};
    var entities = (data.entities || []).map(normalizeEntity).filter(Boolean);
    var relationships = (data.relationships || []).map(normalizeRelationship).filter(Boolean);
    var cascades = (data.cascades || []).map(normalizeCascade).filter(Boolean);
    var byId = {};
    entities.forEach(function (e) {
      byId[e.id] = e;
    });
    var relById = {};
    relationships.forEach(function (r) {
      relById[r.id] = r;
    });
    return {
      version: data.version || null,
      mode: data.mode || null,
      modeLabel: data.modeLabel || null,
      honesty: data.honesty || null,
      entityTypes: data.entityTypes || Object.keys(TYPE_LABELS),
      entities: entities,
      relationships: relationships,
      cascades: cascades,
      entityById: byId,
      relationshipById: relById
    };
  }

  function queryEntity() {
    try {
      return new URLSearchParams(global.location.search).get("entity");
    } catch (e) {
      return null;
    }
  }

  function setQueryEntity(id) {
    try {
      var url = new URL(global.location.href);
      if (id) url.searchParams.set("entity", id);
      else url.searchParams.delete("entity");
      global.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function findCascadeForRoot(bundle, rootId) {
    if (!bundle || !rootId) return null;
    for (var i = 0; i < bundle.cascades.length; i++) {
      if (bundle.cascades[i].rootId === rootId) return bundle.cascades[i];
    }
    return null;
  }

  function buildCascadeSteps(bundle, cascade) {
    if (!bundle || !cascade) return [];
    var steps = [];
    var root = bundle.entityById[cascade.rootId];
    if (!root) return [];
    steps.push({ kind: "root", entity: root, relationship: null });
    for (var i = 0; i < cascade.edgeIds.length; i++) {
      var rel = bundle.relationshipById[cascade.edgeIds[i]];
      if (!rel) continue;
      var target = bundle.entityById[rel.to];
      if (!target) continue;
      steps.push({ kind: "edge", entity: target, relationship: rel });
    }
    return steps;
  }

  function selectableEntities(bundle, typeFilter) {
    if (!bundle) return [];
    return bundle.entities.filter(function (e) {
      if (!e.selectable) return false;
      if (typeFilter && typeFilter !== "all" && e.type !== typeFilter) return false;
      return true;
    });
  }

  function renderBanner(data) {
    if (!data || data.mode !== "sample-demo") return "";
    var label = data.modeLabel || "Sample / demo dataset";
    var honesty =
      (data.honesty && data.honesty.banner) ||
      "Sample / demo dataset — not a live relationship graph.";
    return (
      '<div class="gsr-banner" role="status">' +
      '<p class="gsr-badge">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(honesty) +
      "</p>" +
      "</div>"
    );
  }

  function renderEvidence(ev) {
    if (!ev) {
      return '<p class="gsr-evidence">Evidence unavailable</p>';
    }
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
    var kind = ev.kind === "sample-demo" ? "Sample / demo" : esc(ev.kind);
    return (
      '<p class="gsr-evidence"><span class="gsr-badge gsr-badge--evidence">' +
      kind +
      "</span>" +
      link +
      (ev.notes ? " · " + esc(ev.notes) : "") +
      "</p>"
    );
  }

  function renderRootNode(entity) {
    return (
      '<li class="gsr-cascade__step gsr-cascade__step--root">' +
      '<div class="gsr-node">' +
      '<p class="gsr-node__meta"><span class="gsr-badge">' +
      esc(typeLabel(entity.type)) +
      '</span><span class="gsr-badge">Selected root</span></p>' +
      '<h3 class="gsr-node__label">' +
      esc(entity.label) +
      "</h3>" +
      (entity.summary
        ? '<p class="gsr-node__summary">' + esc(entity.summary) + "</p>"
        : "") +
      "</div></li>"
    );
  }

  function renderEdgeStep(entity, rel) {
    var why = rel.why || "Why unavailable for this relationship.";
    return (
      '<li class="gsr-cascade__step">' +
      '<span class="gsr-cascade__arrow" aria-hidden="true">↓</span>' +
      '<div class="gsr-edge" data-confidence="' +
      esc(rel.confidence) +
      '">' +
      '<div class="gsr-node">' +
      '<p class="gsr-node__meta"><span class="gsr-badge">' +
      esc(typeLabel(entity.type)) +
      '</span><span class="gsr-badge">' +
      esc(rel.relationType.replace(/_/g, " ")) +
      "</span></p>" +
      '<h3 class="gsr-node__label">' +
      esc(entity.label) +
      "</h3></div>" +
      '<dl class="gsr-edge__facets">' +
      "<div><dt>Why</dt><dd>" +
      esc(why) +
      "</dd></div>" +
      '<div><dt>Confidence</dt><dd><span class="gsr-badge gsr-badge--confidence" data-confidence="' +
      esc(rel.confidence) +
      '">' +
      esc(rel.confidence) +
      "</span></dd></div>" +
      "<div><dt>Time horizon</dt><dd><span class=\"gsr-badge\">" +
      esc(rel.timeHorizon) +
      "</span></dd></div>" +
      "<div><dt>Evidence</dt><dd>" +
      renderEvidence(rel.evidence) +
      "</dd></div>" +
      "</dl></div></li>"
    );
  }

  function renderCascade(bundle, rootId) {
    var cascade = findCascadeForRoot(bundle, rootId);
    var root = bundle.entityById[rootId];
    if (!root) {
      return (
        '<div class="gsr-empty" role="status">' +
        "<p>Entity not found. Choose another root from the picker.</p>" +
        "</div>"
      );
    }
    if (!cascade || !cascade.edgeIds.length) {
      return (
        '<div class="gsr-panel" data-gsr-state="empty-cascade">' +
        '<header class="gsr-panel__head">' +
        "<h2>" +
        esc(root.label) +
        "</h2>" +
        '<p class="gsr-note">No curated cascade is mapped for this entity yet. Empty is honest — we will not invent dependencies.</p>' +
        "</header></div>"
      );
    }
    var steps = buildCascadeSteps(bundle, cascade);
    var items = steps
      .map(function (step) {
        if (step.kind === "root") return renderRootNode(step.entity);
        return renderEdgeStep(step.entity, step.relationship);
      })
      .join("");
    var labels = steps.map(function (s) {
      return s.entity.label;
    });
    return (
      '<div class="gsr-panel" data-gsr-state="cascade">' +
      '<header class="gsr-panel__head">' +
      "<h2>" +
      esc(cascade.title || "What depends on " + root.label) +
      "</h2>" +
      (cascade.summary
        ? "<p>" + esc(cascade.summary) + "</p>"
        : "") +
      '<p class="gsr-path-preview" aria-label="Cascade preview">' +
      esc(labels.join(" → ")) +
      "</p>" +
      '<p class="gsr-note">Cascading relationship display — not a network graph. Edge confidence never uses Observed for predicted hops.</p>' +
      "</header>" +
      '<ol class="gsr-cascade" aria-label="Dependency cascade">' +
      items +
      "</ol></div>"
    );
  }

  function renderPicker(bundle, selectedId, typeFilter) {
    var types = ["all"].concat(
      (bundle.entityTypes || Object.keys(TYPE_LABELS)).filter(function (t) {
        return TYPE_LABELS[t];
      })
    );
    var typeOptions = types
      .map(function (t) {
        var label = t === "all" ? "All types" : typeLabel(t);
        return (
          '<option value="' +
          esc(t) +
          '"' +
          (t === typeFilter ? " selected" : "") +
          ">" +
          esc(label) +
          "</option>"
        );
      })
      .join("");

    var entities = selectableEntities(bundle, typeFilter);
    var entityOptions =
      '<option value="">' +
      (entities.length ? "Choose an entity…" : "No selectable entities in this filter") +
      "</option>" +
      entities
        .map(function (e) {
          return (
            '<option value="' +
            esc(e.id) +
            '"' +
            (e.id === selectedId ? " selected" : "") +
            ">" +
            esc(e.label) +
            " · " +
            esc(typeLabel(e.type)) +
            "</option>"
          );
        })
        .join("");

    var chips = entities
      .map(function (e) {
        var current = e.id === selectedId;
        return (
          '<li><button type="button" class="gsr-chip' +
          (current ? " gsr-chip--active" : "") +
          '" data-gsr-select="' +
          esc(e.id) +
          '" aria-pressed="' +
          (current ? "true" : "false") +
          '">' +
          esc(e.label) +
          '<span class="gsr-chip__type">' +
          esc(typeLabel(e.type)) +
          "</span></button></li>"
        );
      })
      .join("");

    return (
      '<section class="gsr-picker" aria-label="Entity picker">' +
      '<div class="gsr-picker__controls">' +
      '<label class="gsr-field"><span>Entity type</span>' +
      '<select data-gsr-type>' +
      typeOptions +
      "</select></label>" +
      '<label class="gsr-field"><span>Entity</span>' +
      '<select data-gsr-entity>' +
      entityOptions +
      "</select></label>" +
      "</div>" +
      '<ul class="gsr-chip-list" role="list">' +
      (chips ||
        '<li class="gsr-empty-inline">No selectable roots for this type.</li>') +
      "</ul></section>"
    );
  }

  function renderIdle() {
    return (
      '<div class="gsr-panel gsr-panel--idle" data-gsr-state="idle">' +
      "<h2>Select an entity</h2>" +
      '<p>Choose a country, industry, commodity, port, company, conflict, tariff, policy, or weather event to see what may depend on it — with why, confidence, time horizon, and evidence on every step.</p>' +
      '<p class="gsr-note">This is a cascading display, not a force-directed graph.</p>' +
      "</div>"
    );
  }

  function resolveDataUrl(configured, depth) {
    if (configured) return configured;
    var prefix = "";
    for (var i = 0; i < (depth || 3); i++) prefix += "../";
    return prefix + "data/global-signals/relationships/relationships.json";
  }

  async function loadRelationships(opts) {
    opts = opts || {};
    var url = resolveDataUrl(opts.dataUrl, opts.depth);
    var res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    return normalizeBundle(data);
  }

  function bindInteractions(root, bundle, state) {
    var typeSelect = root.querySelector("[data-gsr-type]");
    var entitySelect = root.querySelector("[data-gsr-entity]");

    function paint() {
      var selected = state.selectedId;
      var filter = state.typeFilter || "all";
      root.innerHTML =
        renderBanner(bundle) +
        renderPicker(bundle, selected, filter) +
        '<div data-gsr-result>' +
        (selected ? renderCascade(bundle, selected) : renderIdle()) +
        "</div>";
      bindInteractions(root, bundle, state);
    }

    if (typeSelect) {
      typeSelect.addEventListener("change", function () {
        state.typeFilter = typeSelect.value || "all";
        var stillVisible = selectableEntities(bundle, state.typeFilter).some(function (e) {
          return e.id === state.selectedId;
        });
        if (!stillVisible) {
          state.selectedId = null;
          setQueryEntity(null);
        }
        paint();
      });
    }

    if (entitySelect) {
      entitySelect.addEventListener("change", function () {
        state.selectedId = entitySelect.value || null;
        setQueryEntity(state.selectedId);
        paint();
      });
    }

    root.querySelectorAll("[data-gsr-select]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedId = btn.getAttribute("data-gsr-select");
        setQueryEntity(state.selectedId);
        paint();
      });
    });
  }

  async function mount(root, opts) {
    if (!root) return null;
    opts = opts || {};
    root.setAttribute("aria-busy", "true");
    root.setAttribute("data-gsr-state", "loading");
    root.innerHTML = '<p class="gsr-loading">Loading Relationship Explorer…</p>';

    try {
      var bundle = await loadRelationships(opts);
      root.setAttribute("aria-busy", "false");

      if (!bundle.entities.length) {
        root.setAttribute("data-gsr-state", "empty");
        root.innerHTML =
          renderBanner(bundle) +
          '<p class="gsr-empty" role="status">Relationship entities will appear here as curated links are added.</p>';
        return bundle;
      }

      var selectedId = opts.entity != null ? opts.entity : queryEntity();
      if (selectedId && !bundle.entityById[selectedId]) {
        selectedId = null;
      }
      var state = {
        selectedId: selectedId,
        typeFilter: opts.typeFilter || "all"
      };

      root.setAttribute("data-gsr-state", "ready");
      root.innerHTML =
        renderBanner(bundle) +
        renderPicker(bundle, state.selectedId, state.typeFilter) +
        '<div data-gsr-result>' +
        (state.selectedId
          ? renderCascade(bundle, state.selectedId)
          : renderIdle()) +
        "</div>";
      bindInteractions(root, bundle, state);

      if (state.selectedId && bundle.entityById[state.selectedId]) {
        try {
          document.title =
            bundle.entityById[state.selectedId].label +
            " · Relationship Explorer · Global Signals";
        } catch (e) {}
      }

      return bundle;
    } catch (err) {
      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gsr-state", "error");
      root.innerHTML =
        '<div class="gsr-error" role="alert">' +
        "<p>Relationship data unavailable. Empty is honest — we will not invent dependencies.</p>" +
        "</div>";
      return { error: err, entities: [], relationships: [], cascades: [] };
    }
  }

  GS.relationships = {
    mount: mount,
    loadRelationships: loadRelationships,
    normalizeBundle: normalizeBundle,
    normalizeEntity: normalizeEntity,
    normalizeRelationship: normalizeRelationship,
    normalizeCascade: normalizeCascade,
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    normalizeEvidence: normalizeEvidence,
    typeLabel: typeLabel,
    findCascadeForRoot: findCascadeForRoot,
    buildCascadeSteps: buildCascadeSteps,
    selectableEntities: selectableEntities,
    renderCascade: renderCascade,
    renderPicker: renderPicker,
    renderBanner: renderBanner,
    renderEvidence: renderEvidence,
    isSafeHttpUrl: isSafeHttpUrl,
    CONFIDENCE_ALLOWED: CONFIDENCE_ALLOWED,
    HORIZON_ALLOWED: HORIZON_ALLOWED,
    TYPE_LABELS: TYPE_LABELS
  };
})(typeof window !== "undefined" ? window : globalThis);
