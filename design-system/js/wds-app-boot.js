/**
 * Shared app bootstrap — location + OIP for Photo Coach, ForageCast, Fieldry, kiosk.
 */
(function (global) {
  "use strict";

  function create(cfg) {
    cfg = cfg || {};
    var ENGINE_BASE = (cfg.base || "design-system/content-engine/").replace(/\/?$/, "/");

    function waitForPlatform() {
      return new Promise(function (resolve) {
        function check() {
          if (global.WDS && global.WDS.outdoorIntelligence && global.WDS.outdoorIntelligence.get) {
            resolve();
            return;
          }
          requestAnimationFrame(check);
        }
        check();
      });
    }

    function configurePlatform() {
      if (!global.WDS || !global.WDS.outdoorIntelligence) return;
      global.WDS.outdoorIntelligence.configure({
        contentEngineBase: ENGINE_BASE,
        includeWeather: true
      });
      if (global.WDS.weather && global.WDS.weather.configure) {
        global.WDS.weather.configure({ provider: "open-meteo", fallback: false });
      }
    }

    function bootstrapLocation() {
      return waitForPlatform().then(function () {
        configurePlatform();
        if (!global.WDS || !global.WDS.location) {
          return Promise.reject(new Error("WDS.location is not available"));
        }
        var promptMount = cfg.promptMount != null
          ? cfg.promptMount
          : (cfg.promptMountId ? document.getElementById(cfg.promptMountId) : null);
        return global.WDS.location.bootstrap({
          base: ENGINE_BASE,
          promptMount: promptMount,
          skipPrompt: !!cfg.skipPrompt
        }).catch(function () {
          return global.WDS.location.loadIndex(ENGINE_BASE).then(function (index) {
            return global.WDS.location.detectLocation({ index: index });
          });
        });
      });
    }

    function fetchPlatform(loc) {
      return waitForPlatform().then(function () {
        configurePlatform();
        return global.WDS.outdoorIntelligence.get({
          location: loc,
          contentEngineBase: ENGINE_BASE,
          includeWeather: true
        }).then(function (platform) {
          var LE = global.WDS && global.WDS.liveEngine;
          if (!LE || !LE.fetchEngineContext || !LE.mergeEngineContext) return platform;
          return LE.fetchEngineContext().then(function (engineCtx) {
            return LE.mergeEngineContext(platform, engineCtx, loc);
          });
        });
      });
    }

    function bindRegionChange(mount, onChange) {
      if (!global.WDS || !global.WDS.location || !mount) return;
      global.WDS.location.bindBar(mount, {
        base: ENGINE_BASE,
        onLocationChange: onChange
      });
    }

    return {
      ENGINE_BASE: ENGINE_BASE,
      waitForPlatform: waitForPlatform,
      configurePlatform: configurePlatform,
      bootstrapLocation: bootstrapLocation,
      fetchPlatform: fetchPlatform,
      bindRegionChange: bindRegionChange
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.appBoot = { create: create };
})(window);
