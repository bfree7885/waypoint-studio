/**
 * Photo Coach portfolio — local session store (no cloud).
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-photo-coach-sessions-v1";
  var MAX_SESSIONS = 50;

  function loadAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveAll(sessions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveSession(session) {
    session = session || {};
    session.id = session.id || "pcs-" + Date.now().toString(36);
    session.savedAt = new Date().toISOString();
    var all = loadAll();
    all.unshift(session);
    saveAll(all);
    return session;
  }

  function listSessions() {
    return loadAll();
  }

  function getSession(id) {
    return loadAll().filter(function (s) { return s.id === id; })[0] || null;
  }

  function deleteSession(id) {
    saveAll(loadAll().filter(function (s) { return s.id !== id; }));
  }

  function skillSummary() {
    var sessions = loadAll().filter(function (s) { return s.critique && s.critique.overallScore != null });
    if (!sessions.length) return null;
    var avg = Math.round(sessions.reduce(function (a, s) { return a + s.critique.overallScore; }, 0) / sessions.length);
    return {
      sessionsCoached: sessions.length,
      averageScore: avg,
      lastSessionAt: sessions[0].savedAt
    };
  }

  global.WaypointPhotoCoachPortfolio = {
    saveSession: saveSession,
    listSessions: listSessions,
    getSession: getSession,
    deleteSession: deleteSession,
    skillSummary: skillSummary
  };
})(window);
