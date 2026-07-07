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

  function cameraFromExif(exif) {
    if (!exif) return null;
    if (exif.camera) return exif.camera;
    var parts = [exif.make, exif.model].filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }

  function locationFromSession(session) {
    var oc = session.outdoorContext;
    if (oc && oc.location) {
      var l = oc.location;
      var line = [l.city, l.county, l.state].filter(Boolean).join(", ");
      if (line) return line;
      if (l.lat != null && l.lng != null) return l.lat.toFixed(2) + ", " + l.lng.toFixed(2);
    }
    if (session.exif && session.exif.gpsLabel) return session.exif.gpsLabel;
    if (session.exif && session.exif.latitude != null) {
      return session.exif.latitude.toFixed(4) + ", " + session.exif.longitude.toFixed(4);
    }
    return null;
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
      session.camera = session.camera || cameraFromExif(session.exif);
      session.location = session.location || locationFromSession(session);
      session.sessionNotes = session.sessionNotes || "";
      session.favorite = !!session.favorite;
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

  function toggleFavorite(id) {
    var session = getSession(id);
    if (!session) return null;
    return updateSession(id, { favorite: !session.favorite });
  }

  global.WaypointPhotoCoachPortfolio = {
    saveSession: saveSession,
    listSessions: listSessions,
    getSession: getSession,
    deleteSession: deleteSession,
    updateSession: updateSession,
    toggleFavorite: toggleFavorite,
    skillSummary: skillSummary,
    makeThumbnail: makeThumbnail,
    cameraFromExif: cameraFromExif,
    locationFromSession: locationFromSession
  };
})(window);
