/**
 * Animal Vision — local export (JPEG / PNG). Never uploads.
 */
(function (global) {
  "use strict";

  function slugify(name) {
    return String(name || "photo")
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "photo";
  }

  function buildFilename(baseName, speciesSlug, ext) {
    return slugify(baseName) + "_" + slugify(speciesSlug || "interpretation") + "_interpretation." + (ext || "jpg");
  }

  function downloadCanvas(canvas, filename, mime, quality) {
    return new Promise(function (resolve, reject) {
      if (!canvas || !canvas.width) {
        reject(new Error("Nothing to export."));
        return;
      }
      mime = mime || "image/jpeg";
      quality = quality == null ? 0.92 : quality;
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error("Export failed."));
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

  function exportInterpretation(canvas, options) {
    options = options || {};
    var format = (options.format || "jpeg").toLowerCase();
    var mime = format === "png" ? "image/png" : "image/jpeg";
    var ext = format === "png" ? "png" : "jpg";
    var filename = options.filename || buildFilename(options.baseName, options.speciesSlug, ext);
    return downloadCanvas(canvas, filename, mime, options.quality);
  }

  global.WaypointAnimalVision = global.WaypointAnimalVision || {};
  global.WaypointAnimalVision.export = {
    exportInterpretation: exportInterpretation,
    buildFilename: buildFilename,
    slugify: slugify
  };
})(typeof window !== "undefined" ? window : globalThis);
