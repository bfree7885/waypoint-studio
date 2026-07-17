/**
 * Animal Vision — species configuration loader
 * Loads data/species.json; UI must not hardcode species.
 */
(function (global) {
  "use strict";

  var cache = null;
  var DEFAULT_SRC = "data/species.json";

  function list() {
    return (cache && cache.species) || [];
  }

  function byId(id) {
    var species = list();
    for (var i = 0; i < species.length; i += 1) {
      if (species[i].id === id) return species[i];
    }
    return null;
  }

  function disclaimer() {
    return (cache && cache.disclaimer) ||
      "Animal Vision is a research-informed interpretive visualization. Animal perception is far more complex than can be reproduced on a human display.";
  }

  function privacyNote() {
    return (cache && cache.privacyNote) ||
      "Processed locally. Your photographs are never uploaded.";
  }

  function load(src) {
    src = src || DEFAULT_SRC;
    return fetch(src, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("Species configuration could not be loaded.");
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.species) || !data.species.length) {
          throw new Error("Species configuration is empty.");
        }
        cache = data;
        return data;
      });
  }

  global.WaypointAnimalVision = global.WaypointAnimalVision || {};
  global.WaypointAnimalVision.species = {
    load: load,
    list: list,
    byId: byId,
    disclaimer: disclaimer,
    privacyNote: privacyNote,
    getConfig: function () { return cache; }
  };
})(typeof window !== "undefined" ? window : globalThis);
