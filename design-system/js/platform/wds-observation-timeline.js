/**
 * Waypoint Studio — shared Observation Timeline renderer.
 *
 * Consumes WDS.platformObservations.query(); never reads product stores itself.
 */
(function (global) {
  "use strict";

  var KIND_LABELS = {
    photo: "Photo",
    journal: "Journal",
    sighting: "Sighting",
    weather: "Weather",
    trip: "Trip",
    article: "Article",
    species: "Species",
    "trail-condition": "Trail condition",
    general: "Observation"
  };

  function text(value) {
    return value == null ? "" : String(value);
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(value, now) {
    var date = value ? new Date(value) : null;
    if (!date || !isFinite(date.getTime())) return "Time unavailable";
    now = now || new Date();
    var diff = now.getTime() - date.getTime();
    if (diff >= 0 && diff < 60000) return "Just now";
    if (diff >= 0 && diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + " min ago";
    if (diff >= 0 && diff < 86400000) return Math.floor(diff / 3600000) + " hr ago";
    if (diff >= 0 && diff < 604800000) return Math.floor(diff / 86400000) + " days ago";
    try {
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
    } catch (error) {
      return date.toISOString().slice(0, 10);
    }
  }

  function sourceLine(item) {
    var parts = [
      item.source && (item.source.label || item.source.id),
      item.location && item.location.label
    ].filter(Boolean);
    if (item.privacy && item.privacy.localOnly) parts.push("on this device");
    return parts.join(" · ");
  }

  function renderItem(item) {
    var href = item.links && item.links.primary;
    var title = escapeHtml(item.title);
    var titleHtml = href
      ? '<a href="' + escapeHtml(href) + '"' +
        (item.links.external ? ' target="_blank" rel="noopener noreferrer"' : "") +
        ">" + title + "</a>"
      : title;
    var summary = item.summary
      ? '<p class="wds-ot__summary">' + escapeHtml(text(item.summary).slice(0, 180)) +
        (text(item.summary).length > 180 ? "…" : "") + "</p>"
      : "";
    var source = sourceLine(item);
    return (
      '<li class="wds-ot__item" data-observation-kind="' + escapeHtml(item.kind) + '">' +
        '<div class="wds-ot__marker" aria-hidden="true"></div>' +
        '<article class="wds-ot__card">' +
          '<div class="wds-ot__meta">' +
            '<span class="wds-ot__kind">' + escapeHtml(KIND_LABELS[item.kind] || "Observation") + "</span>" +
            '<time datetime="' + escapeHtml(item.observedAt) + '">' + escapeHtml(formatTime(item.observedAt)) + "</time>" +
          "</div>" +
          '<h3 class="wds-ot__title">' + titleHtml + "</h3>" +
          summary +
          (source ? '<p class="wds-ot__source">' + escapeHtml(source) + "</p>" : "") +
        "</article>" +
      "</li>"
    );
  }

  function render(items, options) {
    options = options || {};
    var heading = options.heading || "Observation timeline";
    var intro = options.intro || "Recent records from across Waypoint, ordered by when they were observed.";
    if (!items.length) {
      return (
        '<header class="wds-ot__head"><p class="wds-ot__eyebrow">Across Waypoint</p>' +
        "<h2>" + escapeHtml(heading) + "</h2></header>" +
        '<p class="wds-ot__empty">No matching observations are available yet. Source apps keep their own records.</p>'
      );
    }
    return (
      '<header class="wds-ot__head">' +
        '<p class="wds-ot__eyebrow">Across Waypoint</p>' +
        "<h2>" + escapeHtml(heading) + "</h2>" +
        '<p class="wds-ot__intro">' + escapeHtml(intro) + "</p>" +
      "</header>" +
      '<ol class="wds-ot__list">' + items.map(renderItem).join("") + "</ol>" +
      '<p class="wds-ot__honesty">A read-only view of source records. Private details stay controlled by their original app; exact coordinates are never shown here.</p>'
    );
  }

  function mount(element, options) {
    options = options || {};
    var service = global.WDS && global.WDS.platformObservations;
    if (!element) return Promise.resolve([]);
    element.hidden = false;
    element.className = (element.className + " wds-ot").trim();
    element.setAttribute("aria-busy", "true");
    if (!service || !service.query) {
      element.innerHTML = '<p class="wds-ot__empty">Observation timeline is unavailable.</p>';
      element.removeAttribute("aria-busy");
      return Promise.resolve([]);
    }
    return service.query({
      kinds: options.kinds,
      sources: options.sources,
      since: options.since,
      limit: options.limit != null ? options.limit : 4,
      maxPerKind: options.maxPerKind,
      includeArticles: options.includeArticles !== false,
      articlesUrl: options.articlesUrl,
      depth: options.depth || 0,
      extra: options.extra
    }).then(function (items) {
      element.innerHTML = render(items, options);
      element.removeAttribute("aria-busy");
      return items;
    }).catch(function () {
      element.innerHTML = '<p class="wds-ot__empty">Observation timeline could not load right now.</p>';
      element.removeAttribute("aria-busy");
      return [];
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.observationTimeline = {
    version: "1.0.0",
    kindLabels: Object.assign({}, KIND_LABELS),
    formatTime: formatTime,
    render: render,
    mount: mount
  };
})(typeof window !== "undefined" ? window : globalThis);
