/**
 * Waypoint Scenes — engine registry (scaffold)
 * Loads interface-only engines. No implementations.
 */
(function (global) {
  "use strict";

  function list() {
    var bag = global.WaypointScenesEngines || {};
    return ["SceneEngine", "VisionEngine", "CoachEngine", "ProfileEngine", "AnimationEngine"].map(function (id) {
      return bag[id] || { id: id, status: "missing" };
    });
  }

  function get(id) {
    return (global.WaypointScenesEngines || {})[id] || null;
  }

  global.WaypointScenesEngines = global.WaypointScenesEngines || {};
  global.WaypointScenesEngines.registry = { list: list, get: get };
})(typeof window !== "undefined" ? window : globalThis);
