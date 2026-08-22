/**
 * Waypoint Moving Scenes — recipe + derivative models
 * Non-destructive: ORIGINAL / WAYPOINT EDIT / MOVING SCENE stay distinct.
 */
(function (global) {
  "use strict";

  var ENGINE_VERSION = "1.1.0-perception";
  var SCHEMA_VERSION = "1.0.0";
  var DEFAULT_DURATION_SEC = 6;
  var PREVIEW_MAX = 720;
  var FINAL_MAX = 1920;

  /** Motion classes V1 may attempt; weak ones stay deferred in choice. */
  var CLASS_META = {
    clouds: { label: "Clouds", supported: true },
    water: { label: "Water", supported: true },
    fog: { label: "Fog", supported: true },
    haze: { label: "Haze", supported: true },
    rain: { label: "Rain", supported: false, deferReason: "Only amplify visible rain — inventing weather deferred" },
    snow: { label: "Snow", supported: false, deferReason: "Only amplify visible snow — inventing weather deferred" },
    foliage: { label: "Foliage", supported: false, deferReason: "Trunk/leaf stability not yet reliable enough" },
    grass: { label: "Grass", supported: false, deferReason: "Deferred until localized sway is artifact-free" },
    light: { label: "Light", supported: false, deferReason: "No fake sun or time-of-day shifts in V1" },
    stars: { label: "Stars", supported: false, deferReason: "Never invent stars; twinkle deferred" },
    parallax: { label: "Parallax", supported: false, deferReason: "Ken Burns / depth parallax omitted when artifact-prone" }
  };

  var STRENGTHS = [
    { id: "subtle", label: "Subtle", scale: 0.55 },
    { id: "natural", label: "Natural", scale: 1 },
    { id: "more", label: "More", scale: 1.45 }
  ];

  function uuid(prefix) {
    if (global.crypto && global.crypto.randomUUID) {
      return (prefix || "ms") + "-" + global.crypto.randomUUID();
    }
    return (prefix || "ms") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function emptyMovingModuleRef() {
    return {
      created: false,
      assetId: null,
      blobKey: null,
      recipeId: null,
      sourceAssetId: null,
      sourceRole: null,
      classes: [],
      durationSec: null,
      strength: null,
      confidence: null,
      noMotion: false,
      createdAt: null,
      engineVersion: null
    };
  }

  function createRecipe(partial) {
    partial = partial || {};
    return {
      schemaVersion: SCHEMA_VERSION,
      id: partial.id || uuid("ms-recipe"),
      originalAssetId: partial.originalAssetId || null,
      sourceAssetId: partial.sourceAssetId || null,
      sourceRole: partial.sourceRole || "original",
      movingAssetId: partial.movingAssetId || null,
      classes: Array.isArray(partial.classes) ? partial.classes.slice() : [],
      strengths: partial.strengths && typeof partial.strengths === "object"
        ? Object.assign({}, partial.strengths)
        : {},
      strength: partial.strength || "natural",
      directionDeg: partial.directionDeg != null ? partial.directionDeg : null,
      durationSec: partial.durationSec != null ? partial.durationSec : DEFAULT_DURATION_SEC,
      loop: partial.loop !== false,
      confidence: partial.confidence && typeof partial.confidence === "object"
        ? Object.assign({}, partial.confidence)
        : {},
      waypointChoice: partial.waypointChoice && typeof partial.waypointChoice === "object"
        ? Object.assign({}, partial.waypointChoice)
        : null,
      userAssist: partial.userAssist && typeof partial.userAssist === "object"
        ? Object.assign({}, partial.userAssist)
        : { brushApplied: false },
      noMotion: !!partial.noMotion,
      honestyNotes: Array.isArray(partial.honestyNotes) ? partial.honestyNotes.slice() : [],
      createdAt: partial.createdAt || new Date().toISOString(),
      updatedAt: partial.updatedAt || new Date().toISOString(),
      engineVersion: partial.engineVersion || ENGINE_VERSION
    };
  }

  function movingBlobKey(originalAssetId, version) {
    return "moving-" + String(originalAssetId) + "-v" + String(version || 1);
  }

  function movingFilename(originalName, ext) {
    var base = String(originalName || "photo.jpg").replace(/\.[^.]+$/, "");
    base = base.replace(/-waypoint$/i, "").replace(/-moving$/i, "");
    return base + "-moving." + (ext || "webm");
  }

  global.WaypointMovingScenesModels = {
    ENGINE_VERSION: ENGINE_VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    DEFAULT_DURATION_SEC: DEFAULT_DURATION_SEC,
    PREVIEW_MAX: PREVIEW_MAX,
    FINAL_MAX: FINAL_MAX,
    CLASS_META: CLASS_META,
    STRENGTHS: STRENGTHS,
    uuid: uuid,
    emptyMovingModuleRef: emptyMovingModuleRef,
    createRecipe: createRecipe,
    movingBlobKey: movingBlobKey,
    movingFilename: movingFilename
  };
})(typeof window !== "undefined" ? window : globalThis);
