(function (global) {
  "use strict";

  function init() {
    var mount = document.getElementById("learn-curriculum");
    var content = global.WaypointLearnContent;
    var edu = global.WDS && global.WDS.education;

    if (!mount || !content) return;

    if (edu) {
      edu.renderCurriculum(mount, content, {
        legacy: true,
        hideIntro: true
      });
      return;
    }

    console.warn("[Learn] WDS.education not loaded; Field Guide will not render.");
  }

  global.WaypointLearn = { init: init };
})(window);
