/**
 * Fieldry — WOS-aligned export (JSON + CSV)
 */
(function (global) {
  "use strict";

  function downloadBlob(filename, mime, content) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function stamp() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function fieldryMeta(obs) {
    return (obs.meta && obs.meta.fieldry) || {};
  }

  function observationType(obs) {
    return fieldryMeta(obs).observationType || "";
  }

  function ethicalNotes(obs) {
    return fieldryMeta(obs).ethicalNotes || "";
  }

  function weatherSummary(obs) {
    var snap = obs.context && obs.context.weatherSnapshot;
    if (!snap) return "";
    if (snap.conditions) return snap.conditions;
    var parts = [];
    if (snap.temperatureF != null) parts.push(snap.temperatureF + "°F");
    if (snap.humidityPercent != null) parts.push(snap.humidityPercent + "% humidity");
    return parts.join(" · ");
  }

  function csvEscape(val) {
    if (val == null) return "";
    var s = String(val);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportJSON(observations) {
    var O = global.WDS && global.WDS.observations;
    var normalized = observations.map(function (o) {
      return O ? O.normalizeObservation(o) : o;
    });
    var payload = {
      schema: O ? O.SCHEMA_ID : "https://waypoint.studio/schemas/observation/v1",
      exportedAt: new Date().toISOString(),
      source: "fieldry",
      count: normalized.length,
      observations: normalized
    };
    downloadBlob(
      "fieldry-observations-" + stamp() + ".json",
      "application/json;charset=utf-8",
      JSON.stringify(payload, null, 2)
    );
  }

  function exportCSV(observations) {
    var headers = [
      "id",
      "date",
      "time",
      "title",
      "observation_type",
      "species",
      "scientific_name",
      "confidence",
      "habitat",
      "county",
      "state",
      "latitude",
      "longitude",
      "season",
      "phenology_stage",
      "weather",
      "notes",
      "ethical_notes",
      "export_status",
      "wos_version"
    ];
    var rows = observations.map(function (obs) {
      return [
        obs.id,
        obs.observedAt && obs.observedAt.date,
        obs.observedAt && obs.observedAt.time,
        obs.taxon && obs.taxon.label,
        observationType(obs),
        obs.taxon && obs.taxon.commonName,
        obs.taxon && obs.taxon.scientificName,
        obs.record && obs.record.confidence,
        obs.habitat && obs.habitat.label,
        obs.location && obs.location.county,
        obs.location && obs.location.state,
        obs.location && obs.location.latitude,
        obs.location && obs.location.longitude,
        obs.context && obs.context.season,
        obs.context && obs.context.phenologyStage,
        weatherSummary(obs),
        obs.record && obs.record.notes,
        ethicalNotes(obs),
        obs.research && obs.research.exportStatus,
        obs.meta && obs.meta.version
      ].map(csvEscape).join(",");
    });
    var csv = headers.join(",") + "\n" + rows.join("\n");
    downloadBlob(
      "fieldry-observations-" + stamp() + ".csv",
      "text/csv;charset=utf-8",
      csv
    );
  }

  global.FieldryExport = {
    exportJSON: exportJSON,
    exportCSV: exportCSV
  };
})(window);
