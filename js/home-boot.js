/**
 * Waypoint Studio homepage — location-aware dashboard boot
 */
(function () {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";

  function startDashboard(loc) {
    if (!window.WDS || !WDS.contentEngine) return;
    WDS.contentEngine.init({
      base: ENGINE_BASE,
      mount: document.getElementById("wds-content-engine"),
      wrapMain: true,
      location: loc,
      onLocationChange: function (newLoc) {
        startDashboard(newLoc);
      }
    });
  }

  function showBootError() {
    var mount = document.getElementById("wds-content-engine");
    if (mount) {
      mount.innerHTML = "<main id=\"main\"><p class=\"wds-body\" style=\"padding:2rem;\">Could not load dashboard. Refresh to try again.</p></main>";
      mount.removeAttribute("aria-busy");
    }
  }

  function boot() {
    if (!window.WDS || !WDS.location || !WDS.contentEngine) {
      requestAnimationFrame(boot);
      return;
    }
    if (WDS.outdoorIntelligence && WDS.outdoorIntelligence.configure) {
      WDS.outdoorIntelligence.configure({
        contentEngineBase: ENGINE_BASE,
        includeWeather: true
      });
    } else if (WDS.regionalIntelligence && WDS.regionalIntelligence.configure) {
      WDS.regionalIntelligence.configure({ contentEngineBase: ENGINE_BASE });
    }
    if (WDS.weather && WDS.weather.configure) {
      WDS.weather.configure({ provider: "open-meteo", fallback: false });
    }
    WDS.location.bootstrap({
      base: ENGINE_BASE,
      promptMount: document.getElementById("wds-location-prompt")
    }).then(startDashboard).catch(function () {
      if (window.WDS && WDS.location) {
        WDS.location.loadIndex(ENGINE_BASE).then(function (index) {
          startDashboard(WDS.location.defaultState(index));
        }).catch(showBootError);
        return;
      }
      showBootError();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
