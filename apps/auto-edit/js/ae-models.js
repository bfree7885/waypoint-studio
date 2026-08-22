/**
 * Waypoint Auto Edit — recipe + edit asset models
 * Non-destructive: originals are never overwritten.
 */
(function (global) {
  "use strict";

  var ENGINE_VERSION = "1.0.0";
  var SCHEMA_VERSION = "1.0.0";

  function uuid(prefix) {
    if (global.crypto && global.crypto.randomUUID) {
      return (prefix || "ae") + "-" + global.crypto.randomUUID();
    }
    return (prefix || "ae") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function emptyAutoEditModuleRef() {
    return {
      hasEdit: false,
      editAssetId: null,
      editBlobKey: null,
      recipeId: null,
      editVersion: 0,
      intent: null,
      createdAt: null,
      engineVersion: null
    };
  }

  /**
   * Persistable edit recipe (not user-facing JSON dump).
   */
  function createRecipe(partial) {
    partial = partial || {};
    return {
      schemaVersion: SCHEMA_VERSION,
      id: partial.id || uuid("recipe"),
      originalAssetId: partial.originalAssetId || null,
      editAssetId: partial.editAssetId || null,
      editVersion: partial.editVersion != null ? partial.editVersion : 1,
      intent: partial.intent || "waypoint-choice",
      ops: Array.isArray(partial.ops) ? partial.ops.slice() : [],
      params: partial.params && typeof partial.params === "object" ? Object.assign({}, partial.params) : {},
      refineStack: Array.isArray(partial.refineStack) ? partial.refineStack.slice() : [],
      cropSuggestion: partial.cropSuggestion || null,
      cropApproved: !!partial.cropApproved,
      signalsSummary: partial.signalsSummary || null,
      honestyNotes: Array.isArray(partial.honestyNotes) ? partial.honestyNotes.slice() : [],
      createdAt: partial.createdAt || new Date().toISOString(),
      updatedAt: partial.updatedAt || new Date().toISOString(),
      engineVersion: partial.engineVersion || ENGINE_VERSION
    };
  }

  function editBlobKey(originalAssetId, version) {
    return "edit-" + String(originalAssetId) + "-v" + String(version || 1);
  }

  function waypointFilename(originalName) {
    var base = String(originalName || "photo.jpg").replace(/\.[^.]+$/, "");
    base = base.replace(/-waypoint$/i, "");
    return base + "-waypoint.jpg";
  }

  global.WaypointAutoEditModels = {
    ENGINE_VERSION: ENGINE_VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    uuid: uuid,
    emptyAutoEditModuleRef: emptyAutoEditModuleRef,
    createRecipe: createRecipe,
    editBlobKey: editBlobKey,
    waypointFilename: waypointFilename
  };
})(typeof window !== "undefined" ? window : globalThis);
