/**
 * Dashboard Rebuild — Today Outside summary container (Phase 1 shell).
 * Compact premium panel; honest empty — no intelligence or OS briefing.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function placeLabel(ctx) {
    ctx = ctx || {};
    if (ctx.placeLabel) return String(ctx.placeLabel);
    if (ctx.displayTitle) return String(ctx.displayTitle);
    if (ctx.name) return String(ctx.name);
    return "Place not set";
  }

  function timeContext(now) {
    now = now || new Date();
    try {
      return now.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (e) {
      return now.toISOString();
    }
  }

  function trustLabel(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "live") return "Live";
    if (t === "cached") return "Cached";
    if (t === "partial") return "Partial";
    if (t === "offline") return "Offline";
    if (t === "pending" || t === "waiting") return "Waiting";
    return "Waiting";
  }

  function trustAttr(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "pending") return "waiting";
    if (t === "unavailable") return "waiting";
    return t || "waiting";
  }

  /**
   * Phase 1: compact honest-empty summary — product language, not engineering.
   */
  function render(ctx) {
    ctx = ctx || {};
    var place = placeLabel(ctx);
    var when = timeContext(ctx.now);
    var trust = trustAttr(ctx.trust || "waiting");
    return (
      '<section class="wdb-r-today" data-wdb-r-today aria-labelledby="wdb-r-today-title">' +
      '<header class="wdb-r-today__header">' +
      "<div>" +
      '<h2 id="wdb-r-today-title" class="wdb-r-today__title">Today Outside</h2>' +
      "</div>" +
      '<p class="wdb-r-today__meta">' +
      '<span class="wdb-r-today__place">' +
      escapeHtml(place) +
      "</span>" +
      '<span class="wdb-r-today__sep" aria-hidden="true"> · </span>' +
      '<span class="wdb-r-today__time">' +
      escapeHtml(when) +
      "</span>" +
      '<span class="wdb-r-today__sep" aria-hidden="true"> · </span>' +
      '<span class="wds-trust-chip" data-trust="' +
      escapeHtml(trust) +
      '">' +
      escapeHtml(trustLabel(trust)) +
      "</span>" +
      "</p>" +
      "</header>" +
      '<div class="wdb-r-today__body" data-wdb-r-today-body>' +
      '<ul class="wdb-r-today__lines">' +
      "<li>Summary coming soon</li>" +
      "<li>Conditions will appear here</li>" +
      "<li>Photography window placeholder</li>" +
      "<li>River status placeholder</li>" +
      "</ul>" +
      "</div>" +
      '<div class="wdb-r-today__alerts" data-wdb-r-today-alerts hidden></div>' +
      "</section>"
    );
  }

  function mount(host, ctx) {
    if (!host) return null;
    host.innerHTML = render(ctx);
    return host.querySelector("[data-wdb-r-today]");
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildToday = {
    version: "1.1.0-phase1-polish",
    render: render,
    mount: mount,
    placeLabel: placeLabel,
    timeContext: timeContext
  };
})(typeof window !== "undefined" ? window : global);
