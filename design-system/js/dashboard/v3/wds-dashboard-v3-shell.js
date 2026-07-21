/**
 * Dashboard V3 — shell composition.
 * Structure: Header → Today's Outdoor Brief → Widget Area → Customize → Footer
 * Kiosk: larger type, live clock, sticky Brief, minimal chrome, connectivity banner.
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

  function isOnline() {
    var Rel = global.WDS && global.WDS.dashboardReliability;
    if (Rel && Rel.isOnline) return Rel.isOnline();
    try {
      return typeof navigator === "undefined" || navigator.onLine !== false;
    } catch (e) {
      return true;
    }
  }

  function renderConnectivity(model, kiosk) {
    var trust = model.provider && model.provider.trust;
    var offline = !isOnline() || trust === "offline";
    var cached = trust === "cached";
    if (!offline && !cached && !kiosk) return "";
    var msg = offline
      ? "Offline — showing cached outdoor readings when available. Reconnect to refresh."
      : cached
        ? "Showing the last known conditions from this device."
        : "";
    if (!msg && kiosk) {
      return (
        '<div class="wdb-v3-connectivity" data-wdb-v3-connectivity data-state="online" hidden role="status" aria-live="polite"></div>'
      );
    }
    if (!msg) return "";
    return (
      '<div class="wdb-v3-connectivity" data-wdb-v3-connectivity data-state="' +
      (offline ? "offline" : "cached") +
      '" role="status" aria-live="polite">' +
      esc(msg) +
      "</div>"
    );
  }

  function renderHeader(model, opts) {
    opts = opts || {};
    var kiosk = !!opts.kiosk;
    var trust =
      model.provider && model.provider.trust
        ? model.provider.trust
        : model.weather && model.weather.live
          ? "live"
          : "partial";
    var badge = statusBadge(trust);
    var now = new Date();
    var nowLabel = now.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    var clockLabel = now.toLocaleString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    });
    var dateLabel = now.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    });

    var kioskBtn =
      '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wdb-v2-kiosk" aria-pressed="' +
      (kiosk ? "true" : "false") +
      '" aria-label="' +
      (kiosk ? "Exit full screen kiosk" : "Enter full screen kiosk") +
      '">' +
      (kiosk ? "Exit kiosk" : "Kiosk") +
      "</button>";

    var clockBlock = kiosk
      ? '<div class="wdb-v3-header__clock" data-wdb-v3-clock-block aria-label="Current time">' +
        '<time class="wdb-v3-header__clock-time" data-wdb-v3-clock datetime="' +
        esc(now.toISOString()) +
        '">' +
        esc(clockLabel) +
        "</time>" +
        '<p class="wdb-v3-header__clock-date" data-wdb-v3-clock-date>' +
        esc(dateLabel) +
        "</p></div>"
      : "";

    var actions =
      '<div class="wdb-v3-header__actions wdb-v2-header__actions">' +
      (kiosk
        ? ""
        : '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" id="wdb-v2-customize-open" aria-haspopup="dialog">Customize Dashboard</button>') +
      (kiosk
        ? ""
        : '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-location-change" aria-label="Change location">Change location</button>') +
      '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wdb-v2-refresh" aria-label="Refresh dashboard data">Refresh</button>' +
      kioskBtn +
      "</div>";

    return (
      '<header class="wdb-v3-header wdb-v2-header' +
      (kiosk ? " wdb-v3-header--kiosk" : "") +
      '" data-wdb-v3-header data-wdb-v2-header>' +
      '<div class="wdb-v3-header__main wdb-v2-header__main">' +
      '<p class="wdb-v3-header__eyebrow wdb-v2-header__eyebrow">' +
      (kiosk ? "Waypoint Studio · Outdoor briefing" : "This morning") +
      "</p>" +
      '<h2 class="wdb-v3-header__title wdb-v2-header__title" id="wdb-v3-dashboard-title">' +
      (kiosk ? "Outdoor briefing" : "How is today?") +
      "</h2>" +
      (kiosk
        ? ""
        : '<p class="wdb-v3-header__promise">A calm outdoor brief — not a wall of widgets.</p>') +
      '<p class="wdb-v3-header__loc wdb-v2-header__loc" aria-live="polite">' +
      '<span class="wdb-v2-header__pin" aria-hidden="true">◎</span> ' +
      esc(model.location && model.location.label ? model.location.label : "Locating…") +
      "</p>" +
      '<p class="wdb-v3-header__meta wdb-v2-header__meta">' +
      (kiosk
        ? ""
        : '<time datetime="' +
          esc(now.toISOString()) +
          '">' +
          esc(nowLabel) +
          "</time> · ") +
      '<span class="wdb-v2-header__fresh">Data ' +
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
      clockBlock +
      actions +
      "</header>"
    );
  }

  function renderCustomizeBar(kiosk) {
    if (kiosk) return "";
    return (
      '<section class="wdb-v3-customize-bar" data-wdb-v3-customize-bar aria-label="Deeper tools">' +
      '<div class="wdb-v3-customize-bar__copy">' +
      "<h3>Deeper tools</h3>" +
      "<p>Only if you need them — arrange what matters for today’s plans. Preferences stay on this device.</p>" +
      "</div>" +
      '<button type="button" class="wds-btn wds-btn--secondary" id="wdb-v3-customize-open" data-wdb-v3-customize-trigger>Customize Dashboard</button>' +
      "</section>"
    );
  }

  function renderFooter(providers, kiosk) {
    if (kiosk) {
      return (
        '<footer class="wdb-v3-footer wdb-v3-footer--kiosk" data-wdb-v3-footer>' +
        '<p class="wdb-v3-footer__note">Auto-refreshes while open · Esc exits full screen · Same outdoor data model as Dashboard</p>' +
        "</footer>"
      );
    }
    var trustHtml = "";
    var R = global.WDS && global.WDS.dashboardV2Render;
    if (R && R.renderTrust) trustHtml = R.renderTrust(providers);
    return (
      '<footer class="wdb-v3-footer" data-wdb-v3-footer>' +
      '<p class="wdb-v3-footer__note">Glanceable cues load on their own. Cached readings show first; slow sources never block this brief.</p>' +
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
    var briefHtml = Brief && Brief.render ? Brief.render(brief, { sticky: !!(opts.kiosk || payload.kiosk) }) : "";
    var widgetsHtml = payload.widgetsHtml || "";
    var kiosk = !!(opts.kiosk || payload.kiosk);

    return (
      '<div class="wdb-v3 wdb-v2' +
      (kiosk ? " wdb-v3--kiosk wdb-v2--kiosk" : "") +
      '" data-wdb-v3 data-wdb-v2 data-dashboard-version="3" data-wdb-v3-layout="foundation"' +
      (kiosk ? ' data-wdb-v3-kiosk="1"' : "") +
      ' role="region" aria-labelledby="wdb-v3-dashboard-title">' +
      renderConnectivity(model, kiosk) +
      renderHeader(model, { kiosk: kiosk }) +
      '<a class="wdb-v2-jump wdb-v3-jump" href="#wdb-v3-brief-title">Skip to Today’s Outdoor Brief</a>' +
      briefHtml +
      '<section class="wdb-v3-widgets-area" data-wdb-v3-widgets-area aria-labelledby="wdb-v3-widgets-title">' +
      '<h3 class="wdb-v3-widgets-area__title" id="wdb-v3-widgets-title">What conditions matter?</h3>' +
      widgetsHtml +
      "</section>" +
      renderCustomizeBar(kiosk) +
      renderFooter(payload.providers, kiosk) +
      "</div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Shell = {
    VERSION: "3.1.0",
    renderHeader: renderHeader,
    renderCustomizeBar: renderCustomizeBar,
    renderFooter: renderFooter,
    renderConnectivity: renderConnectivity,
    render: render
  };
})(window);
