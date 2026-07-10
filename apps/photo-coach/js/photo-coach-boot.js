/**
 * Photo Coach — location + OIP bootstrap (shared app boot)
 */
(function (global) {
  "use strict";

  var boot = null;

  function getBoot() {
    if (boot) return boot;
    if (!global.WDS || !global.WDS.appBoot) return null;
    boot = global.WDS.appBoot.create({
      base: "../../../design-system/content-engine/",
      promptMountId: "wds-location-prompt"
    });
    return boot;
  }

  function bootstrapLocation() {
    var B = getBoot();
    if (!B) return Promise.reject(new Error("WDS.appBoot is not available"));
    return B.bootstrapLocation();
  }

  function fetchPlatform(loc) {
    var B = getBoot();
    if (!B) return Promise.reject(new Error("WDS.appBoot is not available"));
    return B.fetchPlatform(loc);
  }

  function bindRegionChange(mount, onChange) {
    var B = getBoot();
    if (B) B.bindRegionChange(mount, onChange);
  }

  function waitForAppBoot(maxMs) {
    maxMs = maxMs != null ? maxMs : 20000;
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      function check() {
        if (global.WDS && global.WDS.appBoot && global.WDS.appBoot.create) {
          resolve();
          return;
        }
        if (Date.now() - started >= maxMs) {
          reject(new Error("WDS.appBoot is not available"));
          return;
        }
        requestAnimationFrame(check);
      }
      check();
    });
  }

  function init() {
    if (!global.PhotoCoachApp) return;
    waitForAppBoot()
      .then(function () {
        return bootstrapLocation();
      })
      .then(function (loc) {
        var bar = document.getElementById("pc-location-bar");
        if (bar) {
          bar.hidden = false;
          bindRegionChange(bar, function (newLoc) {
            global.PhotoCoachApp.refresh(newLoc);
          });
        }
        return fetchPlatform(loc).then(function (pkg) {
          return global.PhotoCoachApp.init({ location: loc, platform: pkg });
        });
      })
      .catch(function (err) {
        var mount = document.getElementById("photo-coach-app");
        if (mount) {
          mount.innerHTML =
            '<section class="pc-hero"><p class="wds-eyebrow">Photo Coach</p>' +
            '<p class="pc-hero__lead">Could not load outdoor intelligence. Check your connection and refresh.</p></section>';
        }
        if (global.console && console.error) console.error(err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.PhotoCoachBoot = {
    ENGINE_BASE: "../../../design-system/content-engine/",
    bootstrapLocation: bootstrapLocation,
    fetchPlatform: fetchPlatform,
    bindRegionChange: bindRegionChange
  };
})(window);
