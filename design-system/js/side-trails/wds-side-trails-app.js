/**
 * Side Trails page UI — renders catalog cards only.
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
    if (!raw) return "Concept";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function assetHref(rel) {
    var path = String(rel || "").trim();
    if (!path) return "";
    if (/^https?:\/\//i.test(path) || path.indexOf("../") === 0 || path.indexOf("./") === 0) {
      return path;
    }
    return "../" + path.replace(/^\//, "");
  }

  function cardHtml(project) {
    var iconSrc = assetHref(project.icon);
    var icon = iconSrc
      ? '<img class="wst-card__icon" src="' +
        escapeHtml(iconSrc) +
        '" alt="" width="64" height="64" loading="lazy" />'
      : '<div class="wst-card__icon wst-card__icon--empty" aria-hidden="true"></div>';

    var href = assetHref(project.url);
    var external = /^https?:\/\//i.test(href);
    var rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";

    return (
      '<article class="was-home__card wst-card" data-project-id="' +
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
    var grid = document.getElementById("wst-grid");
    var titleEl = document.getElementById("wst-title");
    var taglineEl = document.getElementById("wst-tagline");
    if (!grid || !window.WDS || !WDS.sideTrails) {
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
        grid.innerHTML = emptyHtml(
          "Catalog unavailable",
          "The Side Trails JSON catalog could not be loaded. No projects were invented."
        );
        return;
      }

      if (!result.projects.length) {
        grid.innerHTML = emptyHtml(
          "No projects yet",
          "Add entries to data/side-trails/catalog.json — cards are never hardcoded."
        );
        return;
      }

      grid.innerHTML = result.projects.map(cardHtml).join("");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
