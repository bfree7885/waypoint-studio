/**
 * Photo Coach 2.0 — review composer / facade.
 */
(function (global) {
  "use strict";

  var Schema = global.WaypointPhotoCoach2Schema;
  var Providers = global.WaypointPhotoCoach2Providers;
  var Evidence = global.WaypointPhotoCoach2Evidence;

  if (!Schema || !Providers) {
    throw new Error("Schema and Providers must load before composer.js");
  }

  function analyzeWith(providerId, context) {
    var provider = Providers.getProvider(providerId) || Providers.getProvider(Providers.DEFAULT_PROVIDER_ID);
    if (!provider) {
      throw new Error("No analysis provider registered");
    }
    return provider.analyze(context || {});
  }

  function analyzePlaceholder(context) {
    return analyzeWith("placeholder.ai-ready", context);
  }

  function analyzeFixture(context) {
    return analyzeWith("heuristic.fixture", context);
  }

  /**
   * Collect evidence validation across all recommendations in a review.
   */
  function auditEvidence(review, options) {
    options = options || {};
    var requireEvidence = options.requireEvidence !== false;
    var results = [];
    var okCount = 0;
    var failCount = 0;
    if (!review || !Array.isArray(review.sections)) {
      return { ok: false, okCount: 0, failCount: 0, results: [], sectionOrderOk: false };
    }
    var sectionOrderOk = Schema.assertSectionOrder(review);
    review.sections.forEach(function (section) {
      (section.recommendations || []).forEach(function (rec) {
        var v = Schema.validateRecommendationEvidence(rec, { requireEvidence: requireEvidence });
        results.push({
          sectionId: section.id,
          recommendationId: rec.id,
          ok: v.ok,
          reason: v.reason,
          label: Evidence ? Evidence.formatEvidenceLabel((rec.evidence || [])[0]) : null
        });
        if (v.ok) okCount += 1;
        else failCount += 1;
      });
    });
    return {
      ok: sectionOrderOk && failCount === 0,
      okCount: okCount,
      failCount: failCount,
      results: results,
      sectionOrderOk: sectionOrderOk
    };
  }

  function listSectionTitles(review) {
    if (!review || !Array.isArray(review.sections)) return [];
    return review.sections.map(function (s) { return s.title; });
  }

  global.WaypointPhotoCoach2 = {
    SCHEMA_VERSION: Schema.SCHEMA_VERSION,
    analyzeWith: analyzeWith,
    analyzePlaceholder: analyzePlaceholder,
    analyzeFixture: analyzeFixture,
    auditEvidence: auditEvidence,
    listSectionTitles: listSectionTitles,
    Schema: Schema,
    Providers: Providers,
    Evidence: Evidence,
    Modules: global.WaypointPhotoCoach2Modules,
    Fixtures: global.WaypointPhotoCoach2Fixtures
  };
})(typeof window !== "undefined" ? window : globalThis);
