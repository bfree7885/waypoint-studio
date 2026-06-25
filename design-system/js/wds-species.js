/**
 * Waypoint Studio Design System — Species pages
 * Shared template for botanical, fungal, wildlife, and wine profiles.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderTags(tags) {
    if (!tags || !tags.length) return "";
    return (
      '<div class="wds-species-meta">' +
        tags.map(function (t) {
          return '<span class="wds-tag">' + escapeHtml(typeof t === "string" ? t : t.label) + "</span>";
        }).join("") +
      "</div>"
    );
  }

  function renderHero(species) {
    species = species || {};
    var image = species.image
      ? '<figure class="wds-species-figure"><img src="' + escapeHtml(species.image) + '" alt="' + escapeHtml(species.imageAlt || species.common || species.scientific) + '"></figure>'
      : "";

    return (
      '<header class="wds-species-hero">' +
        "<div>" +
          (species.eyebrow ? '<p class="wds-eyebrow">' + escapeHtml(species.eyebrow) + "</p>" : "") +
          (species.scientific ? '<h1 class="wds-species-name">' + escapeHtml(species.scientific) + "</h1>" : "") +
          (species.common ? '<p class="wds-species-common">' + escapeHtml(species.common) + "</p>" : "") +
          renderTags(species.tags) +
        "</div>" +
        image +
      "</header>"
    );
  }

  function renderSection(title, body, modifier) {
    if (!body) return "";
    return (
      '<section class="wef-section wef-section--' + (modifier || "what") + '">' +
        '<h3 class="wef-section-label">' + escapeHtml(title) + "</h3>" +
        '<div class="wef-section-body"><p>' + escapeHtml(body) + "</p></div>" +
      "</section>"
    );
  }

  /**
   * Full species page — maps to WEF sections when lesson data provided.
   */
  function renderPage(species, options) {
    options = options || {};
    if (species && (species.wskbId || species.speciesId) && global.WDS && global.WDS.wskbRender) {
      var id = species.wskbId || species.speciesId;
      var rec = global.WDS.wskb && global.WDS.wskb.getSync(id);
      if (rec) return global.WDS.wskbRender.renderProfile(rec, options);
    }

    var html = renderHero(species);

    if (species.summary) {
      html += renderSection("Overview", species.summary, "what");
    }

    if (global.WDS && global.WDS.education && species.lesson) {
      html += '<div class="wef-lesson-sections">' + global.WDS.education.renderLesson(species.lesson, options) + "</div>";
    } else {
      if (species.habitat) html += renderSection("Habitat", species.habitat, "identify");
      if (species.identification) html += renderSection("How to identify", species.identification, "identify");
      if (species.season) html += renderSection("Season", species.season, "how");
      if (species.ethics) html += renderSection("Ethics", species.ethics, "ethics");
      if (species.safety) html += renderSection("Safety", species.safety, "safety");
    }

    if (species.related && species.related.length) {
      html += (
        '<section class="wef-section wef-section--related">' +
          '<h3 class="wef-section-label">Related lessons</h3>' +
          '<div class="wef-related-links">' +
          species.related.map(function (ref) {
            var id = typeof ref === "string" ? ref : ref.id;
            var title = typeof ref === "object" ? ref.title : id;
            return '<a href="#' + escapeHtml(id) + '" class="wef-related-link">' + escapeHtml(title || id) + "</a>";
          }).join("") +
          "</div>" +
        "</section>"
      );
    }

    return '<article class="wds-species-page" id="' + escapeHtml(species.id || "") + '">' + html + "</article>";
  }

  global.WDS = global.WDS || {};
  global.WDS.species = {
    renderHero: renderHero,
    renderPage: renderPage,
    renderTags: renderTags,
    /** @deprecated Use WDS.wskbRender.renderProfile for WSKB records */
    fromWskb: function (id, options) {
      var rec = global.WDS.wskb && global.WDS.wskb.getSync(id);
      return rec && global.WDS.wskbRender
        ? global.WDS.wskbRender.renderProfile(rec, options)
        : "";
    }
  };
})(window);
