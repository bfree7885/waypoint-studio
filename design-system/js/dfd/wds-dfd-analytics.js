/**
 * Deep Forest Dispatch — lightweight analytics hooks.
 * No third-party SDK. Emits CustomEvents + optional console debug.
 * Preserve existing naming if a future shared analytics bus appears.
 */
(function (global) {
  "use strict";
  global.WDS = global.WDS || {};
  global.WDS.dfd = global.WDS.dfd || {};

  var DEBUG = false;

  function emit(name, detail) {
    var payload = Object.assign({ ts: Date.now(), surface: "deep-forest-dispatch" }, detail || {});
    try {
      global.dispatchEvent(new CustomEvent("waypoint:analytics", { detail: { name: name, payload: payload } }));
    } catch (_) {}
    try {
      global.dispatchEvent(new CustomEvent("dfd:" + name, { detail: payload }));
    } catch (_) {}
    if (DEBUG && global.console && console.info) {
      console.info("[DFD analytics]", name, payload);
    }
    // Queue for any future collector
    global.__WAYPOINT_ANALYTICS_QUEUE__ = global.__WAYPOINT_ANALYTICS_QUEUE__ || [];
    global.__WAYPOINT_ANALYTICS_QUEUE__.push({ name: name, payload: payload });
  }

  function track(name, detail) {
    emit(name, detail);
  }

  function bindClicks(root) {
    if (!root) return;
    root.addEventListener("click", function (e) {
      var t = e.target.closest("[data-dfd-track]");
      if (!t) return;
      var name = t.getAttribute("data-dfd-track");
      if (!name) return;
      var detail = {};
      try {
        detail = JSON.parse(t.getAttribute("data-dfd-track-detail") || "{}");
      } catch (_) {}
      if (t.href) detail.href = t.getAttribute("href");
      track(name, detail);
    });
  }

  global.WDS.dfd.analytics = {
    track: track,
    bindClicks: bindClicks,
    events: {
      LIBRARY_VIEW: "DFD_LIBRARY_VIEW",
      STORY_VIEW: "DFD_STORY_VIEW",
      VIDEO_PLAY: "DFD_VIDEO_PLAY",
      RELATED_STORY_CLICK: "DFD_RELATED_STORY_CLICK",
      WAYPOINT_TOOL_CLICK: "DFD_WAYPOINT_TOOL_CLICK",
      YOUTUBE_CLICK: "DFD_YOUTUBE_CLICK"
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
