/**
 * Hidden Landscapes — VisionEngine (local canvas prototype)
 *
 * loadImage · renderOriginal · applyTransformation · updateIntensity
 * reset · exportImage · dispose
 *
 * Creative simulations only unless future specialized captures are supplied.
 */
(function (global) {
  "use strict";

  var MAX_PROCESS_EDGE = 1600;
  var MAX_FILE_BYTES = 28 * 1024 * 1024;
  var ACCEPTED = /^image\/(jpeg|jpg|png|webp|gif|bmp)$/i;

  function VisionEngineError(code, message) {
    var err = new Error(message);
    err.code = code;
    err.name = "VisionEngineError";
    return err;
  }

  function createVisionEngine(options) {
    options = options || {};
    var maxEdge = options.maxProcessEdge || MAX_PROCESS_EDGE;
    var catalog = options.catalog || { transformations: [] };
    var byId = Object.create(null);
    (catalog.transformations || []).forEach(function (t) {
      byId[t.id] = t;
    });

    var state = {
      file: null,
      fileName: "",
      objectUrl: null,
      image: null,
      sourceData: null,
      modeId: "original",
      intensity: 1,
      originalCanvas: null,
      resultCanvas: null,
      processing: false
    };

    function ensureCanvasSize(canvas, w, h) {
      if (!canvas) return null;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      return canvas;
    }

    function ensureCanvases(w, h) {
      if (!state.originalCanvas) state.originalCanvas = document.createElement("canvas");
      if (!state.resultCanvas) state.resultCanvas = document.createElement("canvas");
      // Only resize when dimensions change — assigning width/height clears pixels.
      ensureCanvasSize(state.originalCanvas, w, h);
      ensureCanvasSize(state.resultCanvas, w, h);
    }

    function drawSourceToOriginal() {
      if (!state.sourceData) return;
      if (!state.originalCanvas) state.originalCanvas = document.createElement("canvas");
      // Never touch resultCanvas here; resizing it would wipe the latest transform.
      ensureCanvasSize(state.originalCanvas, state.sourceData.width, state.sourceData.height);
      var ctx = state.originalCanvas.getContext("2d", { willReadFrequently: true });
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(state.sourceData.data), state.sourceData.width, state.sourceData.height),
        0,
        0
      );
    }

    function decodeFile(file) {
      if (!file) return Promise.reject(VisionEngineError("empty", "No file selected."));
      if (!file.size) return Promise.reject(VisionEngineError("empty", "That file is empty."));
      if (file.size > MAX_FILE_BYTES) {
        return Promise.reject(VisionEngineError("too-large", "Image is too large to process in the browser (max about 28 MB)."));
      }
      var type = file.type || "";
      if (type && !ACCEPTED.test(type)) {
        if (type.indexOf("image/") !== 0) {
          return Promise.reject(VisionEngineError("unsupported", "Unsupported format. Try JPEG or PNG."));
        }
        // Unknown image/* types: attempt decode; fail clearly if the browser cannot read them.
      }

      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            if (!w || !h) {
              URL.revokeObjectURL(url);
              reject(VisionEngineError("corrupt", "Could not read image dimensions."));
              return;
            }
            var scale = 1;
            if (Math.max(w, h) > maxEdge) scale = maxEdge / Math.max(w, h);
            var cw = Math.max(1, Math.round(w * scale));
            var ch = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement("canvas");
            canvas.width = cw;
            canvas.height = ch;
            var ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, cw, ch);
            var imageData = ctx.getImageData(0, 0, cw, ch);
            resolve({
              objectUrl: url,
              image: img,
              sourceData: {
                data: new Uint8ClampedArray(imageData.data),
                width: cw,
                height: ch
              },
              naturalWidth: w,
              naturalHeight: h,
              processWidth: cw,
              processHeight: ch
            });
          } catch (e) {
            URL.revokeObjectURL(url);
            reject(VisionEngineError("process-fail", "Browser could not process this image."));
          }
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(VisionEngineError("unsupported", "Could not decode this image. Convert to JPEG or PNG and try again."));
        };
        img.src = url;
      });
    }

    function loadImage(file) {
      return decodeFile(file).then(function (decoded) {
        disposeMediaOnly();
        state.file = file;
        state.fileName = file.name || "photograph";
        state.objectUrl = decoded.objectUrl;
        state.image = decoded.image;
        state.sourceData = decoded.sourceData;
        state.modeId = "original";
        var mode = byId.original;
        state.intensity = mode && mode.defaultIntensity != null ? mode.defaultIntensity : 1;
        drawSourceToOriginal();
        return {
          fileName: state.fileName,
          naturalWidth: decoded.naturalWidth,
          naturalHeight: decoded.naturalHeight,
          processWidth: decoded.processWidth,
          processHeight: decoded.processHeight
        };
      });
    }

    function renderOriginal(targetCanvas) {
      if (!state.sourceData) throw VisionEngineError("empty", "Upload a photograph first.");
      drawSourceToOriginal();
      if (targetCanvas) {
        targetCanvas.width = state.originalCanvas.width;
        targetCanvas.height = state.originalCanvas.height;
        targetCanvas.getContext("2d").drawImage(state.originalCanvas, 0, 0);
      }
      return state.originalCanvas;
    }

    function applyTransformation(modeId, intensity) {
      if (!state.sourceData) {
        return Promise.reject(VisionEngineError("empty", "Upload a photograph first."));
      }
      if (!global.HiddenLandscapesTransforms) {
        return Promise.reject(VisionEngineError("process-fail", "Transform module missing."));
      }
      var mode = byId[modeId] || byId.original;
      if (!mode) {
        return Promise.reject(VisionEngineError("process-fail", "Unknown transformation."));
      }
      state.modeId = mode.id;
      if (intensity != null) state.intensity = intensity;
      else if (mode.defaultIntensity != null) state.intensity = mode.defaultIntensity;

      state.processing = true;
      return new Promise(function (resolve, reject) {
        // Yield so the UI can show status before heavy pixel work.
        setTimeout(function () {
          try {
            var result = HiddenLandscapesTransforms.process(
              mode.id,
              state.sourceData,
              state.intensity,
              mode.processingParameters || {}
            );
            ensureCanvases(result.width, result.height);
            var ctx = state.resultCanvas.getContext("2d", { willReadFrequently: true });
            ctx.putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
            drawSourceToOriginal();
            state.processing = false;
            resolve({
              modeId: state.modeId,
              intensity: state.intensity,
              canvas: state.resultCanvas,
              mode: mode
            });
          } catch (e) {
            state.processing = false;
            reject(VisionEngineError("process-fail", "Processing failed. Try a smaller JPEG or PNG."));
          }
        }, 16);
      });
    }

    function updateIntensity(intensity) {
      return applyTransformation(state.modeId, intensity);
    }

    function reset() {
      dispose();
      return Promise.resolve();
    }

    function exportImage(opts) {
      opts = opts || {};
      var canvas = state.modeId === "original" ? state.originalCanvas : state.resultCanvas;
      if (!canvas || !canvas.width) {
        return Promise.reject(VisionEngineError("export-fail", "Nothing to export yet."));
      }
      var mime = opts.format === "png" ? "image/png" : "image/jpeg";
      var quality = opts.quality == null ? 0.92 : opts.quality;
      var base = String(state.fileName || "landscape")
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[^a-z0-9]+/gi, "_")
        .slice(0, 40) || "landscape";
      var filename = base + "_hidden-landscapes_" + (state.modeId || "preview") + (mime === "image/png" ? ".png" : ".jpg");

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(VisionEngineError("export-fail", "Export failed in this browser."));
            return;
          }
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
          resolve({ filename: filename, bytes: blob.size, mime: mime });
        }, mime, quality);
      });
    }

    function disposeMediaOnly() {
      if (state.objectUrl) {
        try { URL.revokeObjectURL(state.objectUrl); } catch (e) { /* ignore */ }
      }
      state.objectUrl = null;
      state.image = null;
      state.file = null;
      state.sourceData = null;
    }

    function dispose() {
      disposeMediaOnly();
      state.modeId = "original";
      state.intensity = 1;
      state.fileName = "";
      if (state.originalCanvas) {
        state.originalCanvas.width = 0;
        state.originalCanvas.height = 0;
      }
      if (state.resultCanvas) {
        state.resultCanvas.width = 0;
        state.resultCanvas.height = 0;
      }
    }

    function getState() {
      return {
        hasImage: !!state.sourceData,
        modeId: state.modeId,
        intensity: state.intensity,
        fileName: state.fileName,
        processing: state.processing,
        originalCanvas: state.originalCanvas,
        resultCanvas: state.resultCanvas,
        mode: byId[state.modeId] || null
      };
    }

    function listModes() {
      return (catalog.transformations || []).slice();
    }

    return {
      id: "VisionEngine",
      version: "1.0.0",
      status: "prototype",
      loadImage: loadImage,
      createProcessingSource: loadImage,
      renderOriginal: renderOriginal,
      applyTransformation: applyTransformation,
      updateIntensity: updateIntensity,
      renderComparison: getState,
      reset: reset,
      exportImage: exportImage,
      dispose: dispose,
      getState: getState,
      listModes: listModes,
      MAX_PROCESS_EDGE: maxEdge,
      MAX_FILE_BYTES: MAX_FILE_BYTES
    };
  }

  global.HiddenLandscapesVision = {
    createVisionEngine: createVisionEngine,
    VisionEngineError: VisionEngineError
  };

  // Shared Scenes registry pointer when present
  global.WaypointScenesEngines = global.WaypointScenesEngines || {};
  global.WaypointScenesEngines.VisionEngineFactory = createVisionEngine;
})(typeof window !== "undefined" ? window : globalThis);
