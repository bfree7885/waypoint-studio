/**
 * Photo Coach portfolio — local session store with thumbnail support.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-photo-coach-sessions-v1";
  var MAX_SESSIONS = 50;
  var THUMB_MAX = 160;

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

  function makeThumbnail(imageUrl) {
    return new Promise(function (resolve) {
      if (!imageUrl) { resolve(null); return; }
      var img = new Image();
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          var scale = THUMB_MAX / Math.max(img.naturalWidth, img.naturalHeight);
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = function () { resolve(null); };
      img.src = imageUrl;
    });
  }

  function saveSession(session) {
    session = session || {};
    var persist = function (thumb) {
      session.id = session.id || "pcs-" + Date.now().toString(36);
      session.savedAt = session.savedAt || new Date().toISOString();
      if (thumb) session.thumbnail = thumb;
      session.grade = session.critique && session.critique.overallGrade
        ? session.critique.overallGrade.letter
        : (session.critique && session.critique.overallScore != null
          ? String(session.critique.overallScore)
          : null);
      session.score = session.critique && session.critique.overallGrade
        ? session.critique.overallGrade.score
        : (session.critique ? session.critique.overallScore : null);
      session.sceneBuilderStatus = session.sceneBuilderStatus || "not-sent";
      var all = loadAll();
      all.unshift(session);
      saveAll(all);
      return session;
    };

    if (session.thumbnail) return Promise.resolve(persist(session.thumbnail));
    return makeThumbnail(session.imageUrl).then(function (thumb) {
      return persist(thumb);
    });
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

  function updateSession(id, patch) {
    var all = loadAll();
    var idx = all.findIndex(function (s) { return s.id === id; });
    if (idx < 0) return null;
    all[idx] = Object.assign({}, all[idx], patch);
    saveAll(all);
    return all[idx];
  }

  function skillSummary() {
    var sessions = loadAll().filter(function (s) {
      return s.score != null || (s.critique && s.critique.overallScore != null);
    });
    if (!sessions.length) return null;
    var avg = Math.round(sessions.reduce(function (a, s) {
      var sc = s.score != null ? s.score : s.critique.overallScore;
      return a + sc;
    }, 0) / sessions.length);
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
    updateSession: updateSession,
    skillSummary: skillSummary,
    makeThumbnail: makeThumbnail
  };
})(window);
