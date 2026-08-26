/**
 * Dashboard Rebuild — compact Discover natural-event card.
 * Temporal kickers: COMING SOON / TONIGHT / HAPPENING NOW.
 * Provenance in a Why panel — not a citation dump on the card.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0-discover-events";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveEvents(ctx) {
    ctx = ctx || {};
    if (Array.isArray(ctx.events) && ctx.events.length) return ctx.events;
    var NE = global.WDS && global.WDS.naturalEvents;
    if (!NE || typeof NE.activeDiscoverEvents !== "function") return [];
    var loc = ctx.location || ctx.placeContext || {};
    var platform = ctx.platform || null;
    return NE.activeDiscoverEvents({
      catalog: ctx.catalog || (NE.getCatalog && NE.getCatalog()) || null,
      now: ctx.now || new Date(),
      lat: loc.lat != null ? loc.lat : loc.latitude,
      lng: loc.lng != null ? loc.lng : loc.longitude,
      timeZone:
        loc.timezone ||
        (platform && platform.timezone) ||
        (platform && platform.daylight && platform.daylight.timezone) ||
        null,
      platform: platform
    });
  }

  function evidenceRows(item) {
    var rows = [];
    if (!item) return rows;
    if (item.local && item.local.greatest) {
      rows.push({ metric: "Maximum (local)", value: item.local.greatest });
    }
    if (item.local && item.local.partialStart) {
      rows.push({ metric: "Partial begins (local)", value: item.local.partialStart });
    }
    if (item.local && item.local.partialEnd) {
      rows.push({ metric: "Partial ends (local)", value: item.local.partialEnd });
    }
    if (item.magnitude != null) {
      rows.push({ metric: "Umbral magnitude", value: String(item.magnitude) });
    }
    if (item.timeZone) {
      rows.push({ metric: "Display timezone", value: item.timeZone });
    }
    (item.sources || []).forEach(function (src) {
      if (!src || !src.name) return;
      rows.push({
        metric: src.role === "primary-contacts" ? "Timing source" : "Source",
        value: src.name
      });
    });
    rows.push({ metric: "Timing confidence", value: "High (computed ephemeris contacts)" });
    if (item.outlook) {
      rows.push({
        metric: "Weather context",
        value: item.outlook.uncertainty === "forecast" ? "Open-Meteo forecast (uncertain)" : "Current Open-Meteo (not a timed forecast)"
      });
    }
    return rows;
  }

  function renderItem(item, index) {
    var detail = ((item.copy && item.copy.detail) || []).slice(0, 3);
    var rows = evidenceRows(item)
      .map(function (e) {
        return (
          '<div class="wdb-r-event__evidence-row">' +
          "<dt>" +
          escapeHtml(e.metric) +
          "</dt>" +
          "<dd>" +
          escapeHtml(e.value) +
          "</dd>" +
          "</div>"
        );
      })
      .join("");
    return (
      '<article class="wdb-r-event" data-wdb-r-event-item data-event-id="' +
      escapeHtml(item.id) +
      '" data-event-state="' +
      escapeHtml(item.state) +
      '">' +
      '<p class="wdb-r-event__kicker">' +
      escapeHtml(item.kicker || "COMING SOON") +
      "</p>" +
      '<h2 class="wdb-r-event__title" id="wdb-r-event-title-' +
      index +
      '">' +
      escapeHtml(item.title) +
      "</h2>" +
      (item.copy && item.copy.lede
        ? '<p class="wdb-r-event__lede">' + escapeHtml(item.copy.lede) + "</p>"
        : "") +
      (detail.length
        ? '<ul class="wdb-r-event__facts">' +
          detail
            .map(function (line) {
              return "<li>" + escapeHtml(line) + "</li>";
            })
            .join("") +
          "</ul>"
        : "") +
      '<div class="wdb-r-event__actions">' +
      '<button type="button" class="wdb-r-event__why" data-wdb-r-event-why aria-expanded="false">Based on what?</button>' +
      "</div>" +
      '<div class="wdb-r-event__evidence" hidden data-wdb-r-event-evidence>' +
      '<p class="wdb-r-event__evidence-label">Based on</p>' +
      '<dl class="wdb-r-event__evidence-list">' +
      rows +
      "</dl>" +
      "</div>" +
      "</article>"
    );
  }

  function render(ctx) {
    var events = resolveEvents(ctx);
    if (!events.length) return "";
    return (
      '<section class="wdb-r-events" data-wdb-r-events aria-label="Coming soon outdoors">' +
      events.map(renderItem).join("") +
      "</section>"
    );
  }

  function bind(host) {
    if (!host || typeof host.querySelectorAll !== "function") return;
    var root = host.querySelector("[data-wdb-r-events]");
    if (!root) return;
    root.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var whyBtn = t.closest("[data-wdb-r-event-why]");
      if (!whyBtn) return;
      ev.preventDefault();
      var item = whyBtn.closest("[data-wdb-r-event-item]");
      var panel = item && item.querySelector("[data-wdb-r-event-evidence]");
      if (!panel) return;
      var open = whyBtn.getAttribute("aria-expanded") === "true";
      whyBtn.setAttribute("aria-expanded", open ? "false" : "true");
      if (open) panel.setAttribute("hidden", "");
      else panel.removeAttribute("hidden");
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildEvents = {
    version: VERSION,
    render: render,
    bind: bind,
    resolveEvents: resolveEvents
  };
})(typeof window !== "undefined" ? window : global);
