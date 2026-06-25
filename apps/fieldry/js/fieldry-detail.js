/**
 * Fieldry — observation detail (field notebook page)
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };

  function row(label, value) {
    if (value == null || value === "") return "";
    return (
      '<div class="fld-detail__row">' +
        '<dt class="fld-detail__label">' + U().escapeHtml(label) + "</dt>" +
        '<dd class="fld-detail__value">' + value + "</dd>" +
      "</div>"
    );
  }

  function weatherBlock(obs) {
    var snap = obs.context && obs.context.weatherSnapshot;
    if (!snap) return row("Weather", "—");
    var parts = [];
    if (snap.conditions) parts.push(U().escapeHtml(snap.conditions));
    if (snap.temperatureF != null) parts.push(U().escapeHtml(snap.temperatureF + "°F"));
    if (snap.humidityPercent != null) parts.push(U().escapeHtml(snap.humidityPercent + "% humidity"));
    if (snap.capturedAt) parts.push('<span class="fld-detail__muted">Snapshot ' + U().escapeHtml(snap.capturedAt) + "</span>");
    return row("Weather snapshot", parts.join(" · ") || "—");
  }

  function mediaBlock(obs) {
    var photos = (obs.media && obs.media.photos) || [];
    if (!photos.length) {
      return (
        '<div class="fld-media fld-media--placeholder">' +
          '<p class="fld-media__label">Photographs</p>' +
          '<p class="fld-media__hint">Photo attachment — local storage in a future update. Export JSON preserves media slots.</p>' +
        "</div>"
      );
    }
    return (
      '<div class="fld-media">' +
        '<p class="fld-media__label">Photographs (' + photos.length + ")</p>" +
        photos.map(function (p) {
          return '<p class="fld-media__item">' + U().escapeHtml(p.caption || p.id) + "</p>";
        }).join("") +
      "</div>"
    );
  }

  function render(obs) {
    if (!obs) {
      return (
        '<section class="fld-detail fld-detail--missing">' +
          '<p>Observation not found on this device.</p>' +
          '<a class="wds-btn wds-btn--ghost" href="#/">Back to ledger</a>' +
        "</section>"
      );
    }

    var type = U().observationType(obs);
    var fieldry = (obs.meta && obs.meta.fieldry) || {};
    var species = obs.taxon && obs.taxon.commonName;
    var sci = obs.taxon && obs.taxon.scientificName;

    return (
      '<article class="fld-detail" aria-labelledby="fld-detail-title">' +
        '<header class="fld-detail__head">' +
          '<a class="fld-detail__back" href="#/">← Ledger</a>' +
          (type ? '<span class="fld-detail__type">' + U().escapeHtml(type.label) + "</span>" : "") +
          '<h1 class="fld-detail__title" id="fld-detail-title">' + U().escapeHtml(U().displayTitle(obs)) + "</h1>" +
          '<p class="fld-detail__when">' +
            U().escapeHtml(U().formatDate(obs.observedAt && obs.observedAt.date)) +
            (obs.observedAt && obs.observedAt.time ? " · " + U().escapeHtml(obs.observedAt.time) : "") +
          "</p>" +
          U().integrityFootnote(obs) +
        "</header>" +
        '<div class="fld-detail__grid">' +
          '<section class="fld-detail__section">' +
            '<h2 class="fld-detail__section-title">Record</h2>' +
            '<dl class="fld-detail__dl">' +
              row("Species", species ? U().escapeHtml(species) : "—") +
              row("Scientific name", sci ? '<em>' + U().escapeHtml(sci) + "</em>" : '<span class="fld-detail__future">Future field</span>') +
              row("Confidence", U().escapeHtml(U().confidenceLabel(obs.record && obs.record.confidence))) +
              row("Habitat", obs.habitat && obs.habitat.label ? U().escapeHtml(obs.habitat.label) : "—") +
              row("Season", obs.context && obs.context.season ? U().escapeHtml(obs.context.season) : "—") +
              row("Phenology", obs.context && obs.context.phenologyStage ? U().escapeHtml(obs.context.phenologyStage) : "—") +
              weatherBlock(obs) +
            "</dl>" +
          "</section>" +
          '<section class="fld-detail__section">' +
            '<h2 class="fld-detail__section-title">Place</h2>' +
            '<dl class="fld-detail__dl">' +
              row("County", obs.location && obs.location.county ? U().escapeHtml(obs.location.county) : "—") +
              row("State", obs.location && obs.location.state ? U().escapeHtml(obs.location.state) : "—") +
              row("Coordinates", obs.location && obs.location.latitude != null
                ? U().escapeHtml(Number(obs.location.latitude).toFixed(5) + ", " + Number(obs.location.longitude).toFixed(5))
                : "—") +
              row("Elevation", '<span class="fld-detail__future">Future placeholder</span>') +
              row("Location privacy", obs.location && obs.location.privacy
                ? U().escapeHtml(obs.location.privacy.precision || "county")
                : "county") +
            "</dl>" +
          "</section>" +
        "</div>" +
        (obs.record && obs.record.notes
          ? '<section class="fld-detail__notes"><h2>Observation notes</h2><p>' + U().escapeHtml(obs.record.notes) + "</p></section>"
          : "") +
        (fieldry.ethicalNotes
          ? '<section class="fld-detail__ethics"><h2>Ethical notes</h2><p>' + U().escapeHtml(fieldry.ethicalNotes) + "</p></section>"
          : "") +
        mediaBlock(obs) +
        '<section class="fld-detail__meta">' +
          '<h2 class="fld-detail__section-title">WOS metadata</h2>' +
          '<dl class="fld-detail__dl fld-detail__dl--compact">' +
            row("Record ID", '<code>' + U().escapeHtml(obs.id) + "</code>") +
            row("Schema", obs.meta && obs.meta.schema ? U().escapeHtml(obs.meta.schema) : "—") +
            row("Source", "fieldry") +
            row("Retention", obs.privacy && obs.privacy.retention ? U().escapeHtml(obs.privacy.retention) : "local-only") +
            row("Export status", obs.research && obs.research.exportStatus ? U().escapeHtml(obs.research.exportStatus) : "private") +
            row("Verification", '<span class="fld-detail__future">' + U().escapeHtml((obs.verification && obs.verification.status) || "unverified") + " · future workflow</span>") +
            row("Visibility", '<span class="fld-detail__future">Private · public sharing future</span>') +
          "</dl>" +
        "</section>" +
        U().ethicsHtml() +
        '<footer class="fld-detail__foot">' +
          '<a class="wds-btn wds-btn--primary" href="#/edit/' + encodeURIComponent(obs.id) + '">Edit record</a>' +
          '<button type="button" class="wds-btn wds-btn--ghost fld-detail__delete" data-delete-id="' + U().escapeHtml(obs.id) + '">Delete</button>' +
        "</footer>" +
      "</article>"
    );
  }

  global.FieldryDetail = { render: render };
})(window);
