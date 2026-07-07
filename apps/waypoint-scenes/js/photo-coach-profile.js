/**
 * Photo Coach learning profile — local learner identity (no cloud).
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-photo-coach-profile-v1";

  function defaults() {
    return {
      version: 1,
      displayName: null,
      experienceLevel: "developing",
      goals: ["composition", "lighting"],
      focusAreas: [],
      completedAssignments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Object.assign(defaults(), JSON.parse(raw)) : defaults();
    } catch (e) {
      return defaults();
    }
  }

  function save(profile) {
    profile.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch (e) {
      return false;
    }
  }

  function setGoal(goal) {
    var p = load();
    if (p.goals.indexOf(goal) < 0) p.goals.push(goal);
    save(p);
    return p;
  }

  function completeAssignment(id) {
    var p = load();
    if (p.completedAssignments.indexOf(id) < 0) {
      p.completedAssignments.push(id);
    }
    save(p);
    return p;
  }

  function renderSummary() {
    var p = load();
    return {
      level: p.experienceLevel || "developing",
      goals: (p.goals || []).slice(0, 3).join(", ") || "general craft",
      assignmentsDone: (p.completedAssignments || []).length
    };
  }

  global.WaypointPhotoCoachProfile = {
    load: load,
    save: save,
    setGoal: setGoal,
    completeAssignment: completeAssignment,
    renderSummary: renderSummary
  };
})(window);
