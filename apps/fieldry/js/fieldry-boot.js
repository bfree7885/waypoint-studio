/**
 * Fieldry — location + OIP bootstrap (shared app boot)
 */
(function (global) {
  "use strict";

  var boot = global.WDS && global.WDS.appBoot
    ? global.WDS.appBoot.create({
        base: "../../design-system/content-engine/",
        promptMountId: "wds-location-prompt"
      })
    : null;

  global.FieldryBoot = {
    ENGINE_BASE: "../../design-system/content-engine/",
    bootstrapLocation: function () {
      return boot ? boot.bootstrapLocation() : Promise.reject(new Error("WDS.appBoot unavailable"));
    },
    fetchPlatform: function (loc) {
      return boot ? boot.fetchPlatform(loc) : Promise.reject(new Error("WDS.appBoot unavailable"));
    },
    bindRegionChange: function (mount, onChange) {
      if (boot) boot.bindRegionChange(mount, onChange);
    }
  };
})(window);
