/**
 * Waypoint Volunteer — private local profile (never public).
 */
(function (global) {
  "use strict";

  var KEY = "waypoint-volunteer-profile-v1";

  var DEFAULT = {
    version: 1,
    causes: [],
    physicalAbility: "moderate",
    transportation: "car",
    preferredTravelMiles: 25,
    volunteerFrequency: "occasional",
    availableWeekdays: true,
    availableWeekends: true,
    preferredDurationMinutes: 120,
    indoorOutdoor: "any",
    accessibilityNeeded: false,
    kidFriendlyPreferred: false,
    dogFriendlyPreferred: false,
    notes: ""
  };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function load() {
    try {
      var ls = global.localStorage;
      var raw = ls && ls.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var parsed = JSON.parse(raw);
      var out = clone(DEFAULT);
      Object.keys(DEFAULT).forEach(function (k) {
        if (parsed[k] !== undefined) out[k] = parsed[k];
      });
      return out;
    } catch (e) {
      return clone(DEFAULT);
    }
  }

  function save(partial) {
    var next = Object.assign(load(), partial || {}, { version: 1 });
    try {
      if (global.localStorage) global.localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      /* private storage full or blocked */
    }
    return next;
  }

  function clear() {
    try {
      if (global.localStorage) global.localStorage.removeItem(KEY);
    } catch (e) {}
    return clone(DEFAULT);
  }

  global.WDS = global.WDS || {};
  global.WDS.volunteerProfile = {
    KEY: KEY,
    DEFAULT: DEFAULT,
    load: load,
    save: save,
    clear: clear
  };
})(window);
