/**
 * Side Trails page UI — renders catalog cards only (active vs archive).
 */
(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusLabel(status) {
    var raw = String(status || "").toLowerCase();
    if (raw === "in-development") return "In development";
    if (raw === "retired") return "Retired";
    if (raw === "archived") return "Archived";
    if (!raw) return "Concept";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function isActiveStatus(status) {
    var s = String(status || "").toLowerCase();
    return (
      s === "in-development" ||
      s === "prototype" ||
      s === "experimental" ||
      s === "beta" ||
      s === "stable" ||
      s === "concept"
    );
  }

  function assetHref(rel) {
    var path = String(rel || "").trim();
    if (!path) return "";
    if (/^https?:\/\//i.test(path) || path.indexOf("../") === 0 || path.indexOf("./") === 0) {
      return path;
    }
    return "../" + path.replace(/^\//, "");
  }

  function cardHtml(project, featured) {
    var iconSrc = assetHref(project.icon);
    var icon = iconSrc
      ? '<img class="wst-card__icon" src="' +
        escapeHtml(iconSrc) +
        '" alt="" width="64" height="64" loading="lazy" />'
      : '<div class="wst-card__icon wst-card__icon--empty" aria-hidden="true"></div>';

    var href = assetHref(project.url);
    var external = /^https?:\/\//i.test(href);
    var rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    var featuredClass = featured ? " wst-card--featured" : "";

    return (
      '<article class="was-home__card wst-card' +
      featuredClass +
      '" data-project-id="' +
      escapeHtml(project.id) +
      '" data-status="' +
      escapeHtml(project.status) +
      '">' +
      '<div class="wst-card__top">' +
      icon +
      '<div class="wst-card__head">' +
      '<span class="was-home__status">' +
      escapeHtml(statusLabel(project.status)) +
      "</span>" +
      (project.category
        ? '<span class="wst-card__category">' + escapeHtml(project.category) + "</span>"
        : "") +
      "</div></div>" +
      '<h2 class="was-home__card-title">' +
      escapeHtml(project.title) +
      "</h2>" +
      '<p class="was-home__purpose wst-card__tagline"><strong>' +
      escapeHtml(project.tagline) +
      "</strong></p>" +
      '<p class="was-home__purpose">' +
      escapeHtml(project.description) +
      "</p>" +
      '<div class="was-home__card-actions">' +
      '<a class="wds-btn wds-btn--primary" href="' +
      escapeHtml(href) +
      '"' +
      rel +
      ">" +
      escapeHtml(project.ctaLabel || "Open") +
      "</a>" +
      "</div>" +
      "</article>"
    );
  }

  function emptyHtml(title, body) {
    return (
      '<div class="wst-empty" role="status">' +
      "<h2>" +
      escapeHtml(title) +
      "</h2>" +
      "<p>" +
      escapeHtml(body) +
      "</p>" +
      "</div>"
    );
  }

  function mount() {
    var statusEl = document.getElementById("wst-status");
    var gridActive = document.getElementById("wst-grid-active");
    var grid = document.getElementById("wst-grid");
    var titleEl = document.getElementById("wst-title");
    var taglineEl = document.getElementById("wst-tagline");
    if ((!grid && !gridActive) || !window.WDS || !WDS.sideTrails) {
      if (statusEl) statusEl.textContent = "Side Trails scripts did not load.";
      return;
    }

    if (statusEl) statusEl.textContent = "Loading Side Trails catalog…";

    WDS.sideTrails.loadCatalog().then(function (result) {
      if (titleEl && result.title) titleEl.textContent = result.title;
      if (taglineEl && result.tagline) taglineEl.textContent = result.tagline;
      if (statusEl) {
        statusEl.dataset.status = result.status;
        statusEl.textContent = result.message;
      }

      if (!result.ok) {
        var fail = emptyHtml(
          "Catalog unavailable",
          "The Side Trails JSON catalog could not be loaded. No projects were invented."
        );
        if (gridActive) gridActive.innerHTML = fail;
        if (grid) grid.innerHTML = "";
        return;
      }

      if (!result.projects.length) {
        var empty = emptyHtml(
          "No projects yet",
          "Add entries to data/side-trails/catalog.json — cards are never hardcoded."
        );
        if (gridActive) gridActive.innerHTML = empty;
        if (grid) grid.innerHTML = "";
        return;
      }

      var active = [];
      var archive = [];
      result.projects.forEach(function (p) {
        var st = String(p.status || "").toLowerCase();
        if (st === "archived" || st === "retired") archive.push(p);
        else if (isActiveStatus(st)) active.push(p);
        else archive.push(p);
      });

      active.sort(function (a, b) {
        return (a.order || 999) - (b.order || 999);
      });
      archive.sort(function (a, b) {
        return (a.order || 999) - (b.order || 999);
      });

      if (gridActive) {
        gridActive.innerHTML = active.length
          ? active
              .map(function (p) {
                return cardHtml(p, true);
              })
              .join("")
          : emptyHtml("No active Side Trail", "Catalog has no in-development entries.");
      }
      if (grid) {
        grid.innerHTML = archive.length
          ? archive
              .map(function (p) {
                return cardHtml(p, false);
              })
              .join("")
          : "";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
