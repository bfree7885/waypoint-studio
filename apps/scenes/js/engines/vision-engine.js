/**
 * VisionEngine — shared Scenes interface
 *
 * Prototype implementation lives in Hidden Landscapes Studio:
 * apps/hidden-landscapes/js/hl-vision-engine.js
 *
 * Responsibilities:
 * - loadImage()
 * - renderOriginal()
 * - applyTransformation()
 * - updateIntensity()
 * - reset()
 * - exportImage()
 * - dispose()
 *
 * Creative RGB simulations are not genuine spectral capture.
 */
(function (global) {
  "use strict";

  var VisionEngine = {
    id: "VisionEngine",
    version: "1.0.0",
    status: "delegated",
    note: "Use HiddenLandscapesVision.createVisionEngine({ catalog }) in the Hidden Landscapes Studio.",

    listModes: function () {
      return Promise.resolve([]);
    },

    loadImage: function () {
      return Promise.reject(new Error("VisionEngine.loadImage — open Hidden Landscapes Studio."));
    },

    renderOriginal: function () {
      throw new Error("VisionEngine.renderOriginal — open Hidden Landscapes Studio.");
    },

    applyTransformation: function () {
      return Promise.reject(new Error("VisionEngine.applyTransformation — open Hidden Landscapes Studio."));
    },

    updateIntensity: function () {
      return Promise.reject(new Error("VisionEngine.updateIntensity — open Hidden Landscapes Studio."));
    },

    reset: function () {
      return Promise.resolve();
    },

    exportImage: function () {
      return Promise.reject(new Error("VisionEngine.exportImage — open Hidden Landscapes Studio."));
    },

    dispose: function () {}
  };

  global.WaypointScenesEngines = global.WaypointScenesEngines || {};
  global.WaypointScenesEngines.VisionEngine = VisionEngine;
})(typeof window !== "undefined" ? window : globalThis);
