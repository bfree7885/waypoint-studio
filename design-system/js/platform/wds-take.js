/**
 * Waypoint’s Take — official editorial interpretation component.
 *
 * Distinct from Summary / source facts: Take explains why it matters, who may
 * be affected, and what to watch for — never a restatement of the summary.
 * Does not invent data: callers supply body text or an honest empty state.
 *
 * Mount: WDS.take.mount(el, { body, meta, sources, surface, title })
 * Empty: WDS.take.restrained(el, { reason, surface })
 * HTML:  WDS.take.renderArticleHtml({ body, provenance, summary }) — for feed cards
 */
(function (global) {
  "use strict";

  var TAKE_TITLE = "Waypoint’s Take";
  var EMPTY_ARTICLE =
    "No Waypoint’s Take is available for this item yet. We will not invent one.";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeText(s) {
    return String(s == null ? "" : s)
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /** True when Take would only repeat the summary (or is empty). */
  function isRedundantWithSummary(take, summary) {
    var t = normalizeText(take);
    var s = normalizeText(summary);
    if (!t) return true;
    if (!s) return false;
    return t === s || (t.length > 40 && s.indexOf(t) >= 0) || (s.length > 40 && t.indexOf(s) >= 0);
  }

  function mount(el, opts) {
    if (!el) return null;
    opts = opts || {};
    var body = opts.body || opts.text || "";
    var meta = opts.meta || "Interpretation · not a score · uncertainty welcome";
    var sources = opts.sources || [];
    var surface = opts.surface || el.getAttribute("data-take-surface") || "general";
    var title = opts.title != null ? opts.title : TAKE_TITLE;
    var showTitle = opts.showTitle !== false && surface === "article";

    if (!body) {
      return restrained(el, {
        reason: opts.emptyReason || "Not enough local signals yet for a Take.",
        surface: surface,
        meta: meta,
        title: showTitle ? title : "",
        showTitle: showTitle
      });
    }

    var sourceHtml = "";
    if (sources.length) {
      sourceHtml =
        '<p class="wds-take__sources">' +
        sources
          .map(function (s) {
            if (typeof s === "string") return esc(s);
            if (s && s.href) {
              return '<a href="' + esc(s.href) + '">' + esc(s.label || s.href) + "</a>";
            }
            return esc((s && s.label) || "");
          })
          .filter(Boolean)
          .join(" · ") +
        "</p>";
    }

    el.className = (el.className || "").replace(/\bwds-take\b/g, "").trim() + " wds-take";
    el.setAttribute("data-take-surface", surface);
    el.setAttribute("data-take-kind", "interpretation");
    el.innerHTML =
      (showTitle ? '<h3 class="wds-take__title">' + esc(title) + "</h3>" : "") +
      '<p class="wds-take__body">' +
      esc(body) +
      "</p>" +
      '<p class="wds-take__meta">' +
      esc(meta) +
      "</p>" +
      sourceHtml;
    return el;
  }

  function restrained(el, opts) {
    if (!el) return null;
    opts = opts || {};
    var reason =
      opts.reason ||
      "Conditions are incomplete here — we will not invent a Take.";
    var showTitle = !!opts.showTitle;
    var title = opts.title || TAKE_TITLE;
    el.className =
      (el.className || "").replace(/\bwds-take\b/g, "").trim() +
      " wds-take wds-take--restrained";
    el.setAttribute("data-take-surface", opts.surface || "general");
    el.setAttribute("data-take-kind", "restrained");
    el.innerHTML =
      (showTitle ? '<h3 class="wds-take__title">' + esc(title) + "</h3>" : "") +
      '<p class="wds-take__body">' +
      esc(reason) +
      "</p>" +
      '<p class="wds-take__meta">' +
      esc(opts.meta || "Honest pause · observation without fabrication") +
      "</p>";
    return el;
  }

  /**
   * Feed-card HTML for Articles (and Side Trails–published articles later).
   * Never fabricates Take text. Suppresses Take that only repeats Summary.
   */
  function renderArticleHtml(opts) {
    opts = opts || {};
    var body = String(opts.body || opts.waypointTake || "").trim();
    var summary = String(opts.summary || "").trim();
    var provenance = opts.provenance || opts.takeProvenance || "";
    var unavailable =
      !body ||
      provenance === "unavailable" ||
      isRedundantWithSummary(body, summary);

    if (unavailable) {
      return (
        '<section class="wds-take wds-take--article wds-take--restrained waf-card__take" data-take-surface="article" data-take-kind="restrained" aria-label="' +
        esc(TAKE_TITLE) +
        '">' +
        '<h3 class="wds-take__title">' +
        esc(TAKE_TITLE) +
        "</h3>" +
        '<p class="wds-take__body">' +
        esc(opts.emptyReason || EMPTY_ARTICLE) +
        "</p>" +
        '<p class="wds-take__meta">' +
        esc(opts.emptyMeta || "Optional · not invented") +
        "</p>" +
        "</section>"
      );
    }

    return (
      '<section class="wds-take wds-take--article waf-card__take" data-take-surface="article" data-take-kind="interpretation" aria-label="' +
      esc(TAKE_TITLE) +
      '">' +
      '<h3 class="wds-take__title">' +
      esc(TAKE_TITLE) +
      "</h3>" +
      '<p class="wds-take__body">' +
      esc(body) +
      "</p>" +
      '<p class="wds-take__meta">' +
      esc(opts.meta || provenanceLabel(provenance)) +
      "</p>" +
      "</section>"
    );
  }

  function provenanceLabel(value) {
    if (value === "generated") return "Generated take · interpretation, not a score";
    if (value === "editor-written") return "Editor-written take · interpretation, not a score";
    if (value === "unavailable") return "Waypoint’s Take unavailable";
    if (value === "fallback") return "Fallback take · interpretation, not a score";
    return "Interpretation · not a score · uncertainty welcome";
  }

  /** Homepage / Home default — calm outdoor companion, not a product map. */
  function homepageDefault() {
    return {
      body:
        "Begin with the day outside. Notice conditions before you leave, then photograph, search, or help when you’re ready — without rushing into every tool at once.",
      meta: "Interpretation · not a score · uncertainty welcome",
      sources: [
        { label: "Dashboard", href: "./" },
        { label: "Articles", href: "articles/" }
      ]
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.take = {
    TITLE: TAKE_TITLE,
    mount: mount,
    restrained: restrained,
    renderArticleHtml: renderArticleHtml,
    isRedundantWithSummary: isRedundantWithSummary,
    provenanceLabel: provenanceLabel,
    homepageDefault: homepageDefault
  };
})(typeof window !== "undefined" ? window : globalThis);
