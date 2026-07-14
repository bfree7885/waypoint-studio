/**
 * Waypoint Scenes platform — landing + module page renderers
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

  function resolveAsset(path, depth) {
    if (!path) return "";
    if (/^https?:|^\//.test(path)) return path;
    var prefix = depth === 2 ? "../" : "";
    return prefix + path;
  }

  function statusClass(status) {
    if (status === "live") return "scenes-card--live";
    if (status === "experimental") return "scenes-card--experimental";
    if (status === "preview") return "scenes-card--preview";
    if (status === "future") return "scenes-card--future";
    if (status === "scaffold") return "scenes-card--scaffold";
    return "scenes-card--planned";
  }

  function renderCard(exp, depth) {
    var href = depth === 2 ? "../" + exp.modulePath : exp.modulePath;
    var img = resolveAsset(exp.image, depth);
    return (
      '<article class="scenes-card ' + statusClass(exp.status) + '">' +
        '<a class="scenes-card__media" href="' + esc(href) + '" aria-hidden="true" tabindex="-1">' +
          '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" style="object-position:' + esc(exp.imagePosition || "center") + '">' +
          '<span class="scenes-card__shade scenes-card__shade--' + esc(exp.tone || "warm") + '"></span>' +
        "</a>" +
        '<div class="scenes-card__body">' +
          '<span class="scenes-card__status">' + esc(exp.statusLabel) + "</span>" +
          '<h2 class="scenes-card__title"><a href="' + esc(href) + '">' + esc(exp.title) + "</a></h2>" +
          '<p class="scenes-card__summary">' + esc(exp.summary) + "</p>" +
          '<a class="wds-btn wds-btn--' + (exp.status === "live" ? "primary" : "ghost") + ' wds-btn--sm scenes-card__cta" href="' + esc(href) + '">Explore</a>' +
        "</div>" +
      "</article>"
    );
  }

  function mountLanding(catalog) {
    var mount = document.getElementById("scenes-landing-mount");
    if (!mount || !catalog) return;

    var cards = (catalog.experiences || []).map(function (e) {
      return renderCard(e, 1);
    }).join("");

    mount.innerHTML =
      '<header class="scenes-hero scenes-hero--platform">' +
        '<p class="wds-eyebrow">Waypoint Scenes</p>' +
        '<h1 class="scenes-hero__title">' + esc(catalog.tagline) + "</h1>" +
        '<p class="scenes-hero__lead">' + esc(catalog.mission) + "</p>" +
        '<p class="scenes-hero__unity" role="note">Photo Coach, Hidden Landscapes, Living Scenes, Scene Builder, and Photographer Profile are five experiences inside one product.</p>' +
      "</header>" +
      '<section class="scenes-card-grid" aria-label="Waypoint Scenes experiences">' +
        cards +
      "</section>" +
      '<p class="scenes-context">Need outdoor conditions first? <a href="../dashboard/">Open the Dashboard</a>. Recording what you saw? Try <a href="../fieldry/">Fieldry</a>.</p>';

    mount.removeAttribute("aria-busy");
  }

  function mountModule(catalog, experienceId) {
    var mount = document.getElementById("scenes-module-mount");
    if (!mount || !catalog) return;

    var exp = null;
    (catalog.experiences || []).forEach(function (e) {
      if (e.id === experienceId) exp = e;
    });
    if (!exp) {
      mount.innerHTML = '<p class="wds-body" role="alert">Experience not found.</p>';
      return;
    }

    var img = resolveAsset(exp.image, 2);
    var actions = '<a class="wds-btn wds-btn--ghost" href="../">Back to Waypoint Scenes</a>';
    if (exp.toolHref) {
      actions =
        '<a class="wds-btn wds-btn--primary" href="' + esc(exp.toolHref) + '">' + esc(exp.toolLabel) + "</a>" +
        actions;
    }
    if (exp.secondaryHref) {
      actions +=
        '<a class="wds-btn wds-btn--secondary" href="' + esc(exp.secondaryHref) + '">' +
        esc(exp.secondaryLabel) +
        "</a>";
    }

    var siblings =
      '<nav class="scenes-module-nav" aria-label="Other Waypoint Scenes experiences"><ul>' +
      (catalog.experiences || []).map(function (e) {
        var active = e.id === exp.id ? ' aria-current="page"' : "";
        return (
          "<li><a href=\"../" + esc(e.modulePath) + "\"" + active + ">" + esc(e.shortTitle) + "</a></li>"
        );
      }).join("") +
      "</ul></nav>";

    mount.innerHTML =
      '<header class="scenes-module-hero">' +
        '<p class="wds-eyebrow"><a href="../">Waypoint Scenes</a> · ' + esc(exp.title) + "</p>" +
        '<div class="scenes-module-hero__visual">' +
          '<img src="' + esc(img) + '" alt="" loading="eager" decoding="async" style="object-position:' + esc(exp.imagePosition || "center") + '">' +
          '<span class="scenes-card__shade scenes-card__shade--' + esc(exp.tone || "warm") + '"></span>' +
        "</div>" +
        '<span class="scenes-card__status">' + esc(exp.statusLabel) + "</span>" +
        "<h1>" + esc(exp.title) + "</h1>" +
        '<p class="scenes-hero__lead">' + esc(exp.description) + "</p>" +
        '<p class="scenes-module-engine">Engine interface: <code>' + esc(exp.engine) + "</code> (scaffold only)</p>" +
        '<p class="scenes-hero__actions">' + actions + "</p>" +
      "</header>" +
      siblings;

    mount.removeAttribute("aria-busy");
  }

  function loadCatalog(depth) {
    var base = depth === 2 ? "../data/experiences.json" : "data/experiences.json";
    return fetch(base).then(function (r) {
      if (!r.ok) throw new Error("catalog");
      return r.json();
    });
  }

  function boot() {
    var page = document.documentElement.getAttribute("data-scenes-page") || "landing";
    var experienceId = document.documentElement.getAttribute("data-scenes-experience") || "";
    var depth = page === "module" ? 2 : 1;
    var mountId = page === "module" ? "scenes-module-mount" : "scenes-landing-mount";

    loadCatalog(depth)
      .then(function (catalog) {
        global.WaypointScenesCatalog = catalog;
        if (page === "module") mountModule(catalog, experienceId);
        else mountLanding(catalog);
      })
      .catch(function () {
        var el = document.getElementById(mountId);
        if (el) {
          el.innerHTML = '<p class="wds-body" role="alert">Could not load Waypoint Scenes experiences.</p>';
          el.removeAttribute("aria-busy");
        }
      });
  }

  global.WaypointScenesPlatform = {
    boot: boot,
    mountLanding: mountLanding,
    mountModule: mountModule,
    loadCatalog: loadCatalog
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
