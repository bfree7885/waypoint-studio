(function (global) {
  "use strict";

  var MAX_BYTES = 20 * 1024 * 1024;

  function validate(file) {
    if (global.WDS && global.WDS.core && global.WDS.core.validateImageFile) {
      return global.WDS.core.validateImageFile(file, { maxBytes: MAX_BYTES });
    }
    if (!file) return { ok: false, message: "No file selected." };
    return { ok: true };
  }

  function revokeIfBlob(url) {
    if (url && url.indexOf("blob:") === 0) URL.revokeObjectURL(url);
  }

  function resetInput(input) {
    if (global.WDS && global.WDS.upload) {
      global.WDS.upload.resetInput(input);
    } else if (input) {
      input.value = "";
    }
  }

  global.WaypointFileUpload = {
    validate: validate,
    revokeIfBlob: revokeIfBlob,
    resetInput: resetInput,
    MAX_BYTES: MAX_BYTES
  };
})(window);
