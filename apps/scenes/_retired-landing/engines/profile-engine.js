/**
 * ProfileEngine — Scenes bridge to Photographer Profile (Photo Coach growth store)
 *
 * Live computation: WaypointPhotoCoachProfileEngine + WaypointPhotoCoachRepository
 * Privacy: local-first localStorage; no upload; future sync must be opt-in
 */
(function (global) {
  "use strict";

  function repo() {
    return global.WaypointPhotoCoachRepository || null;
  }

  function engine() {
    return global.WaypointPhotoCoachProfileEngine || null;
  }

  var ProfileEngine = {
    id: "ProfileEngine",
    version: "2.0.0",
    status: "live-bridge",

    /** @returns {Promise<object|null>} */
    getProfile: function () {
      var R = repo();
      if (!R || !R.ProfileRepository) return Promise.resolve(null);
      return Promise.resolve(R.ProfileRepository.load());
    },

    /**
     * Prefer repository ingest + recalculate from Photo Coach analyses.
     * @returns {Promise<object>}
     */
    ingestSession: function (sessionSummary) {
      var R = repo();
      if (!R) {
        return Promise.reject(new Error("ProfileEngine.ingestSession — Photo Coach repository not loaded."));
      }
      // Session summaries are ingested by Photo Coach analyze paths already.
      // This API allows future callers to trigger a recalculation.
      void sessionSummary;
      var profile = R.ProfileRepository.recalculate();
      return Promise.resolve(profile);
    },

    /** @returns {Promise<object>} */
    summarizeGrowth: function (/* range */) {
      return ProfileEngine.getProfile().then(function (profile) {
        if (!profile) {
          return { available: false, summary: "No profile yet.", trends: [] };
        }
        return profile.recentGrowth || profile.recentProgress || {
          available: false,
          summary: "Growth trends will appear as shoots accumulate.",
          trends: []
        };
      });
    },

    compute: function (photos, shoots) {
      var Eng = engine();
      if (!Eng) {
        return Promise.reject(new Error("ProfileEngine.compute — ProfileEngine core not loaded."));
      }
      return Promise.resolve(Eng.compute(photos || [], shoots || []));
    }
  };

  global.WaypointScenesEngines = global.WaypointScenesEngines || {};
  global.WaypointScenesEngines.ProfileEngine = ProfileEngine;
})(typeof window !== "undefined" ? window : globalThis);
