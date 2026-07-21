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
    if (status === "flagship") return "Flagship";
    if (status === "free") return "Free";
    if (status === "foundation") return "Foundation";
    if (status === "ready") return "In progress";
    if (status === "planned" || status === "next") return "Coming later";
    if (status === "blueprint") return "Blueprint";
    return "Foundation";
  }

  function renderListSection(id, title, items) {
    items = (items || []).filter(Boolean);
    if (!items.length) return "";
    return (
      '<section class="wpf-section" aria-labelledby="' +
      esc(id) +
      '">' +
      "<h2 id=\"" +
      esc(id) +
      '">' +
      esc(title) +
      "</h2>" +
      "<ul class=\"wpf-principles\">" +
      items.map(function (p) {
        return "<li>" + esc(p) + "</li>";
      }).join("") +
      "</ul>" +
      "</section>"
    );
  }

  function renderParagraphSection(id, title, text) {
    if (!text) return "";
    return (
      '<section class="wpf-section" aria-labelledby="' +
      esc(id) +
      '">' +
      "<h2 id=\"" +
      esc(id) +
      '">' +
      esc(title) +
      "</h2>" +
      "<p>" +
      esc(text) +
      "</p>" +
      "</section>"
    );
  }

  function renderCapabilityGroups(groups) {
    groups = groups || [];
    if (!groups.length) return "";
    return (
      '<section class="wpf-section" aria-labelledby="wpf-areas">' +
        '<h2 id="wpf-areas">Major areas</h2>' +
        '<ul class="wpf-modules">' +
        groups
          .map(function (g) {
            return (
              "<li>" +
              "<strong>" +
              esc(g.title) +
              "</strong>" +
              '<span class="wpf-module-status">' +
              esc(statusLabel(g.status || "foundation")) +
              "</span>" +
              "<p>" +
              esc(g.description || "") +
              "</p>" +
              (g.items && g.items.length
                ? "<ul class=\"wpf-principles\">" +
                  g.items
                    .map(function (item) {
                      return "<li>" + esc(item) + "</li>";
                    })
                    .join("") +
                  "</ul>"
                : "") +
              "</li>"
            );
          })
          .join("") +
        "</ul>" +
      "</section>"
    );
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

  /**
   * Resolve foundation route paths relative to the current app directory.
   * Leading "/" must NOT mean site-root (that caused live 404s like /map/).
   */
  function routeHref(path) {
    if (!path || path === "/") return "#main";
    if (path.charAt(0) === "#") return path;
    if (/^https?:\/\//i.test(path)) return path;
    // Strip one leading slash → app-relative ( /map/ → map/ )
    if (path.charAt(0) === "/") return path.slice(1);
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
      renderParagraphSection("wpf-who", "Who it helps", config.mission) +
      renderListSection("wpf-problems", "Problems it helps with", config.problems) +
      renderCapabilityGroups(config.capabilityGroups) +
      renderPrinciples(config.principles) +
      renderModules(config.modules) +
      renderRoutes(config.routes) +
      renderParagraphSection("wpf-privacy", "Privacy philosophy", config.privacyPhilosophy || config.dataModel) +
      renderParagraphSection("wpf-future", "Future direction", config.futureDirection) +
      '<section class="wpf-section wpf-section--note">' +
        "<p>Private by default. Calm tools for careful observers.</p>" +
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
    statusLabel: statusLabel,
    routeHref: routeHref
  };
})(typeof window !== "undefined" ? window : global);
