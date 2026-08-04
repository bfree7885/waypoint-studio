/**
 * Scenes Remember pillar — shared data model (foundation).
 * No AI, no cloud sync, no full journal UX. Schema + helpers only.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = "1.0.0";
  var STORAGE_KEY = "waypoint-scenes-remember-docs-v1";

  var ARTIFACT_TYPES = [
    "outdoor-journal",
    "hiking-journal",
    "wildlife-journal",
    "mushroom-journal",
    "year-in-nature",
    "calendar",
    "book"
  ];

  var DOCUMENT_STATUSES = ["draft", "ready", "archived"];
  var PRINT_FORMATS = ["letter", "a4", "square", "calendar-wall", "photo-book"];
  var PRINT_ORIENTATIONS = ["portrait", "landscape"];

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return (prefix || "rem") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function isArtifactType(type) {
    return ARTIFACT_TYPES.indexOf(type) !== -1;
  }

  function isDocumentStatus(status) {
    return DOCUMENT_STATUSES.indexOf(status) !== -1;
  }

  /**
   * @typedef {Object} RememberPhotoRef
   * @property {string} id
   * @property {string} [libraryId]
   * @property {string} [localPath]
   * @property {string} [caption]
   */

  /**
   * @typedef {Object} RememberSection
   * @property {string} id
   * @property {string} title
   * @property {string} [body]
   * @property {RememberPhotoRef[]} [photoRefs]
   */

  /**
   * @typedef {Object} RememberPrintPrefs
   * @property {string} format
   * @property {string} orientation
   * @property {boolean} [includeCaptions]
   */

  /**
   * @typedef {Object} RememberDocument
   * @property {string} id
   * @property {string} schemaVersion
   * @property {string} type
   * @property {string} title
   * @property {string} status
   * @property {string} createdAt
   * @property {string} updatedAt
   * @property {RememberPhotoRef[]} photoRefs
   * @property {RememberSection[]} sections
   * @property {RememberPrintPrefs} print
   * @property {Object} [meta]
   */

  function createDocument(options) {
    var opts = options || {};
    var type = opts.type || "outdoor-journal";
    if (!isArtifactType(type)) {
      throw new Error("Unknown Remember artifact type: " + type);
    }
    var status = opts.status || "draft";
    if (!isDocumentStatus(status)) {
      throw new Error("Unknown Remember document status: " + status);
    }
    var stamp = nowIso();
    return {
      id: opts.id || uid("doc"),
      schemaVersion: SCHEMA_VERSION,
      type: type,
      title: opts.title || "Untitled",
      status: status,
      createdAt: opts.createdAt || stamp,
      updatedAt: opts.updatedAt || stamp,
      photoRefs: Array.isArray(opts.photoRefs) ? opts.photoRefs.slice() : [],
      sections: Array.isArray(opts.sections) ? opts.sections.slice() : [],
      print: {
        format: (opts.print && opts.print.format) || "letter",
        orientation: (opts.print && opts.print.orientation) || "portrait",
        includeCaptions: !!(opts.print && opts.print.includeCaptions)
      },
      meta: opts.meta && typeof opts.meta === "object" ? Object.assign({}, opts.meta) : {}
    };
  }

  function validateDocument(doc) {
    var errors = [];
    if (!doc || typeof doc !== "object") {
      return { ok: false, errors: ["document is required"] };
    }
    if (!doc.id) errors.push("id required");
    if (!isArtifactType(doc.type)) errors.push("invalid type");
    if (!isDocumentStatus(doc.status)) errors.push("invalid status");
    if (!doc.title || typeof doc.title !== "string") errors.push("title required");
    if (!Array.isArray(doc.photoRefs)) errors.push("photoRefs must be an array");
    if (!Array.isArray(doc.sections)) errors.push("sections must be an array");
    if (!doc.print || PRINT_FORMATS.indexOf(doc.print.format) === -1) {
      errors.push("print.format invalid");
    }
    if (!doc.print || PRINT_ORIENTATIONS.indexOf(doc.print.orientation) === -1) {
      errors.push("print.orientation invalid");
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function listFromStorage() {
    try {
      if (typeof localStorage === "undefined") return [];
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveToStorage(docs) {
    if (typeof localStorage === "undefined") {
      return { ok: false, reason: "localStorage unavailable" };
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs || []));
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }

  function catalogTypes() {
    return ARTIFACT_TYPES.slice();
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    STORAGE_KEY: STORAGE_KEY,
    ARTIFACT_TYPES: ARTIFACT_TYPES,
    DOCUMENT_STATUSES: DOCUMENT_STATUSES,
    PRINT_FORMATS: PRINT_FORMATS,
    PRINT_ORIENTATIONS: PRINT_ORIENTATIONS,
    createDocument: createDocument,
    validateDocument: validateDocument,
    listFromStorage: listFromStorage,
    saveToStorage: saveToStorage,
    catalogTypes: catalogTypes,
    isArtifactType: isArtifactType,
    isDocumentStatus: isDocumentStatus
  };

  global.WaypointScenesRemember = global.WaypointScenesRemember || {};
  global.WaypointScenesRemember.model = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
