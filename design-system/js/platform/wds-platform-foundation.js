/**
 * Shared foundation landing renderer for Waypoint Studio apps.
 * Builds calm, professional product foundations — not marketing fluff,
 * not fake finished products.
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
    if (status === "planned") return "Planned architecture";
    return status || "In development";
  }

  function renderModules(modules) {
    modules = modules || [];
    if (!modules.length) return "";
    return (
      '<section class="wpf-section" aria-labelledby="wpf-modules">' +
        '<h2 id="wpf-modules">Architecture modules</h2>' +
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
        '<h2 id="wpf-principles">Product principles</h2>' +
        "<ul class=\"wpf-principles\">" +
        list.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") +
        "</ul>" +
      "</section>"
    );
  }

  function renderRoutes(routes) {
    routes = routes || [];
    if (!routes.length) return "";
    return (
      '<section class="wpf-section" aria-labelledby="wpf-routes">' +
        '<h2 id="wpf-routes">Planned routes</h2>' +
        '<ul class="wpf-routes">' +
        routes
          .map(function (r) {
            return (
              "<li><code>" +
              esc(r.path) +
              "</code> — " +
              esc(r.label) +
              (r.ready ? ' <span class="wpf-pill">ready</span>' : "") +
              "</li>"
            );
          })
          .join("") +
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
        esc(config.title || "Product foundation") +
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
        ? '<section class="wpf-section"><h2>Mission</h2><p>' +
          esc(config.mission) +
          "</p></section>"
        : "") +
      renderPrinciples(config.principles) +
      renderModules(config.modules) +
      renderRoutes(config.routes) +
      (config.dataModel
        ? '<section class="wpf-section" aria-labelledby="wpf-data"><h2 id="wpf-data">Data foundation</h2><p>' +
          esc(config.dataModel) +
          "</p></section>"
        : "") +
      '<section class="wpf-section wpf-section--note">' +
        "<p>This is a real architectural foundation — not a finished product and not a placeholder mock. " +
        "Features ship when they meet Waypoint Studio’s calm, private-by-default standard.</p>" +
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
