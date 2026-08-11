/**
 * Dashboard Rebuild — below-fold briefing (Dashboard-native only).
 * Waypoint's Take as outdoor interpretation for this place.
 * Cross-product sibling-app promo removed — those destinations live in
 * global nav (docs/APP-SURFACE-ARCHITECTURE.md).
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

  function renderSkeleton() {
    return (
      '<div class="wdb-r-deepen" data-wdb-r-deepen>' +
      '<section class="wdb-r-deepen__section" data-deepen="take" aria-labelledby="wdb-r-take-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-take-title">Waypoint\u2019s Take</h2>' +
      '<p class="wdb-r-deepen__lede">Outdoor reading for this place — interpretation, not a score or to-do list.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-deepen__panel" data-deepen-body="take" aria-busy="true">' +
      '<p class="wdb-r-deepen__status" role="status">Loading Take\u2026</p>' +
      "</div>" +
      "</section>" +
      "</div>"
    );
  }

  function fillTake(el) {
    if (!el) return;
    var Take = global.WDS && global.WDS.take;
    var body =
      "Start with conditions at this place. Let instruments settle honestly — live facts first, estimates labeled — then decide what the day outside asks of you.";
    if (Take && Take.mount) {
      Take.mount(el, {
        body: body,
        meta: "Editorial · Dashboard briefing · not a score",
        surface: "dashboard",
        sources: []
      });
    } else {
      el.innerHTML =
        '<p class="wdb-r-deepen__copy">' +
        escapeHtml(body) +
        "</p>" +
        '<p class="wdb-r-deepen__meta">Editorial · Dashboard briefing · not a score</p>';
    }
    el.removeAttribute("aria-busy");
  }

  function bind(host) {
    if (!host) return;
    var root = host.querySelector("[data-wdb-r-deepen]");
    if (!root) return;
    fillTake(root.querySelector('[data-deepen-body="take"]'));
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildDeepeners = {
    version: "2.0.0-dashboard-surface",
    render: renderSkeleton,
    bind: bind
  };
})(typeof window !== "undefined" ? window : global);
