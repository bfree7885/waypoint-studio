/**
 * Waypoint Knowledge — curated research card renderer (calm, editorial).
 * Distinguishes Source Summary from Waypoint Analysis.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusLabel(status) {
    return ({
      verified: "Verified",
      "editorial-draft": "Editorial draft",
      demonstration: "Demonstration",
      archived: "Archived",
      "needs-review": "Needs review"
    })[status] || status;
  }

  function kindLabel(kind) {
    return ({
      research: "Research",
      "field-report": "Field report",
      analysis: "Analysis",
      advisory: "Advisory",
      guide: "Guide"
    })[kind] || "Research";
  }

  function metaLine(entry) {
    var bits = [];
    if (entry.sourceName) bits.push(entry.sourceName);
    if (entry.publicationDate) bits.push(String(entry.publicationDate));
    if (entry.readingMinutes) bits.push(entry.readingMinutes + " min read");
    return bits.join(" · ");
  }

  function renderCard(entry, options) {
    options = options || {};
    var expanded = !!options.expanded;
    var id = entry.id || "wk-unknown";
    var status = entry.reviewStatus || "needs-review";
    var demo = status === "demonstration";
    var findings = (entry.keyFindings || []).slice(0, options.maxFindings || 3);
    var detailsId = id + "-details";

    var findingsHtml = findings.length
      ? "<ul class=\"wk-card__findings\">" +
        findings.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") +
        "</ul>"
      : "";

    var analysisHtml = entry.waypointAnalysis
      ? "<div class=\"wk-card__analysis\">" +
        "<h4 class=\"wk-card__analysis-title\">Waypoint Analysis</h4>" +
        "<p>" + esc(entry.waypointAnalysis) + "</p>" +
        "<p class=\"wk-card__analysis-note\">This section is Waypoint Studio’s interpretation — not part of the original source.</p>" +
        "</div>"
      : "";

    var limitsHtml = entry.limitations
      ? "<p class=\"wk-card__limits\"><strong>Limitations:</strong> " + esc(entry.limitations) + "</p>"
      : "";

    var whyHtml = entry.whyItMatters
      ? "<p class=\"wk-card__why\"><strong>Why it may matter here:</strong> " + esc(entry.whyItMatters) + "</p>"
      : "";

    var sourceLink = entry.originalUrl
      ? "<a class=\"wk-card__source-link\" href=\"" + esc(entry.originalUrl) +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">Read the original source</a>"
      : "<span class=\"wk-card__source-link wk-card__source-link--none\">Original source unavailable" +
        (demo ? " (demonstration fixture)" : "") + "</span>";

    return (
      "<article class=\"wk-card" + (demo ? " wk-card--demo" : "") +
      "\" data-wk-id=\"" + esc(id) + "\" data-review-status=\"" + esc(status) + "\">" +
      "<header class=\"wk-card__header\">" +
      "<p class=\"wk-card__eyebrow\">" + esc(kindLabel(entry.cardKind)) +
      " · <span class=\"wk-card__status\">" + esc(statusLabel(status)) + "</span></p>" +
      "<h3 class=\"wk-card__title\">" + esc(entry.title) + "</h3>" +
      (entry.subtitle ? "<p class=\"wk-card__subtitle\">" + esc(entry.subtitle) + "</p>" : "") +
      "<p class=\"wk-card__meta\">" + esc(metaLine(entry)) + "</p>" +
      "</header>" +
      "<div class=\"wk-card__summary\">" +
      "<h4 class=\"wk-card__summary-title\">Source Summary</h4>" +
      "<p>" + esc(entry.summary) + "</p>" +
      "</div>" +
      (options.compact && !expanded
        ? "<button type=\"button\" class=\"wk-card__toggle\" aria-expanded=\"false\" aria-controls=\"" +
          esc(detailsId) + "\">Show findings &amp; analysis</button>" +
          "<div class=\"wk-card__details\" id=\"" + esc(detailsId) + "\" hidden>" +
          findingsHtml + whyHtml + analysisHtml + limitsHtml +
          "<div class=\"wk-card__actions\">" + sourceLink + "</div></div>"
        : findingsHtml + whyHtml + analysisHtml + limitsHtml +
          "<div class=\"wk-card__actions\">" + sourceLink + "</div>") +
      "</article>"
    );
  }

  function renderList(entries, options) {
    options = options || {};
    if (!entries || !entries.length) {
      return "<p class=\"wk-empty\">No curated reading available for this view.</p>";
    }
    return (
      "<div class=\"wk-card-list\" role=\"list\">" +
      entries.map(function (e) {
        return "<div role=\"listitem\">" + renderCard(e, options) + "</div>";
      }).join("") +
      "</div>"
    );
  }

  function bindToggles(root) {
    root = root || document;
    root.querySelectorAll(".wk-card__toggle").forEach(function (btn) {
      if (btn.dataset.wkBound) return;
      btn.dataset.wkBound = "1";
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("aria-controls");
        var panel = id && document.getElementById(id);
        if (!panel) return;
        var open = panel.hasAttribute("hidden");
        if (open) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.textContent = open ? "Hide findings & analysis" : "Show findings & analysis";
      });
    });
  }

  async function loadDemo(basePath) {
    basePath = basePath || "design-system/knowledge/curated/demo-entries.json";
    var res = await fetch(basePath, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load curated knowledge demo.");
    return res.json();
  }

  function filterByProduct(bundle, productId) {
    var entries = (bundle && bundle.entries) || [];
    if (!productId) return entries.slice();
    return entries.filter(function (e) {
      return (e.products || []).indexOf(productId) >= 0 || (e.products || []).indexOf("shared") >= 0;
    });
  }

  function byHook(bundle, hookId) {
    var entries = (bundle && bundle.entries) || [];
    return entries.filter(function (e) {
      return (e.contextualHooks || []).some(function (h) { return h.id === hookId; });
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.knowledgeCurated = {
    renderCard: renderCard,
    renderList: renderList,
    bindToggles: bindToggles,
    loadDemo: loadDemo,
    filterByProduct: filterByProduct,
    byHook: byHook,
    statusLabel: statusLabel
  };
})(typeof window !== "undefined" ? window : globalThis);
