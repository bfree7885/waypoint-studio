/**
 * VisionEngine — interface scaffold
 *
 * Owns beyond-human vision modes: infrared, ultraviolet, full spectrum,
 * polarization, night, and species simulations for Hidden Landscapes.
 *
 * TODO: register VisionMode pipelines (local rendering only by default)
 * TODO: integrate Animal Vision transforms as a SpeciesVision provider
 * TODO: accept ImageSet frames without uploading bytes
 * TODO(ai-analysis): optional on-device explanations per mode
 */
(function (global) {
  "use strict";

  var VisionEngine = {
    id: "VisionEngine",
    version: "0.0.0",
    status: "interface-only",

    listModes: function () {
      // TODO: load from Hidden Landscapes vision-modes catalog
      return Promise.resolve([]);
    },

    /** @returns {Promise<object>} rendered frame metadata + local blob ref */
    renderMode: function (/* imageRef, modeId, options */) {
      // TODO: dispatch to mode-specific renderer
      return Promise.reject(new Error("VisionEngine.renderMode is not implemented."));
    },

    /** @returns {Promise<object>} */
    simulateSpecies: function (/* imageRef, speciesId */) {
      // TODO: delegate to Animal Vision / future HL renderer
      return Promise.reject(new Error("VisionEngine.simulateSpecies is not implemented."));
    }
  };

  global.WaypointScenesEngines = global.WaypointScenesEngines || {};
  global.WaypointScenesEngines.VisionEngine = VisionEngine;
})(typeof window !== "undefined" ? window : globalThis);
