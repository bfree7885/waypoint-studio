/**
 * Shared image-processing pipeline — stage map stub
 *
 * Stages: ingest → decodeFit → sourceBuffer → applyGraph →
 *         stageBlit → attachHonesty → export → dispose
 *
 * Companion: docs/scenes/imaging-architecture.md
 * Owner review: docs/scenes/create-explore-owner-review.md
 *
 * Implementations today stay in product apps; this module only
 * documents the ordered contract for consolidation.
 */
(function (global) {
  "use strict";

  var STAGES = [
    {
      id: "ingest",
      role: "Accept File, library id, or blob URL; validate size/type",
      reuse: ["hidden-landscapes/hl-vision-engine", "animal-vision-app", "photo-library handoff"]
    },
    {
      id: "decodeFit",
      role: "Decode image; downscale max edge for preview (~1600px)",
      reuse: ["hl-vision-engine createProcessingSource", "animal-vision drawScaled"]
    },
    {
      id: "sourceBuffer",
      role: "Immutable ImageData (or copy) as graph input",
      reuse: ["hl-vision-engine sourceData", "hl-transforms copyImageData"]
    },
    {
      id: "applyGraph",
      role: "Run TransformNodes (Explore) and/or EffectNodes (Create)",
      reuse: ["hl-transforms", "animal-vision-transforms", "waypoint-scenes engine runtime"]
    },
    {
      id: "stageBlit",
      role: "Paint original + result; compare slider/side/toggle",
      reuse: ["hl-studio compare", "animal-vision compare"]
    },
    {
      id: "attachHonesty",
      role: "AccuracyLabel / simulation disclaimer on Explore results",
      reuse: ["transformations.json", "ANIMAL-VISION.md disclaimers"]
    },
    {
      id: "export",
      role: "Local canvas.toBlob download + provenance stub",
      reuse: ["animal-vision-export", "hl-vision-engine exportImage", "WaypointExport.downloadSnapshot"]
    },
    {
      id: "dispose",
      role: "Revoke object URLs; drop canvases; stop RAF",
      reuse: ["all studios (partial today)"]
    }
  ];

  var ImagingPipeline = {
    id: "ScenesImagingPipeline",
    version: "0.0.0",
    status: "interface-only",
    stages: STAGES,

    /** @returns {string[]} ordered stage ids */
    listStageIds: function () {
      return STAGES.map(function (s) {
        return s.id;
      });
    },

    /**
     * Scaffold only — real runs live in product studios.
     * @returns {Promise<never>}
     */
    run: function (/* source, graph, options */) {
      return Promise.reject(
        new Error(
          "ScenesImagingPipeline.run is a scaffold. See docs/scenes/imaging-architecture.md"
        )
      );
    }
  };

  global.WaypointScenesImaging = global.WaypointScenesImaging || {};
  global.WaypointScenesImaging.Pipeline = ImagingPipeline;
})(typeof window !== "undefined" ? window : globalThis);
