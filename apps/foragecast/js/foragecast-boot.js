/**
 * ForageCast — shared location + platform bootstrap
 * Lazy-binds WDS.appBoot so deferred platform scripts can finish loading.
 */
(function (global) {
  "use strict";

  var boot = null;

  function getBoot() {
    if (boot) return boot;
    if (!global.WDS || !global.WDS.appBoot || !global.WDS.appBoot.create) return null;
    boot = global.WDS.appBoot.create({
      base: "../../design-system/content-engine/",
      promptMountId: "wds-location-prompt"
    });
    return boot;
  }

  function waitForAppBoot(maxMs) {
    maxMs = maxMs != null ? maxMs : 20000;
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      function check() {
        if (getBoot()) {
          resolve(boot);
          return;
        }
        if (Date.now() - started >= maxMs) {
          reject(new Error("WDS.appBoot unavailable"));
          return;
        }
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(check);
        else setTimeout(check, 16);
      }
      check();
    });
  }

  global.ForageCastBoot = {
    ENGINE_BASE: "../../design-system/content-engine/",
    waitForAppBoot: waitForAppBoot,
    bootstrapLocation: function () {
      return waitForAppBoot().then(function (B) {
        return B.bootstrapLocation();
      });
    },
    fetchPlatform: function (loc) {
      var B = getBoot();
      if (!B) return Promise.reject(new Error("WDS.appBoot unavailable"));
      return B.fetchPlatform(loc);
    },
    bindRegionChange: function (mount, onChange) {
      var B = getBoot();
      if (B) B.bindRegionChange(mount, onChange);
    }
  };
})(typeof window !== "undefined" ? window : global);
