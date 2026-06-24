/**
 * ForageCast — shared location + platform bootstrap
 */
(function (global) {
  "use strict";

  var ENGINE_BASE = "../../design-system/content-engine/";

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
      return new Promise(function (resolve, reject) {
        if (!global.WDS || !global.WDS.location) {
          reject(new Error("WDS.location is not available"));
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
            }).catch(reject);
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
      });
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
    fetchPlatform: fetchPlatform,
    bindRegionChange: bindRegionChange
  };
})(window);
