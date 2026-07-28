/**
 * Photo Coach ← Waypoint Importer extension points (not wired yet).
 *
 * Intentionally local-only contracts. Importer may eventually call
 * WaypointPhotoCoachImporterBridge.receiveSession(...) after a desktop import.
 * Photo Coach must never require the Importer to function.
 */
(function (global) {
  "use strict";

  var PROTOCOL_VERSION = "1.0.0";
  var HANDOFF_KEY = "waypoint-photo-coach-importer-handoff-v1";

  /**
   * Future session payload shape from Waypoint Importer.
   * @typedef {object} ImporterSessionPayload
   * @property {string} protocolVersion
   * @property {string} source  e.g. "waypoint-importer"
   * @property {string} [title]
   * @property {string} [capturedOn] ISO date
   * @property {Array<{
   *   fileName: string,
   *   localPath?: string,
   *   blobUrl?: string,
   *   mimeType?: string,
   *   size?: number,
   *   lastModified?: number,
   *   exif?: object
   * }>} files
   * @property {object} [camera]
   * @property {object} [location]
   * @property {object} [notes]
   */

  function emptyPayload() {
    return {
      protocolVersion: PROTOCOL_VERSION,
      source: "waypoint-importer",
      title: null,
      capturedOn: null,
      files: [],
      camera: null,
      location: null,
      notes: null,
      receivedAt: null
    };
  }

  /**
   * Validate a future Importer handoff without analyzing.
   * @returns {{ ok: boolean, errors: string[], payload: object|null }}
   */
  function validatePayload(raw) {
    var errors = [];
    if (!raw || typeof raw !== "object") {
      return { ok: false, errors: ["Payload missing."], payload: null };
    }
    if (raw.protocolVersion && String(raw.protocolVersion).split(".")[0] !== "1") {
      errors.push("Unsupported protocolVersion.");
    }
    if (!Array.isArray(raw.files) || !raw.files.length) {
      errors.push("files[] must contain at least one entry.");
    } else {
      raw.files.forEach(function (f, i) {
        if (!f || !f.fileName) errors.push("files[" + i + "] needs fileName.");
      });
    }
    return { ok: !errors.length, errors: errors, payload: raw };
  }

  /**
   * Stage a handoff payload in sessionStorage for a future Page load.
   * Does not start analysis in Work Block 3.
   */
  function stageHandoff(payload) {
    var check = validatePayload(payload);
    if (!check.ok) return check;
    try {
      var staged = Object.assign({}, payload, { receivedAt: new Date().toISOString() });
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(staged));
      return { ok: true, errors: [], payload: staged };
    } catch (e) {
      return { ok: false, errors: ["Could not stage handoff locally."], payload: null };
    }
  }

  function peekHandoff() {
    try {
      var raw = sessionStorage.getItem(HANDOFF_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearHandoff() {
    try { sessionStorage.removeItem(HANDOFF_KEY); } catch (e) { /* ignore */ }
  }

  /**
   * Future entry: convert staged File-like refs into a coach ingest.
   * Official publish path is photo_pipeline → review UI → data/media (not this bridge).
   * Stub — returns not-implemented until Importer supplies real File/Blob objects.
   */
  function receiveSession(payload) {
    var check = validatePayload(payload);
    if (!check.ok) return Promise.reject(new Error(check.errors.join(" ")));
    return Promise.resolve({
      status: "not-implemented",
      message: "Importer → Photo Coach ingest is reserved. Use photo_pipeline review for website media. Stage handoff with stageHandoff() for future Coach File blobs.",
      protocolVersion: PROTOCOL_VERSION,
      related: "apps/photo-pipeline/ + python -m photo_pipeline"
    });
  }

  global.WaypointPhotoCoachImporterBridge = {
    PROTOCOL_VERSION: PROTOCOL_VERSION,
    HANDOFF_KEY: HANDOFF_KEY,
    emptyPayload: emptyPayload,
    validatePayload: validatePayload,
    stageHandoff: stageHandoff,
    peekHandoff: peekHandoff,
    clearHandoff: clearHandoff,
    receiveSession: receiveSession
  };
})(typeof window !== "undefined" ? window : globalThis);
