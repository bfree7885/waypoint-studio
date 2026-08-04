/**
 * Photo Coach 2.0 — evidence helpers (image regions + EXIF citations).
 */
(function (global) {
  "use strict";

  var Schema = global.WaypointPhotoCoach2Schema;
  if (!Schema) {
    throw new Error("WaypointPhotoCoach2Schema must load before evidence.js");
  }

  var ZONE_BOXES = {
    "full-frame": { x: 0, y: 0, width: 1, height: 1 },
    center: { x: 0.33, y: 0.33, width: 0.34, height: 0.34 },
    "upper-third": { x: 0, y: 0, width: 1, height: 0.34 },
    "lower-third": { x: 0, y: 0.66, width: 1, height: 0.34 },
    "left-third": { x: 0, y: 0, width: 0.34, height: 1 },
    "right-third": { x: 0.66, y: 0, width: 0.34, height: 1 },
    "upper-left": { x: 0, y: 0, width: 0.34, height: 0.34 },
    "upper-right": { x: 0.66, y: 0, width: 0.34, height: 0.34 },
    "lower-left": { x: 0, y: 0.66, width: 0.34, height: 0.34 },
    "lower-right": { x: 0.66, y: 0.66, width: 0.34, height: 0.34 },
    edges: { x: 0, y: 0, width: 1, height: 1 },
    foreground: { x: 0, y: 0.55, width: 1, height: 0.45 },
    background: { x: 0, y: 0, width: 1, height: 0.45 },
    sky: { x: 0, y: 0, width: 1, height: 0.4 },
    horizon: { x: 0, y: 0.4, width: 1, height: 0.2 }
  };

  function regionFromZone(zone, label) {
    var box = ZONE_BOXES[zone] || ZONE_BOXES["full-frame"];
    return Schema.createImageRegion({
      zone: zone,
      label: label || zone,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    });
  }

  function exifFromContext(exif, fields) {
    exif = exif || {};
    fields = fields || [];
    var out = [];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (exif[field] != null && exif[field] !== "") {
        out.push(Schema.createExifReference(field, exif[field], "exif"));
      }
    }
    return out;
  }

  function evidenceRegion(zone, label, note) {
    return Schema.createEvidence({
      kind: "region",
      region: regionFromZone(zone, label),
      note: note || null
    });
  }

  function evidenceExif(exif, fields, note) {
    var refs = exifFromContext(exif, fields);
    return Schema.createEvidence({
      kind: refs.length ? "exif" : "none",
      exif: refs,
      note: note || null
    });
  }

  function evidenceBoth(zone, label, exif, fields, note) {
    var region = regionFromZone(zone, label);
    var refs = exifFromContext(exif, fields);
    return Schema.createEvidence({
      kind: refs.length ? "both" : "region",
      region: region,
      exif: refs,
      note: note || null
    });
  }

  function formatEvidenceLabel(evidence) {
    if (!evidence) return "";
    var parts = [];
    if (evidence.region) {
      parts.push(evidence.region.label || evidence.region.zone || "region");
    }
    if (evidence.exif && evidence.exif.length) {
      parts.push(evidence.exif.map(function (r) {
        return r.field + (r.value != null ? "=" + r.value : "");
      }).join(", "));
    }
    return parts.join(" · ");
  }

  function recommendationHasCite(rec) {
    return Schema.validateRecommendationEvidence(rec).ok;
  }

  global.WaypointPhotoCoach2Evidence = {
    ZONE_BOXES: ZONE_BOXES,
    regionFromZone: regionFromZone,
    exifFromContext: exifFromContext,
    evidenceRegion: evidenceRegion,
    evidenceExif: evidenceExif,
    evidenceBoth: evidenceBoth,
    formatEvidenceLabel: formatEvidenceLabel,
    recommendationHasCite: recommendationHasCite
  };
})(typeof window !== "undefined" ? window : globalThis);
