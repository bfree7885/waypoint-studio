/**
 * Waypoint Studio Design System — Upload
 * File picker, drag-and-drop, and validation for image workflows.
 *
 * Usage:
 *   WDS.upload.bind({
 *     input: document.getElementById("file-input"),
 *     triggers: [btnHero, btnEmpty],
 *     dropzones: [previewShell],
 *     onFile: function (file) {},
 *     onError: function (message) {},
 *     accept: ["image/jpeg", "image/png", "image/webp"],
 *     maxBytes: 20971520
 *   });
 */
(function (global) {
  "use strict";

  function resetInput(input) {
    if (input) input.value = "";
  }

  function bindDragDrop(zone, onFile) {
    if (!zone) return;

    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      zone.classList.add("is-dragover");
    });

    zone.addEventListener("dragleave", function () {
      zone.classList.remove("is-dragover");
    });

    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("is-dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFile(e.dataTransfer.files[0]);
      }
    });
  }

  function bind(config) {
    config = config || {};
    var input = config.input;
    var validate = global.WDS && global.WDS.core && global.WDS.core.validateImageFile
      ? global.WDS.core.validateImageFile
      : function (file) { return file ? { ok: true } : { ok: false, message: "No file." }; };

    function handleFile(file) {
      var check = validate(file, {
        accept: config.accept,
        maxBytes: config.maxBytes
      });
      if (!check.ok) {
        if (config.onError) config.onError(check.message);
        return;
      }
      if (config.onFile) config.onFile(file);
    }

    if (input) {
      input.addEventListener("change", function () {
        if (input.files && input.files[0]) handleFile(input.files[0]);
        resetInput(input);
      });
    }

    (config.triggers || []).forEach(function (btn) {
      if (!btn || !input) return;
      btn.addEventListener("click", function () { input.click(); });
    });

    (config.dropzones || []).forEach(function (zone) {
      bindDragDrop(zone, handleFile);
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.upload = {
    bind: bind,
    bindDragDrop: bindDragDrop,
    resetInput: resetInput
  };
})(window);
