(function (global) {
  "use strict";

  var ACCEPT_RE = /^image\/(jpeg|png|webp|svg\+xml)$/;
  var MAX_BYTES = 20 * 1024 * 1024;

  function validate(file) {
    if (!file) return { ok: false, message: "No file selected." };
    if (!ACCEPT_RE.test(file.type)) {
      return { ok: false, message: "Use JPEG, PNG, WebP, or SVG." };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, message: "File must be under 20 MB." };
    }
    return { ok: true };
  }

  function revokeIfBlob(url) {
    if (url && url.indexOf("blob:") === 0) URL.revokeObjectURL(url);
  }

  function resetInput(input) {
    if (input) input.value = "";
  }

  global.WaypointFileUpload = {
    validate: validate,
    revokeIfBlob: revokeIfBlob,
    resetInput: resetInput,
    MAX_BYTES: MAX_BYTES
  };
})(window);
