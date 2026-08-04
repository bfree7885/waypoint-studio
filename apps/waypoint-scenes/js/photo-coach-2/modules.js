/**
 * Photo Coach 2.0 — reusable analysis modules (one per review section).
 * Modules are pure: context in → section out. Providers supply observations.
 */
(function (global) {
  "use strict";

  var Schema = global.WaypointPhotoCoach2Schema;
  var Evidence = global.WaypointPhotoCoach2Evidence;
  if (!Schema || !Evidence) {
    throw new Error("Schema and Evidence must load before modules.js");
  }

  /**
   * @typedef {object} ModuleContext
   * @property {object|null} exif
   * @property {object} observations  sectionId → { summary, items[] }
   * @property {string} providerId
   * @property {boolean} isPlaceholder
   */

  function buildRecommendation(sectionId, item, exif) {
    item = item || {};
    var evidenceList = [];
    if (item.zone || item.region) {
      var zone = item.zone || (item.region && item.region.zone) || "full-frame";
      var label = item.regionLabel || (item.region && item.region.label) || zone;
      var fields = item.exifFields || [];
      if (fields.length) {
        evidenceList.push(Evidence.evidenceBoth(zone, label, exif, fields, item.evidenceNote || null));
      } else {
        evidenceList.push(Evidence.evidenceRegion(zone, label, item.evidenceNote || null));
      }
    } else if (item.exifFields && item.exifFields.length) {
      evidenceList.push(Evidence.evidenceExif(exif, item.exifFields, item.evidenceNote || null));
    } else if (item.evidence) {
      evidenceList = Array.isArray(item.evidence) ? item.evidence : [item.evidence];
    }

    return Schema.createRecommendation({
      sectionId: sectionId,
      text: item.text || "",
      evidence: evidenceList,
      confidence: item.confidence != null ? item.confidence : null,
      actionable: item.actionable !== false
    });
  }

  function makeModule(sectionId, title) {
    return {
      id: "module." + sectionId,
      sectionId: sectionId,
      title: title,
      /**
       * @param {ModuleContext} context
       */
      analyze: function (context) {
        context = context || {};
        var obs = (context.observations && context.observations[sectionId]) || {};
        var status = Schema.SECTION_STATUS.empty;
        if (context.isPlaceholder) status = Schema.SECTION_STATUS.placeholder;
        else if (obs.summary || (obs.items && obs.items.length)) status = Schema.SECTION_STATUS.ready;

        var recs = [];
        var items = Array.isArray(obs.items) ? obs.items : [];
        for (var i = 0; i < items.length; i++) {
          recs.push(buildRecommendation(sectionId, items[i], context.exif));
        }

        return Schema.createReviewSection(sectionId, {
          title: title,
          summary: obs.summary != null ? obs.summary : null,
          recommendations: recs,
          moduleId: "module." + sectionId,
          status: status
        });
      }
    };
  }

  var MODULE_DEFS = Schema.REVIEW_SECTIONS.map(function (s) {
    return makeModule(s.id, s.title);
  });

  var BY_ID = {};
  MODULE_DEFS.forEach(function (m) {
    BY_ID[m.id] = m;
    BY_ID[m.sectionId] = m;
  });

  function listModules() {
    return MODULE_DEFS.slice();
  }

  function getModule(idOrSection) {
    return BY_ID[idOrSection] || null;
  }

  /**
   * Run all modules against a shared context; returns ordered sections.
   */
  function runAll(context) {
    return MODULE_DEFS.map(function (mod) {
      return mod.analyze(context);
    });
  }

  global.WaypointPhotoCoach2Modules = {
    listModules: listModules,
    getModule: getModule,
    runAll: runAll,
    buildRecommendation: buildRecommendation,
    MODULE_COUNT: MODULE_DEFS.length
  };
})(typeof window !== "undefined" ? window : globalThis);
