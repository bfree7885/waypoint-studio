/**
 * Sheds map observations — where a note may be saved.
 *
 * A map observation is placed at a usable GPS fix or an explicit map tap.
 * Map center, the last viewed point, a Search Area center, and default
 * coordinates are never a location.
 *
 * This does not record Hunt observations.
 */
(function (global) {
  "use strict";

  var DEFAULT_MAX_ACCURACY_M = 80;

  function finiteNum(n) {
    return typeof n === "number" && isFinite(n);
  }

  function inRange(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Live GPS worth saving. Accuracy must be finite, above 0, and within max.
   * A missing or poor fix does not borrow any other coordinate.
   */
  function gpsCandidate(fix, maxAccuracyM) {
    var maxM = finiteNum(maxAccuracyM) ? maxAccuracyM : DEFAULT_MAX_ACCURACY_M;
    if (!fix || !finiteNum(fix.lat) || !finiteNum(fix.lng)) {
      return { ok: false, reason: "missing" };
    }
    if (!inRange(fix.lat, fix.lng)) return { ok: false, reason: "range" };
    var acc = fix.accuracyM;
    if (!finiteNum(acc) || acc <= 0 || acc > maxM) {
      return { ok: false, reason: "poor", accuracyM: finiteNum(acc) ? acc : null };
    }
    return { ok: true, source: "gps", lat: fix.lat, lng: fix.lng, accuracyM: acc };
  }

  /** One deliberate map tap. The coordinates are the tap, unchanged. */
  function selectionFromMapTap(lat, lng) {
    if (!finiteNum(lat) || !finiteNum(lng)) return { ok: false, reason: "missing" };
    if (!inRange(lat, lng)) return { ok: false, reason: "range" };
    return { ok: true, source: "map", lat: lat, lng: lng, accuracyM: null };
  }

  /**
   * An observation already stored on this device. Keeps its coordinates and
   * the precision that was saved with them.
   */
  function selectionFromStored(location) {
    if (!location) return { ok: false, reason: "missing" };
    var picked = selectionFromMapTap(location.lat, location.lng);
    if (!picked.ok) return picked;
    var precision = location.precision;
    if (
      precision !== "gps" &&
      precision !== "approximate" &&
      precision !== "map-tap" &&
      precision !== "exact"
    ) {
      precision = "map-tap";
    }
    return {
      ok: true,
      source: "stored",
      lat: picked.lat,
      lng: picked.lng,
      accuracyM: finiteNum(location.accuracyM) ? location.accuracyM : null,
      precision: precision
    };
  }

  /**
   * Choose a placement. An explicit tap wins. Otherwise a usable GPS fix.
   * mapCenter, searchAreaCenter, and defaultCoords are ignored.
   */
  function placeObservation(input) {
    input = input || {};
    if (input.mapTap) {
      var tap = selectionFromMapTap(input.mapTap.lat, input.mapTap.lng);
      if (!tap.ok) return { ok: false, reason: tap.reason || "missing" };
      return tap;
    }
    if (input.gps) return gpsCandidate(input.gps, input.maxAccuracyM);
    return { ok: false, reason: "missing" };
  }

  function sourceLabel(draft) {
    if (!draft) return "Location required";
    if (draft.source === "gps") return "Current GPS";
    if (draft.source === "map" || draft.source === "stored") return "Selected on map";
    return "Location required";
  }

  function draftForSave(draft) {
    var label = sourceLabel(draft);
    if (label === "Location required") {
      return {
        ok: false,
        error: "Location required. Choose a location on the map, or use a current GPS fix."
      };
    }
    if (draft.source === "gps") {
      var gps = gpsCandidate(draft, draft.maxAccuracyM);
      if (!gps.ok) {
        return {
          ok: false,
          error: "Current GPS is not accurate enough to save this observation. Choose a location on the map."
        };
      }
      return {
        ok: true,
        location: {
          lat: gps.lat,
          lng: gps.lng,
          precision: "gps",
          accuracyM: gps.accuracyM
        }
      };
    }
    if (draft.source === "stored") {
      var kept = selectionFromMapTap(draft.lat, draft.lng);
      if (!kept.ok) {
        return {
          ok: false,
          error: "Location required. Choose a location on the map."
        };
      }
      return {
        ok: true,
        location: {
          lat: kept.lat,
          lng: kept.lng,
          precision: draft.precision || "map-tap",
          accuracyM: finiteNum(draft.accuracyM) ? draft.accuracyM : null
        }
      };
    }
    var mapSel = selectionFromMapTap(draft.lat, draft.lng);
    if (!mapSel.ok) {
      return {
        ok: false,
        error: "Location required. Choose a location on the map."
      };
    }
    return {
      ok: true,
      location: {
        lat: mapSel.lat,
        lng: mapSel.lng,
        precision: "map-tap",
        accuracyM: null
      }
    };
  }

  var api = {
    DEFAULT_MAX_ACCURACY_M: DEFAULT_MAX_ACCURACY_M,
    gpsCandidate: gpsCandidate,
    selectionFromMapTap: selectionFromMapTap,
    selectionFromStored: selectionFromStored,
    placeObservation: placeObservation,
    sourceLabel: sourceLabel,
    draftForSave: draftForSave
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.WaypointShedsObservationPlace = api;
})(typeof window !== "undefined" ? window : globalThis);
