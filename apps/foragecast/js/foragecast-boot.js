/**
 * ForageCast — shared location bootstrap (uses WDS.location + localStorage)
 */
(function (global) {
  "use strict";

  var ENGINE_BASE = "../../design-system/content-engine/";

  function bootstrapLocation() {
    return new Promise(function (resolve) {
      function tryBoot() {
        if (!global.WDS || !global.WDS.location) {
          requestAnimationFrame(tryBoot);
          return;
        }
        global.WDS.location
          .bootstrap({
            base: ENGINE_BASE,
            promptMount: document.getElementById("wds-location-prompt")
          })
          .then(resolve)
          .catch(function () {
            global.WDS.location.loadIndex(ENGINE_BASE).then(function (index) {
              resolve(global.WDS.location.defaultState(index));
            }).catch(function () {
              resolve(global.ForageCastLocation ? global.ForageCastLocation.DEFAULT : null);
            });
          });
      }
      tryBoot();
    });
  }

  function bindRegionChange(mount, onChange) {
    if (!global.WDS || !global.WDS.location) return;
    global.WDS.location.bindBar(mount, {
      base: ENGINE_BASE,
      onLocationChange: onChange
    });
  }

  global.ForageCastBoot = {
    ENGINE_BASE: ENGINE_BASE,
    bootstrapLocation: bootstrapLocation,
    bindRegionChange: bindRegionChange
  };
})(window);
