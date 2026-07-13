/**
 * ForageCast — property profile + user intent (private, localStorage only)
 */
(function (global) {
  "use strict";

  var PROFILE_KEY = "waypoint-foragecast-property-v1";
  var INTENT_KEY = "waypoint-foragecast-intent-v1";

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function defaultProperty() {
    return {
      version: 1,
      name: "",
      features: [],
      notes: "",
      updatedAt: null
    };
  }

  function defaultIntent() {
    return {
      version: 1,
      priorities: ["forage"],
      updatedAt: null
    };
  }

  function loadProperty() {
    var p = readJson(PROFILE_KEY, null);
    if (!p) return defaultProperty();
    if (!Array.isArray(p.features)) p.features = [];
    return p;
  }

  function saveProperty(next) {
    next = next || defaultProperty();
    next.version = 1;
    next.updatedAt = new Date().toISOString();
    writeJson(PROFILE_KEY, next);
    return next;
  }

  function loadIntent() {
    var i = readJson(INTENT_KEY, null);
    if (!i) return defaultIntent();
    if (!Array.isArray(i.priorities) || !i.priorities.length) i.priorities = ["forage"];
    return i;
  }

  function saveIntent(next) {
    next = next || defaultIntent();
    next.version = 1;
    next.updatedAt = new Date().toISOString();
    writeJson(INTENT_KEY, next);
    return next;
  }

  function hasFeature(property, featureId) {
    property = property || loadProperty();
    return (property.features || []).indexOf(featureId) >= 0;
  }

  function isConfigured(property) {
    property = property || loadProperty();
    return (property.features || []).length > 0;
  }

  global.ForageCastProfile = {
    PROFILE_KEY: PROFILE_KEY,
    INTENT_KEY: INTENT_KEY,
    loadProperty: loadProperty,
    saveProperty: saveProperty,
    loadIntent: loadIntent,
    saveIntent: saveIntent,
    hasFeature: hasFeature,
    isConfigured: isConfigured,
    defaultProperty: defaultProperty,
    defaultIntent: defaultIntent
  };
})(typeof window !== "undefined" ? window : globalThis);
