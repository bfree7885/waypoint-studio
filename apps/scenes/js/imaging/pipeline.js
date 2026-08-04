/**
 * Shared Scenes processing pipeline — stage map stub
 *
 * Platform stages:
 *   ingest → resolveLibrary → decodeFit → sourceBuffer →
 *   thumbnail | sampleBuffer | applyGraph | analyze | curate →
 *   stageBlit → attachHonesty → export → cachePut → dispose
 *
 * SIE (pixel): applyGraph → stageBlit → honesty → export
 * Analysis: sampleBuffer → analyze
 * Curation: signals → curate
 *
 * Companion: docs/scenes/image-processing-engine.md
 * Owner review: docs/scenes/image-processing-owner-review.md
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
      reuse: ["hl-vision-engine", "animal-vision-app", "photo-coach", "photo-library handoff"]
    },
    {
      id: "resolveLibrary",
      role: "Map libraryId to bytes without forking the catalog",
      reuse: ["photo-library-client", "PhotoLibraryEngine"]
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
      id: "thumbnail",
      role: "Small JPEG/WebP for lists and filmstrips",
      reuse: ["photo-coach-shoot thumb", "photo-library thumb"]
    },
    {
      id: "sampleBuffer",
      role: "Tiny analysis canvas for Coach / scene-analyzer",
      reuse: ["photo-coach-analysis-demo", "scene-analyzer"]
    },
    {
      id: "applyGraph",
      role: "Run TransformNodes (Explore) and/or EffectNodes (Create)",
      reuse: ["hl-transforms", "animal-vision-transforms", "waypoint-scenes engine runtime"]
    },
    {
      id: "analyze",
      role: "Signals → critique / PC2 ReviewDocument",
      reuse: ["photo-coach-analysis-demo", "photo-coach-2 composer"]
    },
    {
      id: "curate",
      role: "Eligibility → weighted draft portfolio",
      reuse: ["builder-engine"]
    },
    {
      id: "stageBlit",
      role: "Paint original + result; compare slider/side/toggle",
      reuse: ["hl-studio compare", "animal-vision compare"]
    },
    {
      id: "attachHonesty",
      role: "AccuracyLabel / on-device / creative-atmosphere labels",
      reuse: ["transformations.json", "ANIMAL-VISION.md", "Coach on-device banner"]
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

    listStageIds: function () {
      return STAGES.map(function (s) {
        return s.id;
      });
    },

    run: function (/* source, graph, options */) {
      return Promise.reject(
        new Error(
          "ScenesImagingPipeline.run is a scaffold. See docs/scenes/image-processing-engine.md"
        )
      );
    }
  };

  global.WaypointScenesImaging = global.WaypointScenesImaging || {};
  global.WaypointScenesImaging.Pipeline = ImagingPipeline;
})(typeof window !== "undefined" ? window : globalThis);
