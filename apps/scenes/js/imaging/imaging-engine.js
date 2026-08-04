/**
 * Scenes Imaging Engine (SIE) — facade stub
 *
 * One local-first pixel runtime for Create (Living Scenes atmosphere)
 * and Explore (Hidden Landscapes / Animal Vision transforms).
 *
 * Part of the Scenes Processing Platform (Media Core + SIE + Analysis + Curation).
 * Photo Coach critique and Portfolio Builder drafts are outside this graph —
 * they share Media Core only.
 *
 * Design (platform): docs/scenes/image-processing-engine.md
 * Owner review: docs/scenes/image-processing-owner-review.md
 * Prior Create/Explore companion: docs/scenes/imaging-architecture.md
 *
 * Not a full implementation. Live prototypes remain:
 * - apps/hidden-landscapes/js/hl-vision-engine.js
 * - apps/animal-vision/js/animal-vision-transforms.js
 * - apps/waypoint-scenes/js/engine/
 */
(function (global) {
  "use strict";

  var DOC = "docs/scenes/image-processing-engine.md";

  function notReady(method) {
    return Promise.reject(
      new Error(
        "ScenesImagingEngine." +
          method +
          " is a scaffold only. See " +
          DOC +
          " — use Hidden Landscapes, Animal Vision, or waypoint-scenes engine today."
      )
    );
  }

  function createEngine(/* options */) {
    return {
      id: "ScenesImagingEngine",
      version: "0.0.0",
      status: "interface-only",

      loadSource: function () {
        return notReady("loadSource");
      },

      setGraph: function () {
        return notReady("setGraph");
      },

      setCompareMode: function () {
        return notReady("setCompareMode");
      },

      render: function () {
        return notReady("render");
      },

      updateParam: function () {
        return notReady("updateParam");
      },

      exportFrame: function () {
        return notReady("exportFrame");
      },

      dispose: function () {}
    };
  }

  var ScenesImagingEngine = {
    id: "ScenesImagingEngine",
    version: "0.0.0",
    status: "interface-only",
    doc: DOC,
    createEngine: createEngine
  };

  global.WaypointScenesImaging = global.WaypointScenesImaging || {};
  global.WaypointScenesImaging.Engine = ScenesImagingEngine;

  global.WaypointScenesEngines = global.WaypointScenesEngines || {};
  global.WaypointScenesEngines.ImagingEngine = ScenesImagingEngine;
})(typeof window !== "undefined" ? window : globalThis);
