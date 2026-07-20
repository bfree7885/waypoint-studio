/**
 * Dashboard V3 — modular widget contract.
 * Common interface: title, icon, primary value, secondary details,
 * last updated, loading, error, refresh, expand, Waypoint's Take section.
 * Widgets are independent modules — no cross-widget dependencies.
 */
(function (global) {
  "use strict";

  function esc(s) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s == null ? "" : s);
  }

  /**
   * Normalize a widget view-model into the V3 contract shape.
   * @param {object} partial
   * @returns {object}
   */
  function normalize(partial) {
    partial = partial || {};
    return {
      id: partial.id || "unknown",
      category: partial.category || "weather",
      title: partial.title || partial.name || "Widget",
      icon: partial.icon || "dot",
      description: partial.description || "",
      primaryValue: partial.primaryValue != null ? partial.primaryValue : null,
      secondaryDetails: Array.isArray(partial.secondaryDetails)
        ? partial.secondaryDetails
        : partial.secondaryDetails
          ? [partial.secondaryDetails]
          : [],
      lastUpdated: partial.lastUpdated || null,
      availability: partial.availability || partial.state || "partial",
      loading: !!partial.loading,
      error: partial.error || null,
      take: Array.isArray(partial.take) ? partial.take : partial.take ? [partial.take] : [],
      expandTab: partial.expandTab || partial.tab || null,
      size: partial.size || "md",
      bodyHtml: partial.bodyHtml || "",
      refreshable: partial.refreshable !== false,
      expandable: partial.expandable !== false
    };
  }

  function statusLabel(availability) {
    var Cat = global.WDS && global.WDS.dashboardV2Widgets;
    if (Cat && Cat.availabilityLabel) return Cat.availabilityLabel(availability);
    var map = {
      live: "Live",
      derived: "Derived",
      planned: "Planned",
      experimental: "Experimental",
      unavailable: "Data unavailable",
      loading: "Loading",
      error: "Error",
      cached: "Cached",
      partial: "Partial"
    };
    return map[availability] || availability || "Unknown";
  }

  function formatUpdated(iso) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return null;
    }
  }

  /**
   * Render a single widget card from the V3 contract.
   * Failures are isolated — caller should wrap in try/catch if needed.
   */
  function renderCard(view) {
    view = normalize(view);
    var avail = view.loading ? "loading" : view.error ? "error" : view.availability;
    var updated = formatUpdated(view.lastUpdated);
    var primary =
      view.primaryValue != null && view.primaryValue !== ""
        ? '<p class="wdb-v3-widget__primary">' + esc(String(view.primaryValue)) + "</p>"
        : "";
    var secondary = "";
    if (view.secondaryDetails.length) {
      secondary =
        '<ul class="wdb-v3-widget__secondary">' +
        view.secondaryDetails
          .slice(0, 6)
          .map(function (d) {
            return "<li>" + esc(String(d)) + "</li>";
          })
          .join("") +
        "</ul>";
    }

    var takeHtml = "";
    if (view.take.length) {
      takeHtml =
        '<div class="wdb-v3-widget__take" data-wdb-v3-widget-take>' +
        '<p class="wdb-v3-widget__take-label">Waypoint’s Take</p>' +
        "<ul>" +
        view.take
          .slice(0, 3)
          .map(function (t) {
            return "<li>" + esc(String(t)) + "</li>";
          })
          .join("") +
        "</ul></div>";
    }

    var actions = '<div class="wdb-v3-widget__actions">';
    if (view.refreshable) {
      actions +=
        '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v3-widget-refresh="' +
        esc(view.id) +
        '" aria-label="Refresh ' +
        esc(view.title) +
        '">Refresh</button>';
    }
    if (view.expandable && view.expandTab) {
      actions +=
        '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v2-goto-tab="' +
        esc(view.expandTab) +
        '" data-wdb-v3-widget-expand="' +
        esc(view.id) +
        '">Expand</button>';
    }
    actions += "</div>";

    var body = view.loading
      ? '<p class="wdb-v3-widget__muted" role="status">Loading…</p>'
      : view.error
        ? '<p class="wdb-v3-widget__error" role="alert">' + esc(String(view.error)) + "</p>"
        : view.bodyHtml || primary + secondary;

    return (
      '<article class="wdb-v3-widget wdb-v2-widget" data-wdb-v3-widget="' +
      esc(view.id) +
      '" data-wdb-v2-widget="' +
      esc(view.id) +
      '" data-category="' +
      esc(view.category) +
      '" data-size="' +
      esc(view.size) +
      '" data-availability="' +
      esc(avail) +
      '" data-layout-item="' +
      esc(view.id) +
      '">' +
      '<header class="wdb-v3-widget__head wdb-v2-widget__head">' +
      '<span class="wdb-v3-widget__icon" aria-hidden="true" data-icon="' +
      esc(view.icon) +
      '"></span>' +
      '<h4 class="wdb-v3-widget__title wdb-v2-widget__title">' +
      esc(view.title) +
      "</h4>" +
      '<span class="wdb-v3-widget__avail wdb-v2-widget__avail wdb-v2-widget__avail--' +
      esc(avail) +
      '">' +
      esc(statusLabel(avail)) +
      "</span>" +
      "</header>" +
      (view.description
        ? '<p class="wdb-v3-widget__desc wdb-v2-widget__desc">' + esc(view.description) + "</p>"
        : "") +
      '<div class="wdb-v3-widget__body wdb-v2-widget__body">' +
      body +
      "</div>" +
      (updated
        ? '<p class="wdb-v3-widget__updated"><time datetime="' +
          esc(view.lastUpdated) +
          '">Updated ' +
          esc(updated) +
          "</time></p>"
        : "") +
      takeHtml +
      actions +
      "</article>"
    );
  }

  /**
   * Safe render — isolates widget failures so one broken module cannot blank the board.
   */
  function renderCardSafe(view) {
    try {
      return renderCard(view);
    } catch (err) {
      var id = view && view.id ? view.id : "unknown";
      var title = view && (view.title || view.name) ? view.title || view.name : "Widget";
      return (
        '<article class="wdb-v3-widget wdb-v3-widget--error" data-wdb-v3-widget="' +
        esc(id) +
        '" data-availability="error">' +
        '<header class="wdb-v3-widget__head"><h4 class="wdb-v3-widget__title">' +
        esc(title) +
        "</h4>" +
        '<span class="wdb-v3-widget__avail">Error</span></header>' +
        '<p class="wdb-v3-widget__error" role="alert">This widget failed independently and did not block the dashboard.</p>' +
        "</article>"
      );
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Contract = {
    VERSION: "3.0.0",
    normalize: normalize,
    renderCard: renderCard,
    renderCardSafe: renderCardSafe,
    statusLabel: statusLabel
  };
})(window);
