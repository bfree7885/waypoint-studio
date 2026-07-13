/**
 * Hidden Landscapes — domain models (scaffold)
 *
 * VisionMode · Species · CameraSystem · Filter · Wavelength · ImageSet
 *
 * Factories normalize catalog JSON into stable shapes for future UI,
 * compare tools, and local-first storage. No capture or rendering yet.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = 1;

  function emptyGps() {
    return { lat: null, lon: null, accuracyM: null, privacy: "local-only" };
  }

  function emptyWeather() {
    return { summary: null, tempC: null, conditions: null, notes: null };
  }

  function emptyGear() {
    return { cameraSystemId: null, lens: null, filterIds: [], notes: null };
  }

  function emptyFrames() {
    return {
      visibleImage: null,
      human: null,
      infraredImage: null,
      infrared: null,
      ultravioletImage: null,
      ultraviolet: null,
      fullSpectrumImage: null,
      fullSpectrum: null,
      polarizedImage: null,
      nightImage: null,
      animalVisionRenders: [],
      /** @type {Array<{ speciesId: string, frame: object|null }>} */
      speciesSimulations: []
    };
  }

  /** @returns {object} VisionMode */
  function createVisionMode(partial) {
    partial = partial || {};
    return {
      id: partial.id || "",
      label: partial.label || "",
      shortLabel: partial.shortLabel || partial.label || "",
      category: partial.category || "uncategorized",
      summary: partial.summary || "",
      wavelengthIds: Array.isArray(partial.wavelengthIds) ? partial.wavelengthIds.slice() : [],
      relatedApp: partial.relatedApp || null,
      status: partial.status || "planned"
    };
  }

  /** @returns {object} Species */
  function createSpecies(partial) {
    partial = partial || {};
    return {
      id: partial.id || "",
      commonName: partial.commonName || "",
      scientificName: partial.scientificName || "",
      visionSummary: partial.visionSummary || "",
      relatedAnimalVisionId: partial.relatedAnimalVisionId || null,
      status: partial.status || "scaffold"
    };
  }

  /** @returns {object} CameraSystem */
  function createCameraSystem(partial) {
    partial = partial || {};
    return {
      id: partial.id || "",
      label: partial.label || "",
      kind: partial.kind || "camera",
      spectrum: partial.spectrum || "visible",
      notes: partial.notes || ""
    };
  }

  /** @returns {object} Filter */
  function createFilter(partial) {
    partial = partial || {};
    return {
      id: partial.id || "",
      label: partial.label || "",
      kind: partial.kind || "unknown",
      cutoffNm: partial.cutoffNm != null ? partial.cutoffNm : null,
      notes: partial.notes || ""
    };
  }

  /** @returns {object} Wavelength */
  function createWavelength(partial) {
    partial = partial || {};
    return {
      id: partial.id || "",
      label: partial.label || "",
      rangeNm: Array.isArray(partial.rangeNm) ? partial.rangeNm.slice() : [null, null],
      notes: partial.notes || ""
    };
  }

  /**
   * ImageSet — one place/moment with multiple VisionMode frames.
   * @returns {object}
   */
  function createImageSet(partial) {
    partial = partial || {};
    var frames = partial.frames || {};
    return {
      schemaVersion: SCHEMA_VERSION,
      id: partial.id || "imageset-" + Date.now().toString(36),
      title: partial.title || "Untitled ImageSet",
      status: partial.status || "draft",
      locationLabel: partial.locationLabel || partial.location || "",
      location: partial.location || partial.locationLabel || "",
      gps: Object.assign(emptyGps(), partial.gps || {}),
      capturedAt: partial.capturedAt || partial.captureDate || null,
      captureDate: partial.captureDate || partial.capturedAt || null,
      weather: Object.assign(emptyWeather(), partial.weather || {}),
      season: partial.season || null,
      phenology: partial.phenology || null,
      camera: partial.camera || null,
      lens: partial.lens || null,
      filter: partial.filter || null,
      wavelengthRange: partial.wavelengthRange || null,
      exposureSettings: partial.exposureSettings || null,
      gear: Object.assign(emptyGear(), partial.gear || {}, {
        filterIds: Array.isArray((partial.gear || {}).filterIds)
          ? partial.gear.filterIds.slice()
          : []
      }),
      frames: {
        visibleImage: frames.visibleImage || frames.human || null,
        human: frames.human || frames.visibleImage || null,
        infraredImage: frames.infraredImage || frames.infrared || null,
        infrared: frames.infrared || frames.infraredImage || null,
        ultravioletImage: frames.ultravioletImage || frames.ultraviolet || null,
        ultraviolet: frames.ultraviolet || frames.ultravioletImage || null,
        fullSpectrumImage: frames.fullSpectrumImage || frames.fullSpectrum || null,
        fullSpectrum: frames.fullSpectrum || frames.fullSpectrumImage || null,
        polarizedImage: frames.polarizedImage || null,
        nightImage: frames.nightImage || null,
        animalVisionRenders: Array.isArray(frames.animalVisionRenders)
          ? frames.animalVisionRenders.slice()
          : [],
        speciesSimulations: Array.isArray(frames.speciesSimulations)
          ? frames.speciesSimulations.slice()
          : []
      },
      scientificNotes: partial.scientificNotes || partial.scientificExplanation || null,
      scientificExplanation: partial.scientificExplanation || partial.scientificNotes || null,
      photographerNotes: partial.photographerNotes || partial.photographyNotes || null,
      photographyNotes: partial.photographyNotes || partial.photographerNotes || null,
      /**
       * Local media refs only (blob ids / IndexedDB keys). Never remote URLs by default.
       * TODO(ai-analysis): store analysis artifacts beside frames without uploading bytes.
       * TODO(rendering): pipeline hooks for IR/UV/species false-color output.
       */
      localMedia: Array.isArray(partial.localMedia) ? partial.localMedia.slice() : [],
      todos: Array.isArray(partial.todos) ? partial.todos.slice() : [
        "TODO(ai-analysis): attach local analysis results for each frame without uploading bytes.",
        "TODO(rendering): generate species simulation frames via Animal Vision / future HL renderer.",
        "TODO(compare-ui): side-by-side / slider / mode toggle for VisionMode frames."
      ],
      updatedAt: partial.updatedAt || null,
      createdAt: partial.createdAt || null
    };
  }

  function indexById(list) {
    var map = Object.create(null);
    (list || []).forEach(function (item) {
      if (item && item.id) map[item.id] = item;
    });
    return map;
  }

  global.HiddenLandscapesModels = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    createVisionMode: createVisionMode,
    createSpecies: createSpecies,
    createCameraSystem: createCameraSystem,
    createFilter: createFilter,
    createWavelength: createWavelength,
    createImageSet: createImageSet,
    emptyGps: emptyGps,
    emptyWeather: emptyWeather,
    emptyGear: emptyGear,
    emptyFrames: emptyFrames,
    indexById: indexById
  };
})(typeof window !== "undefined" ? window : globalThis);
