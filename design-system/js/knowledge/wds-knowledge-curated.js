/**
 * Waypoint Knowledge — curated research card renderer (calm, editorial).
 * Distinguishes Source Summary from Waypoint Perspective.
 * @see docs/WAYPOINT-KNOWLEDGE-PLATFORM.md
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
      analysis: "Perspective",
      advisory: "Advisory",
      guide: "Field guide",
      review: "Review",
      standard: "Standard",
      commentary: "Commentary"
    })[kind] || "Research";
  }

  function sourceTypeLabel(type) {
    return ({
      "peer-reviewed": "Research",
      government: "Government",
      "university-extension": "University",
      "scientific-organization": "Professional organization",
      "professional-association": "Professional organization",
      "technical-report": "Technical report",
      "field-guide": "Field guide",
      "long-form-journalism": "Expert commentary",
      book: "Book",
      "primary-advisory": "Government",
      standard: "Technical standard",
      demonstration: "Demonstration"
    })[type] || type;
  }

  function perspectiveText(entry) {
    return entry.waypointPerspective || entry.waypointAnalysis || "";
  }

  function metaLine(entry) {
    var bits = [];
    if (entry.sourceType) bits.push(sourceTypeLabel(entry.sourceType));
    if (entry.sourceName) bits.push(entry.sourceName);
    if (entry.publicationDate) bits.push(String(entry.publicationDate));
    if (entry.authors && entry.authors.length) {
      bits.push(entry.authors.slice(0, 2).join(", ") + (entry.authors.length > 2 ? " et al." : ""));
    }
    if (entry.readingMinutes) bits.push(entry.readingMinutes + " min read");
    return bits.join(" · ");
  }

  function topicsHtml(entry) {
    var topics = entry.topics || [];
    if (!topics.length) return "";
    return (
      '<ul class="wk-card__topics" aria-label="Topics">' +
      topics
        .slice(0, 6)
        .map(function (t) {
          return '<li class="wk-card__topic">' + esc(t.replace(/-/g, " ")) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }

  function relatedHtml(entry, options) {
    var related = entry.relatedEntries || [];
    if (!related.length) return "";
    var resolve = options && options.resolveRelated;
    var items = related.slice(0, 4).map(function (id) {
      var label = id;
      if (typeof resolve === "function") {
        var hit = resolve(id);
        if (hit && hit.title) label = hit.title;
      }
      return "<li><span>" + esc(label) + "</span></li>";
    });
    return (
      '<div class="wk-card__related">' +
      '<p class="wk-card__related-title">If you\'re curious</p>' +
      "<ul>" +
      items.join("") +
      "</ul></div>"
    );
  }

  function renderCard(entry, options) {
    options = options || {};
    var expanded = !!options.expanded;
    var id = entry.id || "wk-unknown";
    var status = entry.reviewStatus || "needs-review";
    var demo = status === "demonstration";
    var findings = (entry.keyFindings || []).slice(0, options.maxFindings || 3);
    var detailsId = id + "-details";
    var perspective = perspectiveText(entry);

    var findingsHtml = findings.length
      ? '<ul class="wk-card__findings">' +
        findings.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") +
        "</ul>"
      : "";

    var analysisHtml = perspective
      ? '<div class="wk-card__analysis">' +
        '<h4 class="wk-card__analysis-title">Waypoint Perspective</h4>' +
        "<p>" +
        esc(perspective) +
        "</p>" +
        '<p class="wk-card__analysis-note">This section is Waypoint Studio’s interpretation — not part of the original source.</p>' +
        "</div>"
      : "";

    var limitsHtml = entry.limitations
      ? '<p class="wk-card__limits"><strong>Limitations:</strong> ' + esc(entry.limitations) + "</p>"
      : "";

    var whyHtml = entry.whyItMatters
      ? '<p class="wk-card__why"><strong>Why it matters:</strong> ' + esc(entry.whyItMatters) + "</p>"
      : "";

    var sourceLink = entry.originalUrl
      ? '<a class="wk-card__source-link" href="' +
        esc(entry.originalUrl) +
        '" target="_blank" rel="noopener noreferrer">Read the original source</a>'
      : '<span class="wk-card__source-link wk-card__source-link--none">Original source unavailable' +
        (demo ? " (demonstration fixture)" : "") +
        "</span>";

    var bodyExtras =
      findingsHtml + whyHtml + analysisHtml + limitsHtml + relatedHtml(entry, options) + topicsHtml(entry);

    return (
      '<article class="wk-card' +
      (demo ? " wk-card--demo" : "") +
      '" data-wk-id="' +
      esc(id) +
      '" data-review-status="' +
      esc(status) +
      '">' +
      '<header class="wk-card__header">' +
      '<p class="wk-card__eyebrow">' +
      esc(kindLabel(entry.cardKind)) +
      ' · <span class="wk-card__status">' +
      esc(statusLabel(status)) +
      "</span></p>" +
      '<h3 class="wk-card__title">' +
      esc(entry.title) +
      "</h3>" +
      (entry.subtitle ? '<p class="wk-card__subtitle">' + esc(entry.subtitle) + "</p>" : "") +
      '<p class="wk-card__meta">' +
      esc(metaLine(entry)) +
      "</p>" +
      "</header>" +
      '<div class="wk-card__summary">' +
      '<h4 class="wk-card__summary-title">Source Summary</h4>' +
      "<p>" +
      esc(entry.summary) +
      "</p>" +
      "</div>" +
      (options.compact && !expanded
        ? '<button type="button" class="wk-card__toggle" aria-expanded="false" aria-controls="' +
          esc(detailsId) +
          '">Show findings &amp; perspective</button>' +
          '<div class="wk-card__details" id="' +
          esc(detailsId) +
          '" hidden>' +
          bodyExtras +
          '<div class="wk-card__actions">' +
          sourceLink +
          "</div></div>"
        : bodyExtras + '<div class="wk-card__actions">' + sourceLink + "</div>") +
      "</article>"
    );
  }

  function renderList(entries, options) {
    options = options || {};
    if (!entries || !entries.length) {
      return '<p class="wk-empty">No curated reading available for this view.</p>';
    }
    var byId = {};
    entries.forEach(function (e) {
      if (e && e.id) byId[e.id] = e;
    });
    if (options.bundle && options.bundle.entries) {
      options.bundle.entries.forEach(function (e) {
        if (e && e.id) byId[e.id] = e;
      });
    }
    var opts = Object.assign({}, options, {
      resolveRelated: function (id) {
        return byId[id];
      }
    });
    return (
      '<div class="wk-card-list" role="list">' +
      entries
        .map(function (e) {
          return '<div role="listitem">' + renderCard(e, opts) + "</div>";
        })
        .join("") +
      "</div>"
    );
  }

  /**
   * Product integration: optional related reading block (never an interrupt).
   */
  function renderRelatedReading(bundle, options) {
    options = options || {};
    var entries = options.hookId
      ? byHook(bundle, options.hookId)
      : filterByProduct(bundle, options.product);
    if (options.featuredOnly) {
      entries = entries.filter(function (e) {
        return e.featured;
      });
    }
    entries = entries.filter(function (e) {
      return e.reviewStatus !== "archived";
    });
    if (!entries.length) return "";
    var heading = options.heading || "If you're curious";
    var lead = options.lead || "Optional background — leave whenever you like.";
    return (
      '<aside class="wk-related-reading" data-wk-related-reading>' +
      '<p class="wk-related-reading__eyebrow">' +
      esc(heading) +
      "</p>" +
      (lead ? '<p class="wk-related-reading__lead">' + esc(lead) + "</p>" : "") +
      renderList(entries.slice(0, options.limit || 2), {
        compact: options.compact !== false,
        bundle: bundle
      }) +
      "</aside>"
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
        btn.textContent = open ? "Hide findings & perspective" : "Show findings & perspective";
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
      return (e.contextualHooks || []).some(function (h) {
        return h.id === hookId;
      });
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.knowledgeCurated = {
    version: "1.1.0",
    renderCard: renderCard,
    renderList: renderList,
    renderRelatedReading: renderRelatedReading,
    bindToggles: bindToggles,
    loadDemo: loadDemo,
    filterByProduct: filterByProduct,
    byHook: byHook,
    statusLabel: statusLabel,
    sourceTypeLabel: sourceTypeLabel,
    docPath: "docs/WAYPOINT-KNOWLEDGE-PLATFORM.md"
  };
})(typeof window !== "undefined" ? window : globalThis);
