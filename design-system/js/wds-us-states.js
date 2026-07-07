/**
 * U.S. state lookup — client-side bounds and centroids (no external API).
 */
(function (global) {
  "use strict";

  var STATES = [
    { code: "AL", name: "Alabama", lat: 32.806671, lng: -86.79113 },
    { code: "AK", name: "Alaska", lat: 61.370716, lng: -152.404419 },
    { code: "AZ", name: "Arizona", lat: 33.729759, lng: -111.431221 },
    { code: "AR", name: "Arkansas", lat: 34.969704, lng: -92.373123 },
    { code: "CA", name: "California", lat: 36.116203, lng: -119.681564 },
    { code: "CO", name: "Colorado", lat: 39.059811, lng: -105.311104 },
    { code: "CT", name: "Connecticut", lat: 41.597782, lng: -72.755371 },
    { code: "DE", name: "Delaware", lat: 39.318523, lng: -75.507141 },
    { code: "DC", name: "District of Columbia", lat: 38.897438, lng: -77.026817 },
    { code: "FL", name: "Florida", lat: 27.766279, lng: -81.686783 },
    { code: "GA", name: "Georgia", lat: 33.040619, lng: -83.643074 },
    { code: "HI", name: "Hawaii", lat: 21.094318, lng: -157.498337 },
    { code: "ID", name: "Idaho", lat: 44.240459, lng: -114.478828 },
    { code: "IL", name: "Illinois", lat: 40.349457, lng: -88.986137 },
    { code: "IN", name: "Indiana", lat: 39.849426, lng: -86.258278 },
    { code: "IA", name: "Iowa", lat: 42.011539, lng: -93.210526 },
    { code: "KS", name: "Kansas", lat: 38.5266, lng: -96.726486 },
    { code: "KY", name: "Kentucky", lat: 37.66814, lng: -84.670067 },
    { code: "LA", name: "Louisiana", lat: 31.169546, lng: -91.867805 },
    { code: "ME", name: "Maine", lat: 44.693947, lng: -69.381927 },
    { code: "MD", name: "Maryland", lat: 39.063946, lng: -76.802101 },
    { code: "MA", name: "Massachusetts", lat: 42.230171, lng: -71.530106 },
    { code: "MI", name: "Michigan", lat: 43.326618, lng: -84.536095 },
    { code: "MN", name: "Minnesota", lat: 45.694454, lng: -93.900192 },
    { code: "MS", name: "Mississippi", lat: 32.741646, lng: -89.678696 },
    { code: "MO", name: "Missouri", lat: 38.456085, lng: -92.288368 },
    { code: "MT", name: "Montana", lat: 46.921925, lng: -110.454353 },
    { code: "NE", name: "Nebraska", lat: 41.12537, lng: -98.268082 },
    { code: "NV", name: "Nevada", lat: 38.313515, lng: -117.055374 },
    { code: "NH", name: "New Hampshire", lat: 43.452492, lng: -71.563896 },
    { code: "NJ", name: "New Jersey", lat: 40.298904, lng: -74.521011 },
    { code: "NM", name: "New Mexico", lat: 34.840515, lng: -106.248482 },
    { code: "NY", name: "New York", lat: 42.165726, lng: -74.948051 },
    { code: "NC", name: "North Carolina", lat: 35.630066, lng: -79.806419 },
    { code: "ND", name: "North Dakota", lat: 47.528912, lng: -99.784012 },
    { code: "OH", name: "Ohio", lat: 40.388783, lng: -82.764915 },
    { code: "OK", name: "Oklahoma", lat: 35.565342, lng: -96.928917 },
    { code: "OR", name: "Oregon", lat: 44.572021, lng: -122.070938 },
    { code: "PA", name: "Pennsylvania", lat: 40.590752, lng: -77.209755 },
    { code: "RI", name: "Rhode Island", lat: 41.680893, lng: -71.51178 },
    { code: "SC", name: "South Carolina", lat: 33.856892, lng: -80.945007 },
    { code: "SD", name: "South Dakota", lat: 44.299782, lng: -99.438828 },
    { code: "TN", name: "Tennessee", lat: 35.747845, lng: -86.692345 },
    { code: "TX", name: "Texas", lat: 31.054487, lng: -97.563461 },
    { code: "UT", name: "Utah", lat: 40.150032, lng: -111.862434 },
    { code: "VT", name: "Vermont", lat: 44.045876, lng: -72.710686 },
    { code: "VA", name: "Virginia", lat: 37.769337, lng: -78.169968 },
    { code: "WA", name: "Washington", lat: 47.400902, lng: -121.490494 },
    { code: "WV", name: "West Virginia", lat: 38.491226, lng: -80.954453 },
    { code: "WI", name: "Wisconsin", lat: 44.268543, lng: -89.616508 },
    { code: "WY", name: "Wyoming", lat: 42.755966, lng: -107.30249 }
  ];

  var BOUNDS = {
    AL: { minLat: 30.1, maxLat: 35.0, minLng: -88.5, maxLng: -84.9 },
    AK: { minLat: 51.0, maxLat: 71.5, minLng: -179.0, maxLng: -129.0 },
    AZ: { minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
    AR: { minLat: 33.0, maxLat: 36.5, minLng: -94.6, maxLng: -89.6 },
    CA: { minLat: 32.5, maxLat: 42.0, minLng: -124.5, maxLng: -114.1 },
    CO: { minLat: 37.0, maxLat: 41.0, minLng: -109.1, maxLng: -102.0 },
    CT: { minLat: 40.9, maxLat: 42.1, minLng: -73.7, maxLng: -71.8 },
    DE: { minLat: 38.4, maxLat: 39.8, minLng: -75.8, maxLng: -75.0 },
    DC: { minLat: 38.79, maxLat: 38.99, minLng: -77.12, maxLng: -76.91 },
    FL: { minLat: 24.5, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
    GA: { minLat: 30.4, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
    HI: { minLat: 18.9, maxLat: 22.3, minLng: -160.3, maxLng: -154.8 },
    ID: { minLat: 42.0, maxLat: 49.0, minLng: -117.2, maxLng: -111.0 },
    IL: { minLat: 37.0, maxLat: 42.5, minLng: -91.5, maxLng: -87.5 },
    IN: { minLat: 37.8, maxLat: 41.8, minLng: -88.1, maxLng: -84.8 },
    IA: { minLat: 40.4, maxLat: 43.5, minLng: -96.6, maxLng: -90.1 },
    KS: { minLat: 37.0, maxLat: 40.0, minLng: -102.1, maxLng: -94.6 },
    KY: { minLat: 36.5, maxLat: 39.2, minLng: -89.6, maxLng: -81.9 },
    LA: { minLat: 29.0, maxLat: 33.0, minLng: -94.0, maxLng: -89.0 },
    ME: { minLat: 43.0, maxLat: 47.5, minLng: -71.1, maxLng: -66.9 },
    MD: { minLat: 37.9, maxLat: 39.7, minLng: -79.5, maxLng: -75.0 },
    MA: { minLat: 41.2, maxLat: 42.9, minLng: -73.5, maxLng: -69.9 },
    MI: { minLat: 41.7, maxLat: 48.3, minLng: -90.4, maxLng: -82.4 },
    MN: { minLat: 43.5, maxLat: 49.4, minLng: -97.2, maxLng: -89.5 },
    MS: { minLat: 30.2, maxLat: 35.0, minLng: -91.7, maxLng: -88.1 },
    MO: { minLat: 36.0, maxLat: 40.6, minLng: -95.8, maxLng: -89.1 },
    MT: { minLat: 44.4, maxLat: 49.0, minLng: -116.1, maxLng: -104.0 },
    NE: { minLat: 40.0, maxLat: 43.0, minLng: -104.1, maxLng: -95.3 },
    NV: { minLat: 35.0, maxLat: 42.0, minLng: -120.0, maxLng: -114.0 },
    NH: { minLat: 42.7, maxLat: 45.3, minLng: -72.6, maxLng: -70.6 },
    NJ: { minLat: 38.9, maxLat: 41.4, minLng: -75.6, maxLng: -73.9 },
    NM: { minLat: 31.3, maxLat: 37.0, minLng: -109.1, maxLng: -103.0 },
    NY: { minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.8 },
    NC: { minLat: 33.8, maxLat: 36.6, minLng: -84.3, maxLng: -75.5 },
    ND: { minLat: 45.9, maxLat: 49.0, minLng: -104.1, maxLng: -96.6 },
    OH: { minLat: 38.4, maxLat: 42.0, minLng: -84.8, maxLng: -80.5 },
    OK: { minLat: 33.6, maxLat: 37.0, minLng: -103.0, maxLng: -94.4 },
    OR: { minLat: 42.0, maxLat: 46.3, minLng: -124.6, maxLng: -116.5 },
    PA: { minLat: 39.7, maxLat: 42.3, minLng: -80.5, maxLng: -74.7 },
    RI: { minLat: 41.1, maxLat: 42.0, minLng: -71.9, maxLng: -71.1 },
    SC: { minLat: 32.0, maxLat: 35.2, minLng: -83.4, maxLng: -78.5 },
    SD: { minLat: 42.5, maxLat: 45.9, minLng: -104.1, maxLng: -96.4 },
    TN: { minLat: 35.0, maxLat: 36.7, minLng: -90.3, maxLng: -81.6 },
    TX: { minLat: 25.8, maxLat: 36.5, minLng: -106.7, maxLng: -93.5 },
    UT: { minLat: 37.0, maxLat: 42.0, minLng: -114.1, maxLng: -109.0 },
    VT: { minLat: 42.7, maxLat: 45.0, minLng: -73.4, maxLng: -71.5 },
    VA: { minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
    WA: { minLat: 45.5, maxLat: 49.0, minLng: -124.8, maxLng: -116.9 },
    WV: { minLat: 37.2, maxLat: 40.6, minLng: -82.6, maxLng: -77.7 },
    WI: { minLat: 42.5, maxLat: 47.1, minLng: -92.9, maxLng: -86.8 },
    WY: { minLat: 41.0, maxLat: 45.0, minLng: -111.1, maxLng: -104.0 }
  };

  function inBounds(lat, lng, b) {
    return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
  }

  function inferState(lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return null;
    var i;
    for (i = 0; i < STATES.length; i += 1) {
      var st = STATES[i];
      var b = BOUNDS[st.code];
      if (b && inBounds(lat, lng, b)) return st;
    }
    return null;
  }

  function isInUnitedStates(lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return false;
    if (lat >= 18.5 && lat <= 71.5 && lng >= -179.5 && lng <= -66.5) {
      return !!inferState(lat, lng) || (lat >= 24.5 && lat <= 49.5 && lng >= -125.0 && lng <= -66.5);
    }
    return false;
  }

  function findState(query) {
    query = (query || "").toLowerCase().trim();
    if (!query) return null;
    var i;
    for (i = 0; i < STATES.length; i += 1) {
      var st = STATES[i];
      if (st.code.toLowerCase() === query || st.name.toLowerCase() === query) return st;
    }
    for (i = 0; i < STATES.length; i += 1) {
      var s = STATES[i];
      if (s.name.toLowerCase().indexOf(query) !== -1 || query.indexOf(s.name.toLowerCase()) !== -1) return s;
    }
    return null;
  }

  function findByCode(code) {
    if (!code) return null;
    code = String(code).toUpperCase();
    for (var i = 0; i < STATES.length; i += 1) {
      if (STATES[i].code === code) return STATES[i];
    }
    return null;
  }

  global.WDS = global.WDS || {};
  global.WDS.usStates = {
    STATES: STATES,
    inferState: inferState,
    isInUnitedStates: isInUnitedStates,
    findState: findState,
    findByCode: findByCode
  };
})(window);
