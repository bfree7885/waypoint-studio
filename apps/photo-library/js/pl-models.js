/**
 * Waypoint Photo Library — domain models
 * LibraryImage · Collection · LibraryTag
 * Future-proof metadata; never invent missing EXIF/fields.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = "1.0.0";

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "lib-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function emptyCamera() {
    return {
      make: null,
      model: null,
      lens: null,
      focalLengthMm: null,
      fNumber: null,
      iso: null,
      shutter: null,
      exposureTimeSec: null
    };
  }

  function emptyGps() {
    return { lat: null, lon: null, accuracyM: null };
  }

  function emptyModuleRefs() {
    return {
      photoCoach: {
        analysisStatus: "not-analyzed", // not-analyzed | analyzing | analyzed | error
        photoRecordId: null,
        portfolioSessionId: null,
        shootId: null,
        shootImageId: null,
        analyzedAt: null,
        letterGrade: null,
        overallScore: null,
        narrativeSummary: null,
        confidenceTier: null
      },
      hiddenLandscapes: {
        available: false,
        variationIds: [],
        lastModeId: null,
        lastExportAt: null
      },
      autoEdit: {
        hasEdit: false,
        editAssetId: null,
        editBlobKey: null,
        recipeId: null,
        editVersion: 0,
        intent: null,
        createdAt: null,
        engineVersion: null
      },
      livingScenes: {
        created: false,
        assetId: null
      },
      sceneBuilder: {
        created: false,
        assetId: null
      }
    };
  }

  /**
   * @returns {object} LibraryImage
   */
  function createLibraryImage(partial) {
    partial = partial || {};
    var cam = Object.assign(emptyCamera(), partial.camera || {});
    var gps = Object.assign(emptyGps(), partial.gps || {});
    var mods = partial.moduleRefs || {};
    var defaults = emptyModuleRefs();
    var photoCoach = Object.assign({}, defaults.photoCoach, mods.photoCoach || {});
    var hl = Object.assign({}, defaults.hiddenLandscapes, mods.hiddenLandscapes || {});
    var autoEdit = Object.assign({}, defaults.autoEdit, mods.autoEdit || {});
    var living = Object.assign({}, defaults.livingScenes, mods.livingScenes || {});
    var scene = Object.assign({}, defaults.sceneBuilder, mods.sceneBuilder || {});

    return {
      schemaVersion: SCHEMA_VERSION,
      id: partial.id || uuid(),
      /** original | waypoint-edit */
      role: partial.role || "original",
      /** When role is waypoint-edit, points at the preserved original Library id */
      originalAssetId: partial.originalAssetId || null,
      filename: partial.filename || partial.originalFilename || "photo.jpg",
      originalFilename: partial.originalFilename || partial.filename || "photo.jpg",
      mimeType: partial.mimeType || null,
      byteSize: partial.byteSize != null ? partial.byteSize : null,
      contentFingerprint: partial.contentFingerprint || null,

      captureDate: partial.captureDate || null,
      importDate: partial.importDate || new Date().toISOString(),
      updatedAt: partial.updatedAt || new Date().toISOString(),

      camera: cam,
      gps: gps,

      orientation: partial.orientation || null,
      aspectRatio: partial.aspectRatio != null ? partial.aspectRatio : null,
      width: partial.width != null ? partial.width : null,
      height: partial.height != null ? partial.height : null,

      tags: Array.isArray(partial.tags) ? partial.tags.slice() : [],
      collectionIds: Array.isArray(partial.collectionIds) ? partial.collectionIds.slice() : [],

      /** Private 1–5 star rating; null = unset. Never a public score. */
      rating: partial.rating != null ? partial.rating : null,
      /** keep | maybe | reject | null */
      selectionLabel: partial.selectionLabel || null,
      favorite: !!partial.favorite,

      subjectHints: Array.isArray(partial.subjectHints) ? partial.subjectHints.slice() : [],

      photographerNotes: partial.photographerNotes || null,
      aiNotes: partial.aiNotes || null,
      outdoorContext: partial.outdoorContext || null,
      coachSummary: partial.coachSummary || null,

      media: {
        hasOriginal: !!((partial.media && partial.media.hasOriginal) || partial.hasOriginal),
        hasThumbnail: !!((partial.media && partial.media.hasThumbnail) || partial.hasThumbnail || partial.thumbnailDataUrl),
        thumbnailDataUrl: partial.thumbnailDataUrl || (partial.media && partial.media.thumbnailDataUrl) || null,
        originalBlobKey: (partial.media && partial.media.originalBlobKey) || partial.id || null,
        thumbBlobKey: (partial.media && partial.media.thumbBlobKey) || null
      },

      moduleRefs: {
        photoCoach: photoCoach,
        hiddenLandscapes: hl,
        autoEdit: autoEdit,
        livingScenes: living,
        sceneBuilder: scene
      },

      source: partial.source || "upload", // upload | migration-portfolio | migration-shoot | migration-record | importer
      legacy: {
        portfolioSessionId: (partial.legacy && partial.legacy.portfolioSessionId) || null,
        shootImageId: (partial.legacy && partial.legacy.shootImageId) || null,
        photoRecordUuid: (partial.legacy && partial.legacy.photoRecordUuid) || null
      }
    };
  }

  function createCollection(partial) {
    partial = partial || {};
    return {
      schemaVersion: SCHEMA_VERSION,
      id: partial.id || uuid(),
      name: partial.name || "Untitled collection",
      description: partial.description || null,
      coverImageId: partial.coverImageId || null,
      imageIds: Array.isArray(partial.imageIds) ? partial.imageIds.slice() : [],
      createdAt: partial.createdAt || new Date().toISOString(),
      updatedAt: partial.updatedAt || new Date().toISOString(),
      private: partial.private !== false
    };
  }

  function normalizeTag(tag) {
    return String(tag || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .slice(0, 48);
  }

  global.WaypointPhotoLibraryModels = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    uuid: uuid,
    createLibraryImage: createLibraryImage,
    createCollection: createCollection,
    normalizeTag: normalizeTag,
    emptyCamera: emptyCamera,
    emptyGps: emptyGps,
    emptyModuleRefs: emptyModuleRefs
  };
})(typeof window !== "undefined" ? window : globalThis);
