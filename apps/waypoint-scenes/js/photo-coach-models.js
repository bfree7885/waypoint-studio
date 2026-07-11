/**
 * Waypoint Scenes / Photo Coach — growth data models.
 *
 * Entities:
 *   PhotoRecord         — one analyzed photograph (structured)
 *   Shoot               — one import / batch analysis session
 *   PhotographerProfile — living profile computed from eligible work
 */
(function (global) {
  "use strict";

  var PHOTO_SCHEMA = "2.1.0";
  var SHOOT_SCHEMA = "2.1.0";
  var PROFILE_SCHEMA = "1.1.0";
  var COACHING_SCHEMA = "1.0.0";
  var COMPUTATION_VERSION = "1.0.0";

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

  function emptyUserCorrections() {
    return {
      subjectCategories: null,
      nicheLabel: null,
      notes: null,
      correctedAt: null
    };
  }

  /**
   * Structured per-photo analysis record.
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
      legacyImageId: null,
      engineVersion: null,
      // Profile learning controls (do not delete original critique)
      excludeFromProfile: false,
      userCorrections: emptyUserCorrections()
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
      summaryDetail: null,
      outdoorContext: null,
      communityMatchReady: false,
      // Profile learning controls
      excludeFromProfile: false,
      isExperimentation: false
    }, overrides);
  }

  /**
   * Photographer growth profile — private by default.
   * Computed fields are filled by the profile engine.
   */
  function createPhotographerProfile(overrides) {
    overrides = overrides || {};
    return Object.assign({
      schemaVersion: PROFILE_SCHEMA,
      id: "local-default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      privacy: {
        visibility: "private",
        shareEnabled: false
      },
      preferredSubjects: [],
      emergingNiche: null,
      likelyNiches: [],
      visualStyle: null,
      strengths: [],
      recurringCoachingThemes: [],
      growthTimeline: [],
      favoriteLighting: [],
      favoriteFocalLengths: [],
      typicalCompositions: [],
      recentImprovements: [],
      confidenceScore: null,
      currentDirection: null,
      evidence: null,
      photoCount: 0,
      shootCount: 0,
      lastPhotoUuid: null,
      lastShootId: null,
      computedAt: null,
      computationVersion: null,
      displayName: null,
      experienceLevel: "developing",
      goals: ["composition", "lighting"],
      focusAreas: [],
      completedAssignments: []
    }, overrides);
  }

  function migratePhotoRecord(record) {
    if (!record || typeof record !== "object") return record;
    if (!record.schemaVersion) record.schemaVersion = PHOTO_SCHEMA;
    if (record.excludeFromProfile == null) record.excludeFromProfile = false;
    if (!record.userCorrections) record.userCorrections = emptyUserCorrections();
    if (record.userCorrections.subjectCategories === undefined) {
      record.userCorrections.subjectCategories = null;
    }
    if (record.userCorrections.nicheLabel === undefined) {
      record.userCorrections.nicheLabel = null;
    }
    record.schemaVersion = PHOTO_SCHEMA;
    return record;
  }

  function migrateShoot(shoot) {
    if (!shoot || typeof shoot !== "object") return shoot;
    if (shoot.excludeFromProfile == null) shoot.excludeFromProfile = false;
    if (shoot.isExperimentation == null) shoot.isExperimentation = false;
    shoot.schemaVersion = SHOOT_SCHEMA;
    return shoot;
  }

  function migratePhotographerProfile(profile) {
    if (!profile || typeof profile !== "object") {
      return createPhotographerProfile();
    }
    if (!profile.privacy) {
      profile.privacy = { visibility: "private", shareEnabled: false };
    }
    if (profile.privacy.visibility == null) profile.privacy.visibility = "private";
    if (profile.privacy.shareEnabled == null) profile.privacy.shareEnabled = false;
    if (!Array.isArray(profile.likelyNiches)) profile.likelyNiches = [];
    if (profile.currentDirection === undefined) profile.currentDirection = null;
    if (profile.evidence === undefined) profile.evidence = null;
    profile.schemaVersion = PROFILE_SCHEMA;
    return profile;
  }

  function createCoachingRecord(overrides) {
    overrides = overrides || {};
    return Object.assign({
      schemaVersion: COACHING_SCHEMA,
      uuid: uuid(),
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      photoId: null,
      shootId: null,
      coachingTheme: null,
      themeLabel: null,
      recommendation: null,
      evidenceUsed: {
        photoCount: 0,
        shootCount: 0,
        signals: [],
        profileTier: null
      },
      confidence: null,
      confidencePercent: null,
      wasRepeated: false,
      laterShowedImprovement: null,
      userFeedback: null,
      feedbackAt: null,
      source: "photo",
      privacy: "private"
    }, overrides);
  }

  function createCoachingPreferences(overrides) {
    overrides = overrides || {};
    return Object.assign({
      schemaVersion: COACHING_SCHEMA,
      hiddenThemes: [],
      intentionalThemes: [],
      boostedThemes: [],
      themeFeedback: {},
      updatedAt: new Date().toISOString()
    }, overrides);
  }

  function migrateCoachingRecord(record) {
    if (!record || typeof record !== "object") return record;
    if (record.wasRepeated == null) record.wasRepeated = false;
    if (record.laterShowedImprovement === undefined) record.laterShowedImprovement = null;
    if (record.userFeedback === undefined) record.userFeedback = null;
    if (!record.evidenceUsed) {
      record.evidenceUsed = { photoCount: 0, shootCount: 0, signals: [], profileTier: null };
    }
    record.schemaVersion = COACHING_SCHEMA;
    return record;
  }

  function migrateCoachingPreferences(prefs) {
    if (!prefs || typeof prefs !== "object") return createCoachingPreferences();
    if (!Array.isArray(prefs.hiddenThemes)) prefs.hiddenThemes = [];
    if (!Array.isArray(prefs.intentionalThemes)) prefs.intentionalThemes = [];
    if (!Array.isArray(prefs.boostedThemes)) prefs.boostedThemes = [];
    if (!prefs.themeFeedback || typeof prefs.themeFeedback !== "object") prefs.themeFeedback = {};
    prefs.schemaVersion = COACHING_SCHEMA;
    return prefs;
  }

  global.WaypointPhotoCoachModels = {
    PHOTO_SCHEMA: PHOTO_SCHEMA,
    SHOOT_SCHEMA: SHOOT_SCHEMA,
    PROFILE_SCHEMA: PROFILE_SCHEMA,
    COACHING_SCHEMA: COACHING_SCHEMA,
    COMPUTATION_VERSION: COMPUTATION_VERSION,
    uuid: uuid,
    emptyCamera: emptyCamera,
    emptyLocation: emptyLocation,
    emptyUserCorrections: emptyUserCorrections,
    createPhotoRecord: createPhotoRecord,
    createShoot: createShoot,
    createPhotographerProfile: createPhotographerProfile,
    createCoachingRecord: createCoachingRecord,
    createCoachingPreferences: createCoachingPreferences,
    migratePhotoRecord: migratePhotoRecord,
    migrateShoot: migrateShoot,
    migratePhotographerProfile: migratePhotographerProfile,
    migrateCoachingRecord: migrateCoachingRecord,
    migrateCoachingPreferences: migrateCoachingPreferences
  };
})(typeof window !== "undefined" ? window : global);
