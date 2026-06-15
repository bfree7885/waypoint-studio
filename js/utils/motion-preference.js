(function (global) {
  "use strict";

  var query = "(prefers-reduced-motion: reduce)";
  var mq = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(query)
    : null;

  function prefersReducedMotion() {
    return mq ? mq.matches : false;
  }

  global.WaypointMotionPreference = {
    prefersReducedMotion: prefersReducedMotion,
    query: query
  };
})(window);
