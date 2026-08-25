/**
 * Side Trails catalog — loads archive/research projects from JSON only.
 * Never invents projects. Empty catalogs are valid.
 */
(function (global) {
  "use strict";

  var CATALOG_URL = "../data/side-trails/catalog.json";
  var ALLOWED_STATUS = {
    concept: true,
    prototype: true,
    experimental: true,
    beta: true,
    stable: true,
    archived: true,
    retired: true,
    "in-development": true
  };

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function normalizeProject(row) {
    if (!row || typeof row !== "object") return null;
    var id = text(row.id);
    var title = text(row.title);
    var url = text(row.url);
    if (!id || !title || !url) return null;
    var status = text(row.status).toLowerCase() || "concept";
    if (!ALLOWED_STATUS[status]) status = "concept";
    return {
      id: id,
      title: title,
      tagline: text(row.tagline),
      description: text(row.description),
      icon: text(row.icon) || "",
      category: text(row.category),
      status: status,
      ctaLabel: text(row.ctaLabel) || "Open",
      url: url,
      order: Number.isFinite(Number(row.order)) ? Number(row.order) : 999
    };
  }

  function normalizeProjects(raw) {
    var list = Array.isArray(raw) ? raw : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var project = normalizeProject(list[i]);
      if (project) out.push(project);
    }
    return out.sort(function (a, b) {
      return a.order - b.order;
    });
  }

  function loadCatalog() {
    return fetch(CATALOG_URL, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (catalog) {
        var projects = normalizeProjects(catalog && catalog.projects);
        return {
          ok: true,
          status: projects.length ? "ready" : "empty",
          title: text(catalog && catalog.title) || "Side Trails",
          tagline: text(catalog && catalog.tagline),
          message:
            text(catalog && catalog.message) ||
            (projects.length
              ? projects.length + " project(s) in Side Trails."
              : "No Side Trails projects are listed yet."),
          projects: projects
        };
      })
      .catch(function (error) {
        return {
          ok: false,
          status: "unavailable",
          title: "Side Trails",
          tagline: "",
          message: "Side Trails catalog could not be loaded.",
          projects: [],
          error: String((error && error.message) || error)
        };
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.sideTrails = {
    loadCatalog: loadCatalog,
    normalizeProject: normalizeProject,
    normalizeProjects: normalizeProjects,
    CATALOG_URL: CATALOG_URL
  };
})(typeof window !== "undefined" ? window : globalThis);
