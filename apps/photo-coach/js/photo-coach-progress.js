/**
 * Photo Coach — local progress (no gamification)
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-photo-coach-journey-v1";

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var data = JSON.parse(raw);
      return Object.assign(defaultState(), data);
    } catch (e) {
      return defaultState();
    }
  }

  function defaultState() {
    return {
      version: 1,
      firstVisit: null,
      lastVisit: null,
      visitCount: 0,
      conceptsViewed: [],
      conceptsCompleted: [],
      fieldSessions: 0,
      places: [],
      notes: []
    };
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota */ }
    return state;
  }

  function recordVisit() {
    var s = load();
    var now = new Date().toISOString();
    if (!s.firstVisit) s.firstVisit = now;
    s.lastVisit = now;
    s.visitCount = (s.visitCount || 0) + 1;
    return save(s);
  }

  function markConceptViewed(id) {
    if (!id) return load();
    var s = load();
    if (s.conceptsViewed.indexOf(id) < 0) s.conceptsViewed.push(id);
    return save(s);
  }

  function markConceptStudied(id) {
    if (!id) return load();
    var s = markConceptViewed(id);
    if (s.conceptsCompleted.indexOf(id) < 0) s.conceptsCompleted.push(id);
    return save(s);
  }

  function recordFieldSession() {
    var s = load();
    s.fieldSessions = (s.fieldSessions || 0) + 1;
    return save(s);
  }

  function stats(totalConcepts) {
    var s = load();
    return {
      visitCount: s.visitCount || 0,
      conceptsViewed: (s.conceptsViewed || []).length,
      conceptsStudied: (s.conceptsCompleted || []).length,
      totalConcepts: totalConcepts || 0,
      fieldSessions: s.fieldSessions || 0,
      firstVisit: s.firstVisit,
      lastVisit: s.lastVisit
    };
  }

  global.PhotoCoachProgress = {
    load: load,
    save: save,
    recordVisit: recordVisit,
    markConceptViewed: markConceptViewed,
    markConceptStudied: markConceptStudied,
    recordFieldSession: recordFieldSession,
    stats: stats
  };
})(window);
