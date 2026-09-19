/**
 * Waypoint Studio V2 — Maker Studio front door
 *
 * Loads data/studio-projects.json when available and renders the project gallery.
 * Static HTML fallbacks remain for noscript / first paint / offline.
 * Does not boot the outdoor Dashboard workspace on /.
 */
(function (global) {
  "use strict";

  (function redirectLegacyDashboardHashes() {
    var h = String((global.location && global.location.hash) || "");
    if (!h) return;
    if (/outdoor-dashboard|wdb-section-|how-waypoint-works|wds-content-engine|#\/customize/i.test(h)) {
      global.location.replace("apps/dashboard/" + h);
    }
  })();

  var STATUS_LABELS = {
    available: "AVAILABLE",
    building: "BUILDING",
    experiment: "EXPERIMENT",
    personal: "PERSONAL PROJECT",
    "open-source": "OPEN SOURCE",
    archived: "ARCHIVED"
  };

  var ACTION_LABELS = {
    available: "Open →",
    building: "Read →",
    experiment: "Explore →",
    personal: "Open →",
    "open-source": "Open →",
    archived: "View →"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusLabel(status, labels) {
    var map = labels || STATUS_LABELS;
    return map[status] || String(status || "").toUpperCase();
  }

  function actionLabel(project) {
    if (project.id === "terrainbound") return "Play →";
    if (project.id === "articles" || project.id === "waypoint-deck") return "Read →";
    if (project.id === "global-watch") return "Launch →";
    if (project.id === "scenes") return "Explore →";
    return ACTION_LABELS[project.status] || "Open →";
  }

  function pulseClass(status) {
    return status === "building" ? " was-project-card__status-dot--pulse" : "";
  }

  function renderCard(project, labels) {
    var st = project.status || "available";
    var label = statusLabel(st, labels);
    var href = project.href || "#";
    var external = !!project.external;
    var img = project.image || "";
    var alt = project.imageAlt || "";
    return (
      '<a class="was-home__card was-project-card" data-status="' +
      esc(st) +
      '" data-project-id="' +
      esc(project.id || "") +
      '" href="' +
      esc(href) +
      '"' +
      (external ? ' rel="noopener noreferrer"' : "") +
      ">" +
      '<div class="was-project-card__media">' +
      (img
        ? '<img src="' +
          esc(img) +
          '" alt="' +
          esc(alt) +
          '" width="800" height="500" loading="lazy" decoding="async">'
        : "") +
      "</div>" +
      '<div class="was-project-card__body">' +
      '<div class="was-project-card__meta">' +
      '<span class="was-project-card__category">' +
      esc(project.category || "Project") +
      "</span>" +
      '<span class="was-project-card__status">' +
      '<span class="was-project-card__status-dot' +
      pulseClass(st) +
      '" aria-hidden="true"></span>' +
      esc(label) +
      "</span>" +
      "</div>" +
      '<h3 class="was-home__card-title was-project-card__title">' +
      esc(project.title || "") +
      "</h3>" +
      '<p class="was-project-card__desc">' +
      esc(project.description || "") +
      "</p>" +
      '<span class="was-project-card__action">' +
      esc(actionLabel(project)) +
      "</span>" +
      "</div>" +
      "</a>"
    );
  }

  function renderGallery(data) {
    var mount = document.querySelector("[data-studio-projects]");
    if (!mount || !data || !Array.isArray(data.projects)) return;
    var labels = (data.statusLabels && typeof data.statusLabels === "object"
      ? data.statusLabels
      : STATUS_LABELS);
    var featured = data.projects.filter(function (p) {
      return p && p.featured !== false;
    });
    if (!featured.length) return;
    mount.innerHTML = featured.map(function (p) {
      return renderCard(p, labels);
    }).join("");
  }

  function renderGateMount(projects) {
    var mount = document.getElementById("was-home-apps");
    if (!mount) return;
    var list = Array.isArray(projects) && projects.length
      ? projects
      : [
          { title: "Dashboard", href: "apps/dashboard/" },
          { title: "Shed Hunting", href: "https://shedhunting.org/" },
          { title: "Articles", href: "articles/" },
          { title: "Deck", href: "side-trails/waypoint-deck/" }
        ];
    mount.innerHTML =
      '<div class="was-home__grid was-home__grid--primary" data-home-gate="pathways">' +
      list
        .slice(0, 8)
        .map(function (p) {
          return (
            '<a class="was-home__card" href="' +
            esc(p.href) +
            '"><h3 class="was-home__card-title">' +
            esc(p.title) +
            "</h3></a>"
          );
        })
        .join("") +
      "</div>";
    mount.hidden = true;
    mount.setAttribute("aria-hidden", "true");
  }

  function loadProjects() {
    var url = "data/studio-projects.json";
    return global
      .fetch(url, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("catalog " + res.status);
        return res.json();
      })
      .then(function (data) {
        renderGallery(data);
        renderGateMount(data.projects || []);
        return data;
      })
      .catch(function () {
        renderGateMount(null);
      });
  }

  function boot() {
    loadProjects();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  global.WDS = global.WDS || {};
  global.WDS.studioHome = {
    statusLabels: STATUS_LABELS,
    renderGallery: renderGallery,
    loadProjects: loadProjects
  };
})(typeof window !== "undefined" ? window : globalThis);
