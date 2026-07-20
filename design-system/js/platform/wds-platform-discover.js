/**
 * Waypoint Studio — Discoverability helpers (RC2 Sprint 4)
 *
 * Renders related-app recommendations and start-here CTAs from nav config.
 * Mount: <div data-wds-related-apps="dashboard" data-shell-depth="1"></div>
 *        <div data-wds-start-here="shed-hunting" data-shell-depth="1"></div>
 */
(function (global) {
  "use strict";

  function esc(s) {
    if (global.WDS && WDS.escapeHtml) return WDS.escapeHtml(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function Nav() {
    return global.WDS && global.WDS.appNav;
  }

  function relatedHtml(appId, depth) {
    var NavApi = Nav();
    if (!NavApi || !NavApi.relatedApps) return "";
    var rows = NavApi.relatedApps(appId);
    if (!rows.length) return "";
    depth = depth == null ? 1 : depth;
    return (
      '<aside class="wds-related" aria-label="Related Studio apps">' +
      '<p class="wds-related__title">Also useful nearby</p>' +
      "<ul>" +
      rows
        .map(function (app) {
          var href = NavApi.startHereHref
            ? NavApi.startHereHref(app, depth)
            : NavApi.resolveRoute(app.route, depth);
          var why = app.purpose || app.description || "";
          return (
            "<li><a href=\"" +
            esc(href) +
            "\">" +
            esc(app.title) +
            "</a>" +
            (why ? '<span class="wds-honesty">' + esc(why) + "</span>" : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul></aside>"
    );
  }

  function startHereHtml(appId, depth) {
    var NavApi = Nav();
    if (!NavApi) return "";
    var app = NavApi.byId(appId);
    if (!app) return "";
    depth = depth == null ? 1 : depth;
    var sh = app.startHere || {};
    var href = NavApi.startHereHref
      ? NavApi.startHereHref(app, depth)
      : NavApi.resolveRoute(app.route, depth);
    var label = sh.label || ("Open " + app.title);
    return (
      '<p class="wds-start-here">' +
      '<a class="wds-btn wds-btn--primary" href="' +
      esc(href) +
      '">' +
      esc(label) +
      "</a></p>"
    );
  }

  function mountAll(root) {
    root = root || document;
    Array.prototype.forEach.call(
      root.querySelectorAll("[data-wds-related-apps]"),
      function (el) {
        var id = el.getAttribute("data-wds-related-apps");
        var depth = parseInt(el.getAttribute("data-shell-depth") || "1", 10);
        el.innerHTML = relatedHtml(id, depth);
      }
    );
    Array.prototype.forEach.call(
      root.querySelectorAll("[data-wds-start-here]"),
      function (el) {
        var id = el.getAttribute("data-wds-start-here");
        var depth = parseInt(el.getAttribute("data-shell-depth") || "1", 10);
        el.innerHTML = startHereHtml(id, depth);
      }
    );
  }

  function boot() {
    mountAll(document);
  }

  global.WDS = global.WDS || {};
  global.WDS.platformDiscover = {
    version: "1.0.0",
    relatedHtml: relatedHtml,
    startHereHtml: startHereHtml,
    mountAll: mountAll
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
