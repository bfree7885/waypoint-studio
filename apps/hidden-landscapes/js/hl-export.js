/**
 * Hidden Landscapes — local export with epistemic labels burned in
 */
(function (global) {
  "use strict";

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "hidden-landscapes.jpg";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /**
   * Export visualization with a visible label strip so SIMULATED / UNAVAILABLE
   * caveats travel with the file.
   */
  function exportLabeled(sourceCanvas, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      if (!sourceCanvas || !sourceCanvas.width) {
        reject(new Error("Nothing to export."));
        return;
      }
      var Models = global.WaypointHLModels;
      var label = options.label || "COMPUTED VISUALIZATION";
      var filename = options.filename ||
        (Models ? Models.exportBasename(options.baseName, options.viewId, options.epistemic) : "hidden-landscapes.jpg");

      var pad = Math.max(28, Math.round(sourceCanvas.width * 0.04));
      var canvas = document.createElement("canvas");
      canvas.width = sourceCanvas.width;
      canvas.height = sourceCanvas.height + pad;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#1a1c18";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sourceCanvas, 0, 0);
      ctx.fillStyle = "#e8e6df";
      ctx.font = Math.max(12, Math.round(pad * 0.42)) + "px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 12, sourceCanvas.height + pad / 2);

      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error("Export failed."));
          return;
        }
        downloadBlob(blob, filename);
        resolve({ filename: filename, bytes: blob.size, label: label });
      }, "image/jpeg", 0.92);
    });
  }

  global.WaypointHLExport = {
    exportLabeled: exportLabeled,
    downloadBlob: downloadBlob
  };
})(typeof window !== "undefined" ? window : globalThis);
