/**
 * Waypoint Studio — species spotlight card (shared structure)
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

  function formatWeekOf(iso) {
    if (!iso) return "";
    try {
      var parts = iso.split("-");
      if (parts.length !== 3) return iso;
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  function renderFact(label, value) {
    if (!value) return "";
    return (
      '<div class="wce-spotlight-card__fact">' +
        "<dt>" + escapeHtml(label) + "</dt>" +
        "<dd>" + escapeHtml(value) + "</dd>" +
      "</div>"
    );
  }

  function renderMarks(marks) {
    if (!marks || !marks.length) return "";
    var list = marks.map(function (m) {
      return "<li>" + escapeHtml(m) + "</li>";
    }).join("");
    return (
      '<div class="wce-spotlight-card__marks">' +
        "<h4 class=\"wce-spotlight-card__marks-title\">Identification notes</h4>" +
        "<ul>" + list + "</ul>" +
      "</div>"
    );
  }

  /**
   * @param {object} sp — species spotlight JSON
   * @param {object} options — { weekOf, showWeekPreview }
   */
  function renderCard(sp, options) {
    if (!sp) return "";
    options = options || {};

    var label = sp.spotlightLabel || "Seasonal species spotlight";
    var weekOf = sp.weekOf || options.weekOf;
    var weekLine = "";
    if (weekOf && options.showWeekPreview !== false) {
      weekLine =
        '<p class="wce-spotlight-card__week">Preview for week of ' + escapeHtml(formatWeekOf(weekOf)) + "</p>";
    }

    var marks = sp.identification || sp.fieldMarks || [];
    var profile = "";
    if (sp.profileHref) {
      profile =
        '<p class="wce-spotlight-card__link">' +
          '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="' + escapeHtml(sp.profileHref) + '">' +
            escapeHtml(sp.profileLabel || "Full species profile") +
          " →</a>" +
        "</p>";
    }

    var lookalikes = sp.lookAlikes
      ? '<p class="wce-spotlight-card__lookalikes"><strong>Look-alikes:</strong> ' + escapeHtml(sp.lookAlikes) + "</p>"
      : "";

    var ethics = sp.ethics
      ? '<p class="wce-spotlight-card__ethics">' + escapeHtml(sp.ethics) + "</p>"
      : "";

    return (
      '<article class="wce-spotlight-card" aria-labelledby="wce-spotlight-name">' +
        '<p class="wce-spotlight-card__label">' + escapeHtml(label) + "</p>" +
        weekLine +
        '<h3 class="wce-spotlight-card__name" id="wce-spotlight-name">' + escapeHtml(sp.commonName || sp.title) + "</h3>" +
        (sp.scientificName ? '<p class="wce-spotlight-card__sci"><em>' + escapeHtml(sp.scientificName) + "</em></p>" : "") +
        (sp.title && sp.commonName && sp.title !== sp.commonName
          ? '<p class="wce-spotlight-card__hook">' + escapeHtml(sp.title) + "</p>"
          : "") +
        '<dl class="wce-spotlight-card__facts">' +
          renderFact("Current timing", sp.timing) +
          renderFact("Habitat", sp.habitat) +
        "</dl>" +
        renderMarks(marks) +
        (sp.whyThisWeek
          ? '<div class="wce-spotlight-card__why">' +
              '<h4 class="wce-spotlight-card__why-title">Why it matters this week</h4>' +
              '<p>' + escapeHtml(sp.whyThisWeek) + "</p>" +
            "</div>"
          : (sp.summary
            ? '<div class="wce-spotlight-card__why">' +
                '<h4 class="wce-spotlight-card__why-title">Why it matters this week</h4>' +
                '<p>' + escapeHtml(sp.summary) + "</p>" +
              "</div>"
            : "")) +
        lookalikes +
        profile +
        ethics +
      "</article>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.speciesSpotlight = {
    renderCard: renderCard,
    formatWeekOf: formatWeekOf
  };
})(typeof window !== "undefined" ? window : global);
