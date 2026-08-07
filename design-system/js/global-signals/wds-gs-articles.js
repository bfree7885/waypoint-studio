/**
 * Global Signals Articles — card feed (Sprint 1 Prompt 2).
 * Loads labeled sample/demo JSON. Does not invent missing fields.
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
    return {
      id: id,
      headline: String(raw.headline || "").trim(),
      publisher: String(raw.publisher || "").trim(),
      date: raw.date || raw.publishedAt || null,
      factualSummary: String(raw.factualSummary || "").trim(),
      sourceUrl: raw.sourceUrl || null,
      eventType: String(raw.eventType || "").trim()
    };
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
      "<p>" +
      esc(summary) +
      "</p>" +
      "</section>" +
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
    formatDate: formatDate,
    isSafeHttpUrl: isSafeHttpUrl
  };
})(typeof window !== "undefined" ? window : globalThis);
