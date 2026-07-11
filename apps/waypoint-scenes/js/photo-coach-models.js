/**
 * Waypoint Scenes / Photo Coach — growth data models (schema only).
 *
 * Architectural foundation for long-term photographer profiles.
 * Does NOT compute profiles or change the Photo Coach UI.
 *
 * Entities:
 *   PhotoRecord  — one analyzed photograph (structured, not prose-only)
 *   Shoot        — one import / batch analysis session
 *   PhotographerProfile — future living profile (storage shape only)
 */
(function (global) {
  "use strict";

  var PHOTO_SCHEMA = "2.0.0";
  var SHOOT_SCHEMA = "2.0.0";
  var PROFILE_SCHEMA = "1.0.0";

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function emptyCamera() {
    return {
      make: null,
      model: null,
      lens: null,
      focalLengthMm: null,
      fNumber: null,
      iso: null,
      exposureTimeSec: null
    };
  }

  function emptyLocation() {
    return {
      label: null,
      city: null,
      county: null,
      state: null,
      country: null,
      lat: null,
      lng: null,
      source: null
    };
  }

  /**
   * Structured per-photo analysis record.
   * Every analyzed upload should produce one of these.
   */
  function createPhotoRecord(overrides) {
    overrides = overrides || {};
    return Object.assign({
      schemaVersion: PHOTO_SCHEMA,
      uuid: uuid(),
      originalFilename: null,
      captureDateTime: null,
      camera: emptyCamera(),
      location: emptyLocation(),
      subjectCategories: [],
      compositionScore: null,
      technicalScore: null,
      artisticScore: null,
      overallScore: null,
      confidence: null,
      lightingConditions: null,
      backgroundComplexity: null,
      subjectIsolation: null,
      sharpness: null,
      exposureQuality: null,
      colorCharacteristics: null,
      dominantMood: null,
      aiCritique: {
        engine: "demo-analysis",
        trustLabel: "Demo Analysis",
        narrative: null,
        strengths: [],
        improvements: [],
        letterGrade: null
      },
      aiCoachingSuggestions: [],
      shootId: null,
      analyzedAt: null,
      portfolioSessionId: null,
      thumbnail: null,
      // Compatibility / debugging
      legacyImageId: null,
      engineVersion: null
    }, overrides);
  }

  /**
   * One import / batch analysis session.
   */
  function createShoot(overrides) {
    overrides = overrides || {};
    return Object.assign({
      schemaVersion: SHOOT_SCHEMA,
      id: null,
      date: null,
      createdAt: null,
      updatedAt: null,
      status: "pending",
      imageCount: 0,
      photoIds: [],
      averageScores: {
        overall: null,
        composition: null,
        technical: null,
        artistic: null
      },
      bestImages: [],
      commonStrengths: [],
      commonImprovementThemes: [],
      aiSummary: null,
      // Optional rich summary (existing Shoot Summary UI)
      summaryDetail: null,
      outdoorContext: null,
      communityMatchReady: false
    }, overrides);
  }

  /**
   * Photographer growth profile — storage shape only.
   * Do NOT calculate these fields yet; leave null/empty for future jobs.
   */
  function createPhotographerProfile(overrides) {
    overrides = overrides || {};
    return Object.assign({
      schemaVersion: PROFILE_SCHEMA,
      id: "local-default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Future-computed fields (not calculated in this sprint)
      preferredSubjects: [],
      emergingNiche: null,
      visualStyle: null,
      strengths: [],
      recurringCoachingThemes: [],
      growthTimeline: [],
      favoriteLighting: [],
      favoriteFocalLengths: [],
      typicalCompositions: [],
      recentImprovements: [],
      confidenceScore: null,
      // Bookkeeping for future aggregation
      photoCount: 0,
      shootCount: 0,
      lastPhotoUuid: null,
      lastShootId: null,
      computedAt: null,
      computationVersion: null,
      // Legacy learning-profile fields (backwards compatible)
      displayName: null,
      experienceLevel: "developing",
      goals: ["composition", "lighting"],
      focusAreas: [],
      completedAssignments: []
    }, overrides);
  }

  global.WaypointPhotoCoachModels = {
    PHOTO_SCHEMA: PHOTO_SCHEMA,
    SHOOT_SCHEMA: SHOOT_SCHEMA,
    PROFILE_SCHEMA: PROFILE_SCHEMA,
    uuid: uuid,
    emptyCamera: emptyCamera,
    emptyLocation: emptyLocation,
    createPhotoRecord: createPhotoRecord,
    createShoot: createShoot,
    createPhotographerProfile: createPhotographerProfile
  };
})(window);
