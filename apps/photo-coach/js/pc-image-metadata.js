/**
 * Photo Coach — capture metadata from file and optional EXIF.
 */
(function (global) {
  "use strict";

  function orientationLabel(w, h) {
    if (!w || !h) return "unknown";
    if (w > h * 1.15) return "landscape";
    if (h > w * 1.15) return "portrait";
    return "square";
  }

  function readFromImage(loadResult, exif) {
    loadResult = loadResult || {};
    exif = exif || {};
    var meta = {
      filename: loadResult.file && loadResult.file.name ? loadResult.file.name : null,
      mimeType: loadResult.file && loadResult.file.type ? loadResult.file.type : null,
      fileSizeBytes: loadResult.file ? loadResult.file.size : null,
      width: loadResult.width,
      height: loadResult.height,
      megapixels: loadResult.width && loadResult.height
        ? Math.round((loadResult.width * loadResult.height) / 100000) / 10
        : null,
      orientation: orientationLabel(loadResult.width, loadResult.height),
      exifSource: exif.hasExif ? "embedded" : "none",
      camera: null,
      iso: null,
      focalLengthMm: null,
      exposureTimeSec: null,
      fNumber: null,
      capturedAt: null
    };

    if (exif.hasExif) {
      meta.camera = [exif.make, exif.model].filter(Boolean).join(" ") || null;
      meta.iso = exif.iso != null ? exif.iso : null;
      meta.focalLengthMm = exif.focalLengthMm != null ? exif.focalLengthMm : null;
      meta.exposureTimeSec = exif.exposureTimeSec != null ? exif.exposureTimeSec : null;
      meta.fNumber = exif.fNumber != null ? exif.fNumber : null;
      meta.capturedAt = exif.dateTime || null;
    }

    return meta;
  }

  function readExif(file) {
    var Reader = global.WaypointExifReader;
    if (Reader && Reader.readFromFile) {
      return Reader.readFromFile(file).catch(function () {
        return { hasExif: false };
      });
    }
    return Promise.resolve({ hasExif: false });
  }

  function collect(loadResult) {
    return readExif(loadResult.file).then(function (exif) {
      return {
        exif: exif,
        metadata: readFromImage(loadResult, exif)
      };
    });
  }

  global.PhotoCoachImageMetadata = {
    readFromImage: readFromImage,
    collect: collect
  };
})(window);
