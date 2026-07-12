/**
 * Future data platform — intentionally disabled.
 * Quiet foundation for APIs, GIS exports, research datasets,
 * anonymous aggregates, conservation partnerships, and enterprise licensing.
 * Do NOT enable marketplace features here.
 */
(function (global) {
  "use strict";

  var VERSION = "0.1.0-disabled";
  var ENABLED = false;

  function unavailable(feature) {
    return {
      ok: false,
      enabled: false,
      feature: feature,
      message: "Future data platform feature is disabled until intentionally developed."
    };
  }

  var FutureData = {
    VERSION: VERSION,
    ENABLED: ENABLED,
    enable: function () {
      // Hard gate — only flip after product + legal review
      return unavailable("enable");
    },
    apis: {
      status: function () { return unavailable("apis"); }
    },
    gisExport: {
      status: function () { return unavailable("gis-export"); },
      exportGeoJSON: function () { return unavailable("gis-export"); }
    },
    researchDatasets: {
      status: function () { return unavailable("research-datasets"); }
    },
    analytics: {
      status: function () { return unavailable("analytics"); }
    },
    anonymousAggregates: {
      status: function () { return unavailable("anonymous-aggregates"); }
    },
    conservationPartnerships: {
      status: function () { return unavailable("conservation-partnerships"); }
    },
    enterpriseLicensing: {
      status: function () { return unavailable("enterprise-licensing"); }
    }
  };

  global.WDS = global.WDS || {};
  global.WDS.futureData = FutureData;
})(typeof window !== "undefined" ? window : global);
