/**
 * Global Signals — Relationship Graph deep-link helpers.
 * Shared focus URL builder + module→graph id aliases.
 * Does not invent nodes; callers must pass curated graph node ids.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var ROUTE = "/side-trails/global-signals/relationship-graph/";
  var CTA_LABEL = "Open in Relationship Graph";

  /**
   * Module id → graph node id when namespaces diverge.
   * Authoritative runtime aliases also live on graph.json idAliases.
   */
  var STATIC_ALIASES = {
    gsc_taiwan: "gsn_taiwan"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveAlias(id, extra) {
    var key = String(id == null ? "" : id).trim();
    if (!key) return "";
    if (extra && extra[key]) return String(extra[key]).trim();
    if (STATIC_ALIASES[key]) return STATIC_ALIASES[key];
    return key;
  }

  function countryFocusId(countryId) {
    return resolveAlias(countryId);
  }

  function industryFocusId(industryId) {
    return String(industryId == null ? "" : industryId).trim();
  }

  function citizenFocusId(sectionOrNodeId) {
    var s = String(sectionOrNodeId == null ? "" : sectionOrNodeId).trim();
    if (!s) return "";
    if (s.indexOf("gsci_") === 0) return s;
    return "gsci_" + s;
  }

  function articleFocusId(article) {
    if (!article || typeof article !== "object") return "";
    var ids = article.relatedGraphNodeIds || article.graphFocusIds || [];
    if (!Array.isArray(ids) || !ids.length) return "";
    return String(ids[0] || "").trim();
  }

  function focusUrl(focusId, opts) {
    opts = opts || {};
    var base = opts.base || ROUTE;
    if (!base) base = ROUTE;
    if (base.indexOf("?") >= 0) {
      return focusId
        ? base + "&focus=" + encodeURIComponent(focusId)
        : base;
    }
    if (base.slice(-1) !== "/") base += "/";
    return focusId ? base + "?focus=" + encodeURIComponent(focusId) : base;
  }

  function relativeGraphBase(depth) {
    var d = typeof depth === "number" ? depth : 3;
    // From /side-trails/global-signals/<module>/ → sibling relationship-graph/
    // depth is used by data loaders (path to repo root); graph is always one level up from module hubs.
    if (d >= 4) return "../../relationship-graph/";
    return "../relationship-graph/";
  }

  function ctaAnchor(focusId, opts) {
    opts = opts || {};
    var label = opts.label || CTA_LABEL;
    var cls = opts.className || "gs-cta";
    var href = focusUrl(focusId, opts);
    var attrs =
      ' class="' +
      esc(cls) +
      '" href="' +
      esc(href) +
      '"';
    if (focusId) {
      attrs += ' data-gs-graph-focus="' + esc(focusId) + '"';
    }
    return "<a" + attrs + ">" + esc(label) + "</a>";
  }

  GS.graphLinks = {
    ROUTE: ROUTE,
    CTA_LABEL: CTA_LABEL,
    STATIC_ALIASES: STATIC_ALIASES,
    resolveAlias: resolveAlias,
    countryFocusId: countryFocusId,
    industryFocusId: industryFocusId,
    citizenFocusId: citizenFocusId,
    articleFocusId: articleFocusId,
    focusUrl: focusUrl,
    relativeGraphBase: relativeGraphBase,
    ctaAnchor: ctaAnchor
  };
})(typeof window !== "undefined" ? window : globalThis);
