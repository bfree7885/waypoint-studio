(function (global) {
  "use strict";

  var query = "(prefers-reduced-motion: reduce)";

  function prefersReducedMotion() {
    if (global.WDS && global.WDS.core) {
      return global.WDS.core.prefersReducedMotion();
    }
    var mq = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query)
      : null;
    return mq ? mq.matches : false;
  }

  global.WaypointMotionPreference = {
    prefersReducedMotion: prefersReducedMotion,
    query: query
  };
})(window);
