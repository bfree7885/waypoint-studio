/**
 * Waypoint Moving Scenes — analyze → choice → prepare pipeline
 */
(function (global) {
  "use strict";

  function Models() { return global.WaypointMovingScenesModels; }
  function Analyze() { return global.WaypointMovingScenesAnalyze; }
  function Choice() { return global.WaypointMovingScenesChoice; }
  function Render() { return global.WaypointMovingScenesRender; }

  function maskHasInclude(userMask) {
    var data = userMask && userMask.data ? userMask.data : userMask;
    if (!data || !data.length) return false;
    var i;
    for (i = 0; i < data.length; i++) {
      if (data[i] > 0.04) return true;
    }
    return false;
  }

  function process(blob, options) {
    options = options || {};
    return Render().loadImage(blob).then(function (img) {
      var analysis = Analyze().analyzeSource(img);
      var choice = Choice().choose(analysis, {
        threshold: options.threshold
      });

      // Apply user overrides
      if (options.forceClasses && options.forceClasses.length) {
        choice.classes = options.forceClasses.slice();
        choice.noMotion = choice.classes.length === 0;
        choice.selected = choice.classes.map(function (id) {
          return { id: id, label: (Models().CLASS_META[id] || {}).label || id, confidence: 1 };
        });
        choice.summary = choice.noMotion ? "No motion" : choice.classes.join(" · ");
      }
      if (options.strength) choice.strength = options.strength;
      if (options.directionDeg != null) choice.directionDeg = options.directionDeg;
      if (options.durationSec) choice.durationSec = options.durationSec;
      if (options.userClearedMotion) {
        choice.classes = [];
        choice.noMotion = true;
        choice.summary = "No motion";
        choice.honestyNotes = ["Motion cleared — photograph stays still."];
      }
      if (options.userMaskDirty && maskHasInclude(options.userMask)) {
        choice.noMotion = false;
        if (!choice.classes.length) {
          choice.summary = "Motion from assist brush";
          choice.honestyNotes = ["Motion comes from regions you painted — not automatic detection."];
        }
      }

      var recipe = Models().createRecipe({
        originalAssetId: options.originalAssetId || null,
        sourceAssetId: options.sourceAssetId || options.originalAssetId || null,
        sourceRole: options.sourceRole || "original",
        classes: choice.classes,
        strength: choice.strength,
        directionDeg: choice.directionDeg,
        durationSec: choice.durationSec,
        confidence: analysis.confidence,
        waypointChoice: {
          summary: choice.summary,
          threshold: choice.threshold,
          selected: choice.selected,
          deferred: choice.deferred
        },
        userAssist: {
          brushApplied: !!(options.userMask && options.userMaskDirty)
        },
        noMotion: choice.noMotion,
        honestyNotes: choice.honestyNotes
      });

      return {
        image: img,
        analysis: analysis,
        choice: choice,
        recipe: recipe,
        honestyNotes: choice.honestyNotes
      };
    });
  }

  global.WaypointMovingScenesPipeline = {
    process: process
  };
})(typeof window !== "undefined" ? window : globalThis);
