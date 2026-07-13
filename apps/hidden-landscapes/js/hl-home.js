/**
 * Hidden Landscapes — home page renderer (scaffold)
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

  function modeChips(ids, byId) {
    if (!ids || !ids.length) return "";
    return (
      '<ul class="hl-mode-chips">' +
      ids.map(function (id) {
        var m = byId[id];
        if (!m) return "";
        return (
          '<li><a class="hl-chip" href="#' + esc(id === "species-vision" ? "species-vision" : id) + '">' +
          esc(m.shortLabel || m.label) +
          "</a></li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  function renderWaysGrid(modes) {
    return (
      '<ul class="hl-ways">' +
      modes.map(function (m) {
        return (
          '<li class="hl-way">' +
            '<p class="hl-way__cat">' + esc(m.category) + "</p>" +
            "<h3>" + esc(m.label) + "</h3>" +
            "<p>" + esc(m.summary) + "</p>" +
            '<p class="hl-way__status">' + esc(m.status) + "</p>" +
          "</li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  function renderSection(section, catalog) {
    var byMode = catalog.byId.visionModes;
    var extra = "";
    if (section.id === "ways-of-seeing") {
      extra = renderWaysGrid(catalog.visionModes);
    } else if (section.visionModeIds) {
      extra = modeChips(section.visionModeIds, byMode);
    }
    if (section.relatedApp) {
      extra +=
        '<p class="hl-related"><a class="wds-btn wds-btn--ghost wds-btn--sm" href="' +
        esc(section.relatedApp) +
        '">Open Animal Vision</a></p>';
    }
    if (section.href) {
      extra +=
        '<p class="hl-related"><a class="wds-btn wds-btn--secondary wds-btn--sm" href="' +
        esc(section.href) +
        '">Open ' +
        esc(section.title) +
        "</a></p>";
    }

    return (
      '<section class="hl-section" id="' + esc(section.id) + '" aria-labelledby="hl-' + esc(section.id) + '-title">' +
        '<p class="wds-eyebrow">' + esc(section.eyebrow || "") + "</p>" +
        '<h2 id="hl-' + esc(section.id) + '-title">' + esc(section.title) + "</h2>" +
        '<p class="hl-section__body">' + esc(section.body) + "</p>" +
        extra +
      "</section>"
    );
  }

  function mountHome(catalog) {
    var mount = document.getElementById("hl-home-mount");
    if (!mount || !catalog) return;

    var meta = catalog.sectionsMeta || {};
    var nav =
      '<nav class="hl-toc" aria-label="On this page">' +
      '<p class="hl-toc__label">Explore</p>' +
      "<ul>" +
      (catalog.sections || []).map(function (s) {
        return '<li><a href="#' + esc(s.id) + '">' + esc(s.title) + "</a></li>";
      }).join("") +
      "</ul></nav>";

    mount.innerHTML =
      '<header class="hl-hero">' +
        '<p class="wds-eyebrow"><a href="../scenes/">Waypoint Scenes</a> · Hidden Landscapes</p>' +
        "<h1>Hidden Landscapes</h1>" +
        '<p class="hl-hero__mission">' + esc(meta.mission || "") + "</p>" +
        '<p class="hl-hero__lead">' + esc(meta.tagline || "") + " Scaffold only — architecture for future comparisons, lessons, and local ImageSets.</p>" +
        '<p class="hl-hero__actions">' +
          '<a class="wds-btn wds-btn--primary" href="#what-is">Begin</a>' +
          '<a class="wds-btn wds-btn--ghost" href="gallery.html">Gallery</a>' +
          '<a class="wds-btn wds-btn--ghost" href="learn.html">Learn</a>' +
        "</p>" +
      "</header>" +
      nav +
      '<div class="hl-sections">' +
        (catalog.sections || []).map(function (s) {
          return renderSection(s, catalog);
        }).join("") +
      "</div>" +
      '<p class="hl-privacy" role="note">' + esc(meta.privacyNote || "") + "</p>" +
      '<p class="hl-todo" role="note">TODO(ai-analysis): local frame understanding. TODO(rendering): VisionMode pipelines. TODO(compare-ui): ImageSet viewer.</p>';

    mount.removeAttribute("aria-busy");
  }

  function mountPlaceholder(kind, catalog) {
    var mount = document.getElementById("hl-page-mount");
    if (!mount) return;
    var title = kind === "gallery" ? "Gallery" : "Learn";
    var blurb =
      kind === "gallery"
        ? "ImageSets comparing human, infrared, ultraviolet, full spectrum, and species simulations will appear here."
        : "Scientific explanations and photography notes for each VisionMode will appear here.";

    mount.innerHTML =
      '<header class="hl-hero hl-hero--compact">' +
        '<p class="wds-eyebrow"><a href="./">Hidden Landscapes</a> · ' + esc(title) + "</p>" +
        "<h1>" + esc(title) + "</h1>" +
        '<p class="hl-hero__lead">' + esc(blurb) + "</p>" +
        '<p class="hl-hero__actions"><a class="wds-btn wds-btn--ghost" href="./">Back to overview</a></p>' +
      "</header>" +
      '<section class="hl-section" aria-labelledby="hl-placeholder-title">' +
        '<h2 id="hl-placeholder-title">Coming next</h2>' +
        '<p class="hl-section__body">This page is a placeholder. Catalog counts today:</p>' +
        "<ul class=\"hl-stats\">" +
          "<li>" + esc(String((catalog.visionModes || []).length)) + " VisionModes</li>" +
          "<li>" + esc(String((catalog.species || []).length)) + " Species</li>" +
          "<li>" + esc(String((catalog.imageSets || []).length)) + " ImageSet scaffold entries</li>" +
        "</ul>" +
        '<p class="hl-todo">TODO(compare-ui): ImageSet gallery grid. TODO(learn): lesson modules per VisionMode.</p>' +
      "</section>";

    mount.removeAttribute("aria-busy");
  }

  global.HiddenLandscapesHome = {
    mountHome: mountHome,
    mountPlaceholder: mountPlaceholder
  };
})(typeof window !== "undefined" ? window : globalThis);
