/**
 * Dashboard V2 — render customizable widget dashboard + Waypoint’s Take.
 */
(function (global) {
  "use strict";

  function esc(s) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s || "");
  }

  function statusBadge(trust) {
    var map = {
      live: { label: "Live", cls: "wds-status wds-status--live wdb-v2-status--live" },
      cached: { label: "Waiting", cls: "wds-status wds-status--waiting wdb-v2-status--cached" },
      partial: { label: "Partial", cls: "wds-status wds-status--estimated wdb-v2-status--partial" },
      offline: { label: "Offline", cls: "wds-status wds-status--offline wdb-v2-status--offline" },
      "provider-unavailable": { label: "Unavailable", cls: "wds-status wds-status--offline wdb-v2-status--partial" }
    };
    return map[trust] || map.partial;
  }

  function formatFreshness(model) {
    if (!model.provider || !model.provider.hydratedAt) return "Updating…";
    return new Date(model.provider.hydratedAt).toLocaleString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric"
    });
  }

  function renderHeader(model, opts) {
    opts = opts || {};
    var trust = model.provider && model.provider.trust ? model.provider.trust : model.weather.live ? "live" : "partial";
    var badge = statusBadge(trust);
    var now = new Date().toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    var kiosk = opts.kiosk
      ? '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wdb-v2-kiosk" aria-label="Toggle full screen">Full screen</button>'
      : '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wdb-v2-kiosk" aria-label="Toggle full screen">Kiosk</button>';

    return (
      '<header class="wdb-v2-header" data-wdb-v2-header>' +
        '<div class="wdb-v2-header__main">' +
          '<p class="wdb-v2-header__eyebrow">Waypoint Studio · Dashboard</p>' +
          '<h2 class="wdb-v2-header__title" id="wdb-v2-dashboard-title">Outdoor Intelligence</h2>' +
          '<p class="wdb-v2-header__loc" aria-live="polite">' +
            '<span class="wdb-v2-header__pin" aria-hidden="true">◎</span> ' +
            esc(model.location.label) +
          "</p>" +
          '<p class="wdb-v2-header__meta">' +
            '<time datetime="' + esc(new Date().toISOString()) + '">' + esc(now) + "</time>" +
            ' · <span class="wdb-v2-header__fresh">Data ' + esc(formatFreshness(model)) + "</span>" +
            ' · <span class="' + esc(badge.cls) + '" data-wdb-v2-trust>' + esc(badge.label) + "</span>" +
            ' · <span class="wdb-v2-header__source">' + esc(model.location.sourceLabel) + "</span>" +
          "</p>" +
        "</div>" +
        '<div class="wdb-v2-header__actions">' +
          '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" id="wdb-v2-customize-open" aria-haspopup="dialog">Customize widgets</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-location-change" aria-label="Change location">Change location</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wdb-v2-refresh" aria-label="Refresh dashboard data">Refresh</button>' +
          kiosk +
        "</div>" +
      "</header>"
    );
  }

  function renderWidgets(model, selectedIds) {
    var WR = global.WDS && global.WDS.dashboardV2WidgetRender;
    if (!WR || !WR.renderGrouped) {
      return '<section class="wdb-v2-widgets wdb-v2-widgets--empty"><p class="wdb-v2-empty">Widgets loading…</p></section>';
    }
    return WR.renderGrouped(selectedIds || [], model);
  }

  function renderWaypointsTake(take) {
    take = take || { bullets: [], trustNote: null };
    var bullets = take.bullets || [];
    if (!bullets.length) {
      return (
        '<section class="wdb-v2-take" aria-labelledby="wdb-v2-take-title">' +
          '<h3 class="wdb-v2-take__title" id="wdb-v2-take-title">Waypoint’s Take</h3>' +
          '<p class="wdb-v2-empty">Interpretation will appear once enough live data is available.</p>' +
        "</section>"
      );
    }
    return (
      '<section class="wdb-v2-take" aria-labelledby="wdb-v2-take-title">' +
        '<h3 class="wdb-v2-take__title" id="wdb-v2-take-title">Waypoint’s Take</h3>' +
        (take.trustNote ? '<p class="wdb-v2-take__note" role="note">' + esc(take.trustNote) + "</p>" : "") +
        '<ul class="wdb-v2-take__list">' +
          bullets
            .map(function (b) {
              return "<li>" + esc(b) + "</li>";
            })
            .join("") +
        "</ul>" +
      "</section>"
    );
  }

  /* Legacy Today Outside renderers kept for unit reuse / gradual migration */
  function renderBriefing(briefing) {
    if (!briefing || !briefing.sections) return "";
    var keys = ["feel", "changes", "opportunities", "caution", "noticing"];
    var titles = {
      feel: "What it feels like",
      changes: "What changes today",
      opportunities: "Best opportunities",
      caution: "Use caution",
      noticing: "Worth noticing"
    };
    return (
      '<section class="wdb-v2-brief wdb-v2-brief--legacy" aria-label="Today Outside briefing (legacy)">' +
        keys
          .map(function (k) {
            var s = briefing.sections[k];
            if (!s) return "";
            return (
              '<article class="wdb-v2-brief__section">' +
                "<h3>" + esc(titles[k] || k) + "</h3>" +
                "<p>" + esc(s.body || s.text || "") + "</p>" +
              "</article>"
            );
          })
          .join("") +
      "</section>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Render = {
    renderHeader: renderHeader,
    renderWidgets: renderWidgets,
    renderWaypointsTake: renderWaypointsTake,
    renderBriefing: renderBriefing,
    renderOverviewPanels: function () {
      return "";
    },
    renderTimeline: function () {
      return "";
    },
    renderActivities: function () {
      return "";
    },
    renderWindows: function () {
      return "";
    },
    renderAlertsUnified: function () {
      return "";
    },
    renderRiverIntel: function () {
      return "";
    },
    renderPhotoIntel: function () {
      return "";
    },
    renderObserve: function () {
      return "";
    },
    renderTrust: function (providers) {
      if (!providers || !providers.length) return "";
      return (
        '<details class="wdb-v2-trust">' +
          '<summary class="wdb-v2-section-title">Provider trust</summary>' +
          '<table class="wdb-v2-trust__table"><thead><tr><th>Source</th><th>Status</th></tr></thead><tbody>' +
          providers
            .map(function (p) {
              return "<tr><td>" + esc(p.label || p.id) + "</td><td>" + esc(p.status || p.trust) + "</td></tr>";
            })
            .join("") +
          "</tbody></table></details>"
      );
    }
  };
})(window);
