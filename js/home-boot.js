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
      includeCitizenScience: false,
      location: loc,
      onLocationChange: function (newLoc) {
        startDashboard(newLoc);
      }
    });
  }

  function boot() {
    if (!window.WDS || !WDS.location || !WDS.contentEngine) {
      requestAnimationFrame(boot);
      return;
    }
    if (WDS.regionalIntelligence && WDS.regionalIntelligence.configure) {
      WDS.regionalIntelligence.configure({ contentEngineBase: ENGINE_BASE });
    }
    WDS.location.bootstrap({
      base: ENGINE_BASE,
      promptMount: document.getElementById("wds-location-prompt")
    }).then(startDashboard).catch(function () {
      var mount = document.getElementById("wds-content-engine");
      if (mount) {
        mount.innerHTML = "<main id=\"main\"><p class=\"wds-body\" style=\"padding:2rem;\">Could not load dashboard. Refresh to try again.</p></main>";
        mount.removeAttribute("aria-busy");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
