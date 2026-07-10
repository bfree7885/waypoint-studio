/**
 * Photo Coach — image file loading and validation.
 */
(function (global) {
  "use strict";

  var MAX_BYTES = 25 * 1024 * 1024;
  var MAX_EDGE = 12000;
  var ALLOWED = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"]
  };

  function extension(name) {
    var m = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
    return m ? m[0] : "";
  }

  function validateFile(file) {
    if (!file) return { ok: false, message: "No file selected." };
    if (!ALLOWED[file.type]) {
      return { ok: false, message: "Please upload a JPEG or PNG image." };
    }
    var ext = extension(file.name);
    var allowedExt = ALLOWED[file.type];
    if (allowedExt.indexOf(ext) < 0 && file.type === "image/jpeg" && ext !== ".jpg" && ext !== ".jpeg") {
      return { ok: false, message: "File extension does not match a JPEG or PNG image." };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, message: "Image is too large. Please use a file under 25 MB." };
    }
    if (!file.size) {
      return { ok: false, message: "That file appears to be empty." };
    }
    return { ok: true };
  }

  function loadImage(file) {
    var check = validateFile(file);
    if (!check.ok) return Promise.reject(new Error(check.message));

    var url = URL.createObjectURL(file);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not read image dimensions."));
          return;
        }
        if (w > MAX_EDGE || h > MAX_EDGE) {
          URL.revokeObjectURL(url);
          reject(new Error("Image dimensions are too large for in-browser analysis."));
          return;
        }
        resolve({
          file: file,
          url: url,
          width: w,
          height: h,
          revoke: function () {
            if (url) URL.revokeObjectURL(url);
          }
        });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not load this image. The file may be corrupted."));
      };
      img.src = url;
    });
  }

  global.PhotoCoachImageLoader = {
    MAX_BYTES: MAX_BYTES,
    MAX_EDGE: MAX_EDGE,
    validateFile: validateFile,
    loadImage: loadImage
  };
})(window);
