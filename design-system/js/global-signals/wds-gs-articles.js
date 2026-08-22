/**
 * Global Signals Articles — card feed (Sprint 1).
 * Loads labeled sample/demo JSON. Does not invent missing Takes or facts.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  var CONFIDENCE_ALLOWED = ["Observed", "High", "Medium", "Low", "Unknown"];
  var HORIZON_ALLOWED = ["Immediate", "Days", "Weeks", "Months", "Long-term"];

  function titleCaseToken(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/long[\s_-]*term/g, "long-term")
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      })
      .replace(/Long-Term/g, "Long-term");
  }

  /** Normalize confidence. Invalid/missing → Unknown. Never invent Observed. */
  function normalizeConfidence(value, opts) {
    opts = opts || {};
    if (value == null || value === "") return "Unknown";
    var raw = String(value).trim();
    var lower = raw.toLowerCase();
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
    // Predicted / analysis surfaces must never be Observed
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
      longterm: "Long-term",
      "long term": "Long-term"
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


  function formatDate(value) {
    if (!value) return "Date unavailable";
    var d = new Date(value);
    if (isNaN(d.getTime())) {
      // Allow plain YYYY-MM-DD display without timezone shift surprises
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
      return "Date unavailable";
    }
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
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

  function normalizeArticle(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    if (!id) return null;
    var take = raw.waypointsTake || raw.waypointTake || null;
    if (typeof take === "string") {
      take = { analysis: take };
    }
    return {
      id: id,
      headline: String(raw.headline || "").trim(),
      publisher: String(raw.publisher || "").trim(),
      date: raw.date || raw.publishedAt || null,
      factualSummary: String(raw.factualSummary || "").trim(),
      sourceUrl: raw.sourceUrl || null,
      eventType: String(raw.eventType || "").trim(),
      waypointsTake: take,
      affectedCountries: normalizeStringList(raw.affectedCountries),
      affectedIndustries: normalizeStringList(raw.affectedIndustries),
      affectedCommodities: normalizeStringList(raw.affectedCommodities),
      citizenImpacts: normalizeStringList(raw.citizenImpacts),
      timeHorizon: normalizeTimeHorizon(raw.timeHorizon),
      confidence: normalizeConfidence(raw.confidence),
      likelyImpactPath: normalizeImpactPath(raw.likelyImpactPath || raw.impactPath)
    };
  }

  function normalizeImpactPath(rawPath) {
    if (!Array.isArray(rawPath)) return [];
    return rawPath
      .map(function (step) {
        if (!step || typeof step !== "object") return null;
        var label = String(step.label || "").trim();
        if (!label) return null;
        return {
          label: label,
          type: String(step.type || step.kind || "unknown").trim() || "unknown",
          confidence: normalizeConfidence(step.confidence, { predicted: true }),
          timeframe: normalizeTimeHorizon(step.timeframe || step.horizon),
          explanation: String(step.explanation || "").trim()
        };
      })
      .filter(Boolean);
  }

  function renderImpactPath(path, opts) {
    opts = opts || {};
    if (!path || !path.length) {
      return '<p class="gsa-empty">Likely impact path not tagged for this brief.</p>';
    }
    var items = path
      .map(function (step, i) {
        return (
          '<li class="gsa-path__step" data-type="' +
          esc(step.type) +
          '">' +
          '<div class="gsa-path__node">' +
          '<span class="gsa-path__label">' +
          esc(step.label) +
          "</span>" +
          '<span class="gsa-badge gsa-badge--confidence" data-confidence="' +
          esc(step.confidence) +
          '">' +
          esc(step.confidence) +
          "</span>" +
          '<span class="gsa-badge">' +
          esc(step.timeframe) +
          "</span>" +
          "</div>" +
          (step.explanation
            ? '<p class="gsa-path__explain">' + esc(step.explanation) + "</p>"
            : "") +
          (i < path.length - 1
            ? '<span class="gsa-path__arrow" aria-hidden="true">↓</span>'
            : "") +
          "</li>"
        );
      })
      .join("");
    return (
      '<ol class="gsa-path" aria-label="Likely impact path">' + items + "</ol>"
    );
  }

  function renderPathPreview(path) {
    if (!path || !path.length) return "";
    var labels = path.map(function (s) { return s.label; });
    return (
      '<p class="gsa-path-preview" aria-label="Impact path preview">' +
      esc(labels.join(" → ")) +
      "</p>"
    );
  }

  function queryId() {
    try {
      return new URLSearchParams(global.location.search).get("id");
    } catch (e) {
      return null;
    }
  }

  function renderDetail(article) {
    var sourceHtml = isSafeHttpUrl(article.sourceUrl)
      ? '<a href="' +
        esc(article.sourceUrl) +
        '" rel="noopener noreferrer" target="_blank">' +
        esc(article.publisher || "Source") +
        "</a>"
      : esc(article.publisher || "Publisher unavailable");

    return (
      '<article class="gsa-detail" data-gsa-id="' +
      esc(article.id) +
      '">' +
      '<p class="gsa-card__meta">' +
      '<span class="gsa-badge">' +
      esc(article.eventType || "Event type unavailable") +
      "</span>" +
      '<span class="gsa-badge gsa-badge--confidence" data-confidence="' +
      esc(article.confidence) +
      '">' +
      esc(article.confidence) +
      "</span>" +
      '<span class="gsa-badge">' +
      esc(article.timeHorizon) +
      "</span></p>" +
      "<h1>" +
      esc(article.headline || "Untitled brief") +
      "</h1>" +
      "<p class=\"gsa-detail__byline\">" +
      sourceHtml +
      " · " +
      esc(formatDate(article.date)) +
      "</p>" +
      '<section class="gsa-section" aria-labelledby="gsa-what">' +
      '<h2 id="gsa-what">What happened</h2>' +
      '<p class="gsa-note">Observed / reported facts from sources</p>' +
      "<p>" +
      esc(article.factualSummary || "Factual summary unavailable.") +
      "</p></section>" +
      '<section class="gsa-section" aria-labelledby="gsa-take">' +
      '<h2 id="gsa-take">Waypoint\u2019s Take</h2>' +
      renderTake(article.waypointsTake).replace(
        'class="gsa-card__take',
        'class="gsa-card__take gsa-detail__take'
      ) +
      "</section>" +
      '<section class="gsa-section" aria-labelledby="gsa-path">' +
      '<h2 id="gsa-path">Likely impact path</h2>' +
      '<p class="gsa-note">Transparent tagged chain — not autonomous prediction. Step confidence never uses Observed for predicted hops.</p>' +
      renderImpactPath(article.likelyImpactPath) +
      "</section>" +
      renderImpactMeta(article) +
      '<p class="gsa-detail__back"><a href="./">← All briefs</a></p>' +
      "</article>"
    );
  }

  function renderChipRow(title, items) {
    if (!items || !items.length) {
      return (
        "<div class=\"gsa-meta-row\"><h4>" +
        esc(title) +
        '</h4><p class="gsa-empty-inline">Not tagged</p></div>'
      );
    }
    return (
      '<div class="gsa-meta-row"><h4>' +
      esc(title) +
      '</h4><ul class="gsa-chips">' +
      items
        .map(function (item) {
          return "<li>" + esc(item) + "</li>";
        })
        .join("") +
      "</ul></div>"
    );
  }

  function renderImpactMeta(article) {
    return (
      '<section class="gsa-card__impact" aria-label="Impact metadata">' +
      '<p class="gsa-card__meta">' +
      '<span class="gsa-badge gsa-badge--confidence" data-confidence="' +
      esc(article.confidence) +
      '">Confidence · ' +
      esc(article.confidence) +
      "</span>" +
      '<span class="gsa-badge">Horizon · ' +
      esc(article.timeHorizon) +
      "</span>" +
      "</p>" +
      renderChipRow("Industries", article.affectedIndustries) +
      renderChipRow("Citizen impact", article.citizenImpacts) +
      "</section>"
    );
  }

  function takeHasSubstance(take) {
    if (!take) return false;
    if (typeof take === "string") return take.trim().length > 0;
    return Boolean(
      (take.whyItMatters && String(take.whyItMatters).trim()) ||
        (take.analysis && String(take.analysis).trim())
    );
  }

  function renderTake(take) {
    if (!takeHasSubstance(take)) {
      return (
        '<section class="gsa-card__take gsa-card__take--empty" aria-label="Waypoint\u2019s Take">' +
        "<h3>Waypoint\u2019s Take</h3>" +
        '<p class="gsa-note">Analysis · not established fact</p>' +
        "<p>No Waypoint\u2019s Take is available for this brief. We will not invent one.</p>" +
        "</section>"
      );
    }
    var parts = [];
    if (take.whyItMatters && String(take.whyItMatters).trim()) {
      parts.push("<p><strong>Why it matters.</strong> " + esc(take.whyItMatters) + "</p>");
    }
    if (take.analysis && String(take.analysis).trim()) {
      parts.push("<p>" + esc(take.analysis) + "</p>");
    }
    return (
      '<section class="gsa-card__take" aria-label="Waypoint\u2019s Take">' +
      "<h3>Waypoint\u2019s Take</h3>" +
      '<p class="gsa-note">Analysis · interpretation, not established fact</p>' +
      parts.join("") +
      "</section>"
    );
  }

  function renderCard(article) {
    var headline = article.headline || "Untitled brief";
    var publisher = article.publisher || "Publisher unavailable";
    var summary = article.factualSummary || "Factual summary unavailable.";
    var eventType = article.eventType || "Event type unavailable";
    var dateLabel = formatDate(article.date);

    var sourceHtml;
    if (isSafeHttpUrl(article.sourceUrl)) {
      sourceHtml =
        '<a class="gsa-card__source" href="' +
        esc(article.sourceUrl) +
        '" rel="noopener noreferrer" target="_blank">' +
        esc(publisher) +
        "</a>";
    } else {
      sourceHtml = '<span class="gsa-card__source">' + esc(publisher) + "</span>";
    }

    return (
      '<article class="gsa-card" data-gsa-id="' +
      esc(article.id) +
      '" role="listitem">' +
      '<header class="gsa-card__head">' +
      '<p class="gsa-card__meta"><span class="gsa-badge">' +
      esc(eventType) +
      "</span>" +
      '<span class="gsa-badge gsa-badge--confidence" data-confidence="' +
      esc(article.confidence) +
      '">' +
      esc(article.confidence) +
      "</span>" +
      '<span class="gsa-badge">' +
      esc(article.timeHorizon) +
      "</span></p>" +
      '<h2 class="gsa-card__title">' +
      esc(headline) +
      "</h2>" +
      '<p class="gsa-card__byline">' +
      sourceHtml +
      " · " +
      esc(dateLabel) +
      "</p>" +
      "</header>" +
      '<section class="gsa-card__facts" aria-label="Factual summary">' +
      "<h3>Factual summary</h3>" +
      '<p class="gsa-note">Observed / reported facts from sources</p>' +
      "<p>" +
      esc(summary) +
      "</p>" +
      "</section>" +
      renderTake(article.waypointsTake) +
      renderImpactMeta(article) +
      renderPathPreview(article.likelyImpactPath) +
      '<p class="gsa-card__cta"><a href="?id=' +
      encodeURIComponent(article.id) +
      '">Open brief</a></p>' +
      "</article>"
    );
  }

  function renderBanner(data) {
    if (!data || data.mode !== "sample-demo") return "";
    var label = data.modeLabel || "Sample / demo dataset";
    var honesty =
      (data.honesty && data.honesty.banner) ||
      "Sample / demo dataset — not a live intelligence feed.";
    return (
      '<div class="gsa-banner" role="status">' +
      '<p class="gsa-badge">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(honesty) +
      "</p>" +
      "</div>"
    );
  }

  function resolveDataUrl(configured, depth) {
    if (configured) return configured;
    var prefix = "";
    for (var i = 0; i < (depth || 3); i++) prefix += "../";
    return prefix + "data/global-signals/articles/articles.json";
  }

  async function loadArticles(opts) {
    opts = opts || {};
    var url = resolveDataUrl(opts.dataUrl, opts.depth);
    var res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var data = await res.json();
    var articles = (data.articles || [])
      .map(normalizeArticle)
      .filter(Boolean);
    return { data: data, articles: articles };
  }

  async function mount(root, opts) {
    if (!root) return null;
    opts = opts || {};
    root.setAttribute("aria-busy", "true");
    root.setAttribute("data-gsa-state", "loading");
    root.innerHTML = '<p class="gsa-loading">Loading Global Signals briefs…</p>';

    try {
      var bundle = await loadArticles(opts);
      root.setAttribute("aria-busy", "false");

      if (!bundle.articles.length) {
        root.setAttribute("data-gsa-state", "empty");
        root.innerHTML =
          renderBanner(bundle.data) +
          '<p class="gsa-empty" role="status">Global Signals articles will appear here as verified sources are added.</p>';
        return bundle;
      }

      var id = opts.id != null ? opts.id : queryId();
      if (id) {
        var found = null;
        for (var i = 0; i < bundle.articles.length; i++) {
          if (bundle.articles[i].id === id) {
            found = bundle.articles[i];
            break;
          }
        }
        root.setAttribute("data-gsa-state", found ? "detail" : "error");
        if (!found) {
          root.innerHTML =
            renderBanner(bundle.data) +
            '<div class="gsa-error" role="alert"><p>Brief not found. <a href="./">Back to all briefs</a></p></div>';
          return bundle;
        }
        try {
          document.title = found.headline + " · Global Signals Articles";
        } catch (e) {}
        root.innerHTML = renderBanner(bundle.data) + renderDetail(found);
        return bundle;
      }

      root.setAttribute("data-gsa-state", "ready");
      root.innerHTML =
        renderBanner(bundle.data) +
        '<p class="gsa-hub-count">' +
        bundle.articles.length +
        " demo brief" +
        (bundle.articles.length === 1 ? "" : "s") +
        " · sample / demo</p>" +
        '<div class="gsa-list" role="list">' +
        bundle.articles.map(renderCard).join("") +
        "</div>";
      return bundle;
    } catch (err) {
      root.setAttribute("aria-busy", "false");
      root.setAttribute("data-gsa-state", "error");
      root.innerHTML =
        '<div class="gsa-error" role="alert">' +
        "<p>Briefs unavailable. Empty is honest — we will not invent events.</p>" +
        "</div>";
      return { error: err, articles: [] };
    }
  }

  GS.articles = {
    mount: mount,
    loadArticles: loadArticles,
    normalizeArticle: normalizeArticle,
    renderCard: renderCard,
    renderTake: renderTake,
    takeHasSubstance: takeHasSubstance,
    renderImpactMeta: renderImpactMeta,
    renderImpactPath: renderImpactPath,
    renderDetail: renderDetail,
    normalizeImpactPath: normalizeImpactPath,
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    formatDate: formatDate,
    isSafeHttpUrl: isSafeHttpUrl,
    CONFIDENCE_ALLOWED: CONFIDENCE_ALLOWED,
    HORIZON_ALLOWED: HORIZON_ALLOWED
  };
})(typeof window !== "undefined" ? window : globalThis);
