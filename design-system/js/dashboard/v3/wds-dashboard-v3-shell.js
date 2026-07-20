/**
 * Dashboard V3 — shell composition.
 * Structure: Header → Today's Outdoor Brief → Widget Area → Customize → Footer
 */
(function (global) {
  "use strict";

  function esc(s) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s == null ? "" : s);
  }

  function statusBadge(trust) {
    var map = {
      live: { label: "Live", cls: "wdb-v2-status--live" },
      cached: { label: "Cached", cls: "wdb-v2-status--cached" },
      partial: { label: "Partial", cls: "wdb-v2-status--partial" },
      offline: { label: "Offline", cls: "wdb-v2-status--offline" },
      "provider-unavailable": { label: "Provider Unavailable", cls: "wdb-v2-status--partial" }
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
    var trust =
      model.provider && model.provider.trust
        ? model.provider.trust
        : model.weather && model.weather.live
          ? "live"
          : "partial";
    var badge = statusBadge(trust);
    var now = new Date().toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    var kioskBtn =
      '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wdb-v2-kiosk" aria-label="Toggle full screen">' +
      (opts.kiosk ? "Full screen" : "Kiosk") +
      "</button>";

    return (
      '<header class="wdb-v3-header wdb-v2-header" data-wdb-v3-header data-wdb-v2-header>' +
      '<div class="wdb-v3-header__main wdb-v2-header__main">' +
      '<p class="wdb-v3-header__eyebrow wdb-v2-header__eyebrow">Waypoint Studio · Outdoor Intelligence</p>' +
      '<h2 class="wdb-v3-header__title wdb-v2-header__title" id="wdb-v3-dashboard-title">Dashboard</h2>' +
      '<p class="wdb-v3-header__loc wdb-v2-header__loc" aria-live="polite">' +
      '<span class="wdb-v2-header__pin" aria-hidden="true">◎</span> ' +
      esc(model.location && model.location.label ? model.location.label : "Locating…") +
      "</p>" +
      '<p class="wdb-v3-header__meta wdb-v2-header__meta">' +
      '<time datetime="' +
      esc(new Date().toISOString()) +
      '">' +
      esc(now) +
      "</time>" +
      ' · <span class="wdb-v2-header__fresh">Data ' +
      esc(formatFreshness(model)) +
      "</span>" +
      ' · <span class="' +
      esc(badge.cls) +
      '" data-wdb-v2-trust data-wdb-v3-trust>' +
      esc(badge.label) +
      "</span>" +
      (model.location && model.location.sourceLabel
        ? ' · <span class="wdb-v2-header__source">' + esc(model.location.sourceLabel) + "</span>"
        : "") +
      "</p></div>" +
      '<div class="wdb-v3-header__actions wdb-v2-header__actions">' +
      '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" id="wdb-v2-customize-open" aria-haspopup="dialog">Customize Dashboard</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-location-change" aria-label="Change location">Change location</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wdb-v2-refresh" aria-label="Refresh dashboard data">Refresh</button>' +
      kioskBtn +
      "</div></header>"
    );
  }

  function renderCustomizeBar() {
    return (
      '<section class="wdb-v3-customize-bar" data-wdb-v3-customize-bar aria-label="Customize Dashboard">' +
      '<div class="wdb-v3-customize-bar__copy">' +
      "<h3>Customize Dashboard</h3>" +
      "<p>Choose categories and widgets that match today’s plans. Layout preferences stay on this device.</p>" +
      "</div>" +
      '<button type="button" class="wds-btn wds-btn--secondary" id="wdb-v3-customize-open" data-wdb-v3-customize-trigger>Customize widgets</button>' +
      "</section>"
    );
  }

  function renderFooter(providers) {
    var trustHtml = "";
    var R = global.WDS && global.WDS.dashboardV2Render;
    if (R && R.renderTrust) trustHtml = R.renderTrust(providers);
    return (
      '<footer class="wdb-v3-footer" data-wdb-v3-footer>' +
      '<p class="wdb-v3-footer__note">Widgets load independently. Cached readings show first; slow providers never block this page.</p>' +
      trustHtml +
      "</footer>"
    );
  }

  /**
   * Compose full V3 shell HTML.
   */
  function render(payload, opts) {
    opts = opts || {};
    payload = payload || {};
    var model = payload.model || {};
    var Brief = global.WDS && global.WDS.dashboardV3Brief;
    var brief = payload.brief || (Brief && Brief.build ? Brief.build({ model: model, take: payload.take }) : null);
    var briefHtml = Brief && Brief.render ? Brief.render(brief) : "";
    var widgetsHtml = payload.widgetsHtml || "";
    var kiosk = !!(opts.kiosk || payload.kiosk);

    return (
      '<div class="wdb-v3 wdb-v2' +
      (kiosk ? " wdb-v3--kiosk wdb-v2--kiosk" : "") +
      '" data-wdb-v3 data-wdb-v2 data-dashboard-version="3" data-wdb-v3-layout="foundation"' +
      (kiosk ? ' data-wdb-v3-kiosk="1"' : "") +
      ">" +
      renderHeader(model, { kiosk: kiosk }) +
      '<a class="wdb-v2-jump wdb-v3-jump" href="#wdb-v3-brief-title">Skip to Today’s Outdoor Brief</a>' +
      briefHtml +
      '<section class="wdb-v3-widgets-area" data-wdb-v3-widgets-area aria-label="Widget area">' +
      '<h3 class="wdb-v3-widgets-area__title" id="wdb-v3-widgets-title">Conditions &amp; cues</h3>' +
      widgetsHtml +
      "</section>" +
      renderCustomizeBar() +
      renderFooter(payload.providers) +
      "</div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Shell = {
    VERSION: "3.0.0",
    renderHeader: renderHeader,
    renderCustomizeBar: renderCustomizeBar,
    renderFooter: renderFooter,
    render: render
  };
})(window);
