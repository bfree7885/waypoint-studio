/**
 * Scenes Media Core — pointer stub
 *
 * Shared ingest / decodeFit / thumbnail / sampleBuffer / dispose
 * for Photo Coach, Hidden Landscapes, Animal Vision, Living Scenes,
 * and Portfolio Builder thumbs.
 *
 * Design: docs/scenes/image-processing-engine.md
 * Owner review: docs/scenes/image-processing-owner-review.md
 * Prior SIE (Create/Explore pixels): docs/scenes/imaging-architecture.md
 *   (on branch docs/scenes-create-explore-architecture until merged)
 *
 * Not a full implementation. Live decode paths remain in product apps.
 */
(function (global) {
  "use strict";

  var DOC = "docs/scenes/image-processing-engine.md";

  function notReady(method) {
    return Promise.reject(
      new Error(
        "ScenesMediaCore." + method + " is a scaffold only. See " + DOC
      )
    );
  }

  var ScenesMediaCore = {
    id: "ScenesMediaCore",
    version: "0.0.0",
    status: "interface-only",
    doc: DOC,

    ingest: function () {
      return notReady("ingest");
    },
    resolveLibrary: function () {
      return notReady("resolveLibrary");
    },
    decodeFit: function () {
      return notReady("decodeFit");
    },
    makeThumbnail: function () {
      return notReady("makeThumbnail");
    },
    makeSample: function () {
      return notReady("makeSample");
    },
    dispose: function () {}
  };

  global.WaypointScenesImaging = global.WaypointScenesImaging || {};
  global.WaypointScenesImaging.MediaCore = ScenesMediaCore;
})(typeof window !== "undefined" ? window : globalThis);
