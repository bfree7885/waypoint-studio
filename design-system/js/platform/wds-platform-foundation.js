/**
 * Shared product landing renderer for early Waypoint Studio apps.
 * Calm, professional product pages — what exists today and what to do next.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusLabel(status) {
    if (status === "live") return "Available now";
    if (status === "foundation") return "Foundation";
    if (status === "ready") return "In progress";
    if (status === "planned" || status === "next") return "Coming later";
    return "Foundation";
  }

  function renderModules(modules) {
    modules = (modules || []).filter(function (m) {
      var s = m && m.status;
      return s === "foundation" || s === "ready" || s === "live";
    });
    if (!modules.length) return "";
    return (
      '<section class="wpf-section" aria-labelledby="wpf-modules">' +
        '<h2 id="wpf-modules">What you can explore</h2>' +
        '<ul class="wpf-modules">' +
        modules
          .map(function (m) {
            return (
              "<li>" +
              "<strong>" +
              esc(m.title) +
              "</strong>" +
              '<span class="wpf-module-status">' +
              esc(statusLabel(m.status)) +
              "</span>" +
              "<p>" +
              esc(m.description) +
              "</p>" +
              "</li>"
            );
          })
          .join("") +
        "</ul>" +
      "</section>"
    );
  }

  function renderPrinciples(list) {
    list = list || [];
    if (!list.length) return "";
    return (
      '<section class="wpf-section" aria-labelledby="wpf-principles">' +
        '<h2 id="wpf-principles">How this product works</h2>' +
        "<ul class=\"wpf-principles\">" +
        list.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") +
        "</ul>" +
      "</section>"
    );
  }

  function routeHref(path) {
    if (!path || path === "/") return "#main";
    if (path.charAt(0) === "#") return path;
    if (path.indexOf("http") === 0 || path.indexOf("/") === 0) return path;
    return path;
  }

  function renderRoutes(routes) {
    var ready = (routes || []).filter(function (r) { return r.ready; });
    if (!ready.length) return "";
    var items = ready
      .map(function (r) {
        var href = routeHref(r.path);
        return (
          "<li>" +
          '<a class="wpf-route" href="' +
          esc(href) +
          '"><strong>' +
          esc(r.label) +
          "</strong></a>" +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="wpf-section" aria-labelledby="wpf-routes">' +
        '<h2 id="wpf-routes">Open now</h2>' +
        '<ul class="wpf-routes">' +
        items +
        "</ul>" +
      "</section>"
    );
  }

  function render(config) {
    config = config || {};
    var cta = config.cta || null;
    return (
      '<header class="wpf-hero">' +
        '<p class="wds-eyebrow">' +
        esc(config.eyebrow || "Waypoint Studio") +
        "</p>" +
        '<p class="wpf-status">' +
        esc(statusLabel(config.status || "foundation")) +
        "</p>" +
        "<h1>" +
        esc(config.title || "Waypoint Studio") +
        "</h1>" +
        '<p class="wpf-lead">' +
        esc(config.lead || "") +
        "</p>" +
        (cta
          ? '<p class="wpf-cta"><a class="wds-btn wds-btn--primary" href="' +
            esc(cta.href) +
            '">' +
            esc(cta.label) +
            "</a></p>"
          : "") +
      "</header>" +
      (config.mission
        ? '<section class="wpf-section"><h2>Who it is for</h2><p>' +
          esc(config.mission) +
          "</p></section>"
        : "") +
      renderPrinciples(config.principles) +
      renderModules(config.modules) +
      renderRoutes(config.routes) +
      (config.dataModel
        ? '<section class="wpf-section" aria-labelledby="wpf-data"><h2 id="wpf-data">Your data</h2><p>' +
          esc(config.dataModel) +
          "</p></section>"
        : "") +
      '<section class="wpf-section wpf-section--note">' +
        "<p>Private by default. Calm tools for careful outdoor work.</p>" +
      "</section>"
    );
  }

  function mount(selector, config) {
    var el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return;
    el.innerHTML = render(config);
    el.removeAttribute("aria-busy");
  }

  global.WDS = global.WDS || {};
  global.WDS.platformFoundation = {
    render: render,
    mount: mount,
    statusLabel: statusLabel
  };
})(typeof window !== "undefined" ? window : global);
