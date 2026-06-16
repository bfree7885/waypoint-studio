(function (global) {
  "use strict";

  var Engine = global.WaypointEngine;
  var Registry = global.WaypointEffectRegistry;

  function apply(config) {
    Engine.apply(config);
  }

  function stopAll() {
    Engine.stopAll();
  }

  function captureFrame(config) {
    return Engine.captureFrame(config);
  }

  function onResize(config, getState) {
    return Engine.onResize(config, getState);
  }

  global.WaypointEffects = {
    MODULE_IDS: function () {
      return Registry.ids();
    },
    getModuleMeta: function () {
      return Registry.getAll();
    },
    getDefaultStateForId: Engine.getDefaultStateForId,
    getDefaultCamera: Engine.getDefaultCamera,
    apply: apply,
    stopAll: stopAll,
    captureFrame: captureFrame,
    onResize: onResize
  };
})(window);
