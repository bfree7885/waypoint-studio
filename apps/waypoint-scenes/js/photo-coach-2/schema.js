/**
 * Photo Coach 2.0 — review document schema & factories.
 * Education-focused reviews (not editing). Future AI plugs in via providers.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = "2.0.0";

  /** Ordered review sections required by Photo Coach 2.0. */
  var REVIEW_SECTIONS = [
    { id: "overallImpression", title: "Overall Impression", kind: "narrative" },
    { id: "composition", title: "Composition", kind: "analysis" },
    { id: "light", title: "Light", kind: "analysis" },
    { id: "color", title: "Color", kind: "analysis" },
    { id: "subject", title: "Subject", kind: "analysis" },
    { id: "story", title: "Story", kind: "analysis" },
    { id: "technicalQuality", title: "Technical Quality", kind: "analysis" },
    { id: "whatWorks", title: "What Works", kind: "strengths" },
    { id: "whatWeakensIt", title: "What Weakens It", kind: "improvements" },
    { id: "suggestedEdits", title: "Suggested Edits", kind: "guidance" },
    { id: "whatToPracticeNext", title: "What To Practice Next", kind: "practice" }
  ];

  var SECTION_IDS = REVIEW_SECTIONS.map(function (s) { return s.id; });

  var ENGINE_STATUS = {
    idle: "idle",
    analyzing: "analyzing",
    ready: "ready",
    placeholder: "placeholder",
    error: "error"
  };

  var SECTION_STATUS = {
    empty: "empty",
    placeholder: "placeholder",
    ready: "ready",
    error: "error"
  };

  /** Named zones for region evidence (normalized boxes optional). */
  var REGION_ZONES = [
    "full-frame",
    "center",
    "upper-third",
    "lower-third",
    "left-third",
    "right-third",
    "upper-left",
    "upper-right",
    "lower-left",
    "lower-right",
    "edges",
    "foreground",
    "background",
    "sky",
    "horizon"
  ];

  /** EXIF fields recommendations may cite. */
  var EXIF_FIELDS = [
    "make",
    "model",
    "lens",
    "focalLengthMm",
    "fNumber",
    "iso",
    "exposureTimeSec",
    "dateTimeOriginal",
    "orientation",
    "width",
    "height"
  ];

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "pc2-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Normalized image region (0–1 coordinates) and/or named zone.
   */
  function createImageRegion(overrides) {
    overrides = overrides || {};
    return Object.assign({
      id: overrides.id || uuid(),
      label: overrides.label || null,
      zone: overrides.zone || null,
      x: overrides.x != null ? overrides.x : null,
      y: overrides.y != null ? overrides.y : null,
      width: overrides.width != null ? overrides.width : null,
      height: overrides.height != null ? overrides.height : null
    }, overrides.id || overrides.label || overrides.zone != null ? {} : {});
  }

  function createExifReference(field, value, source) {
    return {
      field: field,
      value: value == null ? null : value,
      source: source || "exif"
    };
  }

  /**
   * Evidence for a recommendation — must prefer region and/or EXIF.
   */
  function createEvidence(overrides) {
    overrides = overrides || {};
    return {
      kind: overrides.kind || inferEvidenceKind(overrides),
      region: overrides.region || null,
      exif: Array.isArray(overrides.exif) ? overrides.exif.slice() : [],
      note: overrides.note || null
    };
  }

  function inferEvidenceKind(o) {
    var hasRegion = !!(o && o.region);
    var hasExif = !!(o && o.exif && o.exif.length);
    if (hasRegion && hasExif) return "both";
    if (hasRegion) return "region";
    if (hasExif) return "exif";
    return "none";
  }

  function createRecommendation(overrides) {
    overrides = overrides || {};
    var evidence = Array.isArray(overrides.evidence)
      ? overrides.evidence.slice()
      : (overrides.evidence ? [overrides.evidence] : []);
    return {
      id: overrides.id || uuid(),
      sectionId: overrides.sectionId || null,
      text: overrides.text || "",
      evidence: evidence,
      confidence: overrides.confidence != null ? overrides.confidence : null,
      actionable: overrides.actionable !== false
    };
  }

  function createReviewSection(sectionDef, overrides) {
    overrides = overrides || {};
    var def = typeof sectionDef === "string"
      ? REVIEW_SECTIONS.find(function (s) { return s.id === sectionDef; }) || { id: sectionDef, title: sectionDef, kind: "analysis" }
      : sectionDef;
    return {
      id: def.id,
      title: overrides.title || def.title,
      kind: def.kind,
      summary: overrides.summary != null ? overrides.summary : null,
      recommendations: Array.isArray(overrides.recommendations) ? overrides.recommendations.slice() : [],
      moduleId: overrides.moduleId || null,
      status: overrides.status || SECTION_STATUS.empty
    };
  }

  function emptySections() {
    return REVIEW_SECTIONS.map(function (def) {
      return createReviewSection(def, { status: SECTION_STATUS.empty });
    });
  }

  /**
   * Full education review document.
   */
  function createReviewDocument(overrides) {
    overrides = overrides || {};
    return {
      schemaVersion: SCHEMA_VERSION,
      id: overrides.id || uuid(),
      imageId: overrides.imageId || null,
      imageName: overrides.imageName || null,
      createdAt: overrides.createdAt || new Date().toISOString(),
      providerId: overrides.providerId || null,
      providerLabel: overrides.providerLabel || null,
      engineStatus: overrides.engineStatus || ENGINE_STATUS.idle,
      isSample: !!overrides.isSample,
      isPlaceholder: !!overrides.isPlaceholder,
      exif: overrides.exif || null,
      sections: Array.isArray(overrides.sections) ? overrides.sections : emptySections(),
      meta: overrides.meta || {}
    };
  }

  function sectionById(review, sectionId) {
    if (!review || !Array.isArray(review.sections)) return null;
    for (var i = 0; i < review.sections.length; i++) {
      if (review.sections[i].id === sectionId) return review.sections[i];
    }
    return null;
  }

  function assertSectionOrder(review) {
    if (!review || !Array.isArray(review.sections)) return false;
    if (review.sections.length !== SECTION_IDS.length) return false;
    for (var i = 0; i < SECTION_IDS.length; i++) {
      if (review.sections[i].id !== SECTION_IDS[i]) return false;
    }
    return true;
  }

  /**
   * Validate that a recommendation cites region and/or EXIF when possible.
   * Returns { ok, reason }.
   */
  function validateRecommendationEvidence(rec, options) {
    options = options || {};
    var requireEvidence = options.requireEvidence !== false;
    if (!rec || !rec.text) {
      return { ok: false, reason: "missing text" };
    }
    var evidence = Array.isArray(rec.evidence) ? rec.evidence : [];
    if (!requireEvidence) return { ok: true, reason: null };
    if (!evidence.length) {
      return { ok: false, reason: "no evidence" };
    }
    for (var i = 0; i < evidence.length; i++) {
      var e = evidence[i];
      var hasRegion = !!(e.region && (e.region.zone || (e.region.x != null && e.region.y != null)));
      var hasExif = Array.isArray(e.exif) && e.exif.length > 0;
      if (hasRegion || hasExif) return { ok: true, reason: null };
    }
    return { ok: false, reason: "evidence lacks region or EXIF" };
  }

  global.WaypointPhotoCoach2Schema = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    REVIEW_SECTIONS: REVIEW_SECTIONS,
    SECTION_IDS: SECTION_IDS,
    ENGINE_STATUS: ENGINE_STATUS,
    SECTION_STATUS: SECTION_STATUS,
    REGION_ZONES: REGION_ZONES,
    EXIF_FIELDS: EXIF_FIELDS,
    uuid: uuid,
    createImageRegion: createImageRegion,
    createExifReference: createExifReference,
    createEvidence: createEvidence,
    createRecommendation: createRecommendation,
    createReviewSection: createReviewSection,
    emptySections: emptySections,
    createReviewDocument: createReviewDocument,
    sectionById: sectionById,
    assertSectionOrder: assertSectionOrder,
    validateRecommendationEvidence: validateRecommendationEvidence
  };
})(typeof window !== "undefined" ? window : globalThis);
