/**
 * Waypoint Auto Edit — pipeline orchestration
 */
(function (global) {
  "use strict";

  function loadImageElement(fileOrUrl) {
    return new Promise(function (resolve, reject) {
      var url = typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl);
      var img = new Image();
      img.onload = function () {
        resolve({ img: img, url: typeof fileOrUrl === "string" ? null : url, revoke: typeof fileOrUrl !== "string" });
      };
      img.onerror = function () {
        if (typeof fileOrUrl !== "string") {
          try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        }
        reject(new Error("Could not decode this photograph."));
      };
      img.src = url;
    });
  }

  function drawToImageData(img, maxEdge) {
    maxEdge = maxEdge || 2400;
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, maxEdge / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cw, ch);
    return { canvas: canvas, ctx: ctx, imageData: ctx.getImageData(0, 0, cw, ch), width: cw, height: ch };
  }

  function imageDataToBlob(imageData, quality) {
    quality = quality == null ? 0.92 : quality;
    return new Promise(function (resolve, reject) {
      var canvas = document.createElement("canvas");
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext("2d").putImageData(imageData, 0, 0);
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error("Export failed."));
        else resolve(blob);
      }, "image/jpeg", quality);
    });
  }

  /**
   * Full finish pass.
   * @returns {Promise<object>}
   */
  function process(file, options) {
    options = options || {};
    var intent = options.intent || "waypoint-choice";
    var Signals = global.WaypointAutoEditSignals;
    var Strategy = global.WaypointAutoEditStrategy;
    var Ops = global.WaypointAutoEditOps;
    var Restraint = global.WaypointAutoEditRestraint;
    var Models = global.WaypointAutoEditModels;

    return loadImageElement(file).then(function (loaded) {
      var previewMax = options.preview ? 1280 : 2400;
      var drawn = drawToImageData(loaded.img, previewMax);
      var signals = Signals.analyze(drawn.imageData, {
        exif: options.exif || null,
        coachObservations: options.coachObservations || null,
        outdoor: options.outdoor || null
      });
      var strategy = options.strategyOverride || Strategy.buildStrategy(signals, intent);
      if (options.refineId && options.refineId !== "reset") {
        strategy = Strategy.applyRefine(strategy, options.refineId) || Strategy.buildStrategy(signals, "waypoint-choice");
      }
      if (options.refineId === "reset") {
        strategy = Strategy.buildStrategy(signals, "waypoint-choice");
      }

      var beforeClip = Signals.measureClipping(drawn.imageData);
      var edited = Ops.applyOps(drawn.imageData, strategy.ops, signals);
      var afterClip = Signals.measureClipping(edited);
      var honesty = Restraint.honestyNotes(signals, beforeClip, afterClip);

      // Subject-aware: DEFER — no fake local subject edits in V1
      honesty.push("Subject-aware local edits are deferred until detection is reliable on-device.");

      var recipe = Models.createRecipe({
        originalAssetId: options.originalAssetId || null,
        editVersion: options.editVersion || 1,
        intent: strategy.intent,
        ops: strategy.ops,
        params: { doLess: strategy.doLess, summary: strategy.summary },
        refineStack: options.refineStack || (options.refineId ? [options.refineId] : []),
        cropSuggestion: strategy.cropSuggestion,
        cropApproved: !!options.cropApproved,
        signalsSummary: {
          meanLuminance: signals.meanLuminance,
          contrast: signals.contrast,
          alreadyGood: signals.alreadyGood,
          clipHigh: signals.clipHigh,
          clipLow: signals.clipLow,
          sceneHints: signals.sceneHints
        },
        honestyNotes: honesty
      });

      return imageDataToBlob(edited, options.preview ? 0.82 : 0.92).then(function (blob) {
        if (loaded.revoke && loaded.url) {
          try { URL.revokeObjectURL(loaded.url); } catch (e) { /* ignore */ }
        }
        return {
          recipe: recipe,
          strategy: strategy,
          signals: signals,
          editedBlob: blob,
          editedImageData: edited,
          originalImageData: drawn.imageData,
          width: drawn.width,
          height: drawn.height,
          honestyNotes: honesty,
          beforeClip: beforeClip,
          afterClip: afterClip
        };
      });
    });
  }

  global.WaypointAutoEditPipeline = {
    loadImageElement: loadImageElement,
    drawToImageData: drawToImageData,
    imageDataToBlob: imageDataToBlob,
    process: process
  };
})(typeof window !== "undefined" ? window : globalThis);
