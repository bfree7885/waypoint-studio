/**
 * WOS app extensions — each product may attach namespaced extension data
 * without modifying the core observation schema.
 *
 * Core observation stays in WDS.observations.
 * Extensions live under observation.extensions[<appId>] (runtime only)
 * or are stored alongside in app-specific stores that reference observation ids.
 */
(function (global) {
  "use strict";

  var EXTENSION_VERSION = "1.0.0";

  function ensureExtensions(obs) {
    if (!obs || typeof obs !== "object") return obs;
    if (!obs.extensions || typeof obs.extensions !== "object") {
      obs.extensions = {};
    }
    return obs;
  }

  function setExtension(obs, appId, payload) {
    ensureExtensions(obs);
    obs.extensions[appId] = Object.assign({
      schemaVersion: EXTENSION_VERSION,
      updatedAt: new Date().toISOString()
    }, payload || {});
    return obs;
  }

  function getExtension(obs, appId) {
    if (!obs || !obs.extensions) return null;
    return obs.extensions[appId] || null;
  }

  /**
   * Lightweight observation envelope used when an app needs a shared
   * cross-product record before full WOS capture is available.
   */
  function createEnvelope(partial) {
    partial = partial || {};
    var Obs = global.WDS && global.WDS.observations;
    var id = Obs && Obs.generateId ? Obs.generateId("obs") : "obs_local";
    return {
      id: partial.id || id,
      application: partial.application || "waypoint-studio",
      observationType: partial.observationType || "general",
      timestamp: partial.timestamp || new Date().toISOString(),
      location: partial.location || null,
      privacy: partial.privacy || "private",
      environmentalContext: partial.environmentalContext || null,
      media: partial.media || [],
      tags: partial.tags || [],
      notes: partial.notes || null,
      aiMetadata: partial.aiMetadata
        ? Object.assign({ labeledAsAi: true }, partial.aiMetadata)
        : null,
      confidence: partial.confidence || null,
      licensing: partial.licensing || "waypoint-private",
      syncState: partial.syncState || "local-only",
      extensions: partial.extensions || {}
    };
  }

  var PRIVACY_LEVELS = Object.freeze([
    "private",
    "shared",
    "public",
    "anonymized"
  ]);

  global.WDS = global.WDS || {};
  global.WDS.observations = global.WDS.observations || {};
  global.WDS.observations.extensions = {
    EXTENSION_VERSION: EXTENSION_VERSION,
    PRIVACY_LEVELS: PRIVACY_LEVELS,
    ensureExtensions: ensureExtensions,
    setExtension: setExtension,
    getExtension: getExtension,
    createEnvelope: createEnvelope
  };
})(typeof window !== "undefined" ? window : global);
