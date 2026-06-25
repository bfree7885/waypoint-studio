/**
 * Fieldry — observation timeline
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };

  function renderCard(obs) {
    var type = U().observationType(obs);
    var glyph = type ? type.glyph : "·";
    var typeLabel = type ? type.label : "Observation";
    var species = obs.taxon && (obs.taxon.commonName || obs.taxon.scientificName);
    var habitat = obs.habitat && obs.habitat.label;
    var conf = U().confidenceLabel(obs.record && obs.record.confidence);
    var exportStatus = (obs.research && obs.research.exportStatus) || "private";

    return (
      '<article class="fld-card" data-obs-id="' + U().escapeHtml(obs.id) + '">' +
        '<a class="fld-card__link" href="#/obs/' + encodeURIComponent(obs.id) + '">' +
          '<div class="fld-card__icon" aria-hidden="true" title="' + U().escapeHtml(typeLabel) + '">' + U().escapeHtml(glyph) + "</div>" +
          '<div class="fld-card__body">' +
            '<div class="fld-card__meta">' +
              '<time datetime="' + U().escapeHtml(obs.observedAt && obs.observedAt.date) + '">' + U().escapeHtml(U().formatDate(obs.observedAt && obs.observedAt.date)) + "</time>" +
              '<span class="fld-card__type">' + U().escapeHtml(typeLabel) + "</span>" +
            "</div>" +
            '<h3 class="fld-card__title">' + U().escapeHtml(U().displayTitle(obs)) + "</h3>" +
            '<dl class="fld-card__facts">' +
              (species ? "<div><dt>Species</dt><dd>" + U().escapeHtml(species) + "</dd></div>" : "") +
              (habitat ? "<div><dt>Habitat</dt><dd>" + U().escapeHtml(habitat) + "</dd></div>" : "") +
              "<div><dt>Confidence</dt><dd>" + U().escapeHtml(conf) + "</dd></div>" +
              "<div><dt>Location</dt><dd>" + U().escapeHtml(U().formatLocation(obs)) + "</dd></div>" +
            "</dl>" +
          "</div>" +
          '<span class="fld-card__export" title="Export status">' + U().escapeHtml(exportStatus) + "</span>" +
        "</a>" +
        '<div class="fld-card__actions">' +
          '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="#/edit/' + encodeURIComponent(obs.id) + '">Edit</a>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm fld-card__delete" data-delete-id="' + U().escapeHtml(obs.id) + '">Delete</button>' +
        "</div>" +
      "</article>"
    );
  }

  function renderEmpty() {
    return (
      '<div class="fld-empty">' +
        '<p class="fld-empty__title">No observations yet</p>' +
        '<p class="fld-empty__text">Return from a walk and record what you noticed — under two minutes for a field note.</p>' +
        '<a class="wds-btn wds-btn--primary" href="#/new">Record first observation</a>' +
      "</div>"
    );
  }

  function render(observations) {
    var list = observations || [];
    return (
      '<section class="fld-timeline" aria-labelledby="fld-timeline-title">' +
        '<header class="fld-timeline__head">' +
          '<h2 class="fld-timeline__title" id="fld-timeline-title">Observation timeline</h2>' +
          '<a class="wds-btn wds-btn--primary" href="#/new">New observation</a>' +
        "</header>" +
        (list.length
          ? '<div class="fld-timeline__list">' + list.map(renderCard).join("") + "</div>"
          : renderEmpty()) +
      "</section>"
    );
  }

  function bindDelete(mount, onDelete) {
    if (!mount) return;
    mount.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-delete-id]");
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute("data-delete-id");
      if (!id) return;
      if (window.confirm("Delete this observation from your device? This cannot be undone.")) {
        onDelete(id);
      }
    });
  }

  global.FieldryList = {
    render: render,
    bindDelete: bindDelete
  };
})(window);
