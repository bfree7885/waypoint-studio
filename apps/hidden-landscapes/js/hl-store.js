/**
 * Hidden Landscapes — local-first catalog + draft store (scaffold)
 *
 * Loads JSON catalogs and keeps draft ImageSets in localStorage.
 * No sync, no uploads.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-hidden-landscapes-drafts-v1";
  var DATA_BASE = "data/";

  function fetchJson(path) {
    return fetch(DATA_BASE + path).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + path);
      return r.json();
    });
  }

  function loadCatalog() {
    return Promise.all([
      fetchJson("sections.json"),
      fetchJson("vision-modes.json"),
      fetchJson("species.json"),
      fetchJson("camera-systems.json"),
      fetchJson("filters.json"),
      fetchJson("wavelengths.json"),
      fetchJson("image-sets.json")
    ]).then(function (parts) {
      var Models = global.HiddenLandscapesModels;
      var visionModes = (parts[1].modes || []).map(Models.createVisionMode);
      var species = (parts[2].species || []).map(Models.createSpecies);
      var cameras = (parts[3].systems || []).map(Models.createCameraSystem);
      var filters = (parts[4].filters || []).map(Models.createFilter);
      var wavelengths = (parts[5].bands || []).map(Models.createWavelength);
      var imageSets = (parts[6].imageSets || []).map(Models.createImageSet);

      return {
        sectionsMeta: parts[0],
        sections: parts[0].sections || [],
        visionModes: visionModes,
        species: species,
        cameraSystems: cameras,
        filters: filters,
        wavelengths: wavelengths,
        imageSets: imageSets,
        byId: {
          visionModes: Models.indexById(visionModes),
          species: Models.indexById(species),
          cameraSystems: Models.indexById(cameras),
          filters: Models.indexById(filters),
          wavelengths: Models.indexById(wavelengths),
          imageSets: Models.indexById(imageSets)
        }
      };
    });
  }

  function loadDrafts() {
    try {
      var raw = global.localStorage && localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(global.HiddenLandscapesModels.createImageSet);
    } catch (e) {
      return [];
    }
  }

  function saveDrafts(list) {
    // TODO(sync): optional encrypted cloud sync when user opts in.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
      return true;
    } catch (e) {
      return false;
    }
  }

  global.HiddenLandscapesStore = {
    STORAGE_KEY: STORAGE_KEY,
    loadCatalog: loadCatalog,
    loadDrafts: loadDrafts,
    saveDrafts: saveDrafts
  };
})(typeof window !== "undefined" ? window : globalThis);
