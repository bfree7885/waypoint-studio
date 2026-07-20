/**
 * Dashboard V2 — render Today Outside UI.
 */
(function (global) {
  "use strict";

  function esc(s) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s || "");
  }

  function suitabilityClass(s) {
    return "wdb-v2-suit--" + String(s || "fair").replace(/\s+/g, "-");
  }

  function statusBadge(trust) {
    var map = {
      live: { label: "Live", cls: "wdb-v2-status--live" },
      cached: { label: "Cached", cls: "wdb-v2-status--cached" },
      partial: { label: "Partial", cls: "wdb-v2-status--partial" },
      offline: { label: "Offline", cls: "wdb-v2-status--offline" }
    };
    return map[trust] || map.partial;
  }

  function renderHeader(model, opts) {
    opts = opts || {};
    var badge = statusBadge(model.provider.trust || (model.weather.live ? "live" : "partial"));
    var refreshed = model.provider.hydratedAt
      ? new Date(model.provider.hydratedAt).toLocaleString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          month: "short",
          day: "numeric"
        })
      : "Updating…";
    var now = new Date().toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    return (
      '<header class="wdb-v2-header" data-wdb-v2-header>' +
        '<div class="wdb-v2-header__main">' +
          '<p class="wdb-v2-header__eyebrow">Dashboard · Version 2</p>' +
          '<h2 class="wdb-v2-header__title" id="wdb-v2-today-outside">Today Outside</h2>' +
          '<p class="wdb-v2-header__loc" aria-live="polite">' +
            '<span class="wdb-v2-header__pin" aria-hidden="true">◎</span> ' +
            esc(model.location.label) +
          "</p>" +
          '<p class="wdb-v2-header__meta">' +
            '<span>' + esc(now) + "</span>" +
            ' · <span class="wdb-v2-header__source">' + esc(model.location.sourceLabel) + "</span>" +
            ' · <span class="' + esc(badge.cls) + '">' + esc(badge.label) + "</span>" +
            ' · <span class="wdb-v2-header__refresh">Updated ' + esc(refreshed) + "</span>" +
          "</p>" +
        "</div>" +
        '<div class="wdb-v2-header__actions">' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wdb-v2-refresh" aria-label="Refresh dashboard data">Refresh</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-location-change" aria-label="Change location">Location</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-dashboard-settings-open" aria-label="Dashboard settings">Settings</button>' +
        "</div>" +
      "</header>"
    );
  }

  function renderOverviewPanels(model) {
    var c = model.weather.current || {};
    var panels = [];

    if (model.weather.live && c.tempF != null) {
      panels.push({
        id: "weather",
        label: "Now",
        value: Math.round(c.tempF) + "°",
        sub: c.conditions || "Weather",
        tab: "weather"
      });
    }
    if (model.air.live && model.air.aqi != null) {
      panels.push({
        id: "air",
        label: "Air",
        value: "AQI " + model.air.aqi,
        sub: model.air.category || "Air quality",
        tab: "air"
      });
    }
    if (c.uv != null) {
      panels.push({
        id: "uv",
        label: "UV",
        value: "UV " + Math.round(c.uv),
        sub: c.uv >= 6 ? "High later" : "Moderate",
        tab: "weather"
      });
    }
    if (model.daylight.sunrise || model.daylight.sunset) {
      panels.push({
        id: "sun",
        label: "Light",
        value: model.daylight.sunset || model.daylight.sunrise || "—",
        sub: model.daylight.goldenHour ? "Golden hour" : "Sun & moon",
        tab: "sun-moon"
      });
    }
    if (model.rivers.live && model.rivers.sites[0]) {
      var site = model.rivers.sites[0];
      panels.push({
        id: "river",
        label: "River",
        value: site.stageFt != null ? site.stageFt.toFixed(1) + " ft" : "Flow",
        sub: site.trend || site.name,
        tab: "rivers"
      });
    }
    if (model.alerts.items.length) {
      panels.push({
        id: "alerts",
        label: "Alerts",
        value: String(model.alerts.items.length),
        sub: model.alerts.items[0].event,
        tab: "alerts"
      });
    }
    if (model.photography.live && model.photography.summary) {
      panels.push({
        id: "photo",
        label: "Photo",
        value: model.photography.level === "excellent" ? "Strong" : "Fair",
        sub: model.photography.summary.slice(0, 42),
        tab: "photography"
      });
    }

    if (!panels.length) {
      return (
        '<section class="wdb-v2-panels wdb-v2-panels--empty" aria-label="Condition overview">' +
          '<p class="wdb-v2-panels__empty">Overview panels fill in as live data arrives.</p>' +
        "</section>"
      );
    }

    return (
      '<section class="wdb-v2-panels" aria-label="Condition overview">' +
        '<ul class="wdb-v2-panels__grid">' +
          panels
            .map(function (p) {
              return (
                '<li><button type="button" class="wdb-v2-panel" data-wdb-v2-goto-tab="' +
                esc(p.tab) +
                '">' +
                '<span class="wdb-v2-panel__label">' +
                esc(p.label) +
                "</span>" +
                '<span class="wdb-v2-panel__value">' +
                esc(p.value) +
                "</span>" +
                '<span class="wdb-v2-panel__sub">' +
                esc(p.sub) +
                "</span>" +
                "</button></li>"
              );
            })
            .join("") +
        "</ul>" +
      "</section>"
    );
  }

  function renderBriefing(briefing) {
    if (!briefing) return "";
    var secs = briefing.sections || {};
    var keys = ["feel", "changes", "opportunities", "caution", "noticing"];
    var body = keys
      .map(function (k) {
        var s = secs[k];
        if (!s) return "";
        return (
          '<article class="wdb-v2-brief__section">' +
            "<h3>" +
            esc(s.heading) +
            "</h3>" +
            "<p>" +
            esc(s.body) +
            "</p>" +
          "</article>"
        );
      })
      .join("");

    return (
      '<section class="wdb-v2-brief" aria-labelledby="wdb-v2-brief-title" data-wdb-v2-brief>' +
        '<header class="wdb-v2-brief__head">' +
          '<h3 id="wdb-v2-brief-title">' +
          esc(briefing.title || "Today Outside") +
          "</h3>" +
          (briefing.partial
            ? '<p class="wdb-v2-brief__note">Showing cached or partial data — live refresh in progress.</p>'
            : "") +
        "</header>" +
        '<div class="wdb-v2-brief__body">' +
          body +
        "</div>" +
      "</section>"
    );
  }

  function renderTimeline(events) {
    if (!events || !events.length) {
      return (
        '<section class="wdb-v2-timeline" aria-label="Day timeline">' +
          '<h3 class="wdb-v2-section-title">Timeline</h3>' +
          '<p class="wdb-v2-empty">Hourly detail will build the day timeline once weather loads.</p>' +
        "</section>"
      );
    }
    return (
      '<section class="wdb-v2-timeline" aria-label="Day timeline">' +
        '<h3 class="wdb-v2-section-title">Next 24 hours</h3>' +
        '<ol class="wdb-v2-timeline__list">' +
          events
            .map(function (e) {
              return (
                "<li class=\"wdb-v2-timeline__item wdb-v2-timeline__item--" +
                esc(e.kind) +
                '">' +
                '<time class="wdb-v2-timeline__time">' +
                esc(e.timeLabel) +
                "</time>" +
                '<div class="wdb-v2-timeline__body">' +
                "<strong>" +
                esc(e.label) +
                "</strong>" +
                (e.detail ? '<span class="wdb-v2-timeline__detail">' + esc(e.detail) + "</span>" : "") +
                "</div></li>"
              );
            })
            .join("") +
        "</ol>" +
      "</section>"
    );
  }

  function renderActivities(activities, prefs) {
    prefs = prefs || {};
    var ids = prefs.activities || [];
    var list = (activities || []).filter(function (a) {
      return ids.indexOf(a.id) >= 0;
    });
    if (!list.length) list = activities || [];
    return (
      '<section class="wdb-v2-activities" aria-label="Activity intelligence">' +
        '<h3 class="wdb-v2-section-title">Activity intelligence</h3>' +
        '<ul class="wdb-v2-activities__list">' +
          list
            .slice(0, 8)
            .map(function (a) {
              return (
                '<li class="wdb-v2-activity ' +
                suitabilityClass(a.suitability) +
                '">' +
                '<div class="wdb-v2-activity__head">' +
                "<strong>" +
                esc(a.label) +
                "</strong>" +
                '<span class="wdb-v2-activity__suit">' +
                esc(a.suitability.replace(/-/g, " ")) +
                "</span>" +
                (a.bestWindow
                  ? '<span class="wdb-v2-activity__when">around ' + esc(a.bestWindow) + "</span>"
                  : "") +
                "</div>" +
                (a.positives.length
                  ? '<ul class="wdb-v2-activity__pos"><li>' +
                    a.positives.map(esc).join("</li><li>") +
                    "</li></ul>"
                  : "") +
                (a.limits.length
                  ? '<p class="wdb-v2-activity__lim"><span class="wdb-v2-sr">Limiting:</span> ' +
                    esc(a.limits.join(" · ")) +
                    "</p>"
                  : "") +
                "</li>"
              );
            })
            .join("") +
        "</ul>" +
      "</section>"
    );
  }

  function renderWindows(windows) {
    if (!windows || !windows.length) return "";
    return (
      '<section class="wdb-v2-windows" aria-label="Good time to go">' +
        '<h3 class="wdb-v2-section-title">Good time to go</h3>' +
        '<ul class="wdb-v2-windows__list">' +
          windows
            .map(function (w) {
              return (
                "<li>" +
                "<strong>" +
                esc(w.label) +
                "</strong> " +
                esc(w.display) +
                ' <span class="wdb-v2-windows__conf">(' +
                esc(w.confidence) +
                ")</span>" +
                (w.reason ? '<p class="wdb-v2-windows__why">' + esc(w.reason) + "</p>" : "") +
                (w.caveat ? '<p class="wdb-v2-windows__caveat">' + esc(w.caveat) + "</p>" : "") +
                "</li>"
              );
            })
            .join("") +
        "</ul>" +
      "</section>"
    );
  }

  function renderAlertsUnified(model, briefing) {
    var official = model.alerts.items || [];
    var cautions = (briefing && briefing.sections && briefing.sections.caution && briefing.sections.caution.items) || [];
    var providerIssues = (model.provider.trust === "partial" || model.provider.trust === "offline") ? ["Some providers are delayed or cached — environmental readings may be incomplete."] : [];

    return (
      '<section class="wdb-v2-alerts" aria-label="Alerts and cautions">' +
        '<h3 class="wdb-v2-section-title">Alerts &amp; cautions</h3>' +
        (official.length
          ? '<div class="wdb-v2-alerts__official"><h4>Official alerts (NWS)</h4><ul>' +
            official
              .map(function (a) {
                return (
                  "<li><strong>" +
                  esc(a.event) +
                  "</strong>" +
                  (a.severity ? " · " + esc(a.severity) : "") +
                  (a.effective ? " · from " + esc(new Date(a.effective).toLocaleString()) : "") +
                  (a.expires ? " · until " + esc(new Date(a.expires).toLocaleString()) : "") +
                  (a.area ? '<p class="wdb-v2-alerts__area">' + esc(a.area) + "</p>" : "") +
                  (a.headline ? "<p>" + esc(a.headline) + "</p>" : "") +
                  (a.url ? '<p><a href="' + esc(a.url) + '" rel="noopener noreferrer">Full official details</a></p>' : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul></div>"
          : '<p class="wdb-v2-alerts__clear">No active National Weather Service alerts for this area.</p>') +
        (cautions.length
          ? '<div class="wdb-v2-alerts__caution"><h4>Dashboard cautions</h4><ul>' +
            cautions.map(function (c) {
              return "<li>" + esc(c) + "</li>";
            }).join("") +
            "</ul></div>"
          : "") +
        (providerIssues.length
          ? '<div class="wdb-v2-alerts__provider"><h4>Data status</h4><ul>' +
            providerIssues.map(function (p) {
              return "<li>" + esc(p) + "</li>";
            }).join("") +
            "</ul></div>"
          : "") +
      "</section>"
    );
  }

  function renderObserve(cards) {
    if (!cards || !cards.length) return "";
    return (
      '<section class="wdb-v2-observe" aria-label="Observe today">' +
        '<h3 class="wdb-v2-section-title">Observe today</h3>' +
        '<ul class="wdb-v2-observe__list">' +
          cards
            .map(function (c) {
              return (
                "<li><p>" +
                esc(c.text) +
                "</p>" +
                (c.link
                  ? '<p><a class="wdb-v2-observe__link" href="' +
                    esc(c.link.href) +
                    '">' +
                    esc(c.link.label) +
                    "</a></p>"
                  : "") +
                "</li>"
              );
            })
            .join("") +
        "</ul>" +
      "</section>"
    );
  }

  function renderTrust(rows) {
    return (
      '<details class="wdb-v2-trust">' +
        '<summary>Provider trust &amp; data quality</summary>' +
        '<table class="wdb-v2-trust__table">' +
          "<thead><tr><th>Provider</th><th>Status</th><th>Last data</th></tr></thead><tbody>" +
          (rows || [])
            .map(function (r) {
              return (
                "<tr><td>" +
                esc(r.provider) +
                "</td><td>" +
                esc(r.status) +
                "</td><td>" +
                esc(r.age) +
                "</td></tr>"
              );
            })
            .join("") +
          "</tbody></table>" +
      "</details>"
    );
  }

  function renderRiverIntel(model) {
    if (!model.rivers.live || !model.rivers.sites.length) return "";
    return (
      '<section class="wdb-v2-rivers" aria-label="River intelligence">' +
        '<h3 class="wdb-v2-section-title">River intelligence</h3>' +
        '<ul class="wdb-v2-rivers__list">' +
          model.rivers.sites
            .slice(0, 3)
            .map(function (s) {
              return (
                "<li><strong>" +
                esc(s.name) +
                "</strong>" +
                (s.distanceMi != null ? " · " + esc(s.distanceMi.toFixed(1)) + " mi" : "") +
                (s.stageFt != null ? " · " + esc(s.stageFt.toFixed(1)) + " ft stage" : "") +
                (s.flowCfs != null ? " · " + esc(Math.round(s.flowCfs)) + " cfs" : "") +
                (s.trend ? " · " + esc(s.trend) : "") +
                (s.stale ? ' · <span class="wdb-v2-rivers__stale">stale reading</span>' : "") +
                (s.observedAt ? " · " + esc(s.observedAt) : "") +
                ' · <span class="wdb-v2-rivers__src">' +
                esc(s.source) +
                "</span></li>"
              );
            })
            .join("") +
        "</ul>" +
        '<p class="wdb-v2-rivers__note">Interpretation only — not a flood or paddling safety guarantee. See Alerts for official warnings.</p>' +
      "</section>"
    );
  }

  function renderPhotoIntel(model) {
    var p = model.photography;
    if (!p.live && !model.daylight.goldenHour) return "";
    return (
      '<section class="wdb-v2-photo" aria-label="Photography intelligence">' +
        '<h3 class="wdb-v2-section-title">Photography light</h3>' +
        (p.summary ? "<p><strong>" + esc(p.summary) + "</strong></p>" : "") +
        (p.detail ? "<p>" + esc(p.detail) + "</p>" : "") +
        (model.daylight.goldenHour ? "<p>Golden hour: " + esc(model.daylight.goldenHour) + "</p>" : "") +
        (model.daylight.blueHour ? "<p>Blue hour: " + esc(model.daylight.blueHour) + "</p>" : "") +
        '<p class="wdb-v2-photo__links"><a href="../../apps/photo-coach/">Photo Coach</a> · <a href="../../apps/scenes/">Scenes</a></p>' +
      "</section>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Render = {
    renderHeader: renderHeader,
    renderOverviewPanels: renderOverviewPanels,
    renderBriefing: renderBriefing,
    renderTimeline: renderTimeline,
    renderActivities: renderActivities,
    renderWindows: renderWindows,
    renderAlertsUnified: renderAlertsUnified,
    renderObserve: renderObserve,
    renderTrust: renderTrust,
    renderRiverIntel: renderRiverIntel,
    renderPhotoIntel: renderPhotoIntel
  };
})(window);
